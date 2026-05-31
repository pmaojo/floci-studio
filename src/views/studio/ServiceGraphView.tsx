import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { Card, Button } from '../../components/ui-elements';
import { RefreshCw, Workflow } from 'lucide-react';

interface Node { id: string; label: string; type: string; }
interface Edge { from: string; to: string; label: string; }

export default function ServiceGraphView() {
  const [data, setData] = useState<{ nodes: Node[]; edges: Edge[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  const load = async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch('/sidecar/api/observability/service-graph');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load graph');
      setData(json);
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  };

  useEffect(() => {
    mermaid.initialize({ startOnLoad: false, theme: 'base', themeVariables: { primaryColor: '#f97316', lineColor: '#3b82f6', primaryTextColor: '#fff' } });
    load();
  }, []);

  useEffect(() => {
    if (!data || !ref.current) return;
    const safe = (id: string) => 'n_' + id.replace(/[^a-zA-Z0-9_]/g, '_');
    let g = 'graph LR;\n';
    for (const node of data.nodes) g += `  ${safe(node.id)}["${node.type}: ${node.label}"]\n`;
    for (const edge of data.edges) g += `  ${safe(edge.from)} -->|${edge.label}| ${safe(edge.to)}\n`;
    if (data.nodes.length === 0) g += '  Empty["No resources found"]\n';
    ref.current.innerHTML = '';
    mermaid.render('service-graph-svg', g).then(res => { if (ref.current) ref.current.innerHTML = res.svg; }).catch(e => setError(String(e)));
  }, [data]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2"><Workflow className="text-orange-500" /> Service Graph · X-Ray</h1>
          <p className="text-slate-400">Real event flow across your local AWS resources — SNS→SQS, Lambda triggers, EventBridge routes, DLQ redrive, S3 events</p>
        </div>
        <Button variant="secondary" onClick={load} icon={<RefreshCw size={14} className={loading ? 'animate-spin' : ''} />}>Refresh</Button>
      </div>

      {error && <div className="text-red-400 bg-red-900/20 p-3 rounded">{error}</div>}

      <Card noPadding>
        <div className="border-b border-brand-text bg-brand-muted p-4 flex justify-between items-center">
          <h3 className="font-serif-italic text-lg text-brand-text">Topology</h3>
          {data && <span className="text-xs text-slate-500">{data.nodes.length} nodes · {data.edges.length} edges</span>}
        </div>
        <div className="p-4">
          {loading ? <div className="flex justify-center p-10 text-brand-text">Loading...</div>
            : <div className="w-full bg-slate-900 rounded p-4 flex justify-center overflow-x-auto min-h-[400px]"><div ref={ref} className="mermaid" /></div>}
        </div>
      </Card>
    </div>
  );
}
