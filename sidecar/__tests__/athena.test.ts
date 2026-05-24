import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { buildTestApp } from './testHarness';

describe('Athena Service & Router', () => {
  const statePath = path.join('.sidecar-state', 'athena-queries.json');

  beforeEach(async () => {
    // Clear out stored state before each test
    try {
      await fs.unlink(statePath);
    } catch {}
  });

  afterEach(async () => {
    try {
      await fs.unlink(statePath);
    } catch {}
  });

  it('runs natively when the AWS CLI supports athena', async () => {
    const nativeResponder = async (args: string[]): Promise<unknown> => {
      if (args[0] === 'athena' && args[1] === 'start-query-execution') {
        return { QueryExecutionId: 'query-native-123' };
      }
      if (args[0] === 'athena' && args[1] === 'get-query-execution') {
        return {
          QueryExecution: {
            Status: {
              State: 'SUCCEEDED',
            },
          },
        };
      }
      if (args[0] === 'athena' && args[1] === 'get-query-results') {
        return {
          ResultSet: {
            ResultSetMetadata: {
              ColumnInfo: [
                { Name: 'id', Type: 'string' },
                { Name: 'value', Type: 'int' },
              ],
            },
            Rows: [
              { Data: [{ VarCharValue: 'id' }, { VarCharValue: 'value' }] }, // Headers matching columns
              { Data: [{ VarCharValue: 'row-1' }, { VarCharValue: '42' }] },
            ],
          },
        };
      }
      return {};
    };

    const { app } = buildTestApp(nativeResponder);

    const postRes = await request(app)
      .post('/api/athena/query')
      .send({ query: 'SELECT * FROM test_table', database: 'default' });

    expect(postRes.status).toBe(200);
    expect(postRes.body.ok).toBe(true);
    expect(postRes.body.queryExecutionId).toBeDefined();

    const queryId = postRes.body.queryExecutionId;

    // Small delay to let the background promise transition
    await new Promise((resolve) => setTimeout(resolve, 1200));

    const statusRes = await request(app).get(`/api/athena/query/${queryId}`);
    expect(statusRes.status).toBe(200);
    expect(statusRes.body.execution.status).toBe('SUCCEEDED');
    expect(statusRes.body.execution.results.columns).toEqual([
      { name: 'id', type: 'string' },
      { name: 'value', type: 'int' },
    ]);
    expect(statusRes.body.execution.results.rows).toEqual([['row-1', '42']]);

    // Check query results endpoint
    const resultsRes = await request(app).get(`/api/athena/query/${queryId}/results`);
    expect(resultsRes.status).toBe(200);
    expect(resultsRes.body.results.rows).toEqual([['row-1', '42']]);
  });

  it('falls back to emulator when AWS CLI is not available or unsupported', async () => {
    // An empty responder simulates AWS CLI unsupported command errors
    const unsupportedResponder = async (): Promise<unknown> => {
      throw new Error('aws: error: argument command: Invalid choice, valid choices are...');
    };

    const { app } = buildTestApp(unsupportedResponder);

    const postRes = await request(app)
      .post('/api/athena/query')
      .send({ query: 'SELECT * FROM web_logs LIMIT 3', database: 'default' });

    expect(postRes.status).toBe(200);
    const queryId = postRes.body.queryExecutionId;

    await new Promise((resolve) => setTimeout(resolve, 800));

    const statusRes = await request(app).get(`/api/athena/query/${queryId}`);
    expect(statusRes.status).toBe(200);
    expect(statusRes.body.execution.status).toBe('SUCCEEDED');
    expect(statusRes.body.execution.results.columns).toBeDefined();
    expect(statusRes.body.execution.results.rows.length).toBe(3);

    // Verify correct emulation matching web_logs structure
    const cols = statusRes.body.execution.results.columns.map((c: any) => c.name);
    expect(cols).toContain('timestamp');
    expect(cols).toContain('ip');
    expect(cols).toContain('method');
  });

  it('performs SHOW DATABASES, SHOW TABLES, and DESCRIBE via emulation', async () => {
    const { app } = buildTestApp(() => {
      throw new Error('unsupported');
    });

    // 1. SHOW DATABASES
    const q1 = await request(app)
      .post('/api/athena/query')
      .send({ query: 'SHOW DATABASES', database: 'default' });
    
    await new Promise(r => setTimeout(r, 600));
    const r1 = await request(app).get(`/api/athena/query/${q1.body.queryExecutionId}/results`);
    expect(r1.status).toBe(200);
    expect(r1.body.results.columns[0].name).toBe('database_name');
    expect(r1.body.results.rows.some((row: string[]) => row[0] === 'default')).toBe(true);

    // 2. SHOW TABLES
    const q2 = await request(app)
      .post('/api/athena/query')
      .send({ query: 'SHOW TABLES', database: 'default' });
    
    await new Promise(r => setTimeout(r, 600));
    const r2 = await request(app).get(`/api/athena/query/${q2.body.queryExecutionId}/results`);
    expect(r2.status).toBe(200);
    expect(r2.body.results.columns[0].name).toBe('tab_name');
    const tableNames = r2.body.results.rows.map((row: string[]) => row[0]);
    expect(tableNames).toContain('web_logs');
    expect(tableNames).toContain('clickstream_data');

    // 3. DESCRIBE
    const q3 = await request(app)
      .post('/api/athena/query')
      .send({ query: 'DESCRIBE web_logs', database: 'default' });
    
    await new Promise(r => setTimeout(r, 600));
    const r3 = await request(app).get(`/api/athena/query/${q3.body.queryExecutionId}/results`);
    expect(r3.status).toBe(200);
    expect(r3.body.results.columns.map((c: any) => c.name)).toContain('col_name');
    expect(r3.body.results.rows.map((row: string[]) => row[0])).toContain('timestamp');
  });

  it('lists data catalogs and falls back to sandbox defaults', async () => {
    const { app } = buildTestApp(() => {
      throw new Error('Glue missing');
    });

    const res = await request(app).get('/api/athena/catalog');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.catalog.databases.length).toBeGreaterThan(0);
    const db = res.body.catalog.databases.find((d: any) => d.name === 'default');
    expect(db).toBeDefined();
    expect(db.tables.map((t: any) => t.name)).toContain('web_logs');
  });

  it('maintains and clears queries history logs', async () => {
    const { app } = buildTestApp(() => {
      throw new Error('unsupported');
    });

    // Run two queries
    await request(app).post('/api/athena/query').send({ query: 'SELECT 1;', database: 'default' });
    await request(app).post('/api/athena/query').send({ query: 'SELECT 2;', database: 'default' });

    // Fetch history
    const historyRes = await request(app).get('/api/athena/history');
    expect(historyRes.status).toBe(200);
    expect(historyRes.body.ok).toBe(true);
    expect(historyRes.body.history.length).toBe(2);
    expect(historyRes.body.history[0].query).toBe('SELECT 2;');

    // Clear history
    const clearRes = await request(app).delete('/api/athena/history');
    expect(clearRes.status).toBe(200);
    expect(clearRes.body.ok).toBe(true);

    const historyRes2 = await request(app).get('/api/athena/history');
    expect(historyRes2.body.history.length).toBe(0);
  });

  it('handles bad query POST body correctly', async () => {
    const { app } = buildTestApp();

    const noQuery = await request(app).post('/api/athena/query').send({ database: 'default' });
    expect(noQuery.status).toBe(400);

    const noDb = await request(app).post('/api/athena/query').send({ query: 'SELECT 1;' });
    expect(noDb.status).toBe(400);
  });
});
