import { useEffect, useState } from 'react';
import { Card, Button, Input } from '../../components/ui-elements';
import { RefreshCw, Play, Trash2, Plus, Clock } from 'lucide-react';

interface FREvent {
  id: string; status: string; targetType: string; target: string;
  label: string; source?: string; payload: unknown; capturedAt: number;
  replayedAt?: number | null; result?: unknown;
}

const statusColor: Record<string, string> = {
  held: 'bg-amber-900/50 text-amber-400',
  replayed: 'bg-green-900/50 text-green-400',
  discarded: 'bg-slate-800 text-slate-500',
};

export default function FlightRecorderView() {
  const [events, setEvents] = useState<FREvent[]>([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [editing, setEditing] = useState<Record<string, string>>({});

  // capture form
  const [targetType, setTargetType] = useState('sqs');
  const [target, setTarget] = useState('');
  const [payload, setPayload] = useState('{\n  "hello": "world"\n}');

  const load = async () => {
    try {
      const res = await fetch('/sidecar/api/observability/flight-recorder');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load');
      setEvents(data.events || []);
    } catch (e) { setError((e as Error).message); }
  };
  useEffect(() => { load(); }, []);

  const capture = async () => {
    setError(''); setNotice('');
    try {
      let parsed: unknown = payload;
      try { parsed = JSON.parse(payload); } catch { /* keep as string */ }
      const res = await fetch('/sidecar/api/observability/flight-recorder', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_type: targetType, target, payload: parsed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Capture failed');
      setNotice('Event captured and held for inspection.');
      await load();
    } catch (e) { setError((e as Error).message); }
  };

  const saveEdit = async (ev: FREvent) => {
    try {
      let parsed: unknown = editing[ev.id];
      try { parsed = JSON.parse(editing[ev.id]); } catch { /* keep string */ }
      const res = await fetch(`/sidecar/api/observability/flight-recorder/${ev.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payload: parsed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Update failed');
      setNotice('Payload updated.'); await load();
    } catch (e) { setError((e as Error).message); }
  };

  const replay = async (ev: FREvent) => {
    try {
      const res = await fetch(`/sidecar/api/observability/flight-recorder/${ev.id}/replay`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Replay failed');
      setNotice(`Replayed ${ev.label}.`); await load();
    } catch (e) { setError((e as Error).message); }
  };

  const discard = async (ev: FREvent) => {
    await fetch(`/sidecar/api/observability/flight-recorder/${ev.id}`, { method: 'DELETE' });
    await load();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2"><Clock className="text-blue-400" /> Flight Recorder · Time-Travel</h1>
        <p className="text-slate-400">Hold an in-flight event, inspect and edit its JSON payload, then resume its journey to the real target</p>
      </div>

      {error && <div className="text-red-400 bg-red-900/20 p-3 rounded">{error}</div>}
      {notice && <div className="text-green-400 bg-green-900/20 p-3 rounded">{notice}</div>}

      <Card className="p-0">
        <div className="border-b border-brand-text bg-brand-muted p-4"><h3 className="font-serif-italic text-lg text-brand-text">Capture / Hold Event</h3></div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Target type</label>
            <select className="w-full bg-slate-800 border border-slate-700 rounded-md p-2 text-white" value={targetType} onChange={e => setTargetType(e.target.value)}>
              <option value="sqs">SQS (QueueUrl)</option>
              <option value="sns">SNS (TopicArn)</option>
              <option value="eventbridge">EventBridge (bus)</option>
              <option value="lambda">Lambda (name)</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-300 mb-1">Target</label>
            <Input value={target} onChange={e => setTarget(e.target.value)} placeholder="queue url / topic arn / bus name / function name" />
          </div>
          <div className="md:col-span-3">
            <label className="block text-xs font-medium text-slate-300 mb-1">Payload (JSON)</label>
            <textarea className="w-full h-28 bg-slate-900 border border-slate-700 rounded-md p-3 text-green-400 font-mono text-sm" value={payload} onChange={e => setPayload(e.target.value)} />
          </div>
          <div><Button onClick={capture} icon={<Plus size={14} />}>Hold Event</Button></div>
        </div>
      </Card>

      <Card className="p-0">
        <div className="border-b border-brand-text bg-brand-muted p-4 flex items-center justify-between">
          <h3 className="font-serif-italic text-lg text-brand-text">Captured Events</h3>
          <button onClick={load}><RefreshCw size={14} /></button>
        </div>
        <div className="p-4 space-y-3">
          {events.length === 0 && <div className="text-slate-500 italic">No events captured yet.</div>}
          {events.map(ev => (
            <div key={ev.id} className="border border-slate-700 p-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 text-[10px] uppercase rounded ${statusColor[ev.status] || ''}`}>{ev.status}</span>
                  <span className="font-mono text-sm text-white">{ev.label}</span>
                </div>
                <div className="flex gap-2">
                  {ev.status === 'held' && <Button size="sm" onClick={() => replay(ev)} icon={<Play size={12} />}>Replay</Button>}
                  {ev.status === 'held' && <Button size="sm" variant="danger" onClick={() => discard(ev)} icon={<Trash2 size={12} />}>Discard</Button>}
                </div>
              </div>
              {ev.status === 'held' && (
                <div className="mt-3">
                  <textarea
                    className="w-full h-24 bg-slate-900 border border-slate-700 rounded-md p-2 text-green-400 font-mono text-xs"
                    value={editing[ev.id] ?? JSON.stringify(ev.payload, null, 2)}
                    onChange={e => setEditing({ ...editing, [ev.id]: e.target.value })}
                  />
                  <Button size="sm" variant="secondary" className="mt-2" onClick={() => saveEdit(ev)}>Save Payload</Button>
                </div>
              )}
              {ev.result != null && <pre className="mt-2 text-[11px] text-blue-300 font-mono whitespace-pre-wrap break-all bg-slate-950 p-2">{JSON.stringify(ev.result, null, 2)}</pre>}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
