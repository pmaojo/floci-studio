import { useEffect, useRef, useState, FormEvent } from 'react';
import mermaid from 'mermaid';
import { Card, Button, Input } from '../../components/ui-elements';
import { Search, Compass } from 'lucide-react';

interface Node { id: string; label: string; type: string; }
interface Edge { from: string; to: string; label: string; }

export default function ResourceExplorerView() {
  const [data, setData] = useState<{ resourceId: string; nodes: Node[]; edges: Edge[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [resourceId, setResourceId] = useState('');
  const [resourceType, setResourceType] = useState('Lambda');

  const ref = useRef<HTMLDivElement>(null);

  const load = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    if (!resourceId) return;

    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/sidecar/api/studio/resource-explorer?resource_id=${encodeURIComponent(resourceId)}&resource_type=${encodeURIComponent(resourceType)}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load graph');
      setData(json);
    } catch (e) {
      setError((e as Error).message);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    mermaid.initialize({ startOnLoad: false, theme: 'base', themeVariables: { primaryColor: '#f97316', lineColor: '#3b82f6', primaryTextColor: '#fff' } });
  }, []);

  useEffect(() => {
    if (!data || !ref.current) return;
    const safe = (id: string) => 'n_' + id.replace(/[^a-zA-Z0-9_]/g, '_');
    let g = 'graph TD;\n';

    // Color the central node differently
    const centerNodeId = safe(data.resourceId);

    for (const node of data.nodes) {
      g += `  ${safe(node.id)}["${node.type}: ${node.label}"]\n`;
    }

    for (const edge of data.edges) {
      g += `  ${safe(edge.from)} -->|${edge.label}| ${safe(edge.to)}\n`;
    }

    if (data.nodes.length === 0) {
      g += '  Empty["No relations found"]\n';
    } else {
      g += `  style ${centerNodeId} fill:#10b981,stroke:#047857,stroke-width:2px,color:#fff\n`;
    }

    ref.current.innerHTML = '';
    mermaid.render('resource-explorer-svg', g).then(res => {
      if (ref.current) ref.current.innerHTML = res.svg;
    }).catch(e => setError(String(e)));
  }, [data]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2"><Compass className="text-emerald-500" /> Resource Explorer</h1>
          <p className="text-slate-400">AWS Config-style resource relationships and deep dependency inspection</p>
        </div>
      </div>

      <Card className="p-4">
        <form onSubmit={load} className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1 space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Resource Type</label>
            <select
              value={resourceType}
              onChange={e => setResourceType(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 p-2 text-sm text-white rounded focus:outline-none focus:border-brand-text"
            >
              <option value="Lambda">Lambda Function</option>
              <option value="SQS">SQS Queue</option>
              <option value="SNS">SNS Topic</option>
              <option value="S3">S3 Bucket</option>
              <option value="DynamoDB">DynamoDB Table</option>
              <option value="EventBridge">EventBridge Rule</option>
            </select>
          </div>
          <div className="flex-[2] space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Resource Name or ARN</label>
            <Input
              value={resourceId}
              onChange={e => setResourceId(e.target.value)}
              placeholder="e.g. my-function or arn:aws:lambda:..."
              className="w-full"
            />
          </div>
          <Button type="submit" disabled={!resourceId || loading} icon={<Search size={14} />}>
            {loading ? 'Scanning...' : 'Inspect Relations'}
          </Button>
        </form>
      </Card>

      {error && <div className="text-red-400 bg-red-900/20 p-3 rounded">{error}</div>}

      <Card noPadding>
        <div className="border-b border-brand-text bg-brand-muted p-4 flex justify-between items-center">
          <h3 className="font-serif-italic text-lg text-brand-text">Dependency Map</h3>
          {data && <span className="text-xs text-slate-500">{data.nodes.length} entities connected</span>}
        </div>
        <div className="p-4">
          {!data && !loading && <div className="flex justify-center p-10 text-slate-500 italic">Enter a resource name above to discover its relationships.</div>}
          {loading && <div className="flex justify-center p-10 text-brand-text">Analyzing configuration...</div>}
          {data && !loading && (
            <div className="w-full bg-slate-900 rounded p-4 flex justify-center overflow-x-auto min-h-[400px]">
              <div ref={ref} className="mermaid" />
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
