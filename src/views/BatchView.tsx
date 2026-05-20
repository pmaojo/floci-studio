import React, { useState } from 'react';
import { RefreshCw, CirclePlus, Trash2, Shield, Play, Briefcase, Cpu, CheckCircle } from 'lucide-react';
import { PageHeader, Card, Button, Input, Modal, Select } from '../components/ui-elements';
import { useAws } from '../contexts/AwsContext';

interface BatchJob {
  id: string;
  name: string;
  jobDefinition: string;
  status: 'SUBMITTED' | 'RUNNING' | 'SUCCEEDED' | 'FAILED';
  vCpus: number;
  memory: number;
  createdAt: string;
}

const BatchView = () => {
  const { logActivity } = useAws();
  const [jobs, setJobs] = useState<BatchJob[]>(() => {
    const saved = localStorage.getItem('aws-sim-batch');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // Fallback below
      }
    }
    return [
      {
        id: "jb-4ca2",
        name: "etl-log-transform",
        jobDefinition: "etl-processor-def:2",
        status: "SUCCEEDED",
        vCpus: 4,
        memory: 8192,
        createdAt: "10 mins ago"
      }
    ];
  });

  React.useEffect(() => {
    localStorage.setItem('aws-sim-batch', JSON.stringify(jobs));
  }, [jobs]);

  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [jobDefinition, setJobDefinition] = useState('etl-processor-def:2');
  const [vCpus, setVCpus] = useState(4);
  const [memory, setMemory] = useState(8192);

  const fetchJobs = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      logActivity('Batch', 'DescribeJobs', 'success');
    }, 500);
  };

  const handleCreate = () => {
    if (!newName) return;
    const cleanId = newName.toLowerCase().replace(/[^a-z0-9-_]/g, '');
    const newJob: BatchJob = {
      id: `jb-${Math.random().toString(36).substring(5)}`,
      name: cleanId,
      jobDefinition,
      status: 'SUBMITTED',
      vCpus,
      memory,
      createdAt: "Just now"
    };

    setJobs(prev => [newJob, ...prev]);
    logActivity('Batch', `SubmitJob: ${cleanId}`, 'success');
    setIsModalOpen(false);
    setNewName('');

    setTimeout(() => {
      setJobs(prev =>
        prev.map(j => j.name === cleanId ? { ...j, status: 'RUNNING' } : j)
      );
    }, 2000);

    setTimeout(() => {
      setJobs(prev =>
        prev.map(j => j.name === cleanId ? { ...j, status: 'SUCCEEDED' } : j)
      );
      logActivity('Batch', `JobSucceeded: ${cleanId}`, 'success');
    }, 8000);
  };

  return (
    <div className="flex flex-col h-full uppercase">
      <PageHeader
        title="AWS Batch Jobs"
        icon={<Briefcase size={18} />}
        onRefresh={fetchJobs}
        isRefreshing={loading}
        actions={
          <Button onClick={() => setIsModalOpen(true)} icon={<CirclePlus size={14} />}>
            Submit Job
          </Button>
        }
      />

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Submit Batch Job">
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60">Job Name</label>
            <Input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="data-analytics-export"
              autoFocus
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60">Job Definition</label>
            <Select value={jobDefinition} onChange={e => setJobDefinition(e.target.value)}>
              <option value="etl-processor-def:2">etl-processor-def:2 (Python, GP3)</option>
              <option value="video-renderer-def:1">video-renderer-def:1 (FFmpeg, GPU)</option>
              <option value="daily-db-backup:5">daily-db-backup:5 (Postgres Tools)</option>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase opacity-60">Allocate vCPUs</label>
              <Input
                type="number"
                value={vCpus}
                onChange={e => setVCpus(parseInt(e.target.value) || 2)}
                min="1"
                max="16"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase opacity-60">Memory (MB)</label>
              <Input
                type="number"
                value={memory}
                onChange={e => setMemory(parseInt(e.target.value) || 2048)}
                min="512"
                max="65536"
              />
            </div>
          </div>

          <div className="pt-4 flex gap-3">
            <Button variant="ghost" className="flex-1" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button className="flex-1" onClick={handleCreate} disabled={!newName}>
               Submit Job
            </Button>
          </div>
        </div>
      </Modal>

      <div className="p-6 space-y-6 flex-1 overflow-auto bg-brand-bg">
        <div className="bg-brand-muted/40 border border-brand-text/10 p-4 rounded-sm">
          <h3 className="font-serif-italic text-sm font-bold text-brand-text">Managed Batch Execution</h3>
          <p className="text-[9px] font-mono opacity-60 normal-case leading-relaxed max-w-xl mt-1">
            Orchestrate containerized batch workloads at scale. Submit job queues targeting Fargate or EC2 instance pools with automated cluster scaling.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {jobs.map(job => (
            <Card key={job.id} className="bg-white hover:border-brand-text transition-all relative">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 border border-brand-text bg-brand-muted/10">
                  <Play size={18} />
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[8px] font-bold px-1.5 py-0.5 border ${
                    job.status === 'SUCCEEDED'
                      ? 'border-emerald-400 bg-emerald-50 text-emerald-800'
                      : job.status === 'RUNNING'
                      ? 'border-blue-400 bg-blue-50 text-blue-800 animate-pulse'
                      : 'border-yellow-400 bg-yellow-50 text-yellow-800'
                  }`}>
                    {job.status}
                  </span>
                </div>
              </div>

              <h4 className="font-mono font-bold text-xs truncate">{job.name}</h4>
              <p className="text-[10px] opacity-50 truncate mt-1 font-mono">Definition: {job.jobDefinition}</p>

              <div className="grid grid-cols-3 gap-2 mt-6 pt-3 border-t border-brand-text/10 bg-brand-muted/15 p-2 text-center rounded-sm">
                <div>
                  <span className="text-[7px] text-zinc-400 block font-mono">vCPUs</span>
                  <span className="text-[9px] font-bold font-mono">{job.vCpus} vCPUs</span>
                </div>
                <div>
                  <span className="text-[7px] text-zinc-400 block font-mono">MEMORY</span>
                  <span className="text-[9px] font-bold font-mono">{job.memory} MB</span>
                </div>
                <div>
                  <span className="text-[7px] text-zinc-400 block font-mono">CREATED</span>
                  <span className="text-[9px] font-bold font-mono lowercase">{job.createdAt}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BatchView;
