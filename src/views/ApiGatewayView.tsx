import { useState, useEffect, useCallback } from 'react';
import { useAws } from '../contexts/AwsContext';
import { GetRestApisCommand, CreateRestApiCommand, DeleteRestApiCommand, RestApi } from '@aws-sdk/client-api-gateway';
import { Globe, Trash2, Terminal, Plus, Search } from 'lucide-react';
import { PageHeader, Card, Button, Input, Skeleton } from '../components/ui-elements';
import { format } from 'date-fns';

const ApiGatewayView = () => {
  const { clients, logActivity, config } = useAws();

  const [apis, setApis] = useState<RestApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const fetchApis = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await clients.apigateway.send(new GetRestApisCommand({}));
      setApis(response.items || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch REST APIs');
    } finally {
      setLoading(false);
    }
  }, [clients.apigateway]);

  useEffect(() => {
    fetchApis();
  }, [fetchApis]);

  const handleCreate = async () => {
    const name = prompt('API Name:');
    if (!name) return;

    const description = prompt('API Description (optional):') || '';

    try {
      await clients.apigateway.send(new CreateRestApiCommand({
        name,
        description
      }));
      logActivity('ApiGateway', `CreateRestApi: ${name}`, 'success');
      fetchApis();
    } catch (err) {
      logActivity('ApiGateway', `CreateRestApi failed: ${name}`, 'error', err instanceof Error ? err.message : String(err));
      alert(err instanceof Error ? err.message : String(err));
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete API ${name} (${id})?`)) return;

    try {
      await clients.apigateway.send(new DeleteRestApiCommand({ restApiId: id }));
      logActivity('ApiGateway', `DeleteRestApi: ${name}`, 'success');
      fetchApis();
    } catch (err) {
      logActivity('ApiGateway', `DeleteRestApi failed: ${name}`, 'error', err instanceof Error ? err.message : String(err));
      alert(err instanceof Error ? err.message : String(err));
    }
  };

  const filteredApis = apis.filter(api =>
    api.name?.toLowerCase().includes(search.toLowerCase()) ||
    api.id?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full uppercase">
      <PageHeader
        title="API Gateway"
        icon={<Globe size={18} />}
        onRefresh={fetchApis}
        isRefreshing={loading}
        actions={
          <Button onClick={handleCreate} icon={<Plus size={14} />}>
            Create API
          </Button>
        }
      />

      <div className="p-6 space-y-6 flex-1 overflow-auto bg-brand-bg">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text opacity-30" size={14} />
          <Input
            placeholder="Filter APIs by Name or ID..."
            className="pl-10 font-mono text-[11px]"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 gap-4">
          {loading ? (
            [1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)
          ) : error ? (
            <Card className="text-rose-600 font-mono text-[10px] text-center py-10 border-rose-600 bg-rose-50">
              ERROR: {error}
            </Card>
          ) : apis.length === 0 ? (
            <Card className="text-brand-text opacity-30 text-center py-12 italic text-[10px] uppercase font-bold tracking-widest bg-brand-muted/30 border-dashed">
              No REST APIs Found
            </Card>
          ) : filteredApis.length === 0 ? (
            <Card className="text-brand-text opacity-30 text-center py-12 italic text-[10px] uppercase font-bold tracking-widest bg-brand-muted/30 border-dashed">
              No APIs match filter "{search}"
            </Card>
          ) : (
            filteredApis.map(api => (
              <Card key={api.id} className="group hover:bg-brand-text hover:text-white transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 border border-brand-text flex items-center justify-center opacity-70 group-hover:border-brand-bg shrink-0 mt-1">
                      <Globe size={20} />
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h4 className="font-bold text-[12px] font-mono">{api.name}</h4>
                        <span className="text-[9px] font-bold border px-1.5 py-0.5 rounded-sm uppercase tracking-wider border-brand-text text-brand-text group-hover:border-white group-hover:text-white">
                          REST API
                        </span>
                      </div>
                      <div className="flex flex-col gap-1 text-[10px] opacity-50 font-mono lowercase">
                        <span className="truncate max-w-xl">id: {api.id}</span>
                        {api.description && <span className="truncate max-w-xl italic">desc: {api.description}</span>}
                        {api.createdDate && <span>created: {format(new Date(api.createdDate), 'yyyy-MM-dd HH:mm:ss')}</span>}
                      </div>

                      {/* Endpoints Emulator Info */}
                      <div className="mt-3 pt-2 border-t border-brand-text/10 group-hover:border-white/20 text-[9px] font-mono">
                         <div className="flex flex-col gap-1 opacity-70">
                           <span className="font-bold text-[8px] uppercase tracking-widest mb-1 opacity-50">Local Endpoints</span>
                           <span>https://{api.id}.execute-api.{config.region}.localhost.localstack.cloud:4566</span>
                           <span>http://localhost:4566/restapis/{api.id}</span>
                         </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-3 text-[10px] font-bold tracking-widest">
                    <div className="flex items-center gap-4">
                      <button className="hover:underline flex items-center gap-1.5 group-hover:text-brand-bg opacity-50 cursor-not-allowed" title="Not available in local emulaton UI">
                         <Terminal size={12} />
                         RESOURCES
                      </button>
                      <button
                        onClick={() => handleDelete(api.id!, api.name!)}
                        className="text-rose-500 hover:underline flex items-center gap-1.5 group-hover:text-rose-400"
                      >
                        <Trash2 size={12} />
                        DELETE
                      </button>
                    </div>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default ApiGatewayView;
