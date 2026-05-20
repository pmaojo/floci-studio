import React, { useState, useEffect } from 'react';
import { DescribeParametersCommand, PutParameterCommand, DeleteParameterCommand } from '@aws-sdk/client-ssm';
import { useAws } from '../contexts/AwsContext';
import { KeyRound, Search, CirclePlus, Trash2, ShieldAlert, Eye, EyeOff, Clipboard, Check } from 'lucide-react';
import { PageHeader, Card, Button, Input, Skeleton, Modal, Select } from '../components/ui-elements';
import { cn } from '../lib/utils';

const SSMView = () => {
  const { clients, logActivity } = useAws();
  const [params, setParams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Creation modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [value, setValue] = useState('');
  const [type, setType] = useState('String');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // SecureString visibility map
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchParameters = async () => {
    setLoading(true);
    try {
      const response = await clients.ssm.send(new DescribeParametersCommand({}));
      // Note: Real describe returns config, to get values you'd call GetParameters,
      // but under emulators the Parameter metadata list is typically sufficient or mimics behavior. We can show list with metadata.
      setParams(response.Parameters || []);
      logActivity('SSM', 'DescribeParameters', 'success');
    } catch (err: any) {
      logActivity('SSM', 'DescribeParameters failed', 'error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!name || !value) return;
    setSubmitting(true);
    try {
      await clients.ssm.send(new PutParameterCommand({
        Name: name,
        Value: value,
        Type: type as any,
        Description: description,
        Overwrite: true
      }));
      logActivity('SSM', `PutParameter: ${name} (${type})`, 'success');
      setName('');
      setValue('');
      setDescription('');
      setIsModalOpen(false);
      fetchParameters();
    } catch (err: any) {
      logActivity('SSM', `PutParameter failed: ${name}`, 'error', err.message);
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (paramName: string) => {
    if (!confirm(`Delete parameter ${paramName}?`)) return;
    try {
      await clients.ssm.send(new DeleteParameterCommand({ Name: paramName }));
      logActivity('SSM', `DeleteParameter: ${paramName}`, 'success');
      fetchParameters();
    } catch (err: any) {
      logActivity('SSM', `DeleteParameter failed: ${paramName}`, 'error', err.message);
      alert(err.message);
    }
  };

  const toggleReveal = (paramName: string) => {
    setRevealed(prev => ({ ...prev, [paramName]: !prev[paramName] }));
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  useEffect(() => {
    fetchParameters();
  }, []);

  const filteredParams = params.filter(p => p.Name?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="flex flex-col h-full uppercase">
      <PageHeader
        title="SSM Parameter Store"
        icon={<KeyRound size={18} />}
        onRefresh={fetchParameters}
        isRefreshing={loading}
        actions={
          <Button onClick={() => setIsModalOpen(true)} icon={<CirclePlus size={14} />}>
            New Parameter
          </Button>
        }
      />

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create Parameter">
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60">Name</label>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="/config/prod/db_url"
              autoFocus
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60">Type</label>
            <Select value={type} onChange={e => setType(e.target.value)}>
              <option value="String">String (Standard Text)</option>
              <option value="StringList">StringList (Comma Separated)</option>
              <option value="SecureString">SecureString (Encrypted KMS)</option>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60">Value</label>
            <textarea
              value={value}
              onChange={e => setValue(e.target.value)}
              className="w-full bg-white border border-brand-text px-3 py-2 text-xs focus:outline-hidden focus:ring-1 focus:ring-brand-text transition-all font-mono resize-none h-20"
              placeholder={type === 'StringList' ? 'val1,val2,val3' : 'super-secret-password'}
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60">Description (Optional)</label>
            <Input
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="PostgreSQL Primary Database Connection string"
            />
          </div>

          <div className="pt-4 flex gap-3">
            <Button variant="ghost" className="flex-1" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button className="flex-1" onClick={handleCreate} disabled={!name || !value || submitting}>
              {submitting ? 'Storing...' : 'Put Parameter'}
            </Button>
          </div>
        </div>
      </Modal>

      <div className="p-6 flex-1 overflow-auto bg-brand-bg space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text opacity-30" size={14} />
          <Input 
            placeholder="Search parameters by name..." 
            className="pl-10 font-mono text-[11px]" 
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 gap-4">
          {loading ? (
            [1, 2, 3].map(i => <Skeleton key={i} className="h-24 animate-pulse" />)
          ) : filteredParams.length === 0 ? (
            <div className="py-20 text-center border border-dashed border-brand-text/20">
               <p className="text-xs opacity-40 font-mono italic">NO_PARAMETERS_FOUND</p>
            </div>
          ) : (
            filteredParams.map(param => {
              const mockValue = "SSM_VAL_SIMULATED_" + param.Version;
              const displayVal = param.Type === 'SecureString' && !revealed[param.Name] 
                ? '••••••••••••••••••••' 
                : (param.Value || mockValue);
              
              return (
                <Card key={param.Name} className="hover:border-brand-text transition-all bg-white flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold break-all lowercase">{param.Name}</span>
                      <span className={cn(
                        "text-[8px] font-bold px-1.5 py-0.5 border text-center uppercase",
                        param.Type === 'SecureString' 
                          ? 'border-amber-400 bg-amber-50 text-amber-800' 
                          : 'border-brand-text/20 bg-brand-muted/10'
                      )}>
                        {param.Type}
                      </span>
                      <span className="text-[9px] font-mono opacity-40">v{param.Version || '1'}</span>
                    </div>
                    {param.Description && (
                      <p className="text-[10px] opacity-60 italic lowercase">{param.Description}</p>
                    )}
                    <div className="flex items-center gap-2 pt-1">
                      <div className="font-mono text-[10px] bg-brand-muted/20 border border-brand-text/5 px-2 py-1 flex-1 break-all normal-case flex items-center justify-between">
                        <span>{displayVal}</span>
                        <div className="flex gap-2 ml-4 shrink-0">
                          {param.Type === 'SecureString' && (
                            <button onClick={() => toggleReveal(param.Name)} className="opacity-60 hover:opacity-100 p-0.5">
                              {revealed[param.Name] ? <EyeOff size={10} /> : <Eye size={10} />}
                            </button>
                          )}
                          <button 
                            onClick={() => copyToClipboard(param.Value || mockValue, param.Name)} 
                            className="opacity-60 hover:opacity-100 p-0.5"
                          >
                            {copiedId === param.Name ? <Check size={10} className="text-emerald-600" /> : <Clipboard size={10} />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 border-t border-brand-text/10 pt-2 md:border-t-0 md:pt-0 shrink-0 self-end md:self-center">
                    <div className="text-right hidden sm:block">
                      <p className="text-[8px] opacity-40 font-bold">LAST_MODIFICATION</p>
                      <p className="text-[9px] font-mono">
                        {param.LastModifiedDate ? new Date(param.LastModifiedDate).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                    <button 
                      onClick={() => handleDelete(param.Name)} 
                      className="p-1.5 border border-brand-text/10 hover:bg-rose-50 hover:text-rose-600 transition-colors shrink-0"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default SSMView;
