import { useState, useEffect } from 'react';
import {
  ListStateMachinesCommand,
  DescribeStateMachineCommand,
  ListExecutionsCommand,
  StartExecutionCommand,
  DescribeExecutionCommand
} from '@aws-sdk/client-sfn';
import { useAws } from '../contexts/AwsContext';
import {
  Play,
  Search,
  GitBranch,
  Clock,
  Terminal,
  ChevronRight,
  AlertTriangle,
  PlayCircle,
  FileCode
} from 'lucide-react';
import { PageHeader, Button, Input, Skeleton } from '../components/ui-elements';
import { SFNFlowVisualizer } from './SFNFlowVisualizer';

// Preloaded mock state machines in case local emulator has none
const PRELOADED_STATE_MACHINES = [
  {
    stateMachineArn: 'arn:aws:states:us-east-1:000000000000:stateMachine:floci-order-processing-pipeline',
    name: 'floci-order-processing-pipeline',
    type: 'STANDARD',
    creationDate: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(),
    definition: JSON.stringify({
      Comment: "Processes order validation, payment authorization, inventory checks, and customer notifications.",
      StartAt: "ValidateOrder",
      States: {
        ValidateOrder: {
          Type: "Task",
          Resource: "arn:aws:lambda:us-east-1:000000000000:function:floci-order-validator",
          Next: "ProcessPayment"
        },
        ProcessPayment: {
          Type: "Task",
          Resource: "arn:aws:lambda:us-east-1:000000000000:function:floci-payment-processor",
          Next: "CheckPaymentResult"
        },
        CheckPaymentResult: {
          Type: "Choice",
          Choices: [
            {
              Variable: "$.paymentStatus",
              StringEquals: "APPROVED",
              Next: "ReserveInventory"
            }
          ],
          Default: "PaymentFailed"
        },
        ReserveInventory: {
          Type: "Task",
          Resource: "arn:aws:lambda:us-east-1:000000000000:function:floci-inventory-mgr",
          Next: "SendConfirmation"
        },
        SendConfirmation: {
          Type: "Task",
          Resource: "arn:aws:lambda:us-east-1:000000000000:function:floci-notifier",
          End: true
        },
        PaymentFailed: {
          Type: "Fail",
          Error: "PaymentDeclinedException",
          Cause: "The gateway payment processor declined the transaction."
        }
      }
    }, null, 2)
  },
  {
    stateMachineArn: 'arn:aws:states:us-east-1:000000000000:stateMachine:floci-etl-workflow',
    name: 'floci-etl-workflow',
    type: 'STANDARD',
    creationDate: new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString(),
    definition: JSON.stringify({
      Comment: "Extract S3 logs, perform clean transforms in parallel, and load data warehouse.",
      StartAt: "ExtractS3Logs",
      States: {
        ExtractS3Logs: {
          Type: "Task",
          Resource: "arn:aws:lambda:us-east-1:000000000000:function:floci-etl-extractor",
          Next: "TransformData"
        },
        TransformData: {
          Type: "Parallel",
          Branches: [
            {
              StartAt: "CleanPayload",
              States: {
                CleanPayload: {
                  Type: "Task",
                  Resource: "arn:aws:lambda:us-east-1:000000000000:function:floci-cleaner",
                  End: true
                }
              }
            },
            {
              StartAt: "EnrichMetadata",
              States: {
                EnrichMetadata: {
                  Type: "Task",
                  Resource: "arn:aws:lambda:us-east-1:000000000000:function:floci-enricher",
                  End: true
                }
              }
            }
          ],
          Next: "LoadWarehouse"
        },
        LoadWarehouse: {
          Type: "Task",
          Resource: "arn:aws:lambda:us-east-1:000000000000:function:floci-loader",
          End: true
        }
      }
    }, null, 2)
  }
];

// Preloaded mock executions mapping
const PRELOADED_EXECUTIONS: Record<string, any[]> = {
  'arn:aws:states:us-east-1:000000000000:stateMachine:floci-order-processing-pipeline': [
    {
      executionArn: 'arn:aws:states:us-east-1:000000000000:execution:floci-order-processing-pipeline:exec-a9b8c7d6',
      stateMachineArn: 'arn:aws:states:us-east-1:000000000000:stateMachine:floci-order-processing-pipeline',
      name: 'exec-a9b8c7d6-payment-approved',
      status: 'SUCCEEDED',
      startDate: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
      stopDate: new Date(Date.now() - 2 * 3600 * 1000 + 4200).toISOString(),
      input: JSON.stringify({ orderId: "ORD-99881", customerId: "CUST-104", amount: 149.99, cardToken: "tok_visa" }, null, 2),
      output: JSON.stringify({ status: "SUCCESS", orderId: "ORD-99881", paymentId: "ch_3M2h1f", notified: true }, null, 2)
    },
    {
      executionArn: 'arn:aws:states:us-east-1:000000000000:execution:floci-order-processing-pipeline:exec-f5e4d3c2',
      stateMachineArn: 'arn:aws:states:us-east-1:000000000000:stateMachine:floci-order-processing-pipeline',
      name: 'exec-f5e4d3c2-payment-declined',
      status: 'FAILED',
      startDate: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
      stopDate: new Date(Date.now() - 24 * 3600 * 1000 + 1500).toISOString(),
      input: JSON.stringify({ orderId: "ORD-99882", customerId: "CUST-308", amount: 2500.00, cardToken: "tok_declined" }, null, 2),
      output: JSON.stringify({ error: "PaymentDeclinedException", cause: "The gateway payment processor declined the transaction." }, null, 2)
    }
  ],
  'arn:aws:states:us-east-1:000000000000:stateMachine:floci-etl-workflow': [
    {
      executionArn: 'arn:aws:states:us-east-1:000000000000:execution:floci-etl-workflow:exec-12345678',
      stateMachineArn: 'arn:aws:states:us-east-1:000000000000:stateMachine:floci-etl-workflow',
      name: 'exec-12345678-etl-batch',
      status: 'SUCCEEDED',
      startDate: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
      stopDate: new Date(Date.now() - 4 * 3600 * 1000 + 12400).toISOString(),
      input: JSON.stringify({ batchId: "BATCH-2026", filesCount: 14, sourceBucket: "floci-raw-logs" }, null, 2),
      output: JSON.stringify({ processedCount: 1422, status: "COMPLETED", duration: "12.4s" }, null, 2)
    }
  ]
};

// Flow visualizer coordinates compiler interfaces
interface CompiledNode {
  id: string;
  name: string;
  type: string;
  x: number;
  y: number;
  level: number;
}

interface CompiledEdge {
  from: string;
  to: string;
  label?: string;
}

const StepFunctionsView = () => {
  const { clients, logActivity } = useAws();

  // State Machines state
  const [machines, setMachines] = useState<any[]>([]);
  const [loadingMachines, setLoadingMachines] = useState(true);
  const [machineSearch, setMachineSearch] = useState('');

  // Selected Machine details
  const [selectedMachineArn, setSelectedMachineArn] = useState<string | null>(null);
  const [selectedMachine, setSelectedMachine] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<'visualizer' | 'executions'>('visualizer');

  // Executions logs state
  const [executions, setExecutions] = useState<any[]>([]);
  const [loadingExecutions, setLoadingExecutions] = useState(false);
  const [selectedExecution, setSelectedExecution] = useState<any | null>(null);

  // Trigger wizard state
  const [isTriggerOpen, setIsTriggerOpen] = useState(false);
  const [executionPayload, setExecutionPayload] = useState('{\n  "input": "data"\n}');
  const [isLaunching, setIsLaunching] = useState(false);

  // Fetch state machines
  const fetchStateMachines = async () => {
    setLoadingMachines(true);
    try {
      const res = await clients.sfn.send(new ListStateMachinesCommand({}));
      const listed = res.stateMachines || [];

      if (listed.length === 0) {
        setMachines(PRELOADED_STATE_MACHINES);
        if (!selectedMachineArn && PRELOADED_STATE_MACHINES[0]) {
          handleMachineSelect(PRELOADED_STATE_MACHINES[0]);
        }
      } else {
        // Hydrate listed state machines with full definitions
        const fullMachines = await Promise.all(
          listed.map(async (m) => {
            try {
              const details = await clients.sfn.send(new DescribeStateMachineCommand({
                stateMachineArn: m.stateMachineArn!
              }));
              return {
                stateMachineArn: m.stateMachineArn!,
                name: m.name!,
                type: m.type || 'STANDARD',
                creationDate: m.creationDate?.toISOString() || new Date().toISOString(),
                definition: details.definition || '{}'
              };
            } catch {
              return {
                stateMachineArn: m.stateMachineArn!,
                name: m.name!,
                type: m.type || 'STANDARD',
                creationDate: m.creationDate?.toISOString() || new Date().toISOString(),
                definition: '{}'
              };
            }
          })
        );
        setMachines(fullMachines);
        if (!selectedMachineArn && fullMachines[0]) {
          handleMachineSelect(fullMachines[0]);
        }
      }
    } catch (err: any) {
      logActivity('StepFunctions', 'ListStateMachines failed, using preloaded catalog', 'success', err.message);
      setMachines(PRELOADED_STATE_MACHINES);
      if (!selectedMachineArn && PRELOADED_STATE_MACHINES[0]) {
        handleMachineSelect(PRELOADED_STATE_MACHINES[0]);
      }
    } finally {
      setLoadingMachines(false);
    }
  };

  useEffect(() => {
    fetchStateMachines();
  }, []);

  const handleMachineSelect = (machine: any) => {
    setSelectedMachineArn(machine.stateMachineArn);
    setSelectedMachine(machine);
    fetchExecutions(machine.stateMachineArn);
    setActiveTab('visualizer');
    setSelectedExecution(null);
  };

  // Fetch executions
  const fetchExecutions = async (machineArn: string) => {
    setLoadingExecutions(true);
    try {
      const res = await clients.sfn.send(new ListExecutionsCommand({
        stateMachineArn: machineArn
      }));
      const listed = res.executions || [];

      if (listed.length === 0) {
        setExecutions(PRELOADED_EXECUTIONS[machineArn] || []);
      } else {
        const fullExecs = await Promise.all(
          listed.map(async (ex) => {
            try {
              const details = await clients.sfn.send(new DescribeExecutionCommand({
                executionArn: ex.executionArn!
              }));
              return {
                executionArn: ex.executionArn!,
                stateMachineArn: machineArn,
                name: ex.name!,
                status: ex.status!,
                startDate: ex.startDate?.toISOString() || '',
                stopDate: ex.stopDate?.toISOString() || '',
                input: details.input || '{}',
                output: details.output || '{}'
              };
            } catch {
              return {
                executionArn: ex.executionArn!,
                stateMachineArn: machineArn,
                name: ex.name!,
                status: ex.status!,
                startDate: ex.startDate?.toISOString() || '',
                stopDate: ex.stopDate?.toISOString() || '',
                input: '{}',
                output: '{}'
              };
            }
          })
        );
        setExecutions(fullExecs);
      }
    } catch (err: any) {
      setExecutions(PRELOADED_EXECUTIONS[machineArn] || []);
    } finally {
      setLoadingExecutions(false);
    }
  };

  // Start Execution Action
  const handleStartExecution = async () => {
    if (!selectedMachineArn) return;
    setIsLaunching(true);
    
    // Validate JSON input
    let parsedInput = '';
    if (executionPayload.trim()) {
      try {
        JSON.parse(executionPayload);
        parsedInput = executionPayload;
      } catch (e: any) {
        alert(`Payload must be valid JSON: ${e.message}`);
        setIsLaunching(false);
        return;
      }
    }

    const execName = `exec-${Math.random().toString(36).substring(2, 10)}`;

    try {
      const res = await clients.sfn.send(new StartExecutionCommand({
        stateMachineArn: selectedMachineArn,
        name: execName,
        input: parsedInput
      }));

      logActivity('StepFunctions', `StartExecution: ${selectedMachine.name}`, 'success', `Execution name: ${execName}`);
      setIsTriggerOpen(false);

      // Inject temporary running execution at top of logs locally
      const runningExecution = {
        executionArn: res.executionArn || `${selectedMachineArn}:${execName}`,
        stateMachineArn: selectedMachineArn,
        name: execName,
        status: 'RUNNING',
        startDate: new Date().toISOString(),
        input: parsedInput,
        output: '{}'
      };

      setExecutions(prev => [runningExecution, ...prev]);
      setSelectedExecution(runningExecution);
      setActiveTab('executions');

      // Refresh in 4 seconds to capture output state
      setTimeout(() => {
        fetchExecutions(selectedMachineArn);
      }, 4000);

    } catch (err: any) {
      logActivity('StepFunctions', `StartExecution failed: ${selectedMachine.name}`, 'error', err.message);
      alert(`Launch execution failed: ${err.message}`);
    } finally {
      setIsLaunching(false);
    }
  };

  // State Machine Compiler: parses ASL and layouts nodes inranks (breadth-first flow chart coordinates)
  const compileASLFlowchart = (): { nodes: CompiledNode[]; edges: CompiledEdge[] } => {
    if (!selectedMachine || !selectedMachine.definition) {
      return { nodes: [], edges: [] };
    }

    try {
      const asl = JSON.parse(selectedMachine.definition);
      const startState = asl.StartAt;
      const states = asl.States || {};

      if (!startState || Object.keys(states).length === 0) {
        return { nodes: [], edges: [] };
      }

      const nodeLevels: Record<string, number> = {};
      const queue: { name: string; level: number }[] = [{ name: startState, level: 1 }];
      
      // Calculate node depth level
      while (queue.length > 0) {
        const current = queue.shift()!;
        const currentL = current.level;
        
        if (nodeLevels[current.name] !== undefined) {
          nodeLevels[current.name] = Math.max(nodeLevels[current.name], currentL);
        } else {
          nodeLevels[current.name] = currentL;
        }

        const stateObj = states[current.name];
        if (!stateObj) continue;

        if (stateObj.Next) {
          queue.push({ name: stateObj.Next, level: currentL + 1 });
        }
        
        if (stateObj.Choices && Array.isArray(stateObj.Choices)) {
          stateObj.Choices.forEach((ch: any) => {
            if (ch.Next) {
              queue.push({ name: ch.Next, level: currentL + 1 });
            }
          });
        }

        if (stateObj.Default) {
          queue.push({ name: stateObj.Default, level: currentL + 1 });
        }
      }

      // Collect compiled links/edges
      const edges: CompiledEdge[] = [];
      const endNodes: string[] = [];

      Object.keys(states).forEach(name => {
        const st = states[name];
        if (st.Next) {
          edges.push({ from: name, to: st.Next });
        }
        if (st.Choices && Array.isArray(st.Choices)) {
          st.Choices.forEach((ch: any, idx: number) => {
            if (ch.Next) {
              edges.push({ from: name, to: ch.Next, label: ch.StringEquals ? `== "${ch.StringEquals}"` : `Choice #${idx + 1}` });
            }
          });
        }
        if (st.Default) {
          edges.push({ from: name, to: st.Default, label: 'Default' });
        }

        // Parallel state branches support
        if (st.Type === 'Parallel' && st.Branches && Array.isArray(st.Branches)) {
          st.Branches.forEach((b: any) => {
            if (b.StartAt) {
              edges.push({ from: name, to: `${name}_branch_${b.StartAt}` });
              // Simple simulation path
              nodeLevels[`${name}_branch_${b.StartAt}`] = (nodeLevels[name] || 1) + 1;
            }
          });
        }

        // Find terminal nodes pointing to END
        const isTerminal = st.End === true || st.Type === 'Succeed' || st.Type === 'Fail';
        if (isTerminal) {
          endNodes.push(name);
        }
      });

      // Virtual START node
      nodeLevels['START_VIRTUAL'] = 0;
      edges.push({ from: 'START_VIRTUAL', to: startState });

      // Virtual END node
      const maxL = Math.max(...Object.values(nodeLevels), 1);
      const endL = maxL + 1;
      nodeLevels['END_VIRTUAL'] = endL;
      
      endNodes.forEach(endN => {
        edges.push({ from: endN, to: 'END_VIRTUAL' });
      });

      // Group nodes by level for coordinates centering mapping
      const levelGroups: Record<number, string[]> = {};
      Object.keys(nodeLevels).forEach(name => {
        const lvl = nodeLevels[name];
        if (!levelGroups[lvl]) levelGroups[lvl] = [];
        levelGroups[lvl].push(name);
      });

      // Position math
      const compiledNodes: CompiledNode[] = [];
      const verticalGap = 80;
      const horizontalGap = 150;
      const canvasWidth = 650;

      Object.keys(levelGroups).forEach(lvlStr => {
        const lvl = parseInt(lvlStr, 10);
        const group = levelGroups[lvl];
        const K = group.length;

        group.forEach((name, idx) => {
          const stateObj = states[name] || {};
          const type = name === 'START_VIRTUAL' ? 'START' : name === 'END_VIRTUAL' ? 'END' : (stateObj.Type || 'Task');
          
          // Center coordinate logic
          const x = canvasWidth / 2 + (idx - (K - 1) / 2) * horizontalGap;
          const y = lvl * verticalGap + 40;

          compiledNodes.push({
            id: name,
            name: name === 'START_VIRTUAL' ? 'Start' : name === 'END_VIRTUAL' ? 'End' : name,
            type,
            x,
            y,
            level: lvl
          });
        });
      });

      return { nodes: compiledNodes, edges };
    } catch {
      return { nodes: [], edges: [] };
    }
  };

  const { nodes: flowNodes, edges: flowEdges } = compileASLFlowchart();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SUCCEEDED': return 'text-brand-green border-brand-green bg-brand-green/5';
      case 'FAILED': return 'text-rose-600 border-rose-600 bg-rose-50';
      case 'RUNNING': return 'text-yellow-600 border-yellow-600 bg-yellow-50 animate-pulse';
      case 'ABORTED': return 'text-neutral-500 border-neutral-500 bg-neutral-100';
      default: return 'text-neutral-500 border-transparent';
    }
  };

  const filteredMachines = machines.filter(m => m.name.toLowerCase().includes(machineSearch.toLowerCase()));

  return (
    <div className="flex flex-col h-full uppercase font-sans">
      <PageHeader
        title="Step Functions Explorer"
        icon={<GitBranch size={18} />}
        onRefresh={() => selectedMachineArn && fetchExecutions(selectedMachineArn)}
        isRefreshing={loadingExecutions}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar state machines explorer */}
        <aside className="w-72 border-r border-brand-text flex flex-col bg-brand-muted shrink-0">
          <div className="p-4 border-b border-brand-text space-y-3 bg-brand-muted/50">
            <h3 className="font-bold text-[10px] tracking-widest text-brand-text opacity-70">State Machines ({machines.length})</h3>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-brand-text opacity-30" size={13} />
              <Input
                placeholder="Search state machines..."
                className="pl-8 text-[11px] font-mono"
                value={machineSearch}
                onChange={e => setMachineSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {loadingMachines ? (
              [1, 2].map(i => <Skeleton key={i} className="h-9 w-full" />)
            ) : filteredMachines.length === 0 ? (
              <div className="text-[10px] text-center text-brand-text opacity-40 p-6 italic">No state machines found</div>
            ) : (
              filteredMachines.map(m => (
                <button
                  key={m.stateMachineArn}
                  onClick={() => handleMachineSelect(m)}
                  className={`w-full text-left px-3 py-2 text-[11px] font-mono border transition-all ${
                    selectedMachineArn === m.stateMachineArn
                      ? 'bg-brand-text text-brand-bg border-brand-text font-bold shadow-xs'
                      : 'border-transparent hover:bg-white/60 hover:border-brand-text/30'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="truncate">{m.name}</span>
                    <ChevronRight size={10} className={selectedMachineArn === m.stateMachineArn ? 'text-brand-bg' : 'opacity-40'} />
                  </div>
                </button>
              ))
            )}
          </div>
        </aside>

        {/* Right workspace detail */}
        <main className="flex-1 flex flex-col bg-brand-bg overflow-hidden relative">
          {!selectedMachineArn ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-brand-bg/50">
              <div className="w-16 h-16 border border-brand-text/20 flex items-center justify-center text-brand-text/30 mb-4 bg-brand-muted/30">
                <GitBranch size={30} />
              </div>
              <h3 className="font-serif-italic text-lg text-brand-text mb-2">No State Machine Selected</h3>
              <p className="text-[10px] text-brand-text opacity-50 uppercase max-w-sm tracking-wider">
                Select an active workflow from the sidebar explorer to inspect compiler flow charts, execute JSON payloads, or review histories.
              </p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Header Info Panel */}
              <div className="p-4 border-b border-brand-text bg-brand-muted/40 shrink-0">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-bold font-mono text-brand-text">{selectedMachine.name}</h3>
                    <p className="text-[10px] text-brand-text opacity-60 mt-1 uppercase font-serif-italic normal-case lowercase truncate">
                      {selectedMachine.stateMachineArn}
                    </p>
                  </div>
                  <Button
                    onClick={() => {
                      setExecutionPayload('{\n  "paymentStatus": "APPROVED",\n  "amount": 25.00\n}');
                      setIsTriggerOpen(true);
                    }}
                    icon={<PlayCircle size={13} />}
                    className="md:w-44"
                  >
                    Start Execution
                  </Button>
                </div>

                {/* Tab selections */}
                <div className="flex gap-2 mt-4 border-t border-brand-text/20 pt-3">
                  {(['visualizer', 'executions'] as const).map(tab => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider border transition-all ${
                        activeTab === tab
                          ? 'bg-brand-text text-brand-bg border-brand-text'
                          : 'bg-transparent border-transparent hover:bg-brand-muted hover:border-brand-text/20'
                      }`}
                    >
                      {tab === 'visualizer' && 'SVG Flowchart & ASL'}
                      {tab === 'executions' && 'Executions logs'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tab Contents Workspace */}
              <div className="flex-1 overflow-hidden flex flex-col">
                
                {/* A. Dynamic SVG Visualizer & ASL */}
                {activeTab === 'visualizer' && (
                  <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
                    {/* SVG Render box */}
                    <div className="flex-1 p-4 overflow-auto flex items-center justify-center bg-brand-muted/10 border-r border-brand-text/10">
                      <div className="relative border border-brand-text bg-white p-6 shadow-sm overflow-hidden select-none min-w-[500px]">
                        <div className="absolute top-3 left-3 flex items-center gap-1 text-[8px] font-bold text-neutral-400 tracking-widest uppercase">
                          <Eye size={10} />
                          Live Interactive Chart
                        </div>

                        <svg width="650" height="520">
                          {/* Arrows Head Defs */}
                          <defs>
                            <marker
                              id="arrow"
                              viewBox="0 0 10 10"
                              refX="9"
                              refY="5"
                              markerWidth="5"
                              markerHeight="5"
                              orient="auto-start-reverse"
                            >
                              <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#64748b" />
                            </marker>
                          </defs>

                          {/* Render Flow Edges */}
                          {flowEdges.map((e, idx) => {
                            const fromNode = flowNodes.find(n => n.id === e.from);
                            const toNode = flowNodes.find(n => n.id === e.to);

                            if (!fromNode || !toNode) return null;

                            const isStraight = fromNode.x === toNode.x;
                            const h = 40;
                            const y1 = fromNode.y + h / 2;
                            const y2 = toNode.y - h / 2;
                            const x1 = fromNode.x;
                            const x2 = toNode.x;

                            if (isStraight) {
                              return (
                                <g key={idx}>
                                  <line
                                    x1={x1}
                                    y1={y1}
                                    x2={x2}
                                    y2={y2}
                                    stroke="#64748b"
                                    strokeWidth="1.5"
                                    markerEnd="url(#arrow)"
                                  />
                                  {e.label && (
                                    <text
                                      x={x1 + 6}
                                      y={(y1 + y2) / 2}
                                      className="font-mono text-[8px] fill-amber-700 bg-white"
                                      textAnchor="start"
                                    >
                                      {e.label}
                                    </text>
                                  )}
                                </g>
                              );
                            } else {
                              // Nice curves path
                              const midY = (y1 + y2) / 2;
                              const dPath = `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`;
                              return (
                                <g key={idx}>
                                  <path
                                    d={dPath}
                                    fill="none"
                                    stroke="#64748b"
                                    strokeWidth="1.2"
                                    markerEnd="url(#arrow)"
                                  />
                                  {e.label && (
                                    <text
                                      x={(x1 + x2) / 2 + 5}
                                      y={midY - 4}
                                      className="font-mono text-[8px] fill-amber-700 font-bold"
                                      textAnchor="middle"
                                    >
                                      {e.label}
                                    </text>
                                  )}
                                </g>
                              );
                            }
                          })}

                          {/* Render Flow Nodes */}
                          {flowNodes.map(n => {
                            const isVirtual = n.type === 'START' || n.type === 'END';
                            const isHovered = hoveredNodeId === n.id;
                            const isSelected = selectedNodeId === n.id;

                            const { fill, strokeClass } = getNodeColor(n.type, isHovered, isSelected);
                            const cardW = isVirtual ? 60 : 120;
                            const cardH = 34;

                            return (
                              <g
                                key={n.id}
                                className="cursor-pointer"
                                onMouseEnter={() => setHoveredNodeId(n.id)}
                                onMouseLeave={() => setHoveredNodeId(null)}
                                onClick={() => !isVirtual && setSelectedNodeId(n.id)}
                              >
                                <rect
                                  x={n.x - cardW / 2}
                                  y={n.y - cardH / 2}
                                  width={cardW}
                                  height={cardH}
                                  rx={isVirtual ? 17 : 4}
                                  className={`${fill} ${strokeClass} transition-all duration-150`}
                                />
                                <text
                                  x={n.x}
                                  y={n.y + 3}
                                  className={`font-mono text-[9px] text-center ${
                                    isVirtual ? 'font-bold uppercase tracking-wider' : 'normal-case text-neutral-800'
                                  }`}
                                  textAnchor="middle"
                                >
                                  {n.name}
                                </text>
                              </g>
                            );
                          })}
                        </svg>
                      </div>
                    </div>

                    {/* Node details or ASL definition panel */}
                    <div className="w-96 overflow-y-auto p-4 bg-brand-muted/10 shrink-0 flex flex-col gap-4">
                      {selectedNodeId && selectedNodeDetails ? (
                        <div className="space-y-4">
                          <div className="flex justify-between items-center border-b border-brand-text/15 pb-2">
                            <h4 className="font-bold text-[10px] tracking-wider text-brand-text font-mono">State: {selectedNodeId}</h4>
                            <button 
                              onClick={() => setSelectedNodeId(null)} 
                              className="text-[8px] font-bold text-neutral-400 hover:text-neutral-600 border px-1 bg-white"
                            >
                              Close
                            </button>
                          </div>

                          <Card className="space-y-3 font-mono text-[10px]">
                            <div className="flex justify-between border-b border-brand-text/5 pb-1.5">
                              <span className="opacity-60">Type:</span>
                              <span className="font-bold">{selectedNodeDetails.Type}</span>
                            </div>
                            
                            {selectedNodeDetails.Resource && (
                              <div className="border-b border-brand-text/5 pb-1.5 space-y-1">
                                <span className="opacity-60 block">Resource:</span>
                                <span className="font-bold text-neutral-600 block break-all leading-normal lowercase">{selectedNodeDetails.Resource}</span>
                              </div>
                            )}

                            {selectedNodeDetails.Next && (
                              <div className="flex justify-between border-b border-brand-text/5 pb-1.5">
                                <span className="opacity-60">Transition Next:</span>
                                <span className="font-bold">{selectedNodeDetails.Next}</span>
                              </div>
                            )}

                            {selectedNodeDetails.End && (
                              <div className="flex justify-between border-b border-brand-text/5 pb-1.5">
                                <span className="opacity-60">Terminal End:</span>
                                <span className="font-bold text-brand-green">TRUE</span>
                              </div>
                            )}

                            {selectedNodeDetails.Error && (
                              <div className="border-b border-brand-text/5 pb-1.5 space-y-1">
                                <span className="opacity-60 block">Error Tag:</span>
                                <span className="font-bold text-rose-600 block">{selectedNodeDetails.Error}</span>
                              </div>
                            )}

                            {selectedNodeDetails.Cause && (
                              <div className="space-y-1">
                                <span className="opacity-60 block">Cause:</span>
                                <span className="italic text-neutral-500 block leading-normal normal-case">{selectedNodeDetails.Cause}</span>
                              </div>
                            )}
                          </Card>
                        </div>
                      ) : (
                        <div className="flex-1 flex flex-col">
                          <div className="flex items-center gap-2 border-b border-brand-text/15 pb-2 mb-3">
                            <Code size={14} className="text-brand-text/50" />
                            <h4 className="font-bold text-[10px] tracking-wider text-brand-text font-mono uppercase">ASL definition</h4>
                          </div>

                          <pre className="flex-1 w-full bg-brand-console text-brand-green p-4 font-mono text-[10px] overflow-y-auto border border-brand-text/20 select-text normal-case leading-relaxed">
                            {selectedMachine.definition}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* B. Executions List logs */}
                {activeTab === 'executions' && (
                  <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                    {/* Execution lists */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 border-r border-brand-text/10">
                      <h4 className="font-bold text-[10px] tracking-widest text-brand-text opacity-70 mb-3 border-b border-brand-text/15 pb-2">Recent Executions ({executions.length})</h4>
                      
                      {loadingExecutions ? (
                        [1, 2].map(i => <Skeleton key={i} className="h-14 w-full" />)
                      ) : executions.length === 0 ? (
                        <div className="text-[10px] text-center italic text-brand-text opacity-35 py-12">No executions found. Click start execution above.</div>
                      ) : (
                        executions.map(ex => {
                          const execNum = ex.name;
                          const isSelected = selectedExecution?.executionArn === ex.executionArn;
                          return (
                            <button
                              key={ex.executionArn}
                              onClick={() => setSelectedExecution(ex)}
                              className={`w-full text-left p-3 border font-mono text-[11px] transition-all flex items-center justify-between ${
                                isSelected
                                  ? 'border-brand-text bg-white shadow-xs'
                                  : 'border-brand-text/20 bg-brand-muted/10 hover:border-brand-text/50 hover:bg-white/40'
                              }`}
                            >
                              <div className="space-y-1">
                                <div className="font-bold text-brand-text flex items-center gap-2">
                                  <Clock size={12} className="opacity-60" />
                                  <span>{execNum}</span>
                                </div>
                                <div className="text-[9px] text-neutral-400">
                                  Started: <span className="text-neutral-600 font-bold">{new Date(ex.startDate).toLocaleTimeString()}</span>
                                </div>
                              </div>

                              <div className="flex items-center gap-3">
                                <span className={`px-2 py-0.5 border text-[9px] font-bold ${getStatusColor(ex.status)}`}>
                                  {ex.status}
                                </span>
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>

                    {/* Payloads visual cards */}
                    <div className="w-1/2 overflow-y-auto p-4 bg-brand-muted/10 shrink-0 flex flex-col gap-4">
                      {selectedExecution ? (
                        <div className="space-y-4 flex flex-col h-full">
                          <div className="border-b border-brand-text/20 pb-3">
                            <h4 className="font-bold text-[11px] font-mono text-brand-text">Execution Details: {selectedExecution.name}</h4>
                            <span className="text-[9px] text-neutral-400 font-mono block mt-1 lowercase truncate">{selectedExecution.executionArn}</span>
                          </div>

                          <div className="grid grid-cols-2 gap-3 text-[10px] font-mono shrink-0">
                            <div className="border p-2.5 bg-white">
                              <span className="opacity-60 block uppercase font-bold text-[8px] mb-0.5">Status</span>
                              <span className="font-bold">{selectedExecution.status}</span>
                            </div>
                            <div className="border p-2.5 bg-white">
                              <span className="opacity-60 block uppercase font-bold text-[8px] mb-0.5">Start Time</span>
                              <span>{new Date(selectedExecution.startDate).toLocaleTimeString()}</span>
                            </div>
                          </div>

                          {/* COLLAPSIBLE COLLATERAL DUAL BLOCKS INPUT & OUTPUT */}
                          <div className="flex-1 flex flex-col gap-3 overflow-hidden">
                            <div className="flex-1 flex flex-col overflow-hidden min-h-[140px]">
                              <span className="text-[9px] font-bold text-neutral-500 uppercase flex items-center gap-1 shrink-0 mb-1">
                                <Terminal size={10} />
                                Input Payload JSON
                              </span>
                              <pre className="flex-1 bg-brand-console text-brand-green p-3 font-mono text-[10px] overflow-y-auto border border-brand-text/20 select-text normal-case leading-relaxed">
                                {selectedExecution.input}
                              </pre>
                            </div>

                            <div className="flex-1 flex flex-col overflow-hidden min-h-[140px]">
                              <span className="text-[9px] font-bold text-neutral-500 uppercase flex items-center gap-1 shrink-0 mb-1">
                                <Terminal size={10} />
                                Output Payload JSON
                              </span>
                              {selectedExecution.status === 'RUNNING' ? (
                                <div className="flex-1 flex items-center justify-center p-6 border border-dashed text-neutral-400 text-[10px] font-mono uppercase animate-pulse">
                                  Running step transitions...
                                </div>
                              ) : (
                                <pre className="flex-1 bg-brand-console text-brand-green p-3 font-mono text-[10px] overflow-y-auto border border-brand-text/20 select-text normal-case leading-relaxed">
                                  {selectedExecution.output}
                                </pre>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center p-6 text-center text-brand-text opacity-40">
                          <Terminal size={24} className="mb-2 opacity-50" />
                          <div className="text-[10px] uppercase font-bold tracking-wider">Select an execution run to inspect dual JSON payload data</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Trigger build / execution override modal */}
      {isTriggerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-brand-bg border border-brand-text shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-brand-text bg-brand-muted">
              <h3 className="font-serif-italic text-lg">Start State Machine Execution</h3>
              <button onClick={() => setIsTriggerOpen(false)} className="p-1 hover:bg-white border border-transparent hover:border-brand-text transition-all">
                <ChevronRight size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4 text-brand-text font-mono text-[10px]">
              <div className="space-y-1.5">
                <label className="text-[9px] font-bold uppercase opacity-60 flex items-center gap-1">
                  <FileCode size={11} />
                  Input JSON Payload Configuration
                </label>
                <textarea
                  className="w-full bg-white border border-brand-text p-4 font-mono text-[11px] h-44 focus:outline-none placeholder:italic"
                  value={executionPayload}
                  onChange={e => setExecutionPayload(e.target.value)}
                  placeholder={`{\n  "key": "value"\n}`}
                />
              </div>

              <div className="flex gap-2 p-3 bg-amber-50 border border-amber-300 text-amber-900 leading-normal">
                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                <span className="uppercase text-[8px] font-bold">This initiates a synchronous local standard workflow execution.</span>
              </div>
            </div>

            {/* Modal actions */}
            <div className="p-4 border-t border-brand-text bg-brand-muted flex gap-3">
              <Button variant="ghost" className="flex-1 text-xs" onClick={() => setIsTriggerOpen(false)}>Cancel</Button>
              <Button
                className="flex-1 text-xs"
                onClick={handleStartExecution}
                disabled={isLaunching}
                icon={<Play size={12} />}
              >
                {isLaunching ? 'LAUNCHING...' : 'DISPATCH_WORKFLOW'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StepFunctionsView;
