import React, { useState } from 'react';
import { Search, CirclePlus, Trash2, Globe, Database, HelpCircle, Server, Activity } from 'lucide-react';
import { PageHeader, Card, Button, Input, Modal, Select } from '../components/ui-elements';
import { useAws } from '../contexts/AwsContext';

interface Domain {
  id: string;
  name: string;
  engineVersion: string;
  instanceType: string;
  instanceCount: number;
  status: 'active' | 'creating' | 'updating';
  endpoint: string;
}

const OpenSearchView = () => {
  const { logActivity } = useAws();
  const [domains, setDomains] = useState<Domain[]>(() => {
    const saved = localStorage.getItem('aws-sim-opensearch');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // Fallback below
      }
    }
    return [
      {
        id: "os-001",
        name: "logs-index-prod",
        engineVersion: "OpenSearch_2.11",
        instanceType: "t3.medium.search",
        instanceCount: 2,
        status: "active",
        endpoint: "search-logs-index-prod.eu-central-1.es.amazonaws.com"
      }
    ];
  });

  React.useEffect(() => {
    localStorage.setItem('aws-sim-opensearch', JSON.stringify(domains));
  }, [domains]);

  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [engineVersion, setEngineVersion] = useState('OpenSearch_2.11');
  const [instanceType, setInstanceType] = useState('t3.medium.search');
  const [instances, setInstances] = useState(1);

  const fetchDomains = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      logActivity('OpenSearch', 'DescribeDomainConfigs', 'success');
    }, 500);
  };

  const handleCreate = () => {
    if (!newName) return;
    const cleanId = newName.toLowerCase().replace(/[^a-z0-9-_]/g, '');
    const newDom: Domain = {
      id: `os-${Math.random().toString(36).substring(5)}`,
      name: cleanId,
      engineVersion,
      instanceType,
      instanceCount: instances,
      status: 'creating',
      endpoint: `search-${cleanId}.eu-central-1.es.amazonaws.com`
    };

    setDomains(prev => [...prev, newDom]);
    logActivity('OpenSearch', `CreateDomain: ${cleanId}`, 'success');
    setIsModalOpen(false);
    setNewName('');

    setTimeout(() => {
      setDomains(prev =>
        prev.map(d => d.name === cleanId ? { ...d, status: 'active' } : d)
      );
      logActivity('OpenSearch', `DomainActive: ${cleanId}`, 'success');
    }, 4000);
  };

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`Delete OpenSearch Domain ${name}?`)) return;
    setDomains(prev => prev.filter(d => d.id !== id));
    logActivity('OpenSearch', `DeleteDomain: ${name}`, 'success');
  };

  return (
    <div className="flex flex-col h-full uppercase">
      <PageHeader
        title="OpenSearch Service"
        icon={<Search size={18} />}
        onRefresh={fetchDomains}
        isRefreshing={loading}
        actions={
          <Button onClick={() => setIsModalOpen(true)} icon={<CirclePlus size={14} />}>
            Create Domain
          </Button>
        }
      />

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create OpenSearch Domain">
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60">Domain Name</label>
            <Input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="analytics-search-core"
              autoFocus
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60">Engine Version</label>
            <Select value={engineVersion} onChange={e => setEngineVersion(e.target.value)}>
              <option value="OpenSearch_2.11">OpenSearch Version 2.11 (Recommended)</option>
              <option value="Elasticsearch_7.10">Elasticsearch v7.10 (Legacy Compatibility)</option>
              <option value="OpenSearch_1.3">OpenSearch Version 1.3</option>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60">Instance Type</label>
            <Select value={instanceType} onChange={e => setInstanceType(e.target.value)}>
              <option value="t3.medium.search">t3.medium.search (General Purpose, Dev)</option>
              <option value="r6g.large.search">r6g.large.search (Memory Optimized)</option>
              <option value="m6g.xlarge.search">m6g.xlarge.search (General Purpose, Large)</option>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60">Instance Count</label>
            <Input
              type="number"
              value={instances}
              onChange={e => setInstances(parseInt(e.target.value) || 1)}
              min="1"
              max="20"
            />
          </div>

          <div className="pt-4 flex gap-3">
            <Button variant="ghost" className="flex-1" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button className="flex-1" onClick={handleCreate} disabled={!newName}>
               Create Domain
            </Button>
          </div>
        </div>
      </Modal>

      <div className="p-6 space-y-6 flex-1 overflow-auto bg-brand-bg">
        <div className="bg-brand-muted/40 border border-brand-text/10 p-4 rounded-sm flex justify-between items-center">
          <div className="space-y-1">
            <h3 className="font-serif-italic text-sm font-bold text-brand-text">Distributed Search & Log Analytics</h3>
            <p className="text-[9px] font-mono opacity-60 normal-case leading-relaxed max-w-xl">
               Deploy real-time application monitoring, search analytics pipelines, security auditing, and document indices securely.
            </p>
          </div>
          <Activity size={24} className="text-brand-text opacity-25" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {domains.map(dom => (
            <Card key={dom.id} className="bg-white hover:border-brand-text transition-all relative">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 border border-brand-text bg-brand-muted/10">
                  <Database size={18} />
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[8px] font-bold px-1.5 py-0.5 border ${
                    dom.status === 'active'
                      ? 'border-emerald-400 bg-emerald-50 text-emerald-800'
                      : 'border-blue-400 bg-blue-50 text-blue-800 animate-pulse'
                  }`}>
                    {dom.status}
                  </span>
                  <button onClick={() => handleDelete(dom.id, dom.name)} className="p-1 hover:text-rose-600 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <h4 className="font-mono font-bold text-xs truncate">{dom.name}</h4>
              <p className="text-[10px] normal-case opacity-50 truncate mt-1">Endpoint: {dom.endpoint}</p>

              <div className="grid grid-cols-3 gap-2 mt-6 pt-3 border-t border-brand-text/10 bg-brand-muted/15 p-2 text-center rounded-sm">
                <div>
                  <span className="text-[7px] text-zinc-400 block font-mono">ENGINE</span>
                  <span className="text-[9px] font-bold font-mono lowercase">{dom.engineVersion}</span>
                </div>
                <div>
                  <span className="text-[7px] text-zinc-400 block font-mono">INSTANCE</span>
                  <span className="text-[9px] font-bold font-mono">{dom.instanceType}</span>
                </div>
                <div>
                  <span className="text-[7px] text-zinc-400 block font-mono">NODES</span>
                  <span className="text-[9px] font-bold font-mono">{dom.instanceCount}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default OpenSearchView;
