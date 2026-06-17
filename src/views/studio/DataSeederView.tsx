import React, { useState } from 'react';
import { PageHeader, Card, Button, Input } from '../../components/ui-elements';
import { Database, Zap, RefreshCw, Box, AlertCircle } from 'lucide-react';

const DataSeederView = () => {
  const [target, setTarget] = useState<'postgres' | 'dynamodb' | 's3'>('postgres');
  const [targetName, setTargetName] = useState('');
  const [connectionString, setConnectionString] = useState('');
  const [customSchema, setCustomSchema] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ status: 'success' | 'error', message: string } | null>(null);

  const handleSeed = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setResult(null);

    let parsedSchema = undefined;
    if (customSchema.trim()) {
      try {
        parsedSchema = JSON.parse(customSchema);
      } catch {
        setResult({ status: 'error', message: 'Invalid JSON schema format' });
        setIsLoading(false);
        return;
      }
    }

    try {
      const res = await fetch('http://localhost:8000/api/extensions/seed-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-floci-sidecar-token': 'open' // using token from memory/config if any, though middleware allows without token if configured
        },
        body: JSON.stringify({
          target,
          target_name: targetName,
          connection_string: connectionString || undefined,
          custom_schema: parsedSchema
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to seed data');
      }

      setResult({ status: 'success', message: data.message });
    } catch (err: any) {
      setResult({ status: 'error', message: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6">
      <PageHeader
        title="Intelligent Data Seeder"
        subtitle="Generate realistic mock datasets for PostgreSQL, DynamoDB, and S3 using Faker."
        icon={<Database size={24} />}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <Card>
          <div className="p-4 border-b border-brand-text/10 bg-brand-muted/30">
            <h3 className="font-bold flex items-center">
              <Zap size={16} className="mr-2 text-brand-green" />
              Configure Seed Operation
            </h3>
          </div>

          <div className="p-6">
            <form onSubmit={handleSeed} className="space-y-6">
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500">Target Type</label>
                <div className="flex gap-4">
                  {(['postgres', 'dynamodb', 's3'] as const).map((t) => (
                    <label key={t} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={target === t}
                        onChange={() => setTarget(t)}
                        className="accent-brand-text"
                      />
                      <span className="text-sm font-medium uppercase tracking-widest">{t}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500">
                  Target Name (Table / Bucket)
                </label>
                <Input
                  value={targetName}
                  onChange={(e) => setTargetName(e.target.value)}
                  placeholder={target === 'postgres' ? 'users' : target === 'dynamodb' ? 'floci-users-table' : 'floci-mock-bucket'}
                  required
                />
              </div>

              {target === 'postgres' && (
                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500">
                    Connection String (Marketplace Recipe)
                  </label>
                  <Input
                    value={connectionString}
                    onChange={(e) => setConnectionString(e.target.value)}
                    placeholder="postgresql://floci:floci@localhost:5432/floci"
                    required={target === 'postgres'}
                  />
                  <p className="text-[10px] text-neutral-400">
                    If connected to a Marketplace PostgreSQL recipe, the seeder will attempt to automatically deduce the schema of the target table.
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500">
                  Custom Schema Override (Optional, JSON)
                </label>
                <textarea
                  value={customSchema}
                  onChange={(e) => setCustomSchema(e.target.value)}
                  placeholder={`{\n  "id": "faker.uuid4",\n  "name": "faker.name",\n  "email": "faker.email"\n}`}
                  className="w-full bg-white border border-brand-text p-3 text-xs font-mono min-h-[120px] focus:outline-none focus:ring-1 focus:ring-brand-text"
                />
              </div>

              <Button
                type="submit"
                disabled={isLoading || !targetName || (target === 'postgres' && !connectionString)}
                className="w-full justify-center"
              >
                {isLoading ? (
                  <RefreshCw size={16} className="animate-spin mr-2" />
                ) : (
                  <Box size={16} className="mr-2" />
                )}
                {isLoading ? 'Seeding Data...' : 'Generate 10 Records'}
              </Button>
            </form>

            {result && (
              <div className={`mt-6 p-4 border flex items-start ${result.status === 'success' ? 'bg-brand-green/10 border-brand-green text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                {result.status === 'error' ? <AlertCircle size={20} className="mr-3 shrink-0" /> : <Database size={20} className="mr-3 shrink-0" />}
                <div>
                  <h4 className="font-bold text-sm mb-1 uppercase tracking-widest">{result.status}</h4>
                  <p className="text-xs font-mono">{result.message}</p>
                </div>
              </div>
            )}
          </div>
        </Card>

        <Card>
          <div className="p-4 border-b border-brand-text/10 bg-brand-muted/30">
            <h3 className="font-bold flex items-center">
              <Box size={16} className="mr-2 text-brand-green" />
              How it works
            </h3>
          </div>
          <div className="p-6 text-sm space-y-4">
            <p>
              The <strong>Intelligent Data Seeder</strong> leverages Python's <code className="bg-brand-muted px-1 py-0.5 rounded">Faker</code> to generate realistic datasets to help you test your applications locally without external dependencies.
            </p>

            <h4 className="font-bold mt-4">PostgreSQL (Marketplace)</h4>
            <p>
              When targeting a PostgreSQL database, the seeder can automatically read the table schema from `information_schema` and deduce appropriate mock data types (e.g., mapping a `VARCHAR` named "email" to `faker.email()`).
            </p>

            <h4 className="font-bold mt-4">DynamoDB & S3</h4>
            <p>
              The seeder interacts directly with the local Floci Studio AWS Emulator (port `4566`). By default, it will insert randomly generated JSON records.
            </p>

            <h4 className="font-bold mt-4">Custom Schemas</h4>
            <p>
              You can override the automatic generation by providing a JSON object. Keys with values starting with <code>faker.</code> will be dynamically executed (e.g., <code>"name": "faker.name"</code>).
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default DataSeederView;