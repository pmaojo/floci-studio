import { useState, useEffect } from 'react';
import { CreateScheduleCommand } from '@aws-sdk/client-scheduler';
import { ListFunctionsCommand } from '@aws-sdk/client-lambda';
import { ListQueuesCommand } from '@aws-sdk/client-sqs';
import { ListTopicsCommand } from '@aws-sdk/client-sns';
import type { SchedulerClient } from '@aws-sdk/client-scheduler';
import type { LambdaClient } from '@aws-sdk/client-lambda';
import type { SQSClient } from '@aws-sdk/client-sqs';
import type { SNSClient } from '@aws-sdk/client-sns';
import {
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
import { Card, Button, Input } from '../components/ui-elements';

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

interface SchedulerCreatorProps {
  schedules: ScheduleItem[];
  selectedScheduleName: string | null;
  selectedSchedule: ScheduleItem | null;
  onBack: () => void;
  onCreated: (schedule: ScheduleItem) => void;
  clients: { scheduler: SchedulerClient; lambda: LambdaClient; sqs: SQSClient; sns: SNSClient };
  logActivity: (service: string, action: string, status: 'success' | 'error', details?: string) => void;
}

export function SchedulerCreator({
  onBack,
  onCreated,
  clients,
  logActivity
}: SchedulerCreatorProps) {
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
    } finally {
      setLoadingResources(false);
    }
  };

  useEffect(() => {
    fetchTargetResources();
  }, []);

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

  // Pre-load cron template helper
  const handleApplyCronHelper = (expression: string) => {
    setExpressionType('cron');
    setCronExpression(expression);
  };

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

      onCreated(newScheduleItem);

      // Reset creation fields
      setNewName('');
    } catch (err: any) {
      logActivity('Scheduler', `CreateSchedule failed: ${newName}`, 'error', err.message);
      alert(`Failed to create schedule: ${err.message}`);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Creator Header */}
      <div className="p-4 border-b border-brand-text bg-brand-muted shrink-0 flex justify-between items-center">
        <div>
          <h3 className="text-sm font-bold font-mono text-brand-text">Create Scheduler Event</h3>
          <p className="text-[10px] uppercase font-serif-italic normal-case text-neutral-500 mt-0.5">Design a cron trigger mapped to local server resources</p>
        </div>
        <Button variant="ghost" size="sm" onClick={onBack}>
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
  );
}
