import React, { useState, useEffect } from 'react';
import { DescribeDBInstancesCommand, CreateDBInstanceCommand, DeleteDBInstanceCommand } from '@aws-sdk/client-rds';
import { useAws } from '../contexts/AwsContext';
import { Database, Search, CirclePlus, Trash2, Settings, HardDrive, Shield } from 'lucide-react';
import { PageHeader, Card, Button, Input, Skeleton, Modal, Select } from '../components/ui-elements';
import { format } from 'date-fns';

const RDSView = () => {
  const { clients, logActivity } = useAws();
  const [instances, setInstances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreationModalOpen, setIsCreationModalOpen] = useState(false);
  const [newDbId, setNewDbId] = useState('');
  const [engine, setEngine] = useState('postgres');
  const [dbClass, setDbClass] = useState('db.t3.micro');
  const [isCreating, setIsCreating] = useState(false);

  const fetchInstances = async () => {
    setLoading(true);
    try {
      const response = await clients.rds.send(new DescribeDBInstancesCommand({}));
      setInstances(response.DBInstances || []);
      logActivity('RDS', 'DescribeDBInstances', 'success');
    } catch (err: any) {
      logActivity('RDS', 'DescribeDBInstances failed', 'error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newDbId) return;
    setIsCreating(true);
    try {
      await clients.rds.send(new CreateDBInstanceCommand({
        DBInstanceIdentifier: newDbId,
        Engine: engine,
        DBInstanceClass: dbClass,
        AllocatedStorage: 20,
      }));
      logActivity('RDS', `CreateDBInstance: ${newDbId}`, 'success');
      setNewDbId('');
      setIsCreationModalOpen(false);
      fetchInstances();
    } catch (err: any) {
      logActivity('RDS', `CreateDBInstance failed: ${newDbId}`, 'error', err.message);
      alert(err.message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(`Delete database ${id}? This is irreversible.`)) return;
    try {
      await clients.rds.send(new DeleteDBInstanceCommand({ 
        DBInstanceIdentifier: id,
        SkipFinalSnapshot: true
      }));
      logActivity('RDS', `DeleteDBInstance: ${id}`, 'success');
      fetchInstances();
    } catch (err: any) {
      logActivity('RDS', `DeleteDBInstance failed: ${id}`, 'error', err.message);
      alert(err.message);
    }
  };

  useEffect(() => {
    fetchInstances();
  }, []);

  return (
    <div className="flex flex-col h-full uppercase">
      <PageHeader 
        title="RDS Databases" 
        icon={<Database size={18} />}
        onRefresh={fetchInstances}
        isRefreshing={loading}
        actions={
          <Button onClick={() => setIsCreationModalOpen(true)} icon={<CirclePlus size={14} />}>
            Create Instance
          </Button>
        }
      />

      <Modal 
        isOpen={isCreationModalOpen} 
        onClose={() => setIsCreationModalOpen(false)} 
        title="Provision RDS Instance"
      >
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60">DB Identifier</label>
            <Input 
              value={newDbId}
              onChange={e => setNewDbId(e.target.value)}
              placeholder="production-db"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase opacity-60">Engine</label>
              <Select value={engine} onChange={e => setEngine(e.target.value)}>
                <option value="postgres">PostgreSQL</option>
                <option value="mysql">MySQL</option>
                <option value="mariadb">MariaDB</option>
                <option value="aurora">Aurora</option>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase opacity-60">Instance Class</label>
              <Select value={dbClass} onChange={e => setDbClass(e.target.value)}>
                <option value="db.t3.micro">db.t3.micro</option>
                <option value="db.t3.small">db.t3.small</option>
                <option value="db.m5.large">db.m5.large</option>
              </Select>
            </div>
          </div>
          <div className="pt-4 flex gap-3">
             <Button variant="ghost" className="flex-1" onClick={() => setIsCreationModalOpen(false)}>Cancel</Button>
             <Button className="flex-1" onClick={handleCreate} disabled={!newDbId || isCreating}>
               {isCreating ? 'Provisioning...' : 'Launch DB Instance'}
             </Button>
          </div>
        </div>
      </Modal>

      <div className="p-6 flex-1 overflow-auto bg-brand-bg">
        <div className="grid grid-cols-1 gap-4">
          {loading ? (
            [1, 2].map(i => <Skeleton key={i} className="h-24" />)
          ) : instances.length === 0 ? (
            <div className="py-20 text-center border border-dashed border-brand-text/20">
               <p className="text-xs opacity-40 font-mono">No active database instances</p>
            </div>
          ) : (
            instances.map(db => (
              <Card key={db.DBInstanceIdentifier} className="hover:border-brand-text border-l-4 border-l-brand-text">
                <div className="flex flex-col md:flex-row justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-brand-muted border border-brand-text shrink-0">
                      <Database size={20} />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm tracking-tight">{db.DBInstanceIdentifier}</h4>
                      <div className="flex items-center gap-3 mt-1 text-[9px] font-mono opacity-50 uppercase">
                        <span className="flex items-center gap-1"><Settings size={10} /> {db.Engine}</span>
                        <span className="flex items-center gap-1"><HardDrive size={10} /> 20GB</span>
                        <span className="flex items-center gap-1"><Shield size={10} /> VPC_SECURED</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right hidden sm:block">
                      <p className="text-[10px] font-bold opacity-60">STATUS</p>
                      <p className="text-[11px] font-mono text-emerald-600 font-bold">{db.DBInstanceStatus?.toUpperCase()}</p>
                    </div>
                    <div className="h-8 w-px bg-brand-text opacity-10 mx-2 hidden md:block"></div>
                    <button 
                      onClick={() => handleDelete(db.DBInstanceIdentifier!)}
                      className="p-2 border border-brand-text hover:bg-rose-50 hover:text-rose-600 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
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

export default RDSView;
