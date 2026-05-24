import { useState, useEffect } from 'react';
import { ListStacksCommand, CreateStackCommand, DeleteStackCommand } from '@aws-sdk/client-cloudformation';
import { useAws } from '../contexts/AwsContext';
import { Box, CirclePlus, Trash2 } from 'lucide-react';
import { PageHeader, Card, Button, Input, Skeleton, Modal } from '../components/ui-elements';

const CloudFormationView = () => {
  const { clients, logActivity } = useAws();
  const [stacks, setStacks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreationModalOpen, setIsCreationModalOpen] = useState(false);
  const [newStackName, setNewStackName] = useState('');
  const [templateBody, setTemplateBody] = useState(`{
  "AWSTemplateFormatVersion": "2010-09-09",
  "Description": "Floci Infrastructure Stack",
  "Resources": {
    "MyBucket": {
      "Type": "AWS::S3::Bucket",
      "Properties": {
        "BucketName": "stack-managed-bucket"
      }
    }
  }
}`);
  const [isCreating, setIsCreating] = useState(false);

  const fetchStacks = async () => {
    setLoading(true);
    try {
      const response = await clients.cloudformation.send(new ListStacksCommand({
        StackStatusFilter: ['CREATE_COMPLETE', 'UPDATE_COMPLETE', 'ROLLBACK_COMPLETE']
      }));
      setStacks(response.StackSummaries || []);
      logActivity('CloudFormation', 'ListStacks', 'success');
    } catch (err: any) {
      logActivity('CloudFormation', 'ListStacks failed', 'error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newStackName) return;
    setIsCreating(true);
    try {
      await clients.cloudformation.send(new CreateStackCommand({
        StackName: newStackName,
        TemplateBody: templateBody
      }));
      logActivity('CloudFormation', `CreateStack: ${newStackName}`, 'success');
      setNewStackName('');
      setIsCreationModalOpen(false);
      fetchStacks();
    } catch (err: any) {
      logActivity('CloudFormation', `CreateStack failed: ${newStackName}`, 'error', err.message);
      alert(err.message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (name: string) => {
    if (!confirm(`Delete Stack ${name}?`)) return;
    try {
      await clients.cloudformation.send(new DeleteStackCommand({ StackName: name }));
      logActivity('CloudFormation', `DeleteStack: ${name}`, 'success');
      fetchStacks();
    } catch (err: any) {
      logActivity('CloudFormation', `DeleteStack failed: ${name}`, 'error', err.message);
      alert(err.message);
    }
  };

  useEffect(() => {
    fetchStacks();
  }, []);

  return (
    <div className="flex flex-col h-full uppercase">
      <PageHeader 
        title="CloudFormation Stacks" 
        icon={<Box size={18} />}
        onRefresh={fetchStacks}
        isRefreshing={loading}
        actions={
          <Button onClick={() => setIsCreationModalOpen(true)} icon={<CirclePlus size={14} />}>
            Create Stack
          </Button>
        }
      />

      <Modal 
        isOpen={isCreationModalOpen} 
        onClose={() => setIsCreationModalOpen(false)} 
        title="Deploy Stack"
      >
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60">Stack Name</label>
            <Input 
              value={newStackName}
              onChange={e => setNewStackName(e.target.value)}
              placeholder="AppInfrastructure"
              autoFocus
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60">Template (JSON/YAML)</label>
            <textarea 
              className="w-full bg-white border border-brand-text px-3 py-2 text-[10px] font-mono focus:outline-hidden min-h-[150px]"
              value={templateBody}
              onChange={e => setTemplateBody(e.target.value)}
            />
          </div>
          <div className="pt-4 flex gap-3">
             <Button variant="ghost" className="flex-1" onClick={() => setIsCreationModalOpen(false)}>Cancel</Button>
             <Button className="flex-1" onClick={handleCreate} disabled={!newStackName || isCreating}>
               {isCreating ? 'Deploying...' : 'Deploy Stack'}
             </Button>
          </div>
        </div>
      </Modal>

      <div className="p-6 flex-1 overflow-auto bg-brand-bg">
        <div className="grid grid-cols-1 gap-4">
          {loading ? (
            [1, 2].map(i => <Skeleton key={i} className="h-20" />)
          ) : stacks.length === 0 ? (
            <div className="py-20 text-center border border-dashed border-brand-text/20">
               <p className="text-xs opacity-40 font-mono italic">NO_STACKS_IN_FLIGHT</p>
            </div>
          ) : (
            stacks.map(stack => (
              <Card key={stack.StackId} className="hover:border-brand-text transition-all bg-white flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-4 w-full">
                  <div className="p-2 bg-brand-muted border border-brand-text shrink-0">
                    <Box size={20} />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-xs truncate leading-tight mb-1">{stack.StackName}</h4>
                    <p className="text-[9px] font-mono opacity-40 truncate">{stack.StackId}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                  <div className="text-right">
                    <p className="text-[9px] font-bold opacity-30">STATUS</p>
                    <p className="text-[10px] font-bold tracking-tighter text-emerald-600">{stack.StackStatus}</p>
                  </div>
                  <div className="h-8 w-px bg-brand-text opacity-10 mx-2 hidden sm:block"></div>
                  <button onClick={() => handleDelete(stack.StackName!)} className="p-2 border border-brand-text hover:text-rose-600"><Trash2 size={16} /></button>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default CloudFormationView;
