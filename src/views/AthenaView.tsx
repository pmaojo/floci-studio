import React, { useState, useEffect } from 'react';
import { ListQueryExecutionsCommand, StartQueryExecutionCommand, GetQueryExecutionCommand } from '@aws-sdk/client-athena';
import { useAws } from '../contexts/AwsContext';
import { Database, Search, Play, History, FileText, Settings, ExternalLink, Terminal, Cpu, Share2, CirclePlus, Trash2 } from 'lucide-react';
import { PageHeader, Card, Button, Input, Skeleton, Modal, Select } from '../components/ui-elements';

interface FederatedConnector {
  id: string;
  name: string;
  sourceType: 'DynamoDB' | 'DocumentDB' | 'RDS-Postgres' | 'Redshift';
  lambdaArn: string;
  status: 'ACTIVE' | 'ERROR';
}

const AthenaView = () => {
  const { clients, logActivity } = useAws();
  const [queries, setQueries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sql, setSql] = useState('SELECT * FROM DynamoDBCatalog.users_table LIMIT 10;');
  const [executing, setExecuting] = useState(false);
  const [activeTab, setActiveTab] = useState<'queries' | 'connectors'>('queries');

  // Federated Connectors States
  const [connectors, setConnectors] = useState<FederatedConnector[]>(() => {
    const saved = localStorage.getItem('aws-sim-athena-connectors');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return [
      {
        id: "conn-001",
        name: "DynamoDBCatalog",
        sourceType: "DynamoDB",
        lambdaArn: "arn:aws:lambda:eu-central-1:123456789012:function:athena-ddb-connector",
        status: "ACTIVE"
      }
    ];
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [connName, setConnName] = useState('');
  const [connType, setConnType] = useState<'DynamoDB' | 'DocumentDB' | 'RDS-Postgres' | 'Redshift'>('DynamoDB');
  const [lambdaArn, setLambdaArn] = useState('arn:aws:lambda:eu-central-1:123456789012:function:athena-ddb-connector');

  useEffect(() => {
    localStorage.setItem('aws-sim-athena-connectors', JSON.stringify(connectors));
  }, [connectors]);

  const fetchQueries = async () => {
    setLoading(true);
    try {
      const response = await clients.athena.send(new ListQueryExecutionsCommand({ MaxResults: 20 }));
      setQueries(response.QueryExecutionIds || []);
      logActivity('Athena', 'ListQueryExecutions', 'success');
    } catch (err: any) {
      logActivity('Athena', 'ListQueryExecutions failed', 'error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRunQuery = async () => {
    if (!sql) return;
    setExecuting(true);
    try {
      const response = await clients.athena.send(new StartQueryExecutionCommand({
        QueryString: sql,
        ResultConfiguration: { OutputLocation: 's3://athena-results-bucket/' }
      }));
      logActivity('Athena', 'StartQueryExecution', 'success', response.QueryExecutionId);
      fetchQueries();
    } catch (err: any) {
      logActivity('Athena', 'StartQueryExecution failed', 'error', err.message);
      alert(err.message);
    } finally {
      setExecuting(false);
    }
  };

  const handleCreateConnector = () => {
    if (!connName) return;
    const newConn: FederatedConnector = {
      id: `conn-${Math.random().toString(36).substring(5)}`,
      name: connName,
      sourceType: connType,
      lambdaArn,
      status: 'ACTIVE'
    };
    setConnectors(prev => [...prev, newConn]);
    logActivity('AthenaFederation', `CreateDataCatalog: ${connName}`, 'success');
    setIsModalOpen(false);
    setConnName('');
  };

  const handleDeleteConnector = (id: string, name: string) => {
    if (!confirm(`Delete Federated Connector ${name}?`)) return;
    setConnectors(prev => prev.filter(c => c.id !== id));
    logActivity('AthenaFederation', `DeleteDataCatalog: ${name}`, 'success');
  };

  useEffect(() => {
    fetchQueries();
  }, []);

  return (
    <div className="flex flex-col h-full uppercase">
      <PageHeader 
        title="Athena Queries & Federation" 
        icon={<Terminal size={18} />}
        onRefresh={activeTab === 'queries' ? fetchQueries : () => {}}
        isRefreshing={loading && activeTab === 'queries'}
        actions={
          activeTab === 'connectors' && (
            <Button onClick={() => setIsModalOpen(true)} icon={<CirclePlus size={14} />}>
              Create Federated Connector
            </Button>
          )
        }
      />

      {/* Tabs */}
      <div className="flex border-b border-brand-text bg-brand-muted shrink-0 text-xs font-bold leading-none">
        <button 
          onClick={() => setActiveTab('queries')}
          className={`px-6 py-3 border-r border-brand-text flex items-center gap-2 transition-all ${activeTab === 'queries' ? 'bg-white border-b-2 border-b-transparent' : 'opacity-60 hover:opacity-100'}`}
        >
          <Terminal size={14} />
          Query Workspace ({queries.length})
        </button>
        <button 
          onClick={() => setActiveTab('connectors')}
          className={`px-6 py-3 border-r border-brand-text flex items-center gap-2 transition-all ${activeTab === 'connectors' ? 'bg-white border-b-2 border-b-transparent' : 'opacity-60 hover:opacity-100'}`}
        >
          <Share2 size={14} />
          Federated Catalogs ({connectors.length})
        </button>
      </div>

      {/* Modal Federated Catalog */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create Federated Connector">
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60">Connector Catalog Name</label>
            <Input value={connName} onChange={e => setConnName(e.target.value)} placeholder="UserMetricsCatalog" autoFocus />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60">Federated Datasource Type</label>
            <Select value={connType} onChange={e => setConnType(e.target.value as any)}>
              <option value="DynamoDB">Amazon DynamoDB Tables</option>
              <option value="DocumentDB">Amazon DocumentDB (MongoDB Compatible)</option>
              <option value="RDS-Postgres">PostgreSql DB Instances / Aurora</option>
              <option value="Redshift">Redshift Analytic Warehouse Data</option>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60">Query Spilling Connector Lambda ARN</label>
            <Input value={lambdaArn} onChange={e => setLambdaArn(e.target.value)} placeholder="arn:aws:lambda:..." />
          </div>
          <div className="pt-4 flex gap-3">
            <Button variant="ghost" className="flex-1" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button className="flex-1" onClick={handleCreateConnector} disabled={!connName}>Register Source</Button>
          </div>
        </div>
      </Modal>

      <div className="p-6 flex-1 overflow-auto bg-brand-bg">
        {activeTab === 'queries' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card className="bg-white border-2 border-brand-text">
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-brand-text/10">
                  <h3 className="font-bold text-[10px] tracking-widest">QUERY_EDITOR</h3>
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" onClick={() => setSql('')}>Clear</Button>
                    <Button size="sm" onClick={handleRunQuery} disabled={executing} icon={<Play size={12} />}>
                      {executing ? 'RUNNING...' : 'EXECUTE'}
                    </Button>
                  </div>
                </div>
                <textarea 
                  value={sql}
                  onChange={e => setSql(e.target.value)}
                  className="w-full h-64 bg-brand-muted/10 font-mono text-xs p-4 focus:outline-none resize-none border border-brand-text/5"
                  placeholder="SELECT * FROM table..."
                />
              </Card>

              <div className="space-y-4">
                 <h3 className="font-bold text-[10px] tracking-widest mb-2 flex items-center gap-2">
                   <History size={14} /> RECENT_EXECUTIONS
                 </h3>
                 {loading ? (
                   [1, 2].map(i => <Skeleton key={i} className="h-12" />)
                 ) : queries.length === 0 ? (
                   <div className="py-10 text-center border border-dashed border-brand-text/20 italic text-[10px] opacity-40">
                      NO_QUERY_HISTORY_FOUND
                   </div>
                 ) : (
                   queries.map(id => (
                     <div key={id} className="p-3 bg-white border border-brand-text/10 flex justify-between items-center text-[10px]">
                        <div className="flex items-center gap-3">
                          <FileText size={14} className="opacity-40" />
                          <span className="font-mono">{id}</span>
                        </div>
                        <span className="bg-emerald-50 text-emerald-600 px-2 py-0.5 font-bold border border-emerald-100 uppercase">Succeeded</span>
                     </div>
                   ))
                 )}
              </div>
            </div>

            <div className="space-y-6">
              <Card secondary>
                <h4 className="font-bold text-[10px] mb-4 tracking-widest border-b border-brand-text/10 pb-2">DATA_CATALOGS</h4>
                <div className="space-y-3">
                  <div className="p-2 bg-white border border-brand-text/10">
                    <p className="text-[10px] font-bold">AwsDataCatalog</p>
                    <p className="text-[9px] opacity-50 underline">Default Glue Catalog</p>
                  </div>
                  {connectors.map(c => (
                    <div key={c.id} className="p-2 bg-zinc-50 border border-brand-text/5 flex justify-between items-center">
                      <div>
                        <p className="text-[10px] font-bold">{c.name}</p>
                        <p className="text-[9px] opacity-40 underline">{c.sourceType} Federation</p>
                      </div>
                      <span className="text-[7px] px-1 bg-emerald-100 text-emerald-800 font-bold border border-emerald-300">FEDERATED</span>
                    </div>
                  ))}
                </div>
              </Card>

              <Card secondary className="bg-brand-muted/20 border-dashed">
                <h4 className="font-bold text-[10px] mb-2">SETTINGS</h4>
                <p className="text-[8px] opacity-60 leading-relaxed">
                  QUERY_RESULTS_LOCATION:<br/>
                  <span className="font-mono text-[9px] break-all underline">s3://athena-results-bucket/</span>
                </p>
              </Card>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {connectors.length === 0 ? (
              <div className="col-span-full py-20 text-center border border-dashed border-brand-text/20">
                <p className="text-xs opacity-40 font-mono italic">NO_FEDERATED_CONNECTORS_SETUP</p>
              </div>
            ) : (
              connectors.map(c => (
                <Card key={c.id} className="group hover:border-brand-text transition-all bg-white font-mono">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <Cpu size={18} className="text-zinc-500" />
                      <span className="text-[8px] font-bold px-1.5 py-0.5 bg-brand-muted border border-brand-text/10 lowercase">{c.sourceType}</span>
                    </div>
                    <button onClick={() => handleDeleteConnector(c.id, c.name)} className="p-1 hover:text-rose-500"><Trash2 size={14} /></button>
                  </div>
                  <h4 className="font-bold text-xs truncate leading-tight">{c.name}</h4>
                  <p className="text-[9px] opacity-50 truncate lowercase leading-relaxed mt-1">Lambda Connection: {c.lambdaArn}</p>
                  <div className="mt-4 pt-2 border-t border-brand-text/5 flex justify-between items-center text-[9px] font-bold">
                    <span className="text-emerald-700">● catalog initialized</span>
                    <span className="text-[8px] bg-emerald-50 text-emerald-800 border-emerald-300 border px-1.5 py-0.5">ACTIVE</span>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AthenaView;
