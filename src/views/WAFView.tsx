import React, { useState, useEffect } from 'react';
import { ListWebACLsCommand, CreateWebACLCommand, DeleteWebACLCommand } from '@aws-sdk/client-wafv2';
import { useAws } from '../contexts/AwsContext';
import { ShieldAlert, Shield, ShieldCheck, Search, CirclePlus, Trash2, Sliders, Activity } from 'lucide-react';
import { PageHeader, Card, Button, Input, Skeleton, Modal, Select } from '../components/ui-elements';

const WAFView = () => {
  const { clients, logActivity } = useAws();
  const [acls, setAcls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [scope, setScope] = useState<'REGIONAL' | 'CLOUDFRONT'>('REGIONAL');
  const [search, setSearch] = useState('');

  // Creation modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [defaultAction, setDefaultAction] = useState<'ALLOW' | 'BLOCK'>('ALLOW');
  const [submitting, setSubmitting] = useState(false);

  const fetchWebACLs = async (currentScope: 'REGIONAL' | 'CLOUDFRONT') => {
    setLoading(true);
    try {
      const response = await clients.waf.send(new ListWebACLsCommand({ Scope: currentScope }));
      setAcls(response.WebACLs || []);
      logActivity('WAFv2', `ListWebACLs (${currentScope})`, 'success');
    } catch (err: any) {
      logActivity('WAFv2', `ListWebACLs failed for Scope: ${currentScope}`, 'error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!name) return;
    setSubmitting(true);
    try {
      const metricName = name.replace(/[^a-zA-Z0-9]/g, '');
      await clients.waf.send(new CreateWebACLCommand({
        Name: name,
        Scope: scope,
        DefaultAction: defaultAction === 'ALLOW' ? { Allow: {} } : { Block: {} },
        VisibilityConfig: {
          SampledRequestsEnabled: true,
          CloudWatchMetricsEnabled: true,
          MetricName: metricName || 'MyWafMetric'
        }
      }));
      logActivity('WAFv2', `CreateWebACL: ${name}`, 'success');
      setName('');
      setIsModalOpen(false);
      fetchWebACLs(scope);
    } catch (err: any) {
      logActivity('WAFv2', `CreateWebACL failed: ${name}`, 'error', err.message);
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (aclId: string, aclName: string) => {
    if (!confirm(`Delete Web ACL ${aclName}?`)) return;
    try {
      // In real AWS deletion requires LockToken, but LocalStack allows deletion with dummy or bypasses. 
      // We'll pass a dummy token or standard empty string LockToken
      await clients.waf.send(new DeleteWebACLCommand({
        Name: aclName,
        Id: aclId,
        Scope: scope,
        LockToken: 'dummy-token-to-satisfy-sdk'
      }));
      logActivity('WAFv2', `DeleteWebACL: ${aclName}`, 'success');
      fetchWebACLs(scope);
    } catch (err: any) {
      logActivity('WAFv2', `DeleteWebACL failed: ${aclName}`, 'error', err.message);
      alert(err.message);
    }
  };

  useEffect(() => {
    fetchWebACLs(scope);
  }, [scope]);

  const filteredAcls = acls.filter(acl => acl.Name?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="flex flex-col h-full uppercase">
      <PageHeader
        title="WAFv2 Web ACLs"
        icon={<ShieldAlert size={18} />}
        onRefresh={() => fetchWebACLs(scope)}
        isRefreshing={loading}
        actions={
          <div className="flex items-center gap-4">
            <Select 
              value={scope} 
              onChange={e => setScope(e.target.value as any)}
              className="w-32 py-1 h-8 text-[10px]"
            >
              <option value="REGIONAL">REGIONAL</option>
              <option value="CLOUDFRONT">CLOUDFRONT</option>
            </Select>
            <Button onClick={() => setIsModalOpen(true)} icon={<CirclePlus size={14} />}>
              New Web ACL
            </Button>
          </div>
        }
      />

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create Web ACL">
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60">Web ACL Name</label>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="production-shield"
              autoFocus
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60">Default Action</label>
            <Select value={defaultAction} onChange={e => setDefaultAction(e.target.value as any)}>
              <option value="ALLOW">ALLOW_ALL_TRAFFIC</option>
              <option value="BLOCK">BLOCK_ALL_TRAFFIC</option>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60">Deployment Scope</label>
            <div className="py-2 px-3 border border-brand-text font-mono text-[9px] bg-brand-muted/20">
              {scope} SCOPE SELECTED IN HEADER
            </div>
          </div>

          <div className="pt-4 flex gap-3">
            <Button variant="ghost" className="flex-1" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button className="flex-1" onClick={handleCreate} disabled={!name || submitting}>
              {submitting ? 'Deploying...' : 'Deploy WAF'}
            </Button>
          </div>
        </div>
      </Modal>

      <div className="p-6 flex-1 overflow-auto bg-brand-bg space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text opacity-30" size={14} />
          <Input 
            placeholder="Search Web ACLs..." 
            className="pl-10 font-mono text-[11px]" 
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            [1, 2, 3].map(i => <Skeleton key={i} className="h-36 animate-pulse" />)
          ) : filteredAcls.length === 0 ? (
            <div className="col-span-full py-20 text-center border border-dashed border-brand-text/20">
               <p className="text-xs opacity-40 font-mono italic">NO_WEB_ACLS_ACTIVE</p>
            </div>
          ) : (
            filteredAcls.map(acl => (
              <Card key={acl.ARN} className="hover:border-brand-text transition-all bg-white relative flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-2 bg-brand-muted border border-brand-text">
                      <ShieldCheck size={20} className="text-brand-text" />
                    </div>
                    <button 
                      onClick={() => handleDelete(acl.Id!, acl.Name!)} 
                      className="p-1 hover:text-rose-600 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <h4 className="font-bold text-xs truncate mb-1">{acl.Name}</h4>
                  <p className="text-[9px] font-mono opacity-50 truncate lowercase">{acl.ARN}</p>
                </div>

                <div className="mt-6 pt-3 border-t border-brand-text/5">
                  <div className="grid grid-cols-2 gap-2 text-[9px] font-mono opacity-60">
                    <div className="flex items-center gap-1">
                      <Sliders size={11} /> RULES: 0 (BUILT-IN)
                    </div>
                    <div className="flex items-center gap-1">
                      <Activity size={11} /> SAMPLE: ENABLED
                    </div>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default WAFView;
