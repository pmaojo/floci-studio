import React, { useState } from 'react';
import { RefreshCw, CirclePlus, Trash2, Cpu, FileCode, Check, Layout, Server, Award, Compass } from 'lucide-react';
import { PageHeader, Card, Button, Input, Modal, Select } from '../components/ui-elements';
import { useAws } from '../contexts/AwsContext';

interface BeanstalkEnv {
  id: string;
  appName: string;
  envName: string;
  platform: string;
  health: 'Green/Ok' | 'Yellow/Warning' | 'Red/Degraded' | 'Grey/Pending';
  status: 'Ready' | 'Launching' | 'Updating' | 'Terminated';
  url: string;
}

const BeanstalkView = () => {
  const { logActivity } = useAws();
  const [envs, setEnvs] = useState<BeanstalkEnv[]>(() => {
    const saved = localStorage.getItem('aws-sim-beanstalk');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // Fallback below
      }
    }
    return [
      {
        id: "e-9c2f8a11",
        appName: "floci-api-gateway",
        envName: "Floci-api-gateway-env",
        platform: "Node.js 18 running on 64bit Amazon Linux 2",
        health: "Green/Ok",
        status: "Ready",
        url: "floci-api-gateway.eu-central-1.elasticbeanstalk.com"
      }
    ];
  });

  React.useEffect(() => {
    localStorage.setItem('aws-sim-beanstalk', JSON.stringify(envs));
  }, [envs]);

  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [appInput, setAppInput] = useState('');
  const [envInput, setEnvInput] = useState('');
  const [platform, setPlatform] = useState('Node.js 18 running on 64bit Amazon Linux 2');

  const fetchEnvs = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      logActivity('Elastic Beanstalk', 'DescribeEnvironments', 'success');
    }, 500);
  };

  const handleCreate = () => {
    if (!appInput || !envInput) return;
    const cleanApp = appInput.replace(/[^a-zA-Z0-9-_]/g, '');
    const cleanEnv = envInput.replace(/[^a-zA-Z0-9-_]/g, '');
    const newEnv: BeanstalkEnv = {
      id: `e-${Math.random().toString(36).substring(5)}`,
      appName: cleanApp,
      envName: cleanEnv,
      platform,
      health: 'Grey/Pending',
      status: 'Launching',
      url: `${cleanEnv.toLowerCase()}.eu-central-1.elasticbeanstalk.com`
    };

    setEnvs(prev => [...prev, newEnv]);
    logActivity('Elastic Beanstalk', `CreateDeployment: ${cleanEnv}`, 'success');
    setIsModalOpen(false);
    setAppInput('');
    setEnvInput('');

    setTimeout(() => {
      setEnvs(prev =>
        prev.map(e => e.envName === cleanEnv ? { ...e, status: 'Ready', health: 'Green/Ok' } : e)
      );
      logActivity('Elastic Beanstalk', `DeploymentReady: ${cleanEnv}`, 'success');
    }, 4500);
  };

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`Are you sure you want to terminate Beanstalk environment ${name}?`)) return;
    setEnvs(prev => prev.map(e => e.id === id ? { ...e, status: 'Terminated', health: 'Red/Degraded' } : e));
    logActivity('Elastic Beanstalk', `TerminateEnvironment: ${name}`, 'success');

    setTimeout(() => {
      setEnvs(prev => prev.filter(e => e.id !== id));
    }, 2500);
  };

  return (
    <div className="flex flex-col h-full uppercase">
      <PageHeader
        title="Elastic Beanstalk"
        icon={<Layout size={18} />}
        onRefresh={fetchEnvs}
        isRefreshing={loading}
        actions={
          <Button onClick={() => setIsModalOpen(true)} icon={<CirclePlus size={14} />}>
            Create App Env
          </Button>
        }
      />

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create Beanstalk Environment">
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60">Application Name</label>
            <Input
              value={appInput}
              onChange={e => setAppInput(e.target.value)}
              placeholder="customer-microservice"
              autoFocus
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60">Environment Name</label>
            <Input
              value={envInput}
              onChange={e => setEnvInput(e.target.value)}
              placeholder="customer-microservice-prod"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60">Platform Stack</label>
            <Select value={platform} onChange={e => setPlatform(e.target.value)}>
              <option value="Node.js 18 running on 64bit Amazon Linux 2">Node.js 18 on AL2</option>
              <option value="Python 3.10 running on 64bit Amazon Linux 2">Python 3.10 on AL2</option>
              <option value="Java 17 running on 64bit Amazon Linux 2">Java 17 on AL2</option>
              <option value="Docker running on 64bit Amazon Linux 2">Docker Multi-Container on AL2</option>
            </Select>
          </div>

          <div className="pt-4 flex gap-3">
            <Button variant="ghost" className="flex-1" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button className="flex-1" onClick={handleCreate} disabled={!appInput || !envInput}>
               Deploy Stack
            </Button>
          </div>
        </div>
      </Modal>

      <div className="p-6 space-y-6 flex-1 overflow-auto bg-brand-bg">
        <div className="bg-brand-muted/40 border border-brand-text/10 p-4 rounded-sm">
          <h3 className="font-serif-italic text-sm font-bold text-brand-text">Simple managed web hosting</h3>
          <p className="text-[9px] font-mono opacity-60 normal-case leading-relaxed max-w-xl mt-1">
             Deploy and scale web applications and microservices. Elastic Beanstalk automatically handles capacity provisioning, load balancing, continuous auto-scaling, and application health monitoring.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {envs.map(env => (
            <Card key={env.id} className="bg-white hover:border-brand-text transition-all relative">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 border border-brand-text bg-brand-muted/10">
                  <Compass size={18} />
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[8px] font-bold px-1.5 py-0.5 border ${
                    env.health.startsWith('Green')
                      ? 'border-emerald-400 bg-emerald-50 text-emerald-800'
                      : env.health.startsWith('Grey')
                      ? 'border-blue-400 bg-blue-50 text-blue-800 animate-pulse'
                      : 'border-rose-400 bg-rose-50 text-rose-800'
                  }`}>
                    HEALTH: {env.health.toUpperCase()}
                  </span>
                  <button onClick={() => handleDelete(env.id, env.envName)} className="p-1 hover:text-rose-600 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <h4 className="font-mono font-bold text-xs truncate">{env.envName}</h4>
              <p className="text-[8px] opacity-40 lowercase font-mono">APP_PARENT: {env.appName}</p>
              <p className="text-[10px] normal-case opacity-50 truncate mt-1">URL: {env.url}</p>

              <div className="grid grid-cols-2 gap-2 mt-6 pt-3 border-t border-brand-text/10 bg-brand-muted/15 p-2 text-center rounded-sm">
                <div>
                  <span className="text-[7px] text-zinc-400 block font-mono">PLATFORM_STACK</span>
                  <span className="text-[9px] font-bold font-mono text-zinc-600 truncate block">{env.platform}</span>
                </div>
                <div>
                  <span className="text-[7px] text-zinc-400 block font-mono">STATUS</span>
                  <span className="text-[9px] font-bold font-mono">{env.status.toUpperCase()}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BeanstalkView;
