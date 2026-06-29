import { useState, useEffect, useCallback } from 'react';
import { GetRestApisCommand } from '@aws-sdk/client-api-gateway';
import type { RestApi } from '@aws-sdk/client-api-gateway';
import { RefreshCw, Globe, Server, Clock, Search } from 'lucide-react';
import { useAws } from '../contexts/AwsContext';
import { PageHeader, Card, Skeleton, Button, Input } from '../components/ui-elements';
import { format } from 'date-fns';

export default function APIGatewayView() {
  const { clients, logActivity } = useAws();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [apis, setApis] = useState<RestApi[]>([]);
  const [filterText, setFilterText] = useState('');

  const fetchApis = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await clients.apigateway.send(new GetRestApisCommand({}));
      setApis(response.items || []);
      logActivity('APIGateway', 'GetRestApis', 'success');
    } catch (err: any) {
      setError(err.message || 'Failed to fetch REST APIs');
      logActivity('APIGateway', 'GetRestApis', 'error', err.message);
    } finally {
      setLoading(false);
    }
  }, [clients.apigateway, logActivity]);

  useEffect(() => {
    fetchApis();
  }, [fetchApis]);

  const filteredApis = apis.filter(api =>
    api.name?.toLowerCase().includes(filterText.toLowerCase()) ||
    api.id?.toLowerCase().includes(filterText.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full uppercase">
      <PageHeader
        title="API Gateway"
        icon={<Globe size={18} />}
        onRefresh={fetchApis}
        isRefreshing={loading}
        actions={
          <Button onClick={fetchApis} disabled={loading} icon={<RefreshCw size={14} className={loading ? 'animate-spin' : ''} />}>
            Refresh
          </Button>
        }
      />

      <div className="p-6 space-y-6 flex-1 overflow-auto bg-brand-bg">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text opacity-50" size={14} />
            <Input
              placeholder="FILTER APIS BY NAME OR ID..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="text-[10px] font-mono opacity-50 tracking-widest shrink-0">
            TOTAL APIS: {filteredApis.length}
          </div>
        </div>

        {error && (
          <Card className="text-rose-600 font-mono text-[10px] bg-rose-50 border-rose-600">
            {error}
          </Card>
        )}

        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        ) : filteredApis.length === 0 ? (
          <Card className="text-center py-16 border-dashed bg-brand-muted/20">
            <Globe size={32} className="mx-auto mb-3 opacity-25" />
            <p className="text-[10px] font-bold tracking-widest opacity-60">NO REST APIS FOUND</p>
            <p className="text-[9px] font-mono opacity-40 mt-1 normal-case">Deploy REST APIs via LocalStack or AWS SAM to see them here.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredApis.map(api => (
              <Card key={api.id} className="p-0 overflow-hidden flex flex-col group hover:border-brand-text transition-colors">
                <div className="p-4 border-b border-brand-text/10 bg-brand-muted/20 flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Server size={14} className="text-indigo-600" />
                      <h3 className="font-bold tracking-widest text-xs truncate max-w-[200px] sm:max-w-[300px]">
                        {api.name}
                      </h3>
                    </div>
                    <div className="text-[9px] font-mono opacity-50 flex items-center gap-2">
                      <span className="bg-brand-text/5 px-1.5 py-0.5 rounded-sm">ID: {api.id}</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 flex-1 space-y-4 text-[10px] font-mono">
                  {api.description && (
                    <div className="normal-case opacity-70">
                      {api.description}
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4 pt-2 border-t border-brand-text/5">
                    <div>
                      <div className="opacity-50 mb-1">Endpoint Type</div>
                      <div className="font-bold">
                        {api.endpointConfiguration?.types?.join(', ') || 'EDGE'}
                      </div>
                    </div>
                    <div>
                      <div className="opacity-50 mb-1 flex items-center gap-1">
                        <Clock size={10} /> Created
                      </div>
                      <div className="font-bold">
                        {api.createdDate ? format(new Date(api.createdDate), 'MMM dd, yyyy HH:mm') : '-'}
                      </div>
                    </div>
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
