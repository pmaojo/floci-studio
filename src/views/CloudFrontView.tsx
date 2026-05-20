import React, { useState, useEffect } from 'react';
import { ListDistributionsCommand, CreateDistributionCommand, DeleteDistributionCommand } from '@aws-sdk/client-cloudfront';
import { useAws } from '../contexts/AwsContext';
import { Globe, Search, CirclePlus, Trash2, Zap, Settings, ExternalLink, Activity, Code2, Play } from 'lucide-react';
import { PageHeader, Card, Button, Input, Skeleton, Modal, Select } from '../components/ui-elements';

interface CloudFrontFunctionV2 {
  id: string;
  name: string;
  eventType: 'viewer-request' | 'viewer-response';
  runtime: 'cloudfront-js-2.0' | 'cloudfront-js-1.0';
  code: string;
  status: 'DEPLOYED' | 'DEVELOPMENT';
}

const CloudFrontView = () => {
  const { clients, logActivity } = useAws();
  const [activeTab, setActiveTab] = useState<'distributions' | 'functions'>('distributions');
  const [distributions, setDistributions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Distribution modal
  const [isCreationModalOpen, setIsCreationModalOpen] = useState(false);
  const [origin, setOrigin] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // CloudFront Functions states
  const [functions, setFunctions] = useState<CloudFrontFunctionV2[]>(() => {
    const saved = localStorage.getItem('aws-sim-cf-functions-v2');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return [
      {
        id: "fn-001",
        name: "url-rewrite-v2",
        eventType: "viewer-request",
        runtime: "cloudfront-js-2.0",
        code: `function handler(event) {\n    var request = event.request;\n    var uri = request.uri;\n    if (uri.endsWith('/')) {\n        request.uri += 'index.html';\n    }\n    return request;\n}`,
        status: "DEPLOYED"
      }
    ];
  });

  const [isFuncModalOpen, setIsFuncModalOpen] = useState(false);
  const [funcName, setFuncName] = useState('');
  const [eventType, setEventType] = useState<'viewer-request' | 'viewer-response'>('viewer-request');
  const [funcCode, setFuncCode] = useState(`function handler(event) {\n    var request = event.request;\n    // Implement CloudFront V2 Functions manipulation here\n    return request;\n}`);

  useEffect(() => {
    localStorage.setItem('aws-sim-cf-functions-v2', JSON.stringify(functions));
  }, [functions]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await clients.cloudfront.send(new ListDistributionsCommand({}));
      setDistributions(response.DistributionList?.Items || []);
      logActivity('CloudFront', 'ListDistributions', 'success');
    } catch (err: any) {
      logActivity('CloudFront', 'ListDistributions failed', 'error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!origin) return;
    setIsCreating(true);
    try {
      const callerRef = `floci-${Date.now()}`;
      await clients.cloudfront.send(new CreateDistributionCommand({
        DistributionConfig: {
          CallerReference: callerRef,
          Comment: 'Created via Floci UI',
          Enabled: true,
          Origins: {
            Quantity: 1,
            Items: [{
              Id: 'PrimaryOrigin',
              DomainName: origin,
              CustomOriginConfig: {
                HTTPPort: 80,
                HTTPSPort: 443,
                OriginProtocolPolicy: 'https-only'
              }
            }]
          },
          DefaultCacheBehavior: {
            TargetOriginId: 'PrimaryOrigin',
            ForwardedValues: {
              QueryString: false,
              Cookies: { Forward: 'none' }
            },
            TrustedSigners: { Enabled: false, Quantity: 0 },
            ViewerProtocolPolicy: 'redirect-to-https',
            MinTTL: 0
          }
        }
      }));
      logActivity('CloudFront', `CreateDistribution: ${origin}`, 'success');
      setOrigin('');
      setIsCreationModalOpen(false);
      fetchData();
    } catch (err: any) {
      logActivity('CloudFront', `CreateDistribution failed: ${origin}`, 'error', err.message);
      alert(err.message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (id: string, etag: string = '') => {
    if (!confirm(`Delete distribution ${id}?`)) return;
    try {
      await clients.cloudfront.send(new DeleteDistributionCommand({ Id: id, IfMatch: etag }));
      logActivity('CloudFront', `DeleteDistribution: ${id}`, 'success');
      fetchData();
    } catch (err: any) {
      logActivity('CloudFront', `DeleteDistribution failed: ${id}`, 'error', err.message);
      alert(err.message);
    }
  };

  const handleCreateFunc = () => {
    if (!funcName) return;
    const newFunc: CloudFrontFunctionV2 = {
      id: `fn-${Math.random().toString(36).substring(5)}`,
      name: funcName,
      eventType,
      runtime: 'cloudfront-js-2.0',
      code: funcCode,
      status: 'DEPLOYED'
    };
    setFunctions(prev => [...prev, newFunc]);
    logActivity('CloudFrontFunctions', `PublishFunctionV2: ${funcName}`, 'success');
    setIsFuncModalOpen(false);
    setFuncName('');
  };

  const handleDeleteFunc = (id: string, name: string) => {
    if (!confirm(`Delete CloudFront Function ${name}?`)) return;
    setFunctions(prev => prev.filter(f => f.id !== id));
    logActivity('CloudFrontFunctions', `DeleteFunction: ${name}`, 'success');
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="flex flex-col h-full uppercase">
      <PageHeader 
        title="CloudFront CDN Edge" 
        icon={<Globe size={18} />}
        onRefresh={activeTab === 'distributions' ? fetchData : () => {}}
        isRefreshing={loading && activeTab === 'distributions'}
        actions={
          activeTab === 'distributions' ? (
            <Button onClick={() => setIsCreationModalOpen(true)} icon={<CirclePlus size={14} />}>
              New Distribution
            </Button>
          ) : (
            <Button onClick={() => setIsFuncModalOpen(true)} icon={<CirclePlus size={14} />}>
              Create Function v2
            </Button>
          )
        }
      />

      {/* Tabs */}
      <div className="flex border-b border-brand-text bg-brand-muted shrink-0 text-xs font-bold leading-none">
        <button 
          onClick={() => setActiveTab('distributions')}
          className={`px-6 py-3 border-r border-brand-text flex items-center gap-2 transition-all ${activeTab === 'distributions' ? 'bg-white border-b-2 border-b-transparent' : 'opacity-60 hover:opacity-100'}`}
        >
          <Globe size={14} />
          Distributions ({distributions.length})
        </button>
        <button 
          onClick={() => setActiveTab('functions')}
          className={`px-6 py-3 border-r border-brand-text flex items-center gap-2 transition-all ${activeTab === 'functions' ? 'bg-white border-b-2 border-b-transparent' : 'opacity-60 hover:opacity-100'}`}
        >
          <Code2 size={14} />
          Functions v2 ({functions.length})
        </button>
      </div>

      <Modal 
        isOpen={isCreationModalOpen} 
        onClose={() => setIsCreationModalOpen(false)} 
        title="Create Distribution"
      >
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60">Origin Domain Name</label>
            <Input 
              value={origin}
              onChange={e => setOrigin(e.target.value)}
              placeholder="my-cool-bucket.s3.amazonaws.com"
              autoFocus
            />
          </div>
          <div className="p-3 bg-brand-muted/30 border border-brand-text border-dashed text-[9px] opacity-70">
            <p>Distributions speed up delivery of your dynamic and static content through a global network of edge locations.</p>
          </div>
          <div className="pt-4 flex gap-3">
             <Button variant="ghost" className="flex-1" onClick={() => setIsCreationModalOpen(false)}>Cancel</Button>
             <Button className="flex-1" onClick={handleCreate} disabled={!origin || isCreating}>
               {isCreating ? 'Creating...' : 'Launch CDN'}
             </Button>
          </div>
        </div>
      </Modal>

      {/* CloudFront Function Modal */}
      <Modal isOpen={isFuncModalOpen} onClose={() => setIsFuncModalOpen(false)} title="Create CloudFront Function v2">
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60">Function Name</label>
            <Input value={funcName} onChange={e => setFuncName(e.target.value)} placeholder="security-headers" autoFocus />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60">Edge Event Type</label>
            <Select value={eventType} onChange={e => setEventType(e.target.value as any)}>
              <option value="viewer-request">viewer-request (Execute upon customer hitting edge origin)</option>
              <option value="viewer-response">viewer-response (Execute upon replying to customer request)</option>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60">JavaScript Execution Code Snippet (ES6 compliant)</label>
            <textarea 
              value={funcCode} 
              onChange={e => setFuncCode(e.target.value)} 
              className="w-full h-40 bg-brand-muted/10 font-mono text-[10px] p-2 border border-brand-text/10 focus:outline-none"
            />
          </div>
          <div className="pt-4 flex gap-3">
            <Button variant="ghost" className="flex-1" onClick={() => setIsFuncModalOpen(false)}>Cancel</Button>
            <Button className="flex-1" onClick={handleCreateFunc} disabled={!funcName}>Deploy Function</Button>
          </div>
        </div>
      </Modal>

      <div className="p-6 flex-1 overflow-auto bg-brand-bg">
        {activeTab === 'distributions' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {loading ? (
              [1, 2].map(i => <Skeleton key={i} className="h-40" />)
            ) : distributions.length === 0 ? (
              <div className="col-span-full py-20 text-center border border-dashed border-brand-text/20">
                 <p className="text-xs opacity-40 font-mono italic">NO_EDGE_DISTRIBUTIONS_ACTIVE</p>
              </div>
            ) : (
              distributions.map(dist => (
                <Card key={dist.Id} className="hover:border-brand-text transition-all bg-white relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <Globe size={64} />
                  </div>
                  <div className="relative z-10">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="font-bold text-xs truncate leading-tight mb-1">{dist.DomainName}</h4>
                        <p className="text-[9px] font-mono opacity-40 truncate">{dist.Id}</p>
                      </div>
                      <button onClick={() => handleDelete(dist.Id)} className="p-2 border border-brand-text/10 hover:bg-rose-50 hover:text-rose-600 transition-colors shrink-0">
                        <Trash2 size={16} />
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 mt-6">
                      <div className="p-2 border border-brand-text/10 bg-brand-muted/5">
                        <p className="text-[8px] font-bold opacity-40">LAST_MODIFIED</p>
                        <p className="text-[10px] font-mono truncate">{new Date(dist.LastModifiedTime).toLocaleDateString()}</p>
                      </div>
                      <div className="p-2 border border-brand-text/10 bg-brand-muted/5">
                        <p className="text-[8px] font-bold opacity-40">STATUS</p>
                        <p className="text-[10px] font-bold uppercase text-emerald-600">{dist.Status}</p>
                      </div>
                    </div>
                    
                    <div className="mt-4 flex items-center justify-between text-[9px] font-bold opacity-30">
                      <span className="flex items-center gap-1"><Activity size={10} /> EDGE_ENABLED</span>
                      <span className="flex items-center gap-1"><Zap size={10} /> PRICE_CLASS_ALL</span>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {functions.length === 0 ? (
              <div className="py-20 text-center border border-dashed border-brand-text/20">
                <p className="text-xs opacity-40 font-mono italic">NO_CLOUDFRONT_FUNCTIONS_ACTIVE</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {functions.map(f => (
                  <Card key={f.id} className="group hover:border-brand-text transition-all bg-white font-mono">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <Code2 size={18} className="text-zinc-500" />
                        <span className="text-[8px] font-bold px-1.5 py-0.5 bg-brand-muted border border-brand-text/10 tracking-wider lowercase">Runtime: {f.runtime}</span>
                      </div>
                      <button onClick={() => handleDeleteFunc(f.id, f.name)} className="p-1 hover:text-rose-500"><Trash2 size={14} /></button>
                    </div>
                    <h4 className="font-bold text-xs truncate leading-tight">{f.name}</h4>
                    <p className="text-[9px] opacity-40 lowercase mb-2">Bound: {f.eventType}</p>
                    
                    <pre className="bg-black text-brand-green text-[9px] p-3 overflow-x-auto max-h-32 border border-brand-green/10 my-2">
                      {f.code}
                    </pre>

                    <div className="mt-4 pt-2 border-t border-brand-text/5 flex justify-between items-center text-[9px] font-sans font-bold">
                      <span className="text-emerald-700">● event associated actively</span>
                      <span className="text-[8px] bg-emerald-50 text-emerald-800 border-emerald-300 border px-1.5 py-0.5">{f.status}</span>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CloudFrontView;
