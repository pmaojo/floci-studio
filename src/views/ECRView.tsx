import { useState, useEffect } from 'react';
import { DescribeRepositoriesCommand, CreateRepositoryCommand, DeleteRepositoryCommand } from '@aws-sdk/client-ecr';
import type { Repository } from '@aws-sdk/client-ecr';
import { useAws } from '../contexts/AwsContext';
import { CirclePlus, Trash2, Package, HardDrive, Shield } from 'lucide-react';
import { PageHeader, Card, Button, Input, Skeleton, Modal } from '../components/ui-elements';

const ECRView = () => {
  const { clients, logActivity } = useAws();
  const [repos, setRepos] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreationModalOpen, setIsCreationModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await clients.ecr.send(new DescribeRepositoriesCommand({}));
      setRepos(response.repositories || []);
      logActivity('ECR', 'DescribeRepositories', 'success');
    } catch (err) {
      logActivity('ECR', 'DescribeRepositories failed', 'error', err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newName) return;
    setIsCreating(true);
    try {
      await clients.ecr.send(new CreateRepositoryCommand({ repositoryName: newName }));
      logActivity('ECR', `CreateRepository: ${newName}`, 'success');
      setNewName('');
      setIsCreationModalOpen(false);
      fetchData();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logActivity('ECR', `CreateRepository failed: ${newName}`, 'error', message);
      alert(message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (name: string) => {
    if (!confirm(`Delete repository ${name}?`)) return;
    try {
      await clients.ecr.send(new DeleteRepositoryCommand({ repositoryName: name, force: true }));
      logActivity('ECR', `DeleteRepository: ${name}`, 'success');
      fetchData();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logActivity('ECR', `DeleteRepository failed: ${name}`, 'error', message);
      alert(message);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="flex flex-col h-full uppercase">
      <PageHeader 
        title="ECR Registries" 
        icon={<Package size={18} />}
        onRefresh={fetchData}
        isRefreshing={loading}
        actions={
          <Button onClick={() => setIsCreationModalOpen(true)} icon={<CirclePlus size={14} />}>
            New Repo
          </Button>
        }
      />

      <Modal 
        isOpen={isCreationModalOpen} 
        onClose={() => setIsCreationModalOpen(false)} 
        title="Create Repository"
      >
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60">Repository Name</label>
            <Input 
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="my-awesome-app"
              autoFocus
            />
          </div>
          <div className="pt-4 flex gap-3">
             <Button variant="ghost" className="flex-1" onClick={() => setIsCreationModalOpen(false)}>Cancel</Button>
             <Button className="flex-1" onClick={handleCreate} disabled={!newName || isCreating}>
               {isCreating ? 'Creating...' : 'Create Repo'}
             </Button>
          </div>
        </div>
      </Modal>

      <div className="p-6 flex-1 overflow-auto bg-brand-bg">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            [1, 2, 3].map(i => <Skeleton key={i} className="h-32" />)
          ) : repos.length === 0 ? (
            <div className="col-span-full py-20 text-center border border-dashed border-brand-text/20">
               <p className="text-xs opacity-40 font-mono italic">NO_IMAGE_REPOS_FOUND</p>
            </div>
          ) : (
            repos.map(repo => (
              <Card key={repo.repositoryName} className="hover:border-brand-text transition-all bg-white group">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-2 bg-brand-muted border border-brand-text shrink-0">
                    <Package size={20} />
                  </div>
                  <button onClick={() => handleDelete(repo.repositoryName!)} className="p-1 hover:text-rose-600 transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
                <h4 className="font-bold text-xs truncate mb-1">{repo.repositoryName}</h4>
                <p className="text-[9px] font-mono opacity-40 truncate">{repo.repositoryArn}</p>
                <div className="mt-6 flex items-center justify-between text-[8px] font-bold opacity-30">
                  <span className="flex items-center gap-1"><HardDrive size={10} /> MUTABLE</span>
                  <span className="flex items-center gap-1"><Shield size={10} /> SCAN_ON_PUSH: OFF</span>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default ECRView;
