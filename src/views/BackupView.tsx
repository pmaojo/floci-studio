import React, { useState, useEffect } from 'react';
import { Archive, ShieldAlert, CirclePlus, Trash2, Settings, HardDrive, RefreshCw, Layers, Calendar, Play } from 'lucide-react';
import { PageHeader, Card, Button, Input, Modal, Select } from '../components/ui-elements';
import { useAws } from '../contexts/AwsContext';

interface BackupVault {
  id: string;
  name: string;
  arn: string;
  recoveryPoints: number;
  kmsKeyId: string;
  createdTime: string;
}

interface BackupPlan {
  id: string;
  name: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  retentionDays: number;
  targetVault: string;
}

interface BackupJob {
  id: string;
  resourceName: string;
  resourceType: 'S3' | 'DynamoDB' | 'RDS' | 'EFS';
  vaultName: string;
  status: 'Completed' | 'Running' | 'Failed';
  progress: number;
  timestamp: string;
}

const BackupView = () => {
  const { logActivity } = useAws();
  
  // Storage for Backup Vaults, Plans and active jobs
  const [vaults, setVaults] = useState<BackupVault[]>(() => {
    const saved = localStorage.getItem('floci-aws-sim-backup-vaults');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return [
      {
        id: 'vault-1',
        name: 'default-compliance-backup-vault',
        arn: 'arn:aws:backup:us-east-1:123456789012:backup-vault:default-compliance-backup-vault',
        recoveryPoints: 12,
        kmsKeyId: 'aws/backup-default-key-kms',
        createdTime: new Date(Date.now() - 86400000 * 45).toISOString()
      },
      {
        id: 'vault-2',
        name: 'financial-ledger-audit-vault',
        arn: 'arn:aws:backup:us-east-1:123456789012:backup-vault:financial-ledger-audit-vault',
        recoveryPoints: 4,
        kmsKeyId: 'arn:aws:kms:us-east-1:123456789012:key/ledger-data-kms-secured',
        createdTime: new Date(Date.now() - 86400000 * 12).toISOString()
      }
    ];
  });

  const [plans, setPlans] = useState<BackupPlan[]>(() => {
    const saved = localStorage.getItem('floci-aws-sim-backup-plans');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return [
      {
        id: 'plan-1',
        name: 'daily-retention-backup-90d-cycle',
        frequency: 'daily',
        retentionDays: 90,
        targetVault: 'default-compliance-backup-vault'
      },
      {
        id: 'plan-2',
        name: 'regulatory-archive-7year-policy',
        frequency: 'monthly',
        retentionDays: 2555, // 7 years
        targetVault: 'financial-ledger-audit-vault'
      }
    ];
  });

  const [jobs, setJobs] = useState<BackupJob[]>(() => {
    const saved = localStorage.getItem('floci-aws-sim-backup-jobs');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return [
      { id: 'job-1', resourceName: 'billing-ledger-prod-dynamo', resourceType: 'DynamoDB', vaultName: 'financial-ledger-audit-vault', status: 'Completed', progress: 100, timestamp: '10 hours ago' },
      { id: 'job-2', resourceName: 'compliance-audit-history-logs-s3', resourceType: 'S3', vaultName: 'default-compliance-backup-vault', status: 'Completed', progress: 100, timestamp: 'Yesterday' }
    ];
  });

  useEffect(() => {
    localStorage.setItem('floci-aws-sim-backup-vaults', JSON.stringify(vaults));
  }, [vaults]);

  useEffect(() => {
    localStorage.setItem('floci-aws-sim-backup-plans', JSON.stringify(plans));
  }, [plans]);

  useEffect(() => {
    localStorage.setItem('floci-aws-sim-backup-jobs', JSON.stringify(jobs));
  }, [jobs]);

  const [loading, setLoading] = useState(false);
  const [isVaultModalOpen, setIsVaultModalOpen] = useState(false);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [isOnDemandModalOpen, setIsOnDemandModalOpen] = useState(false);

  // Form states
  const [vName, setVName] = useState('');
  const [kmsKey, setKmsKey] = useState('aws/backup-default-key-kms');

  const [pName, setPName] = useState('');
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [retention, setRetention] = useState('30');
  const [pVault, setPVault] = useState(vaults[0]?.name || '');

  const [resource, setResource] = useState('');
  const [resType, setResType] = useState<'S3' | 'DynamoDB' | 'RDS' | 'EFS'>('S3');
  const [destVault, setDestVault] = useState(vaults[0]?.name || '');

  const fetchBackupMetadata = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      logActivity('AWSBackup', 'DescribeBackupVaults', 'success', 'Retrieved backup metadata sets');
    }, 450);
  };

  const handleCreateVault = () => {
    if (!vName) return;
    const cleanName = vName.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '');
    const arnSim = `arn:aws:backup:us-east-1:123456789012:backup-vault:${cleanName}`;

    const newVault: BackupVault = {
      id: `vault-custom-${Math.random().toString(36).substring(5)}`,
      name: cleanName,
      arn: arnSim,
      recoveryPoints: 0,
      kmsKeyId: kmsKey,
      createdTime: new Date().toISOString()
    };

    setVaults(prev => [...prev, newVault]);
    logActivity('AWSBackup', `CreateBackupVault: ${cleanName}`, 'success', `KMS: ${kmsKey}`);
    setIsVaultModalOpen(false);
    setVName('');
  };

  const handleCreatePlan = () => {
    if (!pName) return;
    const cleanName = pName.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '');

    const newPlan: BackupPlan = {
      id: `plan-custom-${Math.random().toString(36).substring(5)}`,
      name: cleanName,
      frequency,
      retentionDays: parseInt(retention) || 30,
      targetVault: pVault || vaults[0]?.name || 'default-compliance-backup-vault'
    };

    setPlans(prev => [...prev, newPlan]);
    logActivity('AWSBackup', `CreateBackupPlan: ${cleanName}`, 'success', `Frequency: ${frequency}, Vault: ${newPlan.targetVault}`);
    setIsPlanModalOpen(false);
    setPName('');
  };

  const handleLaunchOnDemand = () => {
    if (!resource) return;
    const cleanResource = resource.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '');
    const targetV = destVault || vaults[0]?.name || 'default-compliance-backup-vault';

    const jobId = `job-${Math.random().toString(36).substring(5)}`;
    const newJob: BackupJob = {
      id: jobId,
      resourceName: cleanResource,
      resourceType: resType,
      vaultName: targetV,
      status: 'Running',
      progress: 0,
      timestamp: 'Just now'
    };

    setJobs(prev => [newJob, ...prev]);
    logActivity('AWSBackup', `StartBackupJob: ${cleanResource}`, 'success', `Resource Type: ${resType}, Target Vault: ${targetV}`);
    setIsOnDemandModalOpen(false);
    setResource('');

    // Active scheduling timer from 0% to 100% execution
    let currentPct = 0;
    const progressTimer = setInterval(() => {
      currentPct += 20;
      setJobs(cur => cur.map(j => {
        if (j.id === jobId) {
          if (currentPct >= 100) {
            return { ...j, status: 'Completed', progress: 100, timestamp: 'Just now' };
          }
          return { ...j, progress: currentPct };
        }
        return j;
      }));

      if (currentPct >= 100) {
        clearInterval(progressTimer);
        // Increment recovery points for the target vault!
        setVaults(v => v.map(item => item.name === targetV ? { ...item, recoveryPoints: item.recoveryPoints + 1 } : item));
        logActivity('AWSBackup', `BackupJobCompleted: ${cleanResource}`, 'success', `Vault recovery points expanded. Snapshot point generated.`);
      }
    }, 1500);
  };

  const handleDeleteVault = (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete Backup Vault "${name}"?`)) return;
    setVaults(prev => prev.filter(v => v.id !== id));
    logActivity('AWSBackup', `DeleteBackupVault: ${name}`, 'success', 'Deregistered vault storage logs');
  };

  const handleDeletePlan = (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete Retention Backup Policy Plan "${name}"?`)) return;
    setPlans(prev => prev.filter(p => p.id !== id));
    logActivity('AWSBackup', `DeleteBackupPlan: ${name}`, 'success', 'Policy configuration lifecycle removed');
  };

  return (
    <div className="flex flex-col h-full uppercase">
      <PageHeader
        title="Backup Vault Cycles"
        icon={<Archive size={18} />}
        onRefresh={fetchBackupMetadata}
        isRefreshing={loading}
        actions={
          <div className="flex gap-2">
            <Button onClick={() => setIsOnDemandModalOpen(true)} variant="secondary" icon={<Play size={14} />}>
              Start Backup Job
            </Button>
            <Button onClick={() => setIsPlanModalOpen(true)} variant="secondary" icon={<CirclePlus size={14} />}>
              Add Backup Plan
            </Button>
            <Button onClick={() => setIsVaultModalOpen(true)} icon={<CirclePlus size={14} />}>
              Add Backup Vault
            </Button>
          </div>
        }
      />

      {/* Vault Creation Modal */}
      <Modal isOpen={isVaultModalOpen} onClose={() => setIsVaultModalOpen(false)} title="Create Secure Backup Vault">
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60">Backup Vault Name</label>
            <Input
              value={vName}
              onChange={e => setVName(e.target.value)}
              placeholder="enterprise-disaster-recovery-vault"
              autoFocus
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60">Archive Encryption KMS Key</label>
            <Select value={kmsKey} onChange={e => setKmsKey(e.target.value)}>
              <option value="aws/backup-default-key-kms">aws/backup-default-key-kms (AWS Managed)</option>
              <option value="arn:aws:kms:us-east-1:123456789012:key/ledger-data-kms-secured">Custom KMS Secured Ledger Key</option>
            </Select>
          </div>
          <div className="pt-4 flex gap-3">
            <Button variant="ghost" className="flex-1" onClick={() => setIsVaultModalOpen(false)}>Cancel</Button>
            <Button className="flex-1" onClick={handleCreateVault} disabled={!vName}>
              Create Backup Vault
            </Button>
          </div>
        </div>
      </Modal>

      {/* Backup Plan Creation Modal */}
      <Modal isOpen={isPlanModalOpen} onClose={() => setIsPlanModalOpen(false)} title="Add Backup Retention Plan">
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60">Backup Plan Policy Name</label>
            <Input
              value={pName}
              onChange={e => setPName(e.target.value)}
              placeholder="automated-ledger-90d-retention"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase opacity-60">Cycle Schedule Frequency</label>
              <Select value={frequency} onChange={e => setFrequency(e.target.value as any)}>
                <option value="daily">Daily Cycle (05:00 UTC)</option>
                <option value="weekly">Weekly Cycle (Sundays)</option>
                <option value="monthly">Monthly Audit Plan</option>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase opacity-60 text-zinc-650">KMS Retention Limit (Days)</label>
              <Select value={retention} onChange={e => setRetention(e.target.value)}>
                <option value="30">30 Days</option>
                <option value="90">90 Days</option>
                <option value="365">365 Days (1 Year)</option>
                <option value="2555">2555 Days (7 Years)</option>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60">Destination Target Storage Vault</label>
            <Select value={pVault} onChange={e => setPVault(e.target.value)}>
              {vaults.map(v => (
                <option key={v.id} value={v.name}>{v.name}</option>
              ))}
            </Select>
          </div>
          <div className="pt-4 flex gap-3">
            <Button variant="ghost" className="flex-1" onClick={() => setIsPlanModalOpen(false)}>Cancel</Button>
            <Button className="flex-1" onClick={handleCreatePlan} disabled={!pName}>
              Provision Backup Plan
            </Button>
          </div>
        </div>
      </Modal>

      {/* On Demand snapshot selection modal */}
      <Modal isOpen={isOnDemandModalOpen} onClose={() => setIsOnDemandModalOpen(false)} title="Trigger On-Demand Backup Snapshot">
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60">Resource Identifier Target Name</label>
            <Input
              value={resource}
              onChange={e => setResource(e.target.value)}
              placeholder="production-billing-postgres-db"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase opacity-60">AWS Resource Type</label>
              <Select value={resType} onChange={e => setResType(e.target.value as any)}>
                <option value="RDS">RDS database</option>
                <option value="DynamoDB">DynamoDB Table</option>
                <option value="S3">S3 Storage Bucket</option>
                <option value="EFS">EFS Filesystem</option>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase opacity-60">Target Vault Destination</label>
              <Select value={destVault} onChange={e => setDestVault(e.target.value)}>
                {vaults.map(v => (
                  <option key={v.id} value={v.name}>{v.name}</option>
                ))}
              </Select>
            </div>
          </div>
          <div className="pt-4 flex gap-3">
            <Button variant="ghost" className="flex-1" onClick={() => setIsOnDemandModalOpen(false)}>Cancel</Button>
            <Button className="flex-1" onClick={handleLaunchOnDemand} disabled={!resource}>
              Launch Backup Snapshot
            </Button>
          </div>
        </div>
      </Modal>

      <div className="p-6 space-y-6 flex-1 overflow-auto bg-brand-bg">
        {/* Dynamic Running Progress Monitoring Panel */}
        {jobs.some(j => j.status === 'Running') && (
          <div className="border border-brand-text/15 bg-amber-50/50 p-4 rounded-sm border-l-4 border-l-amber-500 font-mono text-[10px]">
            <h3 className="font-bold text-amber-800 text-xs mb-3 flex items-center gap-1.5 uppercase">
              <RefreshCw size={13} className="animate-spin text-amber-600" /> Snapshot Backup Generation In Progress...
            </h3>
            <div className="space-y-3">
              {jobs.filter(j => j.status === 'Running').map(j => (
                <div key={j.id} className="space-y-1">
                  <div className="flex justify-between items-center text-[9px] font-bold">
                    <span className="text-zinc-700">{j.resourceName} ({j.resourceType}) &rarr; Vault {j.vaultName}</span>
                    <span className="text-amber-800">{j.progress}% COMPLETE</span>
                  </div>
                  <div className="w-full bg-zinc-200 h-2 border border-brand-text/10 overflow-hidden relative">
                    <div className="bg-amber-500 h-full transition-all duration-300" style={{ width: `${j.progress}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Active Backup Vaults Panel */}
          <div className="space-y-4">
            <div className="border border-brand-text/15 bg-white p-4 rounded-sm">
              <h3 className="font-bold text-xs pb-3 border-b border-brand-text/10 mb-4 tracking-wider flex items-center gap-2">
                <Archive size={13} /> SECURE_COMPLIANCE_VAULTS
              </h3>
              <div className="space-y-4">
                {vaults.map(v => (
                  <div key={v.id} className="border border-brand-text/5 bg-brand-muted/10 p-3 relative hover:border-brand-text/50 rounded-sm">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-mono font-bold text-[10px] truncate max-w-[200px]">{v.name}</span>
                      <button onClick={() => handleDeleteVault(v.id, v.name)} className="p-0.5 text-zinc-400 hover:text-rose-600">
                        <Trash2 size={12} />
                      </button>
                    </div>
                    <p className="text-[8px] font-mono opacity-50 select-all lowercase truncate mb-3">ARN: {v.arn}</p>
                    <p className="text-[9px] font-mono text-zinc-400 block lowercase mb-3">KMS Key: {v.kmsKeyId}</p>

                    <div className="flex justify-between items-center pt-2 border-t border-brand-text/5 text-[9px]">
                      <span className="opacity-40">Stored Recovery Archives:</span>
                      <span className="font-mono font-bold text-emerald-600 font-extrabold">{v.recoveryPoints} Snapshot Points</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Backup Plans and Policies Panel */}
          <div className="space-y-4">
            <div className="border border-brand-text/15 bg-white p-4 rounded-sm">
              <h3 className="font-bold text-xs pb-3 border-b border-brand-text/10 mb-4 tracking-wider flex items-center gap-2">
                <Calendar size={13} /> AUTOMATED_PLAN_LIFECYCLES
              </h3>
              <div className="space-y-4">
                {plans.map(p => (
                  <div key={p.id} className="border border-brand-text/5 bg-brand-muted/10 p-3 relative hover:border-brand-text/50 rounded-sm">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-mono font-bold text-[10px] truncate max-w-[200px]">{p.name}</span>
                      <button onClick={() => handleDeletePlan(p.id, p.name)} className="p-0.5 text-zinc-400 hover:text-rose-600">
                        <Trash2 size={12} />
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2 pt-2 text-[9px] font-mono opacity-80 mt-1">
                      <div>
                        <span className="opacity-50 block uppercase text-[7px]">Vault:</span>
                        <span className="font-bold text-zinc-700 truncate block lowercase">{p.targetVault}</span>
                      </div>
                      <div>
                        <span className="opacity-50 block uppercase text-[7px]">Frequency:</span>
                        <span className="font-bold text-indigo-700 block uppercase">{p.frequency}</span>
                      </div>
                      <div>
                        <span className="opacity-50 block uppercase text-[7px]">Retention:</span>
                        <span className="font-bold text-zinc-800 block">{p.retentionDays} Days</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* History of snapshot job listings */}
        <div className="border border-brand-text/15 bg-white p-4 rounded-sm">
          <h3 className="font-bold text-xs pb-3 border-b border-brand-text/10 mb-4 tracking-wider">SNAPSHOT_JOB_HISTORY</h3>
          <div className="space-y-2 pr-1">
            {jobs.map(j => (
              <div key={j.id} className="border border-brand-text/5 bg-brand-muted/15 p-2 flex justify-between items-center font-mono text-[10px]">
                <div className="flex items-center gap-3">
                  <div className="text-left">
                    <span className="font-bold text-brand-text text-[11px] font-mono lowercase">{j.resourceName}</span>
                    <div className="flex gap-4 text-[8px] text-zinc-400 mt-1 uppercase items-center">
                      <span>Type: <strong className="text-indigo-600">{j.resourceType}</strong></span>
                      <span>Target Vault: <strong>{j.vaultName}</strong></span>
                      <span>Timestamp: <strong>{j.timestamp}</strong></span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-6 shrink-0 text-right">
                  <div className="w-20">
                    <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-sm uppercase ${
                      j.status === 'Completed' ? 'bg-emerald-100 text-emerald-800' :
                      j.status === 'Failed' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {j.status} {j.status === 'Running' && `(${j.progress}%)`}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BackupView;
