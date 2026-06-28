import React, { useState } from 'react';
import { Database, CirclePlus } from 'lucide-react';
import { PageHeader, Card, Button, Input, Select } from '../components/ui-elements';
import { sidecarApi } from '../lib/sidecarApi';
import { useAws } from '../contexts/AwsContext';

const DataSeederView = () => {
  const { logActivity } = useAws();

  const [target, setTarget] = useState('dynamodb');
  const [targetName, setTargetName] = useState('');
  const [connectionString, setConnectionString] = useState('');
  const [customSchema, setCustomSchema] = useState('');

  const [isSeeding, setIsSeeding] = useState(false);
  const [result, setResult] = useState<{ status: string; message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSeed = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSeeding(true);
    setResult(null);
    setError(null);

    let parsedSchema = undefined;
    if (customSchema.trim()) {
      try {
        parsedSchema = JSON.parse(customSchema);
      } catch {
        setError('Invalid JSON in custom schema');
        setIsSeeding(false);
        return;
      }
    }

    try {
      const response = await sidecarApi.seedData({
        target,
        target_name: targetName,
        connection_string: target === 'postgres' ? connectionString : undefined,
        custom_schema: parsedSchema,
      });
      setResult(response);
      logActivity('DataSeeder', `Seed ${target} ${targetName}`, 'success');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      logActivity('DataSeeder', `Seed failed: ${targetName}`, 'error', errorMessage);
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="flex flex-col h-full uppercase">
      <PageHeader
        title="Data Seeder"
        icon={<Database size={18} />}
      />

      <div className="p-6 flex-1 overflow-auto bg-brand-bg flex justify-center">
        <Card className="max-w-2xl w-full">
          <form onSubmit={handleSeed} className="space-y-6">
            <div>
              <label className="block text-[10px] font-bold mb-2">Target System</label>
              <Select
                value={target}
                onChange={(e) => setTarget(e.target.value)}
              >
                <option value="dynamodb">DynamoDB</option>
                <option value="s3">S3 Bucket</option>
                <option value="postgres">PostgreSQL</option>
              </Select>
            </div>

            <div>
              <label className="block text-[10px] font-bold mb-2">
                Target Name (Table/Bucket name)
              </label>
              <Input
                value={targetName}
                onChange={(e) => setTargetName(e.target.value)}
                placeholder={target === 's3' ? 'my-bucket' : 'my-table'}
                required
              />
            </div>

            {target === 'postgres' && (
              <div>
                <label className="block text-[10px] font-bold mb-2">
                  Connection String (Required for Postgres)
                </label>
                <Input
                  value={connectionString}
                  onChange={(e) => setConnectionString(e.target.value)}
                  placeholder="postgresql://user:password@localhost:5432/dbname"
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-[10px] font-bold mb-2 flex justify-between">
                <span>Custom Schema (Optional JSON)</span>
                <span className="opacity-50 text-[9px] normal-case">Use faker.* for generated values</span>
              </label>
              <textarea
                value={customSchema}
                onChange={(e) => setCustomSchema(e.target.value)}
                className="w-full bg-brand-bg border border-brand-text p-3 text-[10px] font-mono h-32 focus:outline-none focus:ring-1 focus:ring-brand-text normal-case"
                placeholder={'{\n  "id": "faker.uuid4",\n  "name": "faker.name",\n  "email": "faker.email"\n}'}
              />
            </div>

            {error && (
              <div className="bg-rose-50 border border-rose-600 text-rose-700 text-xs p-4 normal-case font-mono whitespace-pre-wrap">
                {error}
              </div>
            )}

            {result && result.status === 'success' && (
              <div className="bg-emerald-50 border border-emerald-600 text-emerald-800 text-xs p-4 normal-case font-mono">
                {result.message}
              </div>
            )}

            <Button
              type="submit"
              disabled={isSeeding || !targetName || (target === 'postgres' && !connectionString)}
              className="w-full justify-center"
              icon={<CirclePlus size={16} />}
            >
              {isSeeding ? 'Seeding Data...' : 'Seed Data'}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default DataSeederView;
