import { useState, useEffect, useCallback } from 'react';
import {
  GetRestApisCommand,
  GetResourcesCommand,
  type RestApi,
  type Resource as ApiResource
} from '@aws-sdk/client-api-gateway';
import { useAws } from '../../contexts/AwsContext';
import { PageHeader, Card, Button, Input, Skeleton } from '../../components/ui-elements';
import { Network, Server, RefreshCw, Layers } from 'lucide-react';

export default function ApiGatewayView() {
  const { clients, logActivity } = useAws();
  const [apis, setApis] = useState<RestApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApi, setSelectedApi] = useState<RestApi | null>(null);
  const [resources, setResources] = useState<ApiResource[]>([]);
  const [loadingResources, setLoadingResources] = useState(false);
  const [search, setSearch] = useState('');

  const fetchApis = useCallback(async () => {
    setLoading(true);
    try {
      const response = await clients.apigateway.send(new GetRestApisCommand({}));
      setApis(response.items || []);
      logActivity('APIGateway', 'GetRestApis', 'success');
    } catch (err: any) {
      logActivity('APIGateway', 'GetRestApis', 'error', err.message);
    } finally {
      setLoading(false);
    }
  }, [clients.apigateway, logActivity]);

  useEffect(() => {
    fetchApis();
  }, [fetchApis]);

  const fetchResources = useCallback(async (apiId: string) => {
    setLoadingResources(true);
    try {
      // Typically API Gateway limits resources, loop/paginate if needed. localstack usually returns all
      const response = await clients.apigateway.send(new GetResourcesCommand({ restApiId: apiId }));
      setResources(response.items || []);
      logActivity('APIGateway', 'GetResources', 'success', `API: ${apiId}`);
    } catch (err: any) {
      logActivity('APIGateway', 'GetResources', 'error', err.message);
    } finally {
      setLoadingResources(false);
    }
  }, [clients.apigateway, logActivity]);

  useEffect(() => {
    if (selectedApi && selectedApi.id) {
      fetchResources(selectedApi.id);
    } else {
      setResources([]);
    }
  }, [selectedApi, fetchResources]);

  const filteredApis = apis.filter(api =>
    api.name?.toLowerCase().includes(search.toLowerCase()) ||
    api.id?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col bg-brand-muted/20 overflow-hidden">
      <PageHeader
        title="API Gateway"
        icon={<Network />}
        onRefresh={fetchApis}
        isRefreshing={loading}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Left sidebar - APIs */}
        <div className="w-80 border-r border-brand-text bg-white flex flex-col h-full shrink-0">
          <div className="p-3 border-b border-brand-text/20">
            <Input
              placeholder="Filter APIs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="font-mono text-[10px]"
            />
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
              </div>
            ) : filteredApis.length === 0 ? (
              <div className="p-8 text-center text-[10px] font-mono text-brand-text/50">
                NO_APIS_FOUND
              </div>
            ) : (
              <div className="divide-y divide-brand-text/10">
                {filteredApis.map(api => (
                  <button
                    key={api.id}
                    onClick={() => setSelectedApi(api)}
                    className={`w-full text-left p-3 hover:bg-brand-muted/30 transition-colors flex items-start gap-3
                      ${selectedApi?.id === api.id ? 'bg-brand-muted/50 border-l-2 border-l-brand-text' : ''}`}
                  >
                    <Server size={14} className="mt-0.5 shrink-0 opacity-50" />
                    <div className="min-w-0">
                      <div className="font-bold text-xs truncate">{api.name}</div>
                      <div className="font-mono text-[9px] opacity-50 truncate mt-1">ID: {api.id}</div>
                      {api.endpointConfiguration?.types && (
                         <div className="font-mono text-[8px] bg-brand-muted px-1 py-0.5 inline-block mt-1">
                           {api.endpointConfiguration.types.join(', ')}
                         </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Main Content - Resources */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-6">
          {selectedApi ? (
            <div className="max-w-4xl space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-lg">{selectedApi.name}</h3>
                  <p className="font-mono text-[10px] opacity-50 mt-1">{selectedApi.description || 'No description'}</p>
                </div>
                <div className="text-right">
                   <div className="font-mono text-[9px] opacity-50">API ID</div>
                   <div className="font-mono text-xs">{selectedApi.id}</div>
                </div>
              </div>

              <Card>
                <div className="flex items-center justify-between p-4 border-b border-brand-text bg-brand-muted">
                  <div className="flex items-center gap-2">
                    <Layers size={14} className="opacity-70" />
                    <h3 className="font-bold text-sm uppercase tracking-wider">Resources Map</h3>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => fetchResources(selectedApi.id!)} disabled={loadingResources}>
                    <RefreshCw size={12} className={loadingResources ? "animate-spin" : ""} />
                  </Button>
                </div>

                <div className="p-0">
                  {loadingResources ? (
                    <div className="p-6 space-y-2">
                      <Skeleton className="h-8 w-full" />
                      <Skeleton className="h-8 w-3/4 ml-4" />
                      <Skeleton className="h-8 w-1/2 ml-8" />
                    </div>
                  ) : resources.length === 0 ? (
                    <div className="p-12 text-center text-xs font-mono opacity-50">
                      NO_RESOURCES_FOUND
                    </div>
                  ) : (
                    <div className="divide-y divide-brand-text/10 font-mono text-xs">
                      {resources.map(res => (
                        <div key={res.id} className="p-4 hover:bg-brand-muted/10 transition-colors">
                          <div className="flex justify-between items-start mb-2">
                            <div className="font-bold text-brand-text break-all flex items-center gap-2">
                               {res.path}
                            </div>
                            <div className="text-[10px] opacity-40 shrink-0">ID: {res.id}</div>
                          </div>

                          {res.resourceMethods && Object.keys(res.resourceMethods).length > 0 ? (
                            <div className="flex flex-wrap gap-2 mt-3">
                              {Object.entries(res.resourceMethods).map(([method, details]) => (
                                <div key={method} className="border border-brand-text/20 p-2 bg-brand-muted/20 min-w-[120px]">
                                  <div className="font-bold text-[10px] text-brand-text border-b border-brand-text/10 pb-1 mb-1">
                                    {method}
                                  </div>
                                  <div className="text-[9px] opacity-70">
                                    Auth: {details.authorizationType || 'NONE'}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-[10px] opacity-40 mt-1 italic">
                              No methods configured
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            </div>
          ) : (
             <div className="h-full flex flex-col items-center justify-center text-brand-text/30">
              <Network size={48} className="mb-4 opacity-20" />
              <p className="font-mono text-xs font-bold tracking-widest">SELECT_API_TO_EXPLORE</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
