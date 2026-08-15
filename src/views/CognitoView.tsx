import React, { useState, useEffect, useCallback } from 'react';
import { ListUserPoolsCommand, CreateUserPoolCommand, DeleteUserPoolCommand } from '@aws-sdk/client-cognito-identity-provider';
import type { UserPoolDescriptionType } from '@aws-sdk/client-cognito-identity-provider';
import { useAws } from '../contexts/AwsContext';
import { Users2, Search, CirclePlus } from 'lucide-react';
import { PageHeader, Card, Button, Input, Skeleton, Modal } from '../components/ui-elements';
import { format } from 'date-fns';

const CognitoView = () => {
  const { clients, logActivity } = useAws();
  const [pools, setPools] = useState<UserPoolDescriptionType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [isCreationModalOpen, setIsCreationModalOpen] = useState(false);
  const [newPoolName, setNewPoolName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const fetchPools = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await clients.cognito.send(new ListUserPoolsCommand({ MaxResults: 60 }));
      setPools(response.UserPools || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err) || 'Failed to fetch user pools');
    } finally {
      setLoading(false);
    }
  }, [clients.cognito]);

  useEffect(() => {
    fetchPools();
  }, [fetchPools]);

  const handleCreate = async () => {
    if (!newPoolName) return;
    setIsCreating(true);
    try {
      await clients.cognito.send(new CreateUserPoolCommand({ PoolName: newPoolName }));
      logActivity('Cognito', `CreateUserPool: ${newPoolName}`, 'success');
      setNewPoolName('');
      setIsCreationModalOpen(false);
      fetchPools();
    } catch (err: unknown) {
      logActivity('Cognito', `CreateUserPool failed: ${newPoolName}`, 'error', err instanceof Error ? err.message : String(err));
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Delete user pool ${name}?`)) return;
    try {
      await clients.cognito.send(new DeleteUserPoolCommand({ UserPoolId: id }));
      logActivity('Cognito', `DeleteUserPool: ${name}`, 'success');
      fetchPools();
    } catch (err: unknown) {
      logActivity('Cognito', `DeleteUserPool failed: ${name}`, 'error', err instanceof Error ? err.message : String(err));
      alert(err instanceof Error ? err.message : String(err));
    }
  };

  const filteredPools = pools.filter(p => p.Name?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Cognito User Pools"
        icon={<Users2 size={18} />}
        onRefresh={fetchPools}
        isRefreshing={loading}
        actions={
          <Button onClick={() => setIsCreationModalOpen(true)} icon={<CirclePlus size={14} />}>
            New Pool
          </Button>
        }
      />

      <Modal
        isOpen={isCreationModalOpen}
        onClose={() => setIsCreationModalOpen(false)}
        title="Create User Pool"
      >
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60">Pool Name</label>
            <Input
              value={newPoolName}
              onChange={e => setNewPoolName(e.target.value)}
              placeholder="my-app-users"
              autoFocus
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
               disabled={!newPoolName || isCreating}
             >
               {isCreating ? 'Creating...' : 'Create Pool'}
             </Button>
          </div>
        </div>
      </Modal>

      <div className="p-6 space-y-6 flex-1 overflow-auto">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text opacity-30" size={14} />
          <Input
            placeholder="Filter User Pools..."
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
          ) : filteredPools.length === 0 ? (
            <Card className="text-brand-text opacity-30 text-center py-12 italic text-[10px] uppercase font-bold tracking-widest bg-brand-muted/30 border-dashed">No user pools found.</Card>
          ) : (
            filteredPools.map((pool) => (
              <Card key={pool.Id} className="group hover:bg-brand-text hover:text-brand-bg transition-colors cursor-pointer">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 border border-brand-text flex items-center justify-center opacity-70 group-hover:border-brand-bg">
                      <Users2 size={18} />
                    </div>
                    <div>
                      <h4 className="font-bold text-[11px] font-mono">{pool.Name}</h4>
                      <p className="text-[10px] opacity-50 truncate max-w-md font-mono">{pool.Id}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest">
                    <button
                      onClick={(e) => handleDelete(pool.Id!, pool.Name || 'Unknown', e)}
                      className="hover:text-rose-500 font-bold group-hover:text-rose-400"
                    >
                      DROP
                    </button>
                  </div>
                </div>
                <div className="mt-2 pt-2 border-t border-brand-text/10 group-hover:border-brand-bg/20 flex justify-between text-[8px] font-mono opacity-40">
                  <span>LAST_MODIFIED: {pool.LastModifiedDate ? format(new Date(pool.LastModifiedDate), 'yyyy-MM-dd HH:mm') : 'UNKNOWN'}</span>
                  <span>CREATED: {pool.CreationDate ? format(new Date(pool.CreationDate), 'yyyy-MM-dd HH:mm') : 'UNKNOWN'}</span>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default CognitoView;
