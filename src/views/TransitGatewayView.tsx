import React, { useState } from 'react';
import { RefreshCw, CirclePlus, Trash2, Shield, Network, Server, ArrowRightLeft, Radio } from 'lucide-react';
import { PageHeader, Card, Button, Input, Modal, Select } from '../components/ui-elements';
import { useAws } from '../contexts/AwsContext';

interface Tgw {
  id: string;
  name: string;
  asn: number;
  attachmentsCount: number;
  status: 'available' | 'pending' | 'deleted';
  dnsSupport: string;
  arn: string;
}

const TransitGatewayView = () => {
  const { logActivity } = useAws();
  const [tgws, setTgws] = useState<Tgw[]>(() => {
    const saved = localStorage.getItem('aws-sim-transitgateway');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // Fallback below
      }
    }
    return [
      {
        id: "tgw-09a83fd21",
        name: "hub-transit-gateway",
        asn: 64512,
        attachmentsCount: 2,
        status: "available",
        dnsSupport: "enable",
        arn: "arn:aws:ec2:eu-central-1:123456789012:transit-gateway/tgw-09a83fd21"
      }
    ];
  });

  React.useEffect(() => {
    localStorage.setItem('aws-sim-transitgateway', JSON.stringify(tgws));
  }, [tgws]);

  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [asn, setAsn] = useState(64512);
  const [dnsSupport, setDnsSupport] = useState('enable');

  const fetchTgws = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      logActivity('Transit Gateway', 'DescribeTransitGateways', 'success');
    }, 500);
  };

  const handleCreate = () => {
    if (!newName) return;
    const cleanId = newName.toLowerCase().replace(/[^a-z0-9-_]/g, '');
    const newTgw: Tgw = {
      id: `tgw-${Math.random().toString(16).substring(2, 10)}`,
      name: cleanId,
      asn,
      attachmentsCount: 0,
      status: 'pending',
      dnsSupport,
      arn: `arn:aws:ec2:eu-central-1:123456789012:transit-gateway/tgw-${Math.random().toString(16).substring(2, 10)}`
    };

    setTgws(prev => [...prev, newTgw]);
    logActivity('Transit Gateway', `CreateTransitGateway: ${cleanId}`, 'success');
    setIsModalOpen(false);
    setNewName('');

    setTimeout(() => {
      setTgws(prev =>
        prev.map(t => t.name === cleanId ? { ...t, status: 'available' } : t)
      );
      logActivity('Transit Gateway', `TransitGatewayAvailable: ${cleanId}`, 'success');
    }, 4000);
  };

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`Delete Transit Gateway ${name}?`)) return;
    setTgws(prev => prev.filter(t => t.id !== id));
    logActivity('Transit Gateway', `DeleteTransitGateway: ${name}`, 'success');
  };

  return (
    <div className="flex flex-col h-full uppercase">
      <PageHeader
        title="Transit Gateways"
        icon={<Network size={18} />}
        onRefresh={fetchTgws}
        isRefreshing={loading}
        actions={
          <Button onClick={() => setIsModalOpen(true)} icon={<CirclePlus size={14} />}>
            Create Gateway
          </Button>
        }
      />

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create Transit Gateway">
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60">Gateway Name</label>
            <Input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="inter-vpc-hub"
              autoFocus
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60">Amazon Side ASN (BGP Router)</label>
            <Input
              type="number"
              value={asn}
              onChange={e => setAsn(parseInt(e.target.value) || 64512)}
              min="64512"
              max="65534"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60">DNS Support</label>
            <Select value={dnsSupport} onChange={e => setDnsSupport(e.target.value)}>
              <option value="enable">Enable (Default)</option>
              <option value="disable">Disable</option>
            </Select>
          </div>

          <div className="pt-4 flex gap-3">
            <Button variant="ghost" className="flex-1" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button className="flex-1" onClick={handleCreate} disabled={!newName}>
               Create Gateway
            </Button>
          </div>
        </div>
      </Modal>

      <div className="p-6 space-y-6 flex-1 overflow-auto bg-brand-bg">
        <div className="bg-brand-muted/40 border border-brand-text/10 p-4 rounded-sm flex justify-between items-center animate-fade-in">
          <div>
            <h3 className="font-serif-italic text-sm font-bold text-brand-text">Centralized inter-vpc routing</h3>
            <p className="text-[9px] font-mono opacity-60 normal-case leading-relaxed max-w-xl mt-1">
              Connect on-premises networks and Virtual Private Clouds (VPCs) in regional router grids. Simplify transit configurations and build global scales cross-account cloud networks.
            </p>
          </div>
          <ArrowRightLeft size={24} className="text-zinc-500 opacity-30 shrink-0" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {tgws.map(tgw => (
            <Card key={tgw.id} className="bg-white hover:border-brand-text transition-all relative">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 border border-brand-text bg-brand-muted/10">
                  <Network size={18} />
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[8px] font-bold px-1.5 py-0.5 border ${
                    tgw.status === 'available'
                      ? 'border-emerald-400 bg-emerald-50 text-emerald-800'
                      : 'border-blue-400 bg-blue-50 text-blue-800 animate-pulse'
                  }`}>
                    {tgw.status}
                  </span>
                  <button onClick={() => handleDelete(tgw.id, tgw.name)} className="p-1 hover:text-rose-600 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <h4 className="font-mono font-bold text-xs truncate">{tgw.name}</h4>
              <p className="text-[10px] opacity-50 truncate mt-1 lowercase font-mono">{tgw.arn}</p>

              <div className="grid grid-cols-3 gap-2 mt-6 pt-3 border-t border-brand-text/10 bg-brand-muted/15 p-2 text-center rounded-sm text-[10px]">
                <div>
                  <span className="text-[7px] text-zinc-400 block font-mono">BGP_ASN</span>
                  <span className="font-bold font-mono">{tgw.asn}</span>
                </div>
                <div>
                  <span className="text-[7px] text-zinc-400 block font-mono">ATTACHMENTS</span>
                  <span className="font-bold font-mono">{tgw.attachmentsCount} subnet pairs</span>
                </div>
                <div>
                  <span className="text-[7px] text-zinc-400 block font-mono">DNS_SUPPORT</span>
                  <span className="font-bold font-mono lowercase">{tgw.dnsSupport}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TransitGatewayView;
