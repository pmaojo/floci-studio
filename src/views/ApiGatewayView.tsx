import { useState, useEffect, useCallback } from 'react';
import { GetRestApisCommand } from '@aws-sdk/client-api-gateway';
import type { RestApi } from '@aws-sdk/client-api-gateway';
import { GetApisCommand } from '@aws-sdk/client-apigatewayv2';
import type { Api } from '@aws-sdk/client-apigatewayv2';
import { useAws } from '../contexts/AwsContext';
import { PageHeader, Card, Button, Skeleton } from '../components/ui-elements';
import { Globe, RefreshCw, Server, AlertCircle } from 'lucide-react';

const ApiGatewayView = () => {
  const { clients, logActivity } = useAws();

  const [restApis, setRestApis] = useState<RestApi[]>([]);
  const [httpApis, setHttpApis] = useState<Api[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const restResp = await clients.apigateway.send(new GetRestApisCommand({}));
      setRestApis(restResp.items || []);
      logActivity('API Gateway', 'Get REST APIs', 'success', 'aws-sdk');

      const httpResp = await clients.apigatewayv2.send(new GetApisCommand({}));
      setHttpApis(httpResp.Items || []);
      logActivity('API Gateway V2', 'Get HTTP APIs', 'success', 'aws-sdk');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      logActivity('API Gateway', 'Fetch APIs failed', 'error', msg);
    } finally {
      setLoading(false);
    }
  }, [clients.apigateway, clients.apigatewayv2, logActivity]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="h-full flex flex-col space-y-6">
      <PageHeader
        title="API Gateway"
        subtitle="Local REST, HTTP, and WebSocket APIs routing"
        icon={<Globe />}
        actions={
          <Button onClick={fetchData} variant="secondary" disabled={loading} size="sm">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            <span className="ml-2">Refresh</span>
          </Button>
        }
      />

      {error && (
        <Card className="border-red-500/50 bg-red-500/10 text-red-400 p-4 flex items-center gap-3">
          <AlertCircle size={20} />
          <span>{error}</span>
        </Card>
      )}

      {/* REST APIs (V1) */}
      <div className="space-y-4">
        <h2 className="text-sm uppercase tracking-wider text-brand-green border-b border-brand-text/30 pb-2 flex items-center gap-2">
          <Server size={16} /> REST APIs (V1)
        </h2>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        ) : restApis.length === 0 ? (
          <Card className="p-8 text-center border-dashed">
            <div className="text-neutral-500 mb-2">No REST APIs found</div>
            <div className="text-xs text-neutral-600">Deploy APIs via LocalStack or your IaC definitions.</div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {restApis.map(api => (
              <Card key={api.id} className="p-4 hover:border-brand-green/50 transition-colors flex flex-col h-full group">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-bold text-brand-green group-hover:text-brand-text truncate max-w-[200px]" title={api.name}>
                      {api.name}
                    </h3>
                    <div className="text-[10px] text-neutral-500 font-mono mt-1">ID: {api.id}</div>
                  </div>
                  <span className="text-[10px] bg-brand-green/20 text-brand-green px-2 py-0.5 rounded border border-brand-green/30 uppercase">
                    REST
                  </span>
                </div>

                {api.description && (
                  <p className="text-xs text-neutral-400 mb-4 line-clamp-2">{api.description}</p>
                )}

                <div className="mt-auto pt-4 border-t border-brand-text/20 grid grid-cols-2 gap-2 text-[10px] font-mono">
                  <div>
                    <span className="text-neutral-500 block mb-1">CREATED</span>
                    <span className="text-neutral-300">{api.createdDate ? new Date(api.createdDate).toLocaleDateString() : 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-neutral-500 block mb-1">ENDPOINT</span>
                    <span className="text-neutral-300 truncate block" title={`${api.id}.execute-api.localhost.localstack.cloud:4566`}>
                      {api.id}.execute-api...
                    </span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* HTTP / WebSocket APIs (V2) */}
      <div className="space-y-4 mt-8">
        <h2 className="text-sm uppercase tracking-wider text-brand-green border-b border-brand-text/30 pb-2 flex items-center gap-2">
          <Globe size={16} /> HTTP / WebSocket APIs (V2)
        </h2>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        ) : httpApis.length === 0 ? (
          <Card className="p-8 text-center border-dashed">
            <div className="text-neutral-500 mb-2">No HTTP/WebSocket APIs found</div>
            <div className="text-xs text-neutral-600">Deploy APIs via LocalStack or your IaC definitions.</div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {httpApis.map(api => (
              <Card key={api.ApiId} className="p-4 hover:border-brand-green/50 transition-colors flex flex-col h-full group">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-bold text-brand-green group-hover:text-brand-text truncate max-w-[200px]" title={api.Name}>
                      {api.Name}
                    </h3>
                    <div className="text-[10px] text-neutral-500 font-mono mt-1">ID: {api.ApiId}</div>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded border uppercase ${
                    api.ProtocolType === 'WEBSOCKET'
                      ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                      : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                  }`}>
                    {api.ProtocolType}
                  </span>
                </div>

                {api.Description && (
                  <p className="text-xs text-neutral-400 mb-4 line-clamp-2">{api.Description}</p>
                )}

                <div className="mt-auto pt-4 border-t border-brand-text/20 grid grid-cols-2 gap-2 text-[10px] font-mono">
                  <div>
                    <span className="text-neutral-500 block mb-1">CREATED</span>
                    <span className="text-neutral-300">{api.CreatedDate ? new Date(api.CreatedDate).toLocaleDateString() : 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-neutral-500 block mb-1">ENDPOINT</span>
                    <span className="text-neutral-300 truncate block" title={api.ApiEndpoint}>
                      {api.ApiEndpoint || 'N/A'}
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
};

export default ApiGatewayView;
