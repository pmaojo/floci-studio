import React, { useState, useEffect } from 'react';
import { 
  ListDomainsCommand, 
  ListRepositoriesCommand,
  CreateDomainCommand,
  CreateRepositoryCommand,
  DeleteRepositoryCommand
} from '@aws-sdk/client-codeartifact';
import { useAws } from '../contexts/AwsContext';
import { 
  Package, 
  Search, 
  CirclePlus, 
  Trash2, 
  ExternalLink, 
  Globe, 
  Archive,
  Terminal,
  ArrowLeft,
  ChevronRight,
  Library
} from 'lucide-react';
import { PageHeader, Card, Button, Input, Skeleton } from '../components/ui-elements';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

const CodeArtifactView = () => {
  const { clients } = useAws();
  const [activeTab, setActiveTab] = useState<'repositories' | 'domains'>('repositories');
  const [repositories, setRepositories] = useState<any[]>([]);
  const [domains, setDomains] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      if (activeTab === 'repositories') {
        const response = await clients.codeartifact.send(new ListRepositoriesCommand({}));
        setRepositories(response.repositories || []);
      } else {
        const response = await clients.codeartifact.send(new ListDomainsCommand({}));
        setDomains(response.domains || []);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch CodeArtifact resources');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const handleCreateDomain = async () => {
    const name = prompt('Domain Name:');
    if (!name) return;
    try {
      await clients.codeartifact.send(new CreateDomainCommand({ domain: name }));
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCreateRepo = async () => {
    const domain = prompt('Domain Name:');
    const repo = prompt('Repository Name:');
    if (!domain || !repo) return;
    try {
      await clients.codeartifact.send(new CreateRepositoryCommand({ 
        domain, 
        repository: repo 
      }));
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteRepo = async (domain: string, repo: string) => {
    if (!confirm(`Delete repository ${repo} in domain ${domain}?`)) return;
    try {
      await clients.codeartifact.send(new DeleteRepositoryCommand({ 
        domain, 
        repository: repo 
      }));
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="flex flex-col h-full uppercase">
      <PageHeader 
        title="CodeArtifact" 
        icon={<Library size={18} />}
        onRefresh={fetchData}
        isRefreshing={loading}
        actions={
          activeTab === 'repositories' ? (
            <Button onClick={handleCreateRepo} icon={<CirclePlus size={14} />}>
              New_Repo
            </Button>
          ) : (
            <Button onClick={handleCreateDomain} icon={<CirclePlus size={14} />}>
              New_Domain
            </Button>
          )
        }
      />

      <div className="border-b border-brand-text bg-white">
        <div className="flex px-6">
          <button 
            onClick={() => setActiveTab('repositories')}
            className={cn(
              "px-6 py-4 text-[10px] font-bold tracking-widest transition-all border-b-2",
              activeTab === 'repositories' ? "border-brand-text opacity-100" : "border-transparent opacity-30 hover:opacity-100"
            )}
          >
            REPOSITORIES
          </button>
          <button 
            onClick={() => setActiveTab('domains')}
            className={cn(
              "px-6 py-4 text-[10px] font-bold tracking-widest transition-all border-b-2",
              activeTab === 'domains' ? "border-brand-text opacity-100" : "border-transparent opacity-30 hover:opacity-100"
            )}
          >
            DOMAINS
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6 flex-1 overflow-auto bg-brand-bg">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text opacity-30" size={14} />
          <Input 
            placeholder={`Filter ${activeTab === 'repositories' ? 'Repositories' : 'Domains'}...`} 
            className="pl-10 font-mono text-[11px]" 
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 gap-4">
          {loading ? (
            [1, 2, 3].map(i => <Skeleton key={i} className="h-20" />)
          ) : error ? (
            <Card className="text-rose-600 font-mono text-[10px] text-center py-10 border-rose-600 bg-rose-50">ERROR: {error}</Card>
          ) : (activeTab === 'repositories' ? repositories : domains).length === 0 ? (
            <Card className="text-brand-text opacity-30 text-center py-12 italic text-[10px] uppercase font-bold tracking-widest bg-brand-muted/30 border-dashed">
              No {activeTab} Found
            </Card>
          ) : activeTab === 'repositories' ? (
            repositories.filter(r => r.name?.toLowerCase().includes(search.toLowerCase())).map((repo) => (
              <Card key={repo.arn} className="group hover:bg-brand-text hover:text-white transition-colors cursor-pointer">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 border border-brand-text flex items-center justify-center opacity-70 group-hover:border-brand-bg">
                      <Archive size={18} />
                    </div>
                    <div>
                      <h4 className="font-bold text-[11px] font-mono">{repo.name}</h4>
                      <p className="text-[10px] opacity-50 truncate max-w-md font-mono lowercase">{repo.domainName} / {repo.administratorAccount}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-[10px] font-bold tracking-widest">
                    <button className="hover:underline flex items-center gap-1.5 group-hover:text-brand-bg">
                       <Terminal size={12} />
                       LOGIN
                    </button>
                    <button 
                      onClick={() => handleDeleteRepo(repo.domainName!, repo.name!)}
                      className="hover:text-rose-500 font-bold group-hover:text-rose-400"
                    >
                      DROP
                    </button>
                  </div>
                </div>
              </Card>
            ))
          ) : (
            domains.filter(d => d.name?.toLowerCase().includes(search.toLowerCase())).map((domain) => (
              <Card key={domain.arn} className="group hover:bg-brand-text hover:text-white transition-colors cursor-pointer font-mono">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 border border-brand-text flex items-center justify-center opacity-70 group-hover:border-brand-bg">
                      <Globe size={18} />
                    </div>
                    <div>
                      <h4 className="font-bold text-[11px]">{domain.name}</h4>
                      <p className="text-[10px] opacity-50">OWNER: {domain.owner}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-[10px] font-bold tracking-widest uppercase opacity-40 group-hover:opacity-100">
                    STATUS: {domain.status}
                    <ChevronRight size={14} />
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

export default CodeArtifactView;
