import { useState, useEffect } from 'react';
import {
  ListQueuesCommand,
  CreateQueueCommand,
  DeleteQueueCommand,
  SendMessageCommand,
  ReceiveMessageCommand,
  DeleteMessageCommand,
  GetQueueAttributesCommand,
  PurgeQueueCommand,
  type Message,
} from '@aws-sdk/client-sqs';
import { useAws } from '../contexts/AwsContext';
import {
  MessageSquare, Search, CirclePlus, Send, Terminal,
  ChevronLeft, Inbox, Settings2, Trash2, RefreshCw,
} from 'lucide-react';
import { PageHeader, Card, Button, Input, Skeleton, Modal } from '../components/ui-elements';
import { motion, AnimatePresence } from 'motion/react';

const getQueueName = (url: string) => url.split('/').pop() ?? url;

const SQSView = () => {
  const { clients, logActivity } = useAws();
  const [queues, setQueues] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // Create modal
  const [isCreationModalOpen, setIsCreationModalOpen] = useState(false);
  const [newQueueName, setNewQueueName] = useState('');
  const [isFifo, setIsFifo] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Detail drill-down
  const [selectedQueue, setSelectedQueue] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'messages' | 'send' | 'attributes'>('messages');

  // Messages tab
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [expandedMsg, setExpandedMsg] = useState<string | null>(null);

  // Send tab
  const [messageBody, setMessageBody] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Attributes tab
  const [attributes, setAttributes] = useState<Record<string, string>>({});
  const [loadingAttrs, setLoadingAttrs] = useState(false);

  const fetchQueues = async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await clients.sqs.send(new ListQueuesCommand({}));
      setQueues(r.QueueUrls || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchQueues(); }, []);

  const handleCreateQueue = async () => {
    if (!newQueueName) return;
    const name = isFifo && !newQueueName.endsWith('.fifo') ? `${newQueueName}.fifo` : newQueueName;
    setIsCreating(true);
    try {
      const attrs: Record<string, string> = {};
      if (isFifo) { attrs.FifoQueue = 'true'; attrs.ContentBasedDeduplication = 'true'; }
      await clients.sqs.send(new CreateQueueCommand({ QueueName: name, Attributes: attrs }));
      logActivity('SQS', `CreateQueue: ${name}`, 'success');
      setNewQueueName(''); setIsFifo(false); setIsCreationModalOpen(false);
      fetchQueues();
    } catch (err: unknown) {
      logActivity('SQS', `CreateQueue failed: ${name}`, 'error', err instanceof Error ? err.message : String(err));
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteQueue = async (url: string) => {
    if (!confirm(`Drop queue "${getQueueName(url)}"?`)) return;
    try {
      await clients.sqs.send(new DeleteQueueCommand({ QueueUrl: url }));
      logActivity('SQS', `DeleteQueue: ${getQueueName(url)}`, 'success');
      if (selectedQueue === url) setSelectedQueue(null);
      fetchQueues();
    } catch (err: unknown) {
      logActivity('SQS', `DeleteQueue failed`, 'error', err instanceof Error ? err.message : String(err));
      alert(err instanceof Error ? err.message : String(err));
    }
  };

  const handleSelectQueue = (url: string) => {
    setSelectedQueue(url);
    setActiveTab('messages');
    setMessages([]);
    setAttributes({});
  };

  // ── Messages tab ────────────────────────────────────────────────────────────

  const handleReceiveMessages = async () => {
    if (!selectedQueue) return;
    setLoadingMessages(true);
    try {
      const r = await clients.sqs.send(new ReceiveMessageCommand({
        QueueUrl: selectedQueue,
        MaxNumberOfMessages: 10,
        WaitTimeSeconds: 0,
        AttributeNames: ['All'],
        MessageAttributeNames: ['All'],
      }));
      const received = r.Messages || [];
      setMessages(received);
      logActivity('SQS', `ReceiveMessage from: ${getQueueName(selectedQueue)} (${received.length} msgs)`, 'success');
    } catch (err: unknown) {
      logActivity('SQS', `ReceiveMessage failed`, 'error', err instanceof Error ? err.message : String(err));
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleAckMessage = async (msg: Message) => {
    if (!selectedQueue || !msg.ReceiptHandle) return;
    try {
      await clients.sqs.send(new DeleteMessageCommand({ QueueUrl: selectedQueue, ReceiptHandle: msg.ReceiptHandle }));
      logActivity('SQS', `DeleteMessage: ${msg.MessageId?.slice(0, 8)}...`, 'success');
      setMessages(prev => prev.filter(m => m.MessageId !== msg.MessageId));
    } catch (err: unknown) {
      logActivity('SQS', `DeleteMessage failed`, 'error', err instanceof Error ? err.message : String(err));
      alert(err instanceof Error ? err.message : String(err));
    }
  };

  const handlePurge = async () => {
    if (!selectedQueue) return;
    if (!confirm(`Purge ALL messages from "${getQueueName(selectedQueue)}"? This cannot be undone.`)) return;
    try {
      await clients.sqs.send(new PurgeQueueCommand({ QueueUrl: selectedQueue }));
      logActivity('SQS', `PurgeQueue: ${getQueueName(selectedQueue)}`, 'success');
      setMessages([]);
    } catch (err: unknown) {
      logActivity('SQS', `PurgeQueue failed`, 'error', err instanceof Error ? err.message : String(err));
      alert(err instanceof Error ? err.message : String(err));
    }
  };

  // ── Send tab ────────────────────────────────────────────────────────────────

  const handleSendMessage = async () => {
    if (!selectedQueue || !messageBody) return;
    setIsSending(true);
    try {
      const isfifo = selectedQueue.endsWith('.fifo');
      await clients.sqs.send(new SendMessageCommand({
        QueueUrl: selectedQueue,
        MessageBody: messageBody,
        ...(isfifo ? { MessageGroupId: 'default' } : {}),
      }));
      logActivity('SQS', `SendMessage to: ${getQueueName(selectedQueue)}`, 'success');
      setMessageBody('');
    } catch (err: unknown) {
      logActivity('SQS', `SendMessage failed`, 'error', err instanceof Error ? err.message : String(err));
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSending(false);
    }
  };

  // ── Attributes tab ──────────────────────────────────────────────────────────

  const handleLoadAttributes = async () => {
    if (!selectedQueue) return;
    setLoadingAttrs(true);
    try {
      const r = await clients.sqs.send(new GetQueueAttributesCommand({ QueueUrl: selectedQueue, AttributeNames: ['All'] }));
      setAttributes(r.Attributes || {});
      logActivity('SQS', `GetQueueAttributes: ${getQueueName(selectedQueue)}`, 'success');
    } catch (err: unknown) {
      logActivity('SQS', `GetQueueAttributes failed`, 'error', err instanceof Error ? err.message : String(err));
    } finally {
      setLoadingAttrs(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'attributes' && selectedQueue) handleLoadAttributes();
  }, [activeTab, selectedQueue]);

  const filteredQueues = queues.filter(q => q.toLowerCase().includes(search.toLowerCase()));

  // ── Detail view ─────────────────────────────────────────────────────────────

  if (selectedQueue) {
    const qname = getQueueName(selectedQueue);
    const tabs = ['messages', 'send', 'attributes'] as const;

    return (
      <div className="flex flex-col h-full uppercase">
        <PageHeader
          title={`SQS › ${qname}`}
          icon={<MessageSquare size={18} />}
          onRefresh={activeTab === 'attributes' ? handleLoadAttributes : activeTab === 'messages' ? handleReceiveMessages : undefined}
          isRefreshing={loadingMessages || loadingAttrs}
          actions={
            <div className="flex gap-3">
              <Button variant="ghost" icon={<ChevronLeft size={14} />} onClick={() => setSelectedQueue(null)}>
                Back
              </Button>
              <Button
                variant="ghost"
                icon={<Trash2 size={13} />}
                onClick={handlePurge}
                className="hover:text-rose-600 hover:border-rose-600"
              >
                Purge
              </Button>
              <Button
                onClick={() => handleDeleteQueue(selectedQueue)}
                className="bg-rose-600 border-rose-600 text-white hover:bg-rose-700"
              >
                Drop Queue
              </Button>
            </div>
          }
        />

        {/* Tabs */}
        <div className="border-b border-brand-text flex shrink-0 bg-brand-muted">
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 text-[10px] font-bold tracking-widest uppercase transition-all border-r border-brand-text/20 ${
                activeTab === tab
                  ? 'bg-brand-bg border-b-2 border-b-brand-text'
                  : 'opacity-50 hover:opacity-80 hover:bg-white/20'
              }`}
            >
              {tab === 'messages' ? `Messages${messages.length > 0 ? ` (${messages.length})` : ''}` : tab === 'send' ? 'Send Message' : 'Attributes'}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-auto p-6 bg-brand-bg">

          {/* ── Messages tab ── */}
          {activeTab === 'messages' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Button
                  onClick={handleReceiveMessages}
                  disabled={loadingMessages}
                  icon={<RefreshCw size={13} className={loadingMessages ? 'animate-spin' : ''} />}
                >
                  {loadingMessages ? 'Receiving...' : 'Receive Messages'}
                </Button>
                <p className="text-[9px] opacity-40 normal-case font-mono">
                  Pulls up to 10 messages. They remain invisible until acknowledged (ACK) or visibility timeout expires.
                </p>
              </div>

              {messages.length === 0 ? (
                <div className="py-24 text-center border border-dashed border-brand-text/20">
                  <Inbox size={32} className="mx-auto mb-3 opacity-20" />
                  <p className="text-xs opacity-40 font-mono italic">NO_MESSAGES_RECEIVED</p>
                  <p className="text-[10px] opacity-30 mt-1 normal-case">Click "Receive Messages" to poll the queue.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="grid grid-cols-[1fr_6rem_5rem] gap-4 px-4 text-[8px] font-bold opacity-40 uppercase tracking-widest border-b border-brand-text/10 pb-2">
                    <span>Message ID / Body</span>
                    <span>Sent</span>
                    <span></span>
                  </div>
                  {messages.map(msg => (
                    <div key={msg.MessageId} className="border border-brand-text/10 bg-white/40">
                      <div
                        className="grid grid-cols-[1fr_6rem_5rem] gap-4 items-center px-4 py-3 cursor-pointer hover:bg-white/60"
                        onClick={() => setExpandedMsg(expandedMsg === msg.MessageId ? null : (msg.MessageId ?? null))}
                      >
                        <div>
                          <p className="font-mono text-[9px] opacity-40 font-bold uppercase">{msg.MessageId}</p>
                          <p className="font-mono text-[11px] truncate normal-case mt-0.5">
                            {msg.Body ? (msg.Body.length > 80 ? msg.Body.slice(0, 80) + '…' : msg.Body) : '(empty)'}
                          </p>
                        </div>
                        <span className="font-mono text-[9px] opacity-50 normal-case">
                          {msg.Attributes?.SentTimestamp
                            ? new Date(parseInt(msg.Attributes.SentTimestamp)).toLocaleTimeString()
                            : '—'}
                        </span>
                        <button
                          onClick={e => { e.stopPropagation(); handleAckMessage(msg); }}
                          className="flex items-center gap-1 text-[9px] font-bold border border-emerald-600 text-emerald-700 px-2 py-1 hover:bg-emerald-50 transition-colors"
                          title="Acknowledge and delete message"
                        >
                          ACK
                        </button>
                      </div>
                      <AnimatePresence>
                        {expandedMsg === msg.MessageId && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="px-4 pb-4 border-t border-brand-text/10">
                              <pre className="mt-3 bg-brand-console text-brand-green p-3 font-mono text-[10px] overflow-auto max-h-48 whitespace-pre-wrap break-all normal-case">
                                {(() => { try { return JSON.stringify(JSON.parse(msg.Body || ''), null, 2); } catch { return msg.Body || ''; } })()}
                              </pre>
                              {msg.ReceiptHandle && (
                                <p className="mt-2 text-[8px] opacity-30 font-mono normal-case truncate">
                                  receipt: {msg.ReceiptHandle.slice(0, 60)}…
                                </p>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Send tab ── */}
          {activeTab === 'send' && (
            <div className="max-w-xl space-y-5">
              <div className="border border-brand-text p-4 bg-white/50 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <Terminal size={14} className="opacity-60" />
                  <h3 className="text-xs font-bold tracking-widest">Send to {qname}</h3>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase opacity-60">Message Body</label>
                  <textarea
                    className="w-full bg-white border border-brand-text px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-brand-text placeholder:italic font-mono min-h-[120px]"
                    value={messageBody}
                    onChange={e => setMessageBody(e.target.value)}
                    placeholder='{"event": "test", "payload": {}}'
                  />
                </div>
                <Button className="w-full" onClick={handleSendMessage} disabled={!messageBody || isSending} icon={<Send size={13} />}>
                  {isSending ? 'Dispatching...' : 'Dispatch Message'}
                </Button>
              </div>
              <div className="p-3 bg-brand-muted/30 border border-brand-text/20 text-[9px] opacity-60 normal-case">
                <strong>Queue URL:</strong> <span className="font-mono">{selectedQueue}</span>
              </div>
            </div>
          )}

          {/* ── Attributes tab ── */}
          {activeTab === 'attributes' && (
            <div className="max-w-xl">
              {loadingAttrs ? (
                <div className="space-y-2">{[1,2,3,4].map(i => <Skeleton key={i} className="h-10" />)}</div>
              ) : Object.keys(attributes).length === 0 ? (
                <div className="py-16 text-center border border-dashed border-brand-text/20">
                  <Settings2 size={28} className="mx-auto mb-3 opacity-20" />
                  <p className="text-[10px] opacity-40 font-mono italic">NO_ATTRIBUTES_LOADED</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {[
                    ['ApproximateNumberOfMessages', 'Messages Available'],
                    ['ApproximateNumberOfMessagesNotVisible', 'Messages In-Flight'],
                    ['ApproximateNumberOfMessagesDelayed', 'Messages Delayed'],
                    ['VisibilityTimeout', 'Visibility Timeout (s)'],
                    ['MessageRetentionPeriod', 'Retention Period (s)'],
                    ['MaximumMessageSize', 'Max Message Size (B)'],
                    ['DelaySeconds', 'Delivery Delay (s)'],
                    ['FifoQueue', 'FIFO Queue'],
                    ['ContentBasedDeduplication', 'Content Deduplication'],
                    ['RedrivePolicy', 'DLQ Redrive Policy'],
                    ['QueueArn', 'Queue ARN'],
                    ['CreatedTimestamp', 'Created At'],
                    ['LastModifiedTimestamp', 'Last Modified'],
                  ].map(([key, label]) =>
                    attributes[key] != null ? (
                      <div key={key} className="grid grid-cols-[12rem_1fr] gap-4 px-4 py-2.5 border border-brand-text/10 bg-white/40 hover:bg-white/60">
                        <span className="text-[9px] font-bold uppercase tracking-wide opacity-60">{label}</span>
                        <span className="font-mono text-[10px] normal-case break-all">
                          {key.includes('Timestamp')
                            ? new Date(parseInt(attributes[key]) * 1000).toLocaleString()
                            : attributes[key]}
                        </span>
                      </div>
                    ) : null
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Queue list ───────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full uppercase">
      <PageHeader
        title="SQS Queues"
        icon={<MessageSquare size={18} />}
        onRefresh={fetchQueues}
        isRefreshing={loading}
        actions={
          <Button onClick={() => setIsCreationModalOpen(true)} icon={<CirclePlus size={14} />}>
            Create Queue
          </Button>
        }
      />

      <Modal isOpen={isCreationModalOpen} onClose={() => setIsCreationModalOpen(false)} title="Create SQS Queue">
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60">Queue Name</label>
            <Input
              value={newQueueName}
              onChange={e => setNewQueueName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreateQueue()}
              placeholder="my-queue"
              autoFocus
            />
          </div>
          <div className="flex items-center gap-3 p-3 bg-brand-muted/30 border border-brand-text">
            <input type="checkbox" id="isFifo" checked={isFifo} onChange={e => setIsFifo(e.target.checked)} className="accent-brand-text" />
            <label htmlFor="isFifo" className="text-[10px] font-bold uppercase cursor-pointer">FIFO Queue (ordered, exactly-once)</label>
          </div>
          {isFifo && (
            <div className="p-3 bg-blue-50 border border-blue-200 text-[10px] text-blue-800 italic normal-case">
              FIFO queues require the .fifo suffix — it will be added automatically.
            </div>
          )}
          <div className="pt-4 flex gap-3">
            <Button variant="ghost" className="flex-1" onClick={() => setIsCreationModalOpen(false)}>Cancel</Button>
            <Button className="flex-1" onClick={handleCreateQueue} disabled={!newQueueName || isCreating}>
              {isCreating ? 'Creating...' : 'Create Queue'}
            </Button>
          </div>
        </div>
      </Modal>

      <div className="p-6 space-y-6 flex-1 overflow-auto bg-brand-bg">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text opacity-30" size={14} />
          <Input placeholder="Filter Queues..." className="pl-10 font-mono text-[11px]" value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        <div className="grid grid-cols-1 gap-4">
          {loading ? (
            [1, 2].map(i => <Skeleton key={i} className="h-20" />)
          ) : error ? (
            <Card className="text-rose-600 font-mono text-[10px] text-center py-10 border-rose-600 bg-rose-50">{error}</Card>
          ) : filteredQueues.length === 0 ? (
            <Card className="text-brand-text opacity-30 text-center py-12 italic text-[10px] uppercase font-bold tracking-widest bg-brand-muted/30 border-dashed">No queues found.</Card>
          ) : (
            filteredQueues.map(url => (
              <Card key={url} className="group hover:bg-brand-text hover:text-brand-bg transition-colors">
                <div className="flex items-center justify-between">
                  <button className="flex items-center gap-4 flex-1 text-left" onClick={() => handleSelectQueue(url)}>
                    <div className="w-10 h-10 border border-brand-text flex items-center justify-center opacity-70 group-hover:border-brand-bg shrink-0">
                      <MessageSquare size={18} />
                    </div>
                    <div>
                      <h4 className="font-bold text-[11px] font-mono">{getQueueName(url)}</h4>
                      <p className="text-[9px] opacity-50 truncate max-w-md font-mono lowercase">{url}</p>
                    </div>
                  </button>
                  <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest shrink-0">
                    <button onClick={() => { handleSelectQueue(url); setActiveTab('send'); }} className="hover:underline flex items-center gap-1.5 group-hover:text-brand-bg">
                      <Send size={12} /> Send
                    </button>
                    <button onClick={() => handleSelectQueue(url)} className="hover:underline flex items-center gap-1.5 group-hover:text-brand-bg">
                      <Inbox size={12} /> Inspect
                    </button>
                    <button onClick={() => handleDeleteQueue(url)} className="hover:text-rose-500 font-bold group-hover:text-rose-400">
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

export default SQSView;
