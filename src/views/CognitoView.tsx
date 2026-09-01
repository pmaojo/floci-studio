import { useState, useEffect } from 'react';
import { useAws } from '../contexts/AwsContext';
import {
  ListUserPoolsCommand,
  ListUsersCommand,
  AdminCreateUserCommand,
  CreateUserPoolCommand,
  UserPoolDescriptionType,
  UserType
} from '@aws-sdk/client-cognito-identity-provider';
import { Shield, RefreshCw, Users, CirclePlus, UserPlus } from 'lucide-react';
import { PageHeader, Card, Skeleton } from '../components/ui-elements';

export default function CognitoView() {
  const { clients: { cognito }, logActivity } = useAws();
  const [userPools, setUserPools] = useState<UserPoolDescriptionType[]>([]);
  const [selectedPoolId, setSelectedPoolId] = useState<string | null>(null);
  const [users, setUsers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUserPools = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await cognito.send(new ListUserPoolsCommand({ MaxResults: 10 }));
      setUserPools(response.UserPools || []);
      logActivity('Cognito', 'ListUserPools', 'success');
    } catch (err) {
      console.error(err);
      setError('Failed to fetch User Pools');
      logActivity('Cognito', 'ListUserPools', 'error', String(err));
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async (poolId: string) => {
    setLoadingUsers(true);
    try {
      const response = await cognito.send(new ListUsersCommand({ UserPoolId: poolId }));
      setUsers(response.Users || []);
      logActivity('Cognito', 'ListUsers', 'success', `PoolId: ${poolId}`);
    } catch (err) {
      console.error(err);
      logActivity('Cognito', 'ListUsers', 'error', String(err));
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    fetchUserPools();
  }, []);

  useEffect(() => {
    if (selectedPoolId) {
      fetchUsers(selectedPoolId);
    } else {
      setUsers([]);
    }
  }, [selectedPoolId]);

  const handleCreatePool = async () => {
    const name = prompt('Enter a name for the new User Pool:');
    if (!name) return;
    try {
      await cognito.send(new CreateUserPoolCommand({ PoolName: name }));
      logActivity('Cognito', 'CreateUserPool', 'success', `PoolName: ${name}`);
      fetchUserPools();
    } catch (err) {
      console.error(err);
      alert('Failed to create User Pool');
      logActivity('Cognito', 'CreateUserPool', 'error', String(err));
    }
  };

  const handleCreateUser = async () => {
    if (!selectedPoolId) return;
    const username = prompt('Enter a username for the new user:');
    if (!username) return;
    try {
      await cognito.send(new AdminCreateUserCommand({
        UserPoolId: selectedPoolId,
        Username: username
      }));
      logActivity('Cognito', 'AdminCreateUser', 'success', `Username: ${username}`);
      fetchUsers(selectedPoolId);
    } catch (err) {
      console.error(err);
      alert('Failed to create user');
      logActivity('Cognito', 'AdminCreateUser', 'error', String(err));
    }
  };

  return (
    <div className="flex flex-col h-full uppercase">
      <PageHeader
        title="Cognito User Pools"
        icon={<Shield size={18} />}
        onRefresh={fetchUserPools}
        isRefreshing={loading}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={handleCreatePool}
              className="px-3 py-1.5 text-[10px] font-bold tracking-widest bg-brand-text text-white hover:bg-brand-text/90 transition-colors uppercase border border-brand-text flex items-center gap-1.5"
            >
              <CirclePlus size={12} />
              CREATE POOL
            </button>
            <button
              onClick={fetchUserPools}
              className="px-3 py-1.5 text-[10px] font-bold tracking-widest bg-white text-brand-text hover:bg-brand-muted transition-colors uppercase border border-brand-text flex items-center gap-1.5"
              disabled={loading}
            >
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
              REFRESH
            </button>
          </div>
        }
      />

      <div className="flex-1 overflow-auto bg-brand-bg p-6">
        {error && (
          <div className="mb-6 p-4 border-l-4 border-rose-500 bg-rose-50 text-rose-700 font-mono text-[11px] normal-case">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-4">
            <h2 className="text-xs font-bold tracking-widest text-neutral-500 mb-2 flex items-center gap-2">
              <Shield size={14} /> USER POOLS
            </h2>
            {loading ? (
              [...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)
            ) : userPools.length === 0 ? (
              <Card className="text-center py-8 opacity-50 italic normal-case text-xs">
                No user pools found. Create one to get started.
              </Card>
            ) : (
              userPools.map((pool) => (
                <div
                  key={pool.Id}
                  onClick={() => setSelectedPoolId(pool.Id || null)}
                  className={`p-4 border font-mono text-xs cursor-pointer transition-colors ${
                    selectedPoolId === pool.Id
                      ? 'border-brand-text bg-white shadow-sm'
                      : 'border-brand-text/20 bg-brand-muted/10 hover:bg-white hover:border-brand-text/50'
                  }`}
                >
                  <div className="font-bold mb-1 truncate normal-case">{pool.Name}</div>
                  <div className="text-[10px] opacity-60 mb-2 truncate">{pool.Id}</div>
                  <div className="text-[9px] px-1.5 py-0.5 border border-brand-text/20 inline-block bg-white rounded-sm">
                    {pool.Status || 'Active'}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="lg:col-span-2 space-y-4">
            {selectedPoolId ? (
              <>
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-xs font-bold tracking-widest text-neutral-500 flex items-center gap-2">
                    <Users size={14} /> POOL USERS
                  </h2>
                  <button
                    onClick={handleCreateUser}
                    className="px-2 py-1 text-[9px] font-bold tracking-widest bg-white text-brand-text hover:bg-brand-muted transition-colors uppercase border border-brand-text flex items-center gap-1.5"
                  >
                    <UserPlus size={10} />
                    ADD USER
                  </button>
                </div>
                {loadingUsers ? (
                  <Skeleton className="h-64 w-full" />
                ) : users.length === 0 ? (
                  <Card className="text-center py-12 opacity-50 italic normal-case text-xs">
                    No users found in this pool.
                  </Card>
                ) : (
                  <Card className="p-0 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-[10px] font-mono">
                        <thead className="bg-brand-muted border-b border-brand-text/20">
                          <tr>
                            <th className="p-3">USERNAME</th>
                            <th className="p-3">STATUS</th>
                            <th className="p-3">CREATED</th>
                            <th className="p-3">MODIFIED</th>
                          </tr>
                        </thead>
                        <tbody>
                          {users.map((user) => (
                            <tr key={user.Username} className="border-b border-brand-text/10 last:border-0 hover:bg-brand-muted/10 transition-colors">
                              <td className="p-3 font-bold">{user.Username}</td>
                              <td className="p-3">
                                <span className={`px-1.5 py-0.5 rounded-sm border ${
                                  user.UserStatus === 'CONFIRMED'
                                    ? 'bg-emerald-50 border-emerald-600/30 text-emerald-700'
                                    : 'bg-amber-50 border-amber-600/30 text-amber-700'
                                }`}>
                                  {user.UserStatus}
                                </span>
                              </td>
                              <td className="p-3 opacity-70">
                                {user.UserCreateDate ? new Date(user.UserCreateDate).toLocaleString() : 'N/A'}
                              </td>
                              <td className="p-3 opacity-70">
                                {user.UserLastModifiedDate ? new Date(user.UserLastModifiedDate).toLocaleString() : 'N/A'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                )}
              </>
            ) : (
              <div className="h-full flex items-center justify-center border border-dashed border-brand-text/20 bg-brand-muted/5">
                <p className="text-[10px] font-bold tracking-widest opacity-40">
                  SELECT_A_USER_POOL_TO_VIEW_DETAILS
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
