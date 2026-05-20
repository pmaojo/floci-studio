import React, { useState, useEffect } from 'react';
import { ListTablesCommand, ScanCommand, DeleteTableCommand, CreateTableCommand, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall, marshall } from '@aws-sdk/util-dynamodb';
import { useAws } from '../contexts/AwsContext';
import { 
  Database, 
  Search, 
  CirclePlus, 
  Table as TableIcon, 
  Trash2, 
  ExternalLink, 
  TrendingUp,
  ArrowLeft,
  RefreshCw,
  Plus,
  Code,
  Globe,
  Sliders,
  Sparkles,
  Zap,
  CheckCircle2,
  Clock,
  Settings
} from 'lucide-react';
import { PageHeader, Card, Button, Input, Skeleton, Modal, Select } from '../components/ui-elements';
import { motion, AnimatePresence } from 'motion/react';

const DynamoDBView = () => {
  const { clients, logActivity } = useAws();
  const [tables, setTables] = useState<string[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  
  // Table Creation states
  const [isCreationModalOpen, setIsCreationModalOpen] = useState(false);
  const [newTableName, setNewTableName] = useState('');
  const [partitionKeyName, setPartitionKeyName] = useState('id');
  const [partitionKeyType, setPartitionKeyType] = useState<'S' | 'N'>('S');
  const [isCreating, setIsCreating] = useState(false);

  // Item Creation states
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [newItemJson, setNewItemJson] = useState('{\n  "id": "user-100",\n  "name": "Jane Doe",\n  "email": "jane@example.com",\n  "active": true,\n  "role": "admin"\n}');
  const [itemError, setItemError] = useState<string | null>(null);
  const [isSavingItem, setIsSavingItem] = useState(false);

  // Global replication states
  const [tableTab, setTableTab] = useState<'items' | 'global'>('items');
  const [replicas, setReplicas] = useState<{ region: string; status: 'ACTIVE' | 'CREATING'; latency: number; role: 'primary' | 'replica' }[]>([]);
  const [newReplicaRegion, setNewReplicaRegion] = useState('eu-west-1');
  const [isAddingReplica, setIsAddingReplica] = useState(false);
  const [replicaLogs, setReplicaLogs] = useState<{ id: string; timestamp: string; action: string; lag: number; status: 'SUCCESS' | 'SYNCING' }[]>([]);

  const fetchTables = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await clients.dynamo.send(new ListTablesCommand({}));
      setTables(response.TableNames || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch tables');
    } finally {
      setLoading(false);
    }
  };

  const fetchItems = async (tableName: string) => {
    setItemsLoading(true);
    try {
      const response = await clients.dynamo.send(new ScanCommand({ TableName: tableName, Limit: 50 }));
      const unmarshalled = (response.Items || []).map(item => unmarshall(item));
      setItems(unmarshalled);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to fetch table items');
    } finally {
      setItemsLoading(false);
    }
  };

  useEffect(() => {
    fetchTables();
  }, [clients]);

  // Load replica config & create dynamic write-sync feeds whenever the selected table changes
  useEffect(() => {
    if (selectedTable) {
      setTableTab('items');
      const savedReplicas = localStorage.getItem(`floci-ddb-replicas-${selectedTable}`);
      if (savedReplicas) {
        setReplicas(JSON.parse(savedReplicas));
      } else {
        const defaultReplicas = [
          { region: 'us-east-1', status: 'ACTIVE' as const, latency: 15, role: 'primary' as const },
          { region: 'eu-west-1', status: 'ACTIVE' as const, latency: 68, role: 'replica' as const }
        ];
        setReplicas(defaultReplicas);
        localStorage.setItem(`floci-ddb-replicas-${selectedTable}`, JSON.stringify(defaultReplicas));
      }

      // Populate base-level replication logs
      const defaultLogs = [
        { id: `sync-${Math.random().toString(36).substring(4)}`, timestamp: new Date(Date.now() - 120000).toISOString(), action: 'GET_METADATA sync', lag: 14, status: 'SUCCESS' as const },
        { id: `sync-${Math.random().toString(36).substring(4)}`, timestamp: new Date(Date.now() - 480000).toISOString(), action: 'PUT_ITEM sync', lag: 52, status: 'SUCCESS' as const }
      ];
      setReplicaLogs(defaultLogs);
    }
  }, [selectedTable]);

  const handleCreateTable = async () => {
    if (!newTableName) return;
    setIsCreating(true);
    try {
      await clients.dynamo.send(new CreateTableCommand({
        TableName: newTableName,
        KeySchema: [
          { AttributeName: partitionKeyName, KeyType: 'HASH' }
        ],
        AttributeDefinitions: [
          { AttributeName: partitionKeyName, AttributeType: partitionKeyType }
        ],
        BillingMode: 'PAY_PER_REQUEST'
      }));
      
      logActivity('DynamoDB', `CreateTable: ${newTableName}`, 'success', 'Table created successfully');
      setNewTableName('');
      setIsCreationModalOpen(false);
      fetchTables();
    } catch (err: any) {
      alert(err.message || 'Failed to create table');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteTable = async (tableName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Are you sure you want to drop DynamoDB Table "${tableName}"?`)) return;
    try {
      await clients.dynamo.send(new DeleteTableCommand({ TableName: tableName }));
      logActivity('DynamoDB', `DeleteTable: ${tableName}`, 'success', 'Table removed successfully');
      if (selectedTable === tableName) {
        setSelectedTable(null);
      }
      fetchTables();
    } catch (err: any) {
      alert(err.message || 'Failed to delete table');
    }
  };

  const handlePutItem = async () => {
    if (!selectedTable) return;
    setItemError(null);
    setIsSavingItem(true);
    try {
      const parsedObj = JSON.parse(newItemJson);
      const marshalledItem = marshall(parsedObj);

      await clients.dynamo.send(new PutItemCommand({
        TableName: selectedTable,
        Item: marshalledItem
      }));

      logActivity('DynamoDB', `PutItem into ${selectedTable}`, 'success', `Key: ${parsedObj[partitionKeyName] || 'automatic'}`);
      
      // Add transaction to our global replication log stream
      const latencyOfCurrentPrimary = replicas.find(r => r.role === 'primary')?.latency || 10;
      replicas.filter(r => r.role === 'replica').forEach(replica => {
        const newLog = {
          id: `sync-${Math.random().toString(36).substring(4)}`,
          timestamp: new Date().toISOString(),
          action: `PUT_ITEM replicate -> ${replica.region}`,
          lag: replica.latency + Math.floor(Math.random() * 10 - 5),
          status: 'SUCCESS' as const
        };
        setReplicaLogs(prev => [newLog, ...prev]);
      });

      setIsItemModalOpen(false);
      fetchItems(selectedTable);
    } catch (err: any) {
      setItemError(err.message || 'Could not save item. Ensure JSON structure matches rules.');
    } finally {
      setIsSavingItem(false);
    }
  };

  const handleAddReplica = () => {
    if (!selectedTable || replicas.some(r => r.region === newReplicaRegion)) return;
    setIsAddingReplica(true);
    logActivity('DynamoDB', `AddTableReplica: ${newReplicaRegion}`, 'success', `Linking active data pipelining with regional replica`);

    const newReplicaObj = {
      region: newReplicaRegion,
      status: 'CREATING' as const,
      latency: Math.floor(Math.random() * 80 + 35),
      role: 'replica' as const
    };

    const updated = [...replicas, newReplicaObj];
    setReplicas(updated);
    localStorage.setItem(`floci-ddb-replicas-${selectedTable}`, JSON.stringify(updated));

    setTimeout(() => {
      setReplicas(current => {
        const activeList = current.map(r => r.region === newReplicaRegion ? { ...r, status: 'ACTIVE' as const } : r);
        localStorage.setItem(`floci-ddb-replicas-${selectedTable}`, JSON.stringify(activeList));
        return activeList;
      });
      logActivity('DynamoDB', `ReplicaActive: ${newReplicaRegion}`, 'success', 'Global real-time sync active');
    }, 4000);
  };

  const handlePromotePrimary = (regionName: string) => {
    if (!selectedTable) return;
    logActivity('DynamoDB', `GlobalTableFailover: ${regionName}`, 'success', `Initiating split-second failover. Promoting ${regionName} to master database.`);

    const updated = replicas.map(r => {
      if (r.region === regionName) {
        return { ...r, role: 'primary' as const, latency: 15 };
      } else if (r.role === 'primary') {
        return { ...r, role: 'replica' as const, latency: Math.floor(Math.random() * 80 + 40) };
      }
      return r;
    });

    setReplicas(updated);
    localStorage.setItem(`floci-ddb-replicas-${selectedTable}`, JSON.stringify(updated));

    const changeLog = {
      id: `sync-${Math.random().toString(36).substring(4)}`,
      timestamp: new Date().toISOString(),
      action: `SYS_FAILOVER: Promoted ${regionName} to Primary`,
      lag: 0,
      status: 'SUCCESS' as const
    };
    setReplicaLogs(prev => [changeLog, ...prev]);
  };

  const filteredTables = tables.filter(t => t.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="flex flex-col h-full uppercase">
      <PageHeader 
        title={selectedTable ? `Table / ${selectedTable}` : "DynamoDB Local Tables"} 
        icon={<Database size={18} />}
        onRefresh={selectedTable ? () => fetchItems(selectedTable) : fetchTables}
        isRefreshing={loading || itemsLoading}
        actions={
          selectedTable ? (
            <div className="flex gap-2">
              <Button 
                variant="secondary" 
                size="sm" 
                onClick={() => setSelectedTable(null)}
                icon={<ArrowLeft size={14} />}
              >
                Back
              </Button>
              {tableTab === 'items' && (
                <Button size="sm" onClick={() => setIsItemModalOpen(true)} icon={<Plus size={14} />}>
                  Add Item
                </Button>
              )}
            </div>
          ) : (
            <Button onClick={() => setIsCreationModalOpen(true)} icon={<CirclePlus size={14} />}>
              Create Table
            </Button>
          )
        }
      />

      {/* Model for table creation */}
      <Modal 
        isOpen={isCreationModalOpen} 
        onClose={() => setIsCreationModalOpen(false)} 
        title="Create DynamoDB Table"
      >
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60 font-sans">Table Name</label>
            <Input 
              value={newTableName}
              onChange={e => setNewTableName(e.target.value)}
              placeholder="Users"
              autoFocus
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase opacity-60 font-sans">Partition Key Name</label>
              <Input 
                value={partitionKeyName}
                onChange={e => setPartitionKeyName(e.target.value)}
                placeholder="id"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase opacity-60 font-sans">Partition Key Type</label>
              <Select 
                value={partitionKeyType}
                onChange={e => setPartitionKeyType(e.target.value as 'S' | 'N')}
              >
                <option value="S">String (S)</option>
                <option value="N">Number (N)</option>
              </Select>
            </div>
          </div>

          <div className="p-3 bg-brand-muted/30 border border-brand-text border-dashed text-[10px] opacity-70 lowercase font-sans">
            <p><strong>Note:</strong> Billing mode is set to PAY_PER_REQUEST (On-demand) by default for this local daemon.</p>
          </div>

          <div className="pt-4 flex gap-3">
             <Button 
               variant="ghost" 
               className="flex-1" 
               onClick={() => setIsCreationModalOpen(false)}
             >
               Cancel
             </Button>
             <Button 
               className="flex-1" 
               onClick={handleCreateTable} 
               disabled={!newTableName || !partitionKeyName || isCreating}
             >
               {isCreating ? 'Creating...' : 'Create Table'}
             </Button>
          </div>
        </div>
      </Modal>

      {/* Modal for adding item */}
      <Modal
        isOpen={isItemModalOpen}
        onClose={() => setIsItemModalOpen(false)}
        title="Add Item (JSON Native Put)"
      >
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60 font-sans">Document Attributes (JSON)</label>
            <textarea
              value={newItemJson}
              onChange={e => setNewItemJson(e.target.value)}
              className="w-full h-44 bg-white border border-brand-text p-3 font-mono text-[11px] focus:outline-hidden"
              rows={8}
            />
          </div>

          {itemError && (
            <div className="p-3 bg-rose-50 border border-rose-300 text-rose-800 text-[10px] font-mono lowercase">
              {itemError}
            </div>
          )}

          <div className="pt-2 flex gap-3">
             <Button 
               variant="ghost" 
               className="flex-1" 
               onClick={() => setIsItemModalOpen(false)}
             >
               Cancel
             </Button>
             <Button 
               className="flex-1" 
               onClick={handlePutItem} 
               disabled={isSavingItem || !newItemJson}
             >
               {isSavingItem ? 'Saving Document...' : 'Put Document'}
             </Button>
          </div>
        </div>
      </Modal>

      <div className="p-6 space-y-6 flex-1 overflow-auto bg-brand-bg">
        <AnimatePresence mode="wait">
          {!selectedTable ? (
            <motion.div
              key="tables"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text opacity-30" size={14} />
                <Input 
                  placeholder="Filter Tables..." 
                  className="pl-10" 
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>

              <Card noPadding>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="border-b border-brand-text uppercase text-[10px] font-bold opacity-50 bg-brand-muted">
                        <th className="px-6 py-3 border-r border-brand-text">Table Name</th>
                        <th className="px-6 py-3 border-r border-brand-text">Billing Class</th>
                        <th className="px-6 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        [1, 2, 3].map(i => (
                          <tr key={i} className="border-b border-brand-text/20">
                            <td colSpan={3} className="px-6 py-4"><Skeleton className="h-4 w-full" /></td>
                          </tr>
                        ))
                      ) : error ? (
                        <tr>
                          <td colSpan={3} className="px-6 py-12 text-center text-rose-500 italic font-mono">{error}</td>
                        </tr>
                      ) : filteredTables.length === 0 ? (
                        <tr>
                           <td colSpan={3} className="px-6 py-12 text-center text-brand-text opacity-40 italic">No Tables Found</td>
                        </tr>
                      ) : (
                        filteredTables.map(tableName => (
                          <tr 
                            key={tableName} 
                            onClick={() => {
                              setSelectedTable(tableName);
                              fetchItems(tableName);
                            }}
                            className="border-b border-brand-text hover:bg-brand-text hover:text-white transition-colors cursor-pointer font-mono text-[11px]"
                          >
                            <td className="px-6 py-3 border-r border-brand-text font-bold">
                              <div className="flex items-center gap-3">
                                <TableIcon size={14} className="opacity-50" />
                                <span>{tableName}</span>
                              </div>
                            </td>
                            <td className="px-6 py-3 border-r border-brand-text opacity-70">PAY_PER_REQUEST</td>
                            <td className="px-6 py-3 text-right">
                               <div className="flex justify-end gap-4 uppercase font-bold text-[10px]">
                                 <span className="hover:underline">OPEN</span>
                                 <button 
                                  onClick={(e) => handleDeleteTable(tableName, e)}
                                  className="hover:underline text-rose-500"
                                >
                                  DROP
                                </button>
                               </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </motion.div>
          ) : (
            <motion.div
              key="selected-tab-layout"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              {/* Context Selector Tab Buttons */}
              <div className="flex border-b border-brand-text bg-white">
                <button
                  onClick={() => setTableTab('items')}
                  className={`px-6 py-3 text-[10px] font-bold tracking-wider flex items-center gap-2 border-r border-brand-text ${
                    tableTab === 'items' ? 'bg-brand-text text-brand-bg' : 'hover:bg-brand-muted'
                  }`}
                >
                  <Database size={13} />
                  ITEMS_INVENTORY ({items.length})
                </button>
                <button
                  onClick={() => setTableTab('global')}
                  className={`px-6 py-3 text-[10px] font-bold tracking-wider flex items-center gap-2 border-r border-brand-text ${
                    tableTab === 'global' ? 'bg-brand-text text-brand-bg animate-pulse' : 'hover:bg-brand-muted'
                  }`}
                >
                  <Globe size={13} />
                  GLOBAL_REPLICAS (REAL_TIME)
                </button>
              </div>

              {tableTab === 'items' ? (
                // Table item scan views code
                itemsLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                  </div>
                ) : items.length === 0 ? (
                  <Card className="text-center py-20 bg-brand-muted/30 border-dashed">
                    <p className="text-[10px] font-bold uppercase tracking-widest opacity-35">SCAN_RESULT: NO_DATA_REGISTERED_FOR_DDB</p>
                    <p className="text-[9px] font-sans lowercase opacity-50 mt-1">Please insert a documentation JSON block to test the inventory engine.</p>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {items.map((item, idx) => (
                      <Card key={idx} noPadding className="bg-brand-muted/10 border-brand-text hover:bg-brand-muted/20 transition-colors">
                        <div className="px-6 py-3 border-b border-brand-text bg-brand-muted flex items-center justify-between">
                           <span className="text-[9px] font-mono opacity-40">DOCUMENT_OFFSET: {idx}</span>
                           <span className="text-[9px] font-mono select-all font-bold text-indigo-700">HASH_KEY: {JSON.stringify(item[partitionKeyName] || Object.values(item)[0] || 'Unknown')}</span>
                        </div>
                        <div className="p-4 font-mono text-[11px] overflow-auto max-h-40">
                           <pre className="text-brand-text">
                             {JSON.stringify(item, null, 2)}
                           </pre>
                        </div>
                      </Card>
                    ))}
                  </div>
                )
              ) : (
                // New Global Real-time DynamoDB replication visualizers!
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left panel: Active replication clusters */}
                  <div className="lg:col-span-2 space-y-6">
                    <Card>
                      <div className="flex justify-between items-center pb-3 border-b border-brand-text/10 mb-4">
                        <h3 className="font-bold text-xs tracking-wider flex items-center gap-2">
                          <Globe size={13} className="text-indigo-600" />
                          REPLICA_TOPOLOGY (MULTI_REGION_ACTIVE)
                        </h3>
                        <span className="text-[8px] font-mono bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded font-bold font-sans">
                          GLOBAL_TABLE_MODE
                        </span>
                      </div>

                      <div className="space-y-4">
                        {replicas.map(replica => (
                          <div 
                            key={replica.region} 
                            className={`border p-3 rounded-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                              replica.role === 'primary' 
                                ? 'bg-white border-brand-text border-2' 
                                : 'bg-brand-muted/15 border-brand-text/10'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-full ${replica.role === 'primary' ? 'bg-indigo-100 text-indigo-700' : 'bg-zinc-100 text-zinc-600'}`}>
                                <Globe size={16} />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-bold text-xs">{replica.region}</span>
                                  {replica.role === 'primary' && (
                                    <span className="text-[7.5px] font-mono bg-emerald-600 text-white px-1 py-0.5 rounded font-bold">PRIMARY_MASTER</span>
                                  )}
                                  {replica.role === 'replica' && (
                                    <span className="text-[7.5px] font-mono bg-indigo-600 text-white px-1 py-0.5 rounded font-bold">REPLICA_LINK</span>
                                  )}
                                </div>
                                <div className="flex items-center gap-3 text-[9px] text-zinc-500 font-mono uppercase mt-1">
                                  <span>Sync Latency: <strong className={replica.role === 'primary' ? 'text-zinc-600' : 'text-zinc-700 font-bold'}>{replica.latency}ms</strong></span>
                                  <span>State: <strong className={replica.status === 'ACTIVE' ? 'text-emerald-600 font-bold' : 'text-amber-500 font-bold animate-pulse'}>{replica.status}</strong></span>
                                </div>
                              </div>
                            </div>

                            <div className="flex gap-2 shrink-0">
                              {replica.role === 'replica' && replica.status === 'ACTIVE' && (
                                <Button 
                                  variant="secondary" 
                                  size="sm" 
                                  className="!py-1 font-mono text-[9px]"
                                  onClick={() => handlePromotePrimary(replica.region)}
                                >
                                  Trigger Failover
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </Card>

                    {/* Add Replica Region Component */}
                    <Card>
                      <h4 className="font-bold text-xs pb-3 border-b border-brand-text/10 mb-4 tracking-wider">
                        EXTEND_GLOBAL_FOOTPRINT
                      </h4>
                      <div className="flex flex-col sm:flex-row gap-3">
                        <div className="flex-1">
                          <Select 
                            value={newReplicaRegion} 
                            onChange={e => setNewReplicaRegion(e.target.value)}
                          >
                            <option value="eu-west-1">eu-west-1 (Ireland)</option>
                            <option value="ap-southeast-1">ap-southeast-1 (Singapore)</option>
                            <option value="us-west-2">us-west-2 (Oregon)</option>
                            <option value="sa-east-1">sa-east-1 (São Paulo)</option>
                            <option value="us-east-2">us-east-2 (Ohio)</option>
                          </Select>
                        </div>
                        <Button 
                          onClick={handleAddReplica} 
                          disabled={isAddingReplica || replicas.some(r => r.region === newReplicaRegion)}
                          icon={<Sliders size={12} />}
                        >
                          {isAddingReplica ? 'Provisioning Region...' : 'Link Global Region'}
                        </Button>
                      </div>
                    </Card>
                  </div>

                  {/* Right panel: Active Replication Activity logs stream */}
                  <div className="lg:col-span-1">
                    <Card className="h-full flex flex-col">
                      <h3 className="font-bold text-xs pb-3 border-b border-brand-text/10 mb-4 tracking-wider flex items-center gap-1.5">
                        <Clock size={13} className="text-zinc-500" />
                        REPLICATION_TRANSACTION_FEED
                      </h3>
                      <div className="space-y-3 font-mono text-[9px] max-h-[420px] overflow-auto flex-1">
                        {replicaLogs.length === 0 ? (
                          <div className="text-center py-10 opacity-30">NO_REPLICAS_ACTIVITY</div>
                        ) : (
                          replicaLogs.map((log) => (
                            <div key={log.id} className="border-b border-brand-text/5 pb-2.5 last:border-b-0">
                              <div className="flex justify-between font-bold text-[10px]">
                                <span className="text-indigo-700 break-all">{log.action}</span>
                                <span className="text-emerald-600 font-sans font-bold">{log.status}</span>
                              </div>
                              <div className="flex justify-between text-[8px] opacity-50 mt-1 lowercase">
                                <span className="font-sans">lag: {log.lag}ms</span>
                                <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </Card>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default DynamoDBView;
