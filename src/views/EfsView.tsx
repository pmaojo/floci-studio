import React, { useState } from 'react';
import { RefreshCw, CirclePlus, Trash2, Cpu, HardDrive, Shield, Server, ArrowDownUp } from 'lucide-react';
import { PageHeader, Card, Button, Input, Modal, Select } from '../components/ui-elements';
import { useAws } from '../contexts/AwsContext';

interface EfsFs {
  id: string;
  name: string;
  performanceMode: string;
  throughputMode: string;
  sizeBytes: string;
  status: 'available' | 'creating' | 'updating';
  arn: string;
}

const EfsView = () => {
  const { logActivity } = useAws();
  const [fss, setFss] = useState<EfsFs[]>(() => {
    const saved = localStorage.getItem('aws-sim-efs');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // Fallback below
      }
    }
    return [
      {
        id: "fs-1201fa88",
        name: "shared-wordpress-efs-assets",
        performanceMode: "generalPurpose",
        throughputMode: "bursting",
        sizeBytes: "1.24 GB",
        status: "available",
        arn: "arn:aws:elasticfilesystem:eu-central-1:123456789012:file-system/fs-1201fa88"
      }
    ];
  });

  React.useEffect(() => {
    localStorage.setItem('aws-sim-efs', JSON.stringify(fss));
  }, [fss]);

  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [perf, setPerf] = useState('generalPurpose');
  const [tpMode, setTpMode] = useState('bursting');

  const fetchFss = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      logActivity('EFS', 'DescribeFileSystems', 'success');
    }, 500);
  };

  const handleCreate = () => {
    if (!newName) return;
    const cleanId = newName.toLowerCase().replace(/[^a-z0-9-_]/g, '');
    const newFs: EfsFs = {
      id: `fs-${Math.random().toString(16).substring(2, 10)}`,
      name: cleanId,
      performanceMode: perf,
      throughputMode: tpMode,
      sizeBytes: "6.00 KB",
      status: 'creating',
      arn: `arn:aws:elasticfilesystem:eu-central-1:123456789012:file-system/fs-${Math.random().toString(16).substring(2, 10)}`
    };

    setFss(prev => [...prev, newFs]);
    logActivity('EFS', `CreateFileSystem: ${cleanId}`, 'success');
    setIsModalOpen(false);
    setNewName('');

    setTimeout(() => {
      setFss(prev =>
        prev.map(f => f.name === cleanId ? { ...f, status: 'available' } : f)
      );
      logActivity('EFS', `FileSystemAvailable: ${cleanId}`, 'success');
    }, 4500);
  };

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`Delete EFS File System ${name}?`)) return;
    setFss(prev => prev.filter(f => f.id !== id));
    logActivity('EFS', `DeleteFileSystem: ${name}`, 'success');
  };

  return (
    <div className="flex flex-col h-full uppercase">
      <PageHeader
        title="EFS Filesystems"
        icon={<HardDrive size={18} />}
        onRefresh={fetchFss}
        isRefreshing={loading}
        actions={
          <Button onClick={() => setIsModalOpen(true)} icon={<CirclePlus size={14} />}>
            Create FS
          </Button>
        }
      />

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create Elastic File System">
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60">FileSystem Name</label>
            <Input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="ecs-shared-storage"
              autoFocus
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60">Performance Mode</label>
            <Select value={perf} onChange={e => setPerf(e.target.value)}>
              <option value="generalPurpose">General Purpose (Standard, Low-Latency)</option>
              <option value="maxIO">Max I/O (Scale optimized high concurrency)</option>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60">Throughput Mode</label>
            <Select value={tpMode} onChange={e => setTpMode(e.target.value)}>
              <option value="bursting">Bursting (Automatic Scale IOPS)</option>
              <option value="elastic">Elastic (Pay-per-use optimized)</option>
            </Select>
          </div>

          <div className="pt-4 flex gap-3">
            <Button variant="ghost" className="flex-1" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button className="flex-1" onClick={handleCreate} disabled={!newName}>
               Create FS
            </Button>
          </div>
        </div>
      </Modal>

      <div className="p-6 space-y-6 flex-1 overflow-auto bg-brand-bg">
        <div className="bg-brand-muted/40 border border-brand-text/10 p-4 rounded-sm flex justify-between items-center">
          <div>
            <h3 className="font-serif-italic text-sm font-bold text-brand-text">Elastic network filesystems</h3>
            <p className="text-[9px] font-mono opacity-60 normal-case leading-relaxed max-w-xl mt-1">
              Provide simple, scale-optimized serverless, elastic, network shared storage systems for use with AWS cloud services and local microservices nodes.
            </p>
          </div>
          <ArrowDownUp size={24} className="text-zinc-500 opacity-25" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {fss.map(fs => (
            <Card key={fs.id} className="bg-white hover:border-brand-text transition-all relative">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 border border-brand-text bg-brand-muted/10">
                  <HardDrive size={18} />
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[8px] font-bold px-1.5 py-0.5 border ${
                    fs.status === 'available'
                      ? 'border-emerald-400 bg-emerald-50 text-emerald-800'
                      : 'border-blue-400 bg-blue-50 text-blue-800 animate-pulse'
                  }`}>
                    {fs.status}
                  </span>
                  <button onClick={() => handleDelete(fs.id, fs.name)} className="p-1 hover:text-rose-600 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <h4 className="font-mono font-bold text-xs truncate">{fs.name}</h4>
              <p className="text-[10px] opacity-50 truncate mt-1 lowercase font-mono">{fs.arn}</p>

              <div className="grid grid-cols-3 gap-2 mt-6 pt-3 border-t border-brand-text/10 bg-brand-muted/15 p-2 text-center rounded-sm">
                <div>
                  <span className="text-[7px] text-zinc-400 block font-mono">SIZE_INDEX</span>
                  <span className="text-[9px] font-bold font-mono">{fs.sizeBytes}</span>
                </div>
                <div>
                  <span className="text-[7px] text-zinc-400 block font-mono">PERFORMANCE</span>
                  <span className="text-[9px] font-bold font-mono lowercase">{fs.performanceMode}</span>
                </div>
                <div>
                  <span className="text-[7px] text-zinc-400 block font-mono">THROUGHPUT</span>
                  <span className="text-[9px] font-bold font-mono lowercase">{fs.throughputMode}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default EfsView;
