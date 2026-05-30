import { useState, useEffect } from 'react';
import { DescribeLogGroupsCommand, DescribeLogStreamsCommand, GetLogEventsCommand, CreateLogGroupCommand } from '@aws-sdk/client-cloudwatch-logs';
import type { LogGroup, LogStream, OutputLogEvent } from '@aws-sdk/client-cloudwatch-logs';
import { useAws } from '../contexts/AwsContext';
import { Terminal, CirclePlus, Activity } from 'lucide-react';
import { PageHeader, Button } from '../components/ui-elements';
import { format } from 'date-fns';

const CloudWatchLogsView = () => {
  const { clients, logActivity } = useAws();
  const [groups, setGroups] = useState<LogGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [streams, setStreams] = useState<LogStream[]>([]);
  const [selectedStream, setSelectedStream] = useState<string | null>(null);
  const [events, setEvents] = useState<OutputLogEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGroups = async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await clients.cloudwatch.send(new DescribeLogGroupsCommand({}));
      setGroups(resp.logGroups || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const fetchStreams = async (groupName: string) => {
    setSelectedGroup(groupName);
    setSelectedStream(null);
    setEvents([]);
    try {
      const resp = await clients.cloudwatch.send(new DescribeLogStreamsCommand({ logGroupName: groupName }));
      setStreams(resp.logStreams || []);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const fetchEvents = async (groupName: string, streamName: string) => {
    setSelectedStream(streamName);
    try {
      const resp = await clients.cloudwatch.send(new GetLogEventsCommand({ 
        logGroupName: groupName, 
        logStreamName: streamName 
      }));
      setEvents(resp.events || []);
      logActivity('CloudWatch', `GetLogEvents: ${streamName}`, 'success');
    } catch (err: any) {
      logActivity('CloudWatch', `GetLogEvents failed: ${streamName}`, 'error', err.message);
      alert(err.message);
    }
  };

  const handleCreateGroup = async () => {
    const name = prompt('Log Group Name:');
    if (!name) return;
    try {
      await clients.cloudwatch.send(new CreateLogGroupCommand({ logGroupName: name }));
      logActivity('CloudWatch', `CreateLogGroup: ${name}`, 'success');
      fetchGroups();
    } catch (err: any) {
      logActivity('CloudWatch', `CreateLogGroup failed: ${name}`, 'error', err.message);
      alert(err.message);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  return (
    <div className="flex flex-col h-full uppercase">
      <PageHeader 
        title="CloudWatch Logs" 
        icon={<Terminal size={18} />}
        onRefresh={fetchGroups}
        isRefreshing={loading}
        actions={
          <Button onClick={handleCreateGroup} icon={<CirclePlus size={14} />}>
            New Group
          </Button>
        }
      />

      {error && (
        <div className="px-6 py-2 bg-rose-50 border-b border-rose-600 text-rose-700 text-[10px] font-mono normal-case">
          {error}
        </div>
      )}
      <div className="flex flex-1 overflow-hidden">
        {/* Log Groups List */}
        <div className="w-64 border-r border-brand-text bg-brand-muted/30 flex flex-col">
          <div className="p-3 border-b border-brand-text/10 bg-white">
             <span className="text-[9px] font-bold opacity-40">LOG_GROUPS</span>
          </div>
          <div className="flex-1 overflow-auto divide-y divide-brand-text/5">
            {groups.map(group => (
              <button 
                key={group.logGroupName}
                onClick={() => fetchStreams(group.logGroupName)}
                className={`w-full text-left p-3 text-[10px] font-mono transition-colors ${selectedGroup === group.logGroupName ? 'bg-brand-text text-white' : 'hover:bg-brand-muted'}`}
              >
                {group.logGroupName}
              </button>
            ))}
          </div>
        </div>

        {/* Log Streams List */}
        <div className="w-64 border-r border-brand-text bg-brand-muted/10 flex flex-col">
          <div className="p-3 border-b border-brand-text/10 bg-white">
             <span className="text-[9px] font-bold opacity-40">LOG_STREAMS</span>
          </div>
          <div className="flex-1 overflow-auto divide-y divide-brand-text/5">
            {!selectedGroup ? (
              <div className="p-10 text-center opacity-20 text-[9px] italic">SELECT_GROUP</div>
            ) : streams.length === 0 ? (
              <div className="p-10 text-center opacity-20 text-[9px] italic">EMPTY_GROUP</div>
            ) : (
              streams.map(stream => (
                <button 
                  key={stream.logStreamName}
                  onClick={() => fetchEvents(selectedGroup, stream.logStreamName)}
                  className={`w-full text-left p-3 text-[10px] font-mono transition-colors ${selectedStream === stream.logStreamName ? 'bg-brand-text text-white' : 'hover:bg-brand-muted'}`}
                >
                  <p className="truncate">{stream.logStreamName}</p>
                  <p className="text-[8px] opacity-50 mt-1 uppercase">Updated: {format(new Date(stream.lastEventTimestamp || stream.creationTime), 'HH:mm')}</p>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Log Events List */}
        <div className="flex-1 flex flex-col bg-brand-bg relative">
          <div className="p-3 border-b border-brand-text/10 bg-white flex justify-between items-center">
             <span className="text-[9px] font-bold opacity-40 uppercase">
               Events {selectedStream ? `(${selectedStream})` : ''}
             </span>
             {selectedStream && (
               <Button size="sm" onClick={() => fetchEvents(selectedGroup!, selectedStream)}>Refresh</Button>
             )}
          </div>
          <div className="flex-1 overflow-auto p-4 bg-brand-console text-brand-green font-mono text-[10px] space-y-0.5">
             {!selectedStream ? (
                <div className="flex flex-col items-center justify-center h-full opacity-30 gap-2">
                  <Activity size={24} />
                  <span className="text-[10px]">WAITING_FOR_SELECTION...</span>
                </div>
             ) : events.length === 0 ? (
                <div className="opacity-40 italic underline decoration-dotted">NO_EVENTS_FOUND_IN_STREAM</div>
             ) : (
               events.map((evt, idx) => (
                 <div key={idx} className="group flex gap-3 hover:bg-white/5 py-0.5">
                    <span className="opacity-30 shrink-0">[{format(new Date(evt.timestamp), 'yyyy-MM-dd HH:mm:ss.SSS')}]</span>
                    <span className="break-all">{evt.message}</span>
                 </div>
               ))
             )}
             {selectedStream && <div className="animate-pulse">_</div>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CloudWatchLogsView;
