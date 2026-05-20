import React, { useState, useEffect } from 'react';
import { ListHostedZonesCommand, CreateHostedZoneCommand, DeleteHostedZoneCommand } from '@aws-sdk/client-route-53';
import { useAws } from '../contexts/AwsContext';
import { Globe2, Search, CirclePlus, Trash2, ExternalLink, Activity, Network, ShieldCheck } from 'lucide-react';
import { PageHeader, Card, Button, Input, Skeleton, Modal, Select } from '../components/ui-elements';

interface ResolverRule {
  id: string;
  name: string;
  domainName: string;
  ruleType: 'FORWARD' | 'SYSTEM' | 'RECURSIVE';
  targetIps: string;
  vpcId: string;
  status: 'ACTIVE' | 'DELETING';
}

const Route53View = () => {
  const { clients, logActivity } = useAws();
  const [activeTab, setActiveTab] = useState<'zones' | 'resolver'>('zones');
  const [zones, setZones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Hosted Zone states
  const [isCreationModalOpen, setIsCreationModalOpen] = useState(false);
  const [domainName, setDomainName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Resolver Rule states
  const [resolverRules, setResolverRules] = useState<ResolverRule[]>(() => {
    const saved = localStorage.getItem('aws-sim-r53-rules');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // Fallback
      }
    }
    return [
      {
        id: "rsl-rule-01",
        name: "corp-internal-forwarder",
        domainName: "corp.internal.",
        ruleType: "FORWARD",
        targetIps: "10.0.1.15:53, 10.0.2.15:53",
        vpcId: "vpc-09fd1",
        status: "ACTIVE"
      }
    ];
  });

  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [ruleName, setRuleName] = useState('');
  const [ruleDomain, setRuleDomain] = useState('');
  const [ruleType, setRuleType] = useState<'FORWARD' | 'SYSTEM' | 'RECURSIVE'>('FORWARD');
  const [ruleIps, setRuleIps] = useState('10.0.1.50:53');
  const [ruleVpc, setRuleVpc] = useState('vpc-09fd1');

  useEffect(() => {
    localStorage.setItem('aws-sim-r53-rules', JSON.stringify(resolverRules));
  }, [resolverRules]);

  const fetchZones = async () => {
    setLoading(true);
    try {
      const response = await clients.route53.send(new ListHostedZonesCommand({}));
      setZones(response.HostedZones || []);
      logActivity('Route53', 'ListHostedZones', 'success');
    } catch (err: any) {
      logActivity('Route53', 'ListHostedZones failed', 'error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!domainName) return;
    setIsCreating(true);
    try {
      const callerRef = `floci-${Date.now()}`;
      await clients.route53.send(new CreateHostedZoneCommand({ 
        Name: domainName,
        CallerReference: callerRef
      }));
      logActivity('Route53', `CreateHostedZone: ${domainName}`, 'success');
      setDomainName('');
      setIsCreationModalOpen(false);
      fetchZones();
    } catch (err: any) {
      logActivity('Route53', `CreateHostedZone failed: ${domainName}`, 'error', err.message);
      alert(err.message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete Hosted Zone ${name}?`)) return;
    try {
      await clients.route53.send(new DeleteHostedZoneCommand({ Id: id }));
      logActivity('Route53', `DeleteHostedZone: ${name}`, 'success');
      fetchZones();
    } catch (err: any) {
      logActivity('Route53', `DeleteHostedZone failed: ${name}`, 'error', err.message);
      alert(err.message);
    }
  };

  const handleCreateRule = () => {
    if (!ruleName || !ruleDomain) return;
    const newRule: ResolverRule = {
      id: `rsl-${Math.random().toString(36).substring(5)}`,
      name: ruleName,
      domainName: ruleDomain.endsWith('.') ? ruleDomain : `${ruleDomain}.`,
      ruleType,
      targetIps: ruleType === 'FORWARD' ? ruleIps : '-',
      vpcId: ruleVpc,
      status: 'ACTIVE'
    };
    setResolverRules(prev => [...prev, newRule]);
    logActivity('Route53Resolver', `CreateResolverRule: ${ruleName}`, 'success');
    setIsRuleModalOpen(false);
    setRuleName('');
    setRuleDomain('');
  };

  const handleDeleteRule = (id: string, name: string) => {
    if (!confirm(`Delete Resolver Rule ${name}?`)) return;
    setResolverRules(prev => prev.filter(r => r.id !== id));
    logActivity('Route53Resolver', `DeleteResolverRule: ${name}`, 'success');
  };

  useEffect(() => {
    fetchZones();
  }, []);

  return (
    <div className="flex flex-col h-full uppercase">
      <PageHeader 
        title="Route 53 DNS & Resolver" 
        icon={<Globe2 size={18} />}
        onRefresh={activeTab === 'zones' ? fetchZones : () => {}}
        isRefreshing={loading && activeTab === 'zones'}
        actions={
          activeTab === 'zones' ? (
            <Button onClick={() => setIsCreationModalOpen(true)} icon={<CirclePlus size={14} />}>
              Create Hosted Zone
            </Button>
          ) : (
            <Button onClick={() => setIsRuleModalOpen(true)} icon={<CirclePlus size={14} />}>
              Create Resolver Rule
            </Button>
          )
        }
      />

      {/* Tabs */}
      <div className="flex border-b border-brand-text bg-brand-muted shrink-0 text-xs font-bold leading-none">
        <button 
          onClick={() => setActiveTab('zones')}
          className={`px-6 py-3 border-r border-brand-text flex items-center gap-2 transition-all ${activeTab === 'zones' ? 'bg-white border-b-2 border-b-transparent' : 'opacity-60 hover:opacity-100'}`}
        >
          <Globe2 size={14} />
          Hosted Zones ({zones.length})
        </button>
        <button 
          onClick={() => setActiveTab('resolver')}
          className={`px-6 py-3 border-r border-brand-text flex items-center gap-2 transition-all ${activeTab === 'resolver' ? 'bg-white border-b-2 border-b-transparent' : 'opacity-60 hover:opacity-100'}`}
        >
          <Network size={14} />
          Resolver Rules ({resolverRules.length})
        </button>
      </div>

      <Modal 
        isOpen={isCreationModalOpen} 
        onClose={() => setIsCreationModalOpen(false)} 
        title="Create Hosted Zone"
      >
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60">Domain Name</label>
            <Input 
              value={domainName}
              onChange={e => setDomainName(e.target.value)}
              placeholder="example.com"
              autoFocus
            />
          </div>
          <div className="pt-4 flex gap-3">
             <Button variant="ghost" className="flex-1" onClick={() => setIsCreationModalOpen(false)}>Cancel</Button>
             <Button className="flex-1" onClick={handleCreate} disabled={!domainName || isCreating}>
               {isCreating ? 'Creating...' : 'Create Zone'}
             </Button>
          </div>
        </div>
      </Modal>

      <Modal 
        isOpen={isRuleModalOpen} 
        onClose={() => setIsRuleModalOpen(false)} 
        title="Create Resolver Rule"
      >
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60">Rule Name</label>
            <Input 
              value={ruleName}
              onChange={e => setRuleName(e.target.value)}
              placeholder="forward-to-prod-dns"
              autoFocus
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60">Rule Domain Name suffix</label>
            <Input 
              value={ruleDomain}
              onChange={e => setRuleDomain(e.target.value)}
              placeholder="corp.internal"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60">Rule Type</label>
            <Select value={ruleType} onChange={e => setRuleType(e.target.value as any)}>
              <option value="FORWARD">FORWARD (Send DNS queries to specified Target IPs)</option>
              <option value="SYSTEM">SYSTEM (Let Route 53 Resolver resolve domestic entries)</option>
              <option value="RECURSIVE">RECURSIVE (Recursive fallback lookup)</option>
            </Select>
          </div>

          {ruleType === 'FORWARD' && (
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase opacity-60">Target IP Addresses (comma-separated IP:Port)</label>
              <Input 
                value={ruleIps}
                onChange={e => setRuleIps(e.target.value)}
                placeholder="10.0.1.50:53, 10.0.2.50:53"
              />
            </div>
          )}

          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60">Associate VPC</label>
            <Select value={ruleVpc} onChange={e => setRuleVpc(e.target.value)}>
              <option value="vpc-09fd1">VPC-Main (10.0.0.0/16)</option>
              <option value="vpc-1d3ab">VPC-Analytics (10.10.0.0/16)</option>
              <option value="vpc-f12b4">VPC-TransitHub (172.16.0.0/16)</option>
            </Select>
          </div>

          <div className="pt-4 flex gap-3">
             <Button variant="ghost" className="flex-1" onClick={() => setIsRuleModalOpen(false)}>Cancel</Button>
             <Button className="flex-1" onClick={handleCreateRule} disabled={!ruleName || !ruleDomain}>
               Create Rule
             </Button>
          </div>
        </div>
      </Modal>

      <div className="p-6 flex-1 overflow-auto bg-brand-bg">
        {activeTab === 'zones' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {loading ? (
              [1, 2, 3].map(i => <Skeleton key={i} className="h-32" />)
            ) : zones.length === 0 ? (
              <div className="col-span-full py-20 text-center border border-dashed border-brand-text/20">
                 <p className="text-xs opacity-40 font-mono italic underline decoration-dotted">NO_DNS_ZONES_DEFINED</p>
              </div>
            ) : (
              zones.map(zone => (
                <Card key={zone.Id} className="group hover:border-brand-text transition-all">
                  <div className="flex justify-between items-start mb-2">
                    <Globe2 size={20} className="text-brand-text/60" />
                    <button onClick={() => handleDelete(zone.Id!, zone.Name!)} className="p-1 hover:text-rose-500"><Trash2 size={14} /></button>
                  </div>
                  <h4 className="font-bold text-xs truncate leading-tight mb-1">{zone.Name}</h4>
                  <p className="text-[9px] font-mono opacity-50 truncate">{zone.Id}</p>
                  <div className="mt-4 pt-3 border-t border-brand-text/5 flex items-center justify-between">
                    <span className="text-[9px] font-bold opacity-30 flex items-center gap-1">
                      <Activity size={10} /> RECORDS: {zone.ResourceRecordSetCount || 0}
                    </span>
                    <span className="text-[8px] px-1.5 py-0.5 bg-brand-muted border border-brand-text/10 font-bold uppercase">Public</span>
                  </div>
                </Card>
              ))
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {resolverRules.length === 0 ? (
              <div className="py-20 text-center border border-dashed border-brand-text/20">
                 <p className="text-xs opacity-40 font-mono italic underline decoration-dotted">NO_RESOLVER_RULES_DEFINED</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {resolverRules.map(rule => (
                  <Card key={rule.id} className="group hover:border-brand-text transition-all">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <ShieldCheck size={18} className="text-brand-text/60" />
                        <span className="text-[8px] font-bold px-1.5 py-0.5 bg-brand-muted border border-brand-text/15">{rule.ruleType}</span>
                      </div>
                      <button onClick={() => handleDeleteRule(rule.id, rule.name)} className="p-1 hover:text-rose-500"><Trash2 size={14} /></button>
                    </div>
                    <h4 className="font-bold text-xs truncate leading-tight mb-1">{rule.name}</h4>
                    <p className="text-[9px] font-mono opacity-50 truncate lowercase">DOMAIN: {rule.domainName}</p>
                    
                    <div className="mt-4 pt-3 border-t border-brand-text/5 grid grid-cols-2 gap-2 text-[9px] bg-brand-muted/10 p-2 font-mono">
                      <div>
                        <span className="opacity-40 block text-[7px] font-sans">TARGET_IPS</span>
                        <span className="font-bold truncate text-[10px]">{rule.targetIps}</span>
                      </div>
                      <div>
                        <span className="opacity-40 block text-[7px] font-sans">ACTIVE_VPC</span>
                        <span className="font-bold text-[10px]">{rule.vpcId}</span>
                      </div>
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

export default Route53View;

