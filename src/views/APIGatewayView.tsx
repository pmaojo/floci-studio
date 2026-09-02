import React, { useState, useEffect, useCallback } from 'react';
import { Network, Search, CirclePlus, Trash2, Cpu, Globe, Server, Activity } from 'lucide-react';
import { useAws } from '../contexts/AwsContext';
import { PageHeader, Card, Skeleton, Button, Input, Modal } from '../components/ui-elements';
import { GetRestApisCommand, DeleteRestApiCommand, CreateRestApiCommand } from '@aws-sdk/client-api-gateway';
import { GetApisCommand, DeleteApiCommand, CreateApiCommand } from '@aws-sdk/client-apigatewayv2';

interface RestApiItem {
  id: string;
  name: string;
  createdDate?: Date;
  endpointConfiguration?: { types?: string[] };
  type: 'REST';
}

interface HttpApiItem {
  id: string;
  name: string;
  createdDate?: Date;
  protocolType?: string;
  type: 'HTTP' | 'WEBSOCKET';
}

type AnyApi = RestApiItem | HttpApiItem;

const APIGatewayView = () => {
  const { clients, logActivity } = useAws();
  const [apis, setApis] = useState<AnyApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [isCreationModalOpen, setIsCreationModalOpen] = useState(false);
  const [newApiName, setNewApiName] = useState('');
  const [newApiType, setNewApiType] = useState<'REST' | 'HTTP' | 'WEBSOCKET'>('REST');
  const [isCreating, setIsCreating] = useState(false);

  const fetchApis = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const restCommand = new GetRestApisCommand({});
      const restRes = await clients.apigateway.send(restCommand);
      const restItems: RestApiItem[] = (restRes.items || []).map(api => ({
        id: api.id!,
        name: api.name || 'Unnamed API',
        createdDate: api.createdDate,
        endpointConfiguration: api.endpointConfiguration,
        type: 'REST',
      }));

      const v2Command = new GetApisCommand({});
      const v2Res = await clients.apigatewayv2.send(v2Command);
      const v2Items: HttpApiItem[] = (v2Res.Items || []).map(api => ({
        id: api.ApiId!,
        name: api.Name || 'Unnamed API',
        createdDate: api.CreatedDate ? new Date(api.CreatedDate) : undefined,
        protocolType: api.ProtocolType,
        type: api.ProtocolType === 'WEBSOCKET' ? 'WEBSOCKET' : 'HTTP',
      }));

      setApis([...restItems, ...v2Items].sort((a, b) => {
        const da = a.createdDate?.getTime() || 0;
        const db = b.createdDate?.getTime() || 0;
        return db - da;
      }));

      logActivity('APIGateway', 'GetApis', 'success');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to fetch APIs');
      logActivity('APIGateway', 'GetApis', 'error', err.message);
    } finally {
      setLoading(false);
    }
  }, [clients.apigateway, clients.apigatewayv2, logActivity]);

  useEffect(() => {
    fetchApis();
  }, [fetchApis]);

  const handleDelete = async (api: AnyApi) => {
    if (!window.confirm(`Are you sure you want to delete ${api.name}?`)) return;
    try {
      if (api.type === 'REST') {
        await clients.apigateway.send(new DeleteRestApiCommand({ restApiId: api.id }));
      } else {
        await clients.apigatewayv2.send(new DeleteApiCommand({ ApiId: api.id }));
      }
      logActivity('APIGateway', 'DeleteApi', 'success', api.name);
      fetchApis();
    } catch (err: any) {
      logActivity('APIGateway', 'DeleteApi', 'error', err.message);
      alert(`Failed to delete: ${err.message}`);
    }
  };

  const handleCreate = async () => {
    if (!newApiName.trim()) return;
    setIsCreating(true);
    try {
      if (newApiType === 'REST') {
        await clients.apigateway.send(new CreateRestApiCommand({ name: newApiName }));
      } else {
        await clients.apigatewayv2.send(new CreateApiCommand({ Name: newApiName, ProtocolType: newApiType }));
      }
      logActivity('APIGateway', 'CreateApi', 'success', newApiName);
      setNewApiName('');
      setIsCreationModalOpen(false);
      fetchApis();
    } catch (err: any) {
      logActivity('APIGateway', 'CreateApi', 'error', err.message);
      alert(`Creation failed: ${err.message}`);
    } finally {
      setIsCreating(false);
    }
  };

  const filteredApis = apis.filter(api =>
    api.name.toLowerCase().includes(search.toLowerCase()) ||
    api.id.toLowerCase().includes(search.toLowerCase()) ||
    api.type.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full uppercase">
      <PageHeader
        title="API Gateway Explorer"
        icon={<Network size={18} />}
        onRefresh={fetchApis}
        isRefreshing={loading}
        actions={
          <Button onClick={() => setIsCreationModalOpen(true)} icon={<CirclePlus size={14} />}>
            Create API
          </Button>
        }
      />

      <Modal isOpen={isCreationModalOpen} onClose={() => setIsCreationModalOpen(false)} title="Create New API">
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60">API Name</label>
            <Input
              value={newApiName}
              onChange={e => setNewApiName(e.target.value)}
              placeholder="my-cool-api"
              autoFocus
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60">API Type</label>
            <div className="flex gap-2">
              {(['REST', 'HTTP', 'WEBSOCKET'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setNewApiType(t)}
                  className={`flex-1 py-2 px-3 border text-[10px] font-bold tracking-wider transition-colors ${
                    newApiType === t
                      ? 'border-brand-text bg-brand-text text-brand-bg'
                      : 'border-brand-text/30 text-brand-text hover:bg-brand-muted/20'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            <p className="text-[9px] opacity-50 font-mono pt-1 normal-case">
              {newApiType === 'REST' && 'Classic API Gateway. Supports full feature set, validation, and transformations.'}
              {newApiType === 'HTTP' && 'API Gateway v2. Fast, lightweight, cost-effective for modern proxy workloads.'}
              {newApiType === 'WEBSOCKET' && 'API Gateway v2. Persistent connections and bi-directional real-time communication.'}
            </p>
          </div>

          <div className="pt-4 flex gap-3">
            <Button variant="ghost" className="flex-1" onClick={() => setIsCreationModalOpen(false)}>Cancel</Button>
            <Button className="flex-1" onClick={handleCreate} disabled={!newApiName || isCreating}>
              {isCreating ? 'Creating...' : 'Create API'}
            </Button>
          </div>
        </div>
      </Modal>

      <div className="p-6 space-y-6 flex-1 overflow-auto bg-brand-bg">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text opacity-30" size={14} />
          <Input placeholder="Filter APIs..." className="pl-10 font-mono text-[11px]" value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {error && (
          <div className="p-4 border border-rose-500 bg-rose-500/10 text-rose-500 text-[10px] font-mono">
            Error loading APIs: {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            [1, 2, 3].map(i => <Skeleton key={i} className="h-32" />)
          ) : filteredApis.length === 0 ? (
            <div className="col-span-full text-brand-text opacity-30 text-center py-12 italic text-[10px] uppercase font-bold tracking-widest bg-brand-muted/30 border-dashed border">
              No APIs found in current region.
            </div>
          ) : (
            filteredApis.map((api) => (
              <Card key={api.id} className="flex flex-col group transition-colors hover:border-brand-text">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 flex items-center justify-center bg-brand-muted/50 border border-brand-text/20 group-hover:border-brand-text/50">
                      {api.type === 'WEBSOCKET' ? <Activity size={14} /> : api.type === 'HTTP' ? <Globe size={14} /> : <Server size={14} />}
                    </div>
                    <div>
                      <h3 className="text-xs font-bold font-mono tracking-tight">{api.name}</h3>
                      <p className="text-[9px] opacity-40 font-mono lowercase">{api.id}</p>
                    </div>
                  </div>
                  <button onClick={() => handleDelete(api)} className="opacity-0 group-hover:opacity-100 text-brand-text/40 hover:text-rose-500 transition-all p-1">
                    <Trash2 size={12} />
                  </button>
                </div>

                <div className="mt-auto pt-3 border-t border-brand-text/10 flex items-center justify-between">
                  <span className={`text-[8px] font-bold border px-1.5 py-0.5 tracking-wider ${
                    api.type === 'REST' ? 'border-amber-600 bg-amber-50 text-amber-800' :
                    api.type === 'HTTP' ? 'border-emerald-600 bg-emerald-50 text-emerald-800' :
                    'border-blue-600 bg-blue-50 text-blue-800'
                  }`}>
                    {api.type} API
                  </span>
                  {api.createdDate && (
                    <span className="text-[8px] opacity-40 font-mono normal-case">
                      {api.createdDate.toLocaleDateString()}
                    </span>
                  )}
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default APIGatewayView;
