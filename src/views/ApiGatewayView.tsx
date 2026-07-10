import { useState, useEffect, useCallback } from 'react';
import { GetRestApisCommand, CreateRestApiCommand, DeleteRestApiCommand } from '@aws-sdk/client-api-gateway';
import type { RestApi } from '@aws-sdk/client-api-gateway';
import { useAws } from '../contexts/AwsContext';
import { Globe, CirclePlus, Trash2 } from 'lucide-react';
import { PageHeader, Card, Button, Input, Skeleton, Modal } from '../components/ui-elements';

const ApiGatewayView = () => {
  const { clients, logActivity } = useAws();
  const [apis, setApis] = useState<RestApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreationModalOpen, setIsCreationModalOpen] = useState(false);
  const [apiName, setApiName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await clients.apigateway.send(new GetRestApisCommand({}));
      setApis(response.items || []);
      logActivity('API Gateway', 'GetRestApis', 'success');
    } catch (err) {
      logActivity('API Gateway', 'GetRestApis failed', 'error', err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [clients.apigateway, logActivity]);

  const handleCreate = async () => {
    if (!apiName) return;
    setIsCreating(true);
    try {
      await clients.apigateway.send(new CreateRestApiCommand({
        name: apiName
      }));
      logActivity('API Gateway', 'CreateRestApi', 'success', apiName);
      setIsCreationModalOpen(false);
      setApiName('');
      fetchData();
    } catch (err) {
      logActivity('API Gateway', 'CreateRestApi failed', 'error', err instanceof Error ? err.message : String(err));
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (apiId: string) => {
    if (!confirm('Are you sure you want to delete this API?')) return;
    try {
      await clients.apigateway.send(new DeleteRestApiCommand({
        restApiId: apiId
      }));
      logActivity('API Gateway', 'DeleteRestApi', 'success', apiId);
      fetchData();
    } catch (err) {
      logActivity('API Gateway', 'DeleteRestApi failed', 'error', err instanceof Error ? err.message : String(err));
    }
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="API Gateway"
        icon={<Globe size={20} />}
        actions={
          <Button onClick={() => setIsCreationModalOpen(true)}>
            <CirclePlus size={16} className="mr-2" />
            Create REST API
          </Button>
        }
      />

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : apis.length === 0 ? (
        <Card className="p-12 text-center border-dashed">
          <Globe className="mx-auto h-12 w-12 text-brand-green/20 mb-4" />
          <h3 className="text-lg font-medium text-brand-text mb-2">No REST APIs</h3>
          <p className="text-sm text-neutral-500 mb-6">Create a REST API to get started.</p>
          <Button onClick={() => setIsCreationModalOpen(true)}>
            <CirclePlus size={16} className="mr-2" />
            Create API
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {apis.map((api) => (
            <Card key={api.id} className="flex flex-col">
              <div className="p-4 border-b border-brand-green/10 flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-brand-text break-all">{api.name}</h3>
                  <p className="text-xs text-neutral-500 mt-1">ID: {api.id}</p>
                </div>
                <button
                  onClick={() => api.id && handleDelete(api.id)}
                  className="text-neutral-400 hover:text-rose-500 transition-colors p-1"
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <div className="p-4 bg-brand-green/5 flex-1 text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-neutral-500">Created</span>
                  <span className="font-mono text-xs">{api.createdDate ? new Date(api.createdDate).toLocaleDateString() : '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Endpoint Type</span>
                  <span className="font-mono text-xs">{api.endpointConfiguration?.types?.join(', ') || 'EDGE'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">API Key Source</span>
                  <span className="font-mono text-xs">{api.apiKeySource || 'HEADER'}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        isOpen={isCreationModalOpen}
        onClose={() => !isCreating && setIsCreationModalOpen(false)}
        title="Create REST API"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-brand-text mb-1">
              API Name
            </label>
            <Input
              value={apiName}
              onChange={(e) => setApiName(e.target.value)}
              placeholder="e.g. my-serverless-api"
              disabled={isCreating}
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => setIsCreationModalOpen(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!apiName || isCreating}
            >
              {isCreating ? 'Creating...' : 'Create API'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ApiGatewayView;
