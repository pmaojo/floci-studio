import { useState, useEffect } from 'react';
import { Users2, Plus, Trash2, RefreshCw } from 'lucide-react';
import { useAws } from '../contexts/AwsContext';
import { Card, PageHeader, Button, Input, Skeleton } from '../components/ui-elements';
import {
  ListUserPoolsCommand,
  CreateUserPoolCommand,
  DeleteUserPoolCommand,
  ListUsersCommand,
  AdminCreateUserCommand,
  AdminDeleteUserCommand,
  AdminSetUserPasswordCommand,
} from '@aws-sdk/client-cognito-identity-provider';

interface UserPool {
  Id: string;
  Name: string;
  CreationDate?: Date;
  Status?: string;
}

interface CognitoUser {
  Username: string;
  UserStatus?: string;
  Enabled?: boolean;
  UserCreateDate?: Date;
}

export default function CognitoView() {
  const { clients, logActivity } = useAws();
  const [pools, setPools] = useState<UserPool[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPoolName, setNewPoolName] = useState('');

  const [selectedPool, setSelectedPool] = useState<UserPool | null>(null);
  const [users, setUsers] = useState<CognitoUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');

  const fetchPools = async () => {
    setLoading(true);
    try {
      const response = await clients.cognito.send(new ListUserPoolsCommand({ MaxResults: 50 }));
      setPools(response.UserPools as UserPool[] || []);
      logActivity('Cognito', 'ListUserPools', 'success', `Found ${response.UserPools?.length || 0} pools`);
    } catch (error) {
      logActivity('Cognito', 'ListUserPools', 'error', (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPools();
  }, []);

  const handleCreatePool = async () => {
    if (!newPoolName.trim()) return;
    try {
      await clients.cognito.send(new CreateUserPoolCommand({ PoolName: newPoolName }));
      logActivity('Cognito', 'CreateUserPool', 'success', newPoolName);
      setNewPoolName('');
      fetchPools();
    } catch (error) {
      logActivity('Cognito', 'CreateUserPool', 'error', (error as Error).message);
    }
  };

  const handleDeletePool = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete user pool ${name}?`)) return;
    try {
      await clients.cognito.send(new DeleteUserPoolCommand({ UserPoolId: id }));
      logActivity('Cognito', 'DeleteUserPool', 'success', name);
      if (selectedPool?.Id === id) {
        setSelectedPool(null);
        setUsers([]);
      }
      fetchPools();
    } catch (error) {
      logActivity('Cognito', 'DeleteUserPool', 'error', (error as Error).message);
    }
  };

  const fetchUsers = async (poolId: string) => {
    setUsersLoading(true);
    try {
      const response = await clients.cognito.send(new ListUsersCommand({ UserPoolId: poolId }));
      setUsers(response.Users as CognitoUser[] || []);
      logActivity('Cognito', 'ListUsers', 'success', `Found ${response.Users?.length || 0} users`);
    } catch (error) {
      logActivity('Cognito', 'ListUsers', 'error', (error as Error).message);
    } finally {
      setUsersLoading(false);
    }
  };

  const handleSelectPool = (pool: UserPool) => {
    setSelectedPool(pool);
    fetchUsers(pool.Id);
  };

  const handleCreateUser = async () => {
    if (!selectedPool || !newUsername.trim()) return;
    try {
      await clients.cognito.send(new AdminCreateUserCommand({
        UserPoolId: selectedPool.Id,
        Username: newUsername,
        TemporaryPassword: newUserPassword || undefined,
      }));

      if (newUserPassword) {
        await clients.cognito.send(new AdminSetUserPasswordCommand({
           UserPoolId: selectedPool.Id,
           Username: newUsername,
           Password: newUserPassword,
           Permanent: true
        }));
      }

      logActivity('Cognito', 'AdminCreateUser', 'success', newUsername);
      setNewUsername('');
      setNewUserPassword('');
      fetchUsers(selectedPool.Id);
    } catch (error) {
      logActivity('Cognito', 'AdminCreateUser', 'error', (error as Error).message);
    }
  };

  const handleDeleteUser = async (username: string) => {
    if (!selectedPool) return;
    if (!confirm(`Are you sure you want to delete user ${username}?`)) return;
    try {
      await clients.cognito.send(new AdminDeleteUserCommand({
        UserPoolId: selectedPool.Id,
        Username: username
      }));
      logActivity('Cognito', 'AdminDeleteUser', 'success', username);
      fetchUsers(selectedPool.Id);
    } catch (error) {
      logActivity('Cognito', 'AdminDeleteUser', 'error', (error as Error).message);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cognito User Pools"
        subtitle="Manage user directories, identity pools and developer authentication."
        icon={<Users2 size={24} className="text-brand-text" />}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <h3 className="font-serif-italic text-lg text-brand-text mb-4">Create User Pool</h3>
            <div className="flex gap-2">
              <Input
                placeholder="Pool Name..."
                value={newPoolName}
                onChange={e => setNewPoolName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreatePool()}
              />
              <Button onClick={handleCreatePool} disabled={!newPoolName}>
                <Plus size={16} />
              </Button>
            </div>
          </Card>

          <Card className="p-0 overflow-hidden">
            <div className="p-4 border-b border-brand-green/20 bg-brand-muted flex justify-between items-center">
              <h3 className="font-serif-italic text-lg text-brand-text">User Pools</h3>
              <Button variant="ghost" size="sm" onClick={fetchPools}>
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              </Button>
            </div>

            <div className="divide-y divide-brand-green/20 max-h-[600px] overflow-y-auto">
              {loading && pools.length === 0 ? (
                Array(3).fill(0).map((_, i) => (
                  <div key={i} className="p-4"><Skeleton className="h-12 w-full" /></div>
                ))
              ) : pools.length === 0 ? (
                <div className="p-8 text-center text-slate-500 italic">No user pools found</div>
              ) : (
                pools.map(pool => (
                  <div
                    key={pool.Id}
                    className={`p-4 flex flex-col gap-2 cursor-pointer transition-colors ${selectedPool?.Id === pool.Id ? 'bg-brand-green/10' : 'hover:bg-white/5'}`}
                    onClick={() => handleSelectPool(pool)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-medium text-white">{pool.Name}</div>
                      <Button variant="danger" size="sm" onClick={(e) => { e.stopPropagation(); handleDeletePool(pool.Id, pool.Name); }}>
                        <Trash2 size={14} />
                      </Button>
                    </div>
                    <div className="text-xs text-slate-400 font-mono">{pool.Id}</div>
                    <div className="flex gap-2 text-[10px] text-slate-500 uppercase">
                      <span>Created: {pool.CreationDate?.toLocaleDateString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-6">
          {selectedPool ? (
            <>
              <Card>
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="font-serif-italic text-lg text-brand-text">Users in {selectedPool.Name}</h3>
                    <p className="text-sm text-slate-400 font-mono mt-1">{selectedPool.Id}</p>
                  </div>
                  <Button variant="secondary" onClick={() => fetchUsers(selectedPool.Id)}>
                    <RefreshCw size={14} className={`mr-2 ${usersLoading ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>

                <div className="flex gap-2 mb-6">
                  <Input
                    placeholder="Username"
                    value={newUsername}
                    onChange={e => setNewUsername(e.target.value)}
                  />
                  <Input
                    type="password"
                    placeholder="Password (optional)"
                    value={newUserPassword}
                    onChange={e => setNewUserPassword(e.target.value)}
                  />
                  <Button onClick={handleCreateUser} disabled={!newUsername}>
                    <Plus size={16} className="mr-2" />
                    Add User
                  </Button>
                </div>

                <div className="border border-brand-green/20 rounded-md overflow-hidden">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-brand-muted border-b border-brand-green/20">
                      <tr>
                        <th className="p-3 font-medium text-brand-text">Username</th>
                        <th className="p-3 font-medium text-brand-text">Status</th>
                        <th className="p-3 font-medium text-brand-text">Created</th>
                        <th className="p-3 font-medium text-brand-text text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-green/10">
                      {usersLoading && users.length === 0 ? (
                         <tr><td colSpan={4} className="p-4"><Skeleton className="h-8 w-full" /></td></tr>
                      ) : users.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="p-8 text-center text-slate-500 italic">
                            No users found in this pool
                          </td>
                        </tr>
                      ) : (
                        users.map(user => (
                          <tr key={user.Username} className="hover:bg-white/5 transition-colors group">
                            <td className="p-3 font-medium text-white">{user.Username}</td>
                            <td className="p-3">
                              <span className={`px-2 py-1 rounded text-xs ${user.UserStatus === 'CONFIRMED' ? 'bg-green-900/50 text-green-400' : 'bg-yellow-900/50 text-yellow-400'}`}>
                                {user.UserStatus || 'UNKNOWN'}
                              </span>
                            </td>
                            <td className="p-3 text-slate-400 text-xs">
                              {user.UserCreateDate?.toLocaleString()}
                            </td>
                            <td className="p-3 text-right">
                              <Button
                                variant="danger"
                                size="sm"
                                onClick={() => handleDeleteUser(user.Username)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Trash2 size={14} />
                              </Button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </>
          ) : (
            <div className="h-full min-h-[400px] border border-dashed border-slate-700 rounded-lg flex flex-col items-center justify-center text-slate-500 p-8">
              <Users2 size={48} className="mb-4 opacity-50" />
              <h3 className="text-xl font-medium mb-2">No User Pool Selected</h3>
              <p className="text-center max-w-md">
                Select a user pool from the list or create a new one to manage its users.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
