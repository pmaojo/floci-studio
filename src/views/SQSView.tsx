import { useState, useEffect } from 'react';
import { ListQueuesCommand, CreateQueueCommand, DeleteQueueCommand, SendMessageCommand } from '@aws-sdk/client-sqs';
import { useAws } from '../contexts/AwsContext';
import { MessageSquare, Search, CirclePlus, Send, X, Terminal } from 'lucide-react';
import { PageHeader, Card, Button, Input, Skeleton, Modal } from '../components/ui-elements';
import { motion, AnimatePresence } from 'motion/react';

const SQSView = () => {
  const { clients, logActivity } = useAws();
  const [queues, setQueues] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sendingMessageTo, setSendingMessageTo] = useState<string | null>(null);
  const [messageBody, setMessageBody] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isCreationModalOpen, setIsCreationModalOpen] = useState(false);
  const [newQueueName, setNewQueueName] = useState('');
  const [isFifo, setIsFifo] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const fetchQueues = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await clients.sqs.send(new ListQueuesCommand({}));
      setQueues(response.QueueUrls || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch queues');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueues();
  }, []);

  const handleCreateQueue = async () => {
    if (!newQueueName) return;
    const finalName = isFifo && !newQueueName.endsWith('.fifo') ? `${newQueueName}.fifo` : newQueueName;
    setIsCreating(true);
    try {
      const attributes: Record<string, string> = {};
      if (isFifo) {
        attributes.FifoQueue = 'true';
        attributes.ContentBasedDeduplication = 'true';
      }
      
      await clients.sqs.send(new CreateQueueCommand({ 
        QueueName: finalName,
        Attributes: attributes
      }));
      logActivity('SQS', `CreateQueue: ${finalName}`, 'success');
      setNewQueueName('');
      setIsFifo(false);
      setIsCreationModalOpen(false);
      fetchQueues();
    } catch (err: any) {
      logActivity('SQS', `CreateQueue failed: ${finalName}`, 'error', err.message);
      alert(err.message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteQueue = async (url: string) => {
    const name = getQueueName(url);
    if (!confirm('Are you sure?')) return;
    try {
      await clients.sqs.send(new DeleteQueueCommand({ QueueUrl: url }));
      logActivity('SQS', `DeleteQueue: ${name}`, 'success');
      fetchQueues();
    } catch (err: any) {
      logActivity('SQS', `DeleteQueue failed: ${name}`, 'error', err.message);
      alert(err.message);
    }
  };

  const handleSendMessage = async () => {
    const name = getQueueName(sendingMessageTo!);
    if (!sendingMessageTo || !messageBody) return;
    setIsSending(true);
    try {
      await clients.sqs.send(new SendMessageCommand({
        QueueUrl: sendingMessageTo,
        MessageBody: messageBody
      }));
      logActivity('SQS', `SendMessage to: ${name}`, 'success');
      setSendingMessageTo(null);
      setMessageBody('');
      alert('Message sent successfully');
    } catch (err: any) {
      logActivity('SQS', `SendMessage failed to: ${name}`, 'error', err.message);
      alert(err.message);
    } finally {
      setIsSending(false);
    }
  };

  const getQueueName = (url: string) => url.split('/').pop();

  const filteredQueues = queues.filter(q => q.toLowerCase().includes(search.toLowerCase()));

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

      <Modal 
        isOpen={isCreationModalOpen} 
        onClose={() => setIsCreationModalOpen(false)} 
        title="Create SQS Queue"
      >
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60">Queue Name</label>
            <Input 
              value={newQueueName}
              onChange={e => setNewQueueName(e.target.value)}
              placeholder="my-queue"
              autoFocus
            />
          </div>
          
          <div className="flex items-center gap-3 p-3 bg-brand-muted/30 border border-brand-text">
            <input 
              type="checkbox" 
              id="isFifo" 
              checked={isFifo} 
              onChange={e => setIsFifo(e.target.checked)}
              className="accent-brand-text"
            />
            <label htmlFor="isFifo" className="text-[10px] font-bold uppercase cursor-pointer">
              FIFO Queue (First-In-First-Out)
            </label>
          </div>

          {isFifo && (
            <div className="p-3 bg-blue-50 border border-blue-200 text-[10px] text-blue-800 italic">
               FIFO queues must end with the .fifo suffix. We will append it automatically if missing.
            </div>
          )}

          <div className="pt-4 flex gap-3">
             <Button 
               variant="ghost" 
               className="flex-1" 
               onClick={() => setIsCreationModalOpen(false)}
             >
               Cancel
             </Button>
             <Button 
               className="flex-1" 
               onClick={handleCreateQueue} 
               disabled={!newQueueName || isCreating}
             >
               {isCreating ? 'Creating...' : 'Create Queue'}
             </Button>
          </div>
        </div>
      </Modal>

      <div className="p-6 space-y-6 flex-1 overflow-auto bg-brand-bg">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text opacity-30" size={14} />
          <Input 
            placeholder="Filter Queues..." 
            className="pl-10 font-mono text-[11px]" 
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <AnimatePresence>
          {sendingMessageTo && (
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
                    SEND_MESSAGE: {getQueueName(sendingMessageTo)}
                  </h3>
                  <button onClick={() => setSendingMessageTo(null)}><X size={16} /></button>
                </div>
                <textarea 
                  className="w-full bg-brand-bg/10 border border-brand-bg/30 text-brand-bg p-4 font-mono text-xs mb-4 min-h-[100px] focus:outline-none"
                  placeholder='{"key": "value"}'
                  value={messageBody}
                  onChange={e => setMessageBody(e.target.value)}
                />
                <div className="flex justify-end">
                  <Button 
                    variant="secondary" 
                    onClick={handleSendMessage}
                    disabled={isSending}
                  >
                    {isSending ? 'DISPATCHING...' : 'DISPATCH_MESSAGE'}
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
          ) : filteredQueues.length === 0 ? (
            <Card className="text-brand-text opacity-30 text-center py-12 italic text-[10px] uppercase font-bold tracking-widest bg-brand-muted/30 border-dashed">No queues found.</Card>
          ) : (
            filteredQueues.map((url) => (
              <Card key={url} className="group hover:bg-brand-text hover:text-brand-bg transition-colors cursor-pointer">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 border border-brand-text flex items-center justify-center opacity-70 group-hover:border-brand-bg">
                      <MessageSquare size={18} />
                    </div>
                    <div>
                      <h4 className="font-bold text-[11px] font-mono">{getQueueName(url)}</h4>
                      <p className="text-[10px] opacity-50 truncate max-w-md font-mono lowercase">{url}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest">
                    <button 
                      onClick={() => setSendingMessageTo(url)}
                      className="hover:underline flex items-center gap-1.5 group-hover:text-brand-bg"
                    >
                       <Send size={12} />
                       Send
                    </button>
                    <button 
                      onClick={() => handleDeleteQueue(url)}
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

export default SQSView;
