import { useState, useEffect, useCallback } from 'react';
import { GetRestApisCommand, GetResourcesCommand, RestApi, Resource } from '@aws-sdk/client-api-gateway';
import { useAws } from '../contexts/AwsContext';
import { PageHeader, Card, Button, Input, Skeleton } from '../components/ui-elements';
import { Globe, Search, RefreshCw, Server, FileText, Activity } from 'lucide-react';
import { format } from 'date-fns';

export default function ApiGatewayView() {
  const { clients, logActivity } = useAws();
  const [apis, setApis] = useState<RestApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // Resources state
  const [selectedApiId, setSelectedApiId] = useState<string | null>(null);
  const [resources, setResources] = useState<Resource[]>([]);
  const [resourcesLoading, setResourcesLoading] = useState(false);

  const fetchApis = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await clients.apigateway.send(new GetRestApisCommand({}));
      setApis(response.items || []);
      logActivity('API Gateway', 'GetRestApis', 'success', `Fetched ${response.items?.length || 0} APIs`);
    } catch (err: any) {
      console.error('Error fetching APIs:', err);
      setError(err.message || 'Failed to fetch APIs');
      logActivity('API Gateway', 'GetRestApis', 'error', err.message);
    } finally {
      setLoading(false);
    }
  }, [clients.apigateway, logActivity]);

  const fetchResources = useCallback(async (apiId: string) => {
    setResourcesLoading(true);
    try {
      const response = await clients.apigateway.send(new GetResourcesCommand({ restApiId: apiId }));
      setResources(response.items || []);
      logActivity('API Gateway', 'GetResources', 'success', `Fetched ${response.items?.length || 0} resources`);
    } catch (err: any) {
      console.error('Error fetching resources:', err);
      logActivity('API Gateway', 'GetResources', 'error', err.message);
      setResources([]);
    } finally {
      setResourcesLoading(false);
    }
  }, [clients.apigateway, logActivity]);

  useEffect(() => {
    fetchApis();
  }, [fetchApis]);

  useEffect(() => {
    if (selectedApiId) {
      fetchResources(selectedApiId);
    } else {
      setResources([]);
    }
  }, [selectedApiId, fetchResources]);

  const filteredApis = apis.filter(api =>
    api.name?.toLowerCase().includes(search.toLowerCase()) ||
    api.id?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="API Gateway"
        subtitle="Create, publish, maintain, monitor, and secure APIs"
        icon={<Globe />}
        actions={
          <Button onClick={fetchApis} variant="secondary" size="sm" className="gap-2">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: API List */}
        <div className="lg:col-span-1 space-y-4">
          <Card className="p-4 flex flex-col h-[calc(100vh-14rem)]">
            <div className="mb-4 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text opacity-30" size={14} />
              <Input
                placeholder="Search APIs..."
                className="pl-9 text-xs"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
              {loading ? (
                Array(3).fill(0).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))
              ) : error ? (
                <div className="p-4 text-center text-xs text-rose-500 bg-rose-50 border border-rose-100 rounded-md">
                  {error}
                </div>
              ) : filteredApis.length === 0 ? (
                <div className="text-center py-8 opacity-50">
                  <Globe size={24} className="mx-auto mb-2 opacity-50" />
                  <p className="text-xs">No APIs found</p>
                </div>
              ) : (
                filteredApis.map(api => (
                  <div
                    key={api.id}
                    onClick={() => setSelectedApiId(api.id || null)}
                    className={`p-3 rounded-md border text-left cursor-pointer transition-colors ${
                      selectedApiId === api.id
                        ? 'border-brand-text bg-brand-muted/20'
                        : 'border-brand-text/10 hover:border-brand-text/30 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs truncate">{api.name}</span>
                      <span className="text-[10px] font-mono opacity-50 bg-brand-muted px-1.5 py-0.5 rounded">{api.id}</span>
                    </div>
                    {api.description && (
                      <p className="text-[10px] opacity-60 line-clamp-1 mb-2">{api.description}</p>
                    )}
                    <div className="flex items-center gap-3 text-[10px] font-mono opacity-50 mt-2">
                      <span className="flex items-center gap-1">
                        <Activity size={10} />
                        {api.createdDate ? format(new Date(api.createdDate), 'MMM d, yyyy') : 'Unknown'}
                      </span>
                      {api.endpointConfiguration?.types && (
                        <span className="flex items-center gap-1">
                          <Server size={10} />
                          {api.endpointConfiguration.types.join(', ')}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* Right Column: Resources View */}
        <div className="lg:col-span-2">
          {selectedApiId ? (
            <Card className="p-0 overflow-hidden flex flex-col h-[calc(100vh-14rem)]">
              <div className="bg-brand-muted/20 border-b border-brand-text/10 p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Server size={16} className="text-brand-text" />
                  <h3 className="font-bold text-sm">
                    {apis.find(a => a.id === selectedApiId)?.name} Resources
                  </h3>
                </div>
                <p className="text-xs opacity-60">API ID: {selectedApiId}</p>
              </div>

              <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-neutral-50/50">
                {resourcesLoading ? (
                  <div className="space-y-3">
                    {Array(4).fill(0).map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : resources.length === 0 ? (
                  <div className="text-center py-12 opacity-50">
                    <FileText size={32} className="mx-auto mb-3 opacity-30" />
                    <p className="text-sm font-mono">No resources configured</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {resources.map(resource => (
                      <div key={resource.id} className="bg-white border border-brand-text/10 rounded-md p-4 shadow-sm">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-mono text-sm font-bold text-brand-text">{resource.path || '/'}</span>
                            </div>
                            <p className="text-[10px] font-mono opacity-40">Resource ID: {resource.id}</p>
                          </div>
                          <div className="flex gap-2">
                            {resource.resourceMethods ? (
                              Object.keys(resource.resourceMethods).map(method => (
                                <span
                                  key={method}
                                  className={`text-[9px] font-mono font-bold px-2 py-1 rounded-sm uppercase tracking-wider
                                    ${method === 'GET' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                                      method === 'POST' ? 'bg-green-50 text-green-700 border border-green-200' :
                                      method === 'PUT' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                                      method === 'DELETE' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                                      'bg-neutral-100 text-neutral-600 border border-neutral-200'
                                    }
                                  `}
                                >
                                  {method}
                                </span>
                              ))
                            ) : (
                              <span className="text-[10px] font-mono opacity-40 italic">No methods</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          ) : (
            <Card className="p-8 flex flex-col items-center justify-center h-[calc(100vh-14rem)] border-dashed">
              <Globe size={48} className="text-brand-text opacity-20 mb-4" />
              <h3 className="font-bold text-brand-text mb-2">No API Selected</h3>
              <p className="text-xs opacity-60 text-center max-w-sm">
                Select an API from the list to view its resources, methods, and configurations.
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
