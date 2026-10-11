import { useState, useEffect, useCallback } from 'react';
import {
  DescribeLogGroupsCommand,
  DescribeLogStreamsCommand,
  GetLogEventsCommand,
  CreateLogGroupCommand,
  FilterLogEventsCommand
} from '@aws-sdk/client-cloudwatch-logs';
import type { LogGroup, LogStream, OutputLogEvent, FilteredLogEvent } from '@aws-sdk/client-cloudwatch-logs';
import { useAws } from '../contexts/AwsContext';
import { Terminal, CirclePlus, Activity, Search } from 'lucide-react';
import { PageHeader, Button, Input } from '../components/ui-elements';
import { format } from 'date-fns';

const CloudWatchLogsView = () => {
  const { clients, logActivity } = useAws();
  const [groups, setGroups] = useState<LogGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [streams, setStreams] = useState<LogStream[]>([]);
  const [selectedStream, setSelectedStream] = useState<string | null>(null);
  const [events, setEvents] = useState<OutputLogEvent[]>([]);

  // Search state
  const [searchMode, setSearchMode] = useState<'stream' | 'group'>('stream');
  const [filterPattern, setFilterPattern] = useState('');
  const [isFiltering, setIsFiltering] = useState(false);
  const [filteredEvents, setFilteredEvents] = useState<FilteredLogEvent[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGroups = useCallback(async () => {
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
  }, [clients.cloudwatch]);

  const fetchStreams = async (groupName: string) => {
    setSelectedGroup(groupName);
    setSelectedStream(null);
    setEvents([]);
    setSearchMode('stream');
    setFilterPattern('');
    setFilteredEvents([]);
    try {
      const resp = await clients.cloudwatch.send(new DescribeLogStreamsCommand({ logGroupName: groupName }));
      setStreams(resp.logStreams || []);
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err));
    }
  };

  const fetchEvents = async (groupName: string, streamName: string) => {
    setSelectedStream(streamName);
    setSearchMode('stream');
    try {
      const resp = await clients.cloudwatch.send(new GetLogEventsCommand({
        logGroupName: groupName,
        logStreamName: streamName
      }));
      setEvents(resp.events || []);
      logActivity('CloudWatch', `GetLogEvents: ${streamName}`, 'success');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logActivity('CloudWatch', `GetLogEvents failed: ${streamName}`, 'error', message);
      alert(message);
    }
  };

  const searchGroupLogs = async () => {
    if (!selectedGroup) return;
    setIsFiltering(true);
    setSearchMode('group');
    setSelectedStream(null); // Clear stream selection
    try {
      const resp = await clients.cloudwatch.send(new FilterLogEventsCommand({
        logGroupName: selectedGroup,
        filterPattern: filterPattern || undefined,
        limit: 100 // Limiting for local performance
      }));
      setFilteredEvents(resp.events || []);
      logActivity('CloudWatch', `FilterLogEvents: ${selectedGroup}`, 'success', `Pattern: ${filterPattern || 'none'}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logActivity('CloudWatch', `FilterLogEvents failed: ${selectedGroup}`, 'error', message);
      alert(message);
    } finally {
      setIsFiltering(false);
    }
  };

  const handleCreateGroup = async () => {
    const name = prompt('Log Group Name:');
    if (!name) return;
    try {
      await clients.cloudwatch.send(new CreateLogGroupCommand({ logGroupName: name }));
      logActivity('CloudWatch', `CreateLogGroup: ${name}`, 'success');
      fetchGroups();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logActivity('CloudWatch', `CreateLogGroup failed: ${name}`, 'error', message);
      alert(message);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

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
                onClick={() => fetchStreams(group.logGroupName!)}
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
                  onClick={() => fetchEvents(selectedGroup, stream.logStreamName!)}
                  className={`w-full text-left p-3 text-[10px] font-mono transition-colors ${selectedStream === stream.logStreamName ? 'bg-brand-text text-white' : 'hover:bg-brand-muted'}`}
                >
                  <p className="truncate">{stream.logStreamName}</p>
                  <p className="text-[8px] opacity-50 mt-1 uppercase">Updated: {format(new Date(stream.lastEventTimestamp || stream.creationTime || 0), 'HH:mm')}</p>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Log Events List */}
        <div className="flex-1 flex flex-col bg-brand-bg relative min-w-0">
          <div className="p-3 border-b border-brand-text/10 bg-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
             <span className="text-[9px] font-bold opacity-40 uppercase whitespace-nowrap">
               Events {searchMode === 'stream' && selectedStream ? `(${selectedStream})` : searchMode === 'group' && selectedGroup ? `(Group Search)` : ''}
             </span>
             <div className="flex items-center gap-2 w-full sm:w-auto">
               <div className="relative flex-1 sm:w-64">
                 <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 opacity-30" size={12} />
                 <Input
                   placeholder={selectedGroup ? `Search in ${selectedGroup}...` : "Select a group to search..."}
                   className="pl-8 h-8 text-[10px] w-full"
                   value={filterPattern}
                   onChange={e => setFilterPattern(e.target.value)}
                   onKeyDown={e => e.key === 'Enter' && searchGroupLogs()}
                   disabled={!selectedGroup}
                 />
               </div>
               <Button
                 size="sm"
                 onClick={searchGroupLogs}
                 disabled={!selectedGroup || isFiltering}
                 className="whitespace-nowrap h-8"
               >
                 {isFiltering ? 'Searching...' : 'Search Group'}
               </Button>
               {searchMode === 'stream' && selectedStream && (
                 <Button size="sm" onClick={() => fetchEvents(selectedGroup!, selectedStream)} className="h-8">Refresh</Button>
               )}
             </div>
          </div>
          <div className="flex-1 overflow-auto p-4 bg-brand-console text-brand-green font-mono text-[10px] space-y-0.5">
             {searchMode === 'stream' ? (
               !selectedStream ? (
                  <div className="flex flex-col items-center justify-center h-full opacity-30 gap-2">
                    <Activity size={24} />
                    <span className="text-[10px]">SELECT STREAM OR SEARCH GROUP...</span>
                  </div>
               ) : events.length === 0 ? (
                  <div className="opacity-40 italic underline decoration-dotted">NO_EVENTS_FOUND_IN_STREAM</div>
               ) : (
                 events.map((evt, idx) => (
                   <div key={idx} className="group flex gap-3 hover:bg-white/5 py-0.5">
                      <span className="opacity-30 shrink-0">[{format(new Date(evt.timestamp || 0), 'yyyy-MM-dd HH:mm:ss.SSS')}]</span>
                      <span className="break-all whitespace-pre-wrap">{evt.message}</span>
                   </div>
                 ))
               )
             ) : (
               /* Group Search Mode */
               filteredEvents.length === 0 ? (
                 <div className="opacity-40 italic underline decoration-dotted">NO_EVENTS_FOUND_FOR_PATTERN</div>
               ) : (
                 filteredEvents.map((evt, idx) => (
                   <div key={idx} className="group flex flex-col gap-1 hover:bg-white/5 py-1.5 border-b border-brand-green/10">
                      <div className="flex gap-3">
                        <span className="opacity-30 shrink-0">[{format(new Date(evt.timestamp || 0), 'yyyy-MM-dd HH:mm:ss.SSS')}]</span>
                        <span className="opacity-50 shrink-0 border border-brand-green/20 px-1 text-[8px] bg-brand-green/5 truncate max-w-xs">{evt.logStreamName}</span>
                      </div>
                      <span className="break-all whitespace-pre-wrap pl-[145px]">{evt.message}</span>
                   </div>
                 ))
               )
             )}
             {(selectedStream || searchMode === 'group') && <div className="animate-pulse">_</div>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CloudWatchLogsView;
