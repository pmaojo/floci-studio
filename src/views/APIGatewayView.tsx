import { useState, useEffect } from 'react';
import { GetRestApisCommand, GetResourcesCommand, GetStagesCommand } from '@aws-sdk/client-api-gateway';
import type { RestApi, Resource, Stage } from '@aws-sdk/client-api-gateway';
import { useAws } from '../contexts/AwsContext';
import { Globe, Search, Box, Activity } from 'lucide-react';
import { PageHeader, Card, Button, Input, Skeleton } from '../components/ui-elements';
import { cn } from '../lib/utils';

const APIGatewayView = () => {
  const { clients, logActivity } = useAws();

  // State
  const [apis, setApis] = useState<RestApi[]>([]);
  const [loadingApis, setLoadingApis] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const [selectedApiId, setSelectedApiId] = useState<string | null>(null);
  const [resources, setResources] = useState<Resource[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Fetch APIs
  const fetchApis = async () => {
    setLoadingApis(true);
    setError(null);
    try {
      const response = await clients.apigateway.send(new GetRestApisCommand({}));
      setApis(response.items || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch APIs');
      logActivity('APIGateway', 'GetRestApis', 'error', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoadingApis(false);
    }
  };

  useEffect(() => {
    fetchApis();
  }, []);

  // Fetch API Details (Resources & Stages)
  const fetchApiDetails = async (apiId: string) => {
    setSelectedApiId(apiId);
    setLoadingDetails(true);
    try {
      const [resourcesRes, stagesRes] = await Promise.all([
        clients.apigateway.send(new GetResourcesCommand({ restApiId: apiId })),
        clients.apigateway.send(new GetStagesCommand({ restApiId: apiId }))
      ]);
      setResources(resourcesRes.items || []);
      setStages(stagesRes.item || []);
    } catch (err) {
      logActivity('APIGateway', `GetApiDetails: ${apiId}`, 'error', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleCreateApi = () => {
    alert("Creation is not supported in the UI yet. Use the CLI, Terraform, or an MCP Agent.");
  };

  const filteredApis = apis.filter(api =>
    api.name?.toLowerCase().includes(search.toLowerCase()) ||
    api.id?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full uppercase">
      <PageHeader
        title="API Gateway (REST APIs)"
        icon={<Globe size={18} />}
        onRefresh={() => { fetchApis(); if (selectedApiId) fetchApiDetails(selectedApiId); }}
        isRefreshing={loadingApis || loadingDetails}
        actions={
          <Button onClick={handleCreateApi} icon={<Globe size={14} />}>
            Create API
          </Button>
        }
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel: APIs List */}
        <div className="w-1/3 border-r border-brand-text flex flex-col bg-brand-bg relative shrink-0">
          <div className="p-4 border-b border-brand-text relative shrink-0">
            <Search className="absolute left-7 top-1/2 -translate-y-1/2 text-brand-text opacity-30" size={14} />
            <Input
              placeholder="FILTER APIs..."
              className="pl-10 font-mono text-[11px]"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {loadingApis ? (
              [1, 2, 3].map(i => <Skeleton key={i} className="h-20" />)
            ) : error ? (
              <div className="text-rose-600 font-mono text-[10px] p-4 text-center border border-rose-600/30 bg-rose-500/10">
                ERROR: {error}
              </div>
            ) : filteredApis.length === 0 ? (
              <div className="text-brand-text opacity-30 text-center py-8 italic text-[10px] font-bold tracking-widest">
                NO APIs FOUND
              </div>
            ) : (
              filteredApis.map((api) => (
                <button
                  key={api.id}
                  onClick={() => fetchApiDetails(api.id!)}
                  className={cn(
                    "w-full text-left p-3 border transition-colors relative group",
                    selectedApiId === api.id
                      ? "border-brand-text bg-brand-text text-brand-bg"
                      : "border-brand-text/30 bg-white hover:border-brand-text hover:bg-brand-muted"
                  )}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-[11px] truncate pr-2 font-mono flex items-center gap-2">
                      <Globe size={12} className={selectedApiId === api.id ? "opacity-100" : "opacity-50"} />
                      {api.name}
                    </h4>
                    <span className="text-[9px] font-mono opacity-50 shrink-0">
                      {api.id}
                    </span>
                  </div>
                  {api.description && (
                    <div className="text-[10px] opacity-70 truncate lowercase mb-2">
                      {api.description}
                    </div>
                  )}
                  <div className="flex items-center gap-4 text-[9px] font-mono font-bold">
                    <span className="flex items-center gap-1 opacity-70">
                      <Box size={10} /> {api.endpointConfiguration?.types?.join(', ') || 'EDGE'}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right Panel: Details */}
        <div className="flex-1 flex flex-col bg-brand-muted/30 overflow-hidden">
          {selectedApiId ? (
            loadingDetails ? (
              <div className="p-6 space-y-6">
                <Skeleton className="h-8 w-1/3" />
                <div className="grid grid-cols-2 gap-6">
                  <Skeleton className="h-64" />
                  <Skeleton className="h-64" />
                </div>
              </div>
            ) : (
              <div className="p-6 overflow-y-auto flex-1 space-y-6">
                <div className="flex items-center gap-3 border-b border-brand-text pb-4">
                  <Globe size={24} className="opacity-50" />
                  <div>
                    <h2 className="text-lg font-bold tracking-tight font-mono">{apis.find(a => a.id === selectedApiId)?.name}</h2>
                    <p className="text-[10px] opacity-50 font-mono tracking-widest">{selectedApiId}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Resources */}
                  <Card>
                    <div className="border-b border-brand-text bg-brand-muted p-3 flex justify-between items-center">
                      <h3 className="font-bold text-[10px] tracking-widest flex items-center gap-2">
                        <Box size={14} /> RESOURCES & METHODS
                      </h3>
                      <span className="text-[10px] opacity-50 font-mono">{resources.length} nodes</span>
                    </div>
                    <div className="p-4 space-y-2 max-h-[400px] overflow-y-auto">
                      {resources.length === 0 ? (
                        <div className="text-[10px] opacity-50 italic text-center py-4">No resources defined</div>
                      ) : (
                        resources.map(res => (
                          <div key={res.id} className="border border-brand-text/30 p-2 font-mono text-[11px] bg-white">
                            <div className="flex justify-between items-center mb-1">
                              <span className="font-bold text-brand-green bg-black px-1">{res.path}</span>
                              <span className="text-[9px] opacity-40">{res.id}</span>
                            </div>
                            {res.resourceMethods && (
                              <div className="flex gap-2 flex-wrap mt-2">
                                {Object.keys(res.resourceMethods).map(method => (
                                  <span key={method} className="text-[9px] font-bold border border-brand-text px-1.5 py-0.5 text-brand-text">
                                    {method}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </Card>

                  {/* Stages */}
                  <Card>
                    <div className="border-b border-brand-text bg-brand-muted p-3 flex justify-between items-center">
                      <h3 className="font-bold text-[10px] tracking-widest flex items-center gap-2">
                        <Activity size={14} /> DEPLOYMENT STAGES
                      </h3>
                      <span className="text-[10px] opacity-50 font-mono">{stages.length} stages</span>
                    </div>
                    <div className="p-4 space-y-3 max-h-[400px] overflow-y-auto">
                      {stages.length === 0 ? (
                        <div className="text-[10px] opacity-50 italic text-center py-4">No stages deployed</div>
                      ) : (
                        stages.map(stage => (
                          <div key={stage.stageName} className="border border-brand-text p-3 bg-white hover:bg-brand-muted transition-colors">
                            <div className="flex justify-between items-center mb-2">
                              <span className="font-bold text-[12px]">{stage.stageName}</span>
                              <span className="text-[9px] font-mono opacity-50">deploy: {stage.deploymentId}</span>
                            </div>
                            <div className="text-[10px] bg-black text-brand-green p-2 font-mono truncate">
                              http://localhost:4566/restapis/{selectedApiId}/{stage.stageName}/_user_request_
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </Card>
                </div>
              </div>
            )
          ) : (
            <div className="flex-1 flex items-center justify-center text-brand-text opacity-30 italic text-[10px] font-bold tracking-widest flex-col gap-4">
              <Globe size={48} className="opacity-20" />
              SELECT AN API TO VIEW DETAILS
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default APIGatewayView;
