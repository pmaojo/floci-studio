import { useState, useEffect, useRef } from 'react';
import { 
  ListStreamsCommand, 
  CreateStreamCommand, 
  DeleteStreamCommand, 
  DescribeStreamCommand, 
  PutRecordCommand, 
  GetShardIteratorCommand, 
  GetRecordsCommand,
  Shard
} from '@aws-sdk/client-kinesis';
import { useAws } from '../contexts/AwsContext';
import { 
  Activity, 
  CirclePlus, 
  Trash2, 
  Zap, 
  Play, 
  Pause, 
  Send, 
  Terminal as TermIcon, 
  ArrowRight,
  Layers,
  ChevronLeft
} from 'lucide-react';
import { PageHeader, Card, Button, Input, Skeleton, Modal, Select } from '../components/ui-elements';

interface ShardRecordLog {
  timestamp: string;
  sequenceNumber: string;
  partitionKey: string;
  data: string;
  shardId: string;
}

const KinesisView = () => {
  const { clients, logActivity } = useAws();
  const [streams, setStreams] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Navigation: null means list view, string means stream details workspace
  const [selectedStreamName, setSelectedStreamName] = useState<string | null>(null);
  const [shards, setShards] = useState<Shard[]>([]);
  const [loadingStreamDetails, setLoadingStreamDetails] = useState(false);

  // Creation modal States
  const [isCreationModalOpen, setIsCreationModalOpen] = useState(false);
  const [newStreamName, setNewStreamName] = useState('');
  const [shardCount, setShardCount] = useState('1');
  const [isCreating, setIsCreating] = useState(false);

  // PutRecord form state
  const [partitionKey, setPartitionKey] = useState('');
  const [recordPayload, setRecordPayload] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [publishedMeta, setPublishedMeta] = useState<any | null>(null);

  // Streaming Shard terminal state
  const [selectedShardId, setSelectedShardId] = useState<string>('');
  const [iteratorType, setIteratorType] = useState<string>('LATEST');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamRecords, setStreamRecords] = useState<ShardRecordLog[]>([]);
  const [pollingInterval, setPollingInterval] = useState('2000'); // ms
  
  const pollingRef = useRef<any>(null);
  const iteratorRef = useRef<string | null>(null);
  const terminalBottomRef = useRef<HTMLDivElement>(null);

  const fetchStreams = async () => {
    setLoading(true);
    try {
      const response = await clients.kinesis.send(new ListStreamsCommand({}));
      setStreams(response.StreamNames || []);
      logActivity('Kinesis', 'ListStreams', 'success');
    } catch (err: any) {
      logActivity('Kinesis', 'ListStreams failed', 'error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newStreamName) return;
    setIsCreating(true);
    try {
      await clients.kinesis.send(new CreateStreamCommand({ 
        StreamName: newStreamName,
        ShardCount: parseInt(shardCount)
      }));
      logActivity('Kinesis', `CreateStream: ${newStreamName}`, 'success');
      setNewStreamName('');
      setIsCreationModalOpen(false);
      fetchStreams();
    } catch (err: any) {
      logActivity('Kinesis', `CreateStream failed: ${newStreamName}`, 'error', err.message);
      alert(err.message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Delete Kinesis Stream "${name}"?`)) return;
    try {
      await clients.kinesis.send(new DeleteStreamCommand({ StreamName: name }));
      logActivity('Kinesis', `DeleteStream: ${name}`, 'success');
      if (selectedStreamName === name) {
        setSelectedStreamName(null);
      }
      fetchStreams();
    } catch (err: any) {
      logActivity('Kinesis', `DeleteStream failed: ${name}`, 'error', err.message);
      alert(err.message);
    }
  };

  const handleSelectStream = async (name: string) => {
    setSelectedStreamName(name);
    setLoadingStreamDetails(true);
    setShards([]);
    setSelectedShardId('');
    setStreamRecords([]);
    stopStreaming();
    
    try {
      const res = await clients.kinesis.send(new DescribeStreamCommand({ StreamName: name }));
      const shardList = res.StreamDescription?.Shards || [];
      setShards(shardList);
      if (shardList.length > 0) {
        setSelectedShardId(shardList[0].ShardId || '');
      }
    } catch (err: any) {
      logActivity('Kinesis', `DescribeStream failed for ${name}`, 'error', err.message);
      // Mock fallback if emulator blocks describing
      const mockShards = [{ ShardId: 'shardId-000000000000', HashKeyRange: undefined, SequenceNumberRange: undefined }] as Shard[];
      setShards(mockShards);
      setSelectedShardId(mockShards[0].ShardId!);
    } finally {
      setLoadingStreamDetails(false);
    }
  };

  const handlePublishRecord = async () => {
    if (!selectedStreamName || !recordPayload) return;
    setPublishing(true);
    setPublishedMeta(null);
    try {
      const pKey = partitionKey || `pk-${Math.random().toString(36).substring(7)}`;
      // SDK client requires Uint8Array/Buffer or string depending on version. String works for browser layer.
      const encoder = new TextEncoder();
      const rawData = encoder.encode(recordPayload);

      const res = await clients.kinesis.send(new PutRecordCommand({
        StreamName: selectedStreamName,
        Data: rawData,
        PartitionKey: pKey
      }));

      setPublishedMeta({
        shardId: res.ShardId,
        sequenceNumber: res.SequenceNumber,
        partitionKey: pKey
      });

      logActivity('Kinesis', `PutRecord in ${selectedStreamName}`, 'success', `Shard: ${res.ShardId}`);
      
      // Auto pre-populate partition key for next records
      setPartitionKey('');
      setRecordPayload('');
    } catch (err: any) {
      logActivity('Kinesis', `PutRecord failed: ${selectedStreamName}`, 'error', err.message);
      alert(`Publish record failed: ${err.message}`);
    } finally {
      setPublishing(false);
    }
  };

  const startStreaming = async () => {
    if (!selectedStreamName || !selectedShardId) return;
    setIsStreaming(true);
    setStreamRecords([]);
    iteratorRef.current = null;

    try {
      // Step A: Fetch Shard Iterator
      const iterRes = await clients.kinesis.send(new GetShardIteratorCommand({
        StreamName: selectedStreamName,
        ShardId: selectedShardId,
        ShardIteratorType: iteratorType as any
      }));
      
      iteratorRef.current = iterRes.ShardIterator || null;
      
      // Step B: Set up polling routine
      const delay = parseInt(pollingInterval);
      
      const poll = async () => {
        if (!iteratorRef.current || !isStreaming) return;
        try {
          const recordsRes = await clients.kinesis.send(new GetRecordsCommand({
            ShardIterator: iteratorRef.current
          }));

          const nextIter = recordsRes.NextShardIterator;
          iteratorRef.current = nextIter || null;

          const recList = recordsRes.Records || [];
          if (recList.length > 0) {
            const dec = new TextDecoder('utf-8');
            const mappedLogs: ShardRecordLog[] = recList.map(r => {
              let decodedStr = '';
              try {
                decodedStr = dec.decode(r.Data);
              } catch {
                decodedStr = '[Binary Data / Decoded Failed]';
              }

              return {
                timestamp: new Date().toLocaleTimeString(),
                sequenceNumber: r.SequenceNumber || '',
                partitionKey: r.PartitionKey || '',
                data: decodedStr,
                shardId: selectedShardId
              };
            });

            setStreamRecords(prev => [...prev, ...mappedLogs].slice(-100)); // Limit to last 100 entries
          }
        } catch (err: any) {
          // Log errors to terminal
          setStreamRecords(prev => [...prev, {
            timestamp: new Date().toLocaleTimeString(),
            sequenceNumber: 'ERROR',
            partitionKey: 'SYSTEM',
            data: `Polling error: ${err.message}`,
            shardId: selectedShardId
          }]);
        }

        // Loop next polling cycle
        if (isStreaming) {
          pollingRef.current = setTimeout(poll, delay);
        }
      };

      pollingRef.current = setTimeout(poll, 100);
      logActivity('Kinesis', `Stream polling started: ${selectedStreamName} (${selectedShardId})`, 'success');
    } catch (err: any) {
      setIsStreaming(false);
      alert(`Could not start stream: ${err.message}`);
    }
  };

  const stopStreaming = () => {
    setIsStreaming(false);
    if (pollingRef.current) {
      clearTimeout(pollingRef.current);
      pollingRef.current = null;
    }
    iteratorRef.current = null;
  };

  // Scroll to bottom of streaming logs on update
  useEffect(() => {
    if (terminalBottomRef.current) {
      terminalBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [streamRecords]);

  // Clean polling thread on unmount
  useEffect(() => {
    fetchStreams();
    return () => {
      stopStreaming();
    };
  }, []);

  // Update polling thread variables live
  useEffect(() => {
    if (isStreaming) {
      stopStreaming();
      startStreaming();
    }
  }, [selectedShardId, iteratorType, pollingInterval]);

  return (
    <div className="flex flex-col h-full uppercase font-sans">
      <PageHeader 
        title={selectedStreamName ? `Kinesis Stream Workspace: ${selectedStreamName}` : "Kinesis Data Streams"} 
        icon={<Activity size={18} />}
        onRefresh={fetchStreams}
        isRefreshing={loading || loadingStreamDetails}
        actions={
          selectedStreamName ? (
            <Button variant="ghost" onClick={() => { stopStreaming(); setSelectedStreamName(null); }} icon={<ChevronLeft size={14} />}>
              Back to Streams
            </Button>
          ) : (
            <Button onClick={() => setIsCreationModalOpen(true)} icon={<CirclePlus size={14} />}>
              New Stream
            </Button>
          )
        }
      />

      <Modal 
        isOpen={isCreationModalOpen} 
        onClose={() => setIsCreationModalOpen(false)} 
        title="Create Data Stream"
      >
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60">Stream Name</label>
            <Input 
              value={newStreamName}
              onChange={e => setNewStreamName(e.target.value)}
              placeholder="TelemetryDataStream"
              autoFocus
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60">Shard Count Allocation</label>
            <Input 
              type="number"
              value={shardCount}
              onChange={e => setShardCount(e.target.value)}
              min="1"
            />
          </div>
          <div className="pt-4 flex gap-3">
             <Button variant="ghost" className="flex-1" onClick={() => setIsCreationModalOpen(false)}>Cancel</Button>
             <Button className="flex-1" onClick={handleCreate} disabled={!newStreamName || isCreating}>
               {isCreating ? 'Creating...' : 'Create Stream'}
             </Button>
          </div>
        </div>
      </Modal>

      {/* STREAM LIST VIEW */}
      {!selectedStreamName && (
        <div className="p-6 flex-1 overflow-auto bg-brand-bg">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading ? (
              [1, 2, 3].map(i => <Skeleton key={i} className="h-32" />)
            ) : streams.length === 0 ? (
              <div className="col-span-full py-20 text-center border border-dashed border-brand-text/20 rounded-xs">
                 <p className="text-xs opacity-40 font-mono italic">NO_DATA_STREAMS_FOUND</p>
              </div>
            ) : (
              streams.map(name => (
                <Card 
                  key={name} 
                  onClick={() => handleSelectStream(name)}
                  className="hover:border-brand-text hover:shadow-xs cursor-pointer relative transition-all bg-white group p-5 border-brand-text/30"
                >
                  <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity">
                    <Activity size={48} />
                  </div>
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-2 bg-brand-muted border border-brand-text shrink-0">
                      <Zap size={16} />
                    </div>
                    <button 
                      onClick={(e) => handleDelete(name, e)} 
                      className="p-1 hover:text-rose-600 transition-colors opacity-50 hover:opacity-100"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <h4 className="font-bold text-xs truncate mb-1 select-all">{name}</h4>
                  <div className="mt-6 flex items-center gap-4 text-[9px] font-bold opacity-45 uppercase">
                    <span className="flex items-center gap-1 font-mono"><Layers size={10} /> ON-DEMAND</span>
                    <span className="flex items-center gap-1 font-mono"><ArrowRight size={10} /> Inspect Shards</span>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      )}

      {/* WORKSPACE OPERATIONS VIEW */}
      {selectedStreamName && (
        <div className="flex-1 flex overflow-hidden">
          
          {/* Left panel: Publish Records */}
          <main className="w-1/2 p-6 overflow-y-auto border-r border-brand-text space-y-6 bg-brand-bg/50">
            <div className="space-y-1 border-b border-brand-text/10 pb-3">
              <h3 className="text-sm font-bold text-brand-text">Publish Record (PutRecord)</h3>
              <p className="text-[10px] text-brand-text opacity-60">Send payload parameters into the Kinesis buffer pipeline.</p>
            </div>

            <Card className="bg-white space-y-4 border-brand-text/40">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase opacity-65">Partition Key (Optional)</label>
                <Input 
                  value={partitionKey}
                  onChange={e => setPartitionKey(e.target.value)}
                  placeholder="Auto-generated if left blank"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase opacity-65">Record Data Payload</label>
                <textarea 
                  className="w-full bg-white border border-brand-text px-3 py-2 text-xs focus:outline-hidden focus:ring-1 focus:ring-brand-text transition-all placeholder:italic font-mono min-h-[140px] text-brand-text"
                  value={recordPayload}
                  onChange={e => setRecordPayload(e.target.value)}
                  placeholder='{ "userId": "usr-9281", "event": "page_click", "value": 42 }'
                />
              </div>

              <div className="pt-2">
                <Button 
                  className="w-full justify-center" 
                  onClick={handlePublishRecord} 
                  disabled={!recordPayload || publishing}
                  icon={<Send size={12} />}
                >
                  {publishing ? 'Publishing Payload...' : 'Publish Record'}
                </Button>
              </div>
            </Card>

            {publishedMeta && (
              <Card className="border-emerald-600 bg-emerald-50 text-emerald-800 space-y-2 animate-fadeIn p-4">
                <span className="text-[9px] font-black uppercase tracking-wider block">Record Successfully Published</span>
                <div className="text-[8px] font-mono space-y-1 opacity-90 leading-relaxed font-black">
                  <div>Partition Key: {publishedMeta.partitionKey}</div>
                  <div>Assigned Shard: {publishedMeta.shardId}</div>
                  <div className="truncate">Sequence Num: {publishedMeta.sequenceNumber}</div>
                </div>
              </Card>
            )}
          </main>

          {/* Right panel: Stream terminal reader */}
          <aside className="w-1/2 p-6 overflow-y-auto flex flex-col bg-brand-bg">
            <div className="space-y-1 border-b border-brand-text/10 pb-3 shrink-0">
              <h3 className="text-sm font-bold text-brand-text">Live Shard Streamer Terminal</h3>
              <p className="text-[10px] text-brand-text opacity-60">Subscribe to active shards to watch base64 decoded data stream in real-time.</p>
            </div>

            {/* Config toolbar */}
            <div className="grid grid-cols-2 gap-3 py-4 shrink-0">
              <div className="space-y-1">
                <label className="text-[9px] font-bold opacity-60">Select Active Shard</label>
                <Select value={selectedShardId} onChange={e => setSelectedShardId(e.target.value)} className="text-[10px] py-1 bg-white h-8">
                  {shards.length === 0 ? (
                    <option value="">No shards found</option>
                  ) : (
                    shards.map(s => (
                      <option key={s.ShardId} value={s.ShardId!}>{s.ShardId}</option>
                    ))
                  )}
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold opacity-60">Iterator Offset Type</label>
                <Select value={iteratorType} onChange={e => setIteratorType(e.target.value)} className="text-[10px] py-1 bg-white h-8">
                  <option value="LATEST">LATEST (Fresh offsets)</option>
                  <option value="TRIM_HORIZON">TRIM_HORIZON (Oldest records)</option>
                </Select>
              </div>
            </div>

            {/* Log Console Terminal container */}
            <Card className="flex-1 flex flex-col p-0 overflow-hidden bg-brand-console border-brand-text relative min-h-[300px]">
              <div className="px-4 py-2 border-b border-brand-text/20 bg-brand-muted flex justify-between items-center text-[10px] font-bold tracking-widest text-brand-text shrink-0">
                <span className="flex items-center gap-1.5 font-mono">
                  <TermIcon size={12} /> STREAM_SHARDS_LOG
                </span>

                <div className="flex items-center gap-4">
                  {/* Polling delay dial */}
                  <div className="flex items-center gap-1 opacity-70">
                    <span className="text-[8px]">DELAY:</span>
                    <select 
                      value={pollingInterval} 
                      onChange={e => setPollingInterval(e.target.value)}
                      className="bg-transparent border border-brand-text/30 text-[8px] font-mono font-black outline-none px-1 rounded-sm cursor-pointer"
                    >
                      <option value="1000" className="text-black">1s</option>
                      <option value="2000" className="text-black">2s</option>
                      <option value="5000" className="text-black">5s</option>
                    </select>
                  </div>

                  <button 
                    onClick={isStreaming ? stopStreaming : startStreaming}
                    className={`flex items-center gap-1 hover:opacity-80 font-black text-[9px] uppercase transition-colors ${
                      isStreaming ? 'text-rose-500 animate-pulse' : 'text-emerald-600'
                    }`}
                  >
                    {isStreaming ? (
                      <>
                        <Pause size={10} fill="currentColor" /> Stop
                      </>
                    ) : (
                      <>
                        <Play size={10} fill="currentColor" /> Start Polling
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Log Console body */}
              <div className="flex-1 p-4 font-mono text-[9px] leading-relaxed overflow-y-auto space-y-2 bg-brand-console/95 text-brand-green">
                {streamRecords.length === 0 ? (
                  <div className="text-center opacity-30 italic py-16 text-[10px] uppercase font-bold tracking-wider select-none font-mono">
                    {isStreaming ? "WAITING_FOR_RECORDS_ON_STREAM..." : "TERMINAL_MUTED (Launch polling above)"}
                  </div>
                ) : (
                  streamRecords.map((rec, idx) => (
                    <div key={idx} className="border-b border-brand-green/10 pb-1.5 font-mono select-all">
                      <div className="flex justify-between items-center opacity-50 text-[7px] font-black">
                        <span>[{rec.timestamp}] PK: {rec.partitionKey}</span>
                        <span>SHARD: {rec.shardId.split('-').pop()}</span>
                      </div>
                      <div className="text-white mt-0.5 whitespace-pre-wrap truncate block max-w-full font-bold">{rec.data}</div>
                      <div className="text-[7px] opacity-30 mt-0.5 truncate uppercase">SEQ: {rec.sequenceNumber}</div>
                    </div>
                  ))
                )}
                <div ref={terminalBottomRef} />
              </div>
            </Card>
          </aside>

        </div>
      )}

    </div>
  );
};

export default KinesisView;
