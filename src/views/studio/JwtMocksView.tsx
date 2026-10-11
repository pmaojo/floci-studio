import { useState } from 'react';
import { Card, Button, Input } from '../../components/ui-elements';

export default function JwtMocksView() {
  const [claims, setClaims] = useState('{\n  "sub": "user_123",\n  "role": "admin"\n}');
  const [secret, setSecret] = useState('local-secret-key-123');
  const [algorithm, setAlgorithm] = useState('HS256');
  const [token, setToken] = useState('');
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    try {
      const parsedClaims = JSON.parse(claims);
      const res = await fetch('/sidecar/api/studio/auth/generate-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claims: parsedClaims, secret, algorithm })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate token');
      setToken(data.token);
      setError('');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
      setToken('');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">JWT Mocks Generator</h1>
        <p className="text-slate-400">Generate local JWTs for testing API Gateway authorizers and Lambda functions</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-0">
          <div className="border-b border-brand-text bg-brand-muted p-4">
            <h3 className="font-serif-italic text-lg text-brand-text">Configuration</h3>
          </div>
          <div className="p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Algorithm</label>
              <select
                className="w-full bg-slate-800 border border-slate-700 rounded-md p-2 text-white"
                value={algorithm}
                onChange={e => setAlgorithm(e.target.value)}
              >
                <option value="HS256">HS256</option>
                <option value="HS384">HS384</option>
                <option value="HS512">HS512</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Secret Key</label>
              <Input
                value={secret}
                onChange={e => setSecret(e.target.value)}
                placeholder="Your secret key..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">JSON Claims Payload</label>
              <textarea
                className="w-full h-40 bg-slate-900 border border-slate-700 rounded-md p-3 text-green-400 font-mono text-sm"
                value={claims}
                onChange={e => setClaims(e.target.value)}
              />
            </div>

            <Button onClick={handleGenerate} className="w-full">Generate JWT</Button>
          </div>
        </Card>

        <Card className="p-0">
          <div className="border-b border-brand-text bg-brand-muted p-4">
            <h3 className="font-serif-italic text-lg text-brand-text">Resulting Token</h3>
          </div>
          <div className="p-4">
            {error && <div className="text-red-400 bg-red-900/20 p-3 rounded mb-4">{error}</div>}
            {token && (
              <div className="space-y-4">
                <div className="bg-slate-900 p-4 rounded-md break-all font-mono text-blue-400 text-sm">
                  {token}
                </div>
                <Button variant="secondary" onClick={() => navigator.clipboard.writeText(token)}>
                  Copy to Clipboard
                </Button>
              </div>
            )}
            {!token && !error && <div className="text-slate-500 italic">Configure settings and click generate.</div>}
          </div>
        </Card>
      </div>
    </div>
  );
}
