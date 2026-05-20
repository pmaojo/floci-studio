import React, { useState, useEffect } from 'react';
import { 
  ListRolesCommand, 
  ListRolePoliciesCommand, 
  GetRolePolicyCommand,
  CreateRoleCommand,
  DeleteRoleCommand
} from '@aws-sdk/client-iam';
import { useAws } from '../contexts/AwsContext';
import { 
  Users, 
  Search, 
  Shield, 
  Trash2, 
  Key, 
  ShieldCheck, 
  ArrowLeft,
  FileText,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { PageHeader, Card, Button, Input, Skeleton } from '../components/ui-elements';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';

const IAMView = () => {
  const { clients, logActivity } = useAws();
  const [roles, setRoles] = useState<any[]>([]);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [policies, setPolicies] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [policiesLoading, setPoliciesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const fetchRoles = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await clients.iam.send(new ListRolesCommand({}));
      setRoles(response.Roles || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch roles');
    } finally {
      setLoading(false);
    }
  };

  const fetchPolicies = async (roleName: string) => {
    setPoliciesLoading(true);
    try {
      const response = await clients.iam.send(new ListRolePoliciesCommand({ RoleName: roleName }));
      setPolicies(response.PolicyNames || []);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setPoliciesLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  const handleCreateRole = async () => {
    const name = prompt('Role Name (e.g. MyWorkerRole):');
    if (!name) return;
    try {
      await clients.iam.send(new CreateRoleCommand({
        RoleName: name,
        AssumeRolePolicyDocument: JSON.stringify({
          Version: '2012-10-17',
          Statement: [{ Effect: 'Allow', Principal: { Service: 'lambda.amazonaws.com' }, Action: 'sts:AssumeRole' }]
        })
      }));
      logActivity('IAM', `CreateRole: ${name}`, 'success');
      fetchRoles();
    } catch (err: any) {
      logActivity('IAM', `CreateRole failed: ${name}`, 'error', err.message);
      alert(err.message);
    }
  };

  const handleDeleteRole = async (name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`DROP ROLE ${name}?`)) return;
    try {
      await clients.iam.send(new DeleteRoleCommand({ RoleName: name }));
      logActivity('IAM', `DeleteRole: ${name}`, 'success');
      fetchRoles();
    } catch (err: any) {
      logActivity('IAM', `DeleteRole failed: ${name}`, 'error', err.message);
      alert(err.message);
    }
  };

  const filteredRoles = roles.filter(r => r.RoleName?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="flex flex-col h-full uppercase">
      <PageHeader 
        title={selectedRole ? `Role / ${selectedRole}` : "IAM Roles"} 
        icon={<Users size={18} />}
        onRefresh={selectedRole ? () => fetchPolicies(selectedRole) : fetchRoles}
        isRefreshing={loading || policiesLoading}
        actions={
          selectedRole ? (
            <Button 
                variant="secondary" 
                size="sm" 
                onClick={() => setSelectedRole(null)}
                icon={<ArrowLeft size={14} />}
              >
                Back
              </Button>
          ) : (
            <Button onClick={handleCreateRole} icon={<ShieldCheck size={14} />}>
              Create Role
            </Button>
          )
        }
      />

      <div className="p-6 space-y-6 flex-1 overflow-auto bg-brand-bg">
        <AnimatePresence mode="wait">
          {!selectedRole ? (
            <motion.div
              key="roles"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text opacity-30" size={14} />
                <Input 
                  placeholder="Filter Roles..." 
                  className="pl-10 font-mono text-[11px]" 
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>

              <Card noPadding>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="border-b border-brand-text uppercase text-[10px] font-bold opacity-50 bg-brand-muted">
                        <th className="px-6 py-3 border-r border-brand-text">Role Name</th>
                        <th className="px-6 py-3 border-r border-brand-text">Path</th>
                        <th className="px-6 py-3 border-r border-brand-text whitespace-nowrap">Created</th>
                        <th className="px-6 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        [1, 2, 3].map(i => (
                          <tr key={i} className="border-b border-brand-text/20">
                            <td colSpan={4} className="px-6 py-4"><Skeleton className="h-4 w-full" /></td>
                          </tr>
                        ))
                      ) : error ? (
                        <tr>
                          <td colSpan={4} className="px-6 py-12 text-center text-rose-500 italic font-mono">{error}</td>
                        </tr>
                      ) : filteredRoles.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-6 py-12 text-center text-brand-text opacity-40 italic">No Roles Found</td>
                        </tr>
                      ) : (
                        filteredRoles.map(role => (
                          <tr 
                            key={role.RoleId} 
                            onClick={() => {
                              setSelectedRole(role.RoleName);
                              fetchPolicies(role.RoleName);
                            }}
                            className="border-b border-brand-text hover:bg-brand-text hover:text-white transition-colors cursor-pointer font-mono text-[11px]"
                          >
                            <td className="px-6 py-3 border-r border-brand-text">
                              <div className="flex items-center gap-3">
                                <Shield size={14} className="opacity-50" />
                                <span className="font-bold">{role.RoleName}</span>
                              </div>
                            </td>
                            <td className="px-6 py-3 border-r border-brand-text opacity-70 italic lowercase">{role.Path}</td>
                            <td className="px-6 py-3 border-r border-brand-text opacity-70">
                              {format(new Date(role.CreateDate), 'yyyy-MM-dd')}
                            </td>
                            <td className="px-6 py-3 text-right">
                              <div className="flex justify-end gap-4 uppercase font-bold text-[10px]">
                                <button className="hover:underline">POLICIES</button>
                                <button 
                                  onClick={(e) => handleDeleteRole(role.RoleName, e)}
                                  className="hover:underline text-rose-500"
                                >
                                  DROP
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </motion.div>
          ) : (
            <motion.div
              key="policies"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-[10px] uppercase font-bold tracking-widest mb-4 opacity-40">Inline_Policies</h3>
                  {policiesLoading ? (
                    <Skeleton className="h-32" />
                  ) : policies.length === 0 ? (
                    <Card className="text-center py-10 bg-brand-muted/30 border-dashed">
                      <p className="text-[9px] font-bold opacity-30">NO_INLINE_POLICIES</p>
                    </Card>
                  ) : (
                    <div className="space-y-2">
                       {policies.map(p => (
                         <div key={p} className="p-4 border border-brand-text bg-white flex items-center justify-between group hover:bg-brand-text hover:text-white transition-colors cursor-pointer">
                            <div className="flex items-center gap-3">
                              <FileText size={14} className="opacity-40" />
                              <span className="font-mono text-xs font-bold">{p}</span>
                            </div>
                            <ChevronRight size={14} className="opacity-20 group-hover:opacity-100" />
                         </div>
                       ))}
                    </div>
                  )}
                </div>
                <div>
                   <h3 className="text-[10px] uppercase font-bold tracking-widest mb-4 opacity-40">Attached_Managed_Policies</h3>
                   <Card className="text-center py-10 border-dashed opacity-30">
                      <p className="text-[9px] font-bold">MANAGED_POLICIES_STUB</p>
                   </Card>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default IAMView;
