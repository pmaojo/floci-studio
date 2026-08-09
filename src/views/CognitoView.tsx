import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Users2,
  Search,
  CirclePlus,
  UserPlus,
  Trash2,
  Mail,
  CheckCircle,
  XCircle
} from 'lucide-react';
import {
  ListUserPoolsCommand,
  ListUsersCommand,
  AdminCreateUserCommand,
  AdminDeleteUserCommand,
  DeleteUserPoolCommand,
  CreateUserPoolCommand,
  type UserPoolDescriptionType,
  type UserType
} from '@aws-sdk/client-cognito-identity-provider';
import { useAws } from '../contexts/AwsContext';
import { PageHeader, Card, Button, Input, Skeleton, Modal } from '../components/ui-elements';
import { cn } from '../lib/utils';
import { format } from 'date-fns';

const CognitoView = () => {
  const { clients, logActivity } = useAws();

  // State
  const [pools, setPools] = useState<UserPoolDescriptionType[]>([]);
  const [loadingPools, setLoadingPools] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selected Pool Details
  const [selectedPoolId, setSelectedPoolId] = useState<string | null>(null);
  const [users, setUsers] = useState<UserType[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [searchUsers, setSearchUsers] = useState('');

  // Modals
  const [isPoolModalOpen, setIsPoolModalOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);

  // Form State
  const [newPoolName, setNewPoolName] = useState('');
  const [isCreatingPool, setIsCreatingPool] = useState(false);

  const [newUsername, setNewUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isCreatingUser, setIsCreatingUser] = useState(false);

  const selectedPool = useMemo(() =>
    pools.find(p => p.Id === selectedPoolId),
  [pools, selectedPoolId]);

  const fetchPools = useCallback(async () => {
    setLoadingPools(true);
    setError(null);
    try {
      const { UserPools } = await clients.cognito.send(new ListUserPoolsCommand({ MaxResults: 50 }));
      setPools(UserPools || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch Cognito User Pools');
    } finally {
      setLoadingPools(false);
    }
  }, [clients.cognito]);

  useEffect(() => {
    fetchPools();
  }, [fetchPools]);

  const fetchUsers = useCallback(async (poolId: string) => {
    setLoadingUsers(true);
    try {
      const { Users } = await clients.cognito.send(new ListUsersCommand({
        UserPoolId: poolId,
        Limit: 50
      }));
      setUsers(Users || []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      alert(`Failed to fetch users: ${msg}`);
    } finally {
      setLoadingUsers(false);
    }
  }, [clients.cognito]);

  useEffect(() => {
    if (selectedPoolId) {
      fetchUsers(selectedPoolId);
    } else {
      setUsers([]);
    }
  }, [selectedPoolId, fetchUsers]);

  const handleSelectPool = (poolId: string) => {
    if (selectedPoolId === poolId) return;
    setSelectedPoolId(poolId);
    setSearchUsers('');
  };

  const handleCreatePool = async () => {
    if (!newPoolName) return;
    setIsCreatingPool(true);
    try {
      await clients.cognito.send(new CreateUserPoolCommand({
        PoolName: newPoolName,
      }));
      logActivity('Cognito', `CreateUserPool: ${newPoolName}`, 'success');
      setNewPoolName('');
      setIsPoolModalOpen(false);
      await fetchPools();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logActivity('Cognito', `CreateUserPool failed`, 'error', msg);
      alert(msg);
    } finally {
      setIsCreatingPool(false);
    }
  };

  const handleDeletePool = async (poolId: string, poolName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Delete user pool ${poolName}?`)) return;
    try {
      await clients.cognito.send(new DeleteUserPoolCommand({ UserPoolId: poolId }));
      logActivity('Cognito', `DeleteUserPool: ${poolName}`, 'success');
      if (selectedPoolId === poolId) setSelectedPoolId(null);
      await fetchPools();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logActivity('Cognito', `DeleteUserPool failed`, 'error', msg);
      alert(msg);
    }
  };

  const handleCreateUser = async () => {
    if (!selectedPoolId || !newUsername) return;
    setIsCreatingUser(true);
    try {
      const userAttributes = [];
      if (newEmail) {
        userAttributes.push({ Name: 'email', Value: newEmail });
      }

      await clients.cognito.send(new AdminCreateUserCommand({
        UserPoolId: selectedPoolId,
        Username: newUsername,
        UserAttributes: userAttributes.length > 0 ? userAttributes : undefined,
        TemporaryPassword: newPassword || undefined,
        MessageAction: 'SUPPRESS' // Don't try to send real emails from localstack
      }));

      logActivity('Cognito', `CreateUser: ${newUsername}`, 'success', `Pool: ${selectedPool?.Name}`);

      setNewUsername('');
      setNewEmail('');
      setNewPassword('');
      setIsUserModalOpen(false);
      await fetchUsers(selectedPoolId);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logActivity('Cognito', `CreateUser failed`, 'error', msg);
      alert(msg);
    } finally {
      setIsCreatingUser(false);
    }
  };

  const handleDeleteUser = async (username: string) => {
    if (!selectedPoolId || !confirm(`Delete user ${username}?`)) return;
    try {
      await clients.cognito.send(new AdminDeleteUserCommand({
        UserPoolId: selectedPoolId,
        Username: username
      }));
      logActivity('Cognito', `DeleteUser: ${username}`, 'success');
      await fetchUsers(selectedPoolId);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logActivity('Cognito', `DeleteUser failed`, 'error', msg);
      alert(msg);
    }
  };

  const filteredUsers = useMemo(() => {
    if (!searchUsers) return users;
    const lower = searchUsers.toLowerCase();
    return users.filter(u =>
      u.Username?.toLowerCase().includes(lower) ||
      u.Attributes?.some(a => a.Value?.toLowerCase().includes(lower))
    );
  }, [users, searchUsers]);

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'CONFIRMED': return 'text-emerald-600 bg-emerald-50 border-emerald-200';
      case 'UNCONFIRMED': return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'FORCE_CHANGE_PASSWORD': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-neutral-600 bg-neutral-50 border-neutral-200';
    }
  };

  return (
    <div className="flex flex-col h-full uppercase">
      <PageHeader
        title="Cognito User Pools"
        icon={<Users2 size={18} />}
        onRefresh={() => {
          fetchPools();
          if (selectedPoolId) fetchUsers(selectedPoolId);
        }}
        isRefreshing={loadingPools || loadingUsers}
        actions={
          <Button
            onClick={() => setIsPoolModalOpen(true)}
            icon={<CirclePlus size={14} />}
          >
            Create Pool
          </Button>
        }
      />

      {/* Create Pool Modal */}
      <Modal
        isOpen={isPoolModalOpen}
        onClose={() => setIsPoolModalOpen(false)}
        title="Create User Pool"
      >
        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-bold opacity-60 mb-1 block">Pool Name</label>
            <Input
              value={newPoolName}
              onChange={e => setNewPoolName(e.target.value)}
              placeholder="my-app-users"
              autoFocus
            />
          </div>
          <div className="pt-4 flex gap-3">
             <Button variant="ghost" className="flex-1" onClick={() => setIsPoolModalOpen(false)}>Cancel</Button>
             <Button className="flex-1" onClick={handleCreatePool} disabled={!newPoolName || isCreatingPool}>
               {isCreatingPool ? 'Creating...' : 'Create'}
             </Button>
          </div>
        </div>
      </Modal>

      {/* Create User Modal */}
      <Modal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        title="Create User"
      >
        <div className="space-y-4 font-sans text-brand-text">
          <div className="text-[10px] font-mono text-neutral-500 mb-4 pb-2 border-b border-brand-text/20">
            Target Pool: <span className="font-bold">{selectedPool?.Name}</span>
          </div>

          <div>
            <label className="text-[10px] font-bold opacity-60 mb-1 block uppercase">Username *</label>
            <Input
              value={newUsername}
              onChange={e => setNewUsername(e.target.value)}
              placeholder="testuser"
              className="font-mono text-sm"
              autoFocus
            />
          </div>
          <div>
            <label className="text-[10px] font-bold opacity-60 mb-1 block uppercase">Email (Optional)</label>
            <Input
              type="email"
              value={newEmail}
              onChange={e => setNewEmail(e.target.value)}
              placeholder="user@example.com"
              className="font-mono text-sm"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold opacity-60 mb-1 block uppercase">Temporary Password (Optional)</label>
            <Input
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="Leave empty for auto-generated"
              className="font-mono text-sm"
            />
          </div>
          <div className="pt-4 flex gap-3">
             <Button variant="ghost" className="flex-1" onClick={() => setIsUserModalOpen(false)}>Cancel</Button>
             <Button className="flex-1 font-sans" onClick={handleCreateUser} disabled={!newUsername || isCreatingUser}>
               {isCreatingUser ? 'Creating...' : 'CREATE_USER'}
             </Button>
          </div>
        </div>
      </Modal>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: Pools List */}
        <aside className="w-1/3 min-w-[250px] max-w-[350px] border-r border-brand-text bg-white flex flex-col shrink-0 z-10">
          <div className="p-3 border-b border-brand-text bg-brand-muted/30">
            <h3 className="text-[10px] font-bold tracking-widest opacity-50">USER POOLS</h3>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loadingPools ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-16" />)}
              </div>
            ) : error ? (
              <div className="p-4 text-rose-600 text-xs font-mono">{error}</div>
            ) : pools.length === 0 ? (
              <div className="p-8 text-center text-xs opacity-40 font-mono italic">
                NO_POOLS_FOUND
              </div>
            ) : (
              <div className="divide-y divide-brand-text/10">
                {pools.map(pool => (
                  <div
                    key={pool.Id}
                    onClick={() => handleSelectPool(pool.Id!)}
                    className={cn(
                      "p-3 cursor-pointer transition-colors group flex items-start justify-between gap-2",
                      selectedPoolId === pool.Id
                        ? "bg-brand-text text-brand-bg"
                        : "hover:bg-brand-muted/50"
                    )}
                  >
                    <div className="min-w-0">
                      <div className="font-bold text-xs truncate font-mono">
                        {pool.Name}
                      </div>
                      <div className={cn(
                        "text-[9px] font-mono mt-1 truncate",
                        selectedPoolId === pool.Id ? "opacity-70" : "opacity-40"
                      )}>
                        {pool.Id}
                      </div>
                      <div className={cn(
                        "text-[9px] font-mono mt-0.5 normal-case",
                        selectedPoolId === pool.Id ? "opacity-70" : "opacity-40"
                      )}>
                        Created: {pool.CreationDate ? format(new Date(pool.CreationDate), 'MMM d, yyyy') : 'Unknown'}
                      </div>
                    </div>
                    <button
                      onClick={(e) => handleDeletePool(pool.Id!, pool.Name!, e)}
                      className={cn(
                        "p-1.5 shrink-0 transition-opacity rounded-sm",
                        selectedPoolId === pool.Id
                          ? "opacity-60 hover:opacity-100 hover:bg-rose-500 hover:text-white"
                          : "opacity-0 group-hover:opacity-60 hover:!opacity-100 hover:text-rose-600 hover:bg-rose-50"
                      )}
                      title="Delete Pool"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>

        {/* Right Content: Pool Details & Users */}
        <main className="flex-1 overflow-hidden bg-brand-bg flex flex-col">
          {!selectedPoolId ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center border-dashed border border-brand-text/20 m-6 bg-brand-muted/10">
               <Users2 size={48} className="opacity-10 mb-4" />
               <p className="text-[11px] font-bold tracking-widest opacity-40">SELECT_A_USER_POOL</p>
               <p className="text-[10px] normal-case opacity-40 mt-2 max-w-sm">
                 Choose a pool from the left panel to inspect its users, manage groups, and configure settings.
               </p>
            </div>
          ) : (
            <>
              {/* Pool Header */}
              <div className="p-4 border-b border-brand-text bg-white shrink-0">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-bold font-mono tracking-tight text-brand-text flex items-center gap-2">
                      {selectedPool?.Name}
                    </h2>
                    <div className="flex items-center gap-3 mt-1.5 text-[10px] font-mono opacity-50">
                      <span>ID: {selectedPoolId}</span>
                      {selectedPool?.Status && (
                        <span className="px-1.5 py-0.5 border border-brand-text/20 bg-brand-muted">
                          {selectedPool.Status}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Users Toolbar */}
              <div className="px-4 py-3 border-b border-brand-text/20 bg-brand-muted/30 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <div className="relative w-64">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-brand-text opacity-40" size={14} />
                    <Input
                      placeholder="Filter users..."
                      className="pl-8 py-1.5 text-[10px] font-mono"
                      value={searchUsers}
                      onChange={e => setSearchUsers(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setIsUserModalOpen(true)}
                    icon={<UserPlus size={12} />}
                  >
                    Add User
                  </Button>
                </div>
              </div>

              {/* Users Table */}
              <div className="flex-1 overflow-auto p-4">
                <Card className="font-mono p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-[10px] align-middle">
                      <thead className="bg-brand-muted border-b border-brand-text">
                        <tr>
                          <th className="p-3 w-1/3">Username</th>
                          <th className="p-3">Email</th>
                          <th className="p-3">Status</th>
                          <th className="p-3">Created</th>
                          <th className="p-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loadingUsers ? (
                          <tr>
                            <td colSpan={5} className="p-4">
                              <Skeleton className="h-8 w-full mb-2" />
                              <Skeleton className="h-8 w-full" />
                            </td>
                          </tr>
                        ) : filteredUsers.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="p-8 text-center text-xs opacity-40 italic">
                              {searchUsers ? 'NO_MATCHING_USERS' : 'POOL_IS_EMPTY'}
                            </td>
                          </tr>
                        ) : (
                          filteredUsers.map(user => {
                            const emailAttr = user.Attributes?.find(a => a.Name === 'email');
                            const emailVerified = user.Attributes?.find(a => a.Name === 'email_verified')?.Value === 'true';

                            return (
                              <tr key={user.Username} className="border-b border-brand-text/10 hover:bg-neutral-50">
                                <td className="p-3 font-bold text-brand-text">
                                  <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 bg-brand-muted border border-brand-text/20 flex items-center justify-center rounded-full shrink-0">
                                      <Users2 size={10} className="opacity-60" />
                                    </div>
                                    <div className="flex flex-col">
                                      <span className="truncate max-w-[150px] normal-case">{user.Username}</span>
                                      {user.Enabled === false && (
                                        <span className="text-[8px] text-rose-500 mt-0.5">DISABLED</span>
                                      )}
                                    </div>
                                  </div>
                                </td>
                                <td className="p-3 normal-case">
                                  {emailAttr ? (
                                    <div className="flex items-center gap-1.5 text-neutral-600">
                                      <Mail size={10} className="opacity-50" />
                                      {emailAttr.Value}
                                      {emailVerified ? (
                                        <div title="Verified" className="flex items-center">
                                          <CheckCircle size={10} className="text-emerald-500" />
                                        </div>
                                      ) : (
                                        <div title="Unverified" className="flex items-center">
                                          <XCircle size={10} className="text-rose-400" />
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="opacity-30">—</span>
                                  )}
                                </td>
                                <td className="p-3">
                                  <span className={cn(
                                    "px-1.5 py-0.5 border text-[8px] font-bold rounded-sm whitespace-nowrap",
                                    getStatusColor(user.UserStatus)
                                  )}>
                                    {user.UserStatus}
                                  </span>
                                </td>
                                <td className="p-3 text-neutral-500">
                                  {user.UserCreateDate ? format(new Date(user.UserCreateDate), 'MMM d, yyyy HH:mm') : '—'}
                                </td>
                                <td className="p-3 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <button
                                      onClick={() => handleDeleteUser(user.Username!)}
                                      title="Delete User"
                                      className="p-1.5 border border-transparent hover:border-rose-600/20 hover:bg-rose-50 text-rose-600 transition-all rounded-sm"
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default CognitoView;
