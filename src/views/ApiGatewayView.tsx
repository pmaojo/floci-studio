import { useState, useEffect } from 'react';
import { useAws } from '../contexts/AwsContext';
import { PageHeader, Card, Button, Skeleton } from '../components/ui-elements';
import { Plus, Trash2, Globe } from 'lucide-react';
import { GetRestApisCommand, CreateRestApiCommand, DeleteRestApiCommand, RestApi } from '@aws-sdk/client-api-gateway';

const ApiGatewayView = () => {
  const { clients, logActivity } = useAws();
  const [apis, setApis] = useState<RestApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadApis = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await clients.apigateway.send(new GetRestApisCommand({}));
      setApis(res.items || []);
      logActivity('APIGateway', 'GetRestApis', 'success');
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : String(err));
      logActivity('APIGateway', 'GetRestApis', 'error', err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApis();
  }, [clients.apigateway]);

  const handleCreate = async () => {
    const name = prompt('REST API Name:');
    if (!name) return;

    try {
      await clients.apigateway.send(new CreateRestApiCommand({ name }));
      logActivity('APIGateway', `CreateRestApi: ${name}`, 'success');
      loadApis();
    } catch (err) {
      console.error(err);
      alert(`Failed to create API: ${err instanceof Error ? err.message : String(err)}`);
      logActivity('APIGateway', `CreateRestApi failed`, 'error', err instanceof Error ? err.message : String(err));
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete REST API ${name} (${id})?`)) return;

    try {
      await clients.apigateway.send(new DeleteRestApiCommand({ restApiId: id }));
      logActivity('APIGateway', `DeleteRestApi: ${name}`, 'success');
      loadApis();
    } catch (err) {
      console.error(err);
      alert(`Failed to delete API: ${err instanceof Error ? err.message : String(err)}`);
      logActivity('APIGateway', `DeleteRestApi failed`, 'error', err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div className="flex flex-col h-full uppercase">
      <PageHeader
        title="API Gateway REST APIs"
        icon={<Globe size={18} />}
        onRefresh={loadApis}
        isRefreshing={loading}
        actions={
          <div className="flex items-center gap-2">
            <Button onClick={handleCreate} icon={<Plus size={14} />}>
              Create API
            </Button>
          </div>
        }
      />

      <div className="p-6 space-y-6 flex-1 overflow-auto bg-brand-bg">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="font-mono">
            <p className="text-[9px] opacity-50 mb-2">TOTAL APIs</p>
            <p className="text-sm font-bold truncate normal-case">{String(apis.length)}</p>
          </Card>
          <Card className="font-mono">
            <p className="text-[9px] opacity-50 mb-2">ENDPOINT TYPE</p>
            <p className="text-sm font-bold truncate normal-case">EDGE / REGIONAL</p>
          </Card>
          <Card className="font-mono">
            <p className="text-[9px] opacity-50 mb-2">STATUS</p>
            <p className="text-sm font-bold truncate normal-case">{loading ? 'FETCHING...' : 'ONLINE'}</p>
          </Card>
        </div>

        {error && (
          <Card className="text-rose-600 font-mono text-[10px] bg-rose-50 border-rose-600 normal-case">
            {error}
          </Card>
        )}

        <Card className="font-mono">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold tracking-wider">REST APIs</h3>
          </div>

          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
            </div>
          ) : apis.length === 0 ? (
            <div className="border border-brand-text/10 bg-brand-muted/20 text-[10px] p-6 text-center italic opacity-60">
              No REST APIs found in this region
            </div>
          ) : (
            <div className="border border-brand-text/20 overflow-x-auto">
              <table className="w-full text-left text-[10px]">
                <thead className="bg-brand-muted border-b border-brand-text/20">
                  <tr>
                    <th className="p-3">ID</th>
                    <th className="p-3">NAME</th>
                    <th className="p-3">CREATED</th>
                    <th className="p-3">ENDPOINT TYPE</th>
                    <th className="p-3 text-right">ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {apis.map(api => (
                    <tr key={api.id} className="border-b border-brand-text/10">
                      <td className="p-3 normal-case">{api.id}</td>
                      <td className="p-3 normal-case">{api.name}</td>
                      <td className="p-3 normal-case">{api.createdDate?.toLocaleString() || '-'}</td>
                      <td className="p-3 normal-case">{api.endpointConfiguration?.types?.join(', ') || 'EDGE'}</td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => handleDelete(api.id!, api.name || 'unnamed')}
                          className="inline-flex items-center gap-1 text-rose-700 font-bold uppercase"
                        >
                          <Trash2 size={12} />
                          DROP
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default ApiGatewayView;
