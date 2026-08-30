import { useState, useEffect, useMemo } from 'react';
import { useAws } from '../contexts/AwsContext';
import { GetRestApisCommand, type RestApi } from '@aws-sdk/client-api-gateway';
import { PageHeader, Card, Input, Skeleton } from '../components/ui-elements';
import { Globe, Search, Link as LinkIcon, Info, Calendar } from 'lucide-react';

export default function ApiGatewayView() {
  const { clients, logActivity, config } = useAws();
  const [apis, setApis] = useState<RestApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const fetchApis = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await clients.apigateway.send(new GetRestApisCommand({}));
      setApis(response.items || []);
      logActivity('API Gateway', 'GetRestApis', 'success');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      logActivity('API Gateway', 'GetRestApis', 'error', message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApis();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredApis = useMemo(() => {
    return apis.filter(api =>
      api.name?.toLowerCase().includes(search.toLowerCase()) ||
      api.id?.toLowerCase().includes(search.toLowerCase())
    );
  }, [apis, search]);

  const getEmulatorUrl = (apiId?: string) => {
    if (!apiId) return '';
    // Format: http://localhost:4566/restapis/<api-id>/<stage>/_user_request_/
    return `${config.endpoint}/restapis/${apiId}/local/_user_request_/`;
  };

  return (
    <div className="flex flex-col h-full uppercase">
      <PageHeader
        title="API Gateway (REST APIs)"
        icon={<Globe size={18} />}
        onRefresh={fetchApis}
        isRefreshing={loading}
      />

      <div className="p-6 space-y-6 flex-1 overflow-auto bg-brand-bg">
        <div className="flex gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text opacity-30" size={14} />
            <Input
              placeholder="Filter APIs by Name or ID..."
              className="pl-10 text-xs font-mono"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {error && (
          <Card className="text-rose-600 font-mono text-[10px] text-center py-10 border-rose-600 bg-rose-50 normal-case">
            {error}
          </Card>
        )}

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-40" />)}
          </div>
        ) : filteredApis.length === 0 ? (
           <Card className="text-brand-text opacity-30 text-center py-12 italic text-[10px] uppercase font-bold tracking-widest bg-brand-muted/30 border-dashed">
            NO REST APIS FOUND
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredApis.map(api => (
              <Card key={api.id} className="group hover:border-brand-text transition-all bg-white flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-sm tracking-tight text-brand-text flex items-center gap-2">
                        {api.name}
                      </h4>
                      <div className="flex items-center gap-2 mt-1 opacity-50">
                        <span className="text-[10px] font-mono lowercase">id: {api.id}</span>
                      </div>
                    </div>
                  </div>

                  {api.description && (
                     <div className="text-[10px] normal-case bg-brand-muted p-2 border-l-2 border-brand-text/30 flex items-start gap-2">
                       <Info size={12} className="shrink-0 mt-0.5 opacity-50" />
                       <span className="opacity-80">{api.description}</span>
                     </div>
                  )}

                  <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-[10px] font-mono">
                    <div>
                      <span className="block opacity-40 uppercase text-[8px] font-bold mb-1">Created</span>
                      <div className="flex items-center gap-1.5 opacity-80">
                         <Calendar size={10} />
                         {api.createdDate ? new Date(api.createdDate).toLocaleDateString() : 'N/A'}
                      </div>
                    </div>
                    <div>
                      <span className="block opacity-40 uppercase text-[8px] font-bold mb-1">API Key Source</span>
                      <div className="opacity-80 uppercase">
                         {api.apiKeySource || 'HEADER'}
                      </div>
                    </div>
                    <div>
                      <span className="block opacity-40 uppercase text-[8px] font-bold mb-1">Endpoint Types</span>
                      <div className="opacity-80 uppercase">
                         {api.endpointConfiguration?.types?.join(', ') || 'EDGE'}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-brand-text/5 flex flex-col gap-2">
                  <span className="block opacity-40 uppercase text-[8px] font-bold">Local Emulator Base URL (Stage: local)</span>
                  <div className="flex items-center justify-between text-[9px] font-mono text-brand-text/80 bg-brand-muted/30 p-2 rounded-sm overflow-hidden">
                    <span className="truncate normal-case flex items-center gap-1.5">
                      <LinkIcon size={10} />
                      {getEmulatorUrl(api.id)}
                    </span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
