import { useState, useEffect } from 'react';
import { Server, AlertCircle, Link as LinkIcon, Box } from 'lucide-react';
import { useAws } from '../contexts/AwsContext';
import { PageHeader, Card, Skeleton } from '../components/ui-elements';
import { GetRestApisCommand, GetResourcesCommand, RestApi, Resource } from '@aws-sdk/client-api-gateway';

export default function APIGatewayView() {
  const { clients, logActivity, isHealthy } = useAws();
  const [apis, setApis] = useState<RestApi[]>([]);
  const [selectedApi, setSelectedApi] = useState<RestApi | null>(null);
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingResources, setLoadingResources] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resourcesError, setResourcesError] = useState<string | null>(null);

  const fetchApis = async () => {
    if (!isHealthy) return;
    setLoading(true);
    setError(null);
    try {
      const response = await clients.apigateway.send(new GetRestApisCommand({}));
      setApis(response.items || []);
      logActivity('APIGateway', 'GetRestApis', 'success');
    } catch (err) {
      console.error(err);
      setError('Failed to fetch REST APIs');
      logActivity('APIGateway', 'GetRestApis', 'error', String(err));
    } finally {
      setLoading(false);
    }
  };

  const fetchResources = async (apiId: string) => {
    setLoadingResources(true);
    setResourcesError(null);
    try {
      const response = await clients.apigateway.send(new GetResourcesCommand({ restApiId: apiId }));
      setResources(response.items || []);
      logActivity('APIGateway', 'GetResources', 'success', apiId);
    } catch (err) {
      console.error(err);
      setResourcesError('Failed to fetch API resources');
      logActivity('APIGateway', 'GetResources', 'error', String(err));
    } finally {
      setLoadingResources(false);
    }
  };

  useEffect(() => {
    fetchApis();
  }, [isHealthy]);

  useEffect(() => {
    if (selectedApi && selectedApi.id) {
      fetchResources(selectedApi.id);
    } else {
      setResources([]);
    }
  }, [selectedApi]);

  const handleRefresh = () => {
    fetchApis();
    if (selectedApi && selectedApi.id) {
      fetchResources(selectedApi.id);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-brand-muted/20">
      <div className="p-8 max-w-7xl mx-auto space-y-6">
        <PageHeader
          title="API Gateway Studio"
          subtitle="Local REST APIs routing and endpoints."
          icon={<Server size={24} />}
          onRefresh={handleRefresh}
          isRefreshing={loading}
        />

        {error && (
          <div className="p-4 bg-rose-50 text-rose-600 border border-rose-200 rounded-sm text-xs font-mono flex items-center">
            <AlertCircle size={14} className="mr-2" />
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* APIs List */}
          <Card className="lg:col-span-1 p-0 flex flex-col h-[600px]">
            <div className="px-4 py-3 border-b border-brand-text/10 bg-brand-muted/30 flex justify-between items-center">
              <span className="text-xs font-bold uppercase tracking-wider text-brand-text">REST APIs</span>
              <span className="text-[10px] font-mono text-neutral-500 bg-white px-2 py-0.5 border border-brand-text/10 rounded-full">
                {apis.length}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="p-3">
                    <Skeleton className="h-4 w-3/4 mb-2" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                ))
              ) : apis.length === 0 ? (
                <div className="p-8 text-center text-neutral-400 text-xs font-mono">
                  NO_APIS_FOUND
                </div>
              ) : (
                apis.map((api) => (
                  <div
                    key={api.id}
                    onClick={() => setSelectedApi(api)}
                    className={`p-3 cursor-pointer border rounded-sm transition-all ${
                      selectedApi?.id === api.id
                        ? 'border-brand-text bg-brand-muted/10'
                        : 'border-transparent hover:border-brand-text/20 hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Server size={14} className={selectedApi?.id === api.id ? 'text-brand-text' : 'text-neutral-400'} />
                      <span className="text-sm font-medium text-brand-text truncate">{api.name}</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[10px] font-mono opacity-60">
                      <span>{api.id}</span>
                      <span>{api.endpointConfiguration?.types?.join(', ')}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Resources Panel */}
          <Card className="lg:col-span-2 p-0 flex flex-col h-[600px]">
            <div className="px-4 py-3 border-b border-brand-text/10 bg-brand-muted/30">
              <span className="text-xs font-bold uppercase tracking-wider text-brand-text">
                {selectedApi ? `Resources: ${selectedApi.name}` : 'Resource Hierarchy'}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto bg-white/50">
              {!selectedApi ? (
                <div className="h-full flex flex-col items-center justify-center text-neutral-400 p-8">
                  <Box size={32} className="opacity-20 mb-4" />
                  <span className="text-xs font-mono uppercase tracking-widest opacity-50">Select an API</span>
                </div>
              ) : loadingResources ? (
                <div className="p-6 space-y-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : resourcesError ? (
                <div className="p-8 text-center text-rose-500 text-xs font-mono flex flex-col items-center">
                  <AlertCircle size={24} className="mb-2 opacity-50" />
                  {resourcesError}
                </div>
              ) : resources.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-neutral-400 p-8">
                  <span className="text-xs font-mono">NO_RESOURCES_DEFINED</span>
                </div>
              ) : (
                <div className="p-6">
                  <div className="bg-white border border-brand-text/10 rounded-sm">
                    {resources.map((resource, i) => (
                      <div
                        key={resource.id}
                        className={`p-4 flex items-start gap-4 ${
                          i !== resources.length - 1 ? 'border-b border-brand-text/5' : ''
                        }`}
                      >
                        <div className="pt-1">
                          <LinkIcon size={14} className="text-neutral-400" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-mono font-bold text-brand-text">
                              {resource.path}
                            </span>
                            <span className="text-[10px] font-mono text-neutral-400 bg-neutral-100 px-1.5 py-0.5 rounded-sm">
                              {resource.id}
                            </span>
                          </div>

                          {resource.resourceMethods && (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {Object.keys(resource.resourceMethods).map(method => (
                                <span
                                  key={method}
                                  className={`text-[9px] font-mono font-bold px-2 py-0.5 border rounded-sm ${
                                    method === 'GET' ? 'border-blue-200 bg-blue-50 text-blue-700' :
                                    method === 'POST' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' :
                                    method === 'PUT' ? 'border-amber-200 bg-amber-50 text-amber-700' :
                                    method === 'DELETE' ? 'border-rose-200 bg-rose-50 text-rose-700' :
                                    'border-neutral-200 bg-neutral-50 text-neutral-700'
                                  }`}
                                >
                                  {method}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
