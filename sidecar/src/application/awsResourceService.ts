import { AwsCli, AwsCliError } from '../infrastructure/awsCli';
import { config } from '../config';
import { awsResourceCatalog, type AwsResourceDefinition } from './awsResourceCatalog';
import { CompatibilityService } from './compatibilityService';

export class AwsResourceService {
  constructor(
    private readonly awsCli: AwsCli,
    private readonly compatibilityService: CompatibilityService,
  ) {}

  listServices() {
    return Object.entries(awsResourceCatalog).map(([key, service]) => ({
      key,
      serviceName: service.serviceName,
      description: service.description,
      resources: service.resources.map(resource => ({
        id: resource.id,
        label: resource.label,
      })),
    }));
  }

  async getOverview(serviceKey: string) {
    const service = awsResourceCatalog[serviceKey];
    if (!service) {
      const error = new Error(`Unknown AWS service key: ${serviceKey}`);
      (error as any).statusCode = 404;
      throw error;
    }

    if ((service.resources.length === 0 || this.compatibilityService.shouldBypassNative(serviceKey)) && this.compatibilityService.canHandle(serviceKey)) {
      const compatibilityOverview = await this.compatibilityService.getOverview(serviceKey);
      if (compatibilityOverview) return compatibilityOverview;
    }

    const resources = await Promise.all(service.resources.map(resource => this.readResource(serviceKey, resource)));

    return {
      serviceKey,
      serviceName: service.serviceName,
      description: service.description,
      endpointUrl: config.awsEndpointUrl,
      region: config.awsRegion,
      generatedAt: new Date().toISOString(),
      resources,
    };
  }

  private async readResource(serviceKey: string, resource: AwsResourceDefinition) {
    try {
      const payload = await this.awsCli.runJson<unknown>(resource.command);
      const extracted = resource.resultPath ? getPath(payload, resource.resultPath) : payload;
      const items = normalizeItems(extracted);

      return {
        id: resource.id,
        label: resource.label,
        status: 'ok',
        command: ['aws', ...resource.command].join(' '),
        count: items.length,
        items,
        payload,
      };
    } catch (error: any) {
      const message = formatAwsError(error);
      if (isUnsupportedOperation(message) && this.compatibilityService.canHandleResource(serviceKey, resource.id)) {
        const compatibilityResource = await this.compatibilityService.getResource(serviceKey, resource.id);
        if (compatibilityResource) return compatibilityResource;
      }

      return {
        id: resource.id,
        label: resource.label,
        status: isUnsupportedOperation(message) ? 'unsupported' : 'error',
        command: ['aws', ...resource.command].join(' '),
        count: 0,
        items: [],
        error: message,
      };
    }
  }
}

const getPath = (payload: unknown, path: string) => {
  return path.split('.').reduce<unknown>((current, segment) => {
    if (current && typeof current === 'object' && segment in current) {
      return (current as Record<string, unknown>)[segment];
    }

    return undefined;
  }, payload);
};

const normalizeItems = (value: unknown) => {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null) return [];
  return [value];
};

const formatAwsError = (error: unknown) => {
  if (error instanceof AwsCliError) {
    return error.stderr.trim() || error.stdout.trim() || error.message;
  }

  if (error instanceof Error) return error.message;
  return 'AWS CLI command failed';
};

const isUnsupportedOperation = (message: string) => {
  const normalized = message.toLowerCase();
  return [
    'unknown operation',
    'unsupportedoperation',
    'is not supported',
    'invalidaction',
    'nosuchbucket',
    'invalidargument',
  ].some(fragment => normalized.includes(fragment));
};
