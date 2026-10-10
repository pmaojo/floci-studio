import { useState, useEffect } from 'react';
import { useAws } from '../contexts/AwsContext';
import { GetRestApisCommand, RestApi } from '@aws-sdk/client-api-gateway';
import { PageHeader, Card, Table } from '../components/ui-elements';
import { Network, RefreshCw } from 'lucide-react';

export default function ApiGatewayView() {
  const { clients, logActivity } = useAws();
  const [apis, setApis] = useState<RestApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchApis = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await clients.apigateway.send(new GetRestApisCommand({}));
      setApis(response.items || []);
      logActivity('API Gateway', 'Fetched REST APIs successfully', 'success');
    } catch (err: any) {
      console.error('Error fetching API Gateway APIs:', err);
      setError(err.message || 'Failed to fetch APIs');
      logActivity('API Gateway', 'Failed to fetch REST APIs', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApis();
  }, []);

  const columns = [
    { header: 'ID', accessor: (api: RestApi) => api.id || '-' },
    { header: 'Name', accessor: (api: RestApi) => api.name || '-' },
    { header: 'Description', accessor: (api: RestApi) => api.description || '-' },
    { header: 'Created Date', accessor: (api: RestApi) => api.createdDate ? new Date(api.createdDate).toLocaleString() : '-' },
    { header: 'Endpoint Type', accessor: (api: RestApi) => api.endpointConfiguration?.types?.join(', ') || '-' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="API Gateway"
        description="Manage your local REST APIs routing and endpoints."
        icon={<Network />}
        actions={
          <button
            onClick={fetchApis}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-mono font-bold bg-white border border-brand-text hover:bg-brand-muted/20 disabled:opacity-50 transition-colors"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            REFRESH
          </button>
        }
      />

      {error && (
        <Card className="border-rose-500 bg-rose-50 text-rose-800 font-mono text-xs p-4">
          Error: {error}
        </Card>
      )}

      <Card className="p-0 overflow-hidden">
        <Table
          columns={columns}
          data={apis}
          emptyMessage="No REST APIs found in local API Gateway."
        />
      </Card>
    </div>
  );
}
