import React, { useState, useEffect } from 'react';
import { ListSecretsCommand, CreateSecretCommand, DeleteSecretCommand } from '@aws-sdk/client-secrets-manager';
import { useAws } from '../contexts/AwsContext';
import { Shield, Search, CirclePlus, Key, Eye } from 'lucide-react';
import { PageHeader, Card, Button, Input, Skeleton, Modal } from '../components/ui-elements';
import { format } from 'date-fns';

const SecretsManagerView = () => {
  const { clients, logActivity } = useAws();
  const [secrets, setSecrets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [isCreationModalOpen, setIsCreationModalOpen] = useState(false);
  const [newSecretName, setNewSecretName] = useState('');
  const [newSecretValue, setNewSecretValue] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const fetchSecrets = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await clients.secrets.send(new ListSecretsCommand({}));
      setSecrets(response.SecretList || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err) || 'Failed to fetch secrets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSecrets();
  }, []);

  const handleCreate = async () => {
    if (!newSecretName || !newSecretValue) return;
    setIsCreating(true);
    try {
      await clients.secrets.send(new CreateSecretCommand({
        Name: newSecretName,
        SecretString: newSecretValue,
        Description: 'Created via Floci UI'
      }));
      logActivity('SecretsManager', `CreateSecret: ${newSecretName}`, 'success');
      setNewSecretName('');
      setNewSecretValue('');
      setIsCreationModalOpen(false);
      fetchSecrets();
    } catch (err: unknown) {
      logActivity('SecretsManager', `CreateSecret failed: ${newSecretName}`, 'error', err instanceof Error ? err.message : String(err));
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Delete secret ${name}?`)) return;
    try {
      await clients.secrets.send(new DeleteSecretCommand({ SecretId: name, ForceDeleteWithoutRecovery: true }));
      logActivity('SecretsManager', `DeleteSecret: ${name}`, 'success');
      fetchSecrets();
    } catch (err: unknown) {
      logActivity('SecretsManager', `DeleteSecret failed: ${name}`, 'error', err instanceof Error ? err.message : String(err));
      alert(err instanceof Error ? err.message : String(err));
    }
  };

  const filteredSecrets = secrets.filter(s => s.Name?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="flex flex-col h-full">
      <PageHeader 
        title="Secrets Manager" 
        icon={<Shield size={18} />}
        onRefresh={fetchSecrets}
        isRefreshing={loading}
        actions={
          <Button onClick={() => setIsCreationModalOpen(true)} icon={<CirclePlus size={14} />}>
            New Secret
          </Button>
        }
      />

      <Modal 
        isOpen={isCreationModalOpen} 
        onClose={() => setIsCreationModalOpen(false)} 
        title="Create Secret"
      >
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60">Secret Name</label>
            <Input 
              value={newSecretName}
              onChange={e => setNewSecretName(e.target.value)}
              placeholder="prod/db/main"
              autoFocus
            />
          </div>
          
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60">Secret Value</label>
            <textarea 
              className="w-full bg-white border border-brand-text px-3 py-2 text-xs focus:outline-hidden focus:ring-1 focus:ring-brand-text transition-all placeholder:italic font-mono min-h-[100px]"
              value={newSecretValue}
              onChange={e => setNewSecretValue(e.target.value)}
              placeholder="p@ssword123"
            />
          </div>

          <div className="pt-4 flex gap-3">
             <Button 
               variant="ghost" 
               className="flex-1" 
               onClick={() => setIsCreationModalOpen(false)}
             >
               Cancel
             </Button>
             <Button 
               className="flex-1" 
               onClick={handleCreate} 
               disabled={!newSecretName || !newSecretValue || isCreating}
             >
               {isCreating ? 'Creating...' : 'Create Secret'}
             </Button>
          </div>
        </div>
      </Modal>
      <div className="p-6 space-y-6 flex-1 overflow-auto">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text opacity-30" size={14} />
          <Input 
            placeholder="Filter Secrets..." 
            className="pl-10" 
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 gap-4">
          {loading ? (
            [1, 2].map(i => <Skeleton key={i} className="h-20" />)
          ) : error ? (
            <Card className="text-rose-600 font-mono text-[10px] text-center py-10 border-rose-600 bg-rose-50">{error}</Card>
          ) : filteredSecrets.length === 0 ? (
            <Card className="text-brand-text opacity-30 text-center py-12 italic text-[10px] uppercase font-bold tracking-widest bg-brand-muted/30 border-dashed">No secrets found.</Card>
          ) : (
            filteredSecrets.map((secret) => (
              <Card key={secret.ARN} className="group hover:bg-brand-text hover:text-brand-bg transition-colors cursor-pointer">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 border border-brand-text flex items-center justify-center opacity-70 group-hover:border-brand-bg">
                      <Key size={18} />
                    </div>
                    <div>
                      <h4 className="font-bold text-[11px] font-mono">{secret.Name}</h4>
                      <p className="text-[10px] opacity-50 truncate max-w-md font-mono">{secret.ARN}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest">
                    <button className="hover:underline flex items-center gap-1.5 group-hover:text-brand-bg">
                       <Eye size={12} />
                       Reveal
                    </button>
                    <button 
                      onClick={(e) => handleDelete(secret.Name!, e)}
                      className="hover:text-rose-500 font-bold group-hover:text-rose-400"
                    >
                      DROP
                    </button>
                  </div>
                </div>
                <div className="mt-2 pt-2 border-t border-brand-text/10 group-hover:border-brand-bg/20 flex justify-between text-[8px] font-mono opacity-40">
                  <span>LAST_ROTATED: {secret.LastRotatedDate ? format(new Date(secret.LastRotatedDate), 'yyyy-MM-dd') : 'NEVER'}</span>
                  <span>CREATED: {format(new Date(secret.CreatedDate), 'yyyy-MM-dd')}</span>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default SecretsManagerView;
