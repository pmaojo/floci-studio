import { useState, useEffect } from 'react';
import {
  ListClustersCommand,
  DescribeClustersCommand,
  CreateClusterCommand,
} from '@aws-sdk/client-ecs';
import type { Cluster } from '@aws-sdk/client-ecs';
import {
  DescribeInstancesCommand,
  StartInstancesCommand,
  StopInstancesCommand,
  RunInstancesCommand,
} from '@aws-sdk/client-ec2';
import type { Instance } from '@aws-sdk/client-ec2';
import { useAws } from '../contexts/AwsContext';
import {
  Server,
  Power,
  Layers,
  Search,
  Terminal,
} from 'lucide-react';
import { PageHeader, Card, Button, Input, Skeleton } from '../components/ui-elements';
import { cn } from '../lib/utils';

const ECSView = () => {
  const { clients, logActivity } = useAws();
  const [activeTab, setActiveTab] = useState<'ecs' | 'ec2'>('ecs');
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [instances, setInstances] = useState<Instance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      if (activeTab === 'ecs') {
        const listResponse = await clients.ecs.send(new ListClustersCommand({}));
        if (listResponse.clusterArns && listResponse.clusterArns.length > 0) {
          const detailResponse = await clients.ecs.send(new DescribeClustersCommand({
            clusters: listResponse.clusterArns
          }));
          setClusters(detailResponse.clusters || []);
        } else {
          setClusters([]);
        }
      } else {
        const response = await clients.ec2.send(new DescribeInstancesCommand({}));
        const allInstances = response.Reservations?.flatMap(r => r.Instances || []) || [];
        setInstances(allInstances);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch compute resources');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const handleInstanceState = async (instanceId: string, action: 'start' | 'stop') => {
    try {
      if (action === 'start') {
        await clients.ec2.send(new StartInstancesCommand({ InstanceIds: [instanceId] }));
        logActivity('EC2', `StartInstance: ${instanceId}`, 'success');
      } else {
        await clients.ec2.send(new StopInstancesCommand({ InstanceIds: [instanceId] }));
        logActivity('EC2', `StopInstance: ${instanceId}`, 'success');
      }
      fetchData();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logActivity('EC2', `${action}Instance failed: ${instanceId}`, 'error', message);
      alert(message);
    }
  };

  const handleCreate = async () => {
    if (activeTab === 'ecs') {
      const name = prompt('Cluster Name:');
      if (!name) return;
      try {
        await clients.ecs.send(new CreateClusterCommand({ clusterName: name }));
        logActivity('ECS', `CreateCluster: ${name}`, 'success', 'Note: Floci-managed compute');
        fetchData();
      } catch (err) {
        logActivity('ECS', `CreateCluster failed: ${name}`, 'error', err instanceof Error ? err.message : String(err));
      }
    } else {
      const name = prompt('Instance Name Tag (optional):');
      try {
        await clients.ec2.send(new RunInstancesCommand({
          ImageId: 'ami-floci-local',
          InstanceType: 't2.micro',
          MinCount: 1,
          MaxCount: 1,
          TagSpecifications: name ? [{
            ResourceType: 'instance',
            Tags: [{ Key: 'Name', Value: name }],
          }] : undefined,
        }));
        logActivity('EC2', 'RunInstances', 'success', `count: 1, type: t2.micro ${name ? `(tag:${name})` : ''}`);
        fetchData();
      } catch (err) {
        logActivity('EC2', 'RunInstances failed', 'error', err instanceof Error ? err.message : String(err));
      }
    }
  };

  const getStatusColor = (status?: string) => {
    switch ((status || '').toLowerCase()) {
      case 'running': case 'active': return 'text-emerald-500';
      case 'stopped': case 'inactive': return 'text-rose-500';
      case 'pending': case 'provisioning': return 'text-amber-500 text-animate-pulse';
      default: return 'text-brand-text opacity-40';
    }
  };

  return (
    <div className="flex flex-col h-full uppercase">
      <PageHeader 
        title={activeTab === 'ecs' ? "Elastic Container Service" : "EC2 Instances"} 
        icon={activeTab === 'ecs' ? <Layers size={18} /> : <Server size={18} />}
        onRefresh={fetchData}
        isRefreshing={loading}
        actions={
          <Button onClick={handleCreate} icon={<Terminal size={14} />}>
            Deploy {activeTab === 'ecs' ? 'Cluster' : 'Instance'}
          </Button>
        }
      />

      <div className="border-b border-brand-text bg-white">
        <div className="flex px-6">
          <button 
            onClick={() => setActiveTab('ecs')}
            className={cn(
              "px-6 py-4 text-[10px] font-bold tracking-widest transition-all border-b-2 relative",
              activeTab === 'ecs' ? "border-brand-text opacity-100" : "border-transparent opacity-30 hover:opacity-100"
            )}
          >
            ECS_CLUSTERS
          </button>
          <button 
            onClick={() => setActiveTab('ec2')}
            className={cn(
              "px-6 py-4 text-[10px] font-bold tracking-widest transition-all border-b-2 relative",
              activeTab === 'ec2' ? "border-brand-text opacity-100" : "border-transparent opacity-30 hover:opacity-100"
            )}
          >
            EC2_INSTANCES
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6 flex-1 overflow-auto bg-brand-bg">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text opacity-30" size={14} />
          <Input 
            placeholder={`Filter ${activeTab === 'ecs' ? 'Clusters' : 'Instances'}...`} 
            className="pl-10 font-mono text-[11px]" 
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 gap-4">
          {loading ? (
            [1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)
          ) : error ? (
            <Card className="text-rose-600 font-mono text-[10px] text-center py-10 border-rose-600 bg-rose-50">ERROR: {error}</Card>
          ) : (activeTab === 'ecs' ? clusters : instances).length === 0 ? (
            <Card className="text-brand-text opacity-30 text-center py-12 italic text-[10px] uppercase font-bold tracking-widest bg-brand-muted/30 border-dashed">
              No {activeTab} Resources Found
            </Card>
          ) : activeTab === 'ecs' ? (
            clusters.filter(c => c.clusterName?.toLowerCase().includes(search.toLowerCase())).map((cluster) => (
              <Card key={cluster.clusterArn} className="group hover:bg-brand-text hover:text-white transition-colors cursor-pointer">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 border border-brand-text flex items-center justify-center opacity-70 group-hover:border-brand-bg">
                      <Layers size={20} />
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h4 className="font-bold text-[12px] font-mono">{cluster.clusterName}</h4>
                        <span className={cn("text-[9px] font-bold uppercase", getStatusColor(cluster.status))}>
                          {cluster.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-[10px] opacity-50 font-mono lowercase">
                        <span>tasks: {cluster.runningTasksCount}/{(cluster.pendingTasksCount || 0) + (cluster.runningTasksCount || 0)}</span>
                        <span>services: {cluster.activeServicesCount}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-[10px] font-bold tracking-widest">
                    <button className="hover:underline flex items-center gap-1.5 group-hover:text-brand-bg">
                       <Terminal size={12} />
                       CONSOLE
                    </button>
                    <button className="hover:underline group-hover:text-amber-400">CONFIG</button>
                  </div>
                </div>
              </Card>
            ))
          ) : (
            instances.filter(i => i.InstanceId?.toLowerCase().includes(search.toLowerCase())).map((inst) => (
              <Card key={inst.InstanceId} className="group hover:bg-brand-text hover:text-white transition-colors cursor-pointer">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 border border-brand-text flex items-center justify-center opacity-70 group-hover:border-brand-bg">
                      <Server size={20} />
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h4 className="font-bold text-[12px] font-mono">{inst.InstanceId}</h4>
                        <span className={cn("text-[9px] font-bold uppercase", getStatusColor(inst.State?.Name || ''))}>
                          {inst.State?.Name}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-[10px] opacity-50 font-mono lowercase">
                        <span>type: {inst.InstanceType}</span>
                        <span>ip: {inst.PublicIpAddress || 'none'}</span>
                        <span className="italic block max-w-[150px] truncate">ami: {inst.ImageId}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-[10px] font-bold tracking-widest">
                    {inst.State?.Name === 'running' ? (
                      <button 
                        onClick={() => handleInstanceState(inst.InstanceId!, 'stop')}
                        className="flex items-center gap-1.5 text-rose-500 hover:underline group-hover:text-rose-400"
                      >
                        <Power size={12} />
                        SHUTDOWN
                      </button>
                    ) : (
                      <button 
                        onClick={() => handleInstanceState(inst.InstanceId!, 'start')}
                        className="flex items-center gap-1.5 text-emerald-500 hover:underline group-hover:text-emerald-400"
                      >
                        <Power size={12} />
                        BOOTUP
                      </button>
                    )}
                    <button className="hover:underline group-hover:text-brand-bg">SSH</button>
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

export default ECSView;
