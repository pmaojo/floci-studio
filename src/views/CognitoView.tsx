import { useEffect, useState } from 'react';
import { Card, Skeleton, Button } from '../components/ui-elements';
import { Users, UserIcon, Shield, RefreshCw, Key, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface UserPool {
  Id: string;
  Name: string;
  CreationDate: number;
  Status?: string;
  LastModifiedDate?: number;
}

interface User {
  Username: string;
  UserStatus: string;
  UserCreateDate: number;
  UserLastModifiedDate: number;
  Enabled: boolean;
  Attributes: { Name: string; Value: string }[];
}

export default function CognitoView() {
  const [pools, setPools] = useState<UserPool[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedPool, setSelectedPool] = useState<UserPool | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const fetchPools = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/sidecar/api/cognito/pools');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch User Pools');
      setPools(data.pools || []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async (poolId: string) => {
    setLoadingUsers(true);
    try {
      const res = await fetch(`/sidecar/api/cognito/pools/${poolId}/users`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch users');
      setUsers(data.users || []);
    } catch (e) {
      console.error(e);
      setUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    fetchPools();
  }, []);

  useEffect(() => {
    if (selectedPool) {
      fetchUsers(selectedPool.Id);
    } else {
      setUsers([]);
    }
  }, [selectedPool]);

  return (
    <div className="flex flex-col h-full bg-brand-bg relative overflow-hidden">
      {/* Header */}
      <header className="px-6 py-4 border-b border-brand-text bg-brand-bg/95 flex justify-between items-center z-10 shrink-0">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-brand-text flex items-center gap-2">
            <Users size={18} />
            Cognito User Pools
          </h1>
          <p className="text-xs opacity-60 font-mono mt-1">Manage local identities and users</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            icon={<RefreshCw size={14} className={loading ? 'animate-spin' : ''} />}
            onClick={fetchPools}
          >
            Refresh Pools
          </Button>
        </div>
      </header>

      {error && (
        <div className="m-6 p-4 bg-rose-900/20 border border-rose-500/50 text-rose-500 text-sm flex items-center gap-2">
          <Shield size={16} /> {error}
        </div>
      )}

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left: Pool List */}
        <aside className="w-80 border-r border-brand-text/30 bg-white/50 flex flex-col shrink-0">
          <div className="p-3 border-b border-brand-text/20 bg-brand-muted font-mono text-[10px] font-bold uppercase tracking-widest opacity-60">
            Pools ({pools.length})
          </div>
          <div className="flex-1 overflow-auto p-3 space-y-2">
            {loading ? (
              Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)
            ) : pools.length === 0 ? (
              <p className="text-xs text-center opacity-40 mt-10 italic">No user pools found</p>
            ) : (
              pools.map((pool) => (
                <button
                  key={pool.Id}
                  onClick={() => setSelectedPool(pool)}
                  className={`w-full text-left px-3 py-2.5 text-[11px] font-mono border transition-all group ${
                    selectedPool?.Id === pool.Id
                      ? 'bg-brand-text text-brand-bg border-brand-text font-bold'
                      : 'border-transparent hover:bg-white/60 hover:border-brand-text/30'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="truncate font-bold">{pool.Name}</span>
                    <ChevronRight size={10} className="opacity-30" />
                  </div>
                  <p className="text-[8px] opacity-40 mt-0.5 truncate">{pool.Id}</p>
                </button>
              ))
            )}
          </div>
        </aside>

        {/* Right: Pool Details & Users */}
        <main className="flex-1 overflow-auto bg-brand-bg p-6">
          <AnimatePresence mode="wait">
            {!selectedPool ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full flex flex-col items-center justify-center text-center"
              >
                <div className="w-16 h-16 border border-brand-text/20 flex items-center justify-center text-brand-text/20 mb-4">
                  <Users size={30} />
                </div>
                <p className="text-xs opacity-30 uppercase italic">
                  Select a User Pool to inspect its users
                </p>
              </motion.div>
            ) : (
              <motion.div
                key={selectedPool.Id}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-6"
              >
                <div className="border border-brand-text p-4 bg-white/50 flex justify-between items-start">
                  <div className="space-y-2">
                    <h3 className="text-sm font-bold font-mono text-brand-text tracking-tight">{selectedPool.Name}</h3>
                    <p className="text-[10px] font-mono opacity-50">{selectedPool.Id}</p>
                  </div>
                  <div className="text-[9px] font-mono opacity-40 text-right">
                    <p>Created: {new Date(selectedPool.CreationDate * 1000).toLocaleString()}</p>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[8px] font-bold opacity-40 uppercase tracking-widest">
                      Users ({users.length})
                    </p>
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<RefreshCw size={12} className={loadingUsers ? 'animate-spin' : ''} />}
                      onClick={() => fetchUsers(selectedPool.Id)}
                    >
                      Refresh Users
                    </Button>
                  </div>

                  {loadingUsers ? (
                    <Skeleton className="h-40" />
                  ) : users.length === 0 ? (
                    <Card className="text-center py-10 bg-brand-muted/30 border-dashed">
                      <p className="text-[9px] font-bold opacity-30 uppercase">NO_USERS_FOUND</p>
                    </Card>
                  ) : (
                    <div className="space-y-3">
                      {users.map(user => (
                        <Card key={user.Username} className="p-4 bg-white">
                          <div className="flex justify-between items-start mb-4 border-b border-brand-text/10 pb-3">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-brand-muted border border-brand-text/20">
                                <UserIcon size={16} className="opacity-60" />
                              </div>
                              <div>
                                <p className="font-bold text-sm font-mono text-brand-text">{user.Username}</p>
                                <div className="flex gap-2 mt-1">
                                  <span className={`px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-widest ${user.UserStatus === 'CONFIRMED' ? 'bg-brand-green/20 text-brand-green' : 'bg-amber-500/20 text-amber-600'}`}>
                                    {user.UserStatus}
                                  </span>
                                  <span className={`px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-widest ${user.Enabled ? 'bg-brand-text/10 text-brand-text' : 'bg-rose-500/20 text-rose-600'}`}>
                                    {user.Enabled ? 'ENABLED' : 'DISABLED'}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="text-[9px] font-mono opacity-40 text-right">
                              <p>Created: {new Date(user.UserCreateDate * 1000).toLocaleString()}</p>
                              <p>Modified: {new Date(user.UserLastModifiedDate * 1000).toLocaleString()}</p>
                            </div>
                          </div>

                          <div className="bg-brand-console p-3 border border-brand-text/20">
                            <p className="text-[8px] font-bold text-brand-green/50 uppercase tracking-widest mb-2 flex items-center gap-1">
                              <Key size={10} /> Attributes
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
                              {user.Attributes.map(attr => (
                                <div key={attr.Name} className="flex flex-col">
                                  <span className="text-[9px] text-brand-green/60 font-mono">{attr.Name}</span>
                                  <span className="text-xs text-brand-green font-mono font-bold truncate" title={attr.Value}>{attr.Value}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
