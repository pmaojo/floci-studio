import { spawn } from 'node:child_process';
import { config } from '../config';

export interface AwsCliResult {
  stdout: string;
  stderr: string;
}

export class AwsCliError extends Error {
  readonly exitCode: number | null;
  readonly stderr: string;
  readonly stdout: string;

  constructor(message: string, result: AwsCliResult, exitCode: number | null) {
    super(message);
    this.name = 'AwsCliError';
    this.exitCode = exitCode;
    this.stderr = result.stderr;
    this.stdout = result.stdout;
  }
}

export class AwsCli {
  async run(args: string[]): Promise<AwsCliResult> {
    const finalArgs = this.withEndpoint(args);

    return new Promise((resolve, reject) => {
      const child = spawn('aws', finalArgs, {
        shell: false,
        env: {
          ...process.env,
          AWS_ACCESS_KEY_ID: config.awsAccessKeyId,
          AWS_SECRET_ACCESS_KEY: config.awsSecretAccessKey,
          AWS_DEFAULT_REGION: config.awsRegion,
          AWS_EC2_METADATA_DISABLED: 'true',
        },
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (chunk) => {
        stdout += chunk.toString();
      });

      child.stderr.on('data', (chunk) => {
        stderr += chunk.toString();
      });

      child.on('error', (error) => {
        reject(error);
      });

      child.on('close', (exitCode) => {
        const result = { stdout, stderr };
        if (exitCode === 0) {
          resolve(result);
          return;
        }

        reject(new AwsCliError(this.extractErrorMessage(result), result, exitCode));
      });
    });
  }

  async runJson<T>(args: string[]): Promise<T> {
    const result = await this.run([...args, '--output', 'json']);
    const trimmed = result.stdout.trim();
    if (!trimmed) return {} as T;
    return JSON.parse(trimmed) as T;
  }

  private withEndpoint(args: string[]) {
    if (args[0] === '--version') return args;
    return ['--endpoint-url', config.awsEndpointUrl, ...args];
  }

  private extractErrorMessage(result: AwsCliResult) {
    const message = result.stderr.trim() || result.stdout.trim();
    return message || 'AWS CLI command failed';
  }
}
