import { useState, useEffect, useCallback } from 'react';
import {
  DescribeAutoScalingGroupsCommand,
  DescribeLaunchConfigurationsCommand,
} from '@aws-sdk/client-auto-scaling';
import type { AutoScalingGroup, LaunchConfiguration } from '@aws-sdk/client-auto-scaling';
import { useAws } from '../contexts/AwsContext';
import {
  Server,
  Layers,
  Search,
  Activity
} from 'lucide-react';
import { PageHeader, Card, Input, Skeleton } from '../components/ui-elements';
import { cn } from '../lib/utils';
import { format } from 'date-fns';

const AutoScalingView = () => {
  const { clients, logActivity } = useAws();
  const [activeTab, setActiveTab] = useState<'groups' | 'launches'>('groups');

  const [groups, setGroups] = useState<AutoScalingGroup[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(true);

  const [launches, setLaunches] = useState<LaunchConfiguration[]>([]);
  const [loadingLaunches, setLoadingLaunches] = useState(true);

  const [search, setSearch] = useState('');

  const fetchGroups = useCallback(async () => {
    setLoadingGroups(true);
    try {
      const res = await clients.autoscaling.send(new DescribeAutoScalingGroupsCommand({}));
      setGroups(res.AutoScalingGroups || []);
    } catch (err) {
      logActivity('AutoScaling', 'DescribeAutoScalingGroups failed', 'error', err instanceof Error ? err.message : String(err));
    } finally {
      setLoadingGroups(false);
    }
  }, [clients.autoscaling, logActivity]);

  const fetchLaunches = useCallback(async () => {
    setLoadingLaunches(true);
    try {
      const res = await clients.autoscaling.send(new DescribeLaunchConfigurationsCommand({}));
      setLaunches(res.LaunchConfigurations || []);
    } catch (err) {
      logActivity('AutoScaling', 'DescribeLaunchConfigurations failed', 'error', err instanceof Error ? err.message : String(err));
    } finally {
      setLoadingLaunches(false);
    }
  }, [clients.autoscaling, logActivity]);

  useEffect(() => {
    fetchGroups();
    fetchLaunches();
  }, [fetchGroups, fetchLaunches]);

  const handleRefresh = () => {
    if (activeTab === 'groups') fetchGroups();
    else fetchLaunches();
  };

  const filteredGroups = groups.filter(g =>
    g.AutoScalingGroupName?.toLowerCase().includes(search.toLowerCase()) ||
    g.AutoScalingGroupARN?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredLaunches = launches.filter(l =>
    l.LaunchConfigurationName?.toLowerCase().includes(search.toLowerCase()) ||
    l.LaunchConfigurationARN?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full uppercase font-sans">
      <PageHeader
        title="Auto Scaling Cockpit"
        icon={<Activity size={18} />}
        onRefresh={handleRefresh}
        isRefreshing={activeTab === 'groups' ? loadingGroups : loadingLaunches}
      />
      <div className="flex flex-1 overflow-hidden">
        <aside className="w-64 border-r border-brand-text bg-brand-muted flex flex-col shrink-0">
          <div className="p-4 border-b border-brand-text">
            <h3 className="font-bold text-[10px] tracking-widest text-brand-text opacity-70">Resource Domain</h3>
          </div>
          <nav className="flex-1 p-2 space-y-1">
            <button
              onClick={() => setActiveTab('groups')}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 text-[11px] font-bold tracking-wider transition-all",
                activeTab === 'groups'
                  ? "bg-brand-text text-brand-bg shadow-xs"
                  : "text-brand-text hover:bg-white/50"
              )}
            >
              <Server size={14} />
              Scaling Groups
            </button>
            <button
              onClick={() => setActiveTab('launches')}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 text-[11px] font-bold tracking-wider transition-all",
                activeTab === 'launches'
                  ? "bg-brand-text text-brand-bg shadow-xs"
                  : "text-brand-text hover:bg-white/50"
              )}
            >
              <Layers size={14} />
              Launch Configurations
            </button>
          </nav>
        </aside>

        <main className="flex-1 flex flex-col bg-brand-bg overflow-hidden">
          <div className="p-4 border-b border-brand-text flex items-center justify-between bg-brand-muted/30 shrink-0">
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text opacity-40" size={14} />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={`Search ${activeTab === 'groups' ? 'groups' : 'launch configurations'}...`}
                className="pl-9 text-xs font-mono"
              />
            </div>
            <div className="text-[10px] font-bold opacity-50 tracking-widest">
              {activeTab === 'groups' ? `${groups.length} GROUPS` : `${launches.length} CONFIGS`}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
            {activeTab === 'groups' && (
              <>
                {loadingGroups ? (
                  Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-32 w-full" />)
                ) : filteredGroups.length === 0 ? (
                  <div className="text-center p-12 border border-dashed border-brand-text/30 bg-white/50">
                    <p className="text-[10px] font-bold opacity-40">NO_SCALING_GROUPS_FOUND</p>
                  </div>
                ) : (
                  filteredGroups.map(group => (
                    <Card key={group.AutoScalingGroupARN} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-brand-text bg-white group transition-all">
                      <div className="flex items-start gap-4">
                        <div className="p-3 bg-brand-muted/30 border border-brand-text/20">
                          <Server size={20} className="text-brand-text/50" />
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-brand-text">{group.AutoScalingGroupName}</h4>
                          <p className="text-[9px] font-mono text-brand-text/50 mt-1 truncate max-w-md">{group.AutoScalingGroupARN}</p>
                          <div className="flex items-center gap-4 mt-3">
                            <span className="text-[9px] font-bold border px-1.5 py-0.5 bg-white">
                              MIN: {group.MinSize} | MAX: {group.MaxSize} | DESIRED: {group.DesiredCapacity}
                            </span>
                            <span className="text-[9px] font-bold border px-1.5 py-0.5 bg-white text-emerald-700 border-emerald-200">
                              STATUS: {group.Status || 'ACTIVE'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 shrink-0 md:text-right">
                        <div className="text-[9px] opacity-60">Created</div>
                        <div className="text-xs font-mono font-bold">
                          {group.CreatedTime ? format(group.CreatedTime, 'MMM dd, yyyy HH:mm') : '-'}
                        </div>
                        {group.VPCZoneIdentifier && (
                          <div className="text-[9px] mt-2 max-w-[150px] truncate" title={group.VPCZoneIdentifier}>
                            <span className="opacity-60">VPC/Subnets:</span><br/>
                            <span className="font-mono">{group.VPCZoneIdentifier}</span>
                          </div>
                        )}
                      </div>
                    </Card>
                  ))
                )}
              </>
            )}

            {activeTab === 'launches' && (
              <>
                {loadingLaunches ? (
                  Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-32 w-full" />)
                ) : filteredLaunches.length === 0 ? (
                  <div className="text-center p-12 border border-dashed border-brand-text/30 bg-white/50">
                    <p className="text-[10px] font-bold opacity-40">NO_LAUNCH_CONFIGS_FOUND</p>
                  </div>
                ) : (
                  filteredLaunches.map(config => (
                    <Card key={config.LaunchConfigurationARN} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-brand-text bg-white group transition-all">
                      <div className="flex items-start gap-4">
                        <div className="p-3 bg-brand-muted/30 border border-brand-text/20">
                          <Layers size={20} className="text-brand-text/50" />
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-brand-text">{config.LaunchConfigurationName}</h4>
                          <p className="text-[9px] font-mono text-brand-text/50 mt-1 truncate max-w-md">{config.LaunchConfigurationARN}</p>
                          <div className="flex items-center gap-4 mt-3">
                            <span className="text-[9px] font-bold border px-1.5 py-0.5 bg-white">
                              IMAGE ID: {config.ImageId || 'N/A'}
                            </span>
                            <span className="text-[9px] font-bold border px-1.5 py-0.5 bg-white">
                              INSTANCE TYPE: {config.InstanceType || 'N/A'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 shrink-0 md:text-right">
                        <div className="text-[9px] opacity-60">Created</div>
                        <div className="text-xs font-mono font-bold">
                          {config.CreatedTime ? format(config.CreatedTime, 'MMM dd, yyyy HH:mm') : '-'}
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AutoScalingView;
