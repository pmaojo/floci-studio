import { useEffect, useState } from 'react';
import { Card, Button, Input } from '../../components/ui-elements';
import { Cloud, Database, Globe, Play, Square } from 'lucide-react';

function Notice({ ok, msg }: { ok: boolean; msg: string }) {
  if (!msg) return null;
  return <div className={`p-2 text-sm rounded ${ok ? 'text-green-400 bg-green-900/20' : 'text-red-400 bg-red-900/20'}`}>{msg}</div>;
}

export default function HybridView() {
  // cloud seed
  const [seedSource, setSeedSource] = useState('');
  const [seedTarget, setSeedTarget] = useState('');
  const [seedMsg, setSeedMsg] = useState(''); const [seedOk, setSeedOk] = useState(false);
  // cloud proxy
  const [proxyQueue, setProxyQueue] = useState('');
  const [proxyType, setProxyType] = useState('lambda');
  const [proxyTarget, setProxyTarget] = useState('');
  const [proxyMsg, setProxyMsg] = useState(''); const [proxyOk, setProxyOk] = useState(false);
  // tunnels
  const [port, setPort] = useState('4566');
  const [tunnels, setTunnels] = useState<any[]>([]);
  const [tunnelMsg, setTunnelMsg] = useState(''); const [tunnelOk, setTunnelOk] = useState(false);

  const loadTunnels = async () => {
    const res = await fetch('/sidecar/api/hybrid/tunnels');
    const data = await res.json();
    setTunnels(data.tunnels || []);
  };
  useEffect(() => { loadTunnels(); }, []);

  const runSeed = async () => {
    setSeedMsg('');
    const res = await fetch('/sidecar/api/hybrid/seed-from-cloud', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source_table: seedSource, target_table: seedTarget || undefined }),
    });
    const data = await res.json();
    setSeedOk(res.ok && data.status === 'success');
    setSeedMsg(res.ok ? (data.message || `Imported ${data.imported} record(s)`) : (data.error || 'Failed'));
  };

  const runProxy = async () => {
    setProxyMsg('');
    const res = await fetch('/sidecar/api/hybrid/cloud-proxy/sqs', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source_queue_url: proxyQueue, target_type: proxyType, target: proxyTarget }),
    });
    const data = await res.json();
    setProxyOk(res.ok && data.status === 'success');
    setProxyMsg(res.ok ? `Forwarded ${data.forwarded} message(s)` : (data.error || 'Failed'));
  };

  const startTunnel = async () => {
    setTunnelMsg('');
    const res = await fetch('/sidecar/api/hybrid/tunnels', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ port: parseInt(port, 10) }),
    });
    const data = await res.json();
    setTunnelOk(data.status === 'started' || data.status === 'starting');
    setTunnelMsg(data.url ? `Public URL: ${data.url}` : (data.message || `Tunnel ${data.status}`));
    await loadTunnels();
  };
  const stopTunnel = async (pid: number) => { await fetch(`/sidecar/api/hybrid/tunnels/${pid}`, { method: 'DELETE' }); await loadTunnels(); };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2"><Cloud className="text-sky-400" /> Hybrid Development</h1>
        <p className="text-slate-400">Bridge local and real AWS — seed from the cloud, proxy live traffic, expose local endpoints to the internet</p>
      </div>

      <Card className="p-0">
        <div className="border-b border-brand-text bg-brand-muted p-4 flex items-center gap-2"><Database size={16} /><h3 className="font-serif-italic text-lg text-brand-text">Data Seeding from Cloud</h3></div>
        <div className="p-4 space-y-3">
          <p className="text-xs text-slate-500">Scans a real DynamoDB table, anonymizes sensitive fields and writes them into the local emulator. Requires real AWS credentials in the backend env.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input value={seedSource} onChange={e => setSeedSource(e.target.value)} placeholder="Source table (real AWS)" />
            <Input value={seedTarget} onChange={e => setSeedTarget(e.target.value)} placeholder="Local target table (optional)" />
          </div>
          <Button onClick={runSeed} disabled={!seedSource}>Seed from Cloud</Button>
          <Notice ok={seedOk} msg={seedMsg} />
        </div>
      </Card>

      <Card className="p-0">
        <div className="border-b border-brand-text bg-brand-muted p-4 flex items-center gap-2"><Cloud size={16} /><h3 className="font-serif-italic text-lg text-brand-text">Live Cloud Proxy (SQS → Local)</h3></div>
        <div className="p-4 space-y-3">
          <p className="text-xs text-slate-500">Drains messages from a real SQS queue and forwards them to a local resource for an immediate feedback loop.</p>
          <Input value={proxyQueue} onChange={e => setProxyQueue(e.target.value)} placeholder="Real source queue URL" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <select className="bg-slate-800 border border-slate-700 rounded-md p-2 text-white" value={proxyType} onChange={e => setProxyType(e.target.value)}>
              <option value="lambda">→ Lambda</option>
              <option value="sqs">→ Local SQS</option>
              <option value="sns">→ Local SNS</option>
            </select>
            <Input value={proxyTarget} onChange={e => setProxyTarget(e.target.value)} placeholder="Local target (name/url/arn)" />
          </div>
          <Button onClick={runProxy} disabled={!proxyQueue || !proxyTarget}>Drain & Forward</Button>
          <Notice ok={proxyOk} msg={proxyMsg} />
        </div>
      </Card>

      <Card className="p-0">
        <div className="border-b border-brand-text bg-brand-muted p-4 flex items-center gap-2"><Globe size={16} /><h3 className="font-serif-italic text-lg text-brand-text">Reverse Tunnels</h3></div>
        <div className="p-4 space-y-3">
          <p className="text-xs text-slate-500">Expose a local port to the internet via cloudflared/ngrok for testing third-party webhooks (Stripe, GitHub).</p>
          <div className="flex gap-2 items-end">
            <div><label className="block text-xs text-slate-300 mb-1">Port</label><Input className="w-28" value={port} onChange={e => setPort(e.target.value)} /></div>
            <Button onClick={startTunnel} icon={<Play size={14} />}>Open Tunnel</Button>
          </div>
          <Notice ok={tunnelOk} msg={tunnelMsg} />
          {tunnels.map(t => (
            <div key={t.pid} className="flex items-center justify-between border border-slate-700 p-2 text-sm">
              <span className="font-mono text-slate-300">:{t.port} → {t.url || '(starting...)'} <span className="text-slate-500">[{t.binary}]</span></span>
              <Button size="sm" variant="danger" onClick={() => stopTunnel(t.pid)} icon={<Square size={11} />}>Stop</Button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
