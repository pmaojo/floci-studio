import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Cable, CirclePlus, Database, RefreshCw, Terminal, Trash2 } from 'lucide-react';
import { useAws } from '../contexts/AwsContext';
import { Button, Card, PageHeader, Skeleton } from '../components/ui-elements';
import { sidecarApi, type AwsServiceOverview, type AwsServiceResourceOverview } from '../lib/sidecarApi';

interface AwsCliServiceViewProps {
  serviceKey: string;
  serviceName: string;
}

const emptyOverview = (serviceKey: string, serviceName: string): AwsServiceOverview => ({
  serviceKey,
  serviceName,
  description: '',
  endpointUrl: '',
  region: '',
  generatedAt: '',
  resources: [],
});

const AwsCliServiceView = ({ serviceKey, serviceName }: AwsCliServiceViewProps) => {
  const { logActivity } = useAws();
  const [overview, setOverview] = useState<AwsServiceOverview>(() => emptyOverview(serviceKey, serviceName));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const totalItems = useMemo(
    () => overview.resources.reduce((total, resource) => total + resource.count, 0),
    [overview.resources],
  );
  const compatibilityResources = useMemo(
    () => overview.resources.filter(resource => resource.source === 'sidecar-compat'),
    [overview.resources],
  );

  const applyOverview = useCallback((response: AwsServiceOverview) => {
    setOverview(response);
    logActivity(response.serviceName, 'Read compatibility overview', 'success', `items=${response.resources.reduce((total, resource) => total + resource.count, 0)}`);
  }, [logActivity]);

  const loadOverview = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await sidecarApi.getAwsServiceOverview(serviceKey);
      applyOverview(response);
    } catch (err) {
      const message = err instanceof Error ? err.message : `Failed to read ${serviceName}`;
      setError(message);
      logActivity(serviceName, 'Read real AWS CLI overview failed', 'error', message);
    } finally {
      setLoading(false);
    }
  }, [serviceKey, serviceName, logActivity, applyOverview]);

  useEffect(() => {
    setOverview(emptyOverview(serviceKey, serviceName));
    loadOverview();
  }, [serviceKey, serviceName, loadOverview]);

  const handleCreateCodeArtifactDomain = async () => {
    const name = prompt('Domain Name:');
    if (!name) return;
    try {
      applyOverview(await sidecarApi.createCodeArtifactDomain(name));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create CodeArtifact domain');
    }
  };

  const handleCreateCodeArtifactRepository = async () => {
    const domainName = prompt('Domain Name:');
    if (!domainName) return;
    const repositoryName = prompt('Repository Name:');
    if (!repositoryName) return;
    try {
      applyOverview(await sidecarApi.createCodeArtifactRepository(domainName, repositoryName));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create CodeArtifact repository');
    }
  };

  const handleDeleteCodeArtifactRepository = async (domainName: string, repositoryName: string) => {
    if (!confirm(`Delete repository ${repositoryName} in domain ${domainName}?`)) return;
    try {
      applyOverview(await sidecarApi.deleteCodeArtifactRepository(domainName, repositoryName));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete CodeArtifact repository');
    }
  };

  const handleCreateCompatibilityResource = async () => {
    const defaultResourceId = compatibilityResources[0]?.id || '';
    const resourceId = compatibilityResources.length > 1
      ? prompt(`Resource type (${compatibilityResources.map(resource => resource.id).join(', ')}):`, defaultResourceId)
      : defaultResourceId;
    if (!resourceId) return;

    const name = prompt('Resource Name:');
    if (!name) return;

    try {
      applyOverview(await sidecarApi.createCompatibilityResource(serviceKey, resourceId, name));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create compatibility resource');
    }
  };

  const handleDeleteCompatibilityResource = async (resourceId: string, name: string) => {
    if (!confirm(`Delete ${resourceId} resource ${name}?`)) return;
    try {
      applyOverview(await sidecarApi.deleteCompatibilityResource(serviceKey, resourceId, name));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete compatibility resource');
    }
  };

  return (
    <div className="flex flex-col h-full uppercase">
      <PageHeader
        title={overview.serviceName || serviceName}
        icon={<Terminal size={18} />}
        onRefresh={loadOverview}
        isRefreshing={loading}
        actions={
          <div className="flex items-center gap-2">
            {serviceKey === 'codeartifact' && (
              <>
                <Button onClick={handleCreateCodeArtifactDomain} variant="secondary" icon={<CirclePlus size={14} />}>
                  New Domain
                </Button>
                <Button onClick={handleCreateCodeArtifactRepository} icon={<CirclePlus size={14} />}>
                  New Repo
                </Button>
              </>
            )}
            {serviceKey !== 'codeartifact' && compatibilityResources.length > 0 && (
              <Button onClick={handleCreateCompatibilityResource} variant="secondary" icon={<CirclePlus size={14} />}>
                New Local Resource
              </Button>
            )}
            <Button onClick={loadOverview} icon={<RefreshCw size={14} />}>
              Read Real State
            </Button>
          </div>
        }
      />

      <div className="p-6 space-y-6 flex-1 overflow-auto bg-brand-bg">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <MetricCard label="SOURCE" value={overview.source || 'AWS CLI SIDECAR'} />
          <MetricCard label="AWS_ENDPOINT" value={overview.endpointUrl || 'sidecar'} />
          <MetricCard label="REGION" value={overview.region || 'unknown'} />
          <MetricCard label="ITEMS" value={String(totalItems)} />
        </div>

        {overview.description && (
          <Card className="text-xs normal-case leading-relaxed opacity-80">
            {overview.description}
          </Card>
        )}

        {error && (
          <Card className="text-rose-600 font-mono text-[10px] bg-rose-50 border-rose-600 normal-case">
            {error}
          </Card>
        )}

        {loading ? (
          <div className="grid grid-cols-1 gap-4">
            {[1, 2, 3].map(item => <Skeleton key={item} className="h-36" />)}
          </div>
        ) : overview.resources.length === 0 ? (
          <EmptyState
            title="No real connector configured"
            detail="This section no longer uses simulated data, but there is no operational backend for this service in the sidecar catalog yet."
          />
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {overview.resources.map(resource => (
              <React.Fragment key={resource.id}>
                <ResourcePanel
                  resource={resource}
                  onDeleteCodeArtifactRepository={handleDeleteCodeArtifactRepository}
                  onDeleteCompatibilityResource={handleDeleteCompatibilityResource}
                />
              </React.Fragment>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const ResourcePanel = ({
  resource,
  onDeleteCodeArtifactRepository,
  onDeleteCompatibilityResource,
}: {
  resource: AwsServiceResourceOverview;
  onDeleteCodeArtifactRepository?: (domainName: string, repositoryName: string) => void;
  onDeleteCompatibilityResource?: (resourceId: string, name: string) => void;
}) => (
  <Card className="font-mono">
    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 border border-brand-text bg-brand-muted flex items-center justify-center shrink-0">
          {resource.status === 'ok' ? <Database size={16} /> : <Cable size={16} />}
        </div>
        <div>
          <h3 className="text-xs font-bold tracking-wider">{resource.label}</h3>
          <p className="text-[9px] opacity-50 normal-case break-all">{resource.command}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 text-[9px] font-bold">
        <span className={resourceStatusClassName(resource.status)}>
          {resource.status.toUpperCase()}
        </span>
        <span className="border border-brand-text px-2 py-1 bg-brand-muted">{resource.count}</span>
      </div>
    </div>

    {resource.error ? (
      <div className={`${resource.status === 'unsupported' ? 'border-amber-300 bg-amber-50 text-amber-800' : 'border-rose-300 bg-rose-50 text-rose-700'} border text-[10px] p-3 normal-case whitespace-pre-wrap`}>
        {resource.error}
      </div>
    ) : resource.items.length === 0 ? (
      <div className="border border-brand-text/10 bg-brand-muted/20 text-[10px] p-6 text-center italic opacity-60">
        No real resources returned
      </div>
    ) : (
      <ResourceTable
        items={resource.items}
        onDeleteCodeArtifactRepository={resource.id === 'repositories' ? onDeleteCodeArtifactRepository : undefined}
        onDeleteCompatibilityResource={
          resource.source === 'sidecar-compat' && resource.id !== 'repositories'
            ? (name) => onDeleteCompatibilityResource?.(resource.id, name)
            : undefined
        }
      />
    )}
  </Card>
);

const ResourceTable = ({
  items,
  onDeleteCodeArtifactRepository,
  onDeleteCompatibilityResource,
}: {
  items: unknown[];
  onDeleteCodeArtifactRepository?: (domainName: string, repositoryName: string) => void;
  onDeleteCompatibilityResource?: (name: string) => void;
}) => {
  const columns = getColumns(items);
  const hasActions = Boolean(onDeleteCodeArtifactRepository || onDeleteCompatibilityResource);

  if (columns.length === 0) {
    return (
      <pre className="text-[10px] bg-brand-muted/30 border border-brand-text/10 p-3 overflow-auto max-h-80 normal-case">
        {JSON.stringify(items, null, 2)}
      </pre>
    );
  }

  return (
    <div className="border border-brand-text/20 overflow-x-auto">
      <table className="w-full text-left text-[10px]">
        <thead className="bg-brand-muted border-b border-brand-text/20">
          <tr>
            {columns.map(column => <th key={column} className="p-3">{column}</th>)}
            {hasActions && <th className="p-3">actions</th>}
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr key={stableItemKey(item, index)} className="border-b border-brand-text/10 align-top">
              {columns.map(column => (
                <td key={column} className="p-3 max-w-xs truncate normal-case">
                  {formatCellValue(readColumn(item, column))}
                </td>
              ))}
              {hasActions && (
                <td className="p-3">
                  <button
                    className="inline-flex items-center gap-1 text-rose-700 font-bold uppercase"
                    onClick={() => {
                      const record = isRecord(item) ? item : {};
                      if (onDeleteCodeArtifactRepository) {
                        onDeleteCodeArtifactRepository(String(record.domainName || ''), String(record.name || ''));
                        return;
                      }
                      onDeleteCompatibilityResource?.(String(record.name || record.id || ''));
                    }}
                  >
                    <Trash2 size={12} />
                    DROP
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const MetricCard = ({ label, value }: { label: string; value: string }) => (
  <Card className="font-mono">
    <p className="text-[9px] opacity-50 mb-2">{label}</p>
    <p className="text-sm font-bold truncate normal-case">{value}</p>
  </Card>
);

const resourceStatusClassName = (status: AwsServiceResourceOverview['status']) => {
  if (status === 'ok') return 'text-emerald-700';
  if (status === 'unsupported') return 'text-amber-700';
  return 'text-rose-700';
};

const EmptyState = ({ title, detail }: { title: string; detail: string }) => (
  <Card className="text-center py-12 border-dashed bg-brand-muted/20">
    <p className="text-[10px] font-bold tracking-widest">{title}</p>
    <p className="text-xs opacity-60 normal-case mt-2 max-w-2xl mx-auto leading-relaxed">{detail}</p>
  </Card>
);

const getColumns = (items: unknown[]) => {
  const objectItems = items.filter(isRecord);
  if (objectItems.length === 0) return ['value'];

  const columns = new Set<string>();
  objectItems.slice(0, 10).forEach(item => {
    Object.keys(item).slice(0, 8).forEach(key => columns.add(key));
  });

  return Array.from(columns);
};

const readColumn = (item: unknown, column: string) => {
  if (column === 'value' && !isRecord(item)) return item;
  if (!isRecord(item)) return item;
  return item[column];
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
};

const formatCellValue = (value: unknown) => {
  if (value === undefined || value === null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value);
};

const stableItemKey = (item: unknown, index: number) => {
  if (isRecord(item)) {
    const candidate = item.id || item.Id || item.name || item.Name || item.arn || item.Arn || item.ARN;
    if (candidate) return String(candidate);
  }

  return `${index}-${formatCellValue(item).slice(0, 32)}`;
};

export default AwsCliServiceView;
