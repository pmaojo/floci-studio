import React, { useState, useEffect, useCallback } from 'react';
import {
  DescribeInstancesCommand,
  DescribeVpcsCommand,
  DescribeSubnetsCommand,
  DescribeSecurityGroupsCommand
} from '@aws-sdk/client-ec2';
import { useAws } from '../contexts/AwsContext';
import {
  Server,
  Network,
  Shield,
  HardDrive,
  RefreshCw,
  Search,
  ExternalLink
} from 'lucide-react';
import { PageHeader, Card, Button, Input, Skeleton } from '../components/ui-elements';
import { format } from 'date-fns';

const EC2View = () => {
  const { clients, logActivity, isHealthy } = useAws();

  // State
  const [instances, setInstances] = useState<any[]>([]);
  const [vpcs, setVpcs] = useState<any[]>([]);
  const [subnets, setSubnets] = useState<any[]>([]);
  const [securityGroups, setSecurityGroups] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'instances' | 'vpcs' | 'subnets' | 'securityGroups'>('instances');
  const [search, setSearch] = useState('');

  const loadData = useCallback(async () => {
    if (!clients.ec2) return;

    setLoading(true);
    setError(null);

    try {
      const [instRes, vpcRes, subnetRes, sgRes] = await Promise.all([
        clients.ec2.send(new DescribeInstancesCommand({})),
        clients.ec2.send(new DescribeVpcsCommand({})),
        clients.ec2.send(new DescribeSubnetsCommand({})),
        clients.ec2.send(new DescribeSecurityGroupsCommand({}))
      ]);

      const flatInstances = instRes.Reservations?.flatMap(r => r.Instances || []) || [];
      setInstances(flatInstances);
      setVpcs(vpcRes.Vpcs || []);
      setSubnets(subnetRes.Subnets || []);
      setSecurityGroups(sgRes.SecurityGroups || []);

      logActivity('EC2', 'DescribeResources', 'success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      logActivity('EC2', 'DescribeResources failed', 'error', msg);
    } finally {
      setLoading(false);
    }
  }, [clients.ec2, logActivity]);

  useEffect(() => {
    loadData();
  }, [loadData, isHealthy]);

  const getFilteredData = () => {
    const s = search.toLowerCase();
    switch (activeTab) {
      case 'instances':
        return instances.filter(i =>
          i.InstanceId?.toLowerCase().includes(s) ||
          i.InstanceType?.toLowerCase().includes(s)
        );
      case 'vpcs':
        return vpcs.filter(v =>
          v.VpcId?.toLowerCase().includes(s) ||
          v.CidrBlock?.toLowerCase().includes(s)
        );
      case 'subnets':
        return subnets.filter(sub =>
          sub.SubnetId?.toLowerCase().includes(s) ||
          sub.VpcId?.toLowerCase().includes(s) ||
          sub.CidrBlock?.toLowerCase().includes(s)
        );
      case 'securityGroups':
        return securityGroups.filter(sg =>
          sg.GroupId?.toLowerCase().includes(s) ||
          sg.GroupName?.toLowerCase().includes(s)
        );
      default:
        return [];
    }
  };

  const filteredData = getFilteredData();

  return (
    <div className="flex flex-col h-full uppercase">
      <PageHeader
        title="EC2 INVENTORY"
        subtitle="Native SDK Explorer"
        icon={<Server size={18} />}
        onRefresh={loadData}
        isRefreshing={loading}
        actions={
          <Button onClick={loadData} disabled={loading} icon={<RefreshCw size={14} className={loading ? 'animate-spin' : ''} />}>
            Refresh EC2
          </Button>
        }
      />

      <div className="p-6 space-y-6 flex-1 overflow-auto bg-brand-bg">
        {/* Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4 flex items-center justify-between hover:border-brand-text cursor-pointer transition-colors" onClick={() => setActiveTab('instances')}>
            <div>
              <p className="text-[10px] font-bold tracking-widest text-neutral-500 mb-1">INSTANCES</p>
              <p className="text-2xl font-bold font-serif-italic text-brand-text">{instances.length}</p>
            </div>
            <Server size={24} className="text-brand-text opacity-50" />
          </Card>
          <Card className="p-4 flex items-center justify-between hover:border-brand-text cursor-pointer transition-colors" onClick={() => setActiveTab('vpcs')}>
            <div>
              <p className="text-[10px] font-bold tracking-widest text-neutral-500 mb-1">VPCs</p>
              <p className="text-2xl font-bold font-serif-italic text-brand-text">{vpcs.length}</p>
            </div>
            <Network size={24} className="text-brand-text opacity-50" />
          </Card>
          <Card className="p-4 flex items-center justify-between hover:border-brand-text cursor-pointer transition-colors" onClick={() => setActiveTab('subnets')}>
            <div>
              <p className="text-[10px] font-bold tracking-widest text-neutral-500 mb-1">SUBNETS</p>
              <p className="text-2xl font-bold font-serif-italic text-brand-text">{subnets.length}</p>
            </div>
            <HardDrive size={24} className="text-brand-text opacity-50" />
          </Card>
          <Card className="p-4 flex items-center justify-between hover:border-brand-text cursor-pointer transition-colors" onClick={() => setActiveTab('securityGroups')}>
            <div>
              <p className="text-[10px] font-bold tracking-widest text-neutral-500 mb-1">SECURITY GROUPS</p>
              <p className="text-2xl font-bold font-serif-italic text-brand-text">{securityGroups.length}</p>
            </div>
            <Shield size={24} className="text-brand-text opacity-50" />
          </Card>
        </div>

        {error && (
          <Card className="text-rose-600 font-mono text-[10px] bg-rose-50 border-rose-600 normal-case p-4">
            {error}
          </Card>
        )}

        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between border-b border-brand-text pb-4">
          <div className="flex gap-2 font-mono text-[10px] uppercase font-bold tracking-widest overflow-x-auto pb-2 md:pb-0">
            <button
              onClick={() => setActiveTab('instances')}
              className={`px-4 py-2 border ${activeTab === 'instances' ? 'bg-brand-text text-brand-bg border-brand-text' : 'border-brand-text text-brand-text hover:bg-black/5'}`}
            >
              Instances
            </button>
            <button
              onClick={() => setActiveTab('vpcs')}
              className={`px-4 py-2 border ${activeTab === 'vpcs' ? 'bg-brand-text text-brand-bg border-brand-text' : 'border-brand-text text-brand-text hover:bg-black/5'}`}
            >
              VPCs
            </button>
            <button
              onClick={() => setActiveTab('subnets')}
              className={`px-4 py-2 border ${activeTab === 'subnets' ? 'bg-brand-text text-brand-bg border-brand-text' : 'border-brand-text text-brand-text hover:bg-black/5'}`}
            >
              Subnets
            </button>
            <button
              onClick={() => setActiveTab('securityGroups')}
              className={`px-4 py-2 border ${activeTab === 'securityGroups' ? 'bg-brand-text text-brand-bg border-brand-text' : 'border-brand-text text-brand-text hover:bg-black/5'}`}
            >
              Security Groups
            </button>
          </div>

          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text opacity-50" size={14} />
            <Input
              placeholder={`Search ${activeTab}...`}
              className="pl-9 font-mono text-[11px]"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        <Card className="overflow-hidden">
          {loading ? (
            <div className="p-6 space-y-4">
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
            </div>
          ) : filteredData.length === 0 ? (
            <div className="p-12 text-center text-neutral-500 font-mono text-[10px]">
              NO_RESOURCES_FOUND
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-[11px] font-mono whitespace-nowrap">
                <thead className="bg-brand-muted border-b border-brand-text">
                  <tr>
                    {activeTab === 'instances' && (
                      <>
                        <th className="p-3 font-bold">Instance ID</th>
                        <th className="p-3 font-bold">Type</th>
                        <th className="p-3 font-bold">State</th>
                        <th className="p-3 font-bold">VPC ID</th>
                        <th className="p-3 font-bold">Subnet ID</th>
                        <th className="p-3 font-bold">Private IP</th>
                      </>
                    )}
                    {activeTab === 'vpcs' && (
                      <>
                        <th className="p-3 font-bold">VPC ID</th>
                        <th className="p-3 font-bold">CIDR Block</th>
                        <th className="p-3 font-bold">State</th>
                        <th className="p-3 font-bold">Is Default</th>
                      </>
                    )}
                    {activeTab === 'subnets' && (
                      <>
                        <th className="p-3 font-bold">Subnet ID</th>
                        <th className="p-3 font-bold">VPC ID</th>
                        <th className="p-3 font-bold">CIDR Block</th>
                        <th className="p-3 font-bold">AZ</th>
                        <th className="p-3 font-bold">Available IPs</th>
                      </>
                    )}
                    {activeTab === 'securityGroups' && (
                      <>
                        <th className="p-3 font-bold">Group ID</th>
                        <th className="p-3 font-bold">Group Name</th>
                        <th className="p-3 font-bold">VPC ID</th>
                        <th className="p-3 font-bold">Description</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-text/10">
                  {filteredData.map((item, idx) => (
                    <tr key={idx} className="hover:bg-neutral-50 transition-colors">
                      {activeTab === 'instances' && (
                        <>
                          <td className="p-3 font-bold text-brand-text">{item.InstanceId}</td>
                          <td className="p-3">{item.InstanceType}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded-sm border ${item.State?.Name === 'running' ? 'border-emerald-500 text-emerald-700 bg-emerald-50' : 'border-neutral-500 text-neutral-700 bg-neutral-50'}`}>
                              {item.State?.Name || 'unknown'}
                            </span>
                          </td>
                          <td className="p-3">{item.VpcId || '-'}</td>
                          <td className="p-3">{item.SubnetId || '-'}</td>
                          <td className="p-3">{item.PrivateIpAddress || '-'}</td>
                        </>
                      )}
                      {activeTab === 'vpcs' && (
                        <>
                          <td className="p-3 font-bold text-brand-text">{item.VpcId}</td>
                          <td className="p-3">{item.CidrBlock}</td>
                          <td className="p-3">{item.State}</td>
                          <td className="p-3">{item.IsDefault ? 'Yes' : 'No'}</td>
                        </>
                      )}
                      {activeTab === 'subnets' && (
                        <>
                          <td className="p-3 font-bold text-brand-text">{item.SubnetId}</td>
                          <td className="p-3">{item.VpcId}</td>
                          <td className="p-3">{item.CidrBlock}</td>
                          <td className="p-3">{item.AvailabilityZone}</td>
                          <td className="p-3">{item.AvailableIpAddressCount}</td>
                        </>
                      )}
                      {activeTab === 'securityGroups' && (
                        <>
                          <td className="p-3 font-bold text-brand-text">{item.GroupId}</td>
                          <td className="p-3">{item.GroupName}</td>
                          <td className="p-3">{item.VpcId || '-'}</td>
                          <td className="p-3 normal-case truncate max-w-xs" title={item.Description}>{item.Description}</td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default EC2View;
