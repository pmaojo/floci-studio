import { useEffect, useState } from 'react';
import { Card, Button } from '../../components/ui-elements';
import { RefreshCw, AlertTriangle, RotateCcw, Inbox } from 'lucide-react';

interface DlqSource { url: string; name: string; }
interface Dlq { dlqArn: string; dlqUrl: string; name: string; messageCount: number; sources: DlqSource[]; }
interface DlqMessage { MessageId?: string; Body?: string; failureReason?: { approximateReceiveCount?: string | number | null }; }

export default function DlqView() {
  const [dlqs, setDlqs] = useState<Dlq[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<Dlq | null>(null);
  const [messages, setMessages] = useState<DlqMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  const load = async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch('/sidecar/api/observability/dlq');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load DLQs');
      setDlqs(data.deadLetterQueues || []);
    } catch (e) { setError((e as Error).message); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const inspect = async (dlq: Dlq) => {
    setSelected(dlq); setMessages([]); setNotice('');
    try {
      const res = await fetch(`/sidecar/api/observability/dlq/messages?dlq_url=${encodeURIComponent(dlq.dlqUrl)}&max_messages=10`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to inspect');
      setMessages(data.messages || []);
    } catch (e) { setError((e as Error).message); }
  };

  const redrive = async (dlq: Dlq, sourceUrl: string) => {
    setBusy(true); setNotice('');
    try {
      const res = await fetch('/sidecar/api/observability/dlq/redrive', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dlq_url: dlq.dlqUrl, source_url: sourceUrl, max_messages: 10 })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Redrive failed');
      setNotice(`Redriven ${data.redriven} message(s) to ${sourceUrl.split('/').pop()}`);
      await load();
      if (selected) inspect({ ...dlq });
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2"><AlertTriangle className="text-amber-500" /> Dead Letter Queues</h1>
          <p className="text-slate-400">Monitor failed messages and one-click redrive them back to the source queue</p>
        </div>
        <Button variant="secondary" onClick={load} icon={<RefreshCw size={14} className={loading ? 'animate-spin' : ''} />}>Refresh</Button>
      </div>

      {error && <div className="text-red-400 bg-red-900/20 p-3 rounded">{error}</div>}
      {notice && <div className="text-green-400 bg-green-900/20 p-3 rounded">{notice}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-0">
          <div className="border-b border-brand-text bg-brand-muted p-4"><h3 className="font-serif-italic text-lg text-brand-text">Active DLQs</h3></div>
          <div className="p-4 space-y-3">
            {loading && <div className="text-slate-500 italic">Loading...</div>}
            {!loading && dlqs.length === 0 && <div className="text-slate-500 italic">No dead letter queues detected. Configure a RedrivePolicy on a queue first.</div>}
            {dlqs.map(dlq => (
              <div key={dlq.dlqArn} className={`border p-3 cursor-pointer transition-colors ${selected?.dlqArn === dlq.dlqArn ? 'border-amber-500 bg-amber-900/10' : 'border-slate-700 hover:border-slate-500'}`} onClick={() => inspect(dlq)}>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm text-white">{dlq.name}</span>
                  <span className={`px-2 py-0.5 text-xs rounded ${dlq.messageCount > 0 ? 'bg-amber-900/50 text-amber-400' : 'bg-slate-800 text-slate-500'}`}>{dlq.messageCount} msgs</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {dlq.sources.map(s => (
                    <button key={s.url} disabled={busy || dlq.messageCount === 0}
                      onClick={(e) => { e.stopPropagation(); redrive(dlq, s.url); }}
                      className="inline-flex items-center gap-1 text-[10px] uppercase font-bold px-2 py-1 border border-slate-600 text-slate-300 hover:bg-slate-700 disabled:opacity-40">
                      <RotateCcw size={11} /> Redrive → {s.name}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-0">
          <div className="border-b border-brand-text bg-brand-muted p-4 flex items-center gap-2"><Inbox size={16} /><h3 className="font-serif-italic text-lg text-brand-text">Failed Messages {selected ? `· ${selected.name}` : ''}</h3></div>
          <div className="p-4 space-y-3 max-h-[60vh] overflow-auto">
            {!selected && <div className="text-slate-500 italic">Select a DLQ to inspect its messages.</div>}
            {selected && messages.length === 0 && <div className="text-slate-500 italic">No messages currently visible in this queue.</div>}
            {messages.map((m, i) => (
              <div key={m.MessageId || i} className="bg-slate-950 border border-slate-800 p-3">
                <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                  <span className="font-mono">{m.MessageId}</span>
                  <span>receives: {m.failureReason?.approximateReceiveCount ?? '?'}</span>
                </div>
                <pre className="text-xs text-blue-300 font-mono whitespace-pre-wrap break-all">{m.Body}</pre>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
