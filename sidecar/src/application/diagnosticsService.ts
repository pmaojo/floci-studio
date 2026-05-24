import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { AwsCli, AwsCliError } from '../infrastructure/awsCli';
import { CompatibilityService } from './compatibilityService';

export interface DiagnosticStep {
  name: string;
  ok: boolean;
  durationMs: number;
  detail?: string;
  error?: string;
}

export interface KmsRoundTripResult {
  ok: boolean;
  matches: boolean;
  keyId?: string;
  plaintext: string;
  decrypted?: string;
  steps: DiagnosticStep[];
  cleanup: {
    ok: boolean;
    error?: string;
  };
}

export interface CostForecastItem {
  service: string;
  resourceType: string;
  count: number;
  unitPrice: number;
  monthly: number;
  source: string;
}

export interface CostForecastResult {
  ok: boolean;
  totalMonthlyForecast: number;
  forecasts: CostForecastItem[];
}

interface KmsCreateKeyResponse {
  KeyMetadata?: { KeyId?: string; Arn?: string };
}

interface KmsEncryptResponse {
  CiphertextBlob?: string;
  KeyId?: string;
}

interface KmsDecryptResponse {
  Plaintext?: string;
  KeyId?: string;
}

export class DiagnosticsService {
  constructor(
    private readonly awsCli: AwsCli,
    private readonly compatibilityService?: CompatibilityService,
  ) {}

  async runCostForecast(): Promise<CostForecastResult> {
    const forecasts: CostForecastItem[] = [];
    let totalMonthlyForecast = 0;

    try {
      const __dirname = path.dirname(fileURLToPath(import.meta.url));
      const pricingBookPath = path.join(__dirname, '..', 'infrastructure', 'pricing-book.json');
      const pricingBookRaw = await readFile(pricingBookPath, 'utf8');
      const pricingBook = JSON.parse(pricingBookRaw);
      const rates = pricingBook.rates;

      // 1. S3 Buckets
      let s3Count = 0;
      let s3Source = 'fallback-zero';
      try {
        const payload = await this.awsCli.runJson<{ Buckets?: any[] }>(['s3api', 'list-buckets']);
        s3Count = payload.Buckets?.length || 0;
        s3Source = 'real-aws-cli';
      } catch {
        if (this.compatibilityService) {
          const compat = await this.compatibilityService.getResource('s3', 'buckets');
          s3Count = compat?.count || 0;
          s3Source = 'sidecar-compat';
        }
      }
      const s3Rate = rates['s3.storage']?.price || 0.023;
      const s3Monthly = Number((s3Count * 50 * s3Rate).toFixed(2));
      forecasts.push({
        service: 'S3 Buckets',
        resourceType: 'Buckets',
        count: s3Count,
        unitPrice: Number((50 * s3Rate).toFixed(4)),
        monthly: s3Monthly,
        source: s3Source,
      });

      // 2. EC2 Instances
      let ec2Count = 0;
      let ec2Source = 'fallback-zero';
      try {
        const payload = await this.awsCli.runJson<{ Reservations?: Array<{ Instances?: any[] }> }>(['ec2', 'describe-instances']);
        ec2Count = (payload.Reservations || []).reduce((sum, res) => sum + (res.Instances || []).length, 0);
        ec2Source = 'real-aws-cli';
      } catch {
        if (this.compatibilityService) {
          const compat = await this.compatibilityService.getResource('ec2', 'instances');
          ec2Count = compat?.count || 0;
          ec2Source = 'sidecar-compat';
        }
      }
      const ec2Rate = rates['ec2.instance']?.price || 0.0104;
      const ec2Monthly = Number((ec2Count * 730 * ec2Rate).toFixed(2));
      forecasts.push({
        service: 'EC2',
        resourceType: 'Instances',
        count: ec2Count,
        unitPrice: Number((730 * ec2Rate).toFixed(4)),
        monthly: ec2Monthly,
        source: ec2Source,
      });

      // 3. Lambda Functions
      let lambdaCount = 0;
      let lambdaSource = 'fallback-zero';
      try {
        const payload = await this.awsCli.runJson<{ Functions?: any[] }>(['lambda', 'list-functions']);
        lambdaCount = payload.Functions?.length || 0;
        lambdaSource = 'real-aws-cli';
      } catch {
        // Fallback gracefully to 0 if not present
      }
      const lambdaRate = rates['lambda.invocation']?.price || 0.20;
      const lambdaMonthly = Number((lambdaCount * 1 * lambdaRate).toFixed(2));
      forecasts.push({
        service: 'Lambda',
        resourceType: 'Functions',
        count: lambdaCount,
        unitPrice: lambdaRate,
        monthly: lambdaMonthly,
        source: lambdaSource,
      });

      // 4. DynamoDB Tables
      let ddbCount = 0;
      let ddbSource = 'fallback-zero';
      try {
        const payload = await this.awsCli.runJson<{ TableNames?: any[] }>(['dynamodb', 'list-tables']);
        ddbCount = payload.TableNames?.length || 0;
        ddbSource = 'real-aws-cli';
      } catch {
        if (this.compatibilityService) {
          const compat = await this.compatibilityService.getResource('dynamodb', 'tables');
          ddbCount = compat?.count || 0;
          ddbSource = 'sidecar-compat';
        }
      }
      const ddbRate = rates['dynamodb.table']?.price || 2.50;
      const ddbMonthly = Number((ddbCount * ddbRate).toFixed(2));
      forecasts.push({
        service: 'DynamoDB',
        resourceType: 'Tables',
        count: ddbCount,
        unitPrice: ddbRate,
        monthly: ddbMonthly,
        source: ddbSource,
      });

      // 5. RDS DB Instances
      let rdsCount = 0;
      let rdsSource = 'fallback-zero';
      try {
        const payload = await this.awsCli.runJson<{ DBInstances?: any[] }>(['rds', 'describe-db-instances']);
        rdsCount = payload.DBInstances?.length || 0;
        rdsSource = 'real-aws-cli';
      } catch {
        // Graceful fallback to 0
      }
      const rdsRate = rates['rds.instance']?.price || 0.017;
      const rdsMonthly = Number((rdsCount * 730 * rdsRate).toFixed(2));
      forecasts.push({
        service: 'RDS',
        resourceType: 'DBInstances',
        count: rdsCount,
        unitPrice: Number((730 * rdsRate).toFixed(4)),
        monthly: rdsMonthly,
        source: rdsSource,
      });

      totalMonthlyForecast = forecasts.reduce((sum, item) => sum + item.monthly, 0);
      totalMonthlyForecast = Number(totalMonthlyForecast.toFixed(2));

      return {
        ok: true,
        totalMonthlyForecast,
        forecasts,
      };
    } catch (error) {
      return {
        ok: false,
        totalMonthlyForecast: 0,
        forecasts: [],
      };
    }
  }

  async runKmsRoundTrip(): Promise<KmsRoundTripResult> {
    const workingDirectory = await mkdtemp(path.join(tmpdir(), 'floci-kms-diag-'));
    const plaintextFile = path.join(workingDirectory, 'plain.txt');
    const ciphertextFile = path.join(workingDirectory, 'cipher.bin');
    const plaintext = `floci-kms-diag-${Date.now()}`;
    const steps: DiagnosticStep[] = [];

    let keyId: string | undefined;
    let decrypted: string | undefined;
    let matches = false;

    try {
      await writeFile(plaintextFile, plaintext, 'utf8');

      // 1. Create a transient key.
      const createStep = await this.timed('create-key', async () => {
        const response = await this.awsCli.runJson<KmsCreateKeyResponse>([
          'kms', 'create-key',
          '--description', 'floci-diagnostic round-trip',
        ]);
        const id = response.KeyMetadata?.KeyId;
        if (!id) throw new Error('CreateKey did not return KeyMetadata.KeyId');
        keyId = id;
        return `keyId=${id}`;
      });
      steps.push(createStep);
      if (!createStep.ok || !keyId) {
        return this.finish(steps, plaintext, undefined, false, workingDirectory, undefined);
      }

      // 2. Encrypt the canary plaintext.
      const encryptStep = await this.timed('encrypt', async () => {
        const response = await this.awsCli.runJson<KmsEncryptResponse>([
          'kms', 'encrypt',
          '--key-id', keyId!,
          '--plaintext', `fileb://${plaintextFile}`,
        ]);
        const cipherBase64 = response.CiphertextBlob;
        if (!cipherBase64) throw new Error('Encrypt did not return CiphertextBlob');
        await writeFile(ciphertextFile, Buffer.from(cipherBase64, 'base64'));
        return `cipher.bytes=${Buffer.from(cipherBase64, 'base64').length}`;
      });
      steps.push(encryptStep);
      if (!encryptStep.ok) {
        return this.finish(steps, plaintext, decrypted, matches, workingDirectory, keyId);
      }

      // 3. Decrypt and verify the round-trip.
      const decryptStep = await this.timed('decrypt', async () => {
        const response = await this.awsCli.runJson<KmsDecryptResponse>([
          'kms', 'decrypt',
          '--ciphertext-blob', `fileb://${ciphertextFile}`,
        ]);
        const decryptedBase64 = response.Plaintext;
        if (!decryptedBase64) throw new Error('Decrypt did not return Plaintext');
        decrypted = Buffer.from(decryptedBase64, 'base64').toString('utf8');
        matches = decrypted === plaintext;
        return `matches=${matches}`;
      });
      steps.push(decryptStep);

      return this.finish(steps, plaintext, decrypted, matches, workingDirectory, keyId);
    } catch (error) {
      // Defensive: any I/O error before a step ran should still try to clean up.
      return this.finish(steps, plaintext, decrypted, matches, workingDirectory, keyId, error);
    }
  }

  private async finish(
    steps: DiagnosticStep[],
    plaintext: string,
    decrypted: string | undefined,
    matches: boolean,
    workingDirectory: string,
    keyId: string | undefined,
    unexpectedError?: unknown,
  ): Promise<KmsRoundTripResult> {
    const cleanup = await this.cleanup(workingDirectory, keyId);
    if (unexpectedError) {
      steps.push({
        name: 'fatal',
        ok: false,
        durationMs: 0,
        error: unexpectedError instanceof Error ? unexpectedError.message : String(unexpectedError),
      });
    }

    const ok = matches && steps.every(step => step.ok);
    return {
      ok,
      matches,
      keyId,
      plaintext,
      decrypted,
      steps,
      cleanup,
    };
  }

  private async cleanup(workingDirectory: string, keyId: string | undefined) {
    const cleanup: KmsRoundTripResult['cleanup'] = { ok: true };
    if (keyId) {
      try {
        await this.awsCli.runJson([
          'kms', 'schedule-key-deletion',
          '--key-id', keyId,
          '--pending-window-in-days', '7',
        ]);
      } catch (error) {
        cleanup.ok = false;
        cleanup.error = error instanceof AwsCliError
          ? error.stderr.trim() || error.message
          : error instanceof Error ? error.message : String(error);
      }
    }
    await rm(workingDirectory, { recursive: true, force: true }).catch(() => {
      cleanup.ok = false;
      cleanup.error = (cleanup.error ? `${cleanup.error}; ` : '') + 'failed to remove temp directory';
    });
    return cleanup;
  }

  private async timed(name: string, fn: () => Promise<string | void>): Promise<DiagnosticStep> {
    const startedAt = Date.now();
    try {
      const detail = await fn();
      return {
        name,
        ok: true,
        durationMs: Date.now() - startedAt,
        ...(typeof detail === 'string' ? { detail } : {}),
      };
    } catch (error) {
      const message = error instanceof AwsCliError
        ? error.stderr.trim() || error.message
        : error instanceof Error ? error.message : String(error);
      return {
        name,
        ok: false,
        durationMs: Date.now() - startedAt,
        error: message,
      };
    }
  }
}
