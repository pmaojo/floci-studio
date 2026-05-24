import { useState, useEffect } from 'react';
import {
  ListSchedulesCommand,
  CreateScheduleCommand,
  DeleteScheduleCommand,
  UpdateScheduleCommand,
  GetScheduleCommand
} from '@aws-sdk/client-scheduler';
import { ListFunctionsCommand } from '@aws-sdk/client-lambda';
import { ListQueuesCommand } from '@aws-sdk/client-sqs';
import { ListTopicsCommand } from '@aws-sdk/client-sns';
import { useAws } from '../contexts/AwsContext';
import {
  Clock,
  Search,
  Plus,
  Trash2,
  Power,
  ChevronRight,
  Info,
  Calendar,
  Zap,
  CheckCircle,
  Database,
  Mail,
  Cpu,
  FileCode,
  Globe,
  AlertTriangle
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

  // Live resources for creator dropdowns
  const [lambdas, setLambdas] = useState<{ name: string; arn: string }[]>([]);
  const [queues, setQueues] = useState<{ name: string; arn: string }[]>([]);
  const [topics, setTopics] = useState<{ name: string; arn: string }[]>([]);
  const [loadingResources, setLoadingResources] = useState(false);

  // Creator state
  const [newName, setNewName] = useState('');
  const [newGroup, setNewGroup] = useState('default');
  const [newState, setNewState] = useState<'ENABLED' | 'DISABLED'>('ENABLED');
  const [expressionType, setExpressionType] = useState<'rate' | 'cron'>('rate');
  
  // Rate fields
  const [rateValue, setRateValue] = useState('5');
  const [rateUnit, setRateUnit] = useState('minutes');
  
  // Cron fields
  const [cronExpression, setCronExpression] = useState('0/5 * * * ? *');
  
  // Target fields
  const [targetType, setTargetType] = useState<'lambda' | 'sqs' | 'sns' | 'custom'>('lambda');
  const [selectedResourceArn, setSelectedResourceArn] = useState('');
  const [customTargetArn, setCustomTargetArn] = useState('');
  const [targetPayload, setTargetPayload] = useState('{\n  "source": "floci.scheduler"\n}');
  const [executionRoleArn, setExecutionRoleArn] = useState('arn:aws:iam::000000000000:role/scheduler-execution-role');
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdatingState, setIsUpdatingState] = useState(false);

  // Fetch schedules
  const fetchSchedules = async () => {
    setLoadingSchedules(true);
    try {
      const res = await clients.scheduler.send(new ListSchedulesCommand({}));
      const listed = res.Schedules || [];

      if (listed.length === 0) {
        setSchedules(PRELOADED_SCHEDULES as any);
        if (!selectedScheduleName && PRELOADED_SCHEDULES[0]) {
          handleScheduleSelect(PRELOADED_SCHEDULES[0] as any);
        }
      } else {
        // Detailed schedules retrieval since ListSchedules doesn't return full Target fields
        const fullSchedules = await Promise.all(
          listed.map(async (s: any) => {
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
                ScheduleExpression: s.ScheduleExpression!,
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
    } catch (err: any) {
      logActivity('Scheduler', 'ListSchedules failed, using preloaded catalog', 'success', err.message);
      setSchedules(PRELOADED_SCHEDULES as any);
      if (!selectedScheduleName && PRELOADED_SCHEDULES[0]) {
        handleScheduleSelect(PRELOADED_SCHEDULES[0] as any);
      }
    } finally {
      setLoadingSchedules(false);
    }
  };

  // Fetch live targetable resources from local container
  const fetchTargetResources = async () => {
    setLoadingResources(true);
    try {
      // 1. Fetch Lambdas
      try {
        const lambdaRes = await clients.lambda.send(new ListFunctionsCommand({}));
        const items = lambdaRes.Functions?.map(f => ({
          name: f.FunctionName || '',
          arn: f.FunctionArn || ''
        })) || [];
        setLambdas(items);
      } catch (e) {
        setLambdas([]);
      }

      // 2. Fetch SQS Queues
      try {
        const sqsRes = await clients.sqs.send(new ListQueuesCommand({}));
        const items = sqsRes.QueueUrls?.map(url => {
          const name = url.split('/').pop() || '';
          return {
            name,
            arn: `arn:aws:sqs:us-east-1:000000000000:${name}` // standard local format
          };
        }) || [];
        setQueues(items);
      } catch (e) {
        setQueues([]);
      }

      // 3. Fetch SNS Topics
      try {
        const snsRes = await clients.sns.send(new ListTopicsCommand({}));
        const items = snsRes.Topics?.map(t => {
          const arn = t.TopicArn || '';
          const name = arn.split(':').pop() || '';
          return { name, arn };
        }) || [];
        setTopics(items);
      } catch (e) {
        setTopics([]);
      }
    } catch (err: any) {
      console.error('Failed fetching resources', err);
    } finally {
      setLoadingResources(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
    fetchTargetResources();
  }, []);

  const handleScheduleSelect = (schedule: ScheduleItem) => {
    setSelectedScheduleName(schedule.Name);
    setSelectedSchedule(schedule);
    setActiveTab('details');
  };

  // Generate complete schedule expression string
  const getBuiltExpression = () => {
    if (expressionType === 'rate') {
      return `rate(${rateValue} ${rateUnit})`;
    } else {
      return `cron(${cronExpression})`;
    }
  };

  // Get final ARN for schedule creation
  const getSelectedArn = () => {
    if (targetType === 'custom') return customTargetArn;
    return selectedResourceArn;
  };

  // Pre-fill target ARN when target dropdown switches or resources load
  useEffect(() => {
    if (targetType === 'lambda' && lambdas.length > 0) {
      setSelectedResourceArn(lambdas[0].arn);
    } else if (targetType === 'sqs' && queues.length > 0) {
      setSelectedResourceArn(queues[0].arn);
    } else if (targetType === 'sns' && topics.length > 0) {
      setSelectedResourceArn(topics[0].arn);
    } else {
      setSelectedResourceArn('');
    }
  }, [targetType, lambdas, queues, topics]);

  // Create Scheduler Action
  const handleCreateSchedule = async () => {
    if (!newName.trim()) {
      alert('Please enter a schedule name');
      return;
    }
    const targetArn = getSelectedArn();
    if (!targetArn) {
      alert('Please select or specify a target resource ARN');
      return;
    }

    // Validate JSON input
    let parsedInput = '';
    if (targetPayload.trim()) {
      try {
        JSON.parse(targetPayload);
        parsedInput = targetPayload;
      } catch (e: any) {
        alert(`Target payload must be valid JSON: ${e.message}`);
        return;
      }
    }

    setIsCreating(true);
    const expr = getBuiltExpression();

    try {
      await clients.scheduler.send(new CreateScheduleCommand({
        Name: newName,
        GroupName: newGroup,
        ScheduleExpression: expr,
        ScheduleExpressionTimezone: 'UTC',
        State: newState,
        FlexibleTimeWindow: { Mode: 'OFF' },
        Target: {
          Arn: targetArn,
          RoleArn: executionRoleArn,
          Input: parsedInput
        }
      }));

      logActivity('Scheduler', `CreateSchedule: ${newName}`, 'success', `Target: ${targetArn.split(':').pop()}`);
      
      const newScheduleItem: ScheduleItem = {
        Name: newName,
        GroupName: newGroup,
        State: newState,
        ScheduleExpression: expr,
        ScheduleExpressionTimezone: 'UTC',
        Target: {
          Arn: targetArn,
          RoleArn: executionRoleArn,
          Input: parsedInput
        },
        CreationDate: new Date().toISOString(),
        LastModificationDate: new Date().toISOString()
      };

      setSchedules(prev => [newScheduleItem, ...prev]);
      handleScheduleSelect(newScheduleItem);
      
      // Reset creation fields
      setNewName('');
      setActiveTab('details');
    } catch (err: any) {
      logActivity('Scheduler', `CreateSchedule failed: ${newName}`, 'error', err.message);
      alert(`Failed to create schedule: ${err.message}`);
    } finally {
      setIsCreating(false);
    }
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
    } catch (err: any) {
      logActivity('Scheduler', `ToggleState failed: ${selectedSchedule.Name}`, 'error', err.message);
      alert(`Failed to toggle state: ${err.message}`);
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
    } catch (err: any) {
      logActivity('Scheduler', `DeleteSchedule failed: ${selectedSchedule.Name}`, 'error', err.message);
      alert(`Failed to delete schedule: ${err.message}`);
    }
  };

  // Pre-load cron template helper
  const handleApplyCronHelper = (expression: string) => {
    setExpressionType('cron');
    setCronExpression(expression);
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
                          <span className="font-bold block break-all text-[10px] text-neutral-600 lowercase">{selectedSchedule.Target.RoleArn || executionRoleArn}</span>
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
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Creator Header */}
              <div className="p-4 border-b border-brand-text bg-brand-muted shrink-0 flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-bold font-mono text-brand-text">Create Scheduler Event</h3>
                  <p className="text-[10px] uppercase font-serif-italic normal-case text-neutral-500 mt-0.5">Design a cron trigger mapped to local server resources</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => selectedScheduleName && selectedSchedule ? setActiveTab('details') : handleScheduleSelect(schedules[0])}>
                  Back to explorer
                </Button>
              </div>

              {/* Creator form scroll */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-3xl">
                
                {/* Section A: Metadata details */}
                <Card className="space-y-4">
                  <h4 className="font-bold text-[10px] tracking-widest text-brand-text opacity-70 border-b border-brand-text/20 pb-2 flex items-center gap-2">
                    <Info size={14} />
                    Step 1: Schedule Metadata
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-brand-text font-mono text-[10px]">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase opacity-65">Schedule Name</label>
                      <Input
                        value={newName}
                        onChange={e => setNewName(e.target.value.replace(/[^a-zA-Z0-9-_]/g, ''))}
                        placeholder="floci-cron-trigger-job"
                        className="font-mono text-xs uppercase"
                        maxLength={64}
                      />
                      <span className="text-[8px] text-neutral-400 uppercase italic">Supports letters, numbers, hyphens, and underscores.</span>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase opacity-65">Schedule Group</label>
                      <select
                        value={newGroup}
                        onChange={e => setNewGroup(e.target.value)}
                        className="w-full bg-white border border-brand-text px-3 py-2 text-xs focus:outline-none"
                      >
                        <option value="default">default</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase opacity-65">Initial State</label>
                      <select
                        value={newState}
                        onChange={e => setNewState(e.target.value as 'ENABLED' | 'DISABLED')}
                        className="w-full bg-white border border-brand-text px-3 py-2 text-xs focus:outline-none"
                      >
                        <option value="ENABLED">ENABLED</option>
                        <option value="DISABLED">DISABLED</option>
                      </select>
                    </div>
                  </div>
                </Card>

                {/* Section B: Timing config */}
                <Card className="space-y-4">
                  <h4 className="font-bold text-[10px] tracking-widest text-brand-text opacity-70 border-b border-brand-text/20 pb-2 flex items-center gap-2">
                    <Calendar size={14} />
                    Step 2: Timing & Expression Setup
                  </h4>

                  <div className="space-y-4 text-brand-text font-mono text-[10px]">
                    {/* Expression toggle */}
                    <div className="flex gap-2 border-b border-brand-text/10 pb-3">
                      {(['rate', 'cron'] as const).map(type => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setExpressionType(type)}
                          className={`px-4 py-1.5 text-[9px] font-bold uppercase border transition-all ${
                            expressionType === type
                              ? 'bg-brand-text text-brand-bg border-brand-text'
                              : 'bg-transparent border-transparent hover:bg-brand-muted hover:border-brand-text/20'
                          }`}
                        >
                          {type === 'rate' ? 'Rate Expression' : 'Cron Expression'}
                        </button>
                      ))}
                    </div>

                    {/* Rate Builder UI */}
                    {expressionType === 'rate' && (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold uppercase opacity-65">Rate Interval</label>
                          <Input
                            type="number"
                            min="1"
                            value={rateValue}
                            onChange={e => setRateValue(e.target.value)}
                            className="font-mono text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold uppercase opacity-65">Time Unit</label>
                          <select
                            value={rateUnit}
                            onChange={e => setRateUnit(e.target.value)}
                            className="w-full bg-white border border-brand-text px-3 py-2 text-xs focus:outline-none"
                          >
                            <option value="minutes">Minutes</option>
                            <option value="hours">Hours</option>
                            <option value="days">Days</option>
                          </select>
                        </div>
                      </div>
                    )}

                    {/* Cron Builder UI */}
                    {expressionType === 'cron' && (
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold uppercase opacity-65">Standard Cron expression fields</label>
                          <Input
                            value={cronExpression}
                            onChange={e => setCronExpression(e.target.value)}
                            placeholder="0/5 * * * ? *"
                            className="font-mono text-xs text-neutral-800"
                          />
                          <span className="text-[8px] text-neutral-400 uppercase italic">Fields: Minutes Hours Day-of-month Month Day-of-week Year</span>
                        </div>

                        {/* Cron templates quick picker */}
                        <div className="space-y-1.5">
                          <span className="text-[8px] font-bold text-neutral-400 uppercase">Quick Syntax Templates</span>
                          <div className="flex flex-wrap gap-1.5">
                            {[
                              { label: 'Every 5 mins', expr: '*/5 * * * ? *' },
                              { label: 'Hourly', expr: '0 * * * ? *' },
                              { label: 'Daily at Midnight', expr: '0 0 * * ? *' },
                              { label: 'Weekly on Monday', expr: '0 0 ? * MON *' }
                            ].map(item => (
                              <button
                                key={item.label}
                                type="button"
                                onClick={() => handleApplyCronHelper(item.expr)}
                                className="px-2 py-0.5 border border-brand-text/30 text-[8px] hover:border-brand-text bg-white transition-all cursor-pointer"
                              >
                                {item.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="p-3 bg-brand-muted/15 border border-brand-text/10 flex justify-between items-center">
                      <span className="text-[9px] text-neutral-400 uppercase font-bold">Resolved Expression:</span>
                      <code className="font-bold text-brand-text text-[11px]">{getBuiltExpression()}</code>
                    </div>
                  </div>
                </Card>

                {/* Section C: Target selection */}
                <Card className="space-y-4">
                  <h4 className="font-bold text-[10px] tracking-widest text-brand-text opacity-70 border-b border-brand-text/20 pb-2 flex items-center gap-2">
                    <Zap size={14} />
                    Step 3: Target Resource Destination
                  </h4>

                  <div className="space-y-4 text-brand-text font-mono text-[10px]">
                    {/* Target Service Toggle */}
                    <div className="grid grid-cols-4 gap-2 text-center">
                      {[
                        { type: 'lambda', label: 'Lambda Function', icon: <Cpu size={12} /> },
                        { type: 'sqs', label: 'SQS Queue', icon: <Database size={12} /> },
                        { type: 'sns', label: 'SNS Topic', icon: <Mail size={12} /> },
                        { type: 'custom', label: 'Custom ARN', icon: <Globe size={12} /> }
                      ].map(target => (
                        <button
                          key={target.type}
                          type="button"
                          onClick={() => setTargetType(target.type as any)}
                          className={`flex flex-col items-center justify-center p-2.5 border transition-all ${
                            targetType === target.type
                              ? 'bg-brand-text text-brand-bg border-brand-text font-bold shadow-xs'
                              : 'border-brand-text/20 bg-brand-muted/10 hover:bg-white'
                          }`}
                        >
                          {target.icon}
                          <span className="text-[8px] uppercase tracking-wider mt-1">{target.label}</span>
                        </button>
                      ))}
                    </div>

                    {/* Resources Dropdown Lists (Lambda, SQS, SNS) */}
                    {targetType !== 'custom' && (
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold uppercase opacity-65 flex justify-between items-center">
                          <span>Select Available local {targetType}</span>
                          {loadingResources && <span className="text-[8px] animate-pulse text-amber-600">Syncing...</span>}
                        </label>

                        {targetType === 'lambda' && (
                          <select
                            value={selectedResourceArn}
                            onChange={e => setSelectedResourceArn(e.target.value)}
                            className="w-full bg-white border border-brand-text px-3 py-2 text-xs focus:outline-none"
                          >
                            {lambdas.length === 0 ? (
                              <option value="">-- No Local Lambdas Found --</option>
                            ) : (
                              lambdas.map(fn => (
                                <option key={fn.arn} value={fn.arn}>{fn.name}</option>
                              ))
                            )}
                          </select>
                        )}

                        {targetType === 'sqs' && (
                          <select
                            value={selectedResourceArn}
                            onChange={e => setSelectedResourceArn(e.target.value)}
                            className="w-full bg-white border border-brand-text px-3 py-2 text-xs focus:outline-none"
                          >
                            {queues.length === 0 ? (
                              <option value="">-- No Local SQS Queues Found --</option>
                            ) : (
                              queues.map(q => (
                                <option key={q.arn} value={q.arn}>{q.name}</option>
                              ))
                            )}
                          </select>
                        )}

                        {targetType === 'sns' && (
                          <select
                            value={selectedResourceArn}
                            onChange={e => setSelectedResourceArn(e.target.value)}
                            className="w-full bg-white border border-brand-text px-3 py-2 text-xs focus:outline-none"
                          >
                            {topics.length === 0 ? (
                              <option value="">-- No Local SNS Topics Found --</option>
                            ) : (
                              topics.map(t => (
                                <option key={t.arn} value={t.arn}>{t.name}</option>
                              ))
                            )}
                          </select>
                        )}

                        {/* Fallback override warning if lists empty */}
                        {((targetType === 'lambda' && lambdas.length === 0) ||
                          (targetType === 'sqs' && queues.length === 0) ||
                          (targetType === 'sns' && topics.length === 0)) && (
                          <div className="flex gap-2 p-2 bg-amber-50 border border-amber-200 text-amber-900 leading-normal text-[8px] items-center">
                            <AlertTriangle size={11} className="shrink-0" />
                            <span>No items listed. Create resources in the relative service panel or use "Custom ARN" option above.</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Custom ARN input */}
                    {targetType === 'custom' && (
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold uppercase opacity-65">Custom Target ARN</label>
                        <Input
                          value={customTargetArn}
                          onChange={e => setCustomTargetArn(e.target.value)}
                          placeholder="arn:aws:lambda:us-east-1:000000000000:function:my-function"
                          className="font-mono text-xs"
                        />
                      </div>
                    )}

                    {/* Target IAM Role */}
                    <div className="space-y-1 pt-1">
                      <label className="text-[9px] font-bold uppercase opacity-65">Execution Role ARN</label>
                      <Input
                        value={executionRoleArn}
                        onChange={e => setExecutionRoleArn(e.target.value)}
                        placeholder="arn:aws:iam::000000000000:role/scheduler-execution-role"
                        className="font-mono text-xs"
                      />
                    </div>
                  </div>
                </Card>

                {/* Section D: JSON payload input */}
                <Card className="space-y-4">
                  <h4 className="font-bold text-[10px] tracking-widest text-brand-text opacity-70 border-b border-brand-text/20 pb-2 flex items-center gap-2">
                    <FileCode size={14} />
                    Step 4: Target Payload JSON
                  </h4>

                  <div className="space-y-1.5 text-brand-text font-mono text-[10px]">
                    <label className="text-[9px] font-bold uppercase opacity-65">Event payload details (Collapsible JSON string)</label>
                    <textarea
                      className="w-full bg-white border border-brand-text p-4 font-mono text-[11px] h-28 focus:outline-none focus:ring-1 focus:ring-brand-text placeholder:italic"
                      value={targetPayload}
                      onChange={e => setTargetPayload(e.target.value)}
                      placeholder={`{\n  "key": "value"\n}`}
                    />
                  </div>
                </Card>

                {/* Create submit */}
                <div className="flex gap-4">
                  <Button
                    className="flex-1 text-xs"
                    onClick={handleCreateSchedule}
                    disabled={isCreating}
                    icon={<CheckCircle size={13} />}
                  >
                    {isCreating ? 'CREATING TRIGGER...' : 'PUBLISH_SCHEDULE'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default SchedulerView;
