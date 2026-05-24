import { useState, useEffect } from 'react';
import {
  ListWebACLsCommand,
  CreateWebACLCommand,
  DeleteWebACLCommand,
  GetWebACLCommand,
  UpdateWebACLCommand,
  type Rule,
} from '@aws-sdk/client-wafv2';
import { useAws } from '../contexts/AwsContext';
import {
  ShieldAlert,
  ShieldCheck,
  Search,
  CirclePlus,
  Trash2,
  Sliders,
  Activity,
  ChevronLeft,
  Globe,
  Gauge,
  Network,
  ArrowUpDown,
  ListFilter,
  Zap,
} from 'lucide-react';
import { PageHeader, Card, Button, Input, Skeleton, Modal, Select } from '../components/ui-elements';

// ─── Types ───────────────────────────────────────────────────────────────────

type RuleType = 'RATE_BASED' | 'GEO_MATCH' | 'IP_SET' | 'REGEX';
type RuleAction = 'ALLOW' | 'BLOCK' | 'COUNT' | 'CAPTCHA';

interface DraftRule {
  name: string;
  priority: number;
  ruleType: RuleType;
  action: RuleAction;
  // rate-based
  rateLimit: string;
  // geo
  countryCodes: string;
  // ip set
  ipArn: string;
  // regex
  regexPattern: string;
  regexField: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const actionColor = (action: string) => {
  switch (action) {
    case 'BLOCK':   return 'border-rose-500 bg-rose-50 text-rose-800';
    case 'ALLOW':   return 'border-emerald-500 bg-emerald-50 text-emerald-800';
    case 'COUNT':   return 'border-sky-500 bg-sky-50 text-sky-800';
    case 'CAPTCHA': return 'border-amber-500 bg-amber-50 text-amber-800';
    default:        return 'border-brand-text bg-white text-brand-text';
  }
};

const ruleTypeIcon = (rule: Rule) => {
  if (rule.Statement?.RateBasedStatement)  return <Gauge size={14} />;
  if (rule.Statement?.GeoMatchStatement)   return <Globe size={14} />;
  if (rule.Statement?.IPSetReferenceStatement) return <Network size={14} />;
  return <ListFilter size={14} />;
};

const ruleTypeName = (rule: Rule): string => {
  if (rule.Statement?.RateBasedStatement)       return 'Rate-based';
  if (rule.Statement?.GeoMatchStatement)         return 'Geo-match';
  if (rule.Statement?.IPSetReferenceStatement)   return 'IP-set';
  if (rule.Statement?.ByteMatchStatement)        return 'Byte-match';
  if (rule.Statement?.RegexPatternSetReferenceStatement) return 'Regex';
  return 'Managed';
};

const resolveActionName = (rule: Rule): string => {
  if (rule.Action?.Block)   return 'BLOCK';
  if (rule.Action?.Allow)   return 'ALLOW';
  if (rule.Action?.Count)   return 'COUNT';
  if (rule.Action?.Captcha) return 'CAPTCHA';
  if (rule.OverrideAction)  return 'OVERRIDE';
  return 'UNKNOWN';
};

const buildRuleStatement = (draft: DraftRule): Rule['Statement'] => {
  switch (draft.ruleType) {
    case 'RATE_BASED':
      return {
        RateBasedStatement: {
          Limit: parseInt(draft.rateLimit) || 2000,
          AggregateKeyType: 'IP',
        },
      };
    case 'GEO_MATCH':
      return {
        GeoMatchStatement: {
          CountryCodes: draft.countryCodes
            .split(',')
            .map(c => c.trim().toUpperCase())
            .filter(Boolean) as any[],
        },
      };
    case 'IP_SET':
      return {
        IPSetReferenceStatement: {
          ARN: draft.ipArn,
        },
      };
    case 'REGEX':
    default:
      return {
        ByteMatchStatement: {
          SearchString: new TextEncoder().encode(draft.regexPattern),
          FieldToMatch: { UriPath: {} },
          TextTransformations: [{ Priority: 0, Type: 'NONE' }],
          PositionalConstraint: 'CONTAINS',
        },
      };
  }
};

const buildRuleAction = (action: RuleAction): Rule['Action'] => {
  switch (action) {
    case 'BLOCK':   return { Block: {} };
    case 'COUNT':   return { Count: {} };
    case 'CAPTCHA': return { Captcha: {} };
    default:        return { Allow: {} };
  }
};

const BLANK_DRAFT = (): DraftRule => ({
  name: '',
  priority: 0,
  ruleType: 'RATE_BASED',
  action: 'BLOCK',
  rateLimit: '2000',
  countryCodes: 'RU,CN,KP',
  ipArn: '',
  regexPattern: '/admin',
  regexField: 'URI',
});

// ─── Main Component ───────────────────────────────────────────────────────────

const WAFView = () => {
  const { clients, logActivity } = useAws();

  // ── List state ──
  const [acls, setAcls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [scope, setScope] = useState<'REGIONAL' | 'CLOUDFRONT'>('REGIONAL');
  const [search, setSearch] = useState('');

  // ── Create ACL modal ──
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [defaultAction, setDefaultAction] = useState<'ALLOW' | 'BLOCK'>('ALLOW');
  const [submitting, setSubmitting] = useState(false);

  // ── ACL Detail / Rules workspace ──
  const [selectedAcl, setSelectedAcl] = useState<any | null>(null);
  const [aclDetail, setAclDetail] = useState<any | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [activeTab, setActiveTab] = useState<'rules' | 'config'>('rules');

  // ── Add Rule modal ──
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [draft, setDraft] = useState<DraftRule>(BLANK_DRAFT());
  const [savingRule, setSavingRule] = useState(false);

  // ─── Data fetching ───────────────────────────────────────────────────────

  const fetchWebACLs = async (s: 'REGIONAL' | 'CLOUDFRONT') => {
    setLoading(true);
    try {
      const response = await clients.waf.send(new ListWebACLsCommand({ Scope: s }));
      setAcls(response.WebACLs || []);
      logActivity('WAFv2', `ListWebACLs (${s})`, 'success');
    } catch (err: any) {
      logActivity('WAFv2', `ListWebACLs failed`, 'error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchAclDetail = async (acl: any) => {
    setLoadingDetail(true);
    setAclDetail(null);
    try {
      const res = await clients.waf.send(
        new GetWebACLCommand({ Name: acl.Name, Id: acl.Id, Scope: scope })
      );
      setAclDetail(res.WebACL);
      logActivity('WAFv2', `GetWebACL: ${acl.Name}`, 'success');
    } catch (err: any) {
      logActivity('WAFv2', `GetWebACL failed: ${acl.Name}`, 'error', err.message);
    } finally {
      setLoadingDetail(false);
    }
  };

  useEffect(() => { fetchWebACLs(scope); }, [scope]);

  // ─── ACL CRUD ─────────────────────────────────────────────────────────────

  const handleCreate = async () => {
    if (!newName) return;
    setSubmitting(true);
    try {
      const metricName = newName.replace(/[^a-zA-Z0-9]/g, '') || 'FlociWAF';
      await clients.waf.send(new CreateWebACLCommand({
        Name: newName,
        Scope: scope,
        DefaultAction: defaultAction === 'ALLOW' ? { Allow: {} } : { Block: {} },
        VisibilityConfig: {
          SampledRequestsEnabled: true,
          CloudWatchMetricsEnabled: true,
          MetricName: metricName,
        },
      }));
      logActivity('WAFv2', `CreateWebACL: ${newName}`, 'success');
      setNewName('');
      setIsCreateModalOpen(false);
      fetchWebACLs(scope);
    } catch (err: any) {
      logActivity('WAFv2', `CreateWebACL failed`, 'error', err.message);
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAcl = async (aclId: string, aclName: string, lockToken?: string) => {
    if (!confirm(`Delete Web ACL "${aclName}"?`)) return;
    try {
      let token = lockToken;
      if (!token) {
        const res = await clients.waf.send(new ListWebACLsCommand({ Scope: scope }));
        token = res.WebACLs?.find(a => a.Id === aclId)?.LockToken;
      }
      if (!token) throw new Error('LockToken not found');
      await clients.waf.send(new DeleteWebACLCommand({
        Name: aclName, Id: aclId, Scope: scope, LockToken: token,
      }));
      logActivity('WAFv2', `DeleteWebACL: ${aclName}`, 'success');
      if (selectedAcl?.Id === aclId) { setSelectedAcl(null); setAclDetail(null); }
      fetchWebACLs(scope);
    } catch (err: any) {
      logActivity('WAFv2', `DeleteWebACL failed`, 'error', err.message);
      alert(err.message);
    }
  };

  // ─── Rule Operations ─────────────────────────────────────────────────────

  const handleAddRule = async () => {
    if (!draft.name || !selectedAcl || !aclDetail) return;
    setSavingRule(true);
    try {
      // Re-fetch fresh LockToken before updating
      const freshRes = await clients.waf.send(
        new GetWebACLCommand({ Name: selectedAcl.Name, Id: selectedAcl.Id, Scope: scope })
      );
      const freshToken = freshRes.LockToken;
      if (!freshToken) throw new Error('Unable to resolve fresh LockToken');

      const existingRules: Rule[] = freshRes.WebACL?.Rules || [];
      const newRule: Rule = {
        Name: draft.name,
        Priority: draft.priority,
        Statement: buildRuleStatement(draft),
        Action: buildRuleAction(draft.action),
        VisibilityConfig: {
          SampledRequestsEnabled: true,
          CloudWatchMetricsEnabled: true,
          MetricName: draft.name.replace(/[^a-zA-Z0-9]/g, ''),
        },
      };

      await clients.waf.send(new UpdateWebACLCommand({
        Name: selectedAcl.Name,
        Id: selectedAcl.Id,
        Scope: scope,
        LockToken: freshToken,
        DefaultAction: freshRes.WebACL?.DefaultAction || { Allow: {} },
        VisibilityConfig: freshRes.WebACL?.VisibilityConfig || {
          SampledRequestsEnabled: true,
          CloudWatchMetricsEnabled: true,
          MetricName: 'FlociWAF',
        },
        Rules: [...existingRules, newRule],
      }));

      logActivity('WAFv2', `AddRule: ${draft.name} → ${selectedAcl.Name}`, 'success');
      setIsRuleModalOpen(false);
      setDraft(BLANK_DRAFT());
      fetchAclDetail(selectedAcl);
    } catch (err: any) {
      logActivity('WAFv2', `AddRule failed`, 'error', err.message);
      alert(err.message);
    } finally {
      setSavingRule(false);
    }
  };

  const handleDeleteRule = async (ruleName: string) => {
    if (!confirm(`Remove rule "${ruleName}" from this Web ACL?`)) return;
    if (!selectedAcl || !aclDetail) return;
    try {
      const freshRes = await clients.waf.send(
        new GetWebACLCommand({ Name: selectedAcl.Name, Id: selectedAcl.Id, Scope: scope })
      );
      const freshToken = freshRes.LockToken;
      if (!freshToken) throw new Error('Unable to resolve fresh LockToken');

      const remaining: Rule[] = (freshRes.WebACL?.Rules || []).filter(
        (r: Rule) => r.Name !== ruleName
      );

      await clients.waf.send(new UpdateWebACLCommand({
        Name: selectedAcl.Name,
        Id: selectedAcl.Id,
        Scope: scope,
        LockToken: freshToken,
        DefaultAction: freshRes.WebACL?.DefaultAction || { Allow: {} },
        VisibilityConfig: freshRes.WebACL?.VisibilityConfig || {
          SampledRequestsEnabled: true,
          CloudWatchMetricsEnabled: true,
          MetricName: 'FlociWAF',
        },
        Rules: remaining,
      }));

      logActivity('WAFv2', `DeleteRule: ${ruleName}`, 'success');
      fetchAclDetail(selectedAcl);
    } catch (err: any) {
      logActivity('WAFv2', `DeleteRule failed`, 'error', err.message);
      alert(err.message);
    }
  };

  // ─── Select ACL ──────────────────────────────────────────────────────────

  const handleSelectAcl = (acl: any) => {
    setSelectedAcl(acl);
    setActiveTab('rules');
    fetchAclDetail(acl);
  };

  const filteredAcls = acls.filter(a => a.Name?.toLowerCase().includes(search.toLowerCase()));
  const rules: Rule[] = aclDetail?.Rules || [];

  // ─── Render ──────────────────────────────────────────────────────────────

  if (selectedAcl) {
    // ── Detail workspace ────────────────────────────────────────────────────
    return (
      <div className="flex flex-col h-full uppercase">
        <PageHeader
          title={`WAFv2 › ${selectedAcl.Name}`}
          icon={<ShieldAlert size={18} />}
          onRefresh={() => fetchAclDetail(selectedAcl)}
          isRefreshing={loadingDetail}
          actions={
            <div className="flex gap-3 items-center">
              <Button
                variant="ghost"
                icon={<ChevronLeft size={14} />}
                onClick={() => { setSelectedAcl(null); setAclDetail(null); }}
              >
                Back to ACLs
              </Button>
              <Button icon={<CirclePlus size={14} />} onClick={() => { setDraft(BLANK_DRAFT()); setIsRuleModalOpen(true); }}>
                Add Rule
              </Button>
            </div>
          }
        />

        {/* Add Rule Modal */}
        <Modal isOpen={isRuleModalOpen} onClose={() => setIsRuleModalOpen(false)} title="Compose New WAF Rule">
          <div className="space-y-4">
            {/* Name + Priority */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold opacity-60 uppercase">Rule Name</label>
                <Input
                  value={draft.name}
                  onChange={e => setDraft(p => ({ ...p, name: e.target.value }))}
                  placeholder="block-high-rate"
                  autoFocus
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold opacity-60 uppercase">Priority</label>
                <Input
                  type="number"
                  value={draft.priority}
                  onChange={e => setDraft(p => ({ ...p, priority: parseInt(e.target.value) || 0 }))}
                  placeholder="0"
                />
              </div>
            </div>

            {/* Rule Type + Action */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold opacity-60 uppercase">Rule Type</label>
                <Select value={draft.ruleType} onChange={e => setDraft(p => ({ ...p, ruleType: e.target.value as RuleType }))}>
                  <option value="RATE_BASED">Rate-based Limit</option>
                  <option value="GEO_MATCH">Geo-blocking</option>
                  <option value="IP_SET">IP Set Reference</option>
                  <option value="REGEX">Byte / Regex Match</option>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold opacity-60 uppercase">Action</label>
                <Select value={draft.action} onChange={e => setDraft(p => ({ ...p, action: e.target.value as RuleAction }))}>
                  <option value="BLOCK">BLOCK</option>
                  <option value="ALLOW">ALLOW</option>
                  <option value="COUNT">COUNT (observe)</option>
                  <option value="CAPTCHA">CAPTCHA</option>
                </Select>
              </div>
            </div>

            {/* Dynamic fields */}
            {draft.ruleType === 'RATE_BASED' && (
              <div className="space-y-1">
                <label className="text-[10px] font-bold opacity-60 uppercase">Request Threshold (per 5 min)</label>
                <Input
                  type="number"
                  value={draft.rateLimit}
                  onChange={e => setDraft(p => ({ ...p, rateLimit: e.target.value }))}
                  placeholder="2000"
                />
              </div>
            )}

            {draft.ruleType === 'GEO_MATCH' && (
              <div className="space-y-1">
                <label className="text-[10px] font-bold opacity-60 uppercase">Country Codes (comma-separated)</label>
                <Input
                  value={draft.countryCodes}
                  onChange={e => setDraft(p => ({ ...p, countryCodes: e.target.value }))}
                  placeholder="RU, CN, KP, IR"
                />
                <p className="text-[9px] opacity-40 normal-case">ISO 3166-1 alpha-2 codes, e.g. US, DE, BR</p>
              </div>
            )}

            {draft.ruleType === 'IP_SET' && (
              <div className="space-y-1">
                <label className="text-[10px] font-bold opacity-60 uppercase">IP Set ARN</label>
                <Input
                  value={draft.ipArn}
                  onChange={e => setDraft(p => ({ ...p, ipArn: e.target.value }))}
                  placeholder="arn:aws:wafv2:us-east-1:123:regional/ipset/blocklist/..."
                />
              </div>
            )}

            {draft.ruleType === 'REGEX' && (
              <div className="space-y-1">
                <label className="text-[10px] font-bold opacity-60 uppercase">Match String (URI path)</label>
                <Input
                  value={draft.regexPattern}
                  onChange={e => setDraft(p => ({ ...p, regexPattern: e.target.value }))}
                  placeholder="/admin"
                />
              </div>
            )}

            <div className="pt-4 flex gap-3">
              <Button variant="ghost" className="flex-1" onClick={() => setIsRuleModalOpen(false)}>Cancel</Button>
              <Button
                className="flex-1"
                onClick={handleAddRule}
                disabled={!draft.name || savingRule}
                icon={<Zap size={13} />}
              >
                {savingRule ? 'Saving...' : 'Deploy Rule'}
              </Button>
            </div>
          </div>
        </Modal>

        {/* Tabs */}
        <div className="border-b border-brand-text flex shrink-0 bg-brand-muted">
          {(['rules', 'config'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 text-[10px] font-bold tracking-widest uppercase transition-all border-r border-brand-text/20 ${
                activeTab === tab
                  ? 'bg-brand-bg border-b-2 border-b-brand-text'
                  : 'opacity-50 hover:opacity-80 hover:bg-white/20'
              }`}
            >
              {tab === 'rules' ? `Rules (${rules.length})` : 'ACL Config'}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-auto p-6 bg-brand-bg">
          {activeTab === 'rules' && (
            <div className="space-y-3">
              {loadingDetail ? (
                [1,2,3].map(i => <Skeleton key={i} className="h-20" />)
              ) : rules.length === 0 ? (
                <div className="py-24 text-center border border-dashed border-brand-text/20">
                  <ShieldCheck size={32} className="mx-auto mb-3 opacity-20" />
                  <p className="text-xs opacity-40 font-mono italic">NO_RULES_CONFIGURED</p>
                  <p className="text-[10px] opacity-30 mt-1 normal-case">All traffic is handled by the Web ACL default action.</p>
                  <Button
                    className="mt-6 mx-auto"
                    icon={<CirclePlus size={13} />}
                    onClick={() => { setDraft(BLANK_DRAFT()); setIsRuleModalOpen(true); }}
                  >
                    Add First Rule
                  </Button>
                </div>
              ) : (
                <>
                  {/* Header */}
                  <div className="grid grid-cols-[2rem_1fr_8rem_8rem_8rem_3rem] gap-4 px-4 text-[8px] font-bold opacity-40 uppercase tracking-widest border-b border-brand-text/10 pb-2">
                    <span>#</span><span>Name</span><span>Type</span><span>Action</span><span>Priority</span><span></span>
                  </div>
                  {/* Rule rows sorted by priority */}
                  {[...rules].sort((a, b) => (a.Priority ?? 0) - (b.Priority ?? 0)).map(rule => (
                    <div
                      key={rule.Name}
                      className="grid grid-cols-[2rem_1fr_8rem_8rem_8rem_3rem] gap-4 items-center px-4 py-3 border border-brand-text/10 bg-white/30 hover:bg-white/50 transition-all hover:border-brand-text/40 group"
                    >
                      <span className="font-mono text-[10px] opacity-40 font-bold">{rule.Priority}</span>
                      <div>
                        <p className="font-bold text-xs truncate">{rule.Name}</p>
                        <p className="text-[9px] font-mono opacity-40 normal-case">{ruleTypeName(rule)}</p>
                      </div>
                      <div className="flex items-center gap-1.5 text-[9px] font-mono opacity-60">
                        {ruleTypeIcon(rule)}
                        <span className="truncate">{ruleTypeName(rule)}</span>
                      </div>
                      <span className={`px-2 py-0.5 border text-[8px] font-bold rounded-sm uppercase tracking-wide inline-block ${actionColor(resolveActionName(rule))}`}>
                        {resolveActionName(rule)}
                      </span>
                      <div className="flex items-center gap-1 text-[9px] font-mono opacity-40">
                        <ArrowUpDown size={10} />
                        {rule.Priority ?? 0}
                      </div>
                      <button
                        onClick={() => handleDeleteRule(rule.Name!)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-rose-600 p-1"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}

          {activeTab === 'config' && (
            <div className="space-y-4 max-w-xl">
              {loadingDetail ? (
                <Skeleton className="h-32" />
              ) : aclDetail ? (
                <>
                  <div className="border border-brand-text p-5 bg-white/40 space-y-4">
                    <h3 className="text-xs font-bold tracking-widest">Web ACL Metadata</h3>
                    {[
                      ['Name', aclDetail.Name],
                      ['ACL ID', aclDetail.Id],
                      ['Scope', scope],
                      ['Default Action', aclDetail.DefaultAction?.Allow ? 'ALLOW' : 'BLOCK'],
                      ['ARN', aclDetail.ARN],
                      ['Metric Name', aclDetail.VisibilityConfig?.MetricName],
                    ].map(([k, v]) => (
                      <div key={k} className="flex gap-4 text-[10px] border-b border-brand-text/10 pb-2 last:border-0">
                        <span className="font-bold opacity-40 w-32 shrink-0">{k}</span>
                        <span className="font-mono truncate normal-case">{v || '—'}</span>
                      </div>
                    ))}
                  </div>
                  <div className="p-3 bg-amber-50 border border-amber-300 text-[9px] text-amber-800 normal-case">
                    <strong>Note:</strong> Sampling and CloudWatch metrics are enabled on this ACL. Use AWS CloudWatch console to view sampled requests and metric graphs.
                  </div>
                </>
              ) : (
                <p className="text-xs opacity-40 italic">Failed to load ACL detail.</p>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── List view ───────────────────────────────────────────────────────────────
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
            <Button onClick={() => setIsCreateModalOpen(true)} icon={<CirclePlus size={14} />}>
              New Web ACL
            </Button>
          </div>
        }
      />

      <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Create Web ACL">
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60">Web ACL Name</label>
            <Input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="production-shield"
              autoFocus
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60">Default Action</label>
            <Select value={defaultAction} onChange={e => setDefaultAction(e.target.value as any)}>
              <option value="ALLOW">ALLOW all traffic</option>
              <option value="BLOCK">BLOCK all traffic</option>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60">Deployment Scope</label>
            <div className="py-2 px-3 border border-brand-text font-mono text-[9px] bg-brand-muted/20">
              {scope} SCOPE SELECTED IN HEADER
            </div>
          </div>
          <div className="pt-4 flex gap-3">
            <Button variant="ghost" className="flex-1" onClick={() => setIsCreateModalOpen(false)}>Cancel</Button>
            <Button className="flex-1" onClick={handleCreate} disabled={!newName || submitting}>
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
            [1, 2, 3].map(i => <Skeleton key={i} className="h-44 animate-pulse" />)
          ) : filteredAcls.length === 0 ? (
            <div className="col-span-full py-20 text-center border border-dashed border-brand-text/20">
              <p className="text-xs opacity-40 font-mono italic">NO_WEB_ACLS_ACTIVE</p>
            </div>
          ) : (
            filteredAcls.map(acl => (
              <Card
                key={acl.ARN}
                className="hover:border-brand-text transition-all bg-white relative flex flex-col justify-between cursor-pointer hover:shadow-md"
                onClick={() => handleSelectAcl(acl)}
              >
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-2 bg-brand-muted border border-brand-text">
                      <ShieldCheck size={20} className="text-brand-text" />
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); handleDeleteAcl(acl.Id!, acl.Name!, acl.LockToken); }}
                      className="p-1 hover:text-rose-600 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <h4 className="font-bold text-xs truncate mb-1">{acl.Name}</h4>
                  <p className="text-[9px] font-mono opacity-50 truncate lowercase">{acl.ARN}</p>
                </div>

                <div className="mt-6 pt-3 border-t border-brand-text/5">
                  <div className="flex items-center justify-between text-[9px] font-mono opacity-60">
                    <div className="flex items-center gap-1">
                      <Sliders size={11} /> LOCK: {acl.LockToken ? 'PRESENT' : 'MISSING'}
                    </div>
                    <div className="flex items-center gap-1">
                      <Activity size={11} /> {scope}
                    </div>
                  </div>
                  <p className="text-[8px] mt-2 opacity-30 italic normal-case">Click to inspect rules →</p>
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
