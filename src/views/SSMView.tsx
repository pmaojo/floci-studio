import { useState, useEffect } from 'react';
import {
  DescribeParametersCommand,
  GetParameterCommand,
  PutParameterCommand,
  DeleteParameterCommand,
  ParameterType
} from '@aws-sdk/client-ssm';
import type { Parameter } from '@aws-sdk/client-ssm';
import { useAws } from '../contexts/AwsContext';
import { 
  KeyRound, 
  Search, 
  CirclePlus, 
  Trash2, 
  Eye, 
  EyeOff, 
  Lock, 
  Database,
  Calendar,
  Layers,
  FileText
} from 'lucide-react';
import { PageHeader, Card, Button, Input, Skeleton, Modal, Select } from '../components/ui-elements';
import { format } from 'date-fns';

const SSMView = () => {
  const { clients, logActivity } = useAws();
  const [parameters, setParameters] = useState<Parameter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  
  // Selected parameter & detail state
  const [selectedParamName, setSelectedParamName] = useState<string | null>(null);
  const [selectedParamValue, setSelectedParamValue] = useState<string | null>(null);
  const [decryptedValues, setDecryptedValues] = useState<Record<string, string>>({});
  const [revealedSecure, setRevealedSecure] = useState<Record<string, boolean>>({});
  const [loadingValue, setLoadingValue] = useState(false);

  // Creation / Edit modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [paramName, setParamName] = useState('');
  const [paramType, setParamType] = useState<ParameterType>('String');
  const [paramValue, setParamValue] = useState('');
  const [paramDescription, setParamDescription] = useState('');
  const [paramKeyId, setParamKeyId] = useState('');
  const [paramTier, setParamTier] = useState<'Standard' | 'Advanced'>('Standard');
  const [submitting, setSubmitting] = useState(false);

  const fetchParameters = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await clients.ssm.send(new DescribeParametersCommand({}));
      const paramsList = response.Parameters || [];
      setParameters(paramsList);
      
      // Auto select first parameter if none selected
      if (paramsList.length > 0 && !selectedParamName) {
        handleSelectParameter(paramsList[0].Name!);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch SSM Parameters';
      setError(message);
      logActivity('SSM', 'DescribeParameters failed', 'error', message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectParameter = async (name: string) => {
    setSelectedParamName(name);
    setLoadingValue(true);
    try {
      // Fetch parameter value (with decryption disabled by default for secure string visual preview)
      const res = await clients.ssm.send(new GetParameterCommand({
        Name: name,
        WithDecryption: false
      }));
      setSelectedParamValue(res.Parameter?.Value || '');
      
      // If secure string, store masked preview
      if (parameters.find(p => p.Name === name)?.Type === 'SecureString') {
        if (!decryptedValues[name]) {
          // pre-decrypt in background to cache but hold visibility
          const decRes = await clients.ssm.send(new GetParameterCommand({
            Name: name,
            WithDecryption: true
          }));
          setDecryptedValues(prev => ({ ...prev, [name]: decRes.Parameter?.Value || '' }));
        }
      }
    } catch (err) {
      logActivity('SSM', `GetParameter failed for ${name}`, 'error', err instanceof Error ? err.message : String(err));
    } finally {
      setLoadingValue(false);
    }
  };

  const handleToggleReveal = async (name: string) => {
    const isCurrentlyRevealed = revealedSecure[name];
    if (!isCurrentlyRevealed && !decryptedValues[name]) {
      try {
        const decRes = await clients.ssm.send(new GetParameterCommand({
          Name: name,
          WithDecryption: true
        }));
        setDecryptedValues(prev => ({ ...prev, [name]: decRes.Parameter?.Value || '' }));
      } catch (err) {
        alert(`Decryption failed: ${err instanceof Error ? err.message : String(err)}`);
        return;
      }
    }
    setRevealedSecure(prev => ({ ...prev, [name]: !prev[name] }));
  };

  const handleCreateOrEdit = async () => {
    if (!paramName || !paramValue) return;
    setSubmitting(true);
    try {
      await clients.ssm.send(new PutParameterCommand({
        Name: paramName,
        Type: paramType,
        Value: paramValue,
        Description: paramDescription || undefined,
        KeyId: paramType === 'SecureString' && paramKeyId ? paramKeyId : undefined,
        Tier: paramTier,
        Overwrite: modalMode === 'edit'
      }));

      logActivity('SSM', `${modalMode === 'create' ? 'PutParameter' : 'OverwriteParameter'}: ${paramName}`, 'success');
      
      // Reset & reload
      setIsModalOpen(false);
      fetchParameters();
      if (modalMode === 'edit') {
        // Clear decrypted cache for this name
        setDecryptedValues(prev => {
          const next = { ...prev };
          delete next[paramName];
          return next;
        });
        handleSelectParameter(paramName);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logActivity('SSM', `PutParameter failed for ${paramName}`, 'error', message);
      alert(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (name: string) => {
    if (!confirm(`Delete parameter "${name}"? This action cannot be undone.`)) return;
    try {
      await clients.ssm.send(new DeleteParameterCommand({ Name: name }));
      logActivity('SSM', `DeleteParameter: ${name}`, 'success');

      // Reset selected parameter
      if (selectedParamName === name) {
        setSelectedParamName(null);
        setSelectedParamValue(null);
      }

      fetchParameters();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logActivity('SSM', `DeleteParameter failed for ${name}`, 'error', message);
      alert(message);
    }
  };

  const openCreateModal = () => {
    setModalMode('create');
    setParamName('');
    setParamType('String');
    setParamValue('');
    setParamDescription('');
    setParamKeyId('');
    setParamTier('Standard');
    setIsModalOpen(true);
  };

  const openEditModal = (param: Parameter) => {
    setModalMode('edit');
    setParamName(param.Name || '');
    setParamType(param.Type || 'String');
    
    // Check decrypted cache or live value
    const val = decryptedValues[param.Name!] || selectedParamValue || '';
    setParamValue(val);
    setParamDescription(param.Description || '');
    setParamKeyId(param.KeyId || '');
    setParamTier(param.Tier || 'Standard');
    setIsModalOpen(true);
  };

  useEffect(() => {
    fetchParameters();
  }, []);

  const filteredParams = parameters.filter(p => p.Name?.toLowerCase().includes(search.toLowerCase()));
  const activeParamDetail = parameters.find(p => p.Name === selectedParamName);

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'SecureString':
        return 'border-amber-600 bg-amber-50 text-amber-800';
      case 'StringList':
        return 'border-emerald-600 bg-emerald-50 text-emerald-800';
      default:
        return 'border-sky-600 bg-sky-50 text-sky-800';
    }
  };

  return (
    <div className="flex flex-col h-full uppercase font-sans">
      <PageHeader 
        title="Systems Manager Parameter Store" 
        icon={<KeyRound size={18} />}
        onRefresh={fetchParameters}
        isRefreshing={loading}
        actions={
          <Button onClick={openCreateModal} icon={<CirclePlus size={14} />}>
            Create Parameter
          </Button>
        }
      />

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={modalMode === 'create' ? 'Create SSM Parameter' : 'Edit SSM Parameter'}
      >
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60">Parameter Name</label>
            <Input 
              value={paramName}
              onChange={e => setParamName(e.target.value)}
              placeholder="/prod/service/api-key"
              disabled={modalMode === 'edit'}
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase opacity-60">Parameter Type</label>
              <Select 
                value={paramType} 
                onChange={e => setParamType(e.target.value as ParameterType)}
                disabled={modalMode === 'edit'}
              >
                <option value="String">String</option>
                <option value="StringList">StringList (Comma-separated)</option>
                <option value="SecureString">SecureString (KMS encrypted)</option>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase opacity-60">Parameter Tier</label>
              <Select 
                value={paramTier} 
                onChange={e => setParamTier(e.target.value as 'Standard' | 'Advanced')}
              >
                <option value="Standard">Standard</option>
                <option value="Advanced">Advanced</option>
              </Select>
            </div>
          </div>

          {paramType === 'SecureString' && (
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase opacity-60">KMS Key ID (Optional)</label>
              <Input 
                value={paramKeyId}
                onChange={e => setParamKeyId(e.target.value)}
                placeholder="alias/aws/ssm"
                disabled={modalMode === 'edit'}
              />
            </div>
          )}

          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60">Parameter Value</label>
            <textarea 
              className="w-full bg-white border border-brand-text px-3 py-2 text-xs focus:outline-hidden focus:ring-1 focus:ring-brand-text transition-all placeholder:italic font-mono min-h-[100px]"
              value={paramValue}
              onChange={e => setParamValue(e.target.value)}
              placeholder={paramType === 'StringList' ? 'value1,value2,value3' : 'secret-value-token'}
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60">Description</label>
            <Input 
              value={paramDescription}
              onChange={e => setParamDescription(e.target.value)}
              placeholder="Store secure access credentials for external integrations"
            />
          </div>

          <div className="pt-4 flex gap-3">
             <Button variant="ghost" className="flex-1" onClick={() => setIsModalOpen(false)}>Cancel</Button>
             <Button className="flex-1" onClick={handleCreateOrEdit} disabled={!paramName || !paramValue || submitting}>
               {submitting ? 'Saving...' : 'Save Parameter'}
             </Button>
          </div>
        </div>
      </Modal>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Side: Parameters List */}
        <aside className="w-80 border-r border-brand-text flex flex-col bg-brand-muted shrink-0">
          <div className="p-4 border-b border-brand-text space-y-3 bg-brand-muted/50">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-brand-text opacity-30" size={13} />
              <Input 
                placeholder="Search parameters..." 
                className="pl-8 text-[11px] font-mono"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {loading ? (
              [1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)
            ) : error ? (
              <div className="text-[10px] text-center text-rose-600 p-6 italic">{error}</div>
            ) : filteredParams.length === 0 ? (
              <div className="text-[10px] text-center text-brand-text opacity-40 p-6 italic">No parameters found</div>
            ) : (
              filteredParams.map(p => (
                <button
                  key={p.Name}
                  onClick={() => handleSelectParameter(p.Name!)}
                  className={`w-full text-left px-3 py-2.5 text-[11px] font-mono border transition-all ${
                    selectedParamName === p.Name 
                      ? 'bg-brand-text text-brand-bg border-brand-text font-bold shadow-xs' 
                      : 'border-transparent hover:bg-white/60 hover:border-brand-text/30 bg-white/20'
                  }`}
                >
                  <div className="flex flex-col gap-1">
                    <span className="truncate block font-bold">{p.Name}</span>
                    <div className="flex justify-between items-center mt-1 text-[8px]">
                      <span className={`px-1 py-0.5 border text-[7px] font-bold rounded-sm uppercase tracking-wide ${getTypeBadgeColor(p.Type)}`}>
                        {p.Type}
                      </span>
                      <span className={selectedParamName === p.Name ? 'text-brand-bg opacity-75' : 'text-brand-text opacity-40'}>
                        v{p.Version || 1}
                      </span>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </aside>

        {/* Right Side: Parameters Details & Value Viewer */}
        <main className="flex-1 flex flex-col bg-brand-bg overflow-hidden relative">
          {!selectedParamName ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-brand-bg/50">
              <div className="w-16 h-16 border border-brand-text/20 flex items-center justify-center text-brand-text/30 mb-4 bg-brand-muted/30">
                <KeyRound size={30} />
              </div>
              <h3 className="font-serif-italic text-lg text-brand-text mb-2">No Parameter Selected</h3>
              <p className="text-[10px] text-brand-text opacity-50 uppercase max-w-sm tracking-wider">
                Select an active Systems Manager Parameter from the catalog to inspect descriptions, values, metadata, and KMS statuses.
              </p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden p-6 space-y-6">
              
              {/* Header block with badges */}
              <div className="border border-brand-text p-4 bg-white/50 backdrop-blur-xs flex justify-between items-start">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 border text-[8px] font-bold rounded-sm uppercase tracking-wider ${getTypeBadgeColor(activeParamDetail?.Type)}`}>
                      {activeParamDetail?.Type}
                    </span>
                    <span className="px-2 py-0.5 border border-brand-text/30 text-[8px] font-bold text-brand-text/50 bg-white uppercase">
                      {activeParamDetail?.Tier || 'Standard'} TIER
                    </span>
                  </div>
                  <h3 className="text-sm font-bold font-mono text-brand-text tracking-tight select-all">{selectedParamName}</h3>
                  <p className="text-[10px] text-brand-text opacity-60 font-mono normal-case">{activeParamDetail?.Description || 'No description provided.'}</p>
                </div>

                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={() => openEditModal(activeParamDetail)}>
                    Edit Value
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => handleDelete(selectedParamName)} icon={<Trash2 size={12} />}>
                    Delete
                  </Button>
                </div>
              </div>

              {/* Value Visual Block */}
              <Card className="flex-1 flex flex-col p-0 overflow-hidden bg-brand-console border-brand-text">
                <div className="px-4 py-2 border-b border-brand-text/20 bg-brand-muted flex justify-between items-center text-[10px] font-bold tracking-widest text-brand-text shrink-0">
                  <span className="flex items-center gap-1.5 font-mono">
                    <Database size={12} /> PARAMETER_VALUE
                  </span>

                  {activeParamDetail?.Type === 'SecureString' && (
                    <button 
                      onClick={() => handleToggleReveal(selectedParamName)}
                      className="flex items-center gap-1.5 hover:text-brand-text/80 transition-colors uppercase text-[9px] font-black"
                    >
                      {revealedSecure[selectedParamName] ? (
                        <>
                          <EyeOff size={12} /> Hide Value
                        </>
                      ) : (
                        <>
                          <Eye size={12} /> Decrypt Secure Value
                        </>
                      )}
                    </button>
                  )}
                </div>

                <div className="flex-1 p-4 font-mono text-xs overflow-auto flex items-center justify-center relative">
                  {loadingValue ? (
                    <Skeleton className="w-3/4 h-8" />
                  ) : activeParamDetail?.Type === 'SecureString' && !revealedSecure[selectedParamName] ? (
                    <div className="text-center space-y-3 p-8 border border-dashed border-brand-text/20 bg-white/5 max-w-sm rounded-sm">
                      <div className="mx-auto w-10 h-10 border border-amber-600/30 flex items-center justify-center text-amber-700 bg-amber-500/5 mb-2 rounded-full">
                        <Lock size={18} />
                      </div>
                      <span className="text-[10px] font-extrabold text-amber-700 block tracking-widest uppercase">ENCRYPTED_SECURE_STRING</span>
                      <p className="text-[9px] text-brand-text opacity-40 lowercase">The parameter is KMS-encrypted. Click Decrypt above to decrypt and show the actual credential payload.</p>
                      <pre className="font-mono text-[9px] bg-white/10 px-3 py-1.5 text-brand-text/50 truncate block rounded-sm mt-2">{selectedParamValue}</pre>
                    </div>
                  ) : (
                    <div className="w-full h-full flex flex-col">
                      <pre className="flex-1 bg-white/20 p-4 border border-brand-text/20 overflow-auto whitespace-pre-wrap select-all font-mono font-medium rounded-sm text-brand-text">
                        {activeParamDetail?.Type === 'SecureString' 
                          ? decryptedValues[selectedParamName] || 'DECRYPTION_EMPTY'
                          : selectedParamValue || 'VALUE_EMPTY'}
                      </pre>
                    </div>
                  )}
                </div>
              </Card>

              {/* Metadata Details Card */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="flex items-center gap-3 bg-white/40">
                  <div className="p-2 border border-brand-text bg-brand-muted shrink-0 text-brand-text opacity-60">
                    <Calendar size={15} />
                  </div>
                  <div>
                    <span className="text-[8px] font-bold opacity-40 block uppercase">LAST_MODIFIED</span>
                    <span className="text-[10px] font-mono font-bold">
                      {activeParamDetail?.LastModifiedDate ? format(new Date(activeParamDetail.LastModifiedDate), 'yyyy-MM-dd HH:mm') : 'UNKNOWN'}
                    </span>
                  </div>
                </Card>

                <Card className="flex items-center gap-3 bg-white/40">
                  <div className="p-2 border border-brand-text bg-brand-muted shrink-0 text-brand-text opacity-60">
                    <Layers size={15} />
                  </div>
                  <div>
                    <span className="text-[8px] font-bold opacity-40 block uppercase">REVISION_VERSION</span>
                    <span className="text-[10px] font-mono font-bold">
                      Version {activeParamDetail?.Version || 1}
                    </span>
                  </div>
                </Card>

                <Card className="flex items-center gap-3 bg-white/40">
                  <div className="p-2 border border-brand-text bg-brand-muted shrink-0 text-brand-text opacity-60">
                    <FileText size={15} />
                  </div>
                  <div>
                    <span className="text-[8px] font-bold opacity-40 block uppercase">KMS_KEY_ARN</span>
                    <span className="text-[10px] font-mono font-bold truncate block max-w-[150px]" title={activeParamDetail?.KeyId || 'Default AWS-SSM Key'}>
                      {activeParamDetail?.KeyId ? activeParamDetail.KeyId.split('/').pop() : 'Default KMS (ssm)'}
                    </span>
                  </div>
                </Card>
              </div>

            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default SSMView;
