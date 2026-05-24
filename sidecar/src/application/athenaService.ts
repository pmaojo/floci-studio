import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { AwsCli } from '../infrastructure/awsCli';

export interface ColumnDefinition {
  name: string;
  type: string;
}

export interface QueryExecution {
  id: string;
  query: string;
  database: string;
  workGroup: string;
  status: 'QUEUED' | 'RUNNING' | 'SUCCEEDED' | 'FAILED';
  errorMessage?: string;
  submittedAt: string;
  completedAt?: string;
  durationMs?: number;
  results?: {
    columns: ColumnDefinition[];
    rows: string[][];
  };
}

export interface DataCatalog {
  databases: {
    name: string;
    description?: string;
    tables: {
      name: string;
      columns: ColumnDefinition[];
      description?: string;
    }[];
  }[];
}

// Sandbox databases and tables pre-seeding
const SANDBOX_CATALOG: DataCatalog = {
  databases: [
    {
      name: 'default',
      description: 'Default emulation sandbox database',
      tables: [
        {
          name: 'web_logs',
          description: 'Emulated Nginx/Apache access log entries',
          columns: [
            { name: 'timestamp', type: 'string' },
            { name: 'ip', type: 'string' },
            { name: 'method', type: 'string' },
            { name: 'uri', type: 'string' },
            { name: 'status', type: 'int' },
            { name: 'bytes', type: 'int' },
          ],
        },
        {
          name: 'clickstream_data',
          description: 'User click events logs from e-commerce sandbox',
          columns: [
            { name: 'session_id', type: 'string' },
            { name: 'user_id', type: 'string' },
            { name: 'event_type', type: 'string' },
            { name: 'referrer', type: 'string' },
            { name: 'device', type: 'string' },
          ],
        },
        {
          name: 'billing_reports',
          description: 'Simulated daily AWS resource billing item reports',
          columns: [
            { name: 'billing_period', type: 'string' },
            { name: 'service', type: 'string' },
            { name: 'usage_type', type: 'string' },
            { name: 'cost', type: 'double' },
            { name: 'currency', type: 'string' },
          ],
        },
      ],
    },
  ],
};

export class AthenaService {
  private readonly statePath = path.join('.sidecar-state', 'athena-queries.json');
  private activeExecutions = new Map<string, QueryExecution>();

  constructor(private readonly awsCli: AwsCli) {}

  /**
   * Reads query execution logs from disk state store
   */
  async loadExecutions(): Promise<QueryExecution[]> {
    try {
      await fs.mkdir(path.dirname(this.statePath), { recursive: true });
      const data = await fs.readFile(this.statePath, 'utf-8');
      const parsed = JSON.parse(data) as QueryExecution[];
      // Keep in-memory cache synchronized
      for (const exec of parsed) {
        this.activeExecutions.set(exec.id, exec);
      }
      return parsed;
    } catch {
      return [];
    }
  }

  /**
   * Persists queries state to disk
   */
  private async saveExecutions(): Promise<void> {
    try {
      await fs.mkdir(path.dirname(this.statePath), { recursive: true });
      const current = Array.from(this.activeExecutions.values());
      // Sort: newest first
      current.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
      await fs.writeFile(this.statePath, JSON.stringify(current, null, 2), 'utf-8');
    } catch (error) {
      console.error('[athena-service] Failed to persist executions state', error);
    }
  }

  /**
   * Fetches active catalogs from Glue (native) or falls back to preloaded sandbox
   */
  async listCatalogs(): Promise<DataCatalog> {
    try {
      // 1. Try to fetch from Glue natively via CLI
      const glueDbs = await this.awsCli.runJson<{ DatabaseList?: any[] }>(['glue', 'get-databases']);
      if (!glueDbs.DatabaseList || glueDbs.DatabaseList.length === 0) {
        return SANDBOX_CATALOG;
      }

      const catalog: DataCatalog = { databases: [] };

      for (const db of glueDbs.DatabaseList) {
        const dbName = db.Name;
        const dbDesc = db.Description || '';
        const tablesList: any[] = [];

        try {
          const tablesResult = await this.awsCli.runJson<{ TableList?: any[] }>([
            'glue',
            'get-tables',
            '--database-name',
            dbName,
          ]);
          if (tablesResult.TableList) {
            for (const tbl of tablesResult.TableList) {
              const columns = (tbl.StorageDescriptor?.Columns || []).map((col: any) => ({
                name: col.Name,
                type: col.Type,
              }));
              tablesList.push({
                name: tbl.Name,
                description: tbl.Description || '',
                columns,
              });
            }
          }
        } catch {
          // If individual get-tables fails, skip or use empty
        }

        catalog.databases.push({
          name: dbName,
          description: dbDesc,
          tables: tablesList,
        });
      }

      // Merge sandbox catalog if default database is missing
      if (!catalog.databases.some(d => d.name === 'default')) {
        catalog.databases.push(SANDBOX_CATALOG.databases[0]);
      }

      return catalog;
    } catch {
      // 2. Full sandbox fallback if Glue CLI is unavailable or fails
      return SANDBOX_CATALOG;
    }
  }

  /**
   * Start SQL query execution (dual-engine)
   */
  async startQuery(query: string, database: string, workGroup = 'primary'): Promise<string> {
    await this.loadExecutions();

    const id = 'query-' + Math.random().toString(36).substring(2, 15);
    const execution: QueryExecution = {
      id,
      query,
      database,
      workGroup,
      status: 'QUEUED',
      submittedAt: new Date().toISOString(),
    };

    this.activeExecutions.set(id, execution);
    await this.saveExecutions();

    // Trigger asynchronous execution flow
    this.runQueryBackground(id);

    return id;
  }

  /**
   * Returns details of a query execution
   */
  async getQueryStatus(id: string): Promise<QueryExecution> {
    await this.loadExecutions();
    const exec = this.activeExecutions.get(id);
    if (!exec) {
      throw new Error(`Query execution not found: ${id}`);
    }
    return exec;
  }

  /**
   * Fetches results of a query
   */
  async getQueryResults(id: string): Promise<QueryExecution['results']> {
    const exec = await this.getQueryStatus(id);
    if (exec.status !== 'SUCCEEDED') {
      throw new Error(`Query is not in SUCCEEDED state. Current state: ${exec.status}`);
    }
    return exec.results;
  }

  /**
   * Returns complete history
   */
  async getHistory(): Promise<QueryExecution[]> {
    return this.loadExecutions();
  }

  /**
   * Deletes all executions history
   */
  async clearHistory(): Promise<void> {
    this.activeExecutions.clear();
    await this.saveExecutions();
  }

  /**
   * Run the query in background, transitioning states appropriately
   */
  private async runQueryBackground(id: string): Promise<void> {
    const startTime = Date.now();
    const updateState = async (updates: Partial<QueryExecution>) => {
      const current = this.activeExecutions.get(id);
      if (current) {
        const merged = { ...current, ...updates };
        this.activeExecutions.set(id, merged);
        await this.saveExecutions();
      }
    };

    // Transition: QUEUED -> RUNNING after a small simulated overhead
    await new Promise(resolve => setTimeout(resolve, 300));
    await updateState({ status: 'RUNNING' });

    const exec = this.activeExecutions.get(id);
    if (!exec) return;

    try {
      // 1. Try native execution via AWS Athena CLI
      const nativeResult = await this.awsCli.runJson<{ QueryExecutionId?: string }>([
        'athena',
        'start-query-execution',
        '--query-string',
        exec.query,
        '--query-context',
        `Database=${exec.database}`,
        '--work-group',
        exec.workGroup,
      ]);

      if (nativeResult.QueryExecutionId) {
        // Poll for native query completion
        let isDone = false;
        let attempts = 0;

        while (!isDone && attempts < 30) {
          attempts++;
          await new Promise(resolve => setTimeout(resolve, 800));

          const statusCheck = await this.awsCli.runJson<{ QueryExecution?: any }>([
            'athena',
            'get-query-execution',
            '--query-execution-id',
            nativeResult.QueryExecutionId,
          ]);

          const state = statusCheck.QueryExecution?.Status?.State;
          if (state === 'SUCCEEDED') {
            isDone = true;

            // Fetch columns and rows natively
            const resultsPayload = await this.awsCli.runJson<{ ResultSet?: any }>([
              'athena',
              'get-query-results',
              '--query-execution-id',
              nativeResult.QueryExecutionId,
            ]);

            const columnInfo = resultsPayload.ResultSet?.ResultSetMetadata?.ColumnInfo || [];
            const rowsPayload = resultsPayload.ResultSet?.Rows || [];

            const columns: ColumnDefinition[] = columnInfo.map((col: any) => ({
              name: col.Name,
              type: col.Type,
            }));

            // Athena first row is sometimes headers if we list all rows. Clean or map them.
            let rows: string[][] = [];
            if (rowsPayload.length > 0) {
              // Parse out row data list
              rows = rowsPayload.map((r: any) => (r.Data || []).map((d: any) => d.VarCharValue || ''));
              // If the first row matches column headers, shift it out
              if (rows.length > 0 && columns.length > 0) {
                const firstRowMatch = rows[0].every((val, idx) => columns[idx] && val === columns[idx].name);
                if (firstRowMatch) {
                  rows.shift();
                }
              }
            }

            await updateState({
              status: 'SUCCEEDED',
              completedAt: new Date().toISOString(),
              durationMs: Date.now() - startTime,
              results: { columns, rows },
            });
            return;
          } else if (state === 'FAILED' || state === 'CANCELLED') {
            isDone = true;
            throw new Error(statusCheck.QueryExecution?.Status?.StateChangeReason || 'Native query execution failed');
          }
        }

        if (!isDone) {
          throw new Error('Native query execution timed out');
        }
      } else {
        throw new Error('Failed to obtain QueryExecutionId from native engine');
      }
    } catch (err: any) {
      const errMessage = err.message || 'Execution error';
      // If it is an UnsupportedOperation or other local CLI issue, run the Emulator Fallback!
      const isUnsupported = ['unsupported', 'invalid', 'no such', 'unknown', 'not found', 'cannot find', 'failed to obtain'].some(word =>
        errMessage.toLowerCase().includes(word)
      );

      if (isUnsupported || errMessage.includes('start-query-execution') || errMessage.includes('executable file not found')) {
        // Run Emulator Engine fallback!
        try {
          const results = await this.emulateQuery(exec.query, exec.database);
          await updateState({
            status: 'SUCCEEDED',
            completedAt: new Date().toISOString(),
            durationMs: Date.now() - startTime + 250, // add a small artificial lag
            results,
          });
        } catch (emulErr: any) {
          await updateState({
            status: 'FAILED',
            errorMessage: emulErr.message || 'Emulator execution error',
            completedAt: new Date().toISOString(),
            durationMs: Date.now() - startTime,
          });
        }
      } else {
        // True SQL/Runtime error
        await updateState({
          status: 'FAILED',
          errorMessage: errMessage,
          completedAt: new Date().toISOString(),
          durationMs: Date.now() - startTime,
        });
      }
    }
  }

  /**
   * Local SQL Query parser and row generator emulator
   */
  private async emulateQuery(sql: string, database: string): Promise<QueryExecution['results']> {
    const cleaned = sql.replace(/\s+/g, ' ').trim();
    const cleanLower = cleaned.toLowerCase();

    // 1. Handle SHOW DATABASES
    if (cleanLower.startsWith('show databases')) {
      const catalog = await this.listCatalogs();
      return {
        columns: [{ name: 'database_name', type: 'string' }],
        rows: catalog.databases.map(d => [d.name]),
      };
    }

    // 2. Handle SHOW TABLES
    if (cleanLower.startsWith('show tables')) {
      const catalog = await this.listCatalogs();
      const targetDb = catalog.databases.find(d => d.name === database) || catalog.databases[0];
      return {
        columns: [{ name: 'tab_name', type: 'string' }],
        rows: targetDb.tables.map(t => [t.name]),
      };
    }

    // 3. Handle DESCRIBE table
    if (cleanLower.startsWith('describe ') || cleanLower.startsWith('describe table ')) {
      const parts = cleaned.split(' ');
      const tableName = parts[parts.length - 1].replace(/;/g, '').trim();
      const catalog = await this.listCatalogs();
      const targetDb = catalog.databases.find(d => d.name === database) || catalog.databases[0];
      const table = targetDb.tables.find(t => t.name.toLowerCase() === tableName.toLowerCase());

      if (!table) {
        throw new Error(`Table not found in database ${targetDb.name}: ${tableName}`);
      }

      return {
        columns: [
          { name: 'col_name', type: 'string' },
          { name: 'data_type', type: 'string' },
          { name: 'comment', type: 'string' },
        ],
        rows: table.columns.map(col => [col.name, col.type, 'Emulated column description']),
      };
    }

    // 4. Handle SELECT queries
    if (cleanLower.startsWith('select')) {
      // Extract limit
      let limit = 50;
      const limitMatch = cleanLower.match(/limit\s+(\d+)/);
      if (limitMatch) {
        limit = parseInt(limitMatch[1], 10);
      }
      if (limit > 1000) limit = 1000;

      // Extract table name
      const fromIndex = cleanLower.indexOf(' from ');
      if (fromIndex === -1) {
        // Literal select, e.g. SELECT 1;
        return {
          columns: [{ name: '_col0', type: 'int' }],
          rows: [['1']],
        };
      }

      let afterFrom = cleaned.substring(fromIndex + 6).trim();
      // remove WHERE, GROUP, ORDER, LIMIT, etc.
      const stopWords = ['where', 'group', 'order', 'limit', 'join', 'left', 'right', 'inner', ';'];
      let tablePart = afterFrom;
      for (const word of stopWords) {
        const idx = tablePart.toLowerCase().indexOf(' ' + word);
        if (idx !== -1) {
          tablePart = tablePart.substring(0, idx);
        }
      }
      tablePart = tablePart.replace(/;/g, '').trim();

      // Table might be prefixed by database, e.g. default.web_logs
      let targetDbName = database;
      let tableName = tablePart;
      if (tablePart.includes('.')) {
        const dots = tablePart.split('.');
        targetDbName = dots[0];
        tableName = dots[1];
      }

      const catalog = await this.listCatalogs();
      const targetDb = catalog.databases.find(d => d.name.toLowerCase() === targetDbName.toLowerCase()) || catalog.databases[0];
      const table = targetDb.tables.find(t => t.name.toLowerCase() === tableName.toLowerCase());

      if (!table) {
        throw new Error(`Table not found: ${targetDbName}.${tableName}. Check spelling or Glue catalogs.`);
      }

      // Generate realistic mock records matching the exact table columns
      const rows = this.generateMockRows(table.name, table.columns, limit, cleanLower);
      return {
        columns: table.columns,
        rows,
      };
    }

    // 5. Unsupported query type in emulator
    throw new Error('Unsupported emulator SQL query syntax. Use SELECT, SHOW TABLES, SHOW DATABASES, or DESCRIBE.');
  }

  /**
   * High-fidelity row generator tailored to specific table structures and simple filters
   */
  private generateMockRows(tableName: string, columns: ColumnDefinition[], limit: number, cleanSql: string): string[][] {
    const rows: string[][] = [];

    // Parse simple WHERE filters (e.g., status = 200 or method = 'GET') to enhance simulation
    const filterStatus = cleanSql.includes('status = 200') ? 200 : cleanSql.includes('status = 404') ? 404 : null;
    const filterMethod = cleanSql.includes("method = 'get'") ? 'GET' : cleanSql.includes("method = 'post'") ? 'POST' : null;

    const ips = ['192.168.1.45', '10.0.0.12', '172.16.89.2', '8.8.8.8', '192.168.0.101', '127.0.0.1'];
    const uris = ['/index.html', '/api/v1/users', '/login', '/dashboard', '/static/logo.png', '/api/v1/health', '/products/item-39'];
    const methods = ['GET', 'POST', 'PUT', 'DELETE'];
    const statuses = [200, 200, 200, 200, 200, 302, 404, 500];

    const eventTypes = ['page_view', 'page_view', 'click', 'add_to_cart', 'remove_from_cart', 'checkout', 'purchase_complete'];
    const referrers = ['https://google.com', 'https://github.com', 'https://twitter.com', 'direct', 'https://news.ycombinator.com'];
    const devices = ['mobile', 'mobile', 'desktop', 'desktop', 'tablet'];

    const services = ['AmazonEC2', 'AmazonS3', 'AWSLambda', 'AmazonRDS', 'AmazonDynamoDB', 'AmazonRoute53'];
    const usageTypes = ['BoxUsage:t3.micro', 'TimedStorage-ByteHrs', 'Lambda-GB-Second', 'InstanceUsage:db.t3.micro', 'TableProvisionedCapacity', 'HostedZone-Month'];
    const baseCosts = [0.0104, 0.023, 0.000016, 0.017, 2.50, 0.50];

    for (let i = 0; i < limit; i++) {
      const record: string[] = [];

      for (const col of columns) {
        const colLower = col.name.toLowerCase();

        if (tableName.toLowerCase() === 'web_logs') {
          if (colLower === 'timestamp') {
            const date = new Date(Date.now() - i * 60000);
            record.push(date.toISOString());
          } else if (colLower === 'ip') {
            record.push(ips[i % ips.length]);
          } else if (colLower === 'method') {
            record.push(filterMethod || methods[i % methods.length]);
          } else if (colLower === 'uri') {
            record.push(uris[i % uris.length]);
          } else if (colLower === 'status') {
            record.push(String(filterStatus || statuses[i % statuses.length]));
          } else if (colLower === 'bytes') {
            record.push(String(Math.floor(Math.random() * 8500) + 120));
          } else {
            record.push(`val-${i}`);
          }
        } else if (tableName.toLowerCase() === 'clickstream_data') {
          if (colLower === 'session_id') {
            record.push(`sess-${Math.floor(100000 + Math.random() * 900000)}`);
          } else if (colLower === 'user_id') {
            record.push(`usr-${Math.floor(2000 + (i % 25))}`);
          } else if (colLower === 'event_type') {
            record.push(eventTypes[i % eventTypes.length]);
          } else if (colLower === 'referrer') {
            record.push(referrers[i % referrers.length]);
          } else if (colLower === 'device') {
            record.push(devices[i % devices.length]);
          } else {
            record.push(`val-${i}`);
          }
        } else if (tableName.toLowerCase() === 'billing_reports') {
          if (colLower === 'billing_period') {
            record.push('2026-05');
          } else if (colLower === 'service') {
            record.push(services[i % services.length]);
          } else if (colLower === 'usage_type') {
            record.push(usageTypes[i % usageTypes.length]);
          } else if (colLower === 'cost') {
            const base = baseCosts[i % baseCosts.length];
            const multiplier = Math.floor(Math.random() * 150) + 1;
            record.push((base * multiplier).toFixed(4));
          } else if (colLower === 'currency') {
            record.push('USD');
          } else {
            record.push(`val-${i}`);
          }
        } else {
          // Dynamic columns fallback for custom tables inspects types
          if (col.type.toLowerCase().includes('int') || col.type.toLowerCase().includes('long')) {
            record.push(String(Math.floor(Math.random() * 1000) + 1));
          } else if (col.type.toLowerCase().includes('double') || col.type.toLowerCase().includes('float') || col.type.toLowerCase().includes('decimal')) {
            record.push((Math.random() * 100).toFixed(2));
          } else if (col.type.toLowerCase().includes('bool')) {
            record.push(Math.random() > 0.5 ? 'true' : 'false');
          } else if (col.type.toLowerCase().includes('date') || col.type.toLowerCase().includes('time')) {
            record.push(new Date(Date.now() - i * 3600000).toISOString());
          } else {
            record.push(`${col.name}-val-${i}`);
          }
        }
      }

      rows.push(record);
    }

    return rows;
  }
}
