import { useEffect, useState } from 'react';
import { Card, Button, Input } from '../../components/ui-elements';
import { Webhook, Filter, Puzzle, Plus, Trash2 } from 'lucide-react';

interface WebhookRule { id: string; event: string; url: string; }
interface InterceptorRule { id: string; phase: string; urlPattern: string; action: string; params: Record<string, unknown>; }
interface PluginInfo { id: string; name?: string; version?: string; valid?: boolean; error?: string; description?: string; tools?: string[]; }

export default function ExtensibilityView() {
  const [webhooks, setWebhooks] = useState<WebhookRule[]>([]);
  const [interceptors, setInterceptors] = useState<InterceptorRule[]>([]);
  const [plugins, setPlugins] = useState<PluginInfo[]>([]);
  const [error, setError] = useState('');

  // webhook form
  const [whEvent, setWhEvent] = useState('floci.resource.created');
  const [whUrl, setWhUrl] = useState('');
  // interceptor form
  const [icPattern, setIcPattern] = useState('');
  const [icPhase, setIcPhase] = useState('response');
  const [icAction, setIcAction] = useState('delay_ms');
  const [icParams, setIcParams] = useState('{ "ms": 3000 }');

  const load = async () => {
    try {
      const [w, i, p] = await Promise.all([
        fetch('/sidecar/api/extensibility/webhooks').then(r => r.json()),
        fetch('/sidecar/api/extensibility/interceptors').then(r => r.json()),
        fetch('/sidecar/api/extensibility/plugins').then(r => r.json()),
      ]);
      setWebhooks(w.webhooks || []);
      setInterceptors(i.interceptors || []);
      setPlugins(p.plugins || []);
    } catch (e) { setError((e as Error).message); }
  };
  useEffect(() => { load(); }, []);

  const addWebhook = async () => {
    try {
      const res = await fetch('/sidecar/api/extensibility/webhooks', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: whEvent, url: whUrl }),
      });
      if (!res.ok) { setError((await res.json()).error || 'Failed'); return; }
      setWhUrl(''); await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Network error');
    }
  };
  const delWebhook = async (id: string) => {
    try {
      await fetch(`/sidecar/api/extensibility/webhooks/${id}`, { method: 'DELETE' });
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Network error');
    }
  };

  const addInterceptor = async () => {
    let params: Record<string, unknown> = {};
    try { params = JSON.parse(icParams); } catch { setError('Params must be valid JSON'); return; }
    try {
      const res = await fetch('/sidecar/api/extensibility/interceptors', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url_pattern: icPattern, phase: icPhase, action: icAction, params }),
      });
      if (!res.ok) { setError((await res.json()).error || 'Failed'); return; }
      setIcPattern(''); await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Network error');
    }
  };
  const delInterceptor = async (id: string) => {
    try {
      await fetch(`/sidecar/api/extensibility/interceptors/${id}`, { method: 'DELETE' });
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Network error');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2"><Puzzle className="text-emerald-400" /> Extensibility</h1>
        <p className="text-slate-400">Lifecycle webhooks, programmable HTTP interceptors and the community plugin SDK</p>
      </div>
      {error && <div className="text-red-400 bg-red-900/20 p-3 rounded">{error}</div>}

      <Card className="p-0">
        <div className="border-b border-brand-text bg-brand-muted p-4 flex items-center gap-2"><Webhook size={16} /><h3 className="font-serif-italic text-lg text-brand-text">Lifecycle Webhooks</h3></div>
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <Input value={whEvent} onChange={e => setWhEvent(e.target.value)} placeholder="event glob (e.g. floci.resource.created or *)" />
            <Input className="md:col-span-2" value={whUrl} onChange={e => setWhUrl(e.target.value)} placeholder="https://your-endpoint/webhook" />
          </div>
          <Button onClick={addWebhook} disabled={!whUrl} icon={<Plus size={14} />}>Add Webhook</Button>
          {webhooks.map(w => (
            <div key={w.id} className="flex items-center justify-between border border-slate-700 p-2 text-sm">
              <span className="font-mono text-slate-300"><span className="text-emerald-400">{w.event}</span> → {w.url}</span>
              <button onClick={() => delWebhook(w.id)} className="text-rose-400"><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-0">
        <div className="border-b border-brand-text bg-brand-muted p-4 flex items-center gap-2"><Filter size={16} /><h3 className="font-serif-italic text-lg text-brand-text">HTTP Interceptors (Proxy)</h3></div>
        <div className="p-4 space-y-3">
          <p className="text-xs text-slate-500">Declarative rules applied to traffic through the Studio proxy. Actions: set_header, set_status, delay_ms.</p>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <Input value={icPattern} onChange={e => setIcPattern(e.target.value)} placeholder="url pattern" />
            <select className="bg-slate-800 border border-slate-700 rounded-md p-2 text-white" value={icPhase} onChange={e => setIcPhase(e.target.value)}>
              <option value="request">request</option><option value="response">response</option>
            </select>
            <select className="bg-slate-800 border border-slate-700 rounded-md p-2 text-white" value={icAction} onChange={e => setIcAction(e.target.value)}>
              <option value="set_header">set_header</option><option value="set_status">set_status</option><option value="delay_ms">delay_ms</option>
            </select>
            <Input value={icParams} onChange={e => setIcParams(e.target.value)} placeholder='{"ms": 3000}' />
          </div>
          <Button onClick={addInterceptor} disabled={!icPattern} icon={<Plus size={14} />}>Add Interceptor</Button>
          {interceptors.map(i => (
            <div key={i.id} className="flex items-center justify-between border border-slate-700 p-2 text-sm">
              <span className="font-mono text-slate-300">[{i.phase}] {i.urlPattern} · {i.action} {JSON.stringify(i.params)}</span>
              <button onClick={() => delInterceptor(i.id)} className="text-rose-400"><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-0">
        <div className="border-b border-brand-text bg-brand-muted p-4 flex items-center gap-2"><Puzzle size={16} /><h3 className="font-serif-italic text-lg text-brand-text">Installed Plugins</h3></div>
        <div className="p-4 space-y-2">
          {plugins.length === 0 && <div className="text-slate-500 italic">No plugins installed. Drop one into mcp/plugins/&lt;name&gt;/.</div>}
          {plugins.map(p => (
            <div key={p.id} className="border border-slate-700 p-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white">{p.name || p.id} <span className="text-xs text-slate-500">v{p.version}</span></span>
                <span className={`text-[10px] uppercase px-2 py-0.5 rounded ${p.valid ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>{p.valid ? 'loaded' : 'invalid'}</span>
              </div>
              <p className="text-sm text-slate-400 mt-1">{p.description || p.error}</p>
              {p.tools && <div className="mt-1 text-xs font-mono text-emerald-400">tools: {p.tools.join(', ')}</div>}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
