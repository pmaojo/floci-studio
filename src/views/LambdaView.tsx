import React, { useState, useEffect } from 'react';
import { 
  ListFunctionsCommand, 
  CreateFunctionCommand, 
  DeleteFunctionCommand,
  InvokeCommand
} from '@aws-sdk/client-lambda';
import { useAws } from '../contexts/AwsContext';
import { Zap, Search, CirclePlus, Trash2, Play, ExternalLink, Code2, Clock, Cpu, Layers, Puzzle } from 'lucide-react';
import { PageHeader, Card, Button, Input, Skeleton, Modal, Select } from '../components/ui-elements';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';

interface LambdaLayer {
  id: string;
  name: string;
  description: string;
  compatibleRuntimes: string;
  version: number;
}

interface LambdaExtension {
  id: string;
  name: string;
  provider: string;
  description: string;
  status: 'ACTIVE' | 'DISABLED';
}

const LambdaView = () => {
  const { clients, logActivity } = useAws();
  const [activeTab, setActiveTab] = useState<'functions' | 'layers' | 'extensions'>('functions');
  const [functions, setFunctions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [invoking, setInvoking] = useState<string | null>(null);
  const [invokeResult, setInvokeResult] = useState<any>(null);
  
  // Function Modals
  const [isCreationModalOpen, setIsCreationModalOpen] = useState(false);
  const [newFuncName, setNewFuncName] = useState('');
  const [runtime, setRuntime] = useState('nodejs18.x');
  const [memory, setMemory] = useState('128');
  const [timeout, setTimeoutVal] = useState('3');
  const [isCreating, setIsCreating] = useState(false);

  // Layer States
  const [layers, setLayers] = useState<LambdaLayer[]>(() => {
    const saved = localStorage.getItem('aws-sim-lambda-layers');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // Fallback
      }
    }
    return [
      {
        id: "layer-01",
        name: "aws-telemetry-sdk-layer",
        description: "Enterprise Core telemetry tracking agent",
        compatibleRuntimes: "nodejs18.x, python3.9",
        version: 3
      }
    ];
  });
  const [isLayerModalOpen, setIsLayerModalOpen] = useState(false);
  const [newLayerName, setNewLayerName] = useState('');
  const [newLayerDesc, setNewLayerDesc] = useState('');
  const [compatibleRuntimes, setCompatibleRuntimes] = useState('nodejs18.x');

  // Extension States
  const [extensions, setExtensions] = useState<LambdaExtension[]>(() => {
    const saved = localStorage.getItem('aws-sim-lambda-exts');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // Fallback
      }
    }
    return [
      {
        id: "ext-01",
        name: "secrets-manager-local-cache",
        provider: "AWS Systems",
        description: "Low-latency key caching directly inside AWS runtime daemon",
        status: "ACTIVE"
      },
      {
        id: "ext-02",
        name: "datadog-apm-tracer",
        provider: "Datadog SaaS",
        description: "Active monitoring, metrics and logging pipeline aggregation",
        status: "DISABLED"
      }
    ];
  });
  const [isExtModalOpen, setIsExtModalOpen] = useState(false);
  const [extName, setExtName] = useState('');
  const [extProvider, setExtProvider] = useState('AWS Built-in');
  const [extDesc, setExtDesc] = useState('');

  useEffect(() => {
    localStorage.setItem('aws-sim-lambda-layers', JSON.stringify(layers));
  }, [layers]);

  useEffect(() => {
    localStorage.setItem('aws-sim-lambda-exts', JSON.stringify(extensions));
  }, [extensions]);

  const fetchFunctions = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await clients.lambda.send(new ListFunctionsCommand({}));
      setFunctions(response.Functions || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch functions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFunctions();
  }, []);

  const handleInvoke = async (functionName: string) => {
    setInvoking(functionName);
    setInvokeResult(null);
    try {
      const response = await clients.lambda.send(new InvokeCommand({
        FunctionName: functionName,
        Payload: new TextEncoder().encode(JSON.stringify({ test: "event" }))
      }));
      
      logActivity('Lambda', `Invoke: ${functionName}`, 'success');

      let payload = '';
      if (response.Payload) {
        payload = new TextDecoder().decode(response.Payload);
      }
      
      setInvokeResult({
        status: response.StatusCode,
        payload: payload ? JSON.parse(payload) : null
      });
    } catch (err: any) {
      logActivity('Lambda', `Invoke failed: ${functionName}`, 'error', err.message);
      setInvokeResult({ error: err.message });
    } finally {
      setInvoking(null);
    }
  };

  const handleDelete = async (functionName: string) => {
    if (!confirm(`Delete function ${functionName}?`)) return;
    try {
      await clients.lambda.send(new DeleteFunctionCommand({ FunctionName: functionName }));
      logActivity('Lambda', `DeleteFunction: ${functionName}`, 'success');
      fetchFunctions();
    } catch (err: any) {
      logActivity('Lambda', `DeleteFunction failed: ${functionName}`, 'error', err.message);
      alert(err.message);
    }
  };

  const handleCreate = async () => {
    if (!newFuncName) return;
    setIsCreating(true);
    try {
      await clients.lambda.send(new CreateFunctionCommand({
        FunctionName: newFuncName,
        Runtime: runtime,
        Role: 'arn:aws:iam::000000000000:role/lambda-role',
        Handler: 'index.handler',
        Code: { ZipFile: new Uint8Array([80, 75, 5, 6, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]) }, // Minimal ZIP stub
        Description: 'Created via Floci UI',
        Timeout: parseInt(timeout),
        MemorySize: parseInt(memory)
      }));
      logActivity('Lambda', `CreateFunction: ${newFuncName}`, 'success');
      setNewFuncName('');
      setIsCreationModalOpen(false);
      fetchFunctions();
    } catch (err: any) {
      logActivity('Lambda', `CreateFunction failed: ${newFuncName}`, 'error', err.message);
      alert(err.message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleCreateLayer = () => {
    if (!newLayerName) return;
    const newLayer: LambdaLayer = {
      id: `layer-${Math.random().toString(36).substring(5)}`,
      name: newLayerName,
      description: newLayerDesc,
      compatibleRuntimes,
      version: 1
    };
    setLayers(prev => [...prev, newLayer]);
    logActivity('LambdaLayer', `PublishLayerVersion: ${newLayerName}`, 'success');
    setIsLayerModalOpen(false);
    setNewLayerName('');
    setNewLayerDesc('');
  };

  const handleDeleteLayer = (id: string, name: string) => {
    if (!confirm(`Delete Layer association on ${name}?`)) return;
    setLayers(prev => prev.filter(l => l.id !== id));
    logActivity('LambdaLayer', `DeleteLayer: ${name}`, 'success');
  };

  const handleCreateExtension = () => {
    if (!extName) return;
    const newExt: LambdaExtension = {
      id: `ext-${Math.random().toString(36).substring(5)}`,
      name: extName,
      provider: extProvider,
      description: extDesc,
      status: 'ACTIVE'
    };
    setExtensions(prev => [...prev, newExt]);
    logActivity('LambdaExtension', `CreateExtension: ${extName}`, 'success');
    setIsExtModalOpen(false);
    setExtName('');
    setExtDesc('');
  };

  const toggleExtStatus = (id: string, current: string) => {
    const nextStatus = current === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
    setExtensions(prev => prev.map(e => e.id === id ? { ...e, status: nextStatus } : e));
    logActivity('LambdaExtension', `ToggleExtension: ${id} to ${nextStatus}`, 'success');
  };

  const handleDeleteExtension = (id: string, name: string) => {
    if (!confirm(`Remove extension ${name}?`)) return;
    setExtensions(prev => prev.filter(e => e.id !== id));
    logActivity('LambdaExtension', `DeleteExtension: ${name}`, 'success');
  };

  const filteredFunctions = functions.filter(f => f.FunctionName?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="flex flex-col h-full uppercase">
      <PageHeader 
        title="Lambda Compute" 
        icon={<Zap size={18} />}
        onRefresh={activeTab === 'functions' ? fetchFunctions : () => {}}
        isRefreshing={loading && activeTab === 'functions'}
        actions={
          activeTab === 'functions' ? (
            <Button onClick={() => setIsCreationModalOpen(true)} icon={<CirclePlus size={14} />}>
              Create Function
            </Button>
          ) : activeTab === 'layers' ? (
            <Button onClick={() => setIsLayerModalOpen(true)} icon={<CirclePlus size={14} />}>
              Publish Layer Version
            </Button>
          ) : (
            <Button onClick={() => setIsExtModalOpen(true)} icon={<CirclePlus size={14} />}>
              Register Extension
            </Button>
          )
        }
      />

      {/* Navigation Subtabs */}
      <div className="flex border-b border-brand-text bg-brand-muted shrink-0 text-xs font-bold leading-none uppercase">
        <button 
          onClick={() => setActiveTab('functions')}
          className={`px-6 py-3 border-r border-brand-text flex items-center gap-2 transition-all ${activeTab === 'functions' ? 'bg-white border-b-2 border-b-transparent' : 'opacity-60 hover:opacity-100'}`}
        >
          <Zap size={14} />
          Functions ({functions.length})
        </button>
        <button 
          onClick={() => setActiveTab('layers')}
          className={`px-6 py-3 border-r border-brand-text flex items-center gap-2 transition-all ${activeTab === 'layers' ? 'bg-white border-b-2 border-b-transparent' : 'opacity-60 hover:opacity-100'}`}
        >
          <Layers size={14} />
          Layers ({layers.length})
        </button>
        <button 
          onClick={() => setActiveTab('extensions')}
          className={`px-6 py-3 border-r border-brand-text flex items-center gap-2 transition-all ${activeTab === 'extensions' ? 'bg-white border-b-2 border-b-transparent' : 'opacity-60 hover:opacity-100'}`}
        >
          <Puzzle size={14} />
          Extensions ({extensions.length})
        </button>
      </div>

      <Modal 
        isOpen={isCreationModalOpen} 
        onClose={() => setIsCreationModalOpen(false)} 
        title="Create Lambda Function"
      >
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60">Function Name</label>
            <Input 
              value={newFuncName}
              onChange={e => setNewFuncName(e.target.value)}
              placeholder="MyProcesser"
              autoFocus
            />
          </div>
          
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60">Runtime</label>
            <Select value={runtime} onChange={e => setRuntime(e.target.value)}>
              <option value="nodejs18.x">Node.js 18.x</option>
              <option value="python3.9">Python 3.9</option>
              <option value="go1.x">Go 1.x</option>
              <option value="java11">Java 11</option>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase opacity-60">Memory (MB)</label>
              <Select value={memory} onChange={e => setMemory(e.target.value)}>
                <option value="128">128 MB</option>
                <option value="256">256 MB</option>
                <option value="512">512 MB</option>
                <option value="1024">1024 MB</option>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase opacity-60">Timeout (sec)</label>
              <Input 
                type="number"
                value={timeout}
                onChange={e => setTimeoutVal(e.target.value)}
              />
            </div>
          </div>

          <div className="p-3 bg-brand-muted/30 border border-brand-text border-dashed text-[10px] opacity-70">
            <p><strong>Note:</strong> A minimal "Hello World" ZIP will be used for initialization. You can update the code later via CLI.</p>
          </div>

          <div className="pt-4 flex gap-3">
             <Button 
               variant="ghost" 
               className="flex-1" 
               onClick={() => setIsCreationModalOpen(false)}
             >
               Cancel
             </Button>
             <Button 
               className="flex-1" 
               onClick={handleCreate} 
               disabled={!newFuncName || isCreating}
             >
               {isCreating ? 'Creating...' : 'Create Function'}
             </Button>
          </div>
        </div>
      </Modal>

      {/* Layer Creation Modal */}
      <Modal 
        isOpen={isLayerModalOpen} 
        onClose={() => setIsLayerModalOpen(false)} 
        title="Publish Lambda Layer Version"
      >
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60">Layer Name</label>
            <Input 
              value={newLayerName}
              onChange={e => setNewLayerName(e.target.value)}
              placeholder="common-utils-layer"
              autoFocus
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60">Description</label>
            <Input 
              value={newLayerDesc}
              onChange={e => setNewLayerDesc(e.target.value)}
              placeholder="Lodash dependencies and customized database client connections"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60">Compatible Runtime Suffix</label>
            <Select value={compatibleRuntimes} onChange={e => setCompatibleRuntimes(e.target.value)}>
              <option value="nodejs18.x">Node.js 18.x</option>
              <option value="python3.9">Python 3.9</option>
              <option value="nodejs18.x, python3.9">Node.js 18.x & Python 3.9 (Cross-Language)</option>
              <option value="all">Universal Runtimes</option>
            </Select>
          </div>

          <div className="pt-4 flex gap-3">
             <Button variant="ghost" className="flex-1" onClick={() => setIsLayerModalOpen(false)}>Cancel</Button>
             <Button className="flex-1" onClick={handleCreateLayer} disabled={!newLayerName}>
               Publish Layer
             </Button>
          </div>
        </div>
      </Modal>

      {/* Extension Creation Modal */}
      <Modal 
        isOpen={isExtModalOpen} 
        onClose={() => setIsExtModalOpen(false)} 
        title="Register Runtime Extension"
      >
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60">Extension Name</label>
            <Input 
              value={extName}
              onChange={e => setExtName(e.target.value)}
              placeholder="sentry-telemetry-extension"
              autoFocus
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60">Provider</label>
            <Input 
              value={extProvider}
              onChange={e => setExtProvider(e.target.value)}
              placeholder="Sentry Interactive Inc."
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60">Description</label>
            <Input 
              value={extDesc}
              onChange={e => setExtDesc(e.target.value)}
              placeholder="Real-time stack trace monitoring and diagnostic collection"
            />
          </div>

          <div className="pt-4 flex gap-3">
             <Button variant="ghost" className="flex-1" onClick={() => setIsExtModalOpen(false)}>Cancel</Button>
             <Button className="flex-1" onClick={handleCreateExtension} disabled={!extName}>
               Register Extension
             </Button>
          </div>
        </div>
      </Modal>

      <div className="p-6 space-y-6 flex-1 overflow-auto bg-brand-bg">
        {activeTab === 'functions' ? (
          <>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text opacity-30" size={14} />
              <Input 
                placeholder="Filter Functions..." 
                className="pl-10 text-xs" 
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            {invokeResult && (
              <Card className="bg-brand-console text-brand-green border-brand-green/20 p-4 font-mono text-[10px] mb-6 relative">
                <div className="flex justify-between items-center mb-2 border-b border-brand-green/10 pb-1">
                  <span className="uppercase font-bold tracking-widest">Invoke Result</span>
                  <button onClick={() => setInvokeResult(null)} className="hover:text-white uppercase font-bold">[Close]</button>
                </div>
                <pre className="overflow-auto max-h-40">
                  {JSON.stringify(invokeResult, null, 2)}
                </pre>
              </Card>
            )}

            <div className="grid grid-cols-1 gap-4">
              {loading ? (
                [1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)
              ) : error ? (
                <Card className="text-rose-600 font-mono text-[10px] text-center py-10 border-rose-600 bg-rose-50">{error}</Card>
              ) : filteredFunctions.length === 0 ? (
                <Card className="text-brand-text opacity-30 text-center py-12 italic text-[10px] uppercase font-bold tracking-widest bg-brand-muted/30 border-dashed">
                  No Functions Found
                </Card>
              ) : (
                filteredFunctions.map((fn) => (
                  <Card key={fn.FunctionArn} className="group hover:bg-brand-text hover:text-white transition-colors cursor-pointer">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 border border-brand-text flex flex-col items-center justify-center opacity-70 group-hover:border-brand-bg relative">
                          <Zap size={20} />
                          <div className="absolute -bottom-1 -right-1 bg-brand-text text-brand-bg text-[8px] px-1 font-bold group-hover:bg-brand-bg group-hover:text-brand-text">
                            {fn.Runtime?.split('.')[0]}
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-bold text-[12px] font-mono">{fn.FunctionName}</h4>
                            <span className="text-[9px] px-1.5 py-0.5 bg-brand-muted text-brand-text rounded-sm uppercase font-bold group-hover:bg-white/20 group-hover:text-white">
                              {fn.Runtime}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-[10px] opacity-50 font-mono">
                            <span className="flex items-center gap-1"><Clock size={12} /> {fn.Timeout}s</span>
                            <span className="flex items-center gap-1"><Cpu size={12} /> {fn.MemorySize}MB</span>
                            <span className="flex items-center gap-1 italic">{format(new Date(fn.LastModified!), 'yyyy-MM-dd HH:mm')}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest">
                        <button 
                          onClick={() => handleInvoke(fn.FunctionName!)}
                          disabled={invoking === fn.FunctionName}
                          className="hover:underline flex items-center gap-1.5 group-hover:text-brand-bg disabled:opacity-50"
                        >
                          <Play size={12} fill="currentColor" />
                          {invoking === fn.FunctionName ? 'RUNNING...' : 'INVOKE'}
                        </button>
                        <button 
                          onClick={() => handleDelete(fn.FunctionName!)}
                          className="hover:text-rose-500 font-bold group-hover:text-rose-400"
                        >
                          DROP
                        </button>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </>
        ) : activeTab === 'layers' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {layers.length === 0 ? (
              <div className="col-span-full py-16 text-center border-dashed border border-brand-text/10 italic text-[10px] opacity-50 uppercase font-bold">
                No custom lambda layers registered
              </div>
            ) : (
              layers.map(layer => (
                <Card key={layer.id} className="group hover:border-brand-text transition-all bg-white">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <Layers size={18} className="text-zinc-500" />
                      <span className="text-[8px] font-bold px-1.5 py-0.5 bg-brand-muted border border-brand-text/10">Version {layer.version}</span>
                    </div>
                    <button onClick={() => handleDeleteLayer(layer.id, layer.name)} className="p-1 hover:text-rose-500"><Trash2 size={14} /></button>
                  </div>
                  <h4 className="font-bold text-xs truncate leading-tight font-mono">{layer.name}</h4>
                  <p className="text-[9px] opacity-60 mt-1 font-mono leading-tight max-w-sm normal-case">{layer.description}</p>
                  
                  <div className="mt-4 pt-2 border-t border-brand-text/5 text-[9px] font-mono opacity-50">
                    COMPATIBLE_RUNTIMES: {layer.compatibleRuntimes}
                  </div>
                </Card>
              ))
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {extensions.map(ext => (
              <Card key={ext.id} className="group hover:border-brand-text transition-all bg-white">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <Puzzle size={18} className="text-zinc-500" />
                    <span className="text-[8px] font-bold px-1.5 py-0.5 bg-brand-muted border border-brand-text/10 tracking-widest lowercase">{ext.provider}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => toggleExtStatus(ext.id, ext.status)}
                      className={`text-[8px] font-bold border px-1.5 py-0.5 transition-colors ${ext.status === 'ACTIVE' ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'bg-zinc-100 border-zinc-300 text-zinc-600'}`}
                    >
                      {ext.status}
                    </button>
                    <button onClick={() => handleDeleteExtension(ext.id, ext.name)} className="p-1 hover:text-rose-500"><Trash2 size={14} /></button>
                  </div>
                </div>
                <h4 className="font-bold text-xs truncate leading-tight font-mono">{ext.name}</h4>
                <p className="text-[9px] opacity-60 mt-1 font-mono leading-tight max-w-sm normal-case">{ext.description}</p>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LambdaView;
