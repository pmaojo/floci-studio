import { useState } from 'react';
import { PageHeader, Card, Button, Input } from '../components/ui-elements';
import { Database, Play, CheckCircle2, AlertCircle, DatabaseZap } from 'lucide-react';
import { sidecarApi } from '../lib/sidecarApi';
import { useAws } from '../contexts/AwsContext';

const DataSeederView = () => {
  const { logActivity } = useAws();

  const [target, setTarget] = useState<'postgres' | 'dynamodb' | 's3'>('postgres');
  const [targetName, setTargetName] = useState('');
  const [connectionString, setConnectionString] = useState('postgresql://postgres:postgres@localhost:5432/floci_db');

  const [customSchemaStr, setCustomSchemaStr] = useState('');
  const [isSeeding, setIsSeeding] = useState(false);
  const [result, setResult] = useState<{ status: 'success' | 'error'; message: string } | null>(null);

  const handleSeed = async () => {
    setResult(null);
    setIsSeeding(true);

    try {
      let schema: Record<string, any> | undefined;

      if (customSchemaStr.trim()) {
        try {
          schema = JSON.parse(customSchemaStr);
        } catch {
          throw new Error('Invalid JSON format in custom schema');
        }
      }

      const res = await sidecarApi.seedData(
        target,
        targetName,
        target === 'postgres' ? connectionString : undefined,
        schema
      );

      setResult(res as { status: 'success' | 'error'; message: string });
      logActivity('DataSeeder', `Seeded ${target}: ${targetName}`, res.status === 'success' ? 'success' : 'error');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setResult({ status: 'error', message });
      logActivity('DataSeeder', `Seed failed: ${targetName}`, 'error', message);
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="p-4 lg:p-8 space-y-8 flex-1 overflow-auto bg-brand-bg relative min-h-full">
      <PageHeader
        title="Visual Data Seeder"
        icon={<DatabaseZap size={18} />}
        onRefresh={() => {}}
        isRefreshing={isSeeding}
        actions={
          <Button
            onClick={handleSeed}
            disabled={isSeeding || !targetName || (target === 'postgres' && !connectionString)}
            icon={<Play size={14} />}
            variant="primary"
          >
            {isSeeding ? 'SEEDING...' : 'RUN_SEEDER'}
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <Card className="p-6">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-brand-text mb-4 border-b border-brand-text/20 pb-2">Configuration</h3>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[9px] font-bold uppercase font-mono tracking-wider opacity-60">Target Engine</label>
                <select
                  className="w-full bg-white border border-brand-text px-3 py-2 text-xs focus:outline-none uppercase font-bold font-mono tracking-tight cursor-pointer"
                  value={target}
                  onChange={(e) => setTarget(e.target.value as 'postgres' | 'dynamodb' | 's3')}
                >
                  <option value="postgres">PostgreSQL (Marketplace)</option>
                  <option value="dynamodb">DynamoDB (Localstack)</option>
                  <option value="s3">S3 (Localstack)</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-bold uppercase font-mono tracking-wider opacity-60">
                  {target === 's3' ? 'Bucket Name' : 'Table Name'}
                </label>
                <Input
                  placeholder={target === 's3' ? 'my-bucket' : 'users_table'}
                  value={targetName}
                  onChange={(e) => setTargetName(e.target.value)}
                  className="font-mono text-xs"
                />
              </div>

              {target === 'postgres' && (
                <div className="space-y-2">
                  <label className="text-[9px] font-bold uppercase font-mono tracking-wider opacity-60">Connection String</label>
                  <Input
                    placeholder="postgresql://user:pass@host:port/db"
                    value={connectionString}
                    onChange={(e) => setConnectionString(e.target.value)}
                    className="font-mono text-xs"
                  />
                  <p className="text-[8px] opacity-50 italic">Must match your marketplace deployment credentials.</p>
                </div>
              )}
            </div>
          </Card>

          {result && (
            <Card className={`p-4 border-l-4 ${result.status === 'success' ? 'border-l-brand-green bg-brand-green/5' : 'border-l-rose-500 bg-rose-500/5'}`}>
              <div className="flex items-start gap-3">
                {result.status === 'success' ? (
                  <CheckCircle2 size={16} className="text-brand-green shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle size={16} className="text-rose-500 shrink-0 mt-0.5" />
                )}
                <div>
                  <h4 className="text-[10px] font-bold uppercase tracking-wider mb-1">
                    {result.status === 'success' ? 'Seeding Successful' : 'Seeding Failed'}
                  </h4>
                  <p className="text-[10px] font-mono opacity-80 break-words">{result.message}</p>
                </div>
              </div>
            </Card>
          )}
        </div>

        <div className="lg:col-span-2 space-y-6">
          <Card className="p-0 flex flex-col h-[500px]">
            <div className="p-4 border-b border-brand-text/10 bg-brand-muted/20 flex justify-between items-center">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-brand-text flex items-center gap-2">
                <Database size={14} />
                Schema Definition (Optional)
              </h3>
            </div>
            <div className="flex-1 p-4 flex flex-col space-y-2">
              <p className="text-[10px] opacity-60">
                Define the shape of the generated data using JSON. Use the <code>faker.</code> prefix for values to generate random data (e.g., <code>"faker.name"</code>, <code>"faker.email"</code>, <code>"faker.uuid4"</code>). Leave empty to use auto-inference for Postgres, or default schemas for DynamoDB/S3.
              </p>
              <textarea
                className="flex-1 w-full bg-white border border-brand-text/20 p-4 font-mono text-[11px] focus:outline-none focus:border-brand-text resize-none"
                placeholder={`{\n  "id": "faker.uuid4",\n  "name": "faker.name",\n  "email": "faker.email",\n  "status": "active"\n}`}
                value={customSchemaStr}
                onChange={(e) => setCustomSchemaStr(e.target.value)}
              />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DataSeederView;
