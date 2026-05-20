import React, { useState, useEffect } from 'react';
import { Cloud, Radio, Trash2, CirclePlus, RefreshCw, Layers, Play, Pause, ExternalLink } from 'lucide-react';
import { PageHeader, Card, Button, Input, Modal, Select } from '../components/ui-elements';
import { useAws } from '../contexts/AwsContext';

interface AppRunnerService {
  id: string;
  name: string;
  arn: string;
  sourceType: 'ECR' | 'Repository';
  sourceValue: string;
  url: string;
  status: 'running' | 'operation_in_progress' | 'paused' | 'failed';
  cpu: string;
  memory: string;
  port: number;
  autoDeploy: boolean;
  createdTime: string;
}

const AppRunnerView = () => {
  const { logActivity } = useAws();
  
  // Storage for App Runner resources
  const [services, setServices] = useState<AppRunnerService[]>(() => {
    const saved = localStorage.getItem('floci-aws-sim-apprunner');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return [
      {
        id: 'ar-serv-1',
        name: 'customer-portal-app',
        arn: 'arn:aws:apprunner:us-east-1:123456789012:service/customer-portal-app/9a8b7c6d5e',
        sourceType: 'ECR',
        sourceValue: '123456789012.dkr.ecr.us-east-1.amazonaws.com/customer-portal:v1.2',
        url: 'https://p9ad8fh2z8.us-east-1.awsapprunner.com',
        status: 'running',
        cpu: '1 vCPU',
        memory: '2 GB',
        port: 3000,
        autoDeploy: true,
        createdTime: new Date(Date.now() - 86400000 * 5).toISOString()
      }
    ];
  });

  useEffect(() => {
    localStorage.setItem('floci-aws-sim-apprunner', JSON.stringify(services));
  }, [services]);

  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Form elements
  const [name, setName] = useState('');
  const [sourceType, setSourceType] = useState<'ECR' | 'Repository'>('ECR');
  const [sourceValue, setSourceValue] = useState('');
  const [cpu, setCpu] = useState('1 vCPU');
  const [memory, setMemory] = useState('2 GB');
  const [port, setPort] = useState('8080');
  const [autoDeploy, setAutoDeploy] = useState(true);

  const fetchServices = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      logActivity('AppRunner', 'ListServices', 'success', 'Described App Runner services metadata');
    }, 450);
  };

  const handleCreateService = () => {
    if (!name || !sourceValue) return;
    const cleanName = name.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
    const randId = Math.random().toString(36).substring(2, 12);
    const arnSim = `arn:aws:apprunner:us-east-1:123456789012:service/${cleanName}/${randId}`;
    const urlSim = `https://${randId}.us-east-1.awsapprunner.com`;

    const newService: AppRunnerService = {
      id: `ar-${Math.random().toString(36).substring(5)}`,
      name: cleanName,
      arn: arnSim,
      sourceType,
      sourceValue,
      url: urlSim,
      status: 'operation_in_progress',
      cpu,
      memory,
      port: parseInt(port) || 80,
      autoDeploy,
      createdTime: new Date().toISOString()
    };

    setServices(prev => [newService, ...prev]);
    logActivity('AppRunner', `CreateService: ${cleanName}`, 'success', `Provisioning App Runner web cluster`);

    setTimeout(() => {
      setServices(current => 
        current.map(s => s.id === newService.id ? { ...s, status: 'running' } : s)
      );
      logActivity('AppRunner', `ServiceRunning: ${cleanName}`, 'success', `Deployment success on public domain: ${urlSim}`);
    }, 6000);

    setIsModalOpen(false);
    setName('');
    setSourceValue('');
    setPort('8080');
    setAutoDeploy(true);
  };

  const handleDeleteService = (id: string, servName: string) => {
    if (!confirm(`Are you sure you want to delete App Runner service "${servName}"?`)) return;
    setServices(prev => prev.filter(s => s.id !== id));
    logActivity('AppRunner', `DeleteService: ${servName}`, 'success', 'Destroyed container nodes');
  };

  const handleToggleStatus = (id: string, servName: string, currentStatus: 'running' | 'paused') => {
    const nextStatus = currentStatus === 'running' ? 'paused' : 'running';
    setServices(curr => curr.map(s => s.id === id ? { ...s, status: 'operation_in_progress' } : s));
    
    logActivity('AppRunner', `UpdateServiceStatus: ${servName}`, 'success', `Requesting state: ${nextStatus.toUpperCase()}`);

    setTimeout(() => {
      setServices(curr => curr.map(s => s.id === id ? { ...s, status: nextStatus } : s));
      logActivity('AppRunner', `ServiceStateChanged: ${servName}`, 'success', `Service is now ${nextStatus.toUpperCase()}`);
    }, 2000);
  };

  return (
    <div className="flex flex-col h-full uppercase">
      <PageHeader
        title="App Runner Services"
        icon={<Cloud size={18} />}
        onRefresh={fetchServices}
        isRefreshing={loading}
        actions={
          <Button onClick={() => setIsModalOpen(true)} icon={<CirclePlus size={14} />}>
            Deploy Container Service
          </Button>
        }
      />

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Deploy AWS App Runner Web Service">
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60">Service Name</label>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="payment-gateway-app"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase opacity-60">Source Input Type</label>
              <Select value={sourceType} onChange={e => setSourceType(e.target.value as any)}>
                <option value="ECR">ECR Container Registry</option>
                <option value="Repository">GitHub Repository Source</option>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase opacity-60">Port Bind</label>
              <Input
                type="number"
                value={port}
                onChange={e => setPort(e.target.value)}
                placeholder="8080"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60">
              {sourceType === 'ECR' ? 'ECR Image URI Suffix' : 'GitHub Repository URL'}
            </label>
            <Input
              value={sourceValue}
              onChange={e => setSourceValue(e.target.value)}
              placeholder={sourceType === 'ECR' ? '123456789012.dkr.ecr.us-east-1.amazonaws.com/payment:v1.2' : 'https://github.com/myorg/payment-gateway'}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase opacity-60">Service vCPU Capacity</label>
              <Select value={cpu} onChange={e => setCpu(e.target.value)}>
                <option value="1 vCPU">1 vCPU Engine</option>
                <option value="2 vCPU">2 vCPU Web Cluster</option>
                <option value="4 vCPU">4 vCPU Enterprise</option>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase opacity-60">Service RAM Storage Allocation</label>
              <Select value={memory} onChange={e => setMemory(e.target.value)}>
                <option value="2 GB">2 GB RAM</option>
                <option value="4 GB">4 GB RAM</option>
                <option value="8 GB">8 GB High Memory</option>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60">Repository Continuous Integration (Auto-Deploy)</label>
            <Select value={autoDeploy ? 'yes' : 'no'} onChange={e => setAutoDeploy(e.target.value === 'yes')}>
              <option value="yes">Auto-deploy on source update</option>
              <option value="no">Manual deploy only</option>
            </Select>
          </div>

          <div className="pt-4 flex gap-3">
            <Button variant="ghost" className="flex-1" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button className="flex-1" onClick={handleCreateService} disabled={!name || !sourceValue}>
              Launch Service
            </Button>
          </div>
        </div>
      </Modal>

      <div className="p-6 space-y-6 flex-1 overflow-auto bg-brand-bg">
        <div className="grid grid-cols-1 gap-4">
          {loading ? (
            <div className="space-y-4">
              <div className="h-28 bg-white border border-brand-text/10 animate-pulse" />
            </div>
          ) : services.length === 0 ? (
            <div className="py-20 text-center border border-dashed border-brand-text/20">
              <p className="text-xs opacity-40 font-mono">No active managed app runner containers found</p>
            </div>
          ) : (
            services.map(svc => (
              <Card key={svc.id} className="hover:border-brand-text border-l-4 border-l-brand-text">
                <div className="flex flex-col lg:flex-row justify-between gap-6">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-brand-muted border border-brand-text/20 shrink-0">
                        <Cloud size={20} className="text-zinc-600" />
                      </div>
                      <div className="overflow-hidden">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-sm tracking-tight">{svc.name}</h4>
                          <span className="text-[8px] bg-indigo-50 border border-indigo-200 text-indigo-800 px-1.5 py-0.5 font-bold uppercase">
                            SOURCE_TYPE: {svc.sourceType}
                          </span>
                          <span className="text-[8px] bg-zinc-100 border border-zinc-200 text-zinc-600 px-1.5 py-0.5 font-bold uppercase">
                            Port: {svc.port}
                          </span>
                          {svc.autoDeploy && (
                            <span className="text-[8px] bg-emerald-50 border border-emerald-200 text-emerald-800 px-1.5 py-0.5 font-bold uppercase">
                              Continuous Deployment
                            </span>
                          )}
                        </div>
                        <p className="text-[9px] font-mono text-zinc-400 select-all truncate uppercase mt-0.5 max-w-full">ARN: {svc.arn}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 pt-3 border-t border-brand-text/5 text-[9px] font-mono opacity-80">
                      <div>
                        <span className="opacity-50 block uppercase">Source Location URL/URI:</span>
                        <span className="font-bold text-indigo-700 truncate max-w-full block lowercase mt-0.5">{svc.sourceValue}</span>
                      </div>
                      <div>
                        <span className="opacity-50 block uppercase">Resource Spec Configuration:</span>
                        <div className="flex items-center gap-1.5 mt-0.5 font-bold text-zinc-800">
                          <Layers size={11} className="text-zinc-400" />
                          <span>{svc.cpu} | {svc.memory} Cluster Storage</span>
                        </div>
                      </div>
                      <div>
                        <span className="opacity-50 block uppercase">Public Base Route Endpoint:</span>
                        {svc.status === 'running' ? (
                          <a href={svc.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 font-bold text-sky-600 hover:underline lowercase mt-0.5">
                            {svc.url} <ExternalLink size={10} />
                          </a>
                        ) : (
                          <span className="opacity-40 italic block mt-0.5">Status must be ACTIVE to bind route</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between lg:justify-end gap-6 shrink-0 pt-4 lg:pt-0 border-t lg:border-t-0 border-brand-text/5">
                    <div className="text-left lg:text-right">
                      <span className="text-[8px] font-bold opacity-50 block uppercase">Status state</span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`w-2 h-2 rounded-full ${
                          svc.status === 'running' ? 'bg-emerald-500 animate-pulse' :
                          svc.status === 'paused' ? 'bg-zinc-400' : 'bg-amber-400 animate-ping'
                        }`} />
                        <span className="text-[10px] font-mono font-bold uppercase">{svc.status}</span>
                      </div>
                    </div>
                    
                    <div className="h-8 w-px bg-brand-text opacity-15 hidden lg:block" />
                    
                    <div className="flex items-center gap-2">
                      {svc.status !== 'operation_in_progress' && (
                        <button
                          onClick={() => handleToggleStatus(svc.id, svc.name, svc.status as any)}
                          className="p-2 border border-brand-text hover:bg-zinc-50 transition-colors bg-white text-zinc-700 font-bold flex items-center justify-center rounded"
                          title={svc.status === 'running' ? 'Pause container instance' : 'Resume active deployment'}
                        >
                          {svc.status === 'running' ? <Pause size={14} /> : <Play size={14} />}
                        </button>
                      )}
                      
                      <button
                        onClick={() => handleDeleteService(svc.id, svc.name)}
                        className="p-2 border border-brand-text hover:bg-rose-50 hover:text-rose-600 bg-white transition-colors text-zinc-500 rounded"
                        title="Delete app runner container service"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default AppRunnerView;
