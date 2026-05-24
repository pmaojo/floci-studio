import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { config } from '../config';
import { AwsCli } from '../infrastructure/awsCli';
import { getRuntimeTemplates, type LambdaCodeInput, prepareLambdaPackage } from '../infrastructure/lambdaPackage';

export interface CreateLambdaRequest {
  functionName: string;
  runtime: string;
  handler: string;
  role?: string;
  description?: string;
  timeout?: number;
  memorySize?: number;
  code: LambdaCodeInput;
}

export interface InvokeLambdaRequest {
  payload?: unknown;
  invocationType?: 'RequestResponse' | 'Event' | 'DryRun';
}

export interface UpdateLambdaCodeRequest {
  runtime: string;
  code: LambdaCodeInput;
}

export interface UpdateLambdaConfigurationRequest {
  runtime?: string;
  handler?: string;
  role?: string;
  description?: string;
  timeout?: number;
  memorySize?: number;
  environmentVariables?: Record<string, string>;
}

export class LambdaService {
  constructor(private readonly awsCli: AwsCli) {}

  async getCapabilities() {
    return {
      endpointUrl: config.awsEndpointUrl,
      defaultRegion: config.awsRegion,
      defaultRoleArn: config.defaultLambdaRoleArn,
      runtimes: [
        { value: 'nodejs18.x', label: 'Node.js 18.x', supportsTemplate: true },
        { value: 'python3.9', label: 'Python 3.9', supportsTemplate: true },
        { value: 'go1.x', label: 'Go 1.x', supportsTemplate: false },
        { value: 'java11', label: 'Java 11', supportsTemplate: false },
        { value: 'provided.al2', label: 'Custom Runtime (provided.al2)', supportsTemplate: false },
      ],
      templates: getRuntimeTemplates(),
      sourceModes: ['template', 'inline', 'files', 'zipBase64'],
    };
  }

  async listFunctions() {
    return this.awsCli.runJson(['lambda', 'list-functions']);
  }

  async createFunction(request: CreateLambdaRequest) {
    this.assertRequired(request.functionName, 'functionName');
    this.assertRequired(request.runtime, 'runtime');
    this.assertRequired(request.handler, 'handler');

    const deploymentPackage = await prepareLambdaPackage(request.runtime, request.code);
    try {
      const args = [
        'lambda',
        'create-function',
        '--function-name',
        request.functionName,
        '--runtime',
        request.runtime,
        '--handler',
        request.handler,
        '--role',
        request.role || config.defaultLambdaRoleArn,
        '--zip-file',
        this.toAwsFileUri(deploymentPackage.zipPath, true),
      ];

      this.pushOptional(args, '--description', request.description);
      this.pushOptional(args, '--timeout', request.timeout);
      this.pushOptional(args, '--memory-size', request.memorySize);

      return await this.awsCli.runJson(args);
    } finally {
      await deploymentPackage.cleanup();
    }
  }

  async updateFunctionCode(functionName: string, request: UpdateLambdaCodeRequest) {
    this.assertRequired(functionName, 'functionName');

    const deploymentPackage = await prepareLambdaPackage(request.runtime, request.code);
    try {
      return await this.awsCli.runJson([
        'lambda',
        'update-function-code',
        '--function-name',
        functionName,
        '--zip-file',
        this.toAwsFileUri(deploymentPackage.zipPath, true),
      ]);
    } finally {
      await deploymentPackage.cleanup();
    }
  }

  async updateFunctionConfiguration(functionName: string, request: UpdateLambdaConfigurationRequest) {
    this.assertRequired(functionName, 'functionName');

    const args = ['lambda', 'update-function-configuration', '--function-name', functionName];
    this.pushOptional(args, '--runtime', request.runtime);
    this.pushOptional(args, '--handler', request.handler);
    this.pushOptional(args, '--role', request.role);
    this.pushOptional(args, '--description', request.description);
    this.pushOptional(args, '--timeout', request.timeout);
    this.pushOptional(args, '--memory-size', request.memorySize);

    if (request.environmentVariables) {
      const variables = Object.entries(request.environmentVariables)
        .map(([key, value]) => `${key}=${value}`)
        .join(',');
      args.push('--environment', `Variables={${variables}}`);
    }

    return this.awsCli.runJson(args);
  }

  async invokeFunction(functionName: string, request: InvokeLambdaRequest) {
    this.assertRequired(functionName, 'functionName');

    const workingDirectory = await mkdtemp(path.join(tmpdir(), 'floci-lambda-invoke-'));
    const payloadPath = path.join(workingDirectory, 'payload.json');
    const responsePath = path.join(workingDirectory, 'response.json');

    try {
      await writeFile(payloadPath, JSON.stringify(request.payload ?? {}), 'utf8');

      const args = [
        'lambda',
        'invoke',
        '--function-name',
        functionName,
        '--payload',
        this.toAwsFileUri(payloadPath, false),
        '--cli-binary-format',
        'raw-in-base64-out',
      ];

      this.pushOptional(args, '--invocation-type', request.invocationType);
      args.push(responsePath);

      const metadata = await this.awsCli.runJson(args);
      const rawPayload = await readFile(responsePath, 'utf8').catch(() => '');

      return {
        metadata,
        payload: this.parseJsonOrText(rawPayload),
      };
    } finally {
      await rm(workingDirectory, { recursive: true, force: true });
    }
  }

  async deleteFunction(functionName: string) {
    this.assertRequired(functionName, 'functionName');
    return this.awsCli.runJson(['lambda', 'delete-function', '--function-name', functionName]);
  }

  async getLogs(functionName: string) {
    this.assertRequired(functionName, 'functionName');
    const logGroupName = `/aws/lambda/${functionName}`;

    try {
      const streams = await this.awsCli.runJson<{ logStreams?: Array<{ logStreamName?: string }> }>([
        'logs',
        'describe-log-streams',
        '--log-group-name',
        logGroupName,
        '--order-by',
        'LastEventTime',
        '--descending',
        '--max-items',
        '5',
      ]);

      const events = [];
      for (const stream of streams.logStreams || []) {
        if (!stream.logStreamName) continue;
        const response = await this.awsCli.runJson<{ events?: unknown[] }>([
          'logs',
          'get-log-events',
          '--log-group-name',
          logGroupName,
          '--log-stream-name',
          stream.logStreamName,
          '--limit',
          '50',
        ]);
        events.push(...(response.events || []));
      }

      return { logGroupName, events };
    } catch (error) {
      return { logGroupName, events: [], warning: error instanceof Error ? error.message : String(error) };
    }
  }

  private assertRequired(value: unknown, fieldName: string) {
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new Error(`${fieldName} is required`);
    }
  }

  private pushOptional(args: string[], key: string, value: string | number | undefined) {
    if (value === undefined || value === '') return;
    args.push(key, String(value));
  }

  private toAwsFileUri(filePath: string, binary: boolean) {
    const uri = pathToFileURL(filePath).href;
    return binary ? uri.replace(/^file:\/\//, 'fileb://') : uri;
  }

  private parseJsonOrText(value: string) {
    if (!value.trim()) return null;
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
}
