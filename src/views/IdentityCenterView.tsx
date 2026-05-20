import React, { useState } from 'react';
import { RefreshCw, CirclePlus, Trash2, Shield, Users, Lock, Key, Award, Settings } from 'lucide-react';
import { PageHeader, Card, Button, Input, Modal, Select } from '../components/ui-elements';
import { useAws } from '../contexts/AwsContext';

interface SsoUser {
  id: string;
  username: string;
  email: string;
  groupsCount: number;
  status: 'ACTIVE' | 'SUSPENDED';
}

interface SsoGroup {
  id: string;
  name: string;
  description: string;
  usersCount: number;
}

const IdentityCenterView = () => {
  const { logActivity } = useAws();
  const [activeTab, setActiveTab] = useState<'users' | 'groups' | 'permissions'>('users');
  const [loading, setLoading] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);

  // User input states
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');

  // Group input states
  const [groupName, setGroupName] = useState('');
  const [groupDesc, setGroupDesc] = useState('');

  // Initial user list
  const [users, setUsers] = useState<SsoUser[]>(() => {
    const saved = localStorage.getItem('aws-sim-sso-users');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // Fallback
      }
    }
    return [
      { id: "usr-49a02", username: "pelayo.f", email: "pelayo.f@sandbox.dev", groupsCount: 2, status: 'ACTIVE' },
      { id: "usr-11b0e", username: "yakuphan.core", email: "yakuphan@floci.io", groupsCount: 3, status: 'ACTIVE' }
    ];
  });

  // Initial group list
  const [groups, setGroups] = useState<SsoGroup[]>(() => {
    const saved = localStorage.getItem('aws-sim-sso-groups');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // Fallback
      }
    }
    return [
      { id: "grp-ea21", name: "AdministratorAccessGroup", description: "Provides full root cloud control", usersCount: 2 },
      { id: "grp-9c02", name: "BillingAuditorGroup", description: "Finance read-only access", usersCount: 0 }
    ];
  });

  React.useEffect(() => {
    localStorage.setItem('aws-sim-sso-users', JSON.stringify(users));
  }, [users]);

  React.useEffect(() => {
    localStorage.setItem('aws-sim-sso-groups', JSON.stringify(groups));
  }, [groups]);

  const triggerRefresh = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      logActivity('Identity Center', 'DescribeIdentityCenterMetadata', 'success');
    }, 500);
  };

  const handleCreateUser = () => {
    if (!username || !email) return;
    const cleanUser = username.toLowerCase().replace(/[^a-z0-9-_]/g, '');
    const newUser: SsoUser = {
      id: `usr-${Math.random().toString(36).substring(5)}`,
      username: cleanUser,
      email,
      groupsCount: 0,
      status: 'ACTIVE'
    };

    setUsers(prev => [...prev, newUser]);
    logActivity('Identity Center', `CreateUser: ${cleanUser}`, 'success');
    setIsUserModalOpen(false);
    setUsername('');
    setEmail('');
  };

  const handleCreateGroup = () => {
    if (!groupName) return;
    const cleanGroup = groupName.replace(/[^a-zA-Z0-9-_]/g, '');
    const newGroup: SsoGroup = {
      id: `grp-${Math.random().toString(36).substring(5)}`,
      name: cleanGroup,
      description: groupDesc || 'No description provided',
      usersCount: 0
    };

    setGroups(prev => [...prev, newGroup]);
    logActivity('Identity Center', `CreateGroup: ${cleanGroup}`, 'success');
    setIsGroupModalOpen(false);
    setGroupName('');
    setGroupDesc('');
  };

  const handleDeleteUser = (id: string, name: string) => {
    if (!confirm(`Are you sure you want to remove user ${name}?`)) return;
    setUsers(prev => prev.filter(u => u.id !== id));
    logActivity('Identity Center', `DeleteUser: ${name}`, 'success');
  };

  const handleDeleteGroup = (id: string, name: string) => {
    if (!confirm(`Are you sure you want to remove group ${name}?`)) return;
    setGroups(prev => prev.filter(g => g.id !== id));
    logActivity('Identity Center', `DeleteGroup: ${name}`, 'success');
  };

  return (
    <div className="flex flex-col h-full uppercase">
      <PageHeader
        title="IAM Identity Center"
        icon={<Shield size={18} />}
        onRefresh={triggerRefresh}
        isRefreshing={loading}
        actions={
          activeTab === 'users' ? (
            <Button onClick={() => setIsUserModalOpen(true)} icon={<CirclePlus size={14} />}>
              Add User
            </Button>
          ) : activeTab === 'groups' ? (
            <Button onClick={() => setIsGroupModalOpen(true)} icon={<CirclePlus size={14} />}>
              Create Group
            </Button>
          ) : undefined
        }
      />

      {/* New User Modal */}
      <Modal isOpen={isUserModalOpen} onClose={() => setIsUserModalOpen(false)} title="Add Identity Center User">
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60">Username</label>
            <Input
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="alex.developer"
              autoFocus
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60">Email Address</label>
            <Input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="alex@sandbox.dev"
            />
          </div>
          <div className="pt-4 flex gap-3">
             <Button variant="ghost" className="flex-1" onClick={() => setIsUserModalOpen(false)}>Cancel</Button>
             <Button className="flex-1" onClick={handleCreateUser} disabled={!username || !email}>
               Add User
             </Button>
          </div>
        </div>
      </Modal>

      {/* New Group Modal */}
      <Modal isOpen={isGroupModalOpen} onClose={() => setIsGroupModalOpen(false)} title="Create Identity Store Group">
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60">Group Name</label>
            <Input
              value={groupName}
              onChange={e => setGroupName(e.target.value)}
              placeholder="SysOpsEngineerGroup"
              autoFocus
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60">Description</label>
            <Input
              value={groupDesc}
              onChange={e => setGroupDesc(e.target.value)}
              placeholder="Managed administrators with system access"
            />
          </div>
          <div className="pt-4 flex gap-3">
             <Button variant="ghost" className="flex-1" onClick={() => setIsGroupModalOpen(false)}>Cancel</Button>
             <Button className="flex-1" onClick={handleCreateGroup} disabled={!groupName}>
               Create Group
             </Button>
          </div>
        </div>
      </Modal>

      <div className="p-6 space-y-6 flex-1 overflow-auto bg-brand-bg">
        {/* Navigation Tabs */}
        <div className="flex border-b border-brand-text/10 gap-3">
          {[
            { id: 'users', label: 'Identity Store Users' },
            { id: 'groups', label: 'Groups Registry' },
            { id: 'permissions', label: 'SSO Permission Sets' }
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`pb-2.5 px-2 text-[10px] font-bold border-b-2 transition-all ${
                activeTab === t.id 
                  ? 'border-brand-text text-brand-text font-bold' 
                  : 'border-transparent text-zinc-400 hover:text-black hover:border-brand-text/20'
              }`}
            >
              {t.label.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === 'users' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {users.map(u => (
              <Card key={u.id} className="bg-white hover:border-brand-text transition-all relative">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-2 border border-brand-text bg-brand-muted/10">
                    <Users size={18} />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[8px] font-bold px-1.5 py-0.5 border border-emerald-400 bg-emerald-50 text-emerald-800">
                      {u.status}
                    </span>
                    <button onClick={() => handleDeleteUser(u.id, u.username)} className="p-1 hover:text-rose-600 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <h4 className="font-mono font-bold text-xs truncate">{u.username}</h4>
                <p className="text-[10px] normal-case opacity-50 truncate mt-1">{u.email}</p>

                <div className="mt-6 pt-3 border-t border-brand-text/10 flex justify-between items-center text-[9px] font-mono pr-2">
                  <span className="text-zinc-400">MEMBERSHIPS:</span>
                  <span className="font-bold">{u.groupsCount} GROUPS</span>
                </div>
              </Card>
            ))}
          </div>
        )}

        {activeTab === 'groups' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {groups.map(g => (
              <Card key={g.id} className="bg-white hover:border-brand-text transition-all relative">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-2 border border-brand-text bg-brand-muted/10">
                    <Users size={18} />
                  </div>
                  <button onClick={() => handleDeleteGroup(g.id, g.name)} className="p-1 hover:text-rose-600 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>

                <h4 className="font-mono font-bold text-xs truncate">{g.name}</h4>
                <p className="text-[10px] normal-case opacity-50 truncate mt-1">{g.description}</p>

                <div className="mt-6 pt-3 border-t border-brand-text/10 flex justify-between items-center text-[9px] font-mono pr-2">
                  <span className="text-zinc-400">ASSIGNED_USERS:</span>
                  <span className="font-bold">{g.usersCount} MEMBERS</span>
                </div>
              </Card>
            ))}
          </div>
        )}

        {activeTab === 'permissions' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-white hover:border-brand-text transition-all p-5">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 border border-brand-text bg-brand-muted/10">
                  <Lock size={18} />
                </div>
                <span className="text-[8px] font-bold px-1.5 py-0.5 border border-amber-400 bg-amber-50 text-amber-800">
                  PRE_PROVISIONED
                </span>
              </div>
              <h4 className="font-mono font-bold text-xs">AdministratorAccess</h4>
              <p className="text-[10px] normal-case opacity-50 mt-1">Full cloud privileges, mimics general admin policy sets.</p>
            </Card>

            <Card className="bg-white hover:border-brand-text transition-all p-5">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 border border-brand-text bg-brand-muted/10">
                  <Lock size={18} />
                </div>
                <span className="text-[8px] font-bold px-1.5 py-0.5 border border-amber-400 bg-amber-50 text-amber-800">
                  PRE_PROVISIONED
                </span>
              </div>
              <h4 className="font-mono font-bold text-xs font-serif-italic">ReadOnlyAccess</h4>
              <p className="text-[10px] normal-case opacity-50 mt-1">Audit privileges, allows metadata retrieval of all sub-systems.</p>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default IdentityCenterView;
