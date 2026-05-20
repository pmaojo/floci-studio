import React, { useState, useEffect } from 'react';
import { DescribeVpcsCommand, CreateVpcCommand, DeleteVpcCommand, DescribeSubnetsCommand } from '@aws-sdk/client-ec2';
import { useAws } from '../contexts/AwsContext';
import { Network, Search, CirclePlus, Trash2, Layers, Cpu } from 'lucide-react';
import { PageHeader, Card, Button, Input, Skeleton, Modal, Select } from '../components/ui-elements';

const VPCView = () => {
  const { clients, logActivity } = useAws();
  const [vpcs, setVpcs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreationModalOpen, setIsCreationModalOpen] = useState(false);
  const [cidrBlock, setCidrBlock] = useState('10.0.0.0/16');
  const [isCreating, setIsCreating] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await clients.ec2.send(new DescribeVpcsCommand({}));
      setVpcs(response.Vpcs || []);
      logActivity('EC2/VPC', 'DescribeVpcs', 'success');
    } catch (err: any) {
      logActivity('EC2/VPC', 'DescribeVpcs failed', 'error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!cidrBlock) return;
    setIsCreating(true);
    try {
      await clients.ec2.send(new CreateVpcCommand({ CidrBlock: cidrBlock }));
      logActivity('EC2/VPC', `CreateVpc: ${cidrBlock}`, 'success');
      setIsCreationModalOpen(false);
      fetchData();
    } catch (err: any) {
      logActivity('EC2/VPC', `CreateVpc failed: ${cidrBlock}`, 'error', err.message);
      alert(err.message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(`Delete VPC ${id}?`)) return;
    try {
      await clients.ec2.send(new DeleteVpcCommand({ VpcId: id }));
      logActivity('EC2/VPC', `DeleteVpc: ${id}`, 'success');
      fetchData();
    } catch (err: any) {
      logActivity('EC2/VPC', `DeleteVpc failed: ${id}`, 'error', err.message);
      alert(err.message);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="flex flex-col h-full uppercase">
      <PageHeader 
        title="VPC Networking" 
        icon={<Network size={18} />}
        onRefresh={fetchData}
        isRefreshing={loading}
        actions={
          <Button onClick={() => setIsCreationModalOpen(true)} icon={<CirclePlus size={14} />}>
            Create VPC
          </Button>
        }
      />

      <Modal 
        isOpen={isCreationModalOpen} 
        onClose={() => setIsCreationModalOpen(false)} 
        title="Create Virtual Private Cloud"
      >
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60">IPv4 CIDR Block</label>
            <Input 
              value={cidrBlock}
              onChange={e => setCidrBlock(e.target.value)}
              placeholder="10.0.0.0/16"
              autoFocus
            />
          </div>
          <div className="p-3 bg-brand-muted/30 border border-brand-text border-dashed text-[9px] opacity-70">
            <p>Creating a VPC provides a logically isolated section of the cloud where you can launch resources in a virtual network.</p>
          </div>
          <div className="pt-4 flex gap-3">
             <Button variant="ghost" className="flex-1" onClick={() => setIsCreationModalOpen(false)}>Cancel</Button>
             <Button className="flex-1" onClick={handleCreate} disabled={!cidrBlock || isCreating}>
               {isCreating ? 'Creating...' : 'Create VPC'}
             </Button>
          </div>
        </div>
      </Modal>

      <div className="p-6 flex-1 overflow-auto bg-brand-bg">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {loading ? (
            [1, 2].map(i => <Skeleton key={i} className="h-40" />)
          ) : vpcs.length === 0 ? (
            <div className="col-span-full py-20 text-center border border-dashed border-brand-text/20">
               <p className="text-xs opacity-40 font-mono italic">NO_VPC_FABRICS_FOUND</p>
            </div>
          ) : (
            vpcs.map(vpc => (
              <Card key={vpc.VpcId} className="hover:border-brand-text transition-all bg-white relative overflow-hidden">
                <div className="absolute top-0 right-0 p-2 opacity-10">
                  <Network size={64} />
                </div>
                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="font-bold text-xs">{vpc.VpcId}</h4>
                      <p className="text-[9px] font-mono opacity-50">{vpc.State === 'available' ? 'OPERATIONAL' : vpc.State?.toUpperCase()}</p>
                    </div>
                    <button onClick={() => handleDelete(vpc.VpcId!)} className="p-1.5 hover:text-rose-600 transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mt-6">
                    <div className="p-2 border border-brand-text/10 bg-brand-muted/10">
                      <p className="text-[8px] font-bold opacity-40 uppercase">CIDR_BLOCK</p>
                      <p className="text-[10px] font-mono font-bold">{vpc.CidrBlock}</p>
                    </div>
                    <div className="p-2 border border-brand-text/10 bg-brand-muted/10">
                      <p className="text-[8px] font-bold opacity-40 uppercase">DEFAULT_VPC</p>
                      <p className="text-[10px] font-mono font-bold">{vpc.IsDefault ? 'TRUE' : 'FALSE'}</p>
                    </div>
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

export default VPCView;
