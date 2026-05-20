import React, { useState } from 'react';
import { RefreshCw, CirclePlus, Trash2, Cpu, FileCode, Layers, Radio, Activity } from 'lucide-react';
import { PageHeader, Card, Button, Input, Modal, Select } from '../components/ui-elements';
import { useAws } from '../contexts/AwsContext';

interface MskCluster {
  id: string;
  name: string;
  kafkaVersion: string;
  numberOfBrokers: number;
  brokerType: string;
  status: 'ACTIVE' | 'CREATING' | 'DELETING';
  arn: string;
}

const MskView = () => {
  const { logActivity } = useAws();
  const [clusters, setClusters] = useState<MskCluster[]>(() => {
    const saved = localStorage.getItem('aws-sim-msk');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // Fallback below
      }
    }
    return [
      {
        id: "msk-001",
        name: "kafka-telemetry-prod",
        kafkaVersion: "3.5.1",
        numberOfBrokers: 3,
        brokerType: "kafka.m5.large",
        status: "ACTIVE",
        arn: "arn:aws:kafka:eu-central-1:123456789012:cluster/kafka-telemetry-prod/3ed79df2"
      }
    ];
  });

  React.useEffect(() => {
    localStorage.setItem('aws-sim-msk', JSON.stringify(clusters));
  }, [clusters]);

  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [version, setVersion] = useState('3.5.1');
  const [brokerType, setBrokerType] = useState('kafka.m5.large');
  const [brokersCount, setBrokersCount] = useState(3);

  const fetchClusters = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      logActivity('MSK', 'ListClusters', 'success');
    }, 500);
  };

  const handleCreate = () => {
    if (!newName) return;
    const cleanId = newName.toLowerCase().replace(/[^a-z0-9-_]/g, '');
    const newCluster: MskCluster = {
      id: `msk-${Math.random().toString(36).substring(5)}`,
      name: cleanId,
      kafkaVersion: version,
      numberOfBrokers: brokersCount,
      brokerType,
      status: 'CREATING',
      arn: `arn:aws:kafka:eu-central-1:123456789012:cluster/${cleanId}/${Math.random().toString(16).substring(2, 8)}`
    };

    setClusters(prev => [...prev, newCluster]);
    logActivity('MSK', `CreateCluster: ${cleanId}`, 'success');
    setIsModalOpen(false);
    setNewName('');

    setTimeout(() => {
      setClusters(prev =>
        prev.map(c => c.name === cleanId ? { ...c, status: 'ACTIVE' } : c)
      );
      logActivity('MSK', `ClusterActive: ${cleanId}`, 'success');
    }, 4500);
  };

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete MSK Kafka Cluster ${name}?`)) return;
    setClusters(prev => prev.map(c => c.id === id ? { ...c, status: 'DELETING' } : c));
    logActivity('MSK', `DeleteCluster: ${name}`, 'success');

    setTimeout(() => {
      setClusters(prev => prev.filter(c => c.id !== id));
      logActivity('MSK', `ClusterDeleted: ${name}`, 'success');
    }, 3000);
  };

  return (
    <div className="flex flex-col h-full uppercase">
      <PageHeader
        title="MSK Kafka Clusters"
        icon={<Radio size={18} />}
        onRefresh={fetchClusters}
        isRefreshing={loading}
        actions={
          <Button onClick={() => setIsModalOpen(true)} icon={<CirclePlus size={14} />}>
            Create Cluster
          </Button>
        }
      />

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create MSK Kafka Cluster">
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60">Cluster Name</label>
            <Input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="kafka-eventstream"
              autoFocus
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60">Apache Kafka Version</label>
            <Select value={version} onChange={e => setVersion(e.target.value)}>
              <option value="3.5.1">3.5.1 (Recommended)</option>
              <option value="3.4.0">3.4.0</option>
              <option value="2.8.2">2.8.2 (Legacy)</option>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60">Broker Node Type</label>
            <Select value={brokerType} onChange={e => setBrokerType(e.target.value)}>
              <option value="kafka.m5.large">kafka.m5.large (2 vCPU, 8GB RAM)</option>
              <option value="kafka.t3.small">kafka.t3.small (2 vCPU, 2GB RAM - Dev)</option>
              <option value="kafka.m5.4xlarge">kafka.m5.4xlarge (Production Optimized)</option>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60">Number of Broker Nodes</label>
            <Input
              type="number"
              value={brokersCount}
              onChange={e => setBrokersCount(parseInt(e.target.value) || 3)}
              min="2"
              max="30"
            />
          </div>

          <div className="pt-4 flex gap-3">
            <Button variant="ghost" className="flex-1" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button className="flex-1" onClick={handleCreate} disabled={!newName}>
               Create Cluster
            </Button>
          </div>
        </div>
      </Modal>

      <div className="p-6 space-y-6 flex-1 overflow-auto bg-brand-bg">
        <div className="bg-brand-muted/40 border border-brand-text/10 p-4 rounded-sm">
          <h3 className="font-serif-italic text-sm font-bold text-brand-text">Managed Apache Kafka Streaming</h3>
          <p className="text-[9px] font-mono opacity-60 normal-case leading-relaxed max-w-xl mt-1">
             Build and run applications that use Apache Kafka to process streaming data. Simplify deployment, secure connections, and leverage automatic brokers scaling metrics.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {clusters.map(cluster => (
            <Card key={cluster.id} className="bg-white hover:border-brand-text transition-all relative">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 border border-brand-text bg-brand-muted/10">
                  <Layers size={18} />
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[8px] font-bold px-1.5 py-0.5 border ${
                    cluster.status === 'ACTIVE'
                      ? 'border-emerald-400 bg-emerald-50 text-emerald-800'
                      : cluster.status === 'CREATING'
                      ? 'border-blue-400 bg-blue-50 text-blue-800 animate-pulse'
                      : 'border-rose-400 bg-rose-50 text-rose-800 animate-pulse'
                  }`}>
                    {cluster.status}
                  </span>
                  <button 
                    onClick={() => handleDelete(cluster.id, cluster.name)} 
                    disabled={cluster.status !== 'ACTIVE'}
                    className="p-1 hover:text-rose-600 disabled:opacity-20 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <h4 className="font-mono font-bold text-xs truncate">{cluster.name}</h4>
              <p className="text-[9px] opacity-50 truncate mt-1 lowercase font-mono">{cluster.arn}</p>

              <div className="grid grid-cols-3 gap-2 mt-6 pt-3 border-t border-brand-text/10 bg-brand-muted/15 p-2 text-center rounded-sm">
                <div>
                  <span className="text-[7px] text-zinc-400 block font-mono">KAFKA_VERSION</span>
                  <span className="text-[9px] font-bold font-mono">{cluster.kafkaVersion}</span>
                </div>
                <div>
                  <span className="text-[7px] text-zinc-400 block font-mono">BROKER_TYPE</span>
                  <span className="text-[9px] font-bold font-mono lowercase">{cluster.brokerType.split('.')[2] || cluster.brokerType}</span>
                </div>
                <div>
                  <span className="text-[7px] text-zinc-400 block font-mono">BROKERS_COUNT</span>
                  <span className="text-[9px] font-bold font-mono">{cluster.numberOfBrokers}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MskView;
