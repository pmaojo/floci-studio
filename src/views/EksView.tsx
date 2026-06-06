import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Boxes, Cable, Server, Terminal } from 'lucide-react';
import { formatDistanceToNowStrict } from 'date-fns';
import { useAws } from '../contexts/AwsContext';
import { Button, Card, PageHeader, Skeleton } from '../components/ui-elements';
import { sidecarApi, type EksOverview } from '../lib/sidecarApi';

const emptyOverview: EksOverview = {
  endpointUrl: '',
  region: '',
  clusters: [],
  kubernetes: {
    available: false,
    pods: [],
  },
};

const EksView = () => {
  const { logActivity } = useAws();
  const [overview, setOverview] = useState<EksOverview>(emptyOverview);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const pods = overview.kubernetes.pods;
  const clusterCount = overview.clusters.length;
  const fargateProfileCount = useMemo(
    () => overview.clusters.reduce((total, cluster) => total + cluster.fargateProfiles.length, 0),
    [overview.clusters],
  );

  const loadOverview = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await sidecarApi.getEksOverview();
      setOverview(response);
      logActivity('EKS', 'Describe real EKS inventory', 'success', `clusters=${response.clusters.length}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to read EKS from sidecar';
      setError(message);
      logActivity('EKS', 'Describe real EKS inventory failed', 'error', message);
    } finally {
      setLoading(false);
    }
  }, [logActivity]);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  return (
    <div className="flex flex-col h-full uppercase">
      <PageHeader
        title="EKS Clusters"
        icon={<Terminal size={18} />}
        onRefresh={loadOverview}
        isRefreshing={loading}
        actions={
          <Button onClick={loadOverview} icon={<Cable size={14} />}>
            Read Real State
          </Button>
        }
      />

      <div className="p-6 space-y-6 flex-1 overflow-auto bg-brand-bg">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <MetricCard label="AWS_ENDPOINT" value={overview.endpointUrl || 'sidecar'} />
          <MetricCard label="REGION" value={overview.region || 'unknown'} />
          <MetricCard label="CLUSTERS" value={String(clusterCount)} />
          <MetricCard label="FARGATE_PROFILES" value={String(fargateProfileCount)} />
        </div>

        {error && (
          <Card className="text-rose-600 font-mono text-[10px] bg-rose-50 border-rose-600 normal-case">
            {error}
          </Card>
        )}

        <section className="space-y-3">
          <SectionTitle icon={<Server size={14} />} title="Real EKS clusters" />
          {loading ? (
            <div className="grid grid-cols-1 gap-3">
              {[1, 2, 3].map(item => <Skeleton key={item} className="h-28" />)}
            </div>
          ) : overview.clusters.length === 0 ? (
            <EmptyState
              title="No EKS clusters found in Floci"
              detail="La llamada real aws eks list-clusters devolvió una lista vacía. No se muestran pods, deployments ni perfiles inventados."
            />
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {overview.clusters.map(cluster => (
                <Card key={cluster.name} className="font-mono text-[10px]">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                      <h3 className="text-sm font-bold">{cluster.name}</h3>
                      <p className="opacity-50 normal-case break-all">{cluster.arn || 'arn unavailable'}</p>
                    </div>
                    <span className="border border-brand-text px-2 py-1 bg-brand-muted font-bold">
                      {cluster.status || 'UNKNOWN'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Detail label="VERSION" value={cluster.version || 'unknown'} />
                    <Detail label="PLATFORM" value={cluster.platformVersion || 'unknown'} />
                    <Detail label="VPC" value={cluster.vpcId || 'none'} />
                    <Detail label="FARGATE" value={cluster.fargateProfiles.join(', ') || 'none'} />
                  </div>
                  {cluster.endpoint && (
                    <div className="mt-3 pt-3 border-t border-brand-text/10 normal-case break-all opacity-70">
                      {cluster.endpoint}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-3">
          <SectionTitle icon={<Boxes size={14} />} title="Real Kubernetes pods" />
          {!overview.kubernetes.available && (
            <Card className="text-[10px] font-mono bg-brand-muted/30 normal-case">
              kubectl no está conectado: {overview.kubernetes.reason || 'KUBECONFIG no disponible en el sidecar.'}
            </Card>
          )}

          {loading ? (
            <Skeleton className="h-32" />
          ) : pods.length === 0 ? (
            <EmptyState
              title="No real pods available"
              detail="No hay pods leídos desde kubectl. Esto es correcto si todavía no existe kubeconfig o si Floci no ha creado un backend Kubernetes real."
            />
          ) : (
            <div className="border border-brand-text bg-white overflow-x-auto">
              <table className="w-full text-left text-[10px] font-mono">
                <thead className="bg-brand-muted border-b border-brand-text">
                  <tr>
                    <th className="p-3">Pod</th>
                    <th className="p-3">Namespace</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Node</th>
                    <th className="p-3">Restarts</th>
                    <th className="p-3">Age</th>
                  </tr>
                </thead>
                <tbody>
                  {pods.map(pod => (
                    <tr key={`${pod.namespace}/${pod.name}`} className="border-b border-brand-text/10">
                      <td className="p-3 font-bold">{pod.name}</td>
                      <td className="p-3">{pod.namespace}</td>
                      <td className="p-3">{pod.status}</td>
                      <td className="p-3">{pod.nodeName || 'none'}</td>
                      <td className="p-3">{pod.restarts}</td>
                      <td className="p-3 normal-case">{formatAge(pod.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

const SectionTitle = ({ icon, title }: { icon: React.ReactNode; title: string }) => (
  <div className="flex items-center gap-2 text-xs font-bold tracking-widest">
    {icon}
    {title}
  </div>
);

const MetricCard = ({ label, value }: { label: string; value: string }) => (
  <Card className="font-mono">
    <p className="text-[9px] opacity-50 mb-2">{label}</p>
    <p className="text-sm font-bold truncate normal-case">{value}</p>
  </Card>
);

const Detail = ({ label, value }: { label: string; value: string }) => (
  <div className="border border-brand-text/10 p-2 bg-brand-muted/20">
    <p className="opacity-40 mb-1">{label}</p>
    <p className="truncate normal-case">{value}</p>
  </div>
);

const EmptyState = ({ title, detail }: { title: string; detail: string }) => (
  <Card className="text-center py-12 border-dashed bg-brand-muted/20">
    <p className="text-[10px] font-bold tracking-widest">{title}</p>
    <p className="text-xs opacity-60 normal-case mt-2 max-w-2xl mx-auto leading-relaxed">{detail}</p>
  </Card>
);

const formatAge = (createdAt?: string) => {
  if (!createdAt) return 'unknown';

  try {
    return formatDistanceToNowStrict(new Date(createdAt), { addSuffix: false });
  } catch {
    return 'unknown';
  }
};

export default EksView;
