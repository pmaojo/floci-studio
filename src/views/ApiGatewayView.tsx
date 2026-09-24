import { useState, useEffect, useCallback } from 'react';
import { GetRestApisCommand, GetResourcesCommand } from '@aws-sdk/client-api-gateway';
import type { RestApi, Resource } from '@aws-sdk/client-api-gateway';
import { useAws } from '../contexts/AwsContext';
import { Globe, RefreshCw, FolderTree, Network } from 'lucide-react';
import { PageHeader, Card, Button, Skeleton } from '../components/ui-elements';

const ApiGatewayView = () => {
  const { clients, logActivity } = useAws();
  const [apis, setApis] = useState<RestApi[]>([]);
  const [loadingApis, setLoadingApis] = useState(true);
  const [selectedApiId, setSelectedApiId] = useState<string | null>(null);
  const [resources, setResources] = useState<Resource[]>([]);
  const [loadingResources, setLoadingResources] = useState(false);

  const fetchApis = useCallback(async () => {
    setLoadingApis(true);
    try {
      const response = await clients.apigateway.send(new GetRestApisCommand({}));
      setApis(response.items || []);
      logActivity('API Gateway', 'GetRestApis', 'success');
    } catch (err) {
      logActivity('API Gateway', 'GetRestApis failed', 'error', err instanceof Error ? err.message : String(err));
    } finally {
      setLoadingApis(false);
    }
  }, [clients.apigateway, logActivity]);

  useEffect(() => {
    fetchApis();
  }, [fetchApis]);

  const fetchResources = useCallback(async (apiId: string) => {
    setLoadingResources(true);
    try {
      const response = await clients.apigateway.send(new GetResourcesCommand({ restApiId: apiId }));
      setResources(response.items || []);
      logActivity('API Gateway', 'GetResources', 'success');
    } catch (err) {
      logActivity('API Gateway', 'GetResources failed', 'error', err instanceof Error ? err.message : String(err));
      setResources([]);
    } finally {
      setLoadingResources(false);
    }
  }, [clients.apigateway, logActivity]);

  const handleSelectApi = (apiId: string) => {
    setSelectedApiId(apiId);
    fetchResources(apiId);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="API Gateway"
        description="REST APIs endpoint routing."
        icon={Network}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-slate-200">REST APIs</h3>
            <Button variant="ghost" onClick={fetchApis} size="icon" title="Refresh">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
          {loadingApis ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full rounded-md" />)}
            </div>
          ) : apis.length === 0 ? (
            <Card className="p-6 text-center text-slate-400">
              <Globe className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No REST APIs found.</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {apis.map(api => (
                <Card
                  key={api.id}
                  className={`p-4 cursor-pointer transition-colors ${selectedApiId === api.id ? 'border-emerald-500 bg-slate-800/80' : 'hover:border-slate-600'}`}
                  onClick={() => api.id && handleSelectApi(api.id)}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium text-emerald-400">{api.name || 'Unnamed API'}</h4>
                      <p className="text-xs font-mono text-slate-500 mt-1">ID: {api.id}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div className="md:col-span-2">
          {selectedApiId ? (
            <Card className="p-6 h-full min-h-[400px]">
              <div className="flex justify-between items-center mb-6 border-b border-slate-700 pb-4">
                <h3 className="text-lg font-medium text-slate-200 flex items-center gap-2">
                  <FolderTree className="h-5 w-5 text-emerald-500" />
                  Resources
                </h3>
                <Button variant="ghost" onClick={() => fetchResources(selectedApiId)} size="sm">
                  <RefreshCw className="h-4 w-4 mr-2" /> Refresh
                </Button>
              </div>

              {loadingResources ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-12 w-full rounded-md" />)}
                </div>
              ) : resources.length === 0 ? (
                <div className="text-center text-slate-400 py-12">
                  <p>No resources found for this API.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left text-slate-300">
                    <thead className="text-xs text-slate-400 uppercase bg-slate-900/50">
                      <tr>
                        <th className="px-4 py-3 font-medium">Path</th>
                        <th className="px-4 py-3 font-medium">Methods</th>
                        <th className="px-4 py-3 font-medium text-right">Resource ID</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resources.map(resource => (
                        <tr key={resource.id} className="border-b border-slate-700/50 hover:bg-slate-800/50">
                          <td className="px-4 py-3 font-mono text-emerald-400">{resource.path || '/'}</td>
                          <td className="px-4 py-3">
                            <div className="flex gap-2 flex-wrap">
                              {resource.resourceMethods ? (
                                Object.keys(resource.resourceMethods).map(method => (
                                  <span key={method} className="px-2 py-0.5 text-[10px] font-bold bg-slate-700 text-slate-300 rounded">
                                    {method}
                                  </span>
                                ))
                              ) : (
                                <span className="text-slate-500 text-xs italic">None</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-slate-500 text-right">{resource.id}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          ) : (
            <Card className="p-12 text-center text-slate-500 h-full flex flex-col items-center justify-center border-dashed">
              <Network className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>Select an API to view its resources and methods.</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default ApiGatewayView;
