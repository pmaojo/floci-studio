import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  GetRestApisCommand,
  GetResourcesCommand,
  GetRestApiCommand,
  GetIntegrationCommand,
  RestApi,
  Resource,
} from '@aws-sdk/client-api-gateway';
import { useAws } from '../contexts/AwsContext';
import { PageHeader, Card, Skeleton, Button } from '../components/ui-elements';
import {
  Globe,
  RefreshCw,
  Server,
  Layers,
  ChevronRight,
  Code,
  Box,
  Link as LinkIcon,
  Zap
} from 'lucide-react';
import { format } from 'date-fns';

const ApiGatewayView = () => {
  const { clients, isHealthy, logActivity } = useAws();
  const [apis, setApis] = useState<RestApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedApi, setSelectedApi] = useState<RestApi | null>(null);
  const [apiDetails, setApiDetails] = useState<any>(null);
  const [resources, setResources] = useState<Resource[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [integrationDetails, setIntegrationDetails] = useState<Record<string, any>>({});

  const loadApis = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await clients.apigateway.send(new GetRestApisCommand({}));
      setApis(response.items || []);
      logActivity('APIGateway', 'GetRestApis', 'success', `Loaded ${response.items?.length || 0} APIs`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      logActivity('APIGateway', 'GetRestApis failed', 'error', msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isHealthy) {
      loadApis();
    }
  }, [isHealthy]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadApiDetails = async (api: RestApi) => {
    setSelectedApi(api);
    setLoadingDetails(true);
    setSelectedResource(null);
    setIntegrationDetails({});
    try {
      const [apiRes, resourcesRes] = await Promise.all([
        clients.apigateway.send(new GetRestApiCommand({ restApiId: api.id })),
        clients.apigateway.send(new GetResourcesCommand({ restApiId: api.id }))
      ]);
      setApiDetails(apiRes);
      setResources(resourcesRes.items || []);
      logActivity('APIGateway', 'GetApiDetails', 'success', `Loaded details for ${api.name}`);
    } catch (err) {
      logActivity('APIGateway', 'GetApiDetails failed', 'error', err instanceof Error ? err.message : String(err));
    } finally {
      setLoadingDetails(false);
    }
  };

  const loadIntegration = async (apiId: string, resourceId: string, httpMethod: string) => {
    const key = `${resourceId}-${httpMethod}`;
    if (integrationDetails[key]) return;
    try {
      const response = await clients.apigateway.send(new GetIntegrationCommand({
        restApiId: apiId,
        resourceId: resourceId,
        httpMethod: httpMethod
      }));
      setIntegrationDetails(prev => ({ ...prev, [key]: response }));
      logActivity('APIGateway', 'GetIntegration', 'success', `Loaded integration for ${httpMethod}`);
    } catch (err) {
      logActivity('APIGateway', 'GetIntegration failed', 'error', err instanceof Error ? err.message : String(err));
    }
  };

  const fmtDate = (d?: Date) => d ? format(new Date(d), 'yyyy-MM-dd HH:mm:ss') : 'N/A';

  const getMethodColor = (method: string) => {
    switch (method.toUpperCase()) {
      case 'GET': return 'text-emerald-600 bg-emerald-50 border-emerald-200';
      case 'POST': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'PUT': return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'DELETE': return 'text-rose-600 bg-rose-50 border-rose-200';
      default: return 'text-neutral-600 bg-neutral-50 border-neutral-200';
    }
  };

  return (
    <div className="flex flex-col h-full uppercase">
      <PageHeader
        title="API Gateway"
        icon={<Globe size={18} />}
        onRefresh={loadApis}
        isRefreshing={loading}
        actions={
          <Button onClick={loadApis} disabled={loading} icon={<RefreshCw size={14} className={loading ? 'animate-spin' : ''} />}>
            Refresh
          </Button>
        }
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Left: API List */}
        <aside className="w-1/3 border-r border-brand-text/20 bg-brand-muted/10 flex flex-col min-w-[250px] max-w-[350px]">
          <div className="p-3 border-b border-brand-text/20 bg-brand-muted/30 flex items-center justify-between">
            <h3 className="text-[10px] font-bold tracking-widest flex items-center gap-2">
              <Server size={12} /> REST APIs
            </h3>
            <span className="text-[9px] font-mono opacity-50">{apis.length} total</span>
          </div>
          <div className="flex-1 overflow-auto p-3">
            {error && (
              <Card className="text-rose-600 font-mono text-[10px] bg-rose-50 border-rose-600 normal-case mb-4">
                {error}
              </Card>
            )}

            <AnimatePresence mode="popLayout">
              {loading ? (
                <motion.div exit={{ opacity: 0 }} className="space-y-2">
                  <Skeleton className="h-14" />
                  <Skeleton className="h-14" />
                  <Skeleton className="h-14" />
                </motion.div>
              ) : apis.length === 0 ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-8">
                  <Card className="bg-brand-bg border-dashed text-brand-text/40">
                    <p className="text-[10px] font-bold tracking-widest">No APIs found</p>
                  </Card>
                </motion.div>
              ) : (
                <motion.div className="space-y-2">
                  {apis.map((api) => (
                    <button
                      key={api.id}
                      onClick={() => loadApiDetails(api)}
                      className={`w-full text-left px-3 py-3 text-[11px] font-mono border transition-all group ${
                        selectedApi?.id === api.id
                          ? 'bg-brand-text text-brand-bg border-brand-text font-bold'
                          : 'border-transparent hover:bg-white/60 hover:border-brand-text/30'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <Globe size={11} className="shrink-0 opacity-60" />
                          <span className="truncate font-bold">{api.name}</span>
                        </div>
                        <ChevronRight size={10} className="opacity-30" />
                      </div>
                      <p className="text-[8px] opacity-40 mt-1 truncate lowercase">{api.id}</p>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </aside>

        {/* Right: Details */}
        <main className="flex-1 overflow-auto bg-brand-bg p-6">
          <AnimatePresence mode="wait">
            {!selectedApi ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full flex flex-col items-center justify-center text-center"
              >
                <div className="w-16 h-16 border border-brand-text/20 flex items-center justify-center text-brand-text/20 mb-4">
                  <Globe size={30} />
                </div>
                <p className="text-xs opacity-30 uppercase italic">
                  Select an API from the list to inspect its resources and methods.
                </p>
              </motion.div>
            ) : loadingDetails ? (
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                <Skeleton className="h-24" />
                <Skeleton className="h-64" />
              </motion.div>
            ) : (
              <motion.div
                key={selectedApi.id}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-6"
              >
                {/* API Header */}
                <div className="border border-brand-text p-5 bg-white/50 relative overflow-hidden group">
                  <div className="absolute -right-4 -bottom-4 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity pointer-events-none">
                    <Globe size={120} />
                  </div>
                  <div className="flex justify-between items-start relative z-10">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 border border-brand-text/30 bg-white text-[8px] font-bold uppercase tracking-wider text-brand-text/60">
                          REST API
                        </span>
                        <span className="px-2 py-0.5 border text-[8px] font-bold rounded-sm uppercase tracking-wide border-brand-text text-brand-bg bg-brand-text">
                          LOCALSTACK
                        </span>
                      </div>
                      <h3 className="text-lg font-bold font-mono text-brand-text tracking-tight">{selectedApi.name}</h3>
                      <p className="text-[10px] font-mono opacity-50 lowercase normal-case">{selectedApi.description || 'No description'}</p>
                    </div>
                    <div className="text-[9px] font-mono opacity-40 text-right space-y-1">
                      <p>ID: {selectedApi.id}</p>
                      <p>Created: {fmtDate(selectedApi.createdDate)}</p>
                      <p>Endpoint Type: {apiDetails?.endpointConfiguration?.types?.[0] || 'EDGE'}</p>
                    </div>
                  </div>
                </div>

                {/* Resources Grid */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                  {/* Resources Tree */}
                  <div className="xl:col-span-1 space-y-4">
                    <h4 className="text-[10px] font-bold tracking-widest flex items-center gap-2">
                      <Layers size={12} /> RESOURCES
                    </h4>
                    <Card className="p-0 border-brand-text/20 bg-brand-muted/10 divide-y divide-brand-text/10">
                      {resources.length === 0 ? (
                        <div className="p-4 text-center text-[9px] font-mono opacity-40">No resources</div>
                      ) : (
                        resources.map(res => (
                          <button
                            key={res.id}
                            onClick={() => setSelectedResource(res)}
                            className={`w-full text-left p-3 font-mono text-[11px] transition-colors flex items-center justify-between ${
                              selectedResource?.id === res.id
                                ? 'bg-white font-bold border-l-2 border-l-brand-text'
                                : 'hover:bg-white/50 border-l-2 border-l-transparent'
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate">
                              <Box size={10} className="opacity-40" />
                              <span className="truncate normal-case">{res.path}</span>
                            </div>
                            <span className="text-[9px] opacity-40">{Object.keys(res.resourceMethods || {}).length} M</span>
                          </button>
                        ))
                      )}
                    </Card>
                  </div>

                  {/* Resource Details / Methods */}
                  <div className="xl:col-span-2 space-y-4">
                    <h4 className="text-[10px] font-bold tracking-widest flex items-center gap-2">
                      <Code size={12} /> METHOD DETAILS
                    </h4>

                    {!selectedResource ? (
                      <Card className="p-8 text-center bg-brand-muted/20 border-dashed">
                        <p className="text-[10px] font-mono opacity-40">Select a resource to view methods</p>
                      </Card>
                    ) : (
                      <div className="space-y-4">
                        <Card className="bg-white border-brand-text p-4">
                          <p className="text-[9px] opacity-40 font-bold mb-1">Resource Path</p>
                          <p className="font-mono text-sm font-bold normal-case">{selectedResource.path}</p>
                          <p className="text-[9px] font-mono opacity-40 lowercase mt-1">ID: {selectedResource.id}</p>
                        </Card>

                        {(!selectedResource.resourceMethods || Object.keys(selectedResource.resourceMethods).length === 0) ? (
                          <Card className="p-6 text-center bg-brand-muted/20 border-dashed">
                            <p className="text-[10px] font-mono opacity-40">No methods configured on this resource</p>
                          </Card>
                        ) : (
                          <div className="space-y-4">
                            {Object.entries(selectedResource.resourceMethods).map(([methodName, methodObj]) => (
                              <Card key={methodName} className="p-0 overflow-hidden">
                                <div
                                  className="p-3 bg-brand-muted/30 border-b border-brand-text/10 flex items-center justify-between cursor-pointer hover:bg-brand-muted/50 transition-colors"
                                  onClick={() => loadIntegration(selectedApi.id!, selectedResource.id!, methodName)}
                                >
                                  <div className="flex items-center gap-3">
                                    <span className={`px-2 py-0.5 text-[9px] font-bold border rounded-sm ${getMethodColor(methodName)}`}>
                                      {methodName}
                                    </span>
                                    <span className="text-[10px] font-mono normal-case">
                                      Auth: {methodObj.authorizationType || 'NONE'}
                                    </span>
                                  </div>
                                  <Button size="sm" variant="ghost" className="text-[9px] h-6 px-2">
                                    Load Integration <ChevronRight size={10} className="ml-1" />
                                  </Button>
                                </div>

                                {integrationDetails[`${selectedResource.id}-${methodName}`] && (
                                  <div className="p-4 bg-brand-bg font-mono space-y-4">
                                    <div className="flex items-start gap-4">
                                      <div className="shrink-0 pt-1 text-brand-text/40">
                                        <LinkIcon size={14} />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-[9px] font-bold opacity-40 uppercase mb-1">Integration Type</p>
                                        <p className="text-[11px] font-bold">{integrationDetails[`${selectedResource.id}-${methodName}`].type || 'MOCK'}</p>
                                      </div>
                                    </div>

                                    {integrationDetails[`${selectedResource.id}-${methodName}`].uri && (
                                      <div className="flex items-start gap-4">
                                        <div className="shrink-0 pt-1 text-brand-text/40">
                                          <Zap size={14} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <p className="text-[9px] font-bold opacity-40 uppercase mb-1">Integration URI</p>
                                          <p className="text-[10px] normal-case bg-brand-muted/50 p-2 border border-brand-text/10 truncate">
                                            {integrationDetails[`${selectedResource.id}-${methodName}`].uri}
                                          </p>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </Card>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};

export default ApiGatewayView;
