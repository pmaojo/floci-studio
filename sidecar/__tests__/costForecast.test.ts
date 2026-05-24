import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { buildTestApp } from './testHarness';

const costForecastResponder = async (args: string[]): Promise<unknown> => {
  if (args[0] === 's3api' && args[1] === 'list-buckets') {
    return { Buckets: [{ Name: 'bucket1' }, { Name: 'bucket2' }] };
  }
  if (args[0] === 'ec2' && args[1] === 'describe-instances') {
    return {
      Reservations: [
        {
          Instances: [{ InstanceId: 'i-1' }, { InstanceId: 'i-2' }],
        },
      ],
    };
  }
  if (args[0] === 'lambda' && args[1] === 'list-functions') {
    return { Functions: [{ FunctionName: 'func1' }] };
  }
  if (args[0] === 'dynamodb' && args[1] === 'list-tables') {
    return { TableNames: ['table1', 'table2', 'table3'] };
  }
  if (args[0] === 'rds' && args[1] === 'describe-db-instances') {
    return { DBInstances: [{ DBInstanceIdentifier: 'db1' }] };
  }
  return {};
};

describe('GET /api/diagnostics/cost-forecast', () => {
  it('calculates the forecast based on real-aws-cli resource counts and static pricing book', async () => {
    const { app } = buildTestApp(costForecastResponder);

    const response = await request(app).get('/api/diagnostics/cost-forecast');

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(response.body.totalMonthlyForecast).toBeGreaterThan(0);

    const forecasts = response.body.forecasts;
    expect(forecasts).toHaveLength(5);

    const s3 = forecasts.find((f: any) => f.service === 'S3 Buckets');
    expect(s3.count).toBe(2);
    // Unit price is 50 GB * $0.023 = $1.15 per bucket
    expect(s3.unitPrice).toBe(1.15);
    expect(s3.monthly).toBe(2.3);
    expect(s3.source).toBe('real-aws-cli');

    const ec2 = forecasts.find((f: any) => f.service === 'EC2');
    expect(ec2.count).toBe(2);
    // Unit price is 730 hours * $0.0104 = $7.592 per running instance
    expect(ec2.unitPrice).toBe(7.592);
    expect(ec2.monthly).toBe(15.18);
    expect(ec2.source).toBe('real-aws-cli');

    const lambda = forecasts.find((f: any) => f.service === 'Lambda');
    expect(lambda.count).toBe(1);
    expect(lambda.unitPrice).toBe(0.2);
    expect(lambda.monthly).toBe(0.2);
    expect(lambda.source).toBe('real-aws-cli');

    const dynamodb = forecasts.find((f: any) => f.service === 'DynamoDB');
    expect(dynamodb.count).toBe(3);
    expect(dynamodb.unitPrice).toBe(2.5);
    expect(dynamodb.monthly).toBe(7.5);
    expect(dynamodb.source).toBe('real-aws-cli');

    const rds = forecasts.find((f: any) => f.service === 'RDS');
    expect(rds.count).toBe(1);
    // Unit price is 730 hours * $0.017 = $12.41 per active DB instance
    expect(rds.unitPrice).toBe(12.41);
    expect(rds.monthly).toBe(12.41);
    expect(rds.source).toBe('real-aws-cli');

    // Total monthly forecast: 2.3 + 15.18 + 0.2 + 7.5 + 12.41 = 37.59
    expect(response.body.totalMonthlyForecast).toBe(37.59);
  });
});
