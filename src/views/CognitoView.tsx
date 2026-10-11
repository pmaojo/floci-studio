import { useState, useEffect, useCallback } from 'react';
import {
  ListUserPoolsCommand,
  ListUsersCommand,
  CreateUserPoolCommand,
  AdminCreateUserCommand,
  DeleteUserPoolCommand,
  AdminDeleteUserCommand
} from '@aws-sdk/client-cognito-identity-provider';
import type { UserPoolDescriptionType, UserType } from '@aws-sdk/client-cognito-identity-provider';
import { useAws } from '../contexts/AwsContext';
import { Users, Trash2, Search, Plus, ShieldAlert, CirclePlus, UserIcon } from 'lucide-react';
import { PageHeader, Card, Button, Input, Skeleton, Modal } from '../components/ui-elements';

const CognitoView = () => {
  const { clients, logActivity } = useAws();

  const [pools, setPools] = useState<UserPoolDescriptionType[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [selectedPoolId, setSelectedPoolId] = useState<string | null>(null);
  const [users, setUsers] = useState<UserType[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userSearch, setUserSearch] = useState('');

  const [isCreatePoolModalOpen, setIsCreatePoolModalOpen] = useState(false);
  const [newPoolName, setNewPoolName] = useState('');
  const [submittingPool, setSubmittingPool] = useState(false);

  const [isCreateUserModalOpen, setIsCreateUserModalOpen] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [submittingUser, setSubmittingUser] = useState(false);

  const fetchPools = useCallback(async () => {
    setLoading(true);
    try {
      const { UserPools } = await clients.cognito.send(new ListUserPoolsCommand({ MaxResults: 50 }));
      setPools(UserPools || []);
      logActivity('Cognito', 'ListUserPools', 'success');
    } catch (err: unknown) {
      logActivity('Cognito', 'ListUserPools failed', 'error', err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [clients.cognito, logActivity]);

  useEffect(() => {
    fetchPools();
  }, [fetchPools]);

  const fetchUsers = useCallback(async (poolId: string) => {
    setLoadingUsers(true);
    try {
      const { Users: poolUsers } = await clients.cognito.send(new ListUsersCommand({ UserPoolId: poolId }));
      setUsers(poolUsers || []);
      logActivity('Cognito', `ListUsers for ${poolId}`, 'success');
    } catch (err: unknown) {
      logActivity('Cognito', `ListUsers failed for ${poolId}`, 'error', err instanceof Error ? err.message : String(err));
      setUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  }, [clients.cognito, logActivity]);

  useEffect(() => {
    if (selectedPoolId) {
      fetchUsers(selectedPoolId);
    } else {
      setUsers([]);
    }
  }, [selectedPoolId, fetchUsers]);

  const handleCreatePool = async () => {
    if (!newPoolName) return;
    setSubmittingPool(true);
    try {
      await clients.cognito.send(new CreateUserPoolCommand({ PoolName: newPoolName }));
      logActivity('Cognito', `CreateUserPool: ${newPoolName}`, 'success');
      setIsCreatePoolModalOpen(false);
      setNewPoolName('');
      fetchPools();
    } catch (err: unknown) {
      logActivity('Cognito', `CreateUserPool failed: ${newPoolName}`, 'error', err instanceof Error ? err.message : String(err));
    } finally {
      setSubmittingPool(false);
    }
  };

  const handleDeletePool = async (poolId: string, poolName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Delete User Pool ${poolName}?`)) return;
    try {
      await clients.cognito.send(new DeleteUserPoolCommand({ UserPoolId: poolId }));
      logActivity('Cognito', `DeleteUserPool: ${poolName}`, 'success');
      if (selectedPoolId === poolId) setSelectedPoolId(null);
      fetchPools();
    } catch (err: unknown) {
      logActivity('Cognito', `DeleteUserPool failed: ${poolName}`, 'error', err instanceof Error ? err.message : String(err));
    }
  };

  const handleCreateUser = async () => {
    if (!newUsername || !selectedPoolId) return;
    setSubmittingUser(true);
    try {
      await clients.cognito.send(new AdminCreateUserCommand({
        UserPoolId: selectedPoolId,
        Username: newUsername,
        UserAttributes: newEmail ? [{ Name: 'email', Value: newEmail }] : undefined,
        MessageAction: 'SUPPRESS'
      }));
      logActivity('Cognito', `AdminCreateUser: ${newUsername}`, 'success');
      setIsCreateUserModalOpen(false);
      setNewUsername('');
      setNewEmail('');
      fetchUsers(selectedPoolId);
    } catch (err: unknown) {
      logActivity('Cognito', `AdminCreateUser failed: ${newUsername}`, 'error', err instanceof Error ? err.message : String(err));
    } finally {
      setSubmittingUser(false);
    }
  };

  const handleDeleteUser = async (username: string) => {
    if (!selectedPoolId || !confirm(`Delete user ${username}?`)) return;
    try {
      await clients.cognito.send(new AdminDeleteUserCommand({ UserPoolId: selectedPoolId, Username: username }));
      logActivity('Cognito', `AdminDeleteUser: ${username}`, 'success');
      fetchUsers(selectedPoolId);
    } catch (err: unknown) {
      logActivity('Cognito', `AdminDeleteUser failed: ${username}`, 'error', err instanceof Error ? err.message : String(err));
    }
  };

  const filteredPools = pools.filter(p => p.Name?.toLowerCase().includes(search.toLowerCase()) || p.Id?.toLowerCase().includes(search.toLowerCase()));
  const filteredUsers = users.filter(u => u.Username?.toLowerCase().includes(userSearch.toLowerCase()));
  const selectedPool = pools.find(p => p.Id === selectedPoolId);

  const fmtDate = (d?: Date) => d ? new Date(d).toLocaleString() : '—';

  // ── Detail view (Pool Users) ───────────────────────────────────────────────
  if (selectedPoolId && selectedPool) {
    return (
      <div className="flex flex-col h-full uppercase">
        <PageHeader
          title={`Pool: ${selectedPool.Name}`}
          icon={<Users size={18} />}
          onRefresh={() => fetchUsers(selectedPoolId)}
          isRefreshing={loadingUsers}
          actions={
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setSelectedPoolId(null)}>
                Back to Pools
              </Button>
              <Button onClick={() => setIsCreateUserModalOpen(true)} icon={<CirclePlus size={14} />}>
                Create User
              </Button>
            </div>
          }
        />

        <Modal isOpen={isCreateUserModalOpen} onClose={() => setIsCreateUserModalOpen(false)} title="Create User">
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase opacity-60">Username *</label>
              <Input
                value={newUsername}
                onChange={e => setNewUsername(e.target.value)}
                placeholder="johndoe"
                autoFocus
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase opacity-60">Email (Optional)</label>
              <Input
                value={newEmail}
                onChange={e => setNewEmail(e.target.value)}
                placeholder="john@example.com"
                type="email"
              />
            </div>
            <div className="pt-4 flex gap-3">
              <Button variant="ghost" className="flex-1" onClick={() => setIsCreateUserModalOpen(false)}>Cancel</Button>
              <Button className="flex-1" onClick={handleCreateUser} disabled={!newUsername || submittingUser}>
                {submittingUser ? 'Creating...' : 'Create User'}
              </Button>
            </div>
          </div>
        </Modal>

        <div className="p-6 flex-1 overflow-auto bg-brand-bg space-y-6">
          <div className="border border-brand-text p-4 bg-white/50 flex justify-between items-start">
            <div className="space-y-2">
              <span className="px-2 py-0.5 border border-brand-text/30 bg-white text-[8px] font-bold uppercase tracking-wider text-brand-text/60">
                USER_POOL
              </span>
              <h3 className="text-sm font-bold font-mono text-brand-text tracking-tight">{selectedPool.Name}</h3>
              <p className="text-[10px] font-mono opacity-50 lowercase normal-case">{selectedPool.Id}</p>
            </div>
            <div className="text-[9px] font-mono opacity-40 text-right space-y-1">
              <p>Created: {fmtDate(selectedPool.CreationDate)}</p>
              <p>Status: {selectedPool.Status || 'ACTIVE'}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold tracking-widest flex items-center gap-2">
                <UserIcon size={14} className="opacity-50" /> Pool Users
              </h3>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text opacity-30" size={12} />
                <Input
                  placeholder="Search users..."
                  className="pl-9 h-8 text-[10px] font-mono"
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                />
              </div>
            </div>

            <Card className="bg-white/40 p-0 overflow-hidden">
              {loadingUsers ? (
                <div className="p-4 space-y-2">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-10" />)}
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="p-12 text-center">
                  <ShieldAlert size={24} className="mx-auto mb-3 opacity-20" />
                  <p className="text-xs opacity-40 font-mono italic">NO_USERS_FOUND</p>
                </div>
              ) : (
                <div className="divide-y divide-brand-text/10">
                  <div className="grid grid-cols-[1fr_1fr_6rem_8rem_3rem] gap-4 px-4 py-2 bg-brand-muted/50 text-[9px] font-bold opacity-40 uppercase tracking-widest">
                    <span>Username</span>
                    <span>Email</span>
                    <span>Status</span>
                    <span>Created</span>
                    <span></span>
                  </div>
                  {filteredUsers.map(user => {
                    const emailAttr = user.Attributes?.find(a => a.Name === 'email');
                    return (
                      <div key={user.Username} className="grid grid-cols-[1fr_1fr_6rem_8rem_3rem] gap-4 items-center px-4 py-3 hover:bg-white/60 transition-colors group">
                        <span className="font-mono text-xs font-bold truncate">{user.Username}</span>
                        <span className="font-mono text-[10px] opacity-60 truncate normal-case">{emailAttr?.Value || '—'}</span>
                        <span className={`text-[9px] font-bold ${user.UserStatus === 'CONFIRMED' ? 'text-emerald-600' : 'text-amber-600'}`}>
                          {user.UserStatus}
                        </span>
                        <span className="font-mono text-[9px] opacity-40">{fmtDate(user.UserCreateDate)}</span>
                        <button
                          onClick={() => handleDeleteUser(user.Username!)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-rose-600 p-1 ml-auto"
                          title="Delete User"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // ── List view (User Pools) ─────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full uppercase">
      <PageHeader
        title="Cognito User Pools"
        icon={<Users size={18} />}
        onRefresh={fetchPools}
        isRefreshing={loading}
        actions={
          <Button onClick={() => setIsCreatePoolModalOpen(true)} icon={<Plus size={14} />}>
            New User Pool
          </Button>
        }
      />

      <Modal isOpen={isCreatePoolModalOpen} onClose={() => setIsCreatePoolModalOpen(false)} title="Create User Pool">
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
            <Button variant="ghost" className="flex-1" onClick={() => setIsCreatePoolModalOpen(false)}>Cancel</Button>
            <Button className="flex-1" onClick={handleCreatePool} disabled={!newPoolName || submittingPool}>
              {submittingPool ? 'Creating...' : 'Create Pool'}
            </Button>
          </div>
        </div>
      </Modal>

      <div className="p-6 flex-1 overflow-auto bg-brand-bg space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text opacity-30" size={14} />
          <Input
            placeholder="Search User Pools..."
            className="pl-10 font-mono text-[11px]"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            [1, 2, 3].map(i => <Skeleton key={i} className="h-32 animate-pulse" />)
          ) : filteredPools.length === 0 ? (
            <div className="col-span-full py-20 text-center border border-dashed border-brand-text/20">
              <p className="text-xs opacity-40 font-mono italic">NO_USER_POOLS_FOUND</p>
            </div>
          ) : (
            filteredPools.map(pool => (
              <Card
                key={pool.Id}
                className="hover:border-brand-text transition-all bg-white relative flex flex-col justify-between cursor-pointer hover:shadow-md"
                onClick={() => setSelectedPoolId(pool.Id!)}
              >
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-2 bg-brand-muted border border-brand-text">
                      <Users size={20} className="text-brand-text" />
                    </div>
                    <button
                      onClick={e => handleDeletePool(pool.Id!, pool.Name!, e)}
                      className="p-1 hover:text-rose-600 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <h4 className="font-bold text-xs truncate mb-1">{pool.Name}</h4>
                  <p className="text-[9px] font-mono opacity-50 truncate lowercase">{pool.Id}</p>
                </div>

                <div className="mt-6 pt-3 border-t border-brand-text/5 flex items-center justify-between text-[9px] font-mono opacity-60">
                  <span>{pool.Status || 'ACTIVE'}</span>
                  <span>{fmtDate(pool.CreationDate)}</span>
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
