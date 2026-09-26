import { useState } from 'react';
import { Card, Button, Input, PageHeader } from '../../components/ui-elements';
import { sidecarApi } from '../../lib/sidecarApi';
import { useAws } from '../../contexts/AwsContext';
import { Database, AlertTriangle, Play } from 'lucide-react';

export default function DataSeederView() {
  const { logActivity } = useAws();
  const [target, setTarget] = useState('postgres');
  const [targetName, setTargetName] = useState('');
  const [connectionString, setConnectionString] = useState('');
  const [customSchema, setCustomSchema] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSeed = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    let parsedSchema = undefined;
    if (customSchema) {
      try {
        parsedSchema = JSON.parse(customSchema);
      } catch {
        setError('Invalid JSON in custom schema');
        setLoading(false);
        return;
      }
    }

    try {
      const response = await sidecarApi.seedData({
        target,
        target_name: targetName,
        connection_string: target === 'postgres' ? connectionString : undefined,
        custom_schema: parsedSchema
      });
      setSuccess(response.message || 'Seeding successful!');
      logActivity('DataSeeder', `Seeded ${target} - ${targetName}`, 'success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      logActivity('DataSeeder', `Failed to seed ${target} - ${targetName}`, 'error', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      <PageHeader
        title="Visual Data Seeder"
        subtitle="Instantly populate your local databases, queues, and buckets with realistic mock data."
        icon={<Database className="w-8 h-8 text-brand-text" />}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Configuration" className="flex flex-col">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Target Engine</label>
              <select
                className="w-full bg-slate-900 border border-slate-700 rounded-md p-2 text-white font-medium"
                value={target}
                onChange={e => setTarget(e.target.value)}
              >
                <option value="postgres">PostgreSQL</option>
                <option value="dynamodb">DynamoDB Table</option>
                <option value="s3">S3 Bucket</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Target Name (Table or Bucket)</label>
              <Input
                value={targetName}
                onChange={e => setTargetName(e.target.value)}
                placeholder={target === 'postgres' ? 'users' : target === 'dynamodb' ? 'OrdersTable' : 'my-bucket'}
              />
            </div>

            {target === 'postgres' && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Connection String</label>
                <Input
                  value={connectionString}
                  onChange={e => setConnectionString(e.target.value)}
                  placeholder="postgresql://user:pass@localhost:5432/mydb"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Custom Schema (JSON Faker Mapping - Optional)</label>
              <textarea
                className="w-full h-48 bg-slate-900 border border-slate-700 rounded-md p-3 text-green-400 font-mono text-sm"
                value={customSchema}
                onChange={e => setCustomSchema(e.target.value)}
                placeholder={'{\n  "id": "faker.uuid4",\n  "name": "faker.name",\n  "email": "faker.email"\n}'}
              />
              <p className="text-xs text-slate-500 mt-1">If left blank, Floci will automatically deduce the schema (Postgres) or use defaults.</p>
            </div>

            <Button onClick={handleSeed} disabled={loading || !targetName || (target === 'postgres' && !connectionString)} className="w-full flex items-center justify-center space-x-2">
              <Play size={16} />
              <span>{loading ? 'Seeding Data...' : 'Start Seeding'}</span>
            </Button>
          </div>
        </Card>

        <div className="space-y-6">
          <Card title="Results Console" className="h-full min-h-[300px] flex flex-col bg-slate-950">
            {error && (
              <div className="bg-red-900/20 border border-red-500/50 text-red-400 p-4 rounded flex items-start space-x-3">
                <AlertTriangle size={20} className="shrink-0 mt-0.5" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            {success && (
              <div className="bg-green-900/20 border border-green-500/50 text-green-400 p-4 rounded text-sm">
                {success}
              </div>
            )}

            {!error && !success && (
              <div className="text-slate-600 text-sm italic flex-1 flex items-center justify-center">
                Ready to seed data. Results will appear here.
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
