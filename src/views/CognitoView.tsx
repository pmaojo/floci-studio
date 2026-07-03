import React, { useState, useEffect } from 'react';
import { RefreshCw, Users, Server, Shield, Plus, Copy, CheckCircle2 } from 'lucide-react';
import { useAws } from '../contexts/AwsContext';
import { Card, PageHeader, Button, Input } from '../components/ui-elements';
import {
  ListUserPoolsCommand,
  CreateUserPoolCommand,
  ListUsersCommand,
  AdminCreateUserCommand,
  type UserPoolDescriptionType,
  type UserType
} from '@aws-sdk/client-cognito-identity-provider';
import { format } from 'date-fns';

export default function CognitoView() {
  const { clients, logActivity } = useAws();
  const [pools, setPools] = useState<UserPoolDescriptionType[]>([]);
  const [loading, setLoading] = useState(false);
  const [newPoolName, setNewPoolName] = useState('');

  // Selected Pool state
  const [selectedPoolId, setSelectedPoolId] = useState<string | null>(null);
  const [users, setUsers] = useState<UserType[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // New User state
  const [newUsername, setNewUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const [copiedPool, setCopiedPool] = useState<string | null>(null);

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPool(type);
    setTimeout(() => setCopiedPool(null), 2000);
  };

  const loadPools = async () => {
    setLoading(true);
    try {
      const response = await clients.cognito.send(new ListUserPoolsCommand({ MaxResults: 10 }));
      setPools(response.UserPools || []);
      logActivity('Cognito', 'ListUserPools', 'success');

      // If we had a selected pool but it's gone, clear selection
      if (selectedPoolId && !response.UserPools?.find(p => p.Id === selectedPoolId)) {
        setSelectedPoolId(null);
      }
    } catch (error: any) {
      logActivity('Cognito', 'ListUserPools', 'error', error.message);
      setPools([]);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async (poolId: string) => {
    setLoadingUsers(true);
    try {
      const response = await clients.cognito.send(new ListUsersCommand({ UserPoolId: poolId }));
      setUsers(response.Users || []);
      logActivity('Cognito', 'ListUsers', 'success', `Pool: ${poolId}`);
    } catch (error: any) {
      logActivity('Cognito', 'ListUsers', 'error', error.message);
      setUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    loadPools();
  }, [clients.cognito]);

  useEffect(() => {
    if (selectedPoolId) {
      loadUsers(selectedPoolId);
    } else {
      setUsers([]);
    }
  }, [selectedPoolId, clients.cognito]);

  const handleCreatePool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPoolName.trim()) return;

    try {
      await clients.cognito.send(new CreateUserPoolCommand({
        PoolName: newPoolName
      }));
      logActivity('Cognito', 'CreateUserPool', 'success', newPoolName);
      setNewPoolName('');
      loadPools();
    } catch (error: any) {
      logActivity('Cognito', 'CreateUserPool', 'error', error.message);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPoolId || !newUsername.trim()) return;

    try {
      const params: any = {
        UserPoolId: selectedPoolId,
        Username: newUsername,
        UserAttributes: [],
        MessageAction: 'SUPPRESS' // Don't try to send emails from local emulator by default
      };

      if (newEmail) {
        params.UserAttributes.push({ Name: 'email', Value: newEmail });
      }

      if (newPassword) {
        params.TemporaryPassword = newPassword;
      }

      await clients.cognito.send(new AdminCreateUserCommand(params));
      logActivity('Cognito', 'AdminCreateUser', 'success', `${newUsername} in ${selectedPoolId}`);

      setNewUsername('');
      setNewEmail('');
      setNewPassword('');
      loadUsers(selectedPoolId);
    } catch (error: any) {
      logActivity('Cognito', 'AdminCreateUser', 'error', error.message);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-brand-bg">
      <PageHeader
        title="Cognito User Pools"
        icon={<Shield size={24} className="text-brand-text" />}
        subtitle="Manage identity providers, user pools, and developer authentication natively."
      />

      <div className="flex-1 overflow-auto p-4 lg:p-6 lg:ml-64 space-y-6">

        {/* Pool Creation & List Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

          {/* Create Pool Card */}
          <Card className="xl:col-span-1 bg-white p-5 border-brand-text shadow-[4px_4px_0px_0px_rgba(20,20,20,1)] flex flex-col">
            <h3 className="font-mono text-xs font-bold uppercase mb-4 text-brand-text flex items-center gap-2">
              <Plus size={14} /> Create User Pool
            </h3>
            <form onSubmit={handleCreatePool} className="space-y-4 flex-1">
              <div>
                <label className="block text-[10px] font-mono opacity-50 mb-1 uppercase">Pool Name</label>
                <Input
                  placeholder="e.g., prod-users-pool"
                  value={newPoolName}
                  onChange={e => setNewPoolName(e.target.value)}
                  className="font-mono text-xs"
                />
              </div>
              <Button
                type="submit"
                disabled={!newPoolName.trim()}
                className="w-full bg-brand-text text-white hover:bg-brand-text/90"
              >
                Provision Pool
              </Button>
            </form>
          </Card>

          {/* Pools List */}
          <Card className="xl:col-span-2 p-0 flex flex-col h-full max-h-[300px]">
            <div className="p-4 border-b border-brand-text flex justify-between items-center bg-brand-muted shrink-0">
              <h3 className="font-mono text-xs font-bold uppercase text-brand-text flex items-center gap-2">
                <Server size={14} /> Active Pools
                <span className="bg-brand-text text-white px-1.5 py-0.5 text-[9px] rounded-sm ml-2">
                  {pools.length}
                </span>
              </h3>
              <Button onClick={loadPools} disabled={loading} variant="secondary" className="h-7 px-2">
                <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
              </Button>
            </div>

            <div className="flex-1 overflow-auto bg-white p-2">
              {pools.length === 0 ? (
                <div className="h-full flex items-center justify-center text-center opacity-40 p-4">
                  <p className="font-mono text-[10px] uppercase">No User Pools found.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {pools.map(pool => (
                    <div
                      key={pool.Id}
                      onClick={() => setSelectedPoolId(pool.Id || null)}
                      className={`border p-3 cursor-pointer transition-colors ${
                        selectedPoolId === pool.Id
                          ? 'border-brand-text bg-brand-muted/30 shadow-[2px_2px_0px_0px_rgba(20,20,20,1)]'
                          : 'border-brand-text/20 hover:border-brand-text/50 bg-white'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-bold text-sm text-brand-text">{pool.Name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="font-mono text-[9px] opacity-60">ID: {pool.Id}</span>
                            <button
                              onClick={(e) => { e.stopPropagation(); copyToClipboard(pool.Id || '', pool.Id || ''); }}
                              className="opacity-40 hover:opacity-100 transition-opacity"
                            >
                              {copiedPool === pool.Id ? <CheckCircle2 size={10} className="text-emerald-500" /> : <Copy size={10} />}
                            </button>
                          </div>
                        </div>
                        <span className="text-[10px] bg-brand-text/10 px-2 py-0.5 rounded-sm font-mono opacity-70">
                          {pool.Status || 'ACTIVE'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Users Section (Only visible when a pool is selected) */}
        {selectedPoolId && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-300">

            {/* Create User Card */}
            <Card className="xl:col-span-1 bg-brand-muted/20 p-5 border-brand-text flex flex-col">
              <h3 className="font-mono text-xs font-bold uppercase mb-4 text-brand-text flex items-center gap-2">
                <Plus size={14} /> Add User
              </h3>
              <form onSubmit={handleCreateUser} className="space-y-3 flex-1">
                <div>
                  <label className="block text-[10px] font-mono opacity-50 mb-1 uppercase">Username *</label>
                  <Input
                    placeholder="johndoe"
                    value={newUsername}
                    onChange={e => setNewUsername(e.target.value)}
                    className="font-mono text-xs h-8"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono opacity-50 mb-1 uppercase">Email</label>
                  <Input
                    placeholder="john@example.com"
                    type="email"
                    value={newEmail}
                    onChange={e => setNewEmail(e.target.value)}
                    className="font-mono text-xs h-8"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono opacity-50 mb-1 uppercase">Temp Password</label>
                  <Input
                    placeholder="Pass123!"
                    type="password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    className="font-mono text-xs h-8"
                  />
                </div>
                <div className="pt-2">
                  <Button
                    type="submit"
                    disabled={!newUsername.trim()}
                    className="w-full bg-brand-text text-white hover:bg-brand-text/90 h-8 text-xs"
                  >
                    Create User
                  </Button>
                </div>
              </form>
            </Card>

            {/* Users List */}
            <Card className="xl:col-span-2 p-0 flex flex-col h-full min-h-[400px]">
              <div className="p-4 border-b border-brand-text flex justify-between items-center bg-white shrink-0">
                <div>
                  <h3 className="font-mono text-xs font-bold uppercase text-brand-text flex items-center gap-2">
                    <Users size={14} /> Pool Users
                    <span className="bg-brand-text text-white px-1.5 py-0.5 text-[9px] rounded-sm ml-2">
                      {users.length}
                    </span>
                  </h3>
                  <p className="text-[9px] font-mono opacity-50 mt-1">Pool: {selectedPoolId}</p>
                </div>
                <Button onClick={() => loadUsers(selectedPoolId)} disabled={loadingUsers} variant="secondary" className="h-7 px-2">
                  <RefreshCw size={12} className={loadingUsers ? "animate-spin" : ""} />
                </Button>
              </div>

              <div className="flex-1 overflow-auto bg-brand-bg p-4">
                {users.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-center opacity-40 p-4">
                    <div className="flex flex-col items-center">
                      <Users size={24} className="mb-2 opacity-50" />
                      <p className="font-mono text-[10px] uppercase">No users in this pool.</p>
                    </div>
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-brand-text bg-white">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-brand-muted border-b border-brand-text">
                          <th className="p-2 text-[10px] font-mono uppercase opacity-70">Username</th>
                          <th className="p-2 text-[10px] font-mono uppercase opacity-70">Status</th>
                          <th className="p-2 text-[10px] font-mono uppercase opacity-70">Enabled</th>
                          <th className="p-2 text-[10px] font-mono uppercase opacity-70">Created</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map(user => (
                          <tr key={user.Username} className="border-b border-brand-text/10 hover:bg-brand-muted/20">
                            <td className="p-2 font-mono text-xs font-bold text-brand-text">
                              {user.Username}
                            </td>
                            <td className="p-2">
                              <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded-sm ${
                                user.UserStatus === 'CONFIRMED'
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                  : 'bg-amber-100 text-amber-800 border border-amber-200'
                              }`}>
                                {user.UserStatus}
                              </span>
                            </td>
                            <td className="p-2">
                              <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded-sm ${
                                user.Enabled
                                  ? 'text-emerald-600'
                                  : 'text-rose-600'
                              }`}>
                                {user.Enabled ? 'YES' : 'NO'}
                              </span>
                            </td>
                            <td className="p-2 text-[10px] font-mono opacity-60">
                              {user.UserCreateDate ? format(new Date(user.UserCreateDate), 'yyyy-MM-dd HH:mm') : 'N/A'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}

      </div>
    </div>
  );
}
