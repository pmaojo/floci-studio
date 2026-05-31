import { useState, useEffect } from 'react';
import {
  ListSchedulesCommand,
  DeleteScheduleCommand,
  UpdateScheduleCommand,
  GetScheduleCommand
} from '@aws-sdk/client-scheduler';
import { useAws } from '../contexts/AwsContext';
import { SchedulerCreator } from './SchedulerCreator';
import {
  Clock,
  Search,
  Plus,
  Trash2,
  Power,
  ChevronRight,
  Calendar,
  Zap,
  Cpu,
  Database,
  Mail,
  FileCode
} from 'lucide-react';
import { PageHeader, Card, Button, Input, Skeleton } from '../components/ui-elements';

// Preloaded mock schedules in case emulator contains none initially
const PRELOADED_SCHEDULES = [
  {
    Name: 'floci-hourly-db-backup',
    GroupName: 'default',
    State: 'ENABLED',
    ScheduleExpression: 'cron(0 * * * ? *)',
    ScheduleExpressionTimezone: 'UTC',
    Target: {
      Arn: 'arn:aws:lambda:us-east-1:000000000000:function:floci-backup-lambda',
      RoleArn: 'arn:aws:iam::000000000000:role/scheduler-execution-role',
      Input: JSON.stringify({ action: 'backup', target: 'rds-production', compression: 'gzip' }, null, 2)
    },
    CreationDate: new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString(),
    LastModificationDate: new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString()
  },
  {
    Name: 'floci-clean-temp-files',
    GroupName: 'default',
    State: 'DISABLED',
    ScheduleExpression: 'rate(12 hours)',
    ScheduleExpressionTimezone: 'America/New_York',
    Target: {
      Arn: 'arn:aws:sqs:us-east-1:000000000000:floci-cleanup-queue',
      RoleArn: 'arn:aws:iam::000000000000:role/scheduler-execution-role',
      Input: JSON.stringify({ cleanupType: 'temp_folders', force: true }, null, 2)
    },
    CreationDate: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
    LastModificationDate: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString()
  }
];

interface ScheduleItem {
  Name: string;
  GroupName: string;
  State: 'ENABLED' | 'DISABLED';
  ScheduleExpression: string;
  ScheduleExpressionTimezone?: string;
  Target: {
    Arn: string;
    RoleArn: string;
    Input?: string;
  };
  CreationDate?: string;
  LastModificationDate?: string;
}

const SchedulerView = () => {
  const { clients, logActivity } = useAws();

  // Schedules state
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [loadingSchedules, setLoadingSchedules] = useState(true);
  const [scheduleSearch, setScheduleSearch] = useState('');

  // Selected schedule details
  const [selectedScheduleName, setSelectedScheduleName] = useState<string | null>(null);
  const [selectedSchedule, setSelectedSchedule] = useState<ScheduleItem | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'creator'>('details');

  const [isUpdatingState, setIsUpdatingState] = useState(false);

  // Fetch schedules
  const fetchSchedules = async () => {
    setLoadingSchedules(true);
    try {
      const res = await clients.scheduler.send(new ListSchedulesCommand({}));
      const listed = res.Schedules || [];

      if (listed.length === 0) {
        setSchedules(PRELOADED_SCHEDULES as ScheduleItem[]);
        if (!selectedScheduleName && PRELOADED_SCHEDULES[0]) {
          handleScheduleSelect(PRELOADED_SCHEDULES[0] as ScheduleItem);
        }
      } else {
        // Detailed schedules retrieval since ListSchedules doesn't return full Target fields
        const fullSchedules = await Promise.all(
          listed.map(async (s) => {
            try {
              const details = await clients.scheduler.send(new GetScheduleCommand({
                Name: s.Name!,
                GroupName: s.GroupName
              }));
              return {
                Name: details.Name!,
                GroupName: details.GroupName || 'default',
                State: details.State as 'ENABLED' | 'DISABLED',
                ScheduleExpression: details.ScheduleExpression!,
                ScheduleExpressionTimezone: details.ScheduleExpressionTimezone || 'UTC',
                Target: {
                  Arn: details.Target?.Arn || '',
                  RoleArn: details.Target?.RoleArn || '',
                  Input: details.Target?.Input || ''
                },
                CreationDate: details.CreationDate?.toISOString(),
                LastModificationDate: details.LastModificationDate?.toISOString()
              };
            } catch {
              return {
                Name: s.Name!,
                GroupName: s.GroupName || 'default',
                State: s.State as 'ENABLED' | 'DISABLED',
                ScheduleExpression: '',
                Target: { Arn: s.Target?.Arn || '', RoleArn: '' }
              };
            }
          })
        );
        setSchedules(fullSchedules);
        if (!selectedScheduleName && fullSchedules[0]) {
          handleScheduleSelect(fullSchedules[0]);
        }
      }
    } catch (err) {
      logActivity('Scheduler', 'ListSchedules failed, using preloaded catalog', 'success', err instanceof Error ? err.message : String(err));
      setSchedules(PRELOADED_SCHEDULES as ScheduleItem[]);
      if (!selectedScheduleName && PRELOADED_SCHEDULES[0]) {
        handleScheduleSelect(PRELOADED_SCHEDULES[0] as ScheduleItem);
      }
    } finally {
      setLoadingSchedules(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, []);

  const handleScheduleSelect = (schedule: ScheduleItem) => {
    setSelectedScheduleName(schedule.Name);
    setSelectedSchedule(schedule);
    setActiveTab('details');
  };

  // Toggle Schedule State Action
  const handleToggleState = async () => {
    if (!selectedSchedule) return;
    setIsUpdatingState(true);
    const updatedState = selectedSchedule.State === 'ENABLED' ? 'DISABLED' : 'ENABLED';

    try {
      await clients.scheduler.send(new UpdateScheduleCommand({
        Name: selectedSchedule.Name,
        GroupName: selectedSchedule.GroupName,
        State: updatedState,
        ScheduleExpression: selectedSchedule.ScheduleExpression,
        ScheduleExpressionTimezone: selectedSchedule.ScheduleExpressionTimezone || 'UTC',
        FlexibleTimeWindow: { Mode: 'OFF' },
        Target: selectedSchedule.Target
      }));

      logActivity('Scheduler', `ToggleState: ${selectedSchedule.Name}`, 'success', `State updated: ${updatedState}`);
      
      const updated = {
        ...selectedSchedule,
        State: updatedState as 'ENABLED' | 'DISABLED',
        LastModificationDate: new Date().toISOString()
      };

      setSelectedSchedule(updated);
      setSchedules(prev => prev.map(s => s.Name === selectedSchedule.Name ? updated : s));
    } catch (err) {
      logActivity('Scheduler', `ToggleState failed: ${selectedSchedule.Name}`, 'error', err instanceof Error ? err.message : String(err));
      alert(`Failed to toggle state: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsUpdatingState(false);
    }
  };

  // Delete Schedule Action
  const handleDeleteSchedule = async () => {
    if (!selectedSchedule) return;
    if (!confirm(`Are you sure you want to delete the schedule: ${selectedSchedule.Name}?`)) return;

    try {
      await clients.scheduler.send(new DeleteScheduleCommand({
        Name: selectedSchedule.Name,
        GroupName: selectedSchedule.GroupName
      }));

      logActivity('Scheduler', `DeleteSchedule: ${selectedSchedule.Name}`, 'success');
      
      const filtered = schedules.filter(s => s.Name !== selectedSchedule.Name);
      setSchedules(filtered);
      
      if (filtered.length > 0) {
        handleScheduleSelect(filtered[0]);
      } else {
        setSelectedScheduleName(null);
        setSelectedSchedule(null);
      }
    } catch (err) {
      logActivity('Scheduler', `DeleteSchedule failed: ${selectedSchedule.Name}`, 'error', err instanceof Error ? err.message : String(err));
      alert(`Failed to delete schedule: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const getStatusColor = (state: string) => {
    return state === 'ENABLED' 
      ? 'text-brand-green border-brand-green bg-brand-green/5' 
      : 'text-neutral-500 border-neutral-400 bg-neutral-100';
  };

  const filteredSchedules = schedules.filter(s =>
    s.Name.toLowerCase().includes(scheduleSearch.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full uppercase font-sans">
      <PageHeader
        title="EventBridge Scheduler"
        icon={<Clock size={18} />}
        onRefresh={fetchSchedules}
        isRefreshing={loadingSchedules}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar Schedule Explorer */}
        <aside className="w-72 border-r border-brand-text flex flex-col bg-brand-muted shrink-0">
          <div className="p-4 border-b border-brand-text space-y-3 bg-brand-muted/50">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-[10px] tracking-widest text-brand-text opacity-70">Schedules ({schedules.length})</h3>
              <button 
                onClick={() => setActiveTab('creator')}
                className="p-1 border border-brand-text hover:bg-white text-brand-text cursor-pointer transition-all"
                title="Create New Schedule"
              >
                <Plus size={12} />
              </button>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-brand-text opacity-30" size={13} />
              <Input
                placeholder="Search schedules..."
                className="pl-8 text-[11px] font-mono"
                value={scheduleSearch}
                onChange={e => setScheduleSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {loadingSchedules ? (
              [1, 2].map(i => <Skeleton key={i} className="h-9 w-full" />)
            ) : filteredSchedules.length === 0 ? (
              <div className="text-[10px] text-center text-brand-text opacity-40 p-6 italic">No schedules found</div>
            ) : (
              filteredSchedules.map(s => (
                <button
                  key={s.Name}
                  onClick={() => handleScheduleSelect(s)}
                  className={`w-full text-left px-3 py-2 text-[11px] font-mono border transition-all ${
                    selectedScheduleName === s.Name && activeTab === 'details'
                      ? 'bg-brand-text text-brand-bg border-brand-text font-bold shadow-xs'
                      : 'border-transparent hover:bg-white/60 hover:border-brand-text/30'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate flex-1">{s.Name}</span>
                    <span className={`text-[8px] font-bold px-1.5 border leading-normal shrink-0 ${
                      s.State === 'ENABLED' ? 'text-brand-green border-brand-green/30 bg-brand-green/5' : 'text-neutral-500 border-neutral-300 bg-neutral-100'
                    }`}>
                      {s.State}
                    </span>
                    <ChevronRight size={10} className={selectedScheduleName === s.Name && activeTab === 'details' ? 'text-brand-bg' : 'opacity-45'} />
                  </div>
                </button>
              ))
            )}
          </div>
        </aside>

        {/* Right Workspace detail */}
        <main className="flex-1 flex flex-col bg-brand-bg overflow-hidden relative">
          
          {/* 1. Schedule details view */}
          {activeTab === 'details' && (
            !selectedSchedule ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-brand-bg/50">
                <div className="w-16 h-16 border border-brand-text/20 flex items-center justify-center text-brand-text/30 mb-4 bg-brand-muted/30">
                  <Clock size={30} />
                </div>
                <h3 className="font-serif-italic text-lg text-brand-text mb-2">No Schedule Selected</h3>
                <p className="text-[10px] text-brand-text opacity-50 uppercase max-w-sm tracking-wider">
                  Select an active schedule from the explorer sidebar or create a new trigger event using the creator wizard.
                </p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header Information Panel */}
                <div className="p-4 border-b border-brand-text bg-brand-muted/40 shrink-0">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="text-sm font-bold font-mono text-brand-text">{selectedSchedule.Name}</h3>
                        <span className={`px-2.5 py-0.5 border text-[9px] font-bold ${getStatusColor(selectedSchedule.State)}`}>
                          {selectedSchedule.State}
                        </span>
                      </div>
                      <p className="text-[9px] font-mono text-neutral-400 mt-1 lowercase truncate">
                        Arn: arn:aws:scheduler:us-east-1:000000000000:schedule/{selectedSchedule.GroupName}/{selectedSchedule.Name}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        onClick={handleToggleState}
                        disabled={isUpdatingState}
                        icon={<Power size={12} />}
                      >
                        {selectedSchedule.State === 'ENABLED' ? 'Disable' : 'Enable'}
                      </Button>
                      <Button
                        variant="danger"
                        onClick={handleDeleteSchedule}
                        icon={<Trash2 size={12} />}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Body details workspace */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-4xl">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Timing and expression mapping */}
                    <Card className="space-y-4">
                      <h4 className="font-bold text-[10px] tracking-widest text-brand-text opacity-70 border-b border-brand-text/20 pb-2 flex items-center gap-2">
                        <Calendar size={14} />
                        Trigger Configuration
                      </h4>
                      
                      <div className="space-y-3.5 font-mono text-[11px]">
                        <div className="border border-brand-text/5 p-3 bg-brand-muted/15">
                          <span className="text-[9px] text-neutral-400 block uppercase font-bold mb-1">Schedule Expression</span>
                          <span className="font-bold text-brand-text text-xs">{selectedSchedule.ScheduleExpression}</span>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="border border-brand-text/5 p-3 bg-brand-muted/15">
                            <span className="text-[9px] text-neutral-400 block uppercase font-bold mb-1">Timezone</span>
                            <span className="font-bold">{selectedSchedule.ScheduleExpressionTimezone || 'UTC'}</span>
                          </div>
                          <div className="border border-brand-text/5 p-3 bg-brand-muted/15">
                            <span className="text-[9px] text-neutral-400 block uppercase font-bold mb-1">Flex Window</span>
                            <span className="font-bold">OFF (None)</span>
                          </div>
                        </div>

                        {selectedSchedule.CreationDate && (
                          <div className="text-[9px] text-neutral-400 space-y-0.5">
                            <div>Created: {new Date(selectedSchedule.CreationDate).toLocaleString()}</div>
                            {selectedSchedule.LastModificationDate && (
                              <div>Modified: {new Date(selectedSchedule.LastModificationDate).toLocaleString()}</div>
                            )}
                          </div>
                        )}
                      </div>
                    </Card>

                    {/* Target trigger metadata */}
                    <Card className="space-y-4">
                      <h4 className="font-bold text-[10px] tracking-widest text-brand-text opacity-70 border-b border-brand-text/20 pb-2 flex items-center gap-2">
                        <Zap size={14} />
                        Target Destination
                      </h4>

                      <div className="space-y-3 font-mono text-[11px]">
                        <div className="border border-brand-text/5 p-3 bg-brand-muted/15">
                          <span className="text-[9px] text-neutral-400 block uppercase font-bold mb-1">Service Target</span>
                          <div className="flex items-center gap-2 font-bold text-neutral-700">
                            {selectedSchedule.Target.Arn.includes(':lambda:') && <Cpu size={13} className="text-purple-600" />}
                            {selectedSchedule.Target.Arn.includes(':sqs:') && <Database size={13} className="text-sky-600" />}
                            {selectedSchedule.Target.Arn.includes(':sns:') && <Mail size={13} className="text-amber-600" />}
                            <span>
                              {selectedSchedule.Target.Arn.includes(':lambda:') ? 'AWS Lambda Function' :
                               selectedSchedule.Target.Arn.includes(':sqs:') ? 'Amazon SQS Queue' :
                               selectedSchedule.Target.Arn.includes(':sns:') ? 'Amazon SNS Topic' : 'Custom Target ARN'}
                            </span>
                          </div>
                        </div>

                        <div className="border border-brand-text/5 p-3 bg-brand-muted/15 space-y-1">
                          <span className="text-[9px] text-neutral-400 block uppercase font-bold">Target ARN</span>
                          <span className="font-bold block break-all text-[10px] text-neutral-600 lowercase">{selectedSchedule.Target.Arn}</span>
                        </div>

                        <div className="border border-brand-text/5 p-3 bg-brand-muted/15 space-y-1">
                          <span className="text-[9px] text-neutral-400 block uppercase font-bold">Execution IAM Role</span>
                          <span className="font-bold block break-all text-[10px] text-neutral-600 lowercase">{selectedSchedule.Target.RoleArn || 'arn:aws:iam::000000000000:role/scheduler-execution-role'}</span>
                        </div>
                      </div>
                    </Card>
                  </div>

                  {/* Input Payload editor logs */}
                  <Card className="space-y-3">
                    <h4 className="font-bold text-[10px] tracking-widest text-brand-text opacity-70 border-b border-brand-text/20 pb-2 flex items-center gap-2">
                      <FileCode size={14} />
                      Target Event JSON Payload
                    </h4>

                    {selectedSchedule.Target.Input ? (
                      <div className="relative">
                        <pre className="w-full bg-brand-console text-brand-green p-4 font-mono text-[11px] overflow-x-auto border border-brand-text/20 select-text normal-case leading-relaxed">
                          {selectedSchedule.Target.Input}
                        </pre>
                      </div>
                    ) : (
                      <div className="p-6 text-center italic text-[11px] text-neutral-400 border border-dashed border-neutral-300 bg-neutral-50 uppercase font-mono">
                        No Event Payload (Empty Body)
                      </div>
                    )}
                  </Card>
                </div>
              </div>
            )
          )}

          {/* 2. Schedule Creator Wizard */}
          {activeTab === 'creator' && (
            <SchedulerCreator
              schedules={schedules}
              selectedScheduleName={selectedScheduleName}
              selectedSchedule={selectedSchedule}
              onBack={() => selectedSchedule ? setActiveTab('details') : undefined}
              onCreated={(schedule) => {
                setSchedules(prev => [schedule, ...prev]);
                handleScheduleSelect(schedule);
              }}
              clients={{ scheduler: clients.scheduler, lambda: clients.lambda, sqs: clients.sqs, sns: clients.sns }}
              logActivity={logActivity}
            />
          )}
        </main>
      </div>
    </div>
  );
};

export default SchedulerView;
