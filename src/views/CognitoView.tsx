import { useState, useEffect, useCallback } from 'react';
import {
  ListUserPoolsCommand,
  CreateUserPoolCommand,
  DeleteUserPoolCommand,
  ListUsersCommand,
  AdminCreateUserCommand,
  AdminDeleteUserCommand
} from '@aws-sdk/client-cognito-identity-provider';
import { useAws } from '../contexts/AwsContext';
import {
  Users,
  CirclePlus,
  Trash2,
  User,
  ArrowLeft,
  Shield
} from 'lucide-react';
import { PageHeader, Card, Button, Input, Skeleton, Modal } from '../components/ui-elements';

const CognitoView = () => {
  const { clients, logActivity } = useAws();

  // Pools level state
  const [pools, setPools] = useState<any[]>([]);
  const [loadingPools, setLoadingPools] = useState(true);
  const [isPoolModalOpen, setIsPoolModalOpen] = useState(false);
  const [newPoolName, setNewPoolName] = useState('');
  const [isCreatingPool, setIsCreatingPool] = useState(false);

  // Users level state
  const [selectedPoolId, setSelectedPoolId] = useState<string | null>(null);
  const [selectedPoolName, setSelectedPoolName] = useState<string>('');
  const [users, setUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Create User Modal state
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isCreatingUser, setIsCreatingUser] = useState(false);

  // Initial load
  const loadPools = useCallback(async () => {
    setLoadingPools(true);
    try {
      const response = await clients.cognito.send(new ListUserPoolsCommand({ MaxResults: 60 }));
      setPools(response.UserPools || []);
      logActivity('Cognito', 'ListUserPools', 'success');
    } catch (error) {
      console.error(error);
      logActivity('Cognito', 'ListUserPools', 'error', (error as Error).message);
    } finally {
      setLoadingPools(false);
    }
  }, [clients.cognito, logActivity]);

  useEffect(() => {
    loadPools();
  }, [loadPools]);

  // Load users when pool is selected
  const loadUsers = useCallback(async (poolId: string) => {
    setLoadingUsers(true);
    try {
      const response = await clients.cognito.send(new ListUsersCommand({
        UserPoolId: poolId
      }));
      setUsers(response.Users || []);
      logActivity('Cognito', 'ListUsers', 'success', `Pool: ${poolId}`);
    } catch (error) {
      console.error(error);
      logActivity('Cognito', 'ListUsers', 'error', (error as Error).message);
    } finally {
      setLoadingUsers(false);
    }
  }, [clients.cognito, logActivity]);

  // Actions
  const handleCreatePool = async () => {
    if (!newPoolName.trim()) return;
    setIsCreatingPool(true);
    try {
      await clients.cognito.send(new CreateUserPoolCommand({
        PoolName: newPoolName
      }));
      logActivity('Cognito', 'CreateUserPool', 'success', newPoolName);
      setIsPoolModalOpen(false);
      setNewPoolName('');
      loadPools();
    } catch (error) {
      console.error(error);
      logActivity('Cognito', 'CreateUserPool', 'error', (error as Error).message);
    } finally {
      setIsCreatingPool(false);
    }
  };

  const handleDeletePool = async (poolId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Are you sure you want to delete pool ${poolId}?`)) return;
    try {
      await clients.cognito.send(new DeleteUserPoolCommand({ UserPoolId: poolId }));
      logActivity('Cognito', 'DeleteUserPool', 'success', poolId);
      loadPools();
      if (selectedPoolId === poolId) {
        setSelectedPoolId(null);
      }
    } catch (error) {
      console.error(error);
      logActivity('Cognito', 'DeleteUserPool', 'error', (error as Error).message);
    }
  };

  const handleCreateUser = async () => {
    if (!newUsername.trim() || !selectedPoolId) return;
    setIsCreatingUser(true);
    try {
      const userAttributes = [];
      if (newEmail) {
        userAttributes.push({ Name: 'email', Value: newEmail });
      }

      const cmdParams: any = {
        UserPoolId: selectedPoolId,
        Username: newUsername,
        UserAttributes: userAttributes,
      };

      if (newPassword) {
        cmdParams.TemporaryPassword = newPassword;
        cmdParams.MessageAction = 'SUPPRESS';
      }

      await clients.cognito.send(new AdminCreateUserCommand(cmdParams));
      logActivity('Cognito', 'AdminCreateUser', 'success', newUsername);
      setIsUserModalOpen(false);
      setNewUsername('');
      setNewEmail('');
      setNewPassword('');
      loadUsers(selectedPoolId);
    } catch (error) {
      console.error(error);
      logActivity('Cognito', 'AdminCreateUser', 'error', (error as Error).message);
    } finally {
      setIsCreatingUser(false);
    }
  };

  const handleDeleteUser = async (username: string) => {
    if (!selectedPoolId || !confirm(`Are you sure you want to delete user ${username}?`)) return;
    try {
      await clients.cognito.send(new AdminDeleteUserCommand({
        UserPoolId: selectedPoolId,
        Username: username
      }));
      logActivity('Cognito', 'AdminDeleteUser', 'success', username);
      loadUsers(selectedPoolId);
    } catch (error) {
      console.error(error);
      logActivity('Cognito', 'AdminDeleteUser', 'error', (error as Error).message);
    }
  };

  const selectPool = (poolId: string, poolName: string) => {
    setSelectedPoolId(poolId);
    setSelectedPoolName(poolName);
    loadUsers(poolId);
  };

  // Views
  if (selectedPoolId) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={selectedPoolName}
          subtitle={`Managing users for pool ID: ${selectedPoolId}`}
          icon={<Users size={24} className="text-brand-text" />}
          actions={
            <Button variant="secondary" onClick={() => setSelectedPoolId(null)}>
              <ArrowLeft size={14} className="mr-2" />
              Back to Pools
            </Button>
          }
        />

        <div className="flex justify-between items-center bg-white p-4 border border-brand-text/10 shadow-xs">
          <div className="flex gap-4">
             <Button variant="primary" onClick={() => setIsUserModalOpen(true)}>
                <CirclePlus size={14} className="mr-2" />
                Create User
             </Button>
             <Button variant="secondary" onClick={() => loadUsers(selectedPoolId)}>
                Refresh
             </Button>
          </div>
        </div>

        <Card>
          {loadingUsers ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-brand-text/30 bg-brand-muted/10">
              <User size={24} className="mx-auto mb-2 opacity-30" />
              <p className="text-[11px] font-bold opacity-50 uppercase tracking-widest">No users found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-brand-text/10 bg-brand-muted/20 text-[10px] uppercase tracking-widest opacity-60">
                    <th className="p-3 font-bold">Username</th>
                    <th className="p-3 font-bold">Status</th>
                    <th className="p-3 font-bold">Created</th>
                    <th className="p-3 font-bold">Attributes</th>
                    <th className="p-3 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => {
                    const emailAttr = user.Attributes?.find((a: any) => a.Name === 'email')?.Value;
                    return (
                      <tr key={user.Username} className="border-b border-brand-text/5 hover:bg-brand-muted/10 transition-colors">
                        <td className="p-3 font-mono font-bold text-brand-text">{user.Username}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-sm text-[9px] font-bold tracking-wider ${user.UserStatus === 'CONFIRMED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                            {user.UserStatus}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-neutral-500">
                          {user.UserCreateDate ? new Date(user.UserCreateDate).toLocaleString() : 'N/A'}
                        </td>
                        <td className="p-3 text-[10px] text-neutral-500 font-mono">
                           {emailAttr ? `email: ${emailAttr}` : '-'}
                        </td>
                        <td className="p-3 text-right">
                          <Button
                            variant="danger"
                            className="px-2 py-1 h-auto text-[10px]"
                            onClick={() => handleDeleteUser(user.Username!)}
                          >
                            <Trash2 size={12} />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Create User Modal */}
        <Modal
          isOpen={isUserModalOpen}
          onClose={() => setIsUserModalOpen(false)}
          title="Create New User"
        >
          <div className="space-y-4 font-mono">
            <div>
              <label className="block text-[10px] font-bold opacity-50 mb-1 uppercase tracking-wider">Username</label>
              <Input
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="e.g. testuser"
                className="w-full text-xs"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold opacity-50 mb-1 uppercase tracking-wider">Email (Optional)</label>
              <Input
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="e.g. test@example.com"
                className="w-full text-xs"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold opacity-50 mb-1 uppercase tracking-wider">Temporary Password (Optional)</label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="e.g. TempPass123!"
                className="w-full text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="secondary" onClick={() => setIsUserModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleCreateUser}
                disabled={!newUsername.trim() || isCreatingUser}
              >
                {isCreatingUser ? 'Creating...' : 'Create User'}
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    );
  }

  // Pools List View
  return (
    <div className="space-y-6">
      <PageHeader
        title="Cognito User Pools"
        subtitle="Local native Cognito emulation via localstack"
        icon={<Shield size={24} className="text-brand-text" />}
        actions={
          <Button variant="primary" onClick={() => setIsPoolModalOpen(true)}>
            <CirclePlus size={14} className="mr-2" />
            Create Pool
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loadingPools ? (
          [1, 2, 3].map(i => (
            <Card key={i} className="min-h-[120px] flex items-center justify-center">
              <Skeleton className="h-4 w-1/2" />
            </Card>
          ))
        ) : pools.length === 0 ? (
          <div className="col-span-full py-16 text-center border border-dashed border-brand-text/30 bg-brand-muted/20">
            <Users size={28} className="mx-auto mb-2 opacity-25" />
            <p className="text-[10px] font-bold opacity-40 tracking-wider">NO USER POOLS FOUND</p>
          </div>
        ) : (
          pools.map(pool => (
            <Card
              key={pool.Id}
              className="group cursor-pointer hover:border-brand-text transition-colors relative p-5"
              onClick={() => selectPool(pool.Id, pool.Name)}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-sm text-brand-text tracking-tight group-hover:text-brand-text/80 transition-colors">
                    {pool.Name}
                  </h3>
                  <p className="text-[9px] font-mono opacity-50 mt-1">{pool.Id}</p>
                </div>
                <div className="p-2 bg-brand-muted/30 rounded-full group-hover:bg-brand-text group-hover:text-white transition-colors">
                  <Users size={14} className="opacity-50 group-hover:opacity-100" />
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-brand-text/5 flex justify-between items-center text-[10px] font-mono text-neutral-500">
                <span className="flex items-center gap-1">
                   Created: {new Date(pool.CreationDate).toLocaleDateString()}
                </span>

                <button
                  onClick={(e) => handleDeletePool(pool.Id, e)}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 transition-all text-neutral-400"
                  title="Delete Pool"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Create Pool Modal */}
      <Modal
        isOpen={isPoolModalOpen}
        onClose={() => setIsPoolModalOpen(false)}
        title="Create User Pool"
      >
        <div className="space-y-4 font-mono">
          <div>
            <label className="block text-[10px] font-bold opacity-50 mb-1 uppercase tracking-wider">Pool Name</label>
            <Input
              value={newPoolName}
              onChange={(e) => setNewPoolName(e.target.value)}
              placeholder="e.g. MyUsers"
              className="w-full text-xs"
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="secondary" onClick={() => setIsPoolModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleCreatePool}
              disabled={!newPoolName.trim() || isCreatingPool}
            >
              {isCreatingPool ? 'Creating...' : 'Create Pool'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default CognitoView;
