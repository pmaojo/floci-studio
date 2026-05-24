import { useState, useEffect } from 'react';
import { DescribeCacheClustersCommand, CreateCacheClusterCommand, DeleteCacheClusterCommand } from '@aws-sdk/client-elasticache';
import { useAws } from '../contexts/AwsContext';
import { Database, CirclePlus, Trash2, Settings, HardDrive, Cpu } from 'lucide-react';
import { PageHeader, Card, Button, Input, Skeleton, Modal, Select } from '../components/ui-elements';

const ElastiCacheView = () => {
  const { clients, logActivity } = useAws();
  const [clusters, setClusters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreationModalOpen, setIsCreationModalOpen] = useState(false);
  const [clusterId, setClusterId] = useState('');
  const [engine, setEngine] = useState('redis');
  const [nodeType, setNodeType] = useState('cache.t3.micro');
  const [isCreating, setIsCreating] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await clients.elasticache.send(new DescribeCacheClustersCommand({}));
      setClusters(response.CacheClusters || []);
      logActivity('ElastiCache', 'DescribeCacheClusters', 'success');
    } catch (err: any) {
      logActivity('ElastiCache', 'DescribeCacheClusters failed', 'error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!clusterId) return;
    setIsCreating(true);
    try {
      await clients.elasticache.send(new CreateCacheClusterCommand({
        CacheClusterId: clusterId,
        Engine: engine,
        CacheNodeType: nodeType,
        NumCacheNodes: 1
      }));
      logActivity('ElastiCache', `CreateCacheCluster: ${clusterId}`, 'success');
      setClusterId('');
      setIsCreationModalOpen(false);
      fetchData();
    } catch (err: any) {
      logActivity('ElastiCache', `CreateCacheCluster failed: ${clusterId}`, 'error', err.message);
      alert(err.message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(`Delete cluster ${id}?`)) return;
    try {
      await clients.elasticache.send(new DeleteCacheClusterCommand({ CacheClusterId: id }));
      logActivity('ElastiCache', `DeleteCacheCluster: ${id}`, 'success');
      fetchData();
    } catch (err: any) {
      logActivity('ElastiCache', `DeleteCacheCluster failed: ${id}`, 'error', err.message);
      alert(err.message);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="flex flex-col h-full uppercase">
      <PageHeader 
        title="ElastiCache Redis" 
        icon={<HardDrive size={18} />}
        onRefresh={fetchData}
        isRefreshing={loading}
        actions={
          <Button onClick={() => setIsCreationModalOpen(true)} icon={<CirclePlus size={14} />}>
            New Cluster
          </Button>
        }
      />

      <Modal 
        isOpen={isCreationModalOpen} 
        onClose={() => setIsCreationModalOpen(false)} 
        title="Create Cache Cluster"
      >
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60">Cluster Identifier</label>
            <Input 
              value={clusterId}
              onChange={e => setClusterId(e.target.value)}
              placeholder="session-cache"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase opacity-60">Engine</label>
              <Select value={engine} onChange={e => setEngine(e.target.value)}>
                <option value="redis">Redis</option>
                <option value="memcached">Memcached</option>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase opacity-60">Node Type</label>
              <Select value={nodeType} onChange={e => setNodeType(e.target.value)}>
                <option value="cache.t3.micro">cache.t3.micro</option>
                <option value="cache.t3.small">cache.t3.small</option>
                <option value="cache.m5.large">cache.m5.large</option>
              </Select>
            </div>
          </div>
          <div className="pt-4 flex gap-3">
             <Button variant="ghost" className="flex-1" onClick={() => setIsCreationModalOpen(false)}>Cancel</Button>
             <Button className="flex-1" onClick={handleCreate} disabled={!clusterId || isCreating}>
               {isCreating ? 'Creating...' : 'Create Cluster'}
             </Button>
          </div>
        </div>
      </Modal>

      <div className="p-6 flex-1 overflow-auto bg-brand-bg">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {loading ? (
            [1, 2].map(i => <Skeleton key={i} className="h-28" />)
          ) : clusters.length === 0 ? (
            <div className="col-span-full py-20 text-center border border-dashed border-brand-text/20">
               <p className="text-xs opacity-40 font-mono italic">NO_CACHING_CLUSTERS_FOUND</p>
            </div>
          ) : (
            clusters.map(cluster => (
              <Card key={cluster.CacheClusterId} className="hover:border-brand-text transition-all bg-white flex flex-col sm:flex-row justify-between items-center gap-4 border-l-4 border-l-brand-text/30">
                <div className="flex items-center gap-4 w-full">
                  <div className="p-2 bg-brand-muted border border-brand-text shrink-0">
                    <Database size={20} />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-xs truncate leading-tight mb-1">{cluster.CacheClusterId}</h4>
                    <div className="flex items-center gap-3 text-[9px] font-mono opacity-50 uppercase">
                      <span className="flex items-center gap-1"><Settings size={10} /> {cluster.Engine}</span>
                      <span className="flex items-center gap-1"><Cpu size={10} /> {cluster.CacheNodeType}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                  <div className="text-right">
                    <p className="text-[9px] font-bold opacity-30">STATUS</p>
                    <p className="text-[10px] font-bold text-emerald-600">{cluster.CacheClusterStatus?.toUpperCase()}</p>
                  </div>
                  <button onClick={() => handleDelete(cluster.CacheClusterId!)} className="p-2 hover:text-rose-600 transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default ElastiCacheView;
