import React, { useState, useEffect } from 'react';
import {
  // Roles
  ListRolesCommand,
  CreateRoleCommand,
  DeleteRoleCommand,
  ListRolePoliciesCommand,
  ListAttachedRolePoliciesCommand,
  // Users
  ListUsersCommand,
  CreateUserCommand,
  DeleteUserCommand,
  ListUserPoliciesCommand,
  ListAttachedUserPoliciesCommand,
  // Managed Policies
  ListPoliciesCommand,
  CreatePolicyCommand,
  DeletePolicyCommand,
  GetPolicyVersionCommand,
} from '@aws-sdk/client-iam';
import type { Role, User, Policy, AttachedPolicy } from '@aws-sdk/client-iam';
import { useAws } from '../contexts/AwsContext';
import {
  Users,
  Search,
  Shield,
  FileText,
  ChevronRight,
  CirclePlus,
  Trash2,
  User,
  Code,
} from 'lucide-react';
import { PageHeader, Card, Button, Input, Skeleton, Modal, Select } from '../components/ui-elements';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';

// ─── Types ────────────────────────────────────────────────────────────────────

type IamTab = 'roles' | 'users' | 'policies';
type DetailEntity = { type: 'role' | 'user' | 'policy'; name: string; data: Record<string, unknown> };

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmtDate = (d?: Date | string) => {
  if (!d) return '—';
  try { return format(new Date(d as string), 'yyyy-MM-dd'); } catch { return '—'; }
};

const scopeColor = (scope?: string) => {
  if (scope === 'AWS')   return 'border-sky-500 bg-sky-50 text-sky-800';
  if (scope === 'Local') return 'border-emerald-500 bg-emerald-50 text-emerald-800';
  return 'border-neutral-400 bg-neutral-50 text-neutral-600';
};

// ─── Main Component ───────────────────────────────────────────────────────────

const IAMView = () => {
  const { clients, logActivity } = useAws();

  // Tab selection
  const [activeTab, setActiveTab] = useState<IamTab>('roles');

  // Detail drawer (shared across all entity types)
  const [detail, setDetail] = useState<DetailEntity | null>(null);
  const [detailPolicies, setDetailPolicies] = useState<{ inline: string[]; managed: AttachedPolicy[] }>({ inline: [], managed: [] });
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Common search
  const [search, setSearch] = useState('');

  // ── Roles ──
  const [roles, setRoles]           = useState<Role[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(false);

  // Create role modal
  const [isRoleModalOpen, setIsRoleModalOpen]   = useState(false);
  const [roleName, setRoleName]                 = useState('');
  const [rolePrincipal, setRolePrincipal]       = useState('lambda.amazonaws.com');
  const [creatingRole, setCreatingRole]         = useState(false);

  // ── Users ──
  const [users, setUsers]           = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Create user modal
  const [isUserModalOpen, setIsUserModalOpen]   = useState(false);
  const [newUserName, setNewUserName]           = useState('');
  const [newUserPath, setNewUserPath]           = useState('/');
  const [creatingUser, setCreatingUser]         = useState(false);

  // ── Managed Policies ──
  const [policies, setPolicies]     = useState<Policy[]>([]);
  const [loadingPolicies, setLoadingPolicies] = useState(false);

  // Create policy modal
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);
  const [newPolicyName, setNewPolicyName]         = useState('');
  const [policyDoc, setPolicyDoc]                 = useState(JSON.stringify({
    Version: '2012-10-17',
    Statement: [{ Effect: 'Allow', Action: ['s3:GetObject'], Resource: '*' }]
  }, null, 2));
  const [creatingPolicy, setCreatingPolicy]       = useState(false);
  const [policyDocError, setPolicyDocError]       = useState<string | null>(null);

  // ─── Data fetch helpers ─────────────────────────────────────────────────────

  const fetchRoles = async () => {
    setLoadingRoles(true);
    try {
      const r = await clients.iam.send(new ListRolesCommand({}));
      setRoles(r.Roles || []);
      logActivity('IAM', 'ListRoles', 'success');
    } catch (e) {
      logActivity('IAM', 'ListRoles failed', 'error', e instanceof Error ? e.message : String(e));
    } finally { setLoadingRoles(false); }
  };

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const r = await clients.iam.send(new ListUsersCommand({}));
      setUsers(r.Users || []);
      logActivity('IAM', 'ListUsers', 'success');
    } catch (e) {
      logActivity('IAM', 'ListUsers failed', 'error', e instanceof Error ? e.message : String(e));
    } finally { setLoadingUsers(false); }
  };

  const fetchPolicies = async () => {
    setLoadingPolicies(true);
    try {
      const r = await clients.iam.send(new ListPoliciesCommand({ Scope: 'Local' }));
      setPolicies(r.Policies || []);
      logActivity('IAM', 'ListPolicies (Local)', 'success');
    } catch (e) {
      logActivity('IAM', 'ListPolicies failed', 'error', e instanceof Error ? e.message : String(e));
    } finally { setLoadingPolicies(false); }
  };

  useEffect(() => {
    fetchRoles();
    fetchUsers();
    fetchPolicies();
  }, []);

  // ─── Detail panel ────────────────────────────────────────────────────────────

  const openRoleDetail = async (role: Role) => {
    setDetail({ type: 'role', name: role.RoleName!, data: role as Record<string, unknown> });
    setLoadingDetail(true);
    setDetailPolicies({ inline: [], managed: [] });
    try {
      const [inlineRes, managedRes] = await Promise.all([
        clients.iam.send(new ListRolePoliciesCommand({ RoleName: role.RoleName })),
        clients.iam.send(new ListAttachedRolePoliciesCommand({ RoleName: role.RoleName })),
      ]);
      setDetailPolicies({
        inline: inlineRes.PolicyNames || [],
        managed: managedRes.AttachedPolicies || [],
      });
      logActivity('IAM', `ListPolicies for role ${role.RoleName}`, 'success');
    } catch (e) {
      logActivity('IAM', `ListPolicies failed for role`, 'error', e instanceof Error ? e.message : String(e));
    } finally { setLoadingDetail(false); }
  };

  const openUserDetail = async (user: User) => {
    setDetail({ type: 'user', name: user.UserName!, data: user as Record<string, unknown> });
    setLoadingDetail(true);
    setDetailPolicies({ inline: [], managed: [] });
    try {
      const [inlineRes, managedRes] = await Promise.all([
        clients.iam.send(new ListUserPoliciesCommand({ UserName: user.UserName })),
        clients.iam.send(new ListAttachedUserPoliciesCommand({ UserName: user.UserName })),
      ]);
      setDetailPolicies({
        inline: inlineRes.PolicyNames || [],
        managed: managedRes.AttachedPolicies || [],
      });
      logActivity('IAM', `ListPolicies for user ${user.UserName}`, 'success');
    } catch (e) {
      logActivity('IAM', `ListPolicies failed for user`, 'error', e instanceof Error ? e.message : String(e));
    } finally { setLoadingDetail(false); }
  };

  const openPolicyDetail = async (policy: Policy) => {
    setDetail({ type: 'policy', name: policy.PolicyName!, data: policy as Record<string, unknown> });
    setLoadingDetail(true);
    try {
      if (policy.DefaultVersionId) {
        const r = await clients.iam.send(new GetPolicyVersionCommand({
          PolicyArn: policy.Arn,
          VersionId: policy.DefaultVersionId,
        }));
        setDetail({
          type: 'policy',
          name: policy.PolicyName!,
          data: { ...(policy as Record<string, unknown>), document: r.PolicyVersion?.Document ? decodeURIComponent(r.PolicyVersion.Document) : null },
        });
      }
    } catch (e) {
      logActivity('IAM', `GetPolicyVersion failed`, 'error', e instanceof Error ? e.message : String(e));
    } finally { setLoadingDetail(false); }
  };

  // ─── CRUD Handlers ────────────────────────────────────────────────────────────

  const handleCreateRole = async () => {
    if (!roleName) return;
    setCreatingRole(true);
    try {
      await clients.iam.send(new CreateRoleCommand({
        RoleName: roleName,
        AssumeRolePolicyDocument: JSON.stringify({
          Version: '2012-10-17',
          Statement: [{
            Effect: 'Allow',
            Principal: { Service: rolePrincipal },
            Action: 'sts:AssumeRole',
          }],
        }),
      }));
      logActivity('IAM', `CreateRole: ${roleName}`, 'success');
      setIsRoleModalOpen(false);
      setRoleName('');
      fetchRoles();
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      logActivity('IAM', `CreateRole failed`, 'error', message);
      alert(message);
    } finally { setCreatingRole(false); }
  };

  const handleDeleteRole = async (name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Drop role "${name}"?`)) return;
    try {
      await clients.iam.send(new DeleteRoleCommand({ RoleName: name }));
      logActivity('IAM', `DeleteRole: ${name}`, 'success');
      if (detail?.name === name) setDetail(null);
      fetchRoles();
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      logActivity('IAM', `DeleteRole failed`, 'error', message);
      alert(message);
    }
  };

  const handleCreateUser = async () => {
    if (!newUserName) return;
    setCreatingUser(true);
    try {
      await clients.iam.send(new CreateUserCommand({ UserName: newUserName, Path: newUserPath || '/' }));
      logActivity('IAM', `CreateUser: ${newUserName}`, 'success');
      setIsUserModalOpen(false);
      setNewUserName('');
      setNewUserPath('/');
      fetchUsers();
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      logActivity('IAM', `CreateUser failed`, 'error', message);
      alert(message);
    } finally { setCreatingUser(false); }
  };

  const handleDeleteUser = async (name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Drop user "${name}"?`)) return;
    try {
      await clients.iam.send(new DeleteUserCommand({ UserName: name }));
      logActivity('IAM', `DeleteUser: ${name}`, 'success');
      if (detail?.name === name) setDetail(null);
      fetchUsers();
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      logActivity('IAM', `DeleteUser failed`, 'error', message);
      alert(message);
    }
  };

  const handleCreatePolicy = async () => {
    if (!newPolicyName || !policyDoc) return;
    setPolicyDocError(null);
    try { JSON.parse(policyDoc); } catch (e) {
      setPolicyDocError(`Invalid JSON: ${e instanceof Error ? e.message : String(e)}`);
      return;
    }
    setCreatingPolicy(true);
    try {
      await clients.iam.send(new CreatePolicyCommand({
        PolicyName: newPolicyName,
        PolicyDocument: policyDoc,
      }));
      logActivity('IAM', `CreatePolicy: ${newPolicyName}`, 'success');
      setIsPolicyModalOpen(false);
      setNewPolicyName('');
      fetchPolicies();
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      logActivity('IAM', `CreatePolicy failed`, 'error', message);
      alert(message);
    } finally { setCreatingPolicy(false); }
  };

  const handleDeletePolicy = async (arn: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Delete policy "${name}"? Make sure it is detached from all entities first.`)) return;
    try {
      await clients.iam.send(new DeletePolicyCommand({ PolicyArn: arn }));
      logActivity('IAM', `DeletePolicy: ${name}`, 'success');
      if (detail?.name === name) setDetail(null);
      fetchPolicies();
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      logActivity('IAM', `DeletePolicy failed`, 'error', message);
      alert(message);
    }
  };

  // ─── Filtered lists ───────────────────────────────────────────────────────────

  const filteredRoles    = roles.filter(r => r.RoleName?.toLowerCase().includes(search.toLowerCase()));
  const filteredUsers    = users.filter(u => u.UserName?.toLowerCase().includes(search.toLowerCase()));
  const filteredPolicies = policies.filter(p => p.PolicyName?.toLowerCase().includes(search.toLowerCase()));

  // ─── Render ───────────────────────────────────────────────────────────────────

  const tabs: { key: IamTab; label: string; icon: React.ReactNode; count: number }[] = [
    { key: 'roles',    label: 'Roles',    icon: <Shield size={12} />,    count: roles.length },
    { key: 'users',    label: 'Users',    icon: <User size={12} />,      count: users.length },
    { key: 'policies', label: 'Policies', icon: <FileText size={12} />,  count: policies.length },
  ];

  return (
    <div className="flex flex-col h-full uppercase">
      <PageHeader
        title="IAM Identity & Access"
        icon={<Users size={18} />}
        onRefresh={() => { fetchRoles(); fetchUsers(); fetchPolicies(); }}
        isRefreshing={loadingRoles || loadingUsers || loadingPolicies}
        actions={
          <div className="flex gap-2">
            {activeTab === 'roles'    && <Button icon={<CirclePlus size={13} />} onClick={() => setIsRoleModalOpen(true)}>Create Role</Button>}
            {activeTab === 'users'    && <Button icon={<CirclePlus size={13} />} onClick={() => setIsUserModalOpen(true)}>Create User</Button>}
            {activeTab === 'policies' && <Button icon={<CirclePlus size={13} />} onClick={() => { setPolicyDocError(null); setIsPolicyModalOpen(true); }}>Create Policy</Button>}
          </div>
        }
      />

      {/* ── Modals ── */}

      {/* Create Role */}
      <Modal isOpen={isRoleModalOpen} onClose={() => setIsRoleModalOpen(false)} title="Create IAM Role">
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60">Role Name</label>
            <Input value={roleName} onChange={e => setRoleName(e.target.value)} placeholder="MyLambdaExecutionRole" autoFocus />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60">Trusted Principal (Service)</label>
            <Select value={rolePrincipal} onChange={e => setRolePrincipal(e.target.value)}>
              <option value="lambda.amazonaws.com">Lambda</option>
              <option value="ec2.amazonaws.com">EC2</option>
              <option value="ecs-tasks.amazonaws.com">ECS Tasks</option>
              <option value="apigateway.amazonaws.com">API Gateway</option>
              <option value="states.amazonaws.com">Step Functions</option>
              <option value="events.amazonaws.com">EventBridge</option>
            </Select>
          </div>
          <div className="pt-4 flex gap-3">
            <Button variant="ghost" className="flex-1" onClick={() => setIsRoleModalOpen(false)}>Cancel</Button>
            <Button className="flex-1" onClick={handleCreateRole} disabled={!roleName || creatingRole}>
              {creatingRole ? 'Creating...' : 'Create Role'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Create User */}
      <Modal isOpen={isUserModalOpen} onClose={() => setIsUserModalOpen(false)} title="Create IAM User">
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60">Username</label>
            <Input value={newUserName} onChange={e => setNewUserName(e.target.value)} placeholder="ci-deploy-user" autoFocus />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60">Path (optional)</label>
            <Input value={newUserPath} onChange={e => setNewUserPath(e.target.value)} placeholder="/" />
          </div>
          <div className="pt-4 flex gap-3">
            <Button variant="ghost" className="flex-1" onClick={() => setIsUserModalOpen(false)}>Cancel</Button>
            <Button className="flex-1" onClick={handleCreateUser} disabled={!newUserName || creatingUser}>
              {creatingUser ? 'Creating...' : 'Create User'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Create Policy */}
      <Modal isOpen={isPolicyModalOpen} onClose={() => setIsPolicyModalOpen(false)} title="Create Managed Policy">
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60">Policy Name</label>
            <Input value={newPolicyName} onChange={e => setNewPolicyName(e.target.value)} placeholder="S3ReadOnlyPolicy" autoFocus />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60">Policy Document (JSON)</label>
            <textarea
              className="w-full bg-white border border-brand-text px-3 py-2 text-[10px] focus:outline-none focus:ring-1 focus:ring-brand-text transition-all font-mono min-h-[160px]"
              value={policyDoc}
              onChange={e => { setPolicyDoc(e.target.value); setPolicyDocError(null); }}
            />
            {policyDocError && (
              <p className="text-[9px] text-rose-600 font-mono">{policyDocError}</p>
            )}
          </div>
          <div className="pt-4 flex gap-3">
            <Button variant="ghost" className="flex-1" onClick={() => setIsPolicyModalOpen(false)}>Cancel</Button>
            <Button className="flex-1" onClick={handleCreatePolicy} disabled={!newPolicyName || !policyDoc || creatingPolicy}>
              {creatingPolicy ? 'Creating...' : 'Create Policy'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Tab Bar ── */}
      <div className="border-b border-brand-text flex shrink-0 bg-brand-muted">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); setDetail(null); setSearch(''); }}
            className={`flex items-center gap-2 px-5 py-3 text-[10px] font-bold tracking-widest uppercase transition-all border-r border-brand-text/20 ${
              activeTab === tab.key
                ? 'bg-brand-bg border-b-2 border-b-brand-text'
                : 'opacity-50 hover:opacity-80 hover:bg-white/20'
            }`}
          >
            {tab.icon}
            {tab.label}
            <span className="opacity-40 text-[8px]">({tab.count})</span>
          </button>
        ))}
      </div>

      {/* ── Main body: split list + detail ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left: list */}
        <aside className="w-72 border-r border-brand-text flex flex-col bg-brand-muted shrink-0">
          <div className="p-3 border-b border-brand-text">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-brand-text opacity-30" size={12} />
              <Input
                placeholder={`Search ${activeTab}...`}
                className="pl-8 text-[11px] font-mono"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            <AnimatePresence mode="wait">
              {/* Roles */}
              {activeTab === 'roles' && (
                <motion.div key="roles" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-1">
                  {loadingRoles ? [1,2,3].map(i => <Skeleton key={i} className="h-10 w-full" />) :
                    filteredRoles.length === 0 ? <p className="text-[10px] text-center opacity-30 italic p-4">No roles</p> :
                    filteredRoles.map(role => (
                      <button
                        key={role.RoleId}
                        onClick={() => openRoleDetail(role)}
                        className={`w-full text-left px-3 py-2.5 text-[11px] font-mono border transition-all group ${
                          detail?.name === role.RoleName && detail?.type === 'role'
                            ? 'bg-brand-text text-brand-bg border-brand-text font-bold'
                            : 'border-transparent hover:bg-white/60 hover:border-brand-text/30'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 min-w-0">
                            <Shield size={11} className="shrink-0 opacity-60" />
                            <span className="truncate font-bold">{role.RoleName}</span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={(e) => handleDeleteRole(role.RoleName, e)}
                              className="opacity-0 group-hover:opacity-60 hover:!opacity-100 hover:text-rose-600 transition-all p-0.5"
                            >
                              <Trash2 size={11} />
                            </button>
                            <ChevronRight size={10} className="opacity-30" />
                          </div>
                        </div>
                        <p className="text-[8px] opacity-40 mt-0.5 truncate">{fmtDate(role.CreateDate)}</p>
                      </button>
                    ))
                  }
                </motion.div>
              )}

              {/* Users */}
              {activeTab === 'users' && (
                <motion.div key="users" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-1">
                  {loadingUsers ? [1,2,3].map(i => <Skeleton key={i} className="h-10 w-full" />) :
                    filteredUsers.length === 0 ? <p className="text-[10px] text-center opacity-30 italic p-4">No users</p> :
                    filteredUsers.map(user => (
                      <button
                        key={user.UserId}
                        onClick={() => openUserDetail(user)}
                        className={`w-full text-left px-3 py-2.5 text-[11px] font-mono border transition-all group ${
                          detail?.name === user.UserName && detail?.type === 'user'
                            ? 'bg-brand-text text-brand-bg border-brand-text font-bold'
                            : 'border-transparent hover:bg-white/60 hover:border-brand-text/30'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 min-w-0">
                            <User size={11} className="shrink-0 opacity-60" />
                            <span className="truncate font-bold">{user.UserName}</span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={(e) => handleDeleteUser(user.UserName, e)}
                              className="opacity-0 group-hover:opacity-60 hover:!opacity-100 hover:text-rose-600 transition-all p-0.5"
                            >
                              <Trash2 size={11} />
                            </button>
                            <ChevronRight size={10} className="opacity-30" />
                          </div>
                        </div>
                        <p className="text-[8px] opacity-40 mt-0.5 truncate">{fmtDate(user.CreateDate)}</p>
                      </button>
                    ))
                  }
                </motion.div>
              )}

              {/* Policies */}
              {activeTab === 'policies' && (
                <motion.div key="policies" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-1">
                  {loadingPolicies ? [1,2,3].map(i => <Skeleton key={i} className="h-10 w-full" />) :
                    filteredPolicies.length === 0 ? <p className="text-[10px] text-center opacity-30 italic p-4">No local policies</p> :
                    filteredPolicies.map(policy => (
                      <button
                        key={policy.PolicyId}
                        onClick={() => openPolicyDetail(policy)}
                        className={`w-full text-left px-3 py-2.5 text-[11px] font-mono border transition-all group ${
                          detail?.name === policy.PolicyName && detail?.type === 'policy'
                            ? 'bg-brand-text text-brand-bg border-brand-text font-bold'
                            : 'border-transparent hover:bg-white/60 hover:border-brand-text/30'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText size={11} className="shrink-0 opacity-60" />
                            <span className="truncate font-bold">{policy.PolicyName}</span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={(e) => handleDeletePolicy(policy.Arn, policy.PolicyName, e)}
                              className="opacity-0 group-hover:opacity-60 hover:!opacity-100 hover:text-rose-600 transition-all p-0.5"
                            >
                              <Trash2 size={11} />
                            </button>
                            <ChevronRight size={10} className="opacity-30" />
                          </div>
                        </div>
                        <p className="text-[8px] opacity-40 mt-0.5 truncate">{fmtDate(policy.CreateDate)}</p>
                      </button>
                    ))
                  }
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </aside>

        {/* Right: detail panel */}
        <main className="flex-1 overflow-auto bg-brand-bg p-6">
          <AnimatePresence mode="wait">
            {!detail ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full flex flex-col items-center justify-center text-center"
              >
                <div className="w-16 h-16 border border-brand-text/20 flex items-center justify-center text-brand-text/20 mb-4">
                  {activeTab === 'roles'    ? <Shield size={30} /> :
                   activeTab === 'users'    ? <User size={30} /> :
                                              <FileText size={30} />}
                </div>
                <p className="text-xs opacity-30 uppercase italic">
                  Select a {activeTab.slice(0, -1)} from the list to inspect its details and attached policies.
                </p>
              </motion.div>
            ) : (
              <motion.div
                key={detail.name}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-6"
              >
                {/* Entity header */}
                <div className="border border-brand-text p-4 bg-white/50 flex justify-between items-start">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 border border-brand-text/30 bg-white text-[8px] font-bold uppercase tracking-wider text-brand-text/60">
                        {detail.type.toUpperCase()}
                      </span>
                      {detail.type === 'policy' && (
                        <span className={`px-2 py-0.5 border text-[8px] font-bold rounded-sm uppercase tracking-wide ${scopeColor(detail.data?.AttachmentCount !== undefined ? 'Local' : 'AWS')}`}>
                          LOCAL
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-bold font-mono text-brand-text tracking-tight">{detail.name}</h3>
                    <p className="text-[10px] font-mono opacity-50 lowercase normal-case">{detail.data?.Arn || detail.data?.UserId || detail.data?.RoleId || ''}</p>
                  </div>
                  <div className="text-[9px] font-mono opacity-40 text-right space-y-1">
                    <p>Created: {fmtDate(detail.data?.CreateDate)}</p>
                    {detail.data?.Path && <p>Path: {detail.data.Path}</p>}
                    {detail.type === 'policy' && <p>Attached: {detail.data?.AttachmentCount ?? 0}</p>}
                  </div>
                </div>

                {/* Role/User: inline + managed policies */}
                {(detail.type === 'role' || detail.type === 'user') && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-[8px] font-bold opacity-40 uppercase tracking-widest mb-3">
                        Inline Policies ({detailPolicies.inline.length})
                      </p>
                      {loadingDetail ? (
                        <Skeleton className="h-24" />
                      ) : detailPolicies.inline.length === 0 ? (
                        <Card className="text-center py-8 bg-brand-muted/30 border-dashed">
                          <p className="text-[9px] font-bold opacity-30">NO_INLINE_POLICIES</p>
                        </Card>
                      ) : (
                        <div className="space-y-2">
                          {detailPolicies.inline.map(p => (
                            <div key={p} className="p-3 border border-brand-text/20 bg-white flex items-center gap-3">
                              <FileText size={13} className="opacity-40" />
                              <span className="font-mono text-xs font-bold">{p}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <p className="text-[8px] font-bold opacity-40 uppercase tracking-widest mb-3">
                        Managed Policies ({detailPolicies.managed.length})
                      </p>
                      {loadingDetail ? (
                        <Skeleton className="h-24" />
                      ) : detailPolicies.managed.length === 0 ? (
                        <Card className="text-center py-8 bg-brand-muted/30 border-dashed">
                          <p className="text-[9px] font-bold opacity-30">NO_MANAGED_POLICIES_ATTACHED</p>
                        </Card>
                      ) : (
                        <div className="space-y-2">
                          {detailPolicies.managed.map((p) => (
                            <div key={p.PolicyArn} className="p-3 border border-brand-text/20 bg-white">
                              <p className="font-mono text-xs font-bold">{p.PolicyName}</p>
                              <p className="font-mono text-[9px] opacity-40 truncate lowercase">{p.PolicyArn}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Role: trust policy */}
                {detail.type === 'role' && detail.data?.AssumeRolePolicyDocument && (
                  <div>
                    <p className="text-[8px] font-bold opacity-40 uppercase tracking-widest mb-3">Trust Policy Document</p>
                    <Card className="bg-brand-console border-brand-text p-0 overflow-hidden">
                      <div className="px-4 py-2 border-b border-brand-text/20 bg-brand-muted flex items-center gap-2 text-[9px] font-bold tracking-widest">
                        <Code size={11} /> TRUST_POLICY_JSON
                      </div>
                      <pre className="p-4 font-mono text-[10px] text-brand-green overflow-auto max-h-48 whitespace-pre-wrap">
                        {JSON.stringify(JSON.parse(decodeURIComponent(detail.data.AssumeRolePolicyDocument)), null, 2)}
                      </pre>
                    </Card>
                  </div>
                )}

                {/* Policy: document viewer */}
                {detail.type === 'policy' && (
                  <div>
                    <p className="text-[8px] font-bold opacity-40 uppercase tracking-widest mb-3">
                      Policy Document (Version: {detail.data?.DefaultVersionId || '—'})
                    </p>
                    {loadingDetail ? (
                      <Skeleton className="h-40" />
                    ) : detail.data?.document ? (
                      <Card className="bg-brand-console border-brand-text p-0 overflow-hidden">
                        <div className="px-4 py-2 border-b border-brand-text/20 bg-brand-muted flex items-center gap-2 text-[9px] font-bold tracking-widest">
                          <Code size={11} /> POLICY_DOCUMENT_JSON
                        </div>
                        <pre className="p-4 font-mono text-[10px] text-brand-green overflow-auto max-h-64 whitespace-pre-wrap">
                          {typeof detail.data.document === 'string'
                            ? JSON.stringify(JSON.parse(detail.data.document), null, 2)
                            : JSON.stringify(detail.data.document, null, 2)}
                        </pre>
                      </Card>
                    ) : (
                      <Card className="text-center py-10 border-dashed opacity-40">
                        <p className="text-[9px] font-bold">Policy document not available for this entity.</p>
                      </Card>
                    )}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};

export default IAMView;
