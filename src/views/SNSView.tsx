import { useState, useEffect, useCallback } from 'react';
import {
  ListTopicsCommand,
  CreateTopicCommand,
  DeleteTopicCommand,
  PublishCommand,
  ListSubscriptionsByTopicCommand,
  SubscribeCommand,
  UnsubscribeCommand,
  GetTopicAttributesCommand,
} from '@aws-sdk/client-sns';
import { useAws } from '../contexts/AwsContext';
import {
  Bell,
  Search,
  CirclePlus,
  Send,
  X,
  Terminal,
  Link,
  Unlink,
  ChevronLeft,
  Users,
  Mail,
  Globe,
  MessageSquare,
} from 'lucide-react';
import { PageHeader, Card, Button, Input, Skeleton, Modal, Select } from '../components/ui-elements';
import { motion, AnimatePresence } from 'motion/react';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const getTopicName = (arn: string) => arn.split(':').pop() ?? arn;

const protocolIcon = (protocol: string) => {
  switch (protocol) {
    case 'email':
    case 'email-json': return <Mail size={12} />;
    case 'http':
    case 'https':     return <Globe size={12} />;
    case 'sqs':       return <MessageSquare size={12} />;
    case 'lambda':    return <Terminal size={12} />;
    default:          return <Link size={12} />;
  }
};

const subStatusColor = (status?: string) => {
  if (!status || status === 'PendingConfirmation') return 'border-amber-400 bg-amber-50 text-amber-800';
  if (status === 'Confirmed') return 'border-emerald-500 bg-emerald-50 text-emerald-800';
  return 'border-neutral-400 bg-neutral-50 text-neutral-600';
};

// ─── Main Component ───────────────────────────────────────────────────────────

const SNSView = () => {
  const { clients, logActivity } = useAws();
  const [topics, setTopics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // Publish panel
  const [publishingTo, setPublishingTo] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [subject, setSubject] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);

  // Create topic modal
  const [isCreationModalOpen, setIsCreationModalOpen] = useState(false);
  const [newTopicName, setNewTopicName] = useState('');
  const [isFifo, setIsFifo] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Topic detail / Subscriptions drill-down
  const [selectedTopicArn, setSelectedTopicArn] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'publish' | 'subscriptions' | 'attributes'>('subscriptions');

  // Attributes
  const [topicAttributes, setTopicAttributes] = useState<Record<string, string>>({});
  const [loadingAttrs, setLoadingAttrs] = useState(false);

  // Subscriptions
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [loadingSubs, setLoadingSubs] = useState(false);

  // Subscribe modal
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [subProtocol, setSubProtocol] = useState('email');
  const [subEndpoint, setSubEndpoint] = useState('');
  const [subscribing, setSubscribing] = useState(false);

  // ─── Data fetching ─────────────────────────────────────────────────────────

  const fetchTopics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await clients.sns.send(new ListTopicsCommand({}));
      setTopics(response.Topics || []);
      logActivity('SNS', 'ListTopics', 'success');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err) || 'Failed to fetch topics');
      logActivity('SNS', 'ListTopics failed', 'error', err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [clients.sns, logActivity]);

  const fetchSubscriptions = async (topicArn: string) => {
    setLoadingSubs(true);
    try {
      const res = await clients.sns.send(
        new ListSubscriptionsByTopicCommand({ TopicArn: topicArn })
      );
      setSubscriptions(res.Subscriptions || []);
      logActivity('SNS', `ListSubscriptionsByTopic: ${getTopicName(topicArn)}`, 'success');
    } catch (err: unknown) {
      logActivity('SNS', `ListSubscriptionsByTopic failed`, 'error', err instanceof Error ? err.message : String(err));
    } finally {
      setLoadingSubs(false);
    }
  };

  const fetchTopicAttributes = useCallback(async (topicArn: string) => {
    setLoadingAttrs(true);
    try {
      const res = await clients.sns.send(new GetTopicAttributesCommand({ TopicArn: topicArn }));
      setTopicAttributes(res.Attributes ?? {});
      logActivity('SNS', `GetTopicAttributes: ${getTopicName(topicArn)}`, 'success');
    } catch (err: unknown) {
      logActivity('SNS', `GetTopicAttributes failed`, 'error', err instanceof Error ? err.message : String(err));
    } finally {
      setLoadingAttrs(false);
    }
  }, [clients.sns, logActivity]);

  useEffect(() => { fetchTopics(); }, [fetchTopics]);

  // ─── Topic CRUD ────────────────────────────────────────────────────────────

  const handleCreateTopic = async () => {
    if (!newTopicName) return;
    setIsCreating(true);
    const name = isFifo && !newTopicName.endsWith('.fifo') ? `${newTopicName}.fifo` : newTopicName;
    try {
      await clients.sns.send(new CreateTopicCommand({
        Name: name,
        Attributes: isFifo ? { FifoTopic: 'true', ContentBasedDeduplication: 'true' } : undefined,
      }));
      logActivity('SNS', `CreateTopic: ${name}`, 'success');
      setNewTopicName('');
      setIsFifo(false);
      setIsCreationModalOpen(false);
      fetchTopics();
    } catch (err: unknown) {
      logActivity('SNS', `CreateTopic failed: ${name}`, 'error', err instanceof Error ? err.message : String(err));
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteTopic = async (arn: string) => {
    if (!confirm(`Drop topic "${getTopicName(arn)}"?`)) return;
    try {
      await clients.sns.send(new DeleteTopicCommand({ TopicArn: arn }));
      logActivity('SNS', `DeleteTopic: ${getTopicName(arn)}`, 'success');
      if (selectedTopicArn === arn) setSelectedTopicArn(null);
      fetchTopics();
    } catch (err: unknown) {
      logActivity('SNS', `DeleteTopic failed`, 'error', err instanceof Error ? err.message : String(err));
      alert(err instanceof Error ? err.message : String(err));
    }
  };

  // ─── Publish ───────────────────────────────────────────────────────────────

  const handlePublish = async () => {
    if (!publishingTo || !message) return;
    setIsPublishing(true);
    try {
      await clients.sns.send(new PublishCommand({
        TopicArn: publishingTo,
        Message: message,
        Subject: subject || undefined,
      }));
      logActivity('SNS', `Publish to: ${getTopicName(publishingTo)}`, 'success');
      setMessage('');
      setSubject('');
    } catch (err: unknown) {
      logActivity('SNS', `Publish failed`, 'error', err instanceof Error ? err.message : String(err));
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setIsPublishing(false);
    }
  };

  // ─── Subscriptions ─────────────────────────────────────────────────────────

  const handleSubscribe = async () => {
    if (!selectedTopicArn || !subEndpoint) return;
    setSubscribing(true);
    try {
      await clients.sns.send(new SubscribeCommand({
        TopicArn: selectedTopicArn,
        Protocol: subProtocol,
        Endpoint: subEndpoint,
      }));
      logActivity('SNS', `Subscribe: ${subProtocol} → ${getTopicName(selectedTopicArn)}`, 'success');
      setIsSubModalOpen(false);
      setSubEndpoint('');
      fetchSubscriptions(selectedTopicArn);
    } catch (err: unknown) {
      logActivity('SNS', `Subscribe failed`, 'error', err instanceof Error ? err.message : String(err));
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setSubscribing(false);
    }
  };

  const handleUnsubscribe = async (subscriptionArn: string) => {
    if (!confirm(`Unsubscribe ${subscriptionArn}?`)) return;
    try {
      await clients.sns.send(new UnsubscribeCommand({ SubscriptionArn: subscriptionArn }));
      logActivity('SNS', `Unsubscribe: ${subscriptionArn.split(':').pop()}`, 'success');
      if (selectedTopicArn) fetchSubscriptions(selectedTopicArn);
    } catch (err: unknown) {
      logActivity('SNS', `Unsubscribe failed`, 'error', err instanceof Error ? err.message : String(err));
      alert(err instanceof Error ? err.message : String(err));
    }
  };

  // ─── Navigation ────────────────────────────────────────────────────────────

  const handleSelectTopic = (arn: string) => {
    setSelectedTopicArn(arn);
    setActiveTab('subscriptions');
    setPublishingTo(arn);
    fetchSubscriptions(arn);
  };

  useEffect(() => {
    if (selectedTopicArn && activeTab === 'attributes') {
      fetchTopicAttributes(selectedTopicArn);
    }
  }, [activeTab, selectedTopicArn, fetchTopicAttributes]);

  const filteredTopics = topics.filter(t =>
    t.TopicArn?.toLowerCase().includes(search.toLowerCase())
  );

  // ─── Detail workspace ──────────────────────────────────────────────────────

  if (selectedTopicArn) {
    const topicName = getTopicName(selectedTopicArn);

    return (
      <div className="flex flex-col h-full uppercase">
        <PageHeader
          title={`SNS › ${topicName}`}
          icon={<Bell size={18} />}
          onRefresh={() => fetchSubscriptions(selectedTopicArn)}
          isRefreshing={loadingSubs}
          actions={
            <div className="flex gap-3">
              <Button
                variant="ghost"
                icon={<ChevronLeft size={14} />}
                onClick={() => { setSelectedTopicArn(null); setPublishingTo(null); }}
              >
                Back to Topics
              </Button>
              <Button icon={<CirclePlus size={14} />} onClick={() => setIsSubModalOpen(true)}>
                Add Subscription
              </Button>
            </div>
          }
        />

        {/* Subscribe modal */}
        <Modal isOpen={isSubModalOpen} onClose={() => setIsSubModalOpen(false)} title="Add Subscription">
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase opacity-60">Protocol</label>
              <Select value={subProtocol} onChange={e => setSubProtocol(e.target.value)}>
                <option value="email">Email</option>
                <option value="email-json">Email (JSON)</option>
                <option value="http">HTTP</option>
                <option value="https">HTTPS</option>
                <option value="sqs">SQS</option>
                <option value="lambda">Lambda</option>
                <option value="sms">SMS</option>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase opacity-60">Endpoint</label>
              <Input
                value={subEndpoint}
                onChange={e => setSubEndpoint(e.target.value)}
                placeholder={
                  subProtocol === 'email' ? 'user@example.com' :
                  subProtocol === 'sqs' ? 'arn:aws:sqs:...' :
                  subProtocol === 'lambda' ? 'arn:aws:lambda:...' :
                  'https://example.com/webhook'
                }
                autoFocus
              />
            </div>
            <div className="p-3 border border-brand-text/20 bg-brand-muted/20 text-[9px] opacity-60 normal-case">
              Topic ARN: <span className="font-mono">{selectedTopicArn}</span>
            </div>
            <div className="pt-4 flex gap-3">
              <Button variant="ghost" className="flex-1" onClick={() => setIsSubModalOpen(false)}>Cancel</Button>
              <Button
                className="flex-1"
                onClick={handleSubscribe}
                disabled={!subEndpoint || subscribing}
                icon={<Link size={13} />}
              >
                {subscribing ? 'Subscribing...' : 'Subscribe'}
              </Button>
            </div>
          </div>
        </Modal>

        {/* Tabs */}
        <div className="border-b border-brand-text flex shrink-0 bg-brand-muted">
          {(['subscriptions', 'publish', 'attributes'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 text-[10px] font-bold tracking-widest uppercase transition-all border-r border-brand-text/20 ${
                activeTab === tab
                  ? 'bg-brand-bg border-b-2 border-b-brand-text'
                  : 'opacity-50 hover:opacity-80 hover:bg-white/20'
              }`}
            >
              {tab === 'subscriptions' ? `Subscriptions (${subscriptions.length})` :
               tab === 'publish' ? 'Publish Message' : 'Attributes'}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-auto p-6 bg-brand-bg">
          {/* ── Subscriptions Tab ── */}
          {activeTab === 'subscriptions' && (
            <div className="space-y-3">
              {loadingSubs ? (
                [1, 2].map(i => <Skeleton key={i} className="h-16" />)
              ) : subscriptions.length === 0 ? (
                <div className="py-24 text-center border border-dashed border-brand-text/20">
                  <Users size={32} className="mx-auto mb-3 opacity-20" />
                  <p className="text-xs opacity-40 font-mono italic">NO_SUBSCRIPTIONS_ACTIVE</p>
                  <p className="text-[10px] opacity-30 mt-1 normal-case">
                    This topic has no subscribers. Add one using the button above.
                  </p>
                  <Button
                    className="mt-6 mx-auto"
                    icon={<CirclePlus size={13} />}
                    onClick={() => setIsSubModalOpen(true)}
                  >
                    Add First Subscription
                  </Button>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-[2rem_8rem_1fr_1fr_3rem] gap-4 px-4 text-[8px] font-bold opacity-40 uppercase tracking-widest border-b border-brand-text/10 pb-2">
                    <span></span>
                    <span>Protocol</span>
                    <span>Endpoint</span>
                    <span>Status</span>
                    <span></span>
                  </div>
                  {subscriptions.map(sub => (
                    <div
                      key={sub.SubscriptionArn}
                      className="grid grid-cols-[2rem_8rem_1fr_1fr_3rem] gap-4 items-center px-4 py-3 border border-brand-text/10 bg-white/30 hover:bg-white/50 transition-all group"
                    >
                      <span className="text-brand-text/50">{protocolIcon(sub.Protocol)}</span>
                      <span className="font-mono text-[10px] font-bold uppercase">{sub.Protocol}</span>
                      <span className="font-mono text-[10px] truncate normal-case" title={sub.Endpoint}>
                        {sub.Endpoint || '—'}
                      </span>
                      <span className={`px-2 py-0.5 border text-[8px] font-bold rounded-sm uppercase tracking-wide inline-block w-fit ${
                        sub.SubscriptionArn === 'PendingConfirmation'
                          ? subStatusColor('PendingConfirmation')
                          : subStatusColor('Confirmed')
                      }`}>
                        {sub.SubscriptionArn === 'PendingConfirmation' ? 'Pending' : 'Confirmed'}
                      </span>
                      <button
                        onClick={() => handleUnsubscribe(sub.SubscriptionArn!)}
                        disabled={sub.SubscriptionArn === 'PendingConfirmation'}
                        className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-rose-600 p-1 disabled:opacity-20"
                        title="Unsubscribe"
                      >
                        <Unlink size={14} />
                      </button>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}

          {/* ── Publish Tab ── */}
          {activeTab === 'publish' && (
            <div className="max-w-xl space-y-5">
              <div className="border border-brand-text p-4 bg-white/50 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <Terminal size={14} className="opacity-60" />
                  <h3 className="text-xs font-bold tracking-widest">Publish to {topicName}</h3>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase opacity-60">Subject (optional)</label>
                  <Input
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    placeholder="Alert: High CPU detected"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase opacity-60">Message Body</label>
                  <textarea
                    className="w-full bg-white border border-brand-text px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-brand-text transition-all placeholder:italic font-mono min-h-[120px]"
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    placeholder='{"event": "alarm", "value": 95.2}'
                  />
                </div>

                <Button
                  className="w-full"
                  onClick={handlePublish}
                  disabled={!message || isPublishing}
                  icon={<Send size={13} />}
                >
                  {isPublishing ? 'Broadcasting...' : 'Broadcast Message'}
                </Button>
              </div>

              <div className="p-3 bg-brand-muted/30 border border-brand-text/20 text-[9px] opacity-60 normal-case">
                <strong>Topic ARN:</strong> <span className="font-mono">{selectedTopicArn}</span>
              </div>
            </div>
          )}

          {/* ── Attributes Tab ── */}
          {activeTab === 'attributes' && (
            <div className="max-w-2xl space-y-4">
              {loadingAttrs ? (
                [1, 2, 3, 4].map(i => <Skeleton key={i} className="h-10" />)
              ) : (
                <div className="border border-brand-text/20 divide-y divide-brand-text/10 bg-white/50">
                  <div className="grid grid-cols-2 gap-4 px-4 py-2 text-[8px] font-bold uppercase tracking-widest opacity-40 bg-brand-muted/30">
                    <span>Attribute</span>
                    <span>Value</span>
                  </div>
                  {Object.entries(topicAttributes).length === 0 ? (
                    <div className="px-4 py-8 text-center text-[10px] opacity-30 italic">
                      No attributes returned. Try refreshing.
                    </div>
                  ) : (
                    (() => {
                      const labels: Record<string, string> = {
                        TopicArn: 'Topic ARN',
                        DisplayName: 'Display Name',
                        Owner: 'Owner',
                        SubscriptionsConfirmed: 'Confirmed Subs',
                        SubscriptionsPending: 'Pending Subs',
                        SubscriptionsDeleted: 'Deleted Subs',
                        DeliveryPolicy: 'Delivery Policy',
                        EffectiveDeliveryPolicy: 'Effective Delivery Policy',
                        Policy: 'Access Policy',
                        FifoTopic: 'FIFO Topic',
                        ContentBasedDeduplication: 'Content-Based Dedup.',
                        KmsMasterKeyId: 'KMS Key ID',
                      };
                      return Object.entries(topicAttributes).map(([key, val]) => (
                        <div key={key} className="grid grid-cols-2 gap-4 px-4 py-3 hover:bg-white/70 items-start">
                          <span className="text-[10px] font-bold uppercase tracking-wide opacity-70">
                            {labels[key] ?? key}
                          </span>
                          <span className="font-mono text-[10px] break-all normal-case leading-relaxed">
                            {val === 'true' || val === 'false'
                              ? <span className={`px-2 py-0.5 border text-[8px] font-bold uppercase ${val === 'true' ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : 'border-neutral-300 bg-neutral-50 text-neutral-500'}`}>{val}</span>
                              : val || <span className="opacity-30 italic">—</span>
                            }
                          </span>
                        </div>
                      ));
                    })()
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── Topic list ────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full uppercase">
      <PageHeader
        title="SNS Topics"
        icon={<Bell size={18} />}
        onRefresh={fetchTopics}
        isRefreshing={loading}
        actions={
          <Button onClick={() => setIsCreationModalOpen(true)} icon={<CirclePlus size={14} />}>
            Create Topic
          </Button>
        }
      />

      <Modal isOpen={isCreationModalOpen} onClose={() => setIsCreationModalOpen(false)} title="Create SNS Topic">
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60">Topic Name</label>
            <Input
              value={newTopicName}
              onChange={e => setNewTopicName(e.target.value)}
              placeholder={isFifo ? 'OrderEvents (will add .fifo)' : 'SystemAlerts'}
              autoFocus
            />
          </div>
          <label className="flex items-center gap-3 cursor-pointer select-none group">
            <div
              onClick={() => setIsFifo(f => !f)}
              className={`w-9 h-5 border transition-colors flex items-center px-0.5 ${isFifo ? 'bg-brand-text border-brand-text' : 'bg-transparent border-brand-text/40'}`}
            >
              <div className={`w-4 h-4 transition-transform ${isFifo ? 'translate-x-4 bg-brand-bg' : 'translate-x-0 bg-brand-text/30'}`} />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wide">FIFO Topic</span>
            {isFifo && (
              <span className="text-[9px] opacity-50 normal-case font-mono">
                Name will be suffixed with .fifo — enables ordering &amp; deduplication
              </span>
            )}
          </label>
          <div className="pt-4 flex gap-3">
            <Button variant="ghost" className="flex-1" onClick={() => { setIsCreationModalOpen(false); setIsFifo(false); }}>Cancel</Button>
            <Button className="flex-1" onClick={handleCreateTopic} disabled={!newTopicName || isCreating}>
              {isCreating ? 'Creating...' : 'Create Topic'}
            </Button>
          </div>
        </div>
      </Modal>

      <div className="p-6 space-y-6 flex-1 overflow-auto bg-brand-bg">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text opacity-30" size={14} />
          <Input
            placeholder="Filter Topics..."
            className="pl-10 font-mono text-[11px]"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Publish inline panel */}
        <AnimatePresence>
          {publishingTo && !selectedTopicArn && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <Card className="bg-brand-text text-brand-bg mb-6">
                <div className="flex items-center justify-between mb-4 border-b border-brand-bg/20 pb-2">
                  <h3 className="font-bold text-[10px] tracking-widest flex items-center gap-2">
                    <Terminal size={14} />
                    PUB: {getTopicName(publishingTo)}
                  </h3>
                  <button onClick={() => setPublishingTo(null)}><X size={16} /></button>
                </div>
                <textarea
                  className="w-full bg-brand-bg/10 border border-brand-bg/30 text-brand-bg p-4 font-mono text-xs mb-4 min-h-[100px] focus:outline-none"
                  placeholder="Enter message content..."
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                />
                <div className="flex justify-end">
                  <Button variant="secondary" onClick={handlePublish} disabled={isPublishing}>
                    {isPublishing ? 'BROADCASTING...' : 'BROADCAST_MESSAGE'}
                  </Button>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 gap-4">
          {loading ? (
            [1, 2].map(i => <Skeleton key={i} className="h-20" />)
          ) : error ? (
            <Card className="text-rose-600 font-mono text-[10px] text-center py-10 border-rose-600 bg-rose-50">{error}</Card>
          ) : filteredTopics.length === 0 ? (
            <Card className="text-brand-text opacity-30 text-center py-12 italic text-[10px] uppercase font-bold tracking-widest bg-brand-muted/30 border-dashed">
              No topics found.
            </Card>
          ) : (
            filteredTopics.map(topic => (
              <Card
                key={topic.TopicArn}
                className="group hover:bg-brand-text hover:text-brand-bg transition-colors"
              >
                <div className="flex items-center justify-between">
                  <button
                    className="flex items-center gap-4 flex-1 text-left"
                    onClick={() => handleSelectTopic(topic.TopicArn!)}
                  >
                    <div className="w-10 h-10 border border-brand-text flex items-center justify-center opacity-70 group-hover:border-brand-bg shrink-0">
                      <Bell size={18} />
                    </div>
                    <div>
                      <h4 className="font-bold text-[11px] font-mono">{getTopicName(topic.TopicArn!)}</h4>
                      <p className="text-[10px] opacity-50 truncate max-w-md font-mono lowercase">{topic.TopicArn}</p>
                    </div>
                  </button>
                  <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest shrink-0">
                    <button
                      onClick={() => { setPublishingTo(topic.TopicArn!); setSelectedTopicArn(null); }}
                      className="hover:underline flex items-center gap-1.5 group-hover:text-brand-bg"
                    >
                      <Send size={12} /> Publish
                    </button>
                    <button
                      onClick={() => handleSelectTopic(topic.TopicArn!)}
                      className="hover:underline flex items-center gap-1.5 group-hover:text-brand-bg"
                    >
                      <Users size={12} /> Subs
                    </button>
                    <button
                      onClick={() => handleDeleteTopic(topic.TopicArn!)}
                      className="hover:text-rose-500 font-bold group-hover:text-rose-400"
                    >
                      DROP
                    </button>
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

export default SNSView;
