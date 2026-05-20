import React, { useState } from 'react';
import { RefreshCw, CirclePlus, Trash2, Cpu, FileCode, Check, Network, Database } from 'lucide-react';
import { PageHeader, Card, Button, Input, Modal, Select } from '../components/ui-elements';
import { useAws } from '../contexts/AwsContext';

interface NeptuneCluster {
  id: string;
  name: string;
  instanceClass: string;
  engineVersion: string;
  status: 'available' | 'creating' | 'deleting';
  endpoint: string;
}

const NeptuneView = () => {
  const { logActivity } = useAws();
  const [clusters, setClusters] = useState<NeptuneCluster[]>(() => {
    const saved = localStorage.getItem('aws-sim-neptune');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // Fallback below
      }
    }
    return [
      {
        id: "npt-abc92f1",
        name: "social-network-connections",
        instanceClass: "db.t3.medium",
        engineVersion: "1.2.1.0",
        status: "available",
        endpoint: "social-network-connections.cluster-cq87aj2.eu-central-1.neptune.amazonaws.com:8182"
      }
    ];
  });

  React.useEffect(() => {
    localStorage.setItem('aws-sim-neptune', JSON.stringify(clusters));
  }, [clusters]);

  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [instanceClass, setInstanceClass] = useState('db.t3.medium');
  const [version, setVersion] = useState('1.2.1.0');

  const fetchClusters = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      logActivity('Neptune', 'DescribeDBClusters', 'success');
    }, 500);
  };

  const handleCreate = () => {
    if (!newName) return;
    const cleanId = newName.toLowerCase().replace(/[^a-z0-9-_]/g, '');
    const newCluster: NeptuneCluster = {
      id: `npt-${Math.random().toString(36).substring(5)}`,
      name: cleanId,
      instanceClass,
      engineVersion: version,
      status: 'creating',
      endpoint: `${cleanId}.cluster-cq87aj2.eu-central-1.neptune.amazonaws.com:8182`
    };

    setClusters(prev => [...prev, newCluster]);
    logActivity('Neptune', `CreateDbCluster: ${cleanId}`, 'success');
    setIsModalOpen(false);
    setNewName('');

    setTimeout(() => {
      setClusters(prev =>
        prev.map(c => c.name === cleanId ? { ...c, status: 'available' } : c)
      );
      logActivity('Neptune', `ClusterAvailable: ${cleanId}`, 'success');
    }, 4500);
  };

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete Neptune graph database ${name}?`)) return;
    setClusters(prev => prev.filter(c => c.id !== id));
    logActivity('Neptune', `DeleteDbCluster: ${name}`, 'success');
  };

  return (
    <div className="flex flex-col h-full uppercase">
      <PageHeader
        title="Neptune Graph DB"
        icon={<Network size={18} />}
        onRefresh={fetchClusters}
        isRefreshing={loading}
        actions={
          <Button onClick={() => setIsModalOpen(true)} icon={<CirclePlus size={14} />}>
            Create DB Cluster
          </Button>
        }
      />

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create Neptune Graph Cluster">
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60">Database Cluster Name</label>
            <Input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="user-fraud-relations"
              autoFocus
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60">Engine Version</label>
            <Select value={version} onChange={e => setVersion(e.target.value)}>
              <option value="1.2.1.0">1.2.1.0 (Gremlin, SPARQL, openCypher)</option>
              <option value="1.1.1.0">1.1.1.0</option>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60">DB Instance Class</label>
            <Select value={instanceClass} onChange={e => setInstanceClass(e.target.value)}>
              <option value="db.t3.medium">db.t3.medium (2 vCPU, 4GB RAM)</option>
              <option value="db.r5.large">db.r5.large (2 vCPU, 16GB RAM) - Large</option>
              <option value="db.r6g.xlarge">db.r6g.xlarge (Memory Optimized AWS Graviton2)</option>
            </Select>
          </div>

          <div className="pt-4 flex gap-3">
            <Button variant="ghost" className="flex-1" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button className="flex-1" onClick={handleCreate} disabled={!newName}>
               Create DB Cluster
            </Button>
          </div>
        </div>
      </Modal>

      <div className="p-6 space-y-6 flex-1 overflow-auto bg-brand-bg">
        <div className="bg-brand-muted/40 border border-brand-text/10 p-4 rounded-sm">
          <h3 className="font-serif-italic text-sm font-bold text-brand-text">Managed Graph Database Service</h3>
          <p className="text-[9px] font-mono opacity-60 normal-case leading-relaxed max-w-xl mt-1">
             Build and run applications that work with highly connected datasets. Supporting powerful query models such as openCypher, Gremlin, and SPARQL for fraud detection, identity trees, and custom social recommendations.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {clusters.map(cluster => (
            <Card key={cluster.id} className="bg-white hover:border-brand-text transition-all relative">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 border border-brand-text bg-brand-muted/10">
                  <Database size={18} />
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[8px] font-bold px-1.5 py-0.5 border ${
                    cluster.status === 'available'
                      ? 'border-emerald-400 bg-emerald-50 text-emerald-800'
                      : 'border-blue-400 bg-blue-50 text-blue-800 animate-pulse'
                  }`}>
                    {cluster.status}
                  </span>
                  <button onClick={() => handleDelete(cluster.id, cluster.name)} className="p-1 hover:text-rose-600 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <h4 className="font-mono font-bold text-xs truncate">{cluster.name}</h4>
              <p className="text-[10px] opacity-50 truncate mt-1 lowercase font-mono">Endpoint: {cluster.endpoint}</p>

              <div className="grid grid-cols-3 gap-2 mt-6 pt-3 border-t border-brand-text/10 bg-brand-muted/15 p-2 text-center rounded-sm">
                <div>
                  <span className="text-[7px] text-zinc-400 block font-mono">ENGINE_VERSION</span>
                  <span className="text-[9px] font-bold font-mono">{cluster.engineVersion}</span>
                </div>
                <div>
                  <span className="text-[7px] text-zinc-400 block font-mono">INSTANCE_CLASS</span>
                  <span className="text-[9px] font-bold font-mono lowercase">{cluster.instanceClass}</span>
                </div>
                <div>
                  <span className="text-[7px] text-zinc-400 block font-mono">DB_PORT</span>
                  <span className="text-[9px] font-bold font-mono">8182</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default NeptuneView;
