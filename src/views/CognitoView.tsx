import { useState, useEffect, useCallback } from 'react';
import { Users, Trash2, Plus, RefreshCw } from 'lucide-react';
import {
  ListUserPoolsCommand,
  CreateUserPoolCommand,
  DeleteUserPoolCommand,
  ListUsersCommand,
  AdminCreateUserCommand,
  AdminDeleteUserCommand
} from '@aws-sdk/client-cognito-identity-provider';
import type { UserPoolDescriptionType, UserType } from '@aws-sdk/client-cognito-identity-provider';
import { useAws } from '../contexts/AwsContext';
import { PageHeader, Card, Button, Skeleton } from '../components/ui-elements';
import { formatDistanceToNowStrict } from 'date-fns';

const CognitoView = () => {
  const { clients, logActivity } = useAws();
  const [pools, setPools] = useState<UserPoolDescriptionType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State for selected pool and its users
  const [selectedPoolId, setSelectedPoolId] = useState<string | null>(null);
  const [users, setUsers] = useState<UserType[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const fetchPools = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await clients.cognito.send(new ListUserPoolsCommand({ MaxResults: 50 }));
      const fetchedPools = response.UserPools || [];
      setPools(fetchedPools);

      // If we had a selected pool but it no longer exists, deselect it
      if (selectedPoolId && !fetchedPools.find(p => p.Id === selectedPoolId)) {
        setSelectedPoolId(null);
        setUsers([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch Cognito User Pools');
    } finally {
      setLoading(false);
    }
  }, [clients.cognito, selectedPoolId]);

  useEffect(() => {
    fetchPools();
  }, [fetchPools]);

  const fetchUsers = useCallback(async (poolId: string) => {
    setLoadingUsers(true);
    try {
      const response = await clients.cognito.send(new ListUsersCommand({ UserPoolId: poolId }));
      setUsers(response.Users || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logActivity('Cognito', `ListUsers failed for ${poolId}`, 'error', message);
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
    const name = prompt('Enter a name for the new User Pool:');
    if (!name) return;

    try {
      await clients.cognito.send(new CreateUserPoolCommand({
        PoolName: name,
        AdminCreateUserConfig: { AllowAdminCreateUserOnly: false },
        UsernameAttributes: ['email']
      }));
      logActivity('Cognito', `CreateUserPool: ${name}`, 'success');
      fetchPools();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logActivity('Cognito', `CreateUserPool failed: ${name}`, 'error', message);
      alert(`Error creating User Pool: ${message}`);
    }
  };

  const handleDeletePool = async (poolId: string, poolName: string) => {
    if (!confirm(`Are you sure you want to delete User Pool ${poolName} (${poolId})?`)) return;

    try {
      await clients.cognito.send(new DeleteUserPoolCommand({ UserPoolId: poolId }));
      logActivity('Cognito', `DeleteUserPool: ${poolName}`, 'success');
      fetchPools();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logActivity('Cognito', `DeleteUserPool failed: ${poolName}`, 'error', message);
      alert(`Error deleting User Pool: ${message}`);
    }
  };

  const handleCreateUser = async () => {
    if (!selectedPoolId) return;

    const username = prompt('Enter email/username for the new test user:');
    if (!username) return;

    const password = prompt('Enter a temporary password for this user (leave blank to auto-generate):');

    try {
      await clients.cognito.send(new AdminCreateUserCommand({
        UserPoolId: selectedPoolId,
        Username: username,
        TemporaryPassword: password || undefined,
        UserAttributes: [
          { Name: 'email', Value: username.includes('@') ? username : `${username}@example.com` },
          { Name: 'email_verified', Value: 'true' }
        ],
        MessageAction: 'SUPPRESS' // Don't try to actually send emails in local environment
      }));
      logActivity('Cognito', `AdminCreateUser: ${username}`, 'success');
      fetchUsers(selectedPoolId);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logActivity('Cognito', `AdminCreateUser failed: ${username}`, 'error', message);
      alert(`Error creating user: ${message}`);
    }
  };

  const handleDeleteUser = async (username: string) => {
    if (!selectedPoolId || !confirm(`Delete user ${username}?`)) return;

    try {
      await clients.cognito.send(new AdminDeleteUserCommand({
        UserPoolId: selectedPoolId,
        Username: username
      }));
      logActivity('Cognito', `AdminDeleteUser: ${username}`, 'success');
      fetchUsers(selectedPoolId);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logActivity('Cognito', `AdminDeleteUser failed: ${username}`, 'error', message);
      alert(`Error deleting user: ${message}`);
    }
  };

  const formatDate = (date?: Date) => {
    if (!date) return 'Unknown';
    try {
      return formatDistanceToNowStrict(date, { addSuffix: true });
    } catch {
      return date.toLocaleString();
    }
  };

  return (
    <div className="flex flex-col h-full uppercase">
      <PageHeader
        title="Cognito User Pools"
        icon={<Users size={18} />}
        onRefresh={() => { fetchPools(); if (selectedPoolId) fetchUsers(selectedPoolId); }}
        isRefreshing={loading || loadingUsers}
        actions={
          <Button onClick={handleCreatePool} icon={<Plus size={14} />}>
            Create Pool
          </Button>
        }
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Left pane: User Pools */}
        <div className="w-1/3 min-w-[300px] border-r border-brand-text/10 bg-brand-bg overflow-y-auto p-4 space-y-4">
          <h2 className="text-xs font-bold tracking-widest opacity-60 mb-2 flex items-center gap-2">
            <Users size={12} />
            User Pools ({pools.length})
          </h2>

          {loading && pools.length === 0 ? (
            Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-24" />)
          ) : error ? (
            <Card className="text-rose-600 font-mono text-[10px] text-center py-6 border-rose-600 bg-rose-50 normal-case">
              {error}
            </Card>
          ) : pools.length === 0 ? (
            <Card className="text-brand-text opacity-50 text-center py-10 italic text-[10px] font-bold tracking-widest bg-brand-muted/30 border-dashed">
              NO POOLS FOUND
            </Card>
          ) : (
            pools.map(pool => (
              <Card
                key={pool.Id}
                className={`cursor-pointer transition-all ${
                  selectedPoolId === pool.Id
                    ? 'border-brand-text shadow-sm bg-white'
                    : 'hover:border-brand-text/50 bg-white/50'
                }`}
                onClick={() => setSelectedPoolId(pool.Id || null)}
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-[11px] truncate" title={pool.Name}>{pool.Name}</h3>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeletePool(pool.Id!, pool.Name!); }}
                    className="text-rose-500 hover:text-rose-700 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Delete Pool"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
                <div className="text-[9px] font-mono opacity-60 space-y-1 normal-case">
                  <p className="truncate" title={pool.Id}>ID: {pool.Id}</p>
                  <p>Created: {formatDate(pool.CreationDate)}</p>
                </div>
              </Card>
            ))
          )}
        </div>

        {/* Right pane: Users in selected pool */}
        <div className="flex-1 bg-white overflow-y-auto">
          {!selectedPoolId ? (
            <div className="h-full flex items-center justify-center text-brand-text opacity-30 italic text-[11px] font-bold tracking-widest bg-brand-bg/50">
              SELECT A USER POOL TO MANAGE USERS
            </div>
          ) : (
            <div className="p-6">
              <div className="flex justify-between items-center mb-6 border-b border-brand-text/10 pb-4">
                <div>
                  <h2 className="text-lg font-bold tracking-tight">
                    {pools.find(p => p.Id === selectedPoolId)?.Name || selectedPoolId}
                  </h2>
                  <p className="text-[10px] font-mono opacity-50 mt-1 lowercase">
                    {selectedPoolId}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => fetchUsers(selectedPoolId)}
                    variant="secondary"
                    icon={<RefreshCw size={12} className={loadingUsers ? 'animate-spin' : ''} />}
                  >
                    Refresh
                  </Button>
                  <Button onClick={handleCreateUser} icon={<Plus size={14} />}>
                    Add User
                  </Button>
                </div>
              </div>

              {loadingUsers ? (
                <div className="space-y-2">
                  {Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-12" />)}
                </div>
              ) : users.length === 0 ? (
                <Card className="text-center py-12 border-dashed bg-brand-muted/20">
                  <Users size={24} className="mx-auto mb-3 opacity-20" />
                  <p className="text-[10px] font-bold tracking-widest opacity-60">NO USERS IN THIS POOL</p>
                  <p className="text-xs opacity-40 normal-case mt-2">Click 'Add User' to create a test user.</p>
                </Card>
              ) : (
                <div className="border border-brand-text/20 overflow-hidden">
                  <table className="w-full text-left text-[10px] font-mono">
                    <thead className="bg-brand-muted/30 border-b border-brand-text/20 uppercase tracking-widest">
                      <tr>
                        <th className="p-3">Username</th>
                        <th className="p-3">Status</th>
                        <th className="p-3 hidden md:table-cell">Created</th>
                        <th className="p-3 hidden lg:table-cell">Last Modified</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map(user => (
                        <tr key={user.Username} className="border-b border-brand-text/10 hover:bg-brand-muted/10 transition-colors">
                          <td className="p-3 font-bold text-brand-text normal-case">
                            {user.Username}
                          </td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 border text-[9px] font-bold ${
                              user.UserStatus === 'CONFIRMED'
                                ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                                : user.UserStatus === 'FORCE_CHANGE_PASSWORD'
                                ? 'border-amber-500 bg-amber-50 text-amber-700'
                                : 'border-neutral-300 bg-neutral-50 text-neutral-600'
                            }`}>
                              {user.UserStatus}
                            </span>
                          </td>
                          <td className="p-3 hidden md:table-cell normal-case opacity-70">
                            {formatDate(user.UserCreateDate)}
                          </td>
                          <td className="p-3 hidden lg:table-cell normal-case opacity-70">
                            {formatDate(user.UserLastModifiedDate)}
                          </td>
                          <td className="p-3 text-right">
                            <button
                              onClick={() => handleDeleteUser(user.Username!)}
                              className="text-rose-500 hover:text-white hover:bg-rose-500 p-1.5 transition-colors rounded border border-transparent hover:border-rose-600"
                              title="Delete user"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CognitoView;
