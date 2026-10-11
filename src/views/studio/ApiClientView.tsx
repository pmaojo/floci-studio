import { useState } from 'react';
import { Card, Button, Input } from '../../components/ui-elements';

interface ProxyResponse {
  status: number;
  latency_ms: number;
  body: unknown;
}

export default function ApiClientView() {
  const [method, setMethod] = useState('GET');
  const [url, setUrl] = useState('http://localhost:4566/restapis');
  const [body, setBody] = useState('');
  const [response, setResponse] = useState<ProxyResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSend = async () => {
    setLoading(true);
    setError('');
    setResponse(null);
    try {
      let parsedBody = undefined;
      if (body) {
        try { parsedBody = JSON.parse(body); } catch { parsedBody = body; }
      }

      const res = await fetch('/sidecar/api/studio/client/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method, url, body: parsedBody })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Proxy request failed');
      setResponse(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Integrated API Client</h1>
        <p className="text-slate-400">CORS-free workbench to test your local API Gateway and external endpoints</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1">
        <Card className="flex flex-col p-0">
          <div className="border-b border-brand-text bg-brand-muted p-4">
            <h3 className="font-serif-italic text-lg text-brand-text">Request</h3>
          </div>
          <div className="p-4 space-y-4 flex-1">
            <div className="flex space-x-2">
              <select
                className="bg-slate-800 border border-slate-700 rounded-md p-2 text-white font-medium"
                value={method}
                onChange={e => setMethod(e.target.value)}
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="DELETE">DELETE</option>
              </select>
              <Input
                className="flex-1"
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="http://localhost:4566/..."
              />
              <Button onClick={handleSend} disabled={loading}>
                {loading ? 'Sending...' : 'Send'}
              </Button>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Body (JSON/Text)</label>
              <textarea
                className="w-full h-64 bg-slate-900 border border-slate-700 rounded-md p-3 text-green-400 font-mono text-sm"
                value={body}
                onChange={e => setBody(e.target.value)}
                placeholder='{"key": "value"}'
                disabled={method === 'GET' || method === 'DELETE'}
              />
            </div>
          </div>
        </Card>

        <Card className="flex flex-col p-0">
          <div className="flex flex-row justify-between items-center border-b border-brand-text bg-brand-muted p-4">
            <h3 className="font-serif-italic text-lg text-brand-text">Response</h3>
            {response && (
              <div className="flex space-x-2">
                <span className={`px-2 py-1 text-xs rounded ${response.status < 400 ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
                  {response.status}
                </span>
                <span className="px-2 py-1 text-xs border border-slate-600 rounded text-slate-400">{response.latency_ms} ms</span>
              </div>
            )}
          </div>
          <div className="p-4 flex-1 overflow-auto bg-slate-950">
            {error && <div className="text-red-400">{error}</div>}
            {response ? (
              <pre className="text-xs text-blue-300 font-mono break-all whitespace-pre-wrap">
                {typeof response.body === 'object' ? JSON.stringify(response.body, null, 2) : String(response.body ?? '')}
              </pre>
            ) : (
              !error && <div className="text-slate-600 italic">No response yet.</div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
