import { useState, useEffect } from 'react';
import { GetDatabasesCommand, CreateDatabaseCommand, DeleteDatabaseCommand, GetTablesCommand } from '@aws-sdk/client-glue';
import { useAws } from '../contexts/AwsContext';
import { Layers, CirclePlus, Trash2, Database, Table, Settings } from 'lucide-react';
import { PageHeader, Card, Button, Input, Skeleton, Modal } from '../components/ui-elements';

const GlueView = () => {
  const { clients, logActivity } = useAws();
  const [databases, setDatabases] = useState<any[]>([]);
  const [tableCounts, setTableCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [isCreationModalOpen, setIsCreationModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await clients.glue.send(new GetDatabasesCommand({}));
      const dbs = response.DatabaseList || [];
      setDatabases(dbs);
      logActivity('Glue', 'GetDatabases', 'success');
      const counts = await Promise.all(
        dbs.map(async db => {
          try {
            const t = await clients.glue.send(new GetTablesCommand({ DatabaseName: db.Name! }));
            return [db.Name!, (t.TableList || []).length] as [string, number];
          } catch {
            return [db.Name!, 0] as [string, number];
          }
        })
      );
      setTableCounts(Object.fromEntries(counts));
    } catch (err: any) {
      logActivity('Glue', 'GetDatabases failed', 'error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newName) return;
    setIsCreating(true);
    try {
      await clients.glue.send(new CreateDatabaseCommand({
        DatabaseInput: { Name: newName, Description: 'Created via Floci UI' }
      }));
      logActivity('Glue', `CreateDatabase: ${newName}`, 'success');
      setNewName('');
      setIsCreationModalOpen(false);
      fetchData();
    } catch (err: any) {
      logActivity('Glue', `CreateDatabase failed: ${newName}`, 'error', err.message);
      alert(err.message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (name: string) => {
    if (!confirm(`Delete database ${name}?`)) return;
    try {
      await clients.glue.send(new DeleteDatabaseCommand({ Name: name }));
      logActivity('Glue', `DeleteDatabase: ${name}`, 'success');
      fetchData();
    } catch (err: any) {
      logActivity('Glue', `DeleteDatabase failed: ${name}`, 'error', err.message);
      alert(err.message);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="flex flex-col h-full uppercase">
      <PageHeader 
        title="Glue Data Catalog" 
        icon={<Layers size={18} />}
        onRefresh={fetchData}
        isRefreshing={loading}
        actions={
          <Button onClick={() => setIsCreationModalOpen(true)} icon={<CirclePlus size={14} />}>
            New Database
          </Button>
        }
      />

      <Modal 
        isOpen={isCreationModalOpen} 
        onClose={() => setIsCreationModalOpen(false)} 
        title="Create Glue Database"
      >
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60">Database Name</label>
            <Input 
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="marketing_data"
              autoFocus
            />
          </div>
          <div className="pt-4 flex gap-3">
             <Button variant="ghost" className="flex-1" onClick={() => setIsCreationModalOpen(false)}>Cancel</Button>
             <Button className="flex-1" onClick={handleCreate} disabled={!newName || isCreating}>
               {isCreating ? 'Creating...' : 'Create DB'}
             </Button>
          </div>
        </div>
      </Modal>

      <div className="p-6 flex-1 overflow-auto bg-brand-bg">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            [1, 2, 3].map(i => <Skeleton key={i} className="h-32" />)
          ) : databases.length === 0 ? (
            <div className="col-span-full py-20 text-center border border-dashed border-brand-text/20">
               <p className="text-xs opacity-40 font-mono italic">NO_SCHEMA_DEFINITIONS_FOUND</p>
            </div>
          ) : (
            databases.map(db => (
              <Card key={db.Name} className="hover:border-brand-text transition-all bg-white group">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-2 bg-brand-muted border border-brand-text shrink-0">
                    <Database size={20} />
                  </div>
                  <button onClick={() => handleDelete(db.Name!)} className="p-1 hover:text-rose-600 transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
                <h4 className="font-bold text-xs truncate mb-1">{db.Name}</h4>
                <p className="text-[9px] font-mono opacity-40 truncate">{db.Description || 'No description'}</p>
                <div className="mt-6 flex items-center justify-between text-[8px] font-bold opacity-30">
                  <span className="flex items-center gap-1"><Table size={10} /> {tableCounts[db.Name!] ?? 0} TABLES</span>
                  <span className="flex items-center gap-1"><Settings size={10} /> MANAGED</span>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default GlueView;
