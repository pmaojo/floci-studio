import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ListBucketsCommand, 
  ListObjectsV2Command, 
  CreateBucketCommand,
  DeleteBucketCommand,
  DeleteObjectCommand
} from '@aws-sdk/client-s3';
import { useAws } from '../contexts/AwsContext';
import { 
  Box, 
  CirclePlus, 
  Trash2, 
  Folder, 
  File, 
  Search, 
  ArrowLeft,
  FileCode,
  Image as ImageIcon,
  FileText,
  Clock,
  RefreshCw,
  Layers,
  Settings,
  ShieldAlert,
  Archive,
  Lock,
  ShieldCheck,
  Play,
  ArrowUpRight,
  Sparkles,
  CheckCircle2,
  ShieldCheck as VerifiedIcon,
  HelpCircle
} from 'lucide-react';
import { PageHeader, Card, Button, Input, Skeleton, Modal, Select } from '../components/ui-elements';
import { format } from 'date-fns';

interface LifecycleRule {
  id: string;
  prefix: string;
  transitionDays: number;
  storageClass: 'GLACIER' | 'STANDARD_IA' | 'DEEP_ARCHIVE' | 'EXPIRE';
  status: 'ENABLED' | 'DISABLED';
}

interface ReplicationRule {
  id: string;
  sourcePrefix: string;
  destinationBucket: string;
  iamRole: string;
  status: 'ENABLED' | 'DISABLED';
}

interface GlacierVault {
  id: string;
  name: string;
  arn: string;
  creationDate: string;
  sizeBytes: number;
  archiveCount: number;
  lockStatus: 'UNLOCKED' | 'LOCKED_IN_PROGRESS' | 'LOCKED';
  policyJson: string;
}

interface GlacierArchive {
  id: string;
  name: string;
  contentType: string;
  sizeBytes: number;
  uploadedAt: string;
}

interface RetrievalJob {
  id: string;
  vaultId: string;
  archiveId: string;
  archiveName: string;
  tier: 'Expedited' | 'Standard' | 'Bulk';
  status: 'IN_PROGRESS' | 'COMPLETED' | 'EXPIRED';
  progress: number;
  etaSeconds: number;
}

const S3View = () => {
  const { clients, logActivity } = useAws();
  const [buckets, setBuckets] = useState<any[]>([]);
  const [selectedBucket, setSelectedBucket] = useState<string | null>(null);
  const [bucketTab, setBucketTab] = useState<'objects' | 'lifecycle' | 'replication'>('objects');
  const [objects, setObjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [objectsLoading, setObjectsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  
  // Storage level switcher: standard s3 vs s3 glacier vaults
  const [storageMode, setStorageMode] = useState<'s3' | 'glacier'>('s3');

  // Glacier Vault States
  const [vaults, setVaults] = useState<GlacierVault[]>(() => {
    const saved = localStorage.getItem('aws-sim-glacier-vaults');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return [
      {
        id: 'vault-1',
        name: 'enterprise-compliance-vault',
        arn: 'arn:aws:glacier:us-east-1:000000000000:vaults/enterprise-compliance-vault',
        creationDate: new Date(Date.now() - 86400000 * 45).toISOString(),
        sizeBytes: 1342177280000, // 1.25 TB
        archiveCount: 412,
        lockStatus: 'LOCKED',
        policyJson: '{\n  "Version": "2012-10-17",\n  "Statement": [\n    {\n      "Sid": "EnforceWormCompliance",\n      "Effect": "Deny",\n      "Principal": "*",\n      "Action": ["glacier:DeleteArchive"],\n      "Resource": "arn:aws:glacier:us-east-1:000000000000:vaults/enterprise-compliance-vault"\n    }\n  ]\n}'
      },
      {
        id: 'vault-2',
        name: 'medical-images-coldstore',
        arn: 'arn:aws:glacier:us-east-1:000000000000:vaults/medical-images-coldstore',
        creationDate: new Date(Date.now() - 86400000 * 10).toISOString(),
        sizeBytes: 85899345920, // 80 GB
        archiveCount: 35,
        lockStatus: 'UNLOCKED',
        policyJson: '{\n  "Version": "2012-10-17",\n  "Statement": [\n    {\n      "Effect": "Allow",\n      "Principal": "*",\n      "Action": "glacier:*",\n      "Resource": "*"\n    }\n  ]\n}'
      }
    ];
  });
  
  const [selectedVault, setSelectedVault] = useState<string | null>(null);
  const [vaultTab, setVaultTab] = useState<'archives' | 'lock-policy' | 'retrievals'>('archives');
  const [archivesByVault, setArchivesByVault] = useState<Record<string, GlacierArchive[]>>(() => {
    const saved = localStorage.getItem('aws-sim-glacier-archives');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return {
      'vault-1': [
        { id: 'arch-1001', name: 'compliance_audit_log_2023.csv', contentType: 'text/csv', sizeBytes: 154784, uploadedAt: new Date(Date.now() - 86400000 * 30).toISOString() },
        { id: 'arch-1002', name: 'financials_q1_raw_data.xlsx', contentType: 'application/vnd.ms-excel', sizeBytes: 5240982, uploadedAt: new Date(Date.now() - 86400000 * 15).toISOString() }
      ],
      'vault-2': [
        { id: 'arch-2001', name: 'mri_scan_patient_981.dcm', contentType: 'application/octet-stream', sizeBytes: 24784910, uploadedAt: new Date(Date.now() - 86400000 * 4).toISOString() }
      ]
    };
  });

  const [retrievalJobs, setRetrievalJobs] = useState<RetrievalJob[]>(() => {
    const saved = localStorage.getItem('aws-sim-glacier-retrievals');
    return saved ? JSON.parse(saved) : [];
  });

  // Glacier Creators/Modals
  const [isGlacierVaultModalOpen, setIsGlacierVaultModalOpen] = useState(false);
  const [newVaultName, setNewVaultName] = useState('');
  
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [newArchiveName, setNewArchiveName] = useState('');
  const [newArchiveSize, setNewArchiveSize] = useState('1.5'); // MB

  // Creation bucket modal
  const [isCreationModalOpen, setIsCreationModalOpen] = useState(false);
  const [newBucketName, setNewBucketName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Lifecycle Rules states
  const [lifecycleRules, setLifecycleRules] = useState<Record<string, LifecycleRule[]>>(() => {
    const saved = localStorage.getItem('aws-sim-s3-lifecycles');
    return saved ? JSON.parse(saved) : {};
  });
  const [isLifecycleModalOpen, setIsLifecycleModalOpen] = useState(false);
  const [lfPrefix, setLfPrefix] = useState('');
  const [lfDays, setLfDays] = useState(30);
  const [lfClass, setLfClass] = useState<'GLACIER' | 'STANDARD_IA' | 'DEEP_ARCHIVE' | 'EXPIRE'>('GLACIER');

  // Replication Rules states
  const [replicationRules, setReplicationRules] = useState<Record<string, ReplicationRule[]>>(() => {
    const saved = localStorage.getItem('aws-sim-s3-replications');
    return saved ? JSON.parse(saved) : {};
  });
  const [isReplicationModalOpen, setIsReplicationModalOpen] = useState(false);
  const [repPrefix, setRepPrefix] = useState('');
  const [repDestBucket, setRepDestBucket] = useState('');
  const [repRole, setRepRole] = useState('arn:aws:iam::000000000000:role/s3-replication-role');

  useEffect(() => {
    localStorage.setItem('aws-sim-glacier-vaults', JSON.stringify(vaults));
  }, [vaults]);

  useEffect(() => {
    localStorage.setItem('aws-sim-glacier-archives', JSON.stringify(archivesByVault));
  }, [archivesByVault]);

  useEffect(() => {
    localStorage.setItem('aws-sim-glacier-retrievals', JSON.stringify(retrievalJobs));
  }, [retrievalJobs]);

  useEffect(() => {
    localStorage.setItem('aws-sim-s3-lifecycles', JSON.stringify(lifecycleRules));
  }, [lifecycleRules]);

  useEffect(() => {
    localStorage.setItem('aws-sim-s3-replications', JSON.stringify(replicationRules));
  }, [replicationRules]);

  // Handle active countdown scheduling for Glacier Asynchronous Archives Retrievals
  useEffect(() => {
    const timer = setInterval(() => {
      setRetrievalJobs(currentJobs => {
        let changed = false;
        const updated = currentJobs.map(job => {
          if (job.status !== 'IN_PROGRESS') return job;
          changed = true;
          
          const newEta = Math.max(0, job.etaSeconds - 1);
          // Standard progress interpolation
          const baseProgress = ((15 - newEta) / 15) * 100; // standard ticks matching simulated eta seconds
          const actualProgress = Math.min(100, Math.floor(baseProgress));
          const finished = newEta === 0;

          if (finished) {
            logActivity('Glacier', `ArchiveRetrievalSuccessful: ${job.archiveName}`, 'success', `Vault: ${job.vaultId}`);
          }

          return {
            ...job,
            progress: actualProgress,
            etaSeconds: newEta,
            status: finished ? ('COMPLETED' as const) : ('IN_PROGRESS' as const)
          };
        });
        
        if (changed) {
          localStorage.setItem('aws-sim-glacier-retrievals', JSON.stringify(updated));
        }
        return updated;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const fetchBuckets = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await clients.s3.send(new ListBucketsCommand({}));
      setBuckets(response.Buckets || []);
      logActivity('S3', 'ListBuckets', 'success');
    } catch (err: any) {
      setError(err.message || 'Failed to fetch buckets');
      logActivity('S3', 'ListBuckets failed', 'error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchObjects = async (bucketName: string) => {
    setObjectsLoading(true);
    try {
      const response = await clients.s3.send(new ListObjectsV2Command({ Bucket: bucketName }));
      setObjects(response.Contents || []);
      logActivity('S3', 'ListObjectsV2', 'success', `bucket=${bucketName}`);
    } catch (err: any) {
      logActivity('S3', 'ListObjectsV2 failed', 'error', err.message);
      console.error(err);
    } finally {
      setObjectsLoading(false);
    }
  };

  useEffect(() => {
    fetchBuckets();
  }, []);

  const handleCreateBucket = async () => {
    if (!newBucketName) return;
    setIsCreating(true);
    try {
      await clients.s3.send(new CreateBucketCommand({ Bucket: newBucketName }));
      logActivity('S3', `CreateBucket: ${newBucketName}`, 'success');
      setNewBucketName('');
      setIsCreationModalOpen(false);
      fetchBuckets();
    } catch (err: any) {
      logActivity('S3', `CreateBucket: ${newBucketName} failed`, 'error', err.message);
      alert(err.message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteBucket = async (name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Are you sure you want to delete bucket "${name}"?`)) return;
    try {
      await clients.s3.send(new DeleteBucketCommand({ Bucket: name }));
      logActivity('S3', `DeleteBucket: ${name}`, 'success');
      fetchBuckets();
    } catch (err: any) {
      logActivity('S3', `DeleteBucket: ${name} failed`, 'error', err.message);
      alert(err.message);
    }
  };

  const handleDeleteObject = async (key: string) => {
    if (!selectedBucket || !confirm(`Delete ${key}?`)) return;
    try {
      await clients.s3.send(new DeleteObjectCommand({ Bucket: selectedBucket, Key: key }));
      logActivity('S3', `DeleteObject: ${selectedBucket}/${key}`, 'success');
      fetchObjects(selectedBucket);
    } catch (err: any) {
      logActivity('S3', `DeleteObject: ${selectedBucket}/${key} failed`, 'error', err.message);
      alert(err.message);
    }
  };

  // S3 Bucket - Add Lifecycle Rule
  const handleAddLifecycleRule = () => {
    if (!selectedBucket) return;
    const newRule: LifecycleRule = {
      id: `lcf-${Math.random().toString(36).substring(5)}`,
      prefix: lfPrefix,
      transitionDays: lfDays,
      storageClass: lfClass,
      status: 'ENABLED'
    };
    const currentRules = lifecycleRules[selectedBucket] || [];
    setLifecycleRules(prev => ({
      ...prev,
      [selectedBucket]: [...currentRules, newRule]
    }));
    logActivity('S3', `PutBucketLifecycleConfiguration: ${selectedBucket}`, 'success');
    setIsLifecycleModalOpen(false);
    setLfPrefix('');
  };

  const handleDeleteLifecycleRule = (ruleId: string) => {
    if (!selectedBucket) return;
    setLifecycleRules(prev => ({
      ...prev,
      [selectedBucket]: (prev[selectedBucket] || []).filter(r => r.id !== ruleId)
    }));
    logActivity('S3', `DeleteBucketLifecycleRule: ${selectedBucket}`, 'success');
  };

  // S3 Bucket - Add Replication Rule
  const handleAddReplicationRule = () => {
    if (!selectedBucket || !repDestBucket) return;
    const newRule: ReplicationRule = {
      id: `rep-${Math.random().toString(36).substring(5)}`,
      sourcePrefix: repPrefix,
      destinationBucket: repDestBucket,
      iamRole: repRole,
      status: 'ENABLED'
    };
    const currentRules = replicationRules[selectedBucket] || [];
    setReplicationRules(prev => ({
      ...prev,
      [selectedBucket]: [...currentRules, newRule]
    }));
    logActivity('S3', `PutBucketReplicationConfiguration: ${selectedBucket}`, 'success');
    setIsReplicationModalOpen(false);
    setRepPrefix('');
  };

  const handleDeleteReplicationRule = (ruleId: string) => {
    if (!selectedBucket) return;
    setReplicationRules(prev => ({
      ...prev,
      [selectedBucket]: (prev[selectedBucket] || []).filter(r => r.id !== ruleId)
    }));
    logActivity('S3', `DeleteBucketReplicationRule: ${selectedBucket}`, 'success');
  };

  // GLACIER VAULTS: Create new vault
  const handleCreateVault = () => {
    if (!newVaultName) return;
    const formattedName = newVaultName.trim().toLowerCase().replace(/[^a-z0-9-._]/g, '');
    const newPrvVault: GlacierVault = {
      id: `vault-${Math.random().toString(36).substring(5)}`,
      name: formattedName,
      arn: `arn:aws:glacier:us-east-1:000000000000:vaults/${formattedName}`,
      creationDate: new Date().toISOString(),
      sizeBytes: 0,
      archiveCount: 0,
      lockStatus: 'UNLOCKED',
      policyJson: '{\n  "Version": "2012-10-17",\n  "Statement": [\n    {\n      "Effect": "Allow",\n      "Principal": "*",\n      "Action": "glacier:*",\n      "Resource": "*"\n    }\n  ]\n}'
    };

    setVaults(prev => [...prev, newPrvVault]);
    setArchivesByVault(prev => ({ ...prev, [newPrvVault.id]: [] }));
    logActivity('Glacier', `CreateVault: ${formattedName}`, 'success');
    setNewVaultName('');
    setIsGlacierVaultModalOpen(false);
  };

  const handleDeleteVault = (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Are you sure you want to delete Glacier Archival Vault "${name}"?`)) return;
    setVaults(prev => prev.filter(v => v.id !== id));
    logActivity('Glacier', `DeleteVault: ${name}`, 'success');
    if (selectedVault === id) setSelectedVault(null);
  };

  // Archive a specific file into Glacier Vault
  const handleArchiveFile = () => {
    if (!selectedVault || !newArchiveName) return;
    
    const sizeInBytes = Math.floor(parseFloat(newArchiveSize || '1') * 1024 * 1024);
    const newArch: GlacierArchive = {
      id: `arch-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
      name: newArchiveName,
      contentType: newArchiveName.includes('.') ? `application/${newArchiveName.split('.').pop()}` : 'application/octet-stream',
      sizeBytes: sizeInBytes,
      uploadedAt: new Date().toISOString()
    };

    const currentArchives = archivesByVault[selectedVault] || [];
    const updatedArchives = [...currentArchives, newArch];

    setArchivesByVault(prev => ({
      ...prev,
      [selectedVault]: updatedArchives
    }));

    // Update vault size & archive count metadata
    setVaults(currVaults => currVaults.map(v => {
      if (v.id === selectedVault) {
        return {
          ...v,
          archiveCount: v.archiveCount + 1,
          sizeBytes: v.sizeBytes + sizeInBytes
        };
      }
      return v;
    }));

    logActivity('Glacier', `UploadArchive: ${newArchiveName}`, 'success', `Vault ID: ${selectedVault}`);
    setNewArchiveName('');
    setIsArchiveModalOpen(false);
  };

  // Lock Vault policy complying with WORM locks
  const handleLockVaultPolicy = (vaultId: string) => {
    if (!confirm('Warning: Locking this vault policy enforces irreversible WORM Compliance policies! You will be strictly locked out of editing this access control rule block. Do you want to lock the vault?')) return;
    
    setVaults(prev => prev.map(v => {
      if (v.id === vaultId) {
        return { ...v, lockStatus: 'LOCKED' as const };
      }
      return v;
    }));
    
    logActivity('Glacier', 'PutVaultLock', 'success', `Vault: ${vaultId} status=LOCKED_COMPLIANCE`);
  };

  // Initiate Async File Retrieval Job
  const handleInitiateRetrieval = (archive: GlacierArchive, tier: 'Expedited' | 'Standard' | 'Bulk') => {
    if (!selectedVault) return;
    
    // Set ETA seconds depending on selection tier
    const eta = tier === 'Expedited' ? 6 : tier === 'Standard' ? 15 : 28;

    const newJob: RetrievalJob = {
      id: `job-${Math.random().toString(36).substring(4)}`,
      vaultId: selectedVault,
      archiveId: archive.id,
      archiveName: archive.name,
      tier,
      status: 'IN_PROGRESS',
      progress: 0,
      etaSeconds: eta
    };

    setRetrievalJobs(prev => [newJob, ...prev]);
    logActivity('Glacier', `InitiateRetrievalJob: ${archive.name}`, 'success', `Tier: ${tier}, Simulated ETA: ${eta}s`);
  };

  const getFileIcon = (key: string) => {
    const ext = key.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'svg'].includes(ext || '')) return <ImageIcon size={20} className="text-pink-500 shrink-0" />;
    if (['txt', 'md', 'pdf'].includes(ext || '')) return <FileText size={20} className="text-blue-500 shrink-0" />;
    if (['json', 'js', 'ts', 'html', 'css'].includes(ext || '')) return <FileCode size={20} className="text-amber-500 shrink-0" />;
    return <File size={20} className="text-slate-400 shrink-0" />;
  };

  const filteredBuckets = buckets.filter(b => b.Name?.toLowerCase().includes(search.toLowerCase()));
  const filteredVaults = vaults.filter(v => v.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="flex flex-col h-full uppercase">
      {/* Dynamic Master Storage Mode header Switcher */}
      <div className="bg-brand-muted border-b border-brand-text flex gap-0.5 px-4 lg:px-6 py-2 shrink-0">
        <button
          onClick={() => { setStorageMode('s3'); setSelectedBucket(null); setSelectedVault(null); }}
          className={`px-4 py-1.5 text-[9px] font-bold tracking-wider rounded-sm ${storageMode === 's3' ? 'bg-brand-text text-brand-bg font-extrabold' : 'bg-transparent text-zinc-600 hover:bg-white/30'}`}
        >
          S3 STANDARD BUCKETS
        </button>
        <button
          onClick={() => { setStorageMode('glacier'); setSelectedBucket(null); setSelectedVault(null); }}
          className={`px-4 py-1.5 text-[9px] font-bold tracking-wider rounded-sm flex items-center gap-1.5 ${storageMode === 'glacier' ? 'bg-indigo-950 text-indigo-50 border border-indigo-200' : 'bg-transparent text-zinc-600 hover:bg-white/30'}`}
        >
          <Archive size={11} className="animate-bounce" />
          S3 GLACIER ARCHIVAL VAULTS
        </button>
      </div>

      <PageHeader 
        title={
          selectedBucket 
            ? `Bucket / ${selectedBucket}` 
            : selectedVault 
              ? `Glacier Vault / ${vaults.find(v => v.id === selectedVault)?.name}`
              : storageMode === 's3' 
                ? "S3 Object Store" 
                : "S3 Glacier Compliance Vaults"
        } 
        icon={storageMode === 's3' ? <Box size={18} /> : <Archive size={18} className="text-indigo-600" />}
        onRefresh={
          selectedBucket 
            ? () => fetchObjects(selectedBucket) 
            : storageMode === 's3' 
              ? fetchBuckets 
              : undefined
        }
        isRefreshing={loading || (selectedBucket ? objectsLoading : false)}
        actions={
          storageMode === 's3' ? (
            !selectedBucket ? (
              <Button onClick={() => setIsCreationModalOpen(true)} icon={<CirclePlus size={14} />}>
                Create Bucket
              </Button>
            ) : bucketTab === 'lifecycle' ? (
              <Button onClick={() => setIsLifecycleModalOpen(true)} icon={<CirclePlus size={14} />}>
                Create Lifecycle Rule
              </Button>
            ) : bucketTab === 'replication' ? (
              <Button onClick={() => setIsReplicationModalOpen(true)} icon={<CirclePlus size={14} />}>
                Create Replication Rule
              </Button>
            ) : null
          ) : (
            // Glacier Actions
            !selectedVault ? (
              <Button onClick={() => setIsGlacierVaultModalOpen(true)} icon={<CirclePlus size={14} />}>
                Create Vault
              </Button>
            ) : vaultTab === 'archives' ? (
              <Button onClick={() => setIsArchiveModalOpen(true)} icon={<CirclePlus size={14} />}>
                Archive Document File
              </Button>
            ) : null
          )
        }
      />

      {/* S3 Buckets creation modals */}
      <Modal 
        isOpen={isCreationModalOpen} 
        onClose={() => setIsCreationModalOpen(false)} 
        title="Create S3 Bucket"
      >
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60">Bucket Name (Must be globally unique)</label>
            <Input 
              value={newBucketName}
              onChange={e => setNewBucketName(e.target.value)}
              placeholder="my-cool-bucket"
              autoFocus
            />
          </div>
          <div className="pt-4 flex gap-3">
             <Button variant="ghost" className="flex-1" onClick={() => setIsCreationModalOpen(false)}>Cancel</Button>
             <Button 
               className="flex-1" 
               onClick={handleCreateBucket} 
               disabled={!newBucketName || isCreating}
             >
               {isCreating ? 'Creating...' : 'Create S3 Bucket'}
             </Button>
          </div>
        </div>
      </Modal>

      {/* S3 Buckets Lifecycle modual */}
      <Modal isOpen={isLifecycleModalOpen} onClose={() => setIsLifecycleModalOpen(false)} title="Configure Bucket Lifecycle Configuration">
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60">Object Path Suffix Prefix</label>
            <Input value={lfPrefix} onChange={e => setLfPrefix(e.target.value)} placeholder="logs/ or temp/" autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase opacity-60">Transition After (Days)</label>
              <Input type="number" value={lfDays} onChange={e => setLfDays(parseInt(e.target.value) || lfDays)} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase opacity-60">Storage Class Target</label>
              <Select value={lfClass} onChange={e => setLfClass(e.target.value as any)}>
                <option value="GLACIER">Glacier Flexible Retrieval (Archived)</option>
                <option value="DEEP_ARCHIVE">Glacier Deep Archive (Optimized Cost)</option>
                <option value="STANDARD_IA">Standard Infrequent Access</option>
                <option value="EXPIRE">Permanent Expiration (Deletion)</option>
              </Select>
            </div>
          </div>
          <div className="pt-4 flex gap-3">
             <Button variant="ghost" className="flex-1" onClick={() => setIsLifecycleModalOpen(false)}>Cancel</Button>
             <Button className="flex-1" onClick={handleAddLifecycleRule}>Apply Rule</Button>
          </div>
        </div>
      </Modal>

      {/* S3 Buckets replication modal */}
      <Modal isOpen={isReplicationModalOpen} onClose={() => setIsReplicationModalOpen(false)} title="Add S3 Replication Rule">
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60">Source Folder Prefix match</label>
            <Input value={repPrefix} onChange={e => setRepPrefix(e.target.value)} placeholder="uploads/" autoFocus />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60">Destination S3 Bucket Target</label>
            <Input value={repDestBucket} onChange={e => setRepDestBucket(e.target.value)} placeholder="replica-backup-bucket" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60">IAM execution role ARN</label>
            <Input value={repRole} onChange={e => setRepRole(e.target.value)} />
          </div>
          <div className="pt-4 flex gap-3">
             <Button variant="ghost" className="flex-1" onClick={() => setIsReplicationModalOpen(false)}>Cancel</Button>
             <Button className="flex-1" onClick={handleAddReplicationRule} disabled={!repDestBucket}>Add Replication Rule</Button>
          </div>
        </div>
      </Modal>

      {/* S3 GLACIER ARCHIVAL VAULTS CREATION MODAL */}
      <Modal 
        isOpen={isGlacierVaultModalOpen} 
        onClose={() => setIsGlacierVaultModalOpen(false)} 
        title="Provision S3 Glacier Archival Vault"
      >
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60">Vault Name (WORM Compliant Target)</label>
            <Input 
              value={newVaultName}
              onChange={e => setNewVaultName(e.target.value)}
              placeholder="patient-mri-records-2025"
              autoFocus
            />
          </div>
          <div className="p-3 bg-red-50 border border-red-200 text-red-900 text-[9.5px] font-mono lowercase">
            <p><strong>Strict Audit compliance notice:</strong> Glacier Vaults can support Write-Once-Read-Many (WORM) parameters. Locking policies makes archives completely indelible.</p>
          </div>
          <div className="pt-4 flex gap-3">
             <Button variant="ghost" className="flex-1" onClick={() => setIsGlacierVaultModalOpen(false)}>Cancel</Button>
             <Button 
               className="flex-1 bg-indigo-950 text-indigo-50" 
               onClick={handleCreateVault} 
               disabled={!newVaultName}
             >
               Provision Vault
             </Button>
          </div>
        </div>
      </Modal>

      {/* ARCHIVE DOCUMENT INTO GLACIER MODAL */}
      <Modal
        isOpen={isArchiveModalOpen}
        onClose={() => setIsArchiveModalOpen(false)}
        title="Archive File (Glacier Core Vault Drop)"
      >
        <div className="space-y-4 font-sans">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60">File / Document Name</label>
            <Input 
              value={newArchiveName}
              onChange={e => setNewArchiveName(e.target.value)}
              placeholder="patient_chart_88921.pdf"
              autoFocus
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60">Payload Allocation Size (MB)</label>
            <Input 
              type="number"
              step="0.1"
              value={newArchiveSize}
              onChange={e => setNewArchiveSize(e.target.value)}
            />
          </div>
          <div className="pt-4 flex gap-3">
             <Button variant="ghost" className="flex-1" onClick={() => setIsArchiveModalOpen(false)}>Cancel</Button>
             <Button 
               className="flex-1 bg-indigo-900 text-indigo-50" 
               onClick={handleArchiveFile} 
               disabled={!newArchiveName}
             >
               Encrypt & Archive File
             </Button>
          </div>
        </div>
      </Modal>

      {/* Main workspaces displaying client tables depending on selected values */}
      <div className="p-6 space-y-6 flex-1 overflow-auto bg-brand-bg">
        <AnimatePresence mode="wait">
          {storageMode === 's3' ? (
            // ==================== STANDARD S3 RENDER MODULE ====================
            !selectedBucket ? (
              <motion.div
                key="s3-buckets"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text opacity-30" size={14} />
                  <Input 
                    placeholder="Filter Buckets..." 
                    className="pl-10 mr-1" 
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                </div>

                {loading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-28 w-full" />)}
                  </div>
                ) : filteredBuckets.length === 0 ? (
                  <Card className="text-center py-20 bg-brand-muted/30 border-dashed">
                    <p className="text-[10px] font-bold uppercase tracking-widest opacity-30">NO_S3_BUCKETS_PROVISIONED</p>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredBuckets.map((bucket) => (
                      <motion.div 
                        key={bucket.Name} 
                        whileHover={{ scale: 1.01 }}
                        className="group"
                      >
                        <Card 
                          noPadding
                          className="hover:border-brand-text transition-all cursor-pointer h-full relative border-neutral-200"
                        >
                          <div 
                            onClick={() => { setSelectedBucket(bucket.Name!); fetchObjects(bucket.Name!); }} 
                            className="p-4"
                          >
                            <div className="flex items-start justify-between mb-4 gap-2">
                              <div className="p-2 rounded-sm bg-indigo-50 text-indigo-700 group-hover:bg-brand-text group-hover:text-brand-bg transition-colors shrink-0">
                                <Box size={24} />
                              </div>
                              <h3 className="font-mono font-bold text-xs truncate max-w-[150px] relative top-1.5">{bucket.Name}</h3>
                            </div>
                            <p className="text-[10px] opacity-60 uppercase font-bold tracking-wider">
                              Established {format(bucket.CreationDate!, 'yyyy-MM-dd')}
                            </p>
                          </div>
                          
                          <div className="absolute top-2 right-2 flex justify-end">
                            <button 
                              onClick={(e) => handleDeleteBucket(bucket.Name!, e)}
                              className="p-1 text-neutral-300 hover:text-rose-600 transition-colors"
                            >
                              <Trash2 size={13} strokeWidth={2.5} />
                            </button>
                          </div>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            ) : (
              // S3 BUCKET VIEW
              <motion.div
                key="objects"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col space-y-4"
              >
                <div className="flex border-b border-brand-text bg-white shrink-0 text-[10px] font-bold uppercase">
                  <button 
                    onClick={() => setSelectedBucket(null)} 
                    className="px-4 py-3 border-r border-brand-text flex items-center gap-2 text-rose-800 hover:bg-brand-muted"
                  >
                    <ArrowLeft size={14} /> Back
                  </button>
                  <button 
                    onClick={() => setBucketTab('objects')}
                    className={`px-6 py-3 border-r border-brand-text flex items-center gap-1.5 transition-all ${bucketTab === 'objects' ? 'bg-brand-text text-brand-bg font-bold' : 'hover:bg-brand-muted'}`}
                  >
                    <File size={14} /> Objects ({objects.length})
                  </button>
                  <button 
                    onClick={() => setBucketTab('lifecycle')}
                    className={`px-6 py-3 border-r border-brand-text flex items-center gap-1.5 transition-all ${bucketTab === 'lifecycle' ? 'bg-brand-text text-brand-bg font-bold' : 'hover:bg-brand-muted'}`}
                  >
                    <Clock size={14} /> Lifecycles ({(lifecycleRules[selectedBucket] || []).length})
                  </button>
                  <button 
                    onClick={() => setBucketTab('replication')}
                    className={`px-6 py-3 border-r border-brand-text flex items-center gap-1.5 transition-all ${bucketTab === 'replication' ? 'bg-brand-text text-brand-bg font-bold' : 'hover:bg-brand-muted'}`}
                  >
                    <RefreshCw size={14} /> Replication ({(replicationRules[selectedBucket] || []).length})
                  </button>
                </div>

                <div className="pt-2">
                  <AnimatePresence mode="wait">
                    {bucketTab === 'objects' && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                        {objectsLoading ? (
                          <div className="space-y-3">
                            {[1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full" />)}
                          </div>
                        ) : objects.length === 0 ? (
                          <Card className="text-center py-20 bg-brand-muted/30 border-dashed">
                            <Folder size={40} className="mx-auto text-brand-text opacity-15 mb-4" />
                            <p className="text-[10px] font-bold uppercase tracking-widest opacity-30">BUCKET_ISEMPTY</p>
                          </Card>
                        ) : (
                          <div className="space-y-2">
                            {objects.map(obj => (
                              <Card key={obj.Key} className="flex justify-between items-center bg-brand-muted/15 font-mono text-xs hover:border-brand-text/50">
                                <div className="flex items-center gap-3">
                                  {getFileIcon(obj.Key!)}
                                  <div>
                                    <p className="font-bold text-slate-800 lowercase break-all">{obj.Key}</p>
                                    <p className="text-[9px] opacity-40 font-mono mt-0.5">Size: {(obj.Size! / 1024).toFixed(1)} KB | Modified: {format(obj.LastModified!, 'yyyy-MM-dd HH:mm')}</p>
                                  </div>
                                </div>
                                <button onClick={() => handleDeleteObject(obj.Key!)} className="p-2 text-zinc-400 hover:text-rose-600 transition-colors">
                                  <Trash2 size={13} />
                                </button>
                              </Card>
                            ))}
                          </div>
                        )}
                      </motion.div>
                    )}

                    {bucketTab === 'lifecycle' && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                        <Card>
                          <h3 className="font-bold text-xs pb-3 border-b border-brand-text/10 mb-4 tracking-wider">BUCKET_LIFECYCLE_LAWS</h3>
                          <div className="space-y-3 font-mono text-[11px]">
                            {(!lifecycleRules[selectedBucket] || lifecycleRules[selectedBucket].length === 0) ? (
                              <p className="text-center py-10 opacity-30 italic">No transition configurations mapped</p>
                            ) : (
                              lifecycleRules[selectedBucket].map(rule => (
                                <div key={rule.id} className="border border-brand-text/5 p-3 bg-brand-muted/10 flex justify-between items-center rounded-sm">
                                  <div>
                                    <p className="font-bold">Match: <span className="text-indigo-700">{rule.prefix || '*'}</span></p>
                                    <p className="text-[9px] opacity-60 uppercase font-sans mt-0.5">Transition to <strong>{rule.storageClass}</strong> after <strong>{rule.transitionDays} days</strong></p>
                                  </div>
                                  <button onClick={() => handleDeleteLifecycleRule(rule.id)} className="p-1.5 text-zinc-400 hover:text-rose-600">
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              ))
                            )}
                          </div>
                        </Card>
                      </motion.div>
                    )}

                    {bucketTab === 'replication' && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                        <Card>
                          <h3 className="font-bold text-xs pb-3 border-b border-brand-text/10 mb-4 tracking-wider">REPLICATION_CROSS_BACKUPS</h3>
                          <div className="space-y-3 font-mono text-[11px]">
                            {(!replicationRules[selectedBucket] || replicationRules[selectedBucket].length === 0) ? (
                              <p className="text-center py-10 opacity-30 italic">No cross-region sync configurations mapped</p>
                            ) : (
                              replicationRules[selectedBucket].map(rule => (
                                <div key={rule.id} className="border border-brand-text/5 p-3 bg-brand-muted/10 flex justify-between items-center rounded-sm">
                                  <div>
                                    <p className="font-bold">Match Folder: <span className="text-indigo-700">{rule.sourcePrefix || '*'}</span></p>
                                    <p className="text-[9px] opacity-60 uppercase font-sans mt-0.5">Replicate into <strong>{rule.destinationBucket}</strong></p>
                                  </div>
                                  <button onClick={() => handleDeleteReplicationRule(rule.id)} className="p-1.5 text-zinc-400 hover:text-rose-600">
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              ))
                            )}
                          </div>
                        </Card>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )
          ) : (
            // ==================== S3 GLACIER VAULTS RENDER MODULE ====================
            !selectedVault ? (
              <motion.div
                key="glacier-vault-list"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text opacity-30" size={14} />
                  <Input 
                    placeholder="Search Compliance Vaults..." 
                    className="pl-10 mr-1" 
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                </div>

                {filteredVaults.length === 0 ? (
                  <Card className="text-center py-20 bg-indigo-50/10 border-dashed border-indigo-205">
                    <Archive size={40} className="mx-auto text-indigo-900/10 mb-4" />
                    <p className="text-[10px] font-bold uppercase tracking-widest opacity-35">NO_GLACIER_VAULTS_PROVISIONED</p>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredVaults.map((vault) => (
                      <motion.div 
                        key={vault.id} 
                        whileHover={{ scale: 1.01 }}
                        onClick={() => { setSelectedVault(vault.id); setVaultTab('archives'); }}
                        className="cursor-pointer"
                      >
                        <Card className="relative hover:border-indigo-600 bg-white border-brand-text border flex flex-col justify-between h-full min-h-[140px]">
                          <div>
                            <div className="flex justify-between items-start gap-2 mb-2">
                              <span className="font-mono font-bold text-xs text-indigo-950 truncate max-w-[150px]">{vault.name}</span>
                              <div className="shrink-0 flex items-center gap-1.5 ">
                                {vault.lockStatus === 'LOCKED' ? (
                                  <span className="text-[7.5px] font-sans font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 px-1 py-0.5 rounded leading-none">WORM_LOCKED</span>
                                ) : (
                                  <span className="text-[7.5px] font-sans font-bold bg-amber-100 text-amber-800 border border-amber-300 px-1 py-0.5 rounded leading-none">UNLOCKED</span>
                                )}
                              </div>
                            </div>
                            <p className="text-[8px] font-mono opacity-50 select-all truncate mb-4 lowercase">{vault.arn}</p>
                          </div>

                          <div className="flex justify-between items-center pt-3 border-t border-brand-text/5 text-[9px] font-mono">
                            <div className="flex gap-4">
                              <span>Files: <strong className="text-indigo-900 font-bold">{vault.archiveCount}</strong></span>
                              <span>Size: <strong className="text-zinc-700">{(vault.sizeBytes / (1024 * 1024)).toFixed(1)}MB</strong></span>
                            </div>
                            <button 
                              onClick={(e) => handleDeleteVault(vault.id, vault.name, e)}
                              className="text-zinc-400 hover:text-rose-600"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            ) : (
              // INSIDE GLACIER VAULT WORKSPACE
              <motion.div
                key="glacier-selected-workspace"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col space-y-4"
              >
                {/* Vault Subtab Switcher */}
                <div className="flex border-b border-brand-text bg-white shrink-0 text-[10px] font-bold uppercase">
                  <button 
                    onClick={() => setSelectedVault(null)} 
                    className="px-4 py-3 border-r border-brand-text flex items-center gap-2 text-rose-800 hover:bg-brand-muted"
                  >
                    <ArrowLeft size={14} /> Back
                  </button>
                  <button 
                    onClick={() => setVaultTab('archives')}
                    className={`px-6 py-3 border-r border-brand-text flex items-center gap-1.5 transition-all ${vaultTab === 'archives' ? 'bg-indigo-950 text-indigo-50 font-bold' : 'hover:bg-brand-muted'}`}
                  >
                    <File size={14} /> Archived Logs ({(archivesByVault[selectedVault] || []).length})
                  </button>
                  <button 
                    onClick={() => setVaultTab('lock-policy')}
                    className={`px-6 py-3 border-r border-brand-text flex items-center gap-1.5 transition-all ${vaultTab === 'lock-policy' ? 'bg-indigo-950 text-indigo-50 font-bold' : 'hover:bg-brand-muted'}`}
                  >
                    <Lock size={14} /> WORM policy Lock ({vaults.find(v => v.id === selectedVault)?.lockStatus})
                  </button>
                  <button 
                    onClick={() => setVaultTab('retrievals')}
                    className={`px-6 py-3 border-r border-brand-text flex items-center gap-1.5 transition-all ${vaultTab === 'retrievals' ? 'bg-indigo-950 text-indigo-50 font-bold animate-pulse' : 'hover:bg-brand-muted'}`}
                  >
                    <Play size={14} /> Retrieval Jobs ({retrievalJobs.filter(j => j.vaultId === selectedVault).length})
                  </button>
                </div>

                <div className="pt-2">
                  <AnimatePresence mode="wait">
                    {vaultTab === 'archives' && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                        {(!archivesByVault[selectedVault] || archivesByVault[selectedVault].length === 0) ? (
                          <Card className="text-center py-20 bg-brand-muted/10 border-dashed">
                            <p className="text-[10px] font-bold opacity-30 tracking-widest uppercase">VAULT_EMPTY: NO_COLDSTORE_ENCRYPTED_ARCHIVES</p>
                          </Card>
                        ) : (
                          <div className="space-y-2">
                            {archivesByVault[selectedVault].map(archive => (
                              <Card key={archive.id} className="flex justify-between items-center bg-white/80 font-mono text-[11px] border border-neutral-200">
                                <div className="flex items-center gap-3">
                                  <Archive size={18} className="text-indigo-600 shrink-0" />
                                  <div>
                                    <p className="font-bold text-slate-800 break-all">{archive.name}</p>
                                    <p className="text-[8.5px] opacity-50 mt-1 uppercase">ID: {archive.id} | Size: {(archive.sizeBytes / (1024 * 1024)).toFixed(1)} MB | Uploaded: {format(new Date(archive.uploadedAt), 'yyyy-MM-dd HH:mm')}</p>
                                  </div>
                                </div>

                                <div className="flex gap-2 shrink-0">
                                  {retrievalJobs.some(j => j.archiveId === archive.id && j.status === 'COMPLETED') ? (
                                    <Button 
                                      variant="primary" 
                                      size="sm" 
                                      className="!py-1 font-mono text-[9px] bg-emerald-600 border border-emerald-400 font-bold hover:opacity-95"
                                      onClick={() => alert(`Beginning download stream for ${archive.name} decrypted payload!`)}
                                    >
                                      Decrypt & Download
                                    </Button>
                                  ) : retrievalJobs.some(j => j.archiveId === archive.id && j.status === 'IN_PROGRESS') ? (
                                    <span className="text-[8.5px] bg-indigo-100 text-indigo-800 font-bold px-2 py-1 border border-indigo-200 uppercase font-sans">Decrypting...</span>
                                  ) : (
                                    <Button 
                                      variant="secondary" 
                                      size="sm" 
                                      className="!py-1 font-mono text-[9px]"
                                      onClick={() => handleInitiateRetrieval(archive, 'Expedited')}
                                    >
                                      Retrieve File T1
                                    </Button>
                                  )}
                                </div>
                              </Card>
                            ))}
                          </div>
                        )}
                      </motion.div>
                    )}

                    {vaultTab === 'lock-policy' && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                        {(() => {
                          const currentVault = vaults.find(v => v.id === selectedVault);
                          if (!currentVault) return null;
                          return (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                              <div className="md:col-span-2">
                                <Card className="bg-neutral-900 border border-neutral-700 p-4">
                                  <div className="flex justify-between items-center pb-2 border-b border-neutral-800 mb-3 text-neutral-400">
                                    <span className="text-[9px] font-mono leading-none">WORM_COMPLIANCE_JSON_POLICY</span>
                                    <span className="text-[8px] font-bold bg-neutral-800 border border-neutral-700 px-1.5 py-0.5 rounded leading-none select-none">ReadOnly</span>
                                  </div>
                                  <pre className="text-emerald-400 font-mono text-[10px] lowercase overflow-x-auto whitespace-pre">
                                    {currentVault.policyJson}
                                  </pre>
                                </Card>
                              </div>

                              <div className="md:col-span-1 space-y-4">
                                <Card className="bg-white">
                                  <h4 className="font-bold text-xs pb-2 border-b border-brand-text/10 mb-3 tracking-wider">COMPLIANCE_LOG</h4>
                                  <div className="space-y-3 text-[10px] font-sans text-neutral-600 lowercase">
                                    <div className="flex justify-between font-mono">
                                      <span>Lock Status:</span>
                                      <span className={currentVault.lockStatus === 'LOCKED' ? 'text-emerald-600 font-bold font-sans' : 'text-amber-500 font-bold font-sans'}>
                                        {currentVault.lockStatus}
                                      </span>
                                    </div>
                                    <p className="mt-2 text-[9px] text-neutral-500 leading-relaxed font-sans">
                                      Active lock enforces strict WORM compliance. No AWS identities, including root user accounts, will be permitted to truncate or delete archives in this vault.
                                    </p>
                                  </div>

                                  {currentVault.lockStatus === 'UNLOCKED' && (
                                    <div className="pt-4">
                                      <Button 
                                        className="w-full bg-indigo-950 font-mono text-[10px]"
                                        onClick={() => handleLockVaultPolicy(currentVault.id)}
                                        icon={<Lock size={12} />}
                                      >
                                        Seal compliance Lock
                                      </Button>
                                    </div>
                                  )}
                                </Card>
                              </div>
                            </div>
                          );
                        })()}
                      </motion.div>
                    )}

                    {vaultTab === 'retrievals' && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                        <Card>
                          <div className="flex justify-between items-center pb-3 border-b border-brand-text/10 mb-4">
                            <h3 className="font-bold text-xs tracking-wider flex items-center gap-2">
                              <RefreshCw size={13} className="animate-spin text-indigo-600" />
                              ASYNC_DECRYPTION_DEQUE
                            </h3>
                            <span className="text-[8px] opacity-40 leading-none">GLACIER-DECRYPTION-DAEMON-ACTIVE</span>
                          </div>

                          <div className="space-y-3 font-mono text-[10px]">
                            {retrievalJobs.filter(j => j.vaultId === selectedVault).length === 0 ? (
                              <p className="text-center py-10 opacity-30 italic">No decryption jobs queued</p>
                            ) : (
                              retrievalJobs.filter(j => j.vaultId === selectedVault).map(job => (
                                <div key={job.id} className="border border-neutral-200 bg-brand-muted/10 p-3 rounded-sm">
                                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-2">
                                    <div>
                                      <span className="font-bold text-slate-800">{job.archiveName}</span>
                                      <span className="text-[8px] bg-neutral-100 border border-neutral-300 text-neutral-600 font-sans font-bold px-1.5 py-0.5 ml-2 uppercase leading-none">{job.tier} Retrieval</span>
                                    </div>
                                    <div className="shrink-0 flex items-center gap-2 text-[9px]">
                                      {job.status === 'IN_PROGRESS' ? (
                                        <span className="text-indigo-600 animate-pulse font-bold font-sans">DECRYPTING ({job.progress}%)</span>
                                      ) : (
                                        <span className="text-emerald-600 font-bold font-sans flex items-center gap-1">
                                          <VerifiedIcon size={12} /> READY
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  {/* Progress Bar visual indicator */}
                                  <div className="w-full h-1.5 bg-neutral-200 rounded-full overflow-hidden mb-2">
                                    <div 
                                      className={`h-full transition-all duration-1000 ${job.status === 'COMPLETED' ? 'bg-emerald-500' : 'bg-indigo-600'}`}
                                      style={{ width: `${job.progress}%` }}
                                    />
                                  </div>

                                  <div className="flex justify-between text-[8px] opacity-60 font-sans">
                                    <span>Job ID: {job.id}</span>
                                    <span>{job.status === 'IN_PROGRESS' ? `Estimated Complete: ${job.etaSeconds}s` : 'Status: READY_FOR_DEVEL'}</span>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </Card>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default S3View;
