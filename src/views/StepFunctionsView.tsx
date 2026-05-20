import React, { useState, useEffect } from 'react';
import { ListStateMachinesCommand, CreateStateMachineCommand, DeleteStateMachineCommand } from '@aws-sdk/client-sfn';
import { useAws } from '../contexts/AwsContext';
import { GitBranch, Search, CirclePlus, Trash2, Play, Activity, Clock, Zap, Cpu, Code2 } from 'lucide-react';
import { PageHeader, Card, Button, Input, Skeleton, Modal, Select } from '../components/ui-elements';

interface ExecutionSim {
  executionArn: string;
  stateMachineArn: string;
  status: 'SUCCEEDED' | 'RUNNING' | 'FAILED';
  startDate: string;
  stopDate?: string;
  output: string;
}

const StepFunctionsView = () => {
  const { clients, logActivity } = useAws();
  const [machines, setMachines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Custom states that distinguish Express workflows
  const [expressWorkflows, setExpressWorkflows] = useState<Record<string, 'STANDARD' | 'EXPRESS'>>(() => {
    const saved = localStorage.getItem('aws-sim-sfn-types');
    return saved ? JSON.parse(saved) : {};
  });

  // Creation
  const [isCreationModalOpen, setIsCreationModalOpen] = useState(false);
  const [newMachineName, setNewMachineName] = useState('');
  const [machineType, setMachineType] = useState<'STANDARD' | 'EXPRESS'>('STANDARD');
  const [isCreating, setIsCreating] = useState(false);

  // Active trigger simulator
  const [activeExec, setActiveExec] = useState<ExecutionSim | null>(null);
  const [execInput, setExecInput] = useState('{"orderId": "order-101", "amount": 85.50}');

  useEffect(() => {
    localStorage.setItem('aws-sim-sfn-types', JSON.stringify(expressWorkflows));
  }, [expressWorkflows]);

  const fetchMachines = async () => {
    setLoading(true);
    try {
      const response = await clients.sfn.send(new ListStateMachinesCommand({}));
      setMachines(response.stateMachines || []);
      logActivity('StepFunctions', 'ListStateMachines', 'success');
    } catch (err: any) {
      logActivity('StepFunctions', 'ListStateMachines failed', 'error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newMachineName) return;
    setIsCreating(true);
    try {
      const definition = JSON.stringify({
        StartAt: "WorkflowStart",
        States: {
          WorkflowStart: {
            Type: "Pass",
            Result: {
              status: "processed",
              timestamp: Date.now()
            },
            End: true
          }
        }
      });
      const response = await clients.sfn.send(new CreateStateMachineCommand({
        name: newMachineName,
        definition: definition,
        roleArn: 'arn:aws:iam::000000000000:role/stepfunctions-role'
      }));
      
      const newArn = response.stateMachineArn;
      if (newArn) {
        setExpressWorkflows(prev => ({
          ...prev,
          [newArn]: machineType
        }));
      }

      logActivity('StepFunctions', `CreateStateMachine: ${newMachineName} [type=${machineType}]`, 'success');
      setNewMachineName('');
      setIsCreationModalOpen(false);
      fetchMachines();
    } catch (err: any) {
      logActivity('StepFunctions', `CreateStateMachine failed: ${newMachineName}`, 'error', err.message);
      alert(err.message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (arn: string, name: string) => {
    if (!confirm(`Delete State Machine ${name}?`)) return;
    try {
      await clients.sfn.send(new DeleteStateMachineCommand({ stateMachineArn: arn }));
      // cleanup type storage
      setExpressWorkflows(prev => {
        const next = { ...prev };
        delete next[arn];
        return next;
      });
      logActivity('StepFunctions', `DeleteStateMachine: ${name}`, 'success');
      fetchMachines();
    } catch (err: any) {
      logActivity('StepFunctions', `DeleteStateMachine failed: ${name}`, 'error', err.message);
      alert(err.message);
    }
  };

  const handleTriggerExecution = (arn: string, name: string) => {
    const isExpress = expressWorkflows[arn] === 'EXPRESS';
    const executionArn = `arn:aws:states:eu-central-1:000000000000:execution:${name}:${Math.random().toString(36).substring(5)}`;
    
    // Simulate immediate transition feedback
    const simulatedOutput = JSON.stringify({
      executionId: executionArn,
      workflowType: isExpress ? "EXPRESS_SYNC" : "STANDARD_ASYNC",
      inputPayload: JSON.parse(execInput || '{}'),
      results: {
        gatewaySuccess: true,
        workflowCompleted: true,
        latencyMs: isExpress ? "14ms (Optimal)" : "1200ms (Scheduled DB polling)"
      }
    }, null, 2);

    const active: ExecutionSim = {
      executionArn,
      stateMachineArn: arn,
      status: 'SUCCEEDED',
      startDate: new Date().toISOString(),
      stopDate: new Date().toISOString(),
      output: simulatedOutput
    };

    setActiveExec(active);
    logActivity('StepFunctions', `StartExecution: ${name} [Engine: ${isExpress ? 'EXPRESS_SPEED' : 'STANDARD'}]`, 'success');
  };

  useEffect(() => {
    fetchMachines();
  }, []);

  return (
    <div className="flex flex-col h-full uppercase">
      <PageHeader 
        title="Step Functions Engine" 
        icon={<GitBranch size={18} />}
        onRefresh={fetchMachines}
        isRefreshing={loading}
        actions={
          <Button onClick={() => setIsCreationModalOpen(true)} icon={<CirclePlus size={14} />}>
            New State Machine
          </Button>
        }
      />

      <Modal 
        isOpen={isCreationModalOpen} 
        onClose={() => setIsCreationModalOpen(false)} 
        title="Create State Machine"
      >
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60">Machine Name</label>
            <Input 
              value={newMachineName}
              onChange={e => setNewMachineName(e.target.value)}
              placeholder="OrderWorkflow"
              autoFocus
            />
          </div>
          
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60">Workflow Engine Processing Type</label>
            <Select value={machineType} onChange={e => setMachineType(e.target.value as any)}>
              <option value="STANDARD">Standard Workflow (Long-running, audit trails, async)</option>
              <option value="EXPRESS">Express Workflow (Sub-second execution, microservice broker, high-throughput)</option>
            </Select>
          </div>

          <div className="p-3 bg-brand-muted/30 border border-brand-text border-dashed text-[9px] opacity-70 normal-case">
            <p><strong>Note:</strong> Express workflows are optimized for high-throughput messaging pipelines. A default Pass state will be created for initialization.</p>
          </div>

          <div className="pt-4 flex gap-3">
             <Button variant="ghost" className="flex-1" onClick={() => setIsCreationModalOpen(false)}>Cancel</Button>
             <Button className="flex-1" onClick={handleCreate} disabled={!newMachineName || isCreating}>
               {isCreating ? 'Creating...' : 'Create Machine'}
             </Button>
          </div>
        </div>
      </Modal>

      <div className="p-6 flex-1 overflow-auto bg-brand-bg grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Machine Listings */}
        <div className="lg:col-span-2 space-y-4">
          {loading ? (
            [1, 2].map(i => <Skeleton key={i} className="h-28" />)
          ) : machines.length === 0 ? (
            <div className="col-span-full py-20 text-center border border-dashed border-brand-text/20">
               <p className="text-xs opacity-40 font-mono italic">NO_WORKFLOWS_FOUND</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {machines.map(m => {
                const type = expressWorkflows[m.stateMachineArn] || 'STANDARD';
                return (
                  <Card key={m.stateMachineArn} className="group hover:border-brand-text transition-all bg-white font-mono">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex gap-3">
                        <div className="p-2 bg-brand-muted border border-brand-text shrink-0">
                          <GitBranch size={16} />
                        </div>
                        <div className="truncate max-w-[140px]">
                          <h4 className="font-bold text-xs truncate leading-tight">{m.name}</h4>
                          <p className="text-[8px] font-mono opacity-40 truncate mt-0.5 lowercase">{m.stateMachineArn}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {type === 'EXPRESS' ? (
                          <span className="text-[7px] font-bold px-1.5 py-0.5 bg-amber-50 text-amber-800 border border-amber-300">EXPRESS</span>
                        ) : (
                          <span className="text-[7px] font-bold px-1.5 py-0.5 bg-zinc-100 text-zinc-800 border border-zinc-300">STANDARD</span>
                        )}
                        <button onClick={() => handleDelete(m.stateMachineArn!, m.name!)} className="p-1 hover:text-rose-500 shrink-0"><Trash2 size={14} /></button>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-brand-text/5 flex items-center justify-between text-[8px] font-bold">
                      <span className="opacity-40">CREATED: {new Date(m.creationDate).toLocaleDateString()}</span>
                      <button 
                        onClick={() => handleTriggerExecution(m.stateMachineArn, m.name)}
                        className="flex items-center gap-1 bg-black text-white hover:bg-brand-text px-2 py-1 transition-all"
                      >
                        <Play size={10} fill="currentColor" /> trigger
                      </button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Dynamic Execution Output & Simulator panel */}
        <div className="space-y-6">
          <Card secondary className="bg-white border-brand-text">
            <h4 className="font-bold text-[10px] mb-4 tracking-widest border-b border-brand-text/10 pb-2">WORKFLOW_RUNNER</h4>
            
            <div className="space-y-4 font-mono text-[10px]">
              <div>
                <label className="text-[8px] font-sans font-bold uppercase opacity-50 block mb-1">Execution Input Arguments (JSON)</label>
                <textarea 
                  value={execInput}
                  onChange={e => setExecInput(e.target.value)}
                  className="w-full h-24 bg-brand-muted/10 border font-mono text-[9px] p-2 focus:outline-none"
                />
              </div>

              {activeExec && (
                <div className="space-y-2 border-t border-dashed border-brand-text/10 pt-4">
                  <div className="flex justify-between items-center text-[8px] uppercase">
                    <span className="font-bold text-emerald-700">● EXECUTION_SUCCESS</span>
                    <button onClick={() => setActiveExec(null)} className="opacity-50 hover:opacity-100 font-bold">[Clear]</button>
                  </div>
                  
                  <div className="text-[8px] opacity-65">
                     <p>RUN_ID: {activeExec.executionArn.split(':').pop()}</p>
                     <p>TIME: {activeExec.startDate}</p>
                  </div>

                  <pre className="bg-brand-console text-brand-green p-3 text-[8.5px] overflow-x-auto max-h-56 leading-relaxed">
                     {activeExec.output}
                  </pre>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default StepFunctionsView;
