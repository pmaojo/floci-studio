import React, { useState, useEffect } from 'react';
import { ListUserPoolsCommand, CreateUserPoolCommand, DeleteUserPoolCommand } from '@aws-sdk/client-cognito-identity-provider';
import { useAws } from '../contexts/AwsContext';
import { Users, Search, CirclePlus, Trash2, Key, ShieldCheck, Mail, Settings, ShieldAlert, Award } from 'lucide-react';
import { PageHeader, Card, Button, Input, Skeleton, Modal } from '../components/ui-elements';

interface IdentityPool {
  id: string;
  name: string;
  allowUnauthenticated: boolean;
  developerProviderName?: string;
}

const CognitoView = () => {
  const { clients, logActivity } = useAws();
  
  // Tab states: 'user-pools' or 'identity-pools'
  const [activeTab, setActiveTab] = useState<'user-pools' | 'identity-pools'>('user-pools');

  // User Pools lists
  const [pools, setPools] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreationModalOpen, setIsCreationModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Identity Pools lists
  const [idPools, setIdPools] = useState<IdentityPool[]>(() => {
    const saved = localStorage.getItem('aws-sim-cognito-id-pools');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // Fallback below
      }
    }
    return [
      { id: "eu-central-1:5bc9-4ca2", name: "AppIdentityPoolMobile", allowUnauthenticated: false }
    ];
  });

  useEffect(() => {
    localStorage.setItem('aws-sim-cognito-id-pools', JSON.stringify(idPools));
  }, [idPools]);

  const [isIdPoolModalOpen, setIsIdPoolModalOpen] = useState(false);
  const [idPoolName, setIdPoolName] = useState('');
  const [allowUnauth, setAllowUnauth] = useState(false);

  const fetchPools = async () => {
    setLoading(true);
    try {
      const response = await clients.cognito.send(new ListUserPoolsCommand({ MaxResults: 60 }));
      setPools(response.UserPools || []);
      logActivity('Cognito', 'ListUserPools', 'success');
    } catch (err: any) {
      logActivity('Cognito', 'ListUserPools failed', 'error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newName) return;
    setIsCreating(true);
    try {
      await clients.cognito.send(new CreateUserPoolCommand({ PoolName: newName }));
      logActivity('Cognito', `CreateUserPool: ${newName}`, 'success');
      setNewName('');
      setIsCreationModalOpen(false);
      fetchPools();
    } catch (err: any) {
      logActivity('Cognito', `CreateUserPool failed: ${newName}`, 'error', err.message);
      alert(err.message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete User Pool ${name}?`)) return;
    try {
      await clients.cognito.send(new DeleteUserPoolCommand({ UserPoolId: id }));
      logActivity('Cognito', `DeleteUserPool: ${name}`, 'success');
      fetchPools();
    } catch (err: any) {
      logActivity('Cognito', `DeleteUserPool failed: ${name}`, 'error', err.message);
      alert(err.message);
    }
  };

  const handleCreateIdentityPool = () => {
    if (!idPoolName) return;
    const cleanName = idPoolName.replace(/[^a-zA-Z0-9-_]/g, '');
    const newPool: IdentityPool = {
      id: `eu-central-1:${Math.random().toString(16).substring(2,6)}-${Math.random().toString(16).substring(2,6)}`,
      name: cleanName,
      allowUnauthenticated: allowUnauth
    };

    setIdPools(prev => [...prev, newPool]);
    logActivity('Cognito', `CreateIdentityPool: ${cleanName}`, 'success');
    setIdPoolName('');
    setAllowUnauth(false);
    setIsIdPoolModalOpen(false);
  };

  const handleDeleteIdentityPool = (id: string, name: string) => {
    if (!confirm(`Delete Cognito Identity Pool ${name}?`)) return;
    setIdPools(prev => prev.filter(p => p.id !== id));
    logActivity('Cognito', `DeleteIdentityPool: ${name}`, 'success');
  };

  useEffect(() => {
    fetchPools();
  }, []);

  return (
    <div className="flex flex-col h-full uppercase">
      <PageHeader 
        title="Cognito User & Identity Pools" 
        icon={<Users size={18} />}
        onRefresh={fetchPools}
        isRefreshing={loading}
        actions={
          activeTab === 'user-pools' ? (
            <Button onClick={() => setIsCreationModalOpen(true)} icon={<CirclePlus size={14} />}>
              New User Pool
            </Button>
          ) : (
            <Button onClick={() => setIsIdPoolModalOpen(true)} icon={<CirclePlus size={14} />}>
              New Identity Pool
            </Button>
          )
        }
      />

      {/* Create User Pool Modal */}
      <Modal 
        isOpen={isCreationModalOpen} 
        onClose={() => setIsCreationModalOpen(false)} 
        title="Create User Pool"
      >
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60">Pool Name</label>
            <Input 
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="AppUsers"
              autoFocus
            />
          </div>
          <div className="pt-4 flex gap-3">
             <Button variant="ghost" className="flex-1" onClick={() => setIsCreationModalOpen(false)}>Cancel</Button>
             <Button className="flex-1" onClick={handleCreate} disabled={!newName || isCreating}>
               {isCreating ? 'Creating...' : 'Create Pool'}
             </Button>
          </div>
        </div>
      </Modal>

      {/* Create Identity Pool Modal */}
      <Modal 
        isOpen={isIdPoolModalOpen} 
        onClose={() => setIsIdPoolModalOpen(false)} 
        title="Create Identity Pool"
      >
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60">Identity Pool Name</label>
            <Input 
              value={idPoolName}
              onChange={e => setIdPoolName(e.target.value)}
              placeholder="MobileAppIdPool"
              autoFocus
            />
          </div>
          <div className="flex items-center gap-2 pt-2">
            <input 
              type="checkbox" 
              id="unauth" 
              checked={allowUnauth}
              onChange={e => setAllowUnauth(e.target.checked)}
              className="accent-brand-text border border-brand-text/30"
            />
            <label htmlFor="unauth" className="text-[10px] font-bold uppercase opacity-60 cursor-pointer select-none">
              Allow Unauthenticated Identities
            </label>
          </div>
          <div className="pt-4 flex gap-3">
             <Button variant="ghost" className="flex-1" onClick={() => setIsIdPoolModalOpen(false)}>Cancel</Button>
             <Button className="flex-1" onClick={handleCreateIdentityPool} disabled={!idPoolName}>
               Create Pool
             </Button>
          </div>
        </div>
      </Modal>

      <div className="p-6 flex flex-col space-y-6 flex-grow overflow-auto bg-brand-bg">
        {/* Sub tabs selector */}
        <div className="flex border-b border-brand-text/10 gap-3">
          <button
            onClick={() => setActiveTab('user-pools')}
            className={`pb-2.5 px-2 text-[10px] font-bold border-b-2 transition-all ${
              activeTab === 'user-pools' 
                ? 'border-brand-text text-brand-text font-bold' 
                : 'border-transparent text-zinc-400 hover:text-black hover:border-brand-text/20'
            }`}
          >
            USER POOLS (DIRECTORY)
          </button>
          <button
            onClick={() => setActiveTab('identity-pools')}
            className={`pb-2.5 px-2 text-[10px] font-bold border-b-2 transition-all ${
              activeTab === 'identity-pools' 
                ? 'border-brand-text text-brand-text font-bold' 
                : 'border-transparent text-zinc-400 hover:text-black hover:border-brand-text/20'
            }`}
          >
            IDENTITY POOLS (FEDERATION)
          </button>
        </div>

        {/* User Pools Grid */}
        {activeTab === 'user-pools' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {loading ? (
              [1, 2, 3].map(i => <Skeleton key={i} className="h-36" />)
            ) : pools.length === 0 ? (
              <div className="col-span-full py-20 text-center border border-dashed border-brand-text/20">
                 <p className="text-xs opacity-40 font-mono italic">NO_USER_POOLS_ACTIVE</p>
              </div>
            ) : (
              pools.map(pool => (
                <Card key={pool.Id} className="group hover:border-brand-text transition-all bg-white relative">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-2 bg-brand-muted border border-brand-text">
                      <ShieldCheck size={20} />
                    </div>
                    <button onClick={() => handleDelete(pool.Id!, pool.Name!)} className="p-1 hover:text-rose-600">
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <h4 className="font-bold text-xs truncate mb-1">{pool.Name}</h4>
                  <p className="text-[9px] font-mono opacity-50 truncate">{pool.Id}</p>
                  
                  <div className="mt-6 pt-3 border-t border-brand-text/5 grid grid-cols-2 gap-2">
                    <div className="flex items-center gap-1 text-[8px] font-bold opacity-30">
                      <Mail size={10} /> MFA: OFF
                    </div>
                    <div className="flex items-center gap-1 text-[8px] font-bold opacity-30">
                      <Key size={10} /> CLIENTS: 0
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        ) : (
          /* Identity Pools Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {idPools.length === 0 ? (
              <div className="col-span-full py-20 text-center border border-dashed border-brand-text/20">
                 <p className="text-xs opacity-40 font-mono italic">NO_IDENTITY_POOLS_ACTIVE</p>
              </div>
            ) : (
              idPools.map(pool => (
                <Card key={pool.id} className="group hover:border-brand-text transition-all bg-white relative">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-2 bg-brand-muted border border-brand-text">
                      <Award size={20} />
                    </div>
                    <button onClick={() => handleDeleteIdentityPool(pool.id!, pool.name!)} className="p-1 hover:text-rose-600">
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <h4 className="font-bold text-xs truncate mb-1">{pool.name}</h4>
                  <p className="text-[9px] font-mono opacity-50 truncate">{pool.id}</p>
                  
                  <div className="mt-6 pt-3 border-t border-brand-text/5 grid grid-cols-2 gap-2 text-[10px]">
                    <div className="flex items-center gap-1 text-[8px] font-bold opacity-35">
                      <ShieldAlert size={10} /> UNAUTHENTICATED: {pool.allowUnauthenticated ? 'ALLOWED' : 'DENIED'}
                    </div>
                    <div className="flex items-center gap-1 text-[8px] font-bold opacity-35">
                      <Settings size={10} /> PROVIDERS: COGNITO IDP
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CognitoView;
