import React, { useState, useEffect } from 'react';
import { useAws } from '../contexts/AwsContext';
import { RefreshCw, Plus, Server, Trash2 } from 'lucide-react';
import { PageHeader } from '../components/ui-elements';
import { Card } from '../components/ui-elements';
import { GetRestApisCommand, CreateRestApiCommand, DeleteRestApiCommand } from '@aws-sdk/client-api-gateway';

interface RestApi {
  id?: string;
  name?: string;
  description?: string;
  createdDate?: Date;
  endpointConfiguration?: {
    types?: string[];
  };
}

export default function ApiGatewayView() {
  const { clients, config, logActivity } = useAws();
  const [apis, setApis] = useState<RestApi[]>([]);
  const [loading, setLoading] = useState(true);

  // Create API state
  const [showCreate, setShowCreate] = useState(false);
  const [newApiName, setNewApiName] = useState('');
  const [newApiDesc, setNewApiDesc] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const fetchApis = async () => {
    try {
      setLoading(true);
      const data = await clients.apigateway.send(new GetRestApisCommand({}));
      setApis(data.items || []);
    } catch (err) {
      console.error('Failed to fetch APIs', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (clients.apigateway) {
      fetchApis();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clients.apigateway, config.region]);

  const handleCreateApi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newApiName.trim()) return;

    try {
      setIsCreating(true);
      await clients.apigateway.send(new CreateRestApiCommand({
        name: newApiName,
        description: newApiDesc
      }));
      logActivity('API Gateway', `CreateRestApi: ${newApiName}`, 'success');
      setNewApiName('');
      setNewApiDesc('');
      setShowCreate(false);
      fetchApis();
    } catch (err) {
      logActivity('API Gateway', `CreateRestApi failed: ${newApiName}`, 'error', err instanceof Error ? err.message : String(err));
      alert(`Error creating API: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteApi = async (apiId: string, apiName: string) => {
    if (!confirm(`Are you sure you want to delete API ${apiName}?`)) return;

    try {
      await clients.apigateway.send(new DeleteRestApiCommand({
        restApiId: apiId
      }));
      logActivity('API Gateway', `DeleteRestApi: ${apiName}`, 'success');
      fetchApis();
    } catch (err) {
      logActivity('API Gateway', `DeleteRestApi failed: ${apiName}`, 'error', err instanceof Error ? err.message : String(err));
      alert(`Error deleting API: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="API Gateway"
        icon={<Server size={24} className="text-brand-text" />}
        actions={
          <div className="flex gap-2">
            <button
              onClick={() => setShowCreate(!showCreate)}
              className="flex items-center gap-2 bg-brand-text text-white px-3 py-1.5 text-xs font-bold rounded-sm hover:bg-brand-text/90 transition-colors"
            >
              <Plus size={14} />
              {showCreate ? 'Cancel' : 'Create API'}
            </button>
            <button
              onClick={fetchApis}
              className="p-1.5 border border-brand-text/20 rounded-sm hover:bg-brand-muted/20 text-brand-text transition-colors"
              title="Refresh APIs"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        }
      />

      {showCreate && (
        <Card className="border-brand-text bg-brand-muted/10">
          <h3 className="text-xs font-bold font-mono text-brand-text mb-4">CREATE NEW REST API</h3>
          <form onSubmit={handleCreateApi} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">API Name</label>
                <input
                  type="text"
                  value={newApiName}
                  onChange={e => setNewApiName(e.target.value)}
                  className="w-full bg-white border border-brand-text/30 px-3 py-2 text-sm focus:outline-none focus:border-brand-text"
                  placeholder="my-serverless-api"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Description (Optional)</label>
                <input
                  type="text"
                  value={newApiDesc}
                  onChange={e => setNewApiDesc(e.target.value)}
                  className="w-full bg-white border border-brand-text/30 px-3 py-2 text-sm focus:outline-none focus:border-brand-text"
                  placeholder="Provides backend endpoints for the frontend"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isCreating}
                className="bg-brand-text text-white px-4 py-2 text-xs font-bold rounded-sm hover:bg-brand-text/90 transition-colors disabled:opacity-50"
              >
                {isCreating ? 'Creating...' : 'Create REST API'}
              </button>
            </div>
          </form>
        </Card>
      )}

      {loading && apis.length === 0 ? (
        <div className="animate-pulse flex space-x-4">
          <div className="flex-1 space-y-4 py-1">
            <div className="h-4 bg-brand-muted/50 rounded w-3/4"></div>
            <div className="space-y-2">
              <div className="h-4 bg-brand-muted/50 rounded"></div>
              <div className="h-4 bg-brand-muted/50 rounded w-5/6"></div>
            </div>
          </div>
        </div>
      ) : apis.length === 0 ? (
        <Card className="text-center py-12 border-dashed">
          <Server size={32} className="mx-auto text-brand-text opacity-30 mb-3" />
          <h3 className="text-sm font-bold text-neutral-700 mb-1">No REST APIs found</h3>
          <p className="text-xs text-neutral-500 mb-4">Create your first API Gateway REST API to get started.</p>
          <button
            onClick={() => setShowCreate(true)}
            className="text-xs font-bold text-brand-text hover:underline"
          >
            Create your first API
          </button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {apis.map((api) => (
            <Card key={api.id} className="flex flex-col">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-sm font-bold text-brand-text">{api.name}</h3>
                  <p className="text-[10px] font-mono text-neutral-500 mt-1">ID: {api.id}</p>
                </div>
                <button
                  onClick={() => handleDeleteApi(api.id!, api.name!)}
                  className="text-neutral-400 hover:text-red-500 transition-colors"
                  title="Delete API"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              {api.description && (
                <p className="text-xs text-neutral-600 mb-4 flex-grow">{api.description}</p>
              )}

              <div className="mt-auto pt-4 border-t border-brand-text/10">
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-neutral-500">Created: {api.createdDate ? new Date(api.createdDate).toLocaleDateString() : 'N/A'}</span>
                  <span className="font-mono bg-brand-muted/30 px-1.5 py-0.5 rounded text-brand-text">
                    {api.endpointConfiguration?.types?.[0] || 'EDGE'}
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
