import { useState, useEffect } from 'react';
import { Network, Layers, Hash } from 'lucide-react';
import { useAws } from '../contexts/AwsContext';
import { PageHeader, Card, Skeleton } from '../components/ui-elements';
import { GetRestApisCommand, GetResourcesCommand, RestApi, Resource } from '@aws-sdk/client-api-gateway';

interface ApiWithResources extends RestApi {
  resources?: Resource[];
  isLoadingResources?: boolean;
}

export default function APIGatewayView() {
  const { clients, logActivity } = useAws();
  const [apis, setApis] = useState<ApiWithResources[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedApi, setExpandedApi] = useState<string | null>(null);

  const fetchApis = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await clients.apigateway.send(new GetRestApisCommand({}));
      setApis(data.items || []);
      logActivity('APIGateway', 'GetRestApis', 'success');
    } catch (err: any) {
      console.error('Error fetching REST APIs:', err);
      setError(err.message || 'Failed to fetch REST APIs');
      logActivity('APIGateway', 'GetRestApis', 'error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchResources = async (restApiId: string) => {
    try {
      setApis(current =>
        current.map(api => api.id === restApiId ? { ...api, isLoadingResources: true } : api)
      );

      const data = await clients.apigateway.send(new GetResourcesCommand({ restApiId }));

      setApis(current =>
        current.map(api =>
          api.id === restApiId
            ? { ...api, resources: data.items || [], isLoadingResources: false }
            : api
        )
      );
      logActivity('APIGateway', 'GetResources', 'success', `API: ${restApiId}`);
    } catch (err: any) {
      console.error(`Error fetching resources for API ${restApiId}:`, err);
      setApis(current =>
        current.map(api => api.id === restApiId ? { ...api, isLoadingResources: false } : api)
      );
      logActivity('APIGateway', 'GetResources', 'error', err.message);
    }
  };

  useEffect(() => {
    fetchApis();
  }, [clients.apigateway]);

  const toggleApi = (apiId: string) => {
    if (expandedApi === apiId) {
      setExpandedApi(null);
    } else {
      setExpandedApi(apiId);
      const api = apis.find(a => a.id === apiId);
      if (api && !api.resources) {
        fetchResources(apiId);
      }
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <PageHeader
        title="API Gateway REST APIs"
        icon={<Network />}
        onRefresh={fetchApis}
        isRefreshing={loading}
      />

      {error && (
        <Card className="bg-rose-50 border-rose-200 p-4 text-sm text-rose-600 font-mono">
          {error}
        </Card>
      )}

      {loading && apis.length === 0 ? (
        <div className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : apis.length === 0 ? (
        <Card className="p-12 text-center text-neutral-500 border-dashed">
          <Network size={32} className="mx-auto mb-4 opacity-20" />
          <p className="text-sm font-mono">NO_REST_APIS_FOUND</p>
          <p className="text-xs opacity-60 mt-2">Create an API via AWS CLI or Terraform to see it here.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {apis.map((api) => (
            <Card key={api.id} className="overflow-hidden">
              <div
                className="p-4 bg-white hover:bg-neutral-50 cursor-pointer flex items-center justify-between transition-colors border-b border-transparent data-[expanded=true]:border-neutral-100"
                data-expanded={expandedApi === api.id}
                onClick={() => toggleApi(api.id!)}
              >
                <div className="flex items-center gap-4">
                  <div className="bg-brand-muted/20 p-2 rounded-md">
                    <Layers size={18} className="text-brand-text" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm">{api.name}</h3>
                    <div className="flex items-center gap-3 mt-1 text-[10px] font-mono text-neutral-500">
                      <span className="flex items-center gap-1"><Hash size={10} />{api.id}</span>
                      <span>Created: {api.createdDate ? new Date(api.createdDate).toLocaleDateString() : 'Unknown'}</span>
                    </div>
                  </div>
                </div>
                <div className="text-[10px] font-bold uppercase tracking-wider bg-neutral-100 px-2 py-1 rounded text-neutral-500">
                  {api.endpointConfiguration?.types?.join(', ') || 'EDGE'}
                </div>
              </div>

              {expandedApi === api.id && (
                <div className="bg-neutral-50/50 p-4 border-t border-neutral-100">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 mb-4 px-2">Resources & Methods</h4>

                  {api.isLoadingResources ? (
                    <div className="space-y-2 px-2">
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  ) : !api.resources || api.resources.length === 0 ? (
                    <div className="text-xs text-neutral-400 italic px-2">No resources found for this API.</div>
                  ) : (
                    <div className="space-y-2 px-2">
                      {api.resources.sort((a, b) => (a.path || '').localeCompare(b.path || '')).map(resource => (
                        <div key={resource.id} className="flex items-start bg-white border border-neutral-200 rounded p-3 gap-4">
                          <div className="flex-1 font-mono text-sm font-bold text-brand-text truncate">
                            {resource.path}
                          </div>
                          <div className="flex flex-wrap gap-2 justify-end">
                            {resource.resourceMethods ? (
                              Object.keys(resource.resourceMethods).map(method => (
                                <span
                                  key={method}
                                  className={`text-[9px] font-bold px-2 py-0.5 rounded border
                                    ${method === 'GET' ? 'bg-blue-50 border-blue-200 text-blue-700' :
                                      method === 'POST' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
                                      method === 'DELETE' ? 'bg-rose-50 border-rose-200 text-rose-700' :
                                      method === 'PUT' ? 'bg-amber-50 border-amber-200 text-amber-700' :
                                      'bg-neutral-100 border-neutral-200 text-neutral-700'}`}
                                >
                                  {method}
                                </span>
                              ))
                            ) : (
                              <span className="text-[10px] text-neutral-400 italic">No methods</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
