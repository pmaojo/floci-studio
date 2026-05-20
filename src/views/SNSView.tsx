import React, { useState, useEffect } from 'react';
import { ListTopicsCommand, CreateTopicCommand, DeleteTopicCommand, PublishCommand } from '@aws-sdk/client-sns';
import { useAws } from '../contexts/AwsContext';
import { Bell, Search, CirclePlus, Trash2, Send, ExternalLink, X, Terminal } from 'lucide-react';
import { PageHeader, Card, Button, Input, Skeleton, Modal } from '../components/ui-elements';
import { motion, AnimatePresence } from 'motion/react';

const SNSView = () => {
  const { clients, logActivity } = useAws();
  const [topics, setTopics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [publishingTo, setPublishingTo] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);
  const [isCreationModalOpen, setIsCreationModalOpen] = useState(false);
  const [newTopicName, setNewTopicName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const fetchTopics = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await clients.sns.send(new ListTopicsCommand({}));
      setTopics(response.Topics || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch topics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTopics();
  }, []);

  const handleCreateTopic = async () => {
    if (!newTopicName) return;
    setIsCreating(true);
    try {
      await clients.sns.send(new CreateTopicCommand({ Name: newTopicName }));
      logActivity('SNS', `CreateTopic: ${newTopicName}`, 'success');
      setNewTopicName('');
      setIsCreationModalOpen(false);
      fetchTopics();
    } catch (err: any) {
      logActivity('SNS', `CreateTopic failed: ${newTopicName}`, 'error', err.message);
      alert(err.message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteTopic = async (arn: string) => {
    const name = getTopicName(arn);
    if (!confirm('Are you sure?')) return;
    try {
      await clients.sns.send(new DeleteTopicCommand({ TopicArn: arn }));
      logActivity('SNS', `DeleteTopic: ${name}`, 'success');
      fetchTopics();
    } catch (err: any) {
      logActivity('SNS', `DeleteTopic failed: ${name}`, 'error', err.message);
      alert(err.message);
    }
  };

  const handlePublish = async () => {
    const name = getTopicName(publishingTo!);
    if (!publishingTo || !message) return;
    setIsPublishing(true);
    try {
      await clients.sns.send(new PublishCommand({
        TopicArn: publishingTo,
        Message: message
      }));
      logActivity('SNS', `Publish to: ${name}`, 'success');
      setPublishingTo(null);
      setMessage('');
      alert('Published successfully');
    } catch (err: any) {
      logActivity('SNS', `Publish failed to: ${name}`, 'error', err.message);
      alert(err.message);
    } finally {
      setIsPublishing(false);
    }
  };

  const getTopicName = (arn: string) => arn.split(':').pop();

  const filteredTopics = topics.filter(t => t.TopicArn?.toLowerCase().includes(search.toLowerCase()));

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

      <Modal 
        isOpen={isCreationModalOpen} 
        onClose={() => setIsCreationModalOpen(false)} 
        title="Create SNS Topic"
      >
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60">Topic Name</label>
            <Input 
              value={newTopicName}
              onChange={e => setNewTopicName(e.target.value)}
              placeholder="SystemAlerts"
              autoFocus
            />
          </div>
          
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
               onClick={handleCreateTopic} 
               disabled={!newTopicName || isCreating}
             >
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

        <AnimatePresence>
          {publishingTo && (
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
                  placeholder='Enter message content...'
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                />
                <div className="flex justify-end">
                  <Button 
                    variant="secondary" 
                    onClick={handlePublish}
                    disabled={isPublishing}
                  >
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
            <Card className="text-brand-text opacity-30 text-center py-12 italic text-[10px] uppercase font-bold tracking-widest bg-brand-muted/30 border-dashed">No topics found.</Card>
          ) : (
            filteredTopics.map((topic) => (
              <Card key={topic.TopicArn} className="group hover:bg-brand-text hover:text-brand-bg transition-colors cursor-pointer">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 border border-brand-text flex items-center justify-center opacity-70 group-hover:border-brand-bg">
                      <Bell size={18} />
                    </div>
                    <div>
                      <h4 className="font-bold text-[11px] font-mono">{getTopicName(topic.TopicArn!)}</h4>
                      <p className="text-[10px] opacity-50 truncate max-w-md font-mono lowercase">{topic.TopicArn}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest">
                    <button 
                      onClick={() => setPublishingTo(topic.TopicArn!)}
                      className="hover:underline flex items-center gap-1.5 group-hover:text-brand-bg"
                    >
                       <Send size={12} />
                       Publish
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
