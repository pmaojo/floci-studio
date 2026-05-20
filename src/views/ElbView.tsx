import React, { useState, useEffect } from 'react';
import { Network, Server, ArrowRight, CirclePlus, Trash2, Shield, Radio, Layers, RefreshCw } from 'lucide-react';
import { PageHeader, Card, Button, Input, Modal, Select } from '../components/ui-elements';
import { useAws } from '../contexts/AwsContext';

interface TargetGroup {
  name: string;
  port: number;
  protocol: 'HTTP' | 'HTTPS' | 'TCP';
  targetsCount: number;
}

interface LoadBalancer {
  id: string;
  name: string;
  type: 'application' | 'network';
  scheme: 'internet-facing' | 'internal';
  dnsName: string;
  status: 'active' | 'provisioning' | 'failed';
  listeners: string[];
  targetGroups: TargetGroup[];
  createdTime: string;
}

const ElbView = () => {
  const { logActivity } = useAws();
  const [loadBalancers, setLoadBalancers] = useState<LoadBalancer[]>(() => {
    const saved = localStorage.getItem('floci-aws-sim-elb');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return [
      {
        id: 'elb-prod-web',
        name: 'prod-web-alb',
        type: 'application',
        scheme: 'internet-facing',
        dnsName: 'prod-web-alb-209841209.us-east-1.elb.amazonaws.com',
        status: 'active',
        listeners: ['HTTP:80', 'HTTPS:443'],
        targetGroups: [
          { name: 'tg-web-servers', port: 80, protocol: 'HTTP', targetsCount: 3 }
        ],
        createdTime: new Date(Date.now() - 86400000 * 3).toISOString()
      },
      {
        id: 'elb-secure-nlb',
        name: 'database-nlb',
        type: 'network',
        scheme: 'internal',
        dnsName: 'database-nlb-489201948.us-east-1.elb.amazonaws.com',
        status: 'active',
        listeners: ['TCP:5432'],
        targetGroups: [
          { name: 'tg-rds-replicas', port: 5432, protocol: 'TCP', targetsCount: 2 }
        ],
        createdTime: new Date(Date.now() - 86400000 * 10).toISOString()
      }
    ];
  });

  useEffect(() => {
    localStorage.setItem('floci-aws-sim-elb', JSON.stringify(loadBalancers));
  }, [loadBalancers]);

  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState<'application' | 'network'>('application');
  const [scheme, setScheme] = useState<'internet-facing' | 'internal'>('internet-facing');
  const [listenerPort, setListenerPort] = useState('80');
  const [tgName, setTgName] = useState('');
  const [tgPort, setTgPort] = useState('80');
  const [targetsCount, setTargetsCount] = useState('2');

  const fetchElbs = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      logActivity('ELB', 'DescribeLoadBalancers', 'success', 'Scanning Active Load Balancers');
    }, 450);
  };

  const handleCreate = () => {
    if (!name) return;
    const cleanName = name.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
    const dnsSuffix = `${Math.floor(Math.random() * 900000000 + 100000000)}.us-east-1.elb.amazonaws.com`;
    
    const newElb: LoadBalancer = {
      id: `elb-${Math.random().toString(36).substring(5)}`,
      name: cleanName,
      type,
      scheme,
      dnsName: `${cleanName}-${dnsSuffix}`,
      status: 'provisioning',
      listeners: [type === 'application' ? `HTTP:${listenerPort}` : `TCP:${listenerPort}`],
      targetGroups: [
        {
          name: tgName.trim().toLowerCase().replace(/[^a-z0-9-]/g, '') || `tg-${cleanName}`,
          port: parseInt(tgPort) || 80,
          protocol: type === 'application' ? 'HTTP' : 'TCP',
          targetsCount: parseInt(targetsCount) || 1
        }
      ],
      createdTime: new Date().toISOString()
    };

    setLoadBalancers(prev => [newElb, ...prev]);
    logActivity('ELB', `CreateLoadBalancer: ${cleanName}`, 'success', `Scheme: ${scheme}, Type: ${type}`);

    // Self-active transitions to simulate AWS deployment lifecycle
    const targetId = newElb.id;
    setTimeout(() => {
      setLoadBalancers(current => 
        current.map(item => item.id === targetId ? { ...item, status: 'active' } : item)
      );
      logActivity('ELB', `LoadBalancerActive: ${cleanName}`, 'success', 'Completed deployment loop');
    }, 4000);

    // Reset fields
    setIsModalOpen(false);
    setName('');
    setType('application');
    setScheme('internet-facing');
    setListenerPort('80');
    setTgName('');
    setTgPort('80');
    setTargetsCount('2');
  };

  const handleDelete = (id: string, elbName: string) => {
    if (!confirm(`Are you sure you want to delete Load Balancer "${elbName}"?`)) return;
    setLoadBalancers(prev => prev.filter(elb => elb.id !== id));
    logActivity('ELB', `DeleteLoadBalancer: ${elbName}`, 'success', `Removed DNS Endpoint ${elbName}`);
  };

  return (
    <div className="flex flex-col h-full uppercase">
      <PageHeader
        title="ELB (Elastic Load Balancing)"
        icon={<Network size={18} />}
        onRefresh={fetchElbs}
        isRefreshing={loading}
        actions={
          <Button onClick={() => setIsModalOpen(true)} icon={<CirclePlus size={14} />}>
            Create Balancer
          </Button>
        }
      />

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Provision AWS Load Balancer">
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60">Load Balancer Name</label>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="billing-service-alb"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase opacity-60">Balancer Type</label>
              <Select value={type} onChange={e => setType(e.target.value as any)}>
                <option value="application">ALB (Application HTTP/HTTPS)</option>
                <option value="network">NLB (Network TCP/UDP/TLS)</option>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase opacity-60">Scheme</label>
              <Select value={scheme} onChange={e => setScheme(e.target.value as any)}>
                <option value="internet-facing">Internet-Facing (Public IP)</option>
                <option value="internal">Internal (VPC Only)</option>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase opacity-60">Listener Port</label>
              <Input
                type="number"
                value={listenerPort}
                onChange={e => setListenerPort(e.target.value)}
                placeholder="80"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase opacity-60">Target Port</label>
              <Input
                type="number"
                value={tgPort}
                onChange={e => setTgPort(e.target.value)}
                placeholder="80"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60">Target Group Host Group Name</label>
            <Input
              value={tgName}
              onChange={e => setTgName(e.target.value)}
              placeholder="tg-billing-fleet"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60">Registered Dynamic Targets (EC2/IPs/Containers)</label>
            <Input
              type="number"
              value={targetsCount}
              onChange={e => setTargetsCount(e.target.value)}
              placeholder="2"
            />
          </div>

          <div className="pt-4 flex gap-3">
            <Button variant="ghost" className="flex-1" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button className="flex-1" onClick={handleCreate} disabled={!name}>
              Provision Balancer
            </Button>
          </div>
        </div>
      </Modal>

      <div className="p-6 space-y-6 flex-1 overflow-auto bg-brand-bg">
        <div className="grid grid-cols-1 gap-4">
          {loading ? (
            <div className="space-y-4">
              <div className="h-28 bg-white border border-brand-text/10 animate-pulse" />
              <div className="h-28 bg-white border border-brand-text/10 animate-pulse" />
            </div>
          ) : loadBalancers.length === 0 ? (
            <div className="py-20 text-center border border-dashed border-brand-text/20">
              <p className="text-xs opacity-40 font-mono">No active elastic load balancers configured</p>
            </div>
          ) : (
            loadBalancers.map(elb => (
              <Card key={elb.id} className="hover:border-brand-text border-l-4 border-l-brand-text relative">
                <div className="flex flex-col lg:flex-row justify-between gap-6">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-brand-muted border border-brand-text/20">
                        <Network size={20} className="text-brand-text" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm tracking-tight">{elb.name}</h4>
                          <span className={`text-[8px] px-1.5 py-0.5 font-bold uppercase ${
                            elb.type === 'application' ? 'bg-sky-50 text-sky-800 border border-sky-200' : 'bg-indigo-50 text-indigo-800 border border-indigo-200'
                          }`}>
                            {elb.type}
                          </span>
                          <span className="text-[8px] bg-zinc-150 border border-zinc-300 text-zinc-600 px-1.5 py-0.5 font-bold uppercase">
                            {elb.scheme}
                          </span>
                        </div>
                        <p className="text-[9px] font-mono text-zinc-400 select-all lowercase mt-0.5">DNS: {elb.dnsName}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-2 border-t border-brand-text/5 text-[9px] font-mono opacity-80">
                      <div>
                        <span className="opacity-50 block uppercase">Listeners:</span>
                        <div className="flex gap-1.5 mt-1 flex-wrap">
                          {elb.listeners.map(l => (
                            <span key={l} className="bg-zinc-100 px-1.5 py-0.5 border border-zinc-200">{l}</span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <span className="opacity-50 block uppercase">Target Groups:</span>
                        {elb.targetGroups.map(tg => (
                          <div key={tg.name} className="mt-1 flex items-center gap-1.5 font-bold text-zinc-800">
                            <Layers size={11} className="text-zinc-400" />
                            <span>{tg.name} ({tg.protocol}:{tg.port})</span>
                          </div>
                        ))}
                      </div>
                      <div>
                        <span className="opacity-50 block uppercase">Backend Targets:</span>
                        {elb.targetGroups.map(tg => (
                          <div key={tg.name} className="mt-1 flex items-center gap-1.5 font-bold text-emerald-600">
                            <Server size={11} className="text-emerald-400" />
                            <span>{tg.targetsCount} Healthy Target Nodes</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between lg:justify-end gap-6 shrink-0 pt-4 lg:pt-0 border-t lg:border-t-0 border-brand-text/5">
                    <div className="text-left lg:text-right">
                      <span className="text-[8px] font-bold opacity-50 block uppercase">Deployment Status</span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`w-2 h-2 rounded-full ${
                          elb.status === 'active' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500 animate-ping'
                        }`} />
                        <span className="text-[10px] font-mono font-bold uppercase">{elb.status}</span>
                      </div>
                    </div>
                    <div className="h-8 w-px bg-brand-text opacity-15 hidden lg:block" />
                    <button
                      onClick={() => handleDelete(elb.id, elb.name)}
                      className="p-2 border border-brand-text hover:bg-rose-50 hover:text-rose-600 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
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

export default ElbView;
