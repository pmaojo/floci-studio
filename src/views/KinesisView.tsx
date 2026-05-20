import React, { useState, useEffect } from 'react';
import { ListStreamsCommand, CreateStreamCommand, DeleteStreamCommand } from '@aws-sdk/client-kinesis';
import { useAws } from '../contexts/AwsContext';
import { Share, Search, CirclePlus, Trash2, Activity, Zap, Play } from 'lucide-react';
import { PageHeader, Card, Button, Input, Skeleton, Modal } from '../components/ui-elements';

const KinesisView = () => {
  const { clients, logActivity } = useAws();
  const [streams, setStreams] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreationModalOpen, setIsCreationModalOpen] = useState(false);
  const [newStreamName, setNewStreamName] = useState('');
  const [shardCount, setShardCount] = useState('1');
  const [isCreating, setIsCreating] = useState(false);

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

  const handleDelete = async (name: string) => {
    if (!confirm(`Delete Kinesis Stream ${name}?`)) return;
    try {
      await clients.kinesis.send(new DeleteStreamCommand({ StreamName: name }));
      logActivity('Kinesis', `DeleteStream: ${name}`, 'success');
      fetchStreams();
    } catch (err: any) {
      logActivity('Kinesis', `DeleteStream failed: ${name}`, 'error', err.message);
      alert(err.message);
    }
  };

  useEffect(() => {
    fetchStreams();
  }, []);

  return (
    <div className="flex flex-col h-full uppercase">
      <PageHeader 
        title="Kinesis Data Streams" 
        icon={<Activity size={18} />}
        onRefresh={fetchStreams}
        isRefreshing={loading}
        actions={
          <Button onClick={() => setIsCreationModalOpen(true)} icon={<CirclePlus size={14} />}>
            New Stream
          </Button>
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
              placeholder="TelemetryStream"
              autoFocus
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60">Shard Count</label>
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

      <div className="p-6 flex-1 overflow-auto bg-brand-bg">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            [1, 2, 3].map(i => <Skeleton key={i} className="h-32" />)
          ) : streams.length === 0 ? (
            <div className="col-span-full py-20 text-center border border-dashed border-brand-text/20">
               <p className="text-xs opacity-40 font-mono italic">NO_DATA_STREAMS_FOUND</p>
            </div>
          ) : (
            streams.map(name => (
              <Card key={name} className="hover:border-brand-text relative transition-all bg-white group">
                <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Activity size={48} />
                </div>
                <div className="flex justify-between items-start mb-4">
                  <div className="p-2 bg-brand-muted border border-brand-text shrink-0">
                    <Share size={16} />
                  </div>
                  <button onClick={() => handleDelete(name)} className="p-1 hover:text-rose-600 transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
                <h4 className="font-bold text-xs truncate mb-1">{name}</h4>
                <div className="mt-6 flex items-center gap-4 text-[9px] font-bold opacity-30">
                  <span className="flex items-center gap-1"><Zap size={10} /> {shardCount} SHARDS</span>
                  <span className="flex items-center gap-1"><Play size={10} /> ON-DEMAND</span>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default KinesisView;
