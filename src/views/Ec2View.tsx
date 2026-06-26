import React, { useCallback, useEffect, useState } from 'react';
import { Server, Cable, Shield, Network } from 'lucide-react';
import { useAws } from '../contexts/AwsContext';
import { Button, Card, PageHeader, Skeleton } from '../components/ui-elements';
import { sidecarApi, type Ec2Overview } from '../lib/sidecarApi';

const emptyOverview: Ec2Overview = {
  endpointUrl: '',
  region: '',
  instances: [],
  vpcs: [],
  securityGroups: [],
};

const Ec2View = () => {
  const { logActivity } = useAws();
  const [overview, setOverview] = useState<Ec2Overview>(emptyOverview);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const instancesCount = overview.instances.length;
  const vpcsCount = overview.vpcs.length;
  const securityGroupsCount = overview.securityGroups.length;

  const loadOverview = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await sidecarApi.getEc2Overview();
      setOverview(response);
      logActivity('EC2', 'Describe real EC2 inventory', 'success', `instances=${response.instances.length}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to read EC2 from sidecar';
      setError(message);
      logActivity('EC2', 'Describe real EC2 inventory failed', 'error', message);
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
        title="EC2 INVENTORY"
        icon={<Server size={18} />}
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
          <MetricCard label="SOURCE" value="AWS CLI SIDECAR" />
          <MetricCard label="AWS_ENDPOINT" value={overview.endpointUrl || 'sidecar'} />
          <MetricCard label="REGION" value={overview.region || 'unknown'} />
          <MetricCard label="ITEMS" value={String(instancesCount + vpcsCount + securityGroupsCount)} />
        </div>

        <Card className="text-xs normal-case leading-relaxed opacity-80">
          Real inventory of EC2 instances, networks and security.
        </Card>

        {error && (
          <Card className="text-rose-600 font-mono text-[10px] bg-rose-50 border-rose-600 normal-case">
            {error}
          </Card>
        )}

        <section className="space-y-4">
          <ResourceSection
            title="INSTANCES"
            command="aws ec2 describe-instances"
            icon={<Server size={16} />}
            loading={loading}
            items={overview.instances}
            renderItem={(item, index) => (
              <tr key={String(item.InstanceId || index)} className="border-b border-brand-text/10 align-top">
                <td className="p-3 normal-case truncate">{String(item.InstanceId || '-')}</td>
                <td className="p-3 normal-case truncate">{String(item.ImageId || '-')}</td>
                <td className="p-3 normal-case truncate">{String(item.InstanceType || '-')}</td>
                <td className="p-3 normal-case truncate">
                  {typeof item.State === 'object' && item.State ? String((item.State as any).Name) : '-'}
                </td>
                <td className="p-3 normal-case truncate">{String(item.PrivateIpAddress || '-')}</td>
                <td className="p-3 normal-case truncate">{String(item.PublicIpAddress || '-')}</td>
              </tr>
            )}
            headers={['InstanceId', 'ImageId', 'InstanceType', 'State', 'PrivateIp', 'PublicIp']}
          />

          <ResourceSection
            title="VPCS"
            command="aws ec2 describe-vpcs"
            icon={<Network size={16} />}
            loading={loading}
            items={overview.vpcs}
            renderItem={(item, index) => (
              <tr key={String(item.VpcId || index)} className="border-b border-brand-text/10 align-top">
                <td className="p-3 normal-case truncate">{String(item.VpcId || '-')}</td>
                <td className="p-3 normal-case truncate">{String(item.CidrBlock || '-')}</td>
                <td className="p-3 normal-case truncate">{String(item.State || '-')}</td>
                <td className="p-3 normal-case truncate">{String(item.IsDefault || 'false')}</td>
              </tr>
            )}
            headers={['VpcId', 'CidrBlock', 'State', 'IsDefault']}
          />

          <ResourceSection
            title="SECURITY GROUPS"
            command="aws ec2 describe-security-groups"
            icon={<Shield size={16} />}
            loading={loading}
            items={overview.securityGroups}
            renderItem={(item, index) => (
              <tr key={String(item.GroupId || index)} className="border-b border-brand-text/10 align-top">
                <td className="p-3 normal-case truncate">{String(item.GroupId || '-')}</td>
                <td className="p-3 normal-case truncate">{String(item.GroupName || '-')}</td>
                <td className="p-3 normal-case truncate">{String(item.VpcId || '-')}</td>
                <td className="p-3 normal-case truncate max-w-xs">{String(item.Description || '-')}</td>
              </tr>
            )}
            headers={['GroupId', 'GroupName', 'VpcId', 'Description']}
          />
        </section>
      </div>
    </div>
  );
};

const ResourceSection = ({
  title,
  command,
  icon,
  loading,
  items,
  renderItem,
  headers
}: {
  title: string,
  command: string,
  icon: React.ReactNode,
  loading: boolean,
  items: any[],
  renderItem: (item: any, index: number) => React.ReactNode,
  headers: string[]
}) => {
  return (
    <Card className="font-mono p-0">
      <div className="p-4 flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-brand-text/20">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 border border-brand-text bg-brand-muted flex items-center justify-center shrink-0">
            {icon}
          </div>
          <div>
            <h3 className="text-xs font-bold tracking-wider">{title}</h3>
            <p className="text-[9px] opacity-50 normal-case break-all">{command}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[9px] font-bold">
          <span className="text-emerald-700">OK</span>
          <span className="border border-brand-text px-2 py-1 bg-brand-muted">{items.length}</span>
        </div>
      </div>

      {loading ? (
        <div className="p-6">
          <Skeleton className="h-16" />
        </div>
      ) : items.length === 0 ? (
        <div className="border-t border-brand-text/10 bg-brand-muted/20 text-[10px] p-6 text-center italic opacity-60">
          NO REAL RESOURCES RETURNED
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[10px]">
            <thead className="bg-brand-muted border-b border-brand-text/20">
              <tr>
                {headers.map(h => <th key={h} className="p-3">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => renderItem(item, index))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
};

const MetricCard = ({ label, value }: { label: string; value: string }) => (
  <Card className="font-mono">
    <p className="text-[9px] opacity-50 mb-2">{label}</p>
    <p className="text-sm font-bold truncate normal-case">{value}</p>
  </Card>
);

export default Ec2View;