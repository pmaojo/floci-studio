import React, { useState } from 'react';
import { Database as DatabaseIcon, Search, CirclePlus, Trash2, Cpu, BarChart2, HardDrive, RefreshCw } from 'lucide-react';
import { PageHeader, Card, Button, Input, Modal, Select } from '../components/ui-elements';
import { useAws } from '../contexts/AwsContext';
import { motion } from 'motion/react';

interface Cluster {
  id: string;
  name: string;
  nodeType: string;
  nodesCount: number;
  database: string;
  status: 'available' | 'creating' | 'restarting';
  endpoint: string;
}

const RedshiftView = () => {
  const { logActivity } = useAws();
  const [clusters, setClusters] = useState<Cluster[]>(() => {
    const saved = localStorage.getItem('aws-sim-redshift');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // Fallback below
      }
    }
    return [
      {
        id: "rs-cluster-01",
        name: "redshift-analytics-prod",
        nodeType: "ra3.xlplus",
        nodesCount: 2,
        database: "dev",
        status: "available",
        endpoint: "redshift-analytics-prod.cq87aj2.eu-central-1.redshift.amazonaws.com:5439/dev"
      }
    ];
  });

  React.useEffect(() => {
    localStorage.setItem('aws-sim-redshift', JSON.stringify(clusters));
  }, [clusters]);

  const [loading, setLoading] = useState(false);
  const [isCreationModalOpen, setIsCreationModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [nodeType, setNodeType] = useState('ra3.xlplus');
  const [nodesCount, setNodesCount] = useState(1);
  const [dbName, setDbName] = useState('dev');

  const fetchClusters = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      logActivity('Redshift', 'DescribeClusters', 'success');
    }, 500);
  };

  const handleCreate = () => {
    if (!newName) return;
    const cleanId = newName.toLowerCase().replace(/[^a-z0-9-_]/g, '');
    const newCluster: Cluster = {
      id: `rs-${Math.random().toString(36).substring(5)}`,
      name: cleanId,
      nodeType,
      nodesCount,
      database: dbName || 'dev',
      status: 'creating',
      endpoint: `${cleanId}.cq87aj2.eu-central-1.redshift.amazonaws.com:5439/${dbName || 'dev'}`
    };

    setClusters(prev => [...prev, newCluster]);
    logActivity('Redshift', `CreateCluster: ${cleanId}`, 'success');
    setIsCreationModalOpen(false);
    setNewName('');

    // Transition status warning simulation
    setTimeout(() => {
      setClusters(prev => 
        prev.map(c => c.name === cleanId ? { ...c, status: 'available' } : c)
      );
      logActivity('Redshift', `ClusterAvailable: ${cleanId}`, 'success');
    }, 5000);
  };

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete Redshift Cluster ${name}?`)) return;
    setClusters(prev => prev.filter(c => c.id !== id));
    logActivity('Redshift', `DeleteCluster: ${name}`, 'success');
  };

  return (
    <div className="flex flex-col h-full uppercase">
      <PageHeader 
        title="Redshift Clusters" 
        icon={<BarChart2 size={18} />}
        onRefresh={fetchClusters}
        isRefreshing={loading}
        actions={
          <Button onClick={() => setIsCreationModalOpen(true)} icon={<CirclePlus size={14} />}>
            Create Cluster
          </Button>
        }
      />

      <Modal 
        isOpen={isCreationModalOpen} 
        onClose={() => setIsCreationModalOpen(false)} 
        title="Create Redshift Cluster"
      >
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60">Cluster Identifier</label>
            <Input 
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="redshift-analytics-dw"
              autoFocus
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60">Node Type</label>
            <Select value={nodeType} onChange={e => setNodeType(e.target.value)}>
              <option value="ra3.xlplus">ra3.xlplus (16KB Cache, $1.08/hr)</option>
              <option value="ra3.4xlarge">ra3.4xlarge (64KB Cache, $3.26/hr)</option>
              <option value="dc2.large">dc2.large (Compute Optimized, $0.25/hr)</option>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60">Number of Nodes</label>
            <Input 
              type="number"
              value={nodesCount}
              onChange={e => setNodesCount(parseInt(e.target.value) || 1)}
              min="1"
              max="100"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60">Database Name</label>
            <Input 
              value={dbName}
              onChange={e => setDbName(e.target.value)}
              placeholder="dev"
            />
          </div>
          <div className="pt-4 flex gap-3">
             <Button variant="ghost" className="flex-1" onClick={() => setIsCreationModalOpen(false)}>Cancel</Button>
             <Button className="flex-1" onClick={handleCreate} disabled={!newName}>
               Create Cluster
             </Button>
          </div>
        </div>
      </Modal>

      <div className="p-6 space-y-6 flex-1 overflow-auto bg-brand-bg">
        <div className="bg-brand-muted/40 border border-brand-text/10 p-4 rounded-sm">
          <h3 className="font-serif-italic text-sm font-bold text-brand-text">Managed Data Warehouse</h3>
          <p className="text-[9px] font-mono opacity-60 normal-case leading-relaxed max-w-xl mt-1">
            Deploy fast, fully managed, petabyte-scale data warehouse solutions. Run complex analytical queries over structured and semi-structured datasets in real-time.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {clusters.map(cluster => (
            <Card key={cluster.id} className="bg-white hover:border-brand-text transition-all relative">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 border border-brand-text bg-brand-muted/20">
                  <Cpu size={18} />
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
              <p className="text-[10px] normal-case opacity-50 truncate mt-1">Endpoint: {cluster.endpoint}</p>

              <div className="grid grid-cols-3 gap-2 mt-6 pt-3 border-t border-brand-text/10 bg-brand-muted/10 p-2 text-center rounded-sm">
                <div>
                  <span className="text-[7px] text-zinc-400 block font-mono">NODE_TYPE</span>
                  <span className="text-[9px] font-bold font-mono">{cluster.nodeType}</span>
                </div>
                <div>
                  <span className="text-[7px] text-zinc-400 block font-mono">NODES</span>
                  <span className="text-[9px] font-bold font-mono">{cluster.nodesCount}</span>
                </div>
                <div>
                  <span className="text-[7px] text-zinc-400 block font-mono">DB_NAME</span>
                  <span className="text-[9px] font-bold font-mono">{cluster.database}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RedshiftView;
