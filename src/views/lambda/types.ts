import type { LambdaCapabilities } from '../../lib/sidecarApi';

export type LambdaSourceMode = 'template' | 'inline' | 'zipBase64';

export interface LambdaConfigDraft {
  runtime: string;
  handler: string;
  role: string;
  description: string;
  timeout: string;
  memorySize: string;
}

export interface LambdaFunctionRecord {
  FunctionName?: string;
  FunctionArn?: string;
  Runtime?: string;
  Handler?: string;
  Role?: string;
  Description?: string;
  MemorySize?: number;
  Timeout?: number;
  LastModified?: string;
}

export const fallbackCapabilities: LambdaCapabilities = {
  endpointUrl: 'http://localhost:4566',
  defaultRegion: 'us-east-1',
  defaultRoleArn: 'arn:aws:iam::000000000000:role/lambda-role',
  runtimes: [
    { value: 'nodejs18.x', label: 'Node.js 18.x', supportsTemplate: true },
    { value: 'python3.9', label: 'Python 3.9', supportsTemplate: true },
    { value: 'go1.x', label: 'Go 1.x', supportsTemplate: false },
    { value: 'java11', label: 'Java 11', supportsTemplate: false },
  ],
  templates: [
    {
      runtime: 'nodejs18.x',
      fileName: 'index.js',
      handler: 'index.handler',
      source: `exports.handler = async (event) => {
  return {
    statusCode: 200,
    body: JSON.stringify({
      message: "Hello from Floci Lambda",
      event
    })
  };
};
`,
    },
  ],
  sourceModes: ['template', 'inline', 'zipBase64'],
};

export const applyRuntimeTemplate = (
  capabilities: LambdaCapabilities,
  runtime: string,
  setHandler: (value: string) => void,
  setFileName: (value: string) => void,
  setCode: (value: string) => void,
) => {
  const template = capabilities.templates.find(item => item.runtime === runtime);
  if (!template) return;
  setHandler(template.handler);
  setFileName(template.fileName);
  setCode(template.source);
};
