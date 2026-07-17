import React, { useState, useEffect, useCallback } from 'react';
import {
  ListUserPoolsCommand,
  CreateUserPoolCommand,
  DeleteUserPoolCommand,
  ListUsersCommand
} from '@aws-sdk/client-cognito-identity-provider';
import { useAws } from '../contexts/AwsContext';
import { Users, Search, CirclePlus, User, Trash2 } from 'lucide-react';
import { PageHeader, Card, Button, Input, Skeleton, Modal } from '../components/ui-elements';
import { format } from 'date-fns';

const CognitoView = () => {
  const { clients, logActivity } = useAws();
  const [userPools, setUserPools] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const [isCreationModalOpen, setIsCreationModalOpen] = useState(false);
  const [newPoolName, setNewPoolName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const [selectedPoolId, setSelectedPoolId] = useState<string | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const fetchUserPools = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await clients.cognito.send(new ListUserPoolsCommand({ MaxResults: 10 }));
      setUserPools(response.UserPools || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err) || 'Failed to fetch User Pools');
    } finally {
      setLoading(false);
    }
  }, [clients.cognito]);

  useEffect(() => {
    fetchUserPools();
  }, [fetchUserPools]);

  const handleCreatePool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPoolName) return;

    setIsCreating(true);
    try {
      await clients.cognito.send(new CreateUserPoolCommand({ PoolName: newPoolName }));
      logActivity('Cognito', 'CreateUserPool', 'success', newPoolName);
      setIsCreationModalOpen(false);
      setNewPoolName('');
      fetchUserPools();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      logActivity('Cognito', 'CreateUserPool', 'error', msg);
      setError(msg);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeletePool = async (poolId: string) => {
    if (!window.confirm('Are you sure you want to delete this User Pool?')) return;

    try {
      await clients.cognito.send(new DeleteUserPoolCommand({ UserPoolId: poolId }));
      logActivity('Cognito', 'DeleteUserPool', 'success', poolId);
      if (selectedPoolId === poolId) {
        setSelectedPoolId(null);
      }
      fetchUserPools();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      logActivity('Cognito', 'DeleteUserPool', 'error', msg);
    }
  };

  const handleSelectPool = async (poolId: string) => {
    setSelectedPoolId(poolId);
    setLoadingUsers(true);
    try {
      const response = await clients.cognito.send(new ListUsersCommand({ UserPoolId: poolId }));
      setUsers(response.Users || []);
      logActivity('Cognito', 'ListUsers', 'success', poolId);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      logActivity('Cognito', 'ListUsers', 'error', msg);
      setUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  const filteredPools = userPools.filter(p =>
    p.Name?.toLowerCase().includes(search.toLowerCase()) ||
    p.Id?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Cognito User Pools"
        icon={<Users size={24} className="text-brand-text" />}
        description="Manage user directories, identity pools and developer authentication."
        actions={
          <Button onClick={() => setIsCreationModalOpen(true)}>
            <CirclePlus size={16} className="mr-2" />
            Create Pool
          </Button>
        }
      />

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 font-mono text-sm">
          {error}
        </div>
      )}

      <div className="flex gap-6">
        <div className="flex-1 space-y-4">
          <Input
            placeholder="Search user pools..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={<Search size={16} />}
          />

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-20" />)}
            </div>
          ) : filteredPools.length === 0 ? (
            <Card className="p-8 text-center text-neutral-500">
              No User Pools found.
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredPools.map(pool => (
                <Card
                  key={pool.Id}
                  className={`p-4 hover:border-brand-text transition-colors cursor-pointer ${
                    selectedPoolId === pool.Id ? 'border-brand-text ring-1 ring-brand-text' : ''
                  }`}
                  onClick={() => handleSelectPool(pool.Id)}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-neutral-800">{pool.Name}</h3>
                      <p className="font-mono text-xs text-neutral-500 mt-1">{pool.Id}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs bg-neutral-100 px-2 py-1 font-mono text-neutral-600">
                        {pool.Status || 'Active'}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeletePool(pool.Id);
                        }}
                        className="text-neutral-400 hover:text-rose-500 transition-colors p-1"
                        title="Delete User Pool"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-500">
                    <span className="font-mono">
                      Created: {pool.CreationDate ? format(new Date(pool.CreationDate), 'yyyy-MM-dd HH:mm:ss') : '-'}
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div className="w-96 shrink-0">
          <Card className="p-4 sticky top-6">
            <h3 className="font-bold border-b border-neutral-100 pb-3 mb-3 flex items-center">
              <User size={16} className="mr-2 text-brand-text" />
              Users
            </h3>

            {!selectedPoolId ? (
              <div className="text-sm text-neutral-500 text-center py-8">
                Select a User Pool to view its users.
              </div>
            ) : loadingUsers ? (
              <div className="space-y-3">
                {[1, 2].map(i => <Skeleton key={i} className="h-12" />)}
              </div>
            ) : users.length === 0 ? (
              <div className="text-sm text-neutral-500 text-center py-8">
                No users found in this pool.
              </div>
            ) : (
              <div className="space-y-3">
                {users.map(user => (
                  <div key={user.Username} className="bg-neutral-50 p-3 text-sm">
                    <div className="font-bold text-neutral-800">{user.Username}</div>
                    <div className="text-xs text-neutral-500 mt-1">Status: {user.UserStatus}</div>
                    <div className="text-xs font-mono text-neutral-400 mt-1">
                      {format(new Date(user.UserCreateDate), 'yyyy-MM-dd HH:mm')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      <Modal
        isOpen={isCreationModalOpen}
        onClose={() => setIsCreationModalOpen(false)}
        title="Create User Pool"
      >
        <form onSubmit={handleCreatePool} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Pool Name
            </label>
            <Input
              value={newPoolName}
              onChange={(e) => setNewPoolName(e.target.value)}
              placeholder="e.g. my-app-users"
              autoFocus
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              variant="secondary"
              type="button"
              onClick={() => setIsCreationModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!newPoolName || isCreating}
            >
              {isCreating ? 'Creating...' : 'Create User Pool'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default CognitoView;
