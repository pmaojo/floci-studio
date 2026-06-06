import { useState, useEffect } from 'react';
import {
  DescribeVpcsCommand,
  CreateVpcCommand,
  DeleteVpcCommand,
  DescribeSubnetsCommand,
  CreateSubnetCommand,
  DeleteSubnetCommand,
  DescribeInternetGatewaysCommand,
  CreateInternetGatewayCommand,
  DeleteInternetGatewayCommand,
  AttachInternetGatewayCommand,
  DetachInternetGatewayCommand,
  DescribeRouteTablesCommand,
  CreateRouteTableCommand,
  DeleteRouteTableCommand,
  AssociateRouteTableCommand,
  CreateRouteCommand,
} from '@aws-sdk/client-ec2';
import { useAws } from '../contexts/AwsContext';
import {
  Network,
  CirclePlus,
  Trash2,
  Globe,
  Route,
  Layers,
  Link,
  Unlink,
  Plus,
} from 'lucide-react';
import { PageHeader, Card, Button, Input, Skeleton, Modal, Select } from '../components/ui-elements';

// ─── Types ────────────────────────────────────────────────────────────────────

type TabKey = 'vpcs' | 'subnets' | 'igw' | 'routes';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const tagName = (tags?: { Key?: string; Value?: string }[]) =>
  tags?.find(t => t.Key === 'Name')?.Value || '';

const stateColor = (state?: string) => {
  if (state === 'available' || state === 'attached') return 'text-emerald-700';
  if (state === 'pending')   return 'text-amber-600';
  return 'text-rose-600';
};

const validateCidr = (cidr: string) =>
  /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/.test(cidr);

// ─── Sub-panels ───────────────────────────────────────────────────────────────

// ── VPCs Panel ──
const VpcsPanel = ({
  clients, logActivity,
}: { clients: any; logActivity: any }) => {
  const [vpcs, setVpcs]   = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [cidr, setCidr]   = useState('10.0.0.0/16');
  const [creating, setCreating] = useState(false);

  const fetch = async () => {
    setLoading(true);
    try {
      const r = await clients.ec2.send(new DescribeVpcsCommand({}));
      setVpcs(r.Vpcs || []);
      logActivity('EC2/VPC', 'DescribeVpcs', 'success');
    } catch (e: unknown) {
      logActivity('EC2/VPC', 'DescribeVpcs failed', 'error', e instanceof Error ? e.message : String(e));
    } finally { setLoading(false); }
  };

  const create = async () => {
    if (!validateCidr(cidr)) { alert('Invalid CIDR block'); return; }
    setCreating(true);
    try {
      await clients.ec2.send(new CreateVpcCommand({ CidrBlock: cidr }));
      logActivity('EC2/VPC', `CreateVpc: ${cidr}`, 'success');
      setIsModalOpen(false); fetch();
    } catch (e: unknown) {
      logActivity('EC2/VPC', `CreateVpc failed`, 'error', e instanceof Error ? e.message : String(e)); alert(e instanceof Error ? e.message : String(e));
    } finally { setCreating(false); }
  };

  const remove = async (id: string) => {
    if (!confirm(`Delete VPC ${id}?`)) return;
    try {
      await clients.ec2.send(new DeleteVpcCommand({ VpcId: id }));
      logActivity('EC2/VPC', `DeleteVpc: ${id}`, 'success'); fetch();
    } catch (e: unknown) {
      logActivity('EC2/VPC', `DeleteVpc failed`, 'error', e instanceof Error ? e.message : String(e)); alert(e instanceof Error ? e.message : String(e));
    }
  };

  useEffect(() => { fetch(); }, []);

  return (
    <>
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create Virtual Private Cloud">
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60">IPv4 CIDR Block</label>
            <Input value={cidr} onChange={e => setCidr(e.target.value)} placeholder="10.0.0.0/16" autoFocus />
          </div>
          <div className="p-3 bg-brand-muted/30 border border-brand-text border-dashed text-[9px] opacity-70">
            <p>Creating a VPC provides a logically isolated section of the cloud where you can launch resources in a virtual network.</p>
          </div>
          <div className="pt-4 flex gap-3">
            <Button variant="ghost" className="flex-1" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button className="flex-1" onClick={create} disabled={!cidr || creating}>
              {creating ? 'Creating...' : 'Create VPC'}
            </Button>
          </div>
        </div>
      </Modal>

      <div className="flex justify-end mb-4">
        <Button icon={<CirclePlus size={14} />} onClick={() => setIsModalOpen(true)}>Create VPC</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {loading ? [1, 2].map(i => <Skeleton key={i} className="h-40" />) :
          vpcs.length === 0 ? (
            <div className="col-span-full py-20 text-center border border-dashed border-brand-text/20">
              <p className="text-xs opacity-40 font-mono italic">NO_VPC_FABRICS_FOUND</p>
            </div>
          ) : vpcs.map(vpc => (
            <Card key={vpc.VpcId} className="hover:border-brand-text transition-all bg-white relative overflow-hidden">
              <div className="absolute top-0 right-0 p-2 opacity-10"><Network size={64} /></div>
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    {tagName(vpc.Tags) && (
                      <p className="text-[8px] font-bold uppercase text-brand-text/50 mb-0.5">{tagName(vpc.Tags)}</p>
                    )}
                    <h4 className="font-bold text-xs">{vpc.VpcId}</h4>
                    <p className={`text-[9px] font-mono mt-0.5 ${stateColor(vpc.State)}`}>
                      {vpc.State === 'available' ? 'OPERATIONAL' : vpc.State?.toUpperCase()}
                    </p>
                  </div>
                  <button onClick={() => remove(vpc.VpcId!)} className="p-1.5 hover:text-rose-600 transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-6">
                  {[
                    ['CIDR_BLOCK', vpc.CidrBlock],
                    ['DEFAULT_VPC', vpc.IsDefault ? 'TRUE' : 'FALSE'],
                    ['DHCP_OPTIONS', vpc.DhcpOptionsId || '—'],
                    ['TENANCY', vpc.InstanceTenancy || 'default'],
                  ].map(([k, v]) => (
                    <div key={k} className="p-2 border border-brand-text/10 bg-brand-muted/10">
                      <p className="text-[8px] font-bold opacity-40 uppercase">{k}</p>
                      <p className="text-[10px] font-mono font-bold">{v}</p>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          ))}
      </div>
    </>
  );
};

// ── Subnets Panel ──
const SubnetsPanel = ({
  clients, logActivity,
}: { clients: any; logActivity: any }) => {
  const [subnets, setSubnets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [vpcId, setVpcId] = useState('');
  const [az, setAz] = useState('');
  const [cidr, setCidr] = useState('10.0.1.0/24');
  const [creating, setCreating] = useState(false);
  const [vpcs, setVpcs] = useState<any[]>([]);

  const fetch = async () => {
    setLoading(true);
    try {
      const [sRes, vRes] = await Promise.all([
        clients.ec2.send(new DescribeSubnetsCommand({})),
        clients.ec2.send(new DescribeVpcsCommand({})),
      ]);
      setSubnets(sRes.Subnets || []);
      setVpcs(vRes.Vpcs || []);
      logActivity('EC2/VPC', 'DescribeSubnets', 'success');
    } catch (e: unknown) {
      logActivity('EC2/VPC', 'DescribeSubnets failed', 'error', e instanceof Error ? e.message : String(e));
    } finally { setLoading(false); }
  };

  const create = async () => {
    if (!vpcId || !cidr) { alert('VpcId and CIDR required'); return; }
    if (!validateCidr(cidr)) { alert('Invalid CIDR block'); return; }
    setCreating(true);
    try {
      await clients.ec2.send(new CreateSubnetCommand({
        VpcId: vpcId,
        CidrBlock: cidr,
        AvailabilityZone: az || undefined,
      }));
      logActivity('EC2/VPC', `CreateSubnet: ${cidr} in ${vpcId}`, 'success');
      setIsModalOpen(false); fetch();
    } catch (e: unknown) {
      logActivity('EC2/VPC', `CreateSubnet failed`, 'error', e instanceof Error ? e.message : String(e)); alert(e instanceof Error ? e.message : String(e));
    } finally { setCreating(false); }
  };

  const remove = async (id: string) => {
    if (!confirm(`Delete subnet ${id}?`)) return;
    try {
      await clients.ec2.send(new DeleteSubnetCommand({ SubnetId: id }));
      logActivity('EC2/VPC', `DeleteSubnet: ${id}`, 'success'); fetch();
    } catch (e: unknown) {
      logActivity('EC2/VPC', `DeleteSubnet failed`, 'error', e instanceof Error ? e.message : String(e)); alert(e instanceof Error ? e.message : String(e));
    }
  };

  useEffect(() => { fetch(); }, []);

  return (
    <>
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create Subnet">
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60">Parent VPC</label>
            <Select value={vpcId} onChange={e => setVpcId(e.target.value)}>
              <option value="">Select VPC</option>
              {vpcs.map(v => (
                <option key={v.VpcId} value={v.VpcId}>
                  {tagName(v.Tags) || v.VpcId} ({v.CidrBlock})
                </option>
              ))}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase opacity-60">CIDR Block</label>
              <Input value={cidr} onChange={e => setCidr(e.target.value)} placeholder="10.0.1.0/24" autoFocus />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase opacity-60">Availability Zone (opt.)</label>
              <Input value={az} onChange={e => setAz(e.target.value)} placeholder="us-east-1a" />
            </div>
          </div>
          <div className="pt-4 flex gap-3">
            <Button variant="ghost" className="flex-1" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button className="flex-1" onClick={create} disabled={!vpcId || !cidr || creating}>
              {creating ? 'Creating...' : 'Create Subnet'}
            </Button>
          </div>
        </div>
      </Modal>

      <div className="flex justify-end mb-4">
        <Button icon={<CirclePlus size={14} />} onClick={() => setIsModalOpen(true)}>Create Subnet</Button>
      </div>

      {loading ? (
        <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-16" />)}</div>
      ) : subnets.length === 0 ? (
        <div className="py-20 text-center border border-dashed border-brand-text/20">
          <p className="text-xs opacity-40 font-mono italic">NO_SUBNETS_FOUND</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-[1fr_8rem_8rem_7rem_7rem_3rem] gap-3 px-4 text-[8px] font-bold opacity-40 uppercase tracking-widest border-b border-brand-text/10 pb-2 mb-2">
            <span>Subnet ID</span><span>CIDR</span><span>VPC</span><span>AZ</span><span>Free IPs</span><span></span>
          </div>
          {subnets.map(s => (
            <div key={s.SubnetId} className="grid grid-cols-[1fr_8rem_8rem_7rem_7rem_3rem] gap-3 items-center px-4 py-3 border border-brand-text/10 bg-white/30 hover:bg-white/50 transition-all hover:border-brand-text/40 group mb-1">
              <div>
                <p className="font-bold text-xs font-mono">{s.SubnetId}</p>
                <p className="text-[9px] opacity-40 normal-case">{tagName(s.Tags) || '—'}</p>
              </div>
              <span className="font-mono text-[10px]">{s.CidrBlock}</span>
              <span className="font-mono text-[10px] truncate">{s.VpcId}</span>
              <span className="font-mono text-[10px]">{s.AvailabilityZone}</span>
              <span className={`font-mono text-[10px] ${stateColor(s.State)}`}>{s.AvailableIpAddressCount}</span>
              <button onClick={() => remove(s.SubnetId!)} className="opacity-0 group-hover:opacity-100 hover:text-rose-600 transition-all p-1">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </>
      )}
    </>
  );
};

// ── Internet Gateways Panel ──
const IGWPanel = ({
  clients, logActivity,
}: { clients: any; logActivity: any }) => {
  const [igws, setIgws]   = useState<any[]>([]);
  const [vpcs, setVpcs]   = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAttachModalOpen, setIsAttachModalOpen] = useState(false);
  const [attachIgwId, setAttachIgwId] = useState('');
  const [attachVpcId, setAttachVpcId] = useState('');
  const [attaching, setAttaching] = useState(false);

  const fetch = async () => {
    setLoading(true);
    try {
      const [iRes, vRes] = await Promise.all([
        clients.ec2.send(new DescribeInternetGatewaysCommand({})),
        clients.ec2.send(new DescribeVpcsCommand({})),
      ]);
      setIgws(iRes.InternetGateways || []);
      setVpcs(vRes.Vpcs || []);
      logActivity('EC2/VPC', 'DescribeInternetGateways', 'success');
    } catch (e: unknown) {
      logActivity('EC2/VPC', 'DescribeInternetGateways failed', 'error', e instanceof Error ? e.message : String(e));
    } finally { setLoading(false); }
  };

  const createIgw = async () => {
    try {
      await clients.ec2.send(new CreateInternetGatewayCommand({}));
      logActivity('EC2/VPC', 'CreateInternetGateway', 'success'); fetch();
    } catch (e: unknown) {
      logActivity('EC2/VPC', 'CreateInternetGateway failed', 'error', e instanceof Error ? e.message : String(e)); alert(e instanceof Error ? e.message : String(e));
    }
  };

  const attach = async () => {
    if (!attachIgwId || !attachVpcId) return;
    setAttaching(true);
    try {
      await clients.ec2.send(new AttachInternetGatewayCommand({ InternetGatewayId: attachIgwId, VpcId: attachVpcId }));
      logActivity('EC2/VPC', `AttachIGW: ${attachIgwId} → ${attachVpcId}`, 'success');
      setIsAttachModalOpen(false); fetch();
    } catch (e: unknown) {
      logActivity('EC2/VPC', `AttachIGW failed`, 'error', e instanceof Error ? e.message : String(e)); alert(e instanceof Error ? e.message : String(e));
    } finally { setAttaching(false); }
  };

  const detach = async (igwId: string, vpcId: string) => {
    if (!confirm(`Detach IGW ${igwId} from VPC ${vpcId}?`)) return;
    try {
      await clients.ec2.send(new DetachInternetGatewayCommand({ InternetGatewayId: igwId, VpcId: vpcId }));
      logActivity('EC2/VPC', `DetachIGW: ${igwId}`, 'success'); fetch();
    } catch (e: unknown) {
      logActivity('EC2/VPC', `DetachIGW failed`, 'error', e instanceof Error ? e.message : String(e)); alert(e instanceof Error ? e.message : String(e));
    }
  };

  const remove = async (id: string) => {
    if (!confirm(`Delete IGW ${id}? Must be detached first.`)) return;
    try {
      await clients.ec2.send(new DeleteInternetGatewayCommand({ InternetGatewayId: id }));
      logActivity('EC2/VPC', `DeleteIGW: ${id}`, 'success'); fetch();
    } catch (e: unknown) {
      logActivity('EC2/VPC', `DeleteIGW failed`, 'error', e instanceof Error ? e.message : String(e)); alert(e instanceof Error ? e.message : String(e));
    }
  };

  useEffect(() => { fetch(); }, []);

  return (
    <>
      <Modal isOpen={isAttachModalOpen} onClose={() => setIsAttachModalOpen(false)} title="Attach Internet Gateway to VPC">
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60">Internet Gateway</label>
            <Select value={attachIgwId} onChange={e => setAttachIgwId(e.target.value)}>
              <option value="">Select IGW</option>
              {igws.filter(g => (g.Attachments || []).length === 0).map(g => (
                <option key={g.InternetGatewayId} value={g.InternetGatewayId!}>{g.InternetGatewayId}</option>
              ))}
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60">Target VPC</label>
            <Select value={attachVpcId} onChange={e => setAttachVpcId(e.target.value)}>
              <option value="">Select VPC</option>
              {vpcs.map(v => (
                <option key={v.VpcId} value={v.VpcId!}>{tagName(v.Tags) || v.VpcId} ({v.CidrBlock})</option>
              ))}
            </Select>
          </div>
          <div className="pt-4 flex gap-3">
            <Button variant="ghost" className="flex-1" onClick={() => setIsAttachModalOpen(false)}>Cancel</Button>
            <Button className="flex-1" onClick={attach} disabled={!attachIgwId || !attachVpcId || attaching} icon={<Link size={13} />}>
              {attaching ? 'Attaching...' : 'Attach'}
            </Button>
          </div>
        </div>
      </Modal>

      <div className="flex justify-end gap-3 mb-4">
        <Button variant="secondary" icon={<Link size={13} />} onClick={() => setIsAttachModalOpen(true)}>Attach to VPC</Button>
        <Button icon={<CirclePlus size={14} />} onClick={createIgw}>Create IGW</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? [1,2].map(i => <Skeleton key={i} className="h-32" />) :
          igws.length === 0 ? (
            <div className="col-span-full py-20 text-center border border-dashed border-brand-text/20">
              <p className="text-xs opacity-40 font-mono italic">NO_INTERNET_GATEWAYS_FOUND</p>
            </div>
          ) : igws.map(igw => {
            const att = (igw.Attachments || [])[0];
            return (
              <Card key={igw.InternetGatewayId} className="hover:border-brand-text transition-all bg-white">
                <div className="flex justify-between items-start mb-3">
                  <div className="p-2 border border-brand-text bg-brand-muted">
                    <Globe size={18} className="text-brand-text" />
                  </div>
                  <button onClick={() => remove(igw.InternetGatewayId!)} className="p-1 hover:text-rose-600">
                    <Trash2 size={15} />
                  </button>
                </div>
                <h4 className="font-bold text-xs mb-1">{igw.InternetGatewayId}</h4>
                <p className="text-[9px] font-mono opacity-40 mb-3">{tagName(igw.Tags) || 'Unnamed IGW'}</p>
                <div className="border-t border-brand-text/10 pt-3 space-y-1">
                  {att ? (
                    <div className="flex items-center justify-between text-[9px]">
                      <span className={`flex items-center gap-1 font-mono font-bold ${stateColor(att.State)}`}>
                        <Link size={10} /> {att.VpcId} ({att.State?.toUpperCase()})
                      </span>
                      <button
                        onClick={() => detach(igw.InternetGatewayId!, att.VpcId!)}
                        className="flex items-center gap-1 text-amber-700 hover:text-rose-600 font-bold"
                      >
                        <Unlink size={10} /> Detach
                      </button>
                    </div>
                  ) : (
                    <p className="text-[9px] font-mono opacity-40">DETACHED — not associated with any VPC</p>
                  )}
                </div>
              </Card>
            );
          })}
      </div>
    </>
  );
};

// ── Route Tables Panel ──
const RouteTablesPanel = ({
  clients, logActivity,
}: { clients: any; logActivity: any }) => {
  const [tables, setTables] = useState<any[]>([]);
  const [vpcs, setVpcs]     = useState<any[]>([]);
  const [subnets, setSubnets] = useState<any[]>([]);
  const [igws, setIgws]     = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTable, setSelectedTable] = useState<any | null>(null);

  // Create RT modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createVpcId, setCreateVpcId] = useState('');
  const [creating, setCreating] = useState(false);

  // Add route modal
  const [isAddRouteModalOpen, setIsAddRouteModalOpen] = useState(false);
  const [routeDest, setRouteDest] = useState('0.0.0.0/0');
  const [routeTarget, setRouteTarget] = useState('');
  const [addingRoute, setAddingRoute] = useState(false);

  // Associate modal
  const [isAssocModal, setIsAssocModal] = useState(false);
  const [assocSubnetId, setAssocSubnetId] = useState('');
  const [associating, setAssociating] = useState(false);

  const fetch = async () => {
    setLoading(true);
    try {
      const [rtRes, vRes, sRes, iRes] = await Promise.all([
        clients.ec2.send(new DescribeRouteTablesCommand({})),
        clients.ec2.send(new DescribeVpcsCommand({})),
        clients.ec2.send(new DescribeSubnetsCommand({})),
        clients.ec2.send(new DescribeInternetGatewaysCommand({})),
      ]);
      setTables(rtRes.RouteTables || []);
      setVpcs(vRes.Vpcs || []);
      setSubnets(sRes.Subnets || []);
      setIgws(iRes.InternetGateways || []);
      logActivity('EC2/VPC', 'DescribeRouteTables', 'success');
    } catch (e: unknown) {
      logActivity('EC2/VPC', 'DescribeRouteTables failed', 'error', e instanceof Error ? e.message : String(e));
    } finally { setLoading(false); }
  };

  const createTable = async () => {
    if (!createVpcId) return;
    setCreating(true);
    try {
      await clients.ec2.send(new CreateRouteTableCommand({ VpcId: createVpcId }));
      logActivity('EC2/VPC', `CreateRouteTable in ${createVpcId}`, 'success');
      setIsCreateModalOpen(false); fetch();
    } catch (e: unknown) {
      logActivity('EC2/VPC', 'CreateRouteTable failed', 'error', e instanceof Error ? e.message : String(e)); alert(e instanceof Error ? e.message : String(e));
    } finally { setCreating(false); }
  };

  const deleteTable = async (id: string) => {
    if (!confirm(`Delete route table ${id}?`)) return;
    try {
      await clients.ec2.send(new DeleteRouteTableCommand({ RouteTableId: id }));
      logActivity('EC2/VPC', `DeleteRouteTable: ${id}`, 'success');
      if (selectedTable?.RouteTableId === id) setSelectedTable(null);
      fetch();
    } catch (e: unknown) {
      logActivity('EC2/VPC', 'DeleteRouteTable failed', 'error', e instanceof Error ? e.message : String(e)); alert(e instanceof Error ? e.message : String(e));
    }
  };

  const addRoute = async () => {
    if (!selectedTable || !routeDest || !routeTarget) return;
    setAddingRoute(true);
    try {
      const isIgw = routeTarget.startsWith('igw-');
      await clients.ec2.send(new CreateRouteCommand({
        RouteTableId: selectedTable.RouteTableId,
        DestinationCidrBlock: routeDest,
        GatewayId: isIgw ? routeTarget : undefined,
        InstanceId: !isIgw ? routeTarget : undefined,
      }));
      logActivity('EC2/VPC', `CreateRoute: ${routeDest} → ${routeTarget}`, 'success');
      setIsAddRouteModalOpen(false);
      fetch();
    } catch (e: unknown) {
      logActivity('EC2/VPC', 'CreateRoute failed', 'error', e instanceof Error ? e.message : String(e)); alert(e instanceof Error ? e.message : String(e));
    } finally { setAddingRoute(false); }
  };

  const associateSubnet = async () => {
    if (!selectedTable || !assocSubnetId) return;
    setAssociating(true);
    try {
      await clients.ec2.send(new AssociateRouteTableCommand({
        RouteTableId: selectedTable.RouteTableId,
        SubnetId: assocSubnetId,
      }));
      logActivity('EC2/VPC', `AssociateRouteTable → ${assocSubnetId}`, 'success');
      setIsAssocModal(false); fetch();
    } catch (e: unknown) {
      logActivity('EC2/VPC', 'AssociateRouteTable failed', 'error', e instanceof Error ? e.message : String(e)); alert(e instanceof Error ? e.message : String(e));
    } finally { setAssociating(false); }
  };

  useEffect(() => { fetch(); }, []);

  return (
    <>
      {/* Create Route Table Modal */}
      <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Create Route Table">
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60">Parent VPC</label>
            <Select value={createVpcId} onChange={e => setCreateVpcId(e.target.value)}>
              <option value="">Select VPC</option>
              {vpcs.map(v => <option key={v.VpcId} value={v.VpcId!}>{tagName(v.Tags) || v.VpcId} ({v.CidrBlock})</option>)}
            </Select>
          </div>
          <div className="pt-4 flex gap-3">
            <Button variant="ghost" className="flex-1" onClick={() => setIsCreateModalOpen(false)}>Cancel</Button>
            <Button className="flex-1" onClick={createTable} disabled={!createVpcId || creating}>
              {creating ? 'Creating...' : 'Create Route Table'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Add Route Modal */}
      <Modal isOpen={isAddRouteModalOpen} onClose={() => setIsAddRouteModalOpen(false)} title="Add Route">
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60">Destination CIDR</label>
            <Input value={routeDest} onChange={e => setRouteDest(e.target.value)} placeholder="0.0.0.0/0" autoFocus />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60">Target (IGW ID or Instance ID)</label>
            <Select value={routeTarget} onChange={e => setRouteTarget(e.target.value)}>
              <option value="">Select target</option>
              {igws.map(g => <option key={g.InternetGatewayId} value={g.InternetGatewayId!}>{g.InternetGatewayId} (IGW)</option>)}
            </Select>
          </div>
          <div className="pt-4 flex gap-3">
            <Button variant="ghost" className="flex-1" onClick={() => setIsAddRouteModalOpen(false)}>Cancel</Button>
            <Button className="flex-1" onClick={addRoute} disabled={!routeDest || !routeTarget || addingRoute}>
              {addingRoute ? 'Adding...' : 'Add Route'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Associate Subnet Modal */}
      <Modal isOpen={isAssocModal} onClose={() => setIsAssocModal(false)} title="Associate Subnet with Route Table">
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60">Subnet</label>
            <Select value={assocSubnetId} onChange={e => setAssocSubnetId(e.target.value)}>
              <option value="">Select subnet</option>
              {subnets.map(s => <option key={s.SubnetId} value={s.SubnetId!}>{s.SubnetId} ({s.CidrBlock})</option>)}
            </Select>
          </div>
          <div className="pt-4 flex gap-3">
            <Button variant="ghost" className="flex-1" onClick={() => setIsAssocModal(false)}>Cancel</Button>
            <Button className="flex-1" onClick={associateSubnet} disabled={!assocSubnetId || associating}>
              {associating ? 'Associating...' : 'Associate'}
            </Button>
          </div>
        </div>
      </Modal>

      <div className="flex gap-4 h-full">
        {/* Left: table list */}
        <aside className="w-72 shrink-0 flex flex-col gap-2">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[9px] font-bold opacity-40 uppercase tracking-widest">Route Tables</span>
            <Button size="sm" icon={<CirclePlus size={12} />} onClick={() => setIsCreateModalOpen(true)}>New</Button>
          </div>
          {loading ? [1,2].map(i => <Skeleton key={i} className="h-16" />) :
            tables.map(rt => (
              <button
                key={rt.RouteTableId}
                onClick={() => setSelectedTable(rt)}
                className={`w-full text-left p-3 border text-[10px] font-mono transition-all ${
                  selectedTable?.RouteTableId === rt.RouteTableId
                    ? 'bg-brand-text text-brand-bg border-brand-text font-bold'
                    : 'bg-white/30 border-brand-text/20 hover:bg-white/60 hover:border-brand-text/50'
                }`}
              >
                <p className="font-bold truncate">{rt.RouteTableId}</p>
                <p className="text-[8px] mt-0.5 opacity-60">{tagName(rt.Tags) || rt.VpcId}</p>
                <p className="text-[8px] mt-0.5 opacity-40">
                  {(rt.Routes || []).length} routes · {(rt.Associations || []).length} assoc.
                </p>
              </button>
            ))}
        </aside>

        {/* Right: table detail */}
        <div className="flex-1 overflow-auto space-y-5">
          {!selectedTable ? (
            <div className="h-full flex items-center justify-center text-center">
              <div>
                <Route size={36} className="mx-auto mb-3 opacity-20" />
                <p className="text-xs opacity-30 uppercase italic">Select a route table to inspect its routes and associations.</p>
              </div>
            </div>
          ) : (
            <>
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-bold font-mono">{selectedTable.RouteTableId}</h3>
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" icon={<Layers size={12} />} onClick={() => setIsAssocModal(true)}>Associate Subnet</Button>
                  <Button size="sm" icon={<Plus size={12} />} onClick={() => setIsAddRouteModalOpen(true)}>Add Route</Button>
                  <Button size="sm" variant="danger" icon={<Trash2 size={12} />} onClick={() => deleteTable(selectedTable.RouteTableId!)}>Delete</Button>
                </div>
              </div>

              {/* Routes */}
              <div>
                <p className="text-[8px] font-bold opacity-40 uppercase tracking-widest mb-2">Routes</p>
                {(selectedTable.Routes || []).length === 0 ? (
                  <p className="text-[10px] opacity-30 italic">No routes.</p>
                ) : (
                  <div className="space-y-1">
                    {(selectedTable.Routes as any[]).map((r: any, i: number) => (
                      <div key={i} className="grid grid-cols-[1fr_1fr_6rem] gap-3 px-4 py-2 border border-brand-text/10 bg-white/40 text-[10px] font-mono">
                        <span className="font-bold">{r.DestinationCidrBlock || r.DestinationIpv6CidrBlock || r.DestinationPrefixListId}</span>
                        <span className="opacity-60 truncate">{r.GatewayId || r.NatGatewayId || r.TransitGatewayId || r.InstanceId || '—'}</span>
                        <span className={stateColor(r.State)}>{r.State?.toUpperCase()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Associations */}
              <div>
                <p className="text-[8px] font-bold opacity-40 uppercase tracking-widest mb-2">Subnet Associations</p>
                {(selectedTable.Associations || []).length === 0 ? (
                  <p className="text-[10px] opacity-30 italic">No associations.</p>
                ) : (
                  <div className="space-y-1">
                    {(selectedTable.Associations as any[]).map((a: any) => (
                      <div key={a.RouteTableAssociationId} className="flex gap-4 px-4 py-2 border border-brand-text/10 bg-white/40 text-[10px] font-mono">
                        <span className="font-bold">{a.SubnetId || 'MAIN_ASSOC'}</span>
                        <span className="opacity-50">{a.RouteTableAssociationId}</span>
                        <span className={`ml-auto ${a.Main ? 'text-sky-700' : 'text-emerald-700'}`}>
                          {a.Main ? 'MAIN' : 'EXPLICIT'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
};

// ─── Main VPC View ────────────────────────────────────────────────────────────

const VPCView = () => {
  const { clients, logActivity } = useAws();
  const [activeTab, setActiveTab] = useState<TabKey>('vpcs');

  const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    { key: 'vpcs',    label: 'VPCs',              icon: <Network size={13} /> },
    { key: 'subnets', label: 'Subnets',            icon: <Layers size={13} /> },
    { key: 'igw',     label: 'Internet Gateways',  icon: <Globe size={13} /> },
    { key: 'routes',  label: 'Route Tables',       icon: <Route size={13} /> },
  ];

  return (
    <div className="flex flex-col h-full uppercase">
      <PageHeader
        title="VPC Networking"
        icon={<Network size={18} />}
        onRefresh={() => {}}
        isRefreshing={false}
      />

      {/* Tab bar */}
      <div className="border-b border-brand-text flex shrink-0 bg-brand-muted">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-5 py-3 text-[10px] font-bold tracking-widest uppercase transition-all border-r border-brand-text/20 ${
              activeTab === tab.key
                ? 'bg-brand-bg border-b-2 border-b-brand-text'
                : 'opacity-50 hover:opacity-80 hover:bg-white/20'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto p-6 bg-brand-bg">
        {activeTab === 'vpcs'    && <VpcsPanel    clients={clients} logActivity={logActivity} />}
        {activeTab === 'subnets' && <SubnetsPanel  clients={clients} logActivity={logActivity} />}
        {activeTab === 'igw'     && <IGWPanel      clients={clients} logActivity={logActivity} />}
        {activeTab === 'routes'  && <RouteTablesPanel clients={clients} logActivity={logActivity} />}
      </div>
    </div>
  );
};

export default VPCView;
