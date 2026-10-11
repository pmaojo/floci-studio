import { useState, useEffect, useCallback } from 'react';
import { sidecarApi, type ContainerPerformanceStat } from '../lib/sidecarApi';
import { PageHeader, Card, Skeleton } from '../components/ui-elements';
import { Activity, Cpu, Server, Box } from 'lucide-react';
import { useAws } from '../contexts/AwsContext';

const PerformanceMonitorView = () => {
  const { logActivity } = useAws();
  const [stats, setStats] = useState<ContainerPerformanceStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setError(null);
    try {
      const response = await sidecarApi.getPerformanceStats();
      if (response.ok) {
        setStats(response.containers);
        setError(null);
      } else {
        throw new Error(response.error || 'Failed to fetch performance stats');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error fetching stats';
      setError(msg);
      logActivity('Performance', 'Fetch stats failed', 'error', msg);
    } finally {
      setLoading(false);
    }
  }, [logActivity]);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 3000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="flex flex-col h-full uppercase">
      <PageHeader
        title="Performance Monitor"
        icon={<Activity size={18} />}
        onRefresh={fetchStats}
        isRefreshing={loading}
      />

      <div className="p-6 space-y-6 flex-1 overflow-auto bg-brand-bg">
        {error && (
          <Card className="text-rose-600 font-mono text-[10px] bg-rose-50 border-rose-600 normal-case">
            {error}
          </Card>
        )}

        {loading && stats.length === 0 ? (
          <div className="space-y-4">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
        ) : stats.length === 0 ? (
          <Card className="text-center py-12 border-dashed bg-brand-muted/20">
            <p className="text-[10px] font-bold tracking-widest text-neutral-500">NO_CONTAINERS_RUNNING</p>
          </Card>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {stats.map((container) => {
                const memUsagePercent = container.memory_limit_bytes > 0
                  ? (container.memory_usage_bytes / container.memory_limit_bytes) * 100
                  : 0;

                return (
                  <Card key={container.id} className="p-5 flex flex-col gap-4 group hover:border-brand-text transition-colors bg-white">
                    <div className="flex items-start justify-between border-b border-brand-text/10 pb-3">
                      <div className="flex items-center gap-2 max-w-[80%]">
                        <Box size={14} className="opacity-60 shrink-0" />
                        <h3 className="font-bold text-xs truncate normal-case tracking-wide text-brand-text" title={container.name}>
                          {container.name.replace(/^\//, '')}
                        </h3>
                      </div>
                      <span className={`text-[8px] font-bold border px-1.5 py-0.5 rounded-sm uppercase tracking-wider ${
                        container.status.includes('Up')
                          ? 'border-emerald-600/25 bg-emerald-50 text-emerald-800'
                          : 'border-neutral-600/25 bg-neutral-50 text-neutral-800'
                      }`}>
                        {container.status.split(' ')[0]}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {/* CPU Usage */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5 text-[9px] font-bold opacity-60">
                          <Cpu size={12} /> CPU
                        </div>
                        <div className="flex items-end gap-1">
                          <span className="text-xl font-bold font-display">{container.cpu_percent.toFixed(2)}</span>
                          <span className="text-[10px] opacity-60 mb-1">%</span>
                        </div>
                        <div className="w-full bg-brand-muted h-1.5 overflow-hidden">
                          <div
                            className="bg-brand-text h-full transition-all duration-500"
                            style={{ width: `${Math.min(container.cpu_percent, 100)}%` }}
                          />
                        </div>
                      </div>

                      {/* Memory Usage */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5 text-[9px] font-bold opacity-60">
                          <Server size={12} /> Memory
                        </div>
                        <div className="flex items-end gap-1 truncate" title={`${formatBytes(container.memory_usage_bytes)} / ${formatBytes(container.memory_limit_bytes)}`}>
                          <span className="text-xl font-bold font-display">{formatBytes(container.memory_usage_bytes).split(' ')[0]}</span>
                          <span className="text-[10px] opacity-60 mb-1">{formatBytes(container.memory_usage_bytes).split(' ')[1]}</span>
                        </div>
                        <div className="w-full bg-brand-muted h-1.5 overflow-hidden">
                          <div
                            className="bg-brand-text h-full transition-all duration-500"
                            style={{ width: `${Math.min(memUsagePercent, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 text-[9px] font-mono opacity-40">
                      ID: {container.id}
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PerformanceMonitorView;
