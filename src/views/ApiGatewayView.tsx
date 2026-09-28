import { useState, useEffect, useCallback } from 'react';
import { GetRestApisCommand, CreateRestApiCommand, DeleteRestApiCommand } from '@aws-sdk/client-api-gateway';
import { GetApisCommand, CreateApiCommand, DeleteApiCommand } from '@aws-sdk/client-apigatewayv2';
import type { RestApi } from '@aws-sdk/client-api-gateway';
import type { Api } from '@aws-sdk/client-apigatewayv2';
import { useAws } from '../contexts/AwsContext';
import { Globe, CirclePlus, Trash2, Cpu, Key, FileText } from 'lucide-react';
import { PageHeader, Card, Button, Input, Skeleton, Modal, Select } from '../components/ui-elements';
import { format } from 'date-fns';

const ApiGatewayView = () => {
  const { clients, logActivity } = useAws();
  const [restApis, setRestApis] = useState<RestApi[]>([]);
  const [httpApis, setHttpApis] = useState<Api[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isCreationModalOpen, setIsCreationModalOpen] = useState(false);
  const [newApiName, setNewApiName] = useState('');
  const [newApiType, setNewApiType] = useState('REST'); // REST, HTTP, WEBSOCKET
  const [isCreating, setIsCreating] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const restResponse = await clients.apigateway.send(new GetRestApisCommand({}));
      const httpResponse = await clients.apigatewayv2.send(new GetApisCommand({}));

      setRestApis(restResponse.items || []);
      setHttpApis(httpResponse.Items || []);
      logActivity('APIGateway', 'GetApis', 'success');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      logActivity('APIGateway', 'GetApis failed', 'error', message);
    } finally {
      setLoading(false);
    }
  }, [clients.apigateway, clients.apigatewayv2, logActivity]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreate = async () => {
    if (!newApiName) return;
    setIsCreating(true);
    try {
      if (newApiType === 'REST') {
        await clients.apigateway.send(new CreateRestApiCommand({ name: newApiName }));
        logActivity('APIGateway', `CreateRestApi: ${newApiName}`, 'success');
      } else {
        await clients.apigatewayv2.send(new CreateApiCommand({ Name: newApiName, ProtocolType: newApiType as any }));
        logActivity('APIGatewayV2', `CreateApi (${newApiType}): ${newApiName}`, 'success');
      }
      setNewApiName('');
      setIsCreationModalOpen(false);
      fetchData();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logActivity('APIGateway', `CreateApi failed: ${newApiName}`, 'error', message);
      alert(message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteRest = async (id: string, name: string) => {
    if (!confirm(`Delete REST API ${name}?`)) return;
    try {
      await clients.apigateway.send(new DeleteRestApiCommand({ restApiId: id }));
      logActivity('APIGateway', `DeleteRestApi: ${id}`, 'success');
      fetchData();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logActivity('APIGateway', `DeleteRestApi failed: ${id}`, 'error', message);
      alert(message);
    }
  };

  const handleDeleteHttp = async (id: string, name: string) => {
    if (!confirm(`Delete ${name}?`)) return;
    try {
      await clients.apigatewayv2.send(new DeleteApiCommand({ ApiId: id }));
      logActivity('APIGatewayV2', `DeleteApi: ${id}`, 'success');
      fetchData();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logActivity('APIGatewayV2', `DeleteApi failed: ${id}`, 'error', message);
      alert(message);
    }
  };

  const allApis = [
    ...restApis.map(api => ({
      id: api.id,
      name: api.name,
      protocol: 'REST',
      description: api.description || 'No description',
      createdDate: api.createdDate,
      endpointConfiguration: api.endpointConfiguration?.types?.join(', ') || 'EDGE'
    })),
    ...httpApis.map(api => ({
      id: api.ApiId,
      name: api.Name,
      protocol: api.ProtocolType,
      description: api.Description || 'No description',
      createdDate: api.CreatedDate,
      endpointConfiguration: api.ApiEndpoint ? 'REGIONAL' : 'NONE'
    }))
  ];

  return (
    <div className="flex flex-col h-full uppercase">
      <PageHeader
        title="API Gateway"
        icon={<Globe size={18} />}
        onRefresh={fetchData}
        isRefreshing={loading}
        actions={
          <Button onClick={() => setIsCreationModalOpen(true)} icon={<CirclePlus size={14} />}>
            Create API
          </Button>
        }
      />

      <Modal
        isOpen={isCreationModalOpen}
        onClose={() => setIsCreationModalOpen(false)}
        title="Create API"
      >
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60">API Name</label>
            <Input
              value={newApiName}
              onChange={e => setNewApiName(e.target.value)}
              placeholder="my-serverless-api"
              autoFocus
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase opacity-60">Protocol Type</label>
            <Select value={newApiType} onChange={e => setNewApiType(e.target.value)}>
              <option value="REST">REST API (v1)</option>
              <option value="HTTP">HTTP API (v2)</option>
              <option value="WEBSOCKET">WebSocket API (v2)</option>
            </Select>
          </div>
          <div className="pt-4 flex gap-3">
             <Button variant="ghost" className="flex-1" onClick={() => setIsCreationModalOpen(false)}>Cancel</Button>
             <Button className="flex-1" onClick={handleCreate} disabled={!newApiName || isCreating}>
               {isCreating ? 'Creating...' : 'Create API'}
             </Button>
          </div>
        </div>
      </Modal>

      <div className="p-6 flex-1 overflow-auto bg-brand-bg space-y-6">
        {error && (
          <Card className="text-rose-600 font-mono text-[10px] bg-rose-50 border-rose-600">
            {error}
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            [1, 2, 3].map(i => <Skeleton key={i} className="h-32" />)
          ) : allApis.length === 0 ? (
            <div className="col-span-full py-20 text-center border border-dashed border-brand-text/20">
               <p className="text-xs opacity-40 font-mono italic">NO_APIS_FOUND</p>
            </div>
          ) : (
            allApis.map(api => (
              <Card key={api.id} className="hover:border-brand-text transition-all bg-white flex flex-col justify-between p-4 group">
                <div>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-brand-muted border border-brand-text/30 group-hover:border-brand-text transition-colors">
                        <Globe size={14} className="text-brand-text" />
                      </div>
                      <h4 className="font-bold text-xs truncate max-w-[150px]">{api.name}</h4>
                    </div>
                    <span className="text-[9px] font-mono border border-brand-text px-1.5 py-0.5 bg-brand-muted font-bold">
                      {api.protocol}
                    </span>
                  </div>

                  <div className="space-y-1.5 mt-3">
                    <div className="flex items-center gap-2 text-[10px] font-mono opacity-60">
                      <Key size={10} />
                      <span className="truncate">{api.id}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-mono opacity-60">
                      <FileText size={10} />
                      <span className="truncate normal-case">{api.description}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-mono opacity-60">
                      <Cpu size={10} />
                      <span>{api.endpointConfiguration}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-brand-text/10 flex items-center justify-between">
                  <span className="text-[9px] font-mono opacity-40">
                    {api.createdDate ? format(new Date(api.createdDate), 'MMM d, yyyy') : 'N/A'}
                  </span>
                  <button
                    onClick={() => api.protocol === 'REST' ? handleDeleteRest(api.id!, api.name!) : handleDeleteHttp(api.id!, api.name!)}
                    className="text-rose-500 hover:text-rose-600 transition-colors p-1"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default ApiGatewayView;
