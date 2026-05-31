import { useState } from 'react';
import { Card, Button, Input } from '../../components/ui-elements';
import { GitCompare, CheckCircle, AlertCircle, MinusCircle, Search } from 'lucide-react';

interface DriftItem { category: string; name: string; }
interface DriftResult {
  sources: string[]; inSync: boolean;
  summary: { managed: number; missing: number; unmanaged: number };
  missing: DriftItem[]; unmanaged: DriftItem[]; managed: DriftItem[];
}

function ItemList({ title, items, color, icon }: { title: string; items: DriftItem[]; color: string; icon: React.ReactNode }) {
  return (
    <Card className="p-0">
      <div className="border-b border-brand-text bg-brand-muted p-3 flex items-center gap-2">{icon}<h3 className="font-serif-italic text-brand-text">{title} ({items.length})</h3></div>
      <div className="p-3 space-y-1 max-h-72 overflow-auto">
        {items.length === 0 && <div className="text-slate-500 italic text-sm">None</div>}
        {items.map((it, i) => (
          <div key={i} className="flex items-center justify-between text-sm font-mono">
            <span className={color}>{it.name}</span>
            <span className="text-[10px] uppercase text-slate-500 border border-slate-700 px-1.5 py-0.5">{it.category}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

export default function DriftView() {
  const [path, setPath] = useState('.');
  const [result, setResult] = useState<DriftResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const run = async () => {
    setLoading(true); setError(''); setResult(null);
    try {
      const res = await fetch(`/sidecar/api/iac/drift?path=${encodeURIComponent(path)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Drift detection failed');
      setResult(data);
    } catch (e) { setError((e as Error).message); } finally { setLoading(false); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2"><GitCompare className="text-purple-400" /> IaC Drift Detection</h1>
        <p className="text-slate-400">Compare your local Terraform state (terraform.tfstate) against the live emulator and surface drift</p>
      </div>

      <Card className="p-0">
        <div className="p-4 flex gap-2 items-end flex-wrap">
          <div className="flex-1 min-w-[240px]">
            <label className="block text-xs font-medium text-slate-300 mb-1">IaC path (scanned recursively)</label>
            <Input value={path} onChange={e => setPath(e.target.value)} placeholder="path to repo or tfstate" />
          </div>
          <Button onClick={run} disabled={loading} icon={<Search size={14} />}>{loading ? 'Scanning...' : 'Detect Drift'}</Button>
        </div>
      </Card>

      {error && <div className="text-red-400 bg-red-900/20 p-3 rounded">{error}</div>}

      {result && (
        <>
          <Card>
            <div className="flex items-center gap-4 flex-wrap">
              <span className={`px-3 py-1 rounded font-bold uppercase text-sm ${result.inSync ? 'bg-green-900/50 text-green-400' : 'bg-amber-900/50 text-amber-400'}`}>
                {result.inSync ? 'In Sync' : 'Drift Detected'}
              </span>
              <span className="text-sm text-slate-400">managed: {result.summary.managed} · missing: {result.summary.missing} · unmanaged: {result.summary.unmanaged}</span>
            </div>
            {result.sources.length > 0 && <div className="mt-2 text-xs text-slate-500 font-mono">sources: {result.sources.join(', ')}</div>}
            {result.sources.length === 0 && <div className="mt-2 text-xs text-amber-500/80">No IaC files found at that path — only emulator resources are shown as "unmanaged".</div>}
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <ItemList title="Missing" items={result.missing} color="text-amber-400" icon={<AlertCircle size={16} className="text-amber-400" />} />
            <ItemList title="Unmanaged" items={result.unmanaged} color="text-rose-400" icon={<MinusCircle size={16} className="text-rose-400" />} />
            <ItemList title="Managed" items={result.managed} color="text-green-400" icon={<CheckCircle size={16} className="text-green-400" />} />
          </div>
        </>
      )}
    </div>
  );
}
