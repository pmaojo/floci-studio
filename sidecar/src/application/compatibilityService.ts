import { config } from '../config';
import { JsonStateStore } from '../infrastructure/jsonStateStore';
import { RecipeService } from './recipeService';

interface CompatibilityResourceDefinition {
  id: string;
  label: string;
}

interface CompatibilityServiceDefinition {
  serviceName: string;
  description: string;
  resources: CompatibilityResourceDefinition[];
}

interface GenericCompatibilityRecord {
  id: string;
  name: string;
  arn: string;
  status: string;
  createdTime: string;
  [key: string]: string;
}

interface GenericCompatibilityState {
  resources: Record<string, GenericCompatibilityRecord[]>;
}

interface CodeArtifactDomain {
  name: string;
  arn: string;
  owner: string;
  status: string;
  createdTime: string;
}

interface CodeArtifactRepository {
  name: string;
  arn: string;
  domainName: string;
  administratorAccount: string;
  createdTime: string;
}

interface CodeArtifactState {
  domains: CodeArtifactDomain[];
  repositories: CodeArtifactRepository[];
}

const accountId = '000000000000';

const genericCompatibilityCatalog: Record<string, CompatibilityServiceDefinition> = {
  s3: {
    serviceName: 'S3 Buckets',
    description: 'Compatibilidad local persistente para buckets S3 cuando Floci no exponga la operacion requerida.',
    resources: [{ id: 'buckets', label: 'Buckets' }],
  },
  dynamodb: {
    serviceName: 'DynamoDB',
    description: 'Compatibilidad local persistente para tablas y limites de DynamoDB no implementados por Floci.',
    resources: [
      { id: 'tables', label: 'Tables' },
      { id: 'limits', label: 'Account limits' },
    ],
  },
  sts: {
    serviceName: 'STS',
    description: 'Compatibilidad local persistente para identidad de cuenta STS.',
    resources: [{ id: 'caller-identity', label: 'Caller identity' }],
  },
  ses: {
    serviceName: 'SES Sink',
    description: 'Compatibilidad local persistente para identidades y estadisticas SES.',
    resources: [
      { id: 'identities', label: 'Identities' },
      { id: 'send-statistics', label: 'Send statistics' },
      { id: 'v2-identities', label: 'SES v2 identities' },
      { id: 'v2-templates', label: 'SES v2 templates' },
    ],
  },
  ec2: {
    serviceName: 'EC2 Inventory',
    description: 'Compatibilidad local persistente para inventario EC2 cuando una operacion no este disponible.',
    resources: [
      { id: 'instances', label: 'Instances' },
      { id: 'vpcs', label: 'VPCs' },
      { id: 'subnets', label: 'Subnets' },
      { id: 'security-groups', label: 'Security groups' },
      { id: 'key-pairs', label: 'Key pairs' },
    ],
  },
  apigateway: {
    serviceName: 'API Gateway',
    description: 'Compatibilidad local persistente para APIs REST, HTTP y WebSocket.',
    resources: [
      { id: 'rest-apis', label: 'REST APIs' },
      { id: 'v2-apis', label: 'HTTP/WebSocket APIs' },
    ],
  },
  route53: {
    serviceName: 'Route 53',
    description: 'Compatibilidad local persistente para hosted zones y reglas resolver.',
    resources: [
      { id: 'hosted-zones', label: 'Hosted zones' },
      { id: 'resolver-rules', label: 'Resolver rules' },
    ],
  },
  stepfunctions: {
    serviceName: 'Step Functions',
    description: 'Compatibilidad local persistente para state machines y activities.',
    resources: [
      { id: 'state-machines', label: 'State machines' },
      { id: 'activities', label: 'Activities' },
    ],
  },
  cognito: {
    serviceName: 'Cognito',
    description: 'Compatibilidad local persistente para user pools e identity pools.',
    resources: [
      { id: 'user-pools', label: 'User pools' },
      { id: 'identity-pools', label: 'Identity pools' },
    ],
  },
  athena: {
    serviceName: 'Athena',
    description: 'Compatibilidad local persistente para workgroups, catalogos y ejecuciones de Athena.',
    resources: [
      { id: 'workgroups', label: 'Workgroups' },
      { id: 'catalogs', label: 'Data catalogs' },
      { id: 'queries', label: 'Query executions' },
    ],
  },
  cloudfront: {
    serviceName: 'CloudFront',
    description: 'Compatibilidad local persistente para distribuciones y funciones CloudFront.',
    resources: [
      { id: 'distributions', label: 'Distributions' },
      { id: 'functions', label: 'Functions' },
    ],
  },
  cloudwatchmetrics: {
    serviceName: 'CloudWatch Metrics',
    description: 'Compatibilidad local persistente para metricas y alarmas CloudWatch.',
    resources: [
      { id: 'metrics', label: 'Metrics' },
      { id: 'alarms', label: 'Alarms' },
    ],
  },
  scheduler: {
    serviceName: 'EventBridge Scheduler',
    description: 'Compatibilidad local persistente para schedule groups y schedules.',
    resources: [
      { id: 'schedule-groups', label: 'Schedule groups' },
      { id: 'schedules', label: 'Schedules' },
    ],
  },
  firehose: {
    serviceName: 'Data Firehose',
    description: 'Compatibilidad local persistente para delivery streams Firehose.',
    resources: [{ id: 'delivery-streams', label: 'Delivery streams' }],
  },
  appconfig: {
    serviceName: 'AppConfig',
    description: 'Compatibilidad local persistente para aplicaciones y estrategias AppConfig.',
    resources: [
      { id: 'applications', label: 'Applications' },
      { id: 'deployment-strategies', label: 'Deployment strategies' },
    ],
  },
  appconfigdata: {
    serviceName: 'AppConfig Data',
    description: 'Compatibilidad local persistente para sesiones AppConfig Data.',
    resources: [{ id: 'configuration-sessions', label: 'Configuration sessions' }],
  },
  bedrockruntime: {
    serviceName: 'Bedrock Runtime',
    description: 'Compatibilidad local persistente para invocaciones Bedrock Runtime.',
    resources: [{ id: 'model-invocations', label: 'Model invocations' }],
  },
  ssm: {
    serviceName: 'SSM Parameters',
    description: 'Compatibilidad local persistente para parametros de Systems Manager Parameter Store.',
    resources: [{ id: 'parameters', label: 'Parameters' }],
  },
  codebuild: {
    serviceName: 'CodeBuild',
    description: 'Compatibilidad local persistente para proyectos y builds de CodeBuild.',
    resources: [
      { id: 'projects', label: 'Projects' },
      { id: 'builds', label: 'Builds' },
    ],
  },
  codepipeline: {
    serviceName: 'CodePipeline',
    description: 'Compatibilidad local persistente para pipelines.',
    resources: [{ id: 'pipelines', label: 'Pipelines' }],
  },
  codedeploy: {
    serviceName: 'CodeDeploy',
    description: 'Compatibilidad local persistente para aplicaciones y deployments CodeDeploy.',
    resources: [
      { id: 'applications', label: 'Applications' },
      { id: 'deployment-configs', label: 'Deployment configs' },
      { id: 'deployments', label: 'Deployments' },
    ],
  },
  appsync: {
    serviceName: 'AppSync',
    description: 'Compatibilidad local persistente para APIs GraphQL.',
    resources: [{ id: 'graphql-apis', label: 'GraphQL APIs' }],
  },
  marketplace: {
    serviceName: 'Software Marketplace',
    description: 'Catalogo local persistente para marketplace compatible con la consola.',
    resources: [{ id: 'ami-products', label: 'AMI products' }],
  },
  roadmap: {
    serviceName: 'Roadmap',
    description: 'Compatibilidad local persistente para items de roadmap operados desde la consola.',
    resources: [{ id: 'items', label: 'Roadmap items' }],
  },
  redshift: {
    serviceName: 'Redshift',
    description: 'Compatibilidad local persistente para clusters Redshift.',
    resources: [{ id: 'clusters', label: 'Clusters' }],
  },
  opensearch: {
    serviceName: 'OpenSearch',
    description: 'Compatibilidad local persistente para dominios OpenSearch.',
    resources: [{ id: 'domains', label: 'Domains' }],
  },
  msk: {
    serviceName: 'MSK',
    description: 'Compatibilidad local persistente para clusters Kafka/MSK.',
    resources: [{ id: 'clusters', label: 'Clusters' }],
  },
  sagemaker: {
    serviceName: 'SageMaker',
    description: 'Compatibilidad local persistente para modelos y endpoints SageMaker.',
    resources: [
      { id: 'models', label: 'Models' },
      { id: 'endpoints', label: 'Endpoints' },
    ],
  },
  iotcore: {
    serviceName: 'IoT Core',
    description: 'Compatibilidad local persistente para things IoT.',
    resources: [{ id: 'things', label: 'Things' }],
  },
  batch: {
    serviceName: 'AWS Batch',
    description: 'Compatibilidad local persistente para colas y compute environments Batch.',
    resources: [
      { id: 'job-queues', label: 'Job queues' },
      { id: 'compute-environments', label: 'Compute environments' },
    ],
  },
  autoscaling: {
    serviceName: 'Auto Scaling',
    description: 'Compatibilidad local persistente para Auto Scaling.',
    resources: [
      { id: 'auto-scaling-groups', label: 'Auto Scaling groups' },
      { id: 'launch-configurations', label: 'Launch configurations' },
    ],
  },
  transitgateway: {
    serviceName: 'Transit Gateway',
    description: 'Compatibilidad local persistente para transit gateways.',
    resources: [{ id: 'transit-gateways', label: 'Transit gateways' }],
  },
  beanstalk: {
    serviceName: 'Elastic Beanstalk',
    description: 'Compatibilidad local persistente para aplicaciones y entornos Beanstalk.',
    resources: [
      { id: 'applications', label: 'Applications' },
      { id: 'environments', label: 'Environments' },
    ],
  },
  efs: {
    serviceName: 'EFS',
    description: 'Compatibilidad local persistente para file systems EFS.',
    resources: [{ id: 'file-systems', label: 'File systems' }],
  },
  neptune: {
    serviceName: 'Neptune',
    description: 'Compatibilidad local persistente para clusters Neptune.',
    resources: [{ id: 'clusters', label: 'DB clusters' }],
  },
  cloudtrail: {
    serviceName: 'CloudTrail',
    description: 'Compatibilidad local persistente para trails y eventos de auditoria.',
    resources: [
      { id: 'trails', label: 'Trails' },
      { id: 'events', label: 'Events' },
    ],
  },
  identitycenter: {
    serviceName: 'IAM Identity Center',
    description: 'Compatibilidad local persistente para instancias IAM Identity Center.',
    resources: [{ id: 'instances', label: 'Instances' }],
  },
  elb: {
    serviceName: 'Elastic Load Balancing',
    description: 'Compatibilidad local persistente para load balancers ELB classic y v2.',
    resources: [
      { id: 'elbv2', label: 'ELBv2 load balancers' },
      { id: 'classic-elb', label: 'Classic load balancers' },
    ],
  },
  apprunner: {
    serviceName: 'App Runner',
    description: 'Compatibilidad local persistente para servicios App Runner.',
    resources: [{ id: 'services', label: 'Services' }],
  },
  backup: {
    serviceName: 'Backup',
    description: 'Compatibilidad local persistente para vaults y planes de AWS Backup.',
    resources: [
      { id: 'vaults', label: 'Backup vaults' },
      { id: 'plans', label: 'Backup plans' },
    ],
  },
  transfer: {
    serviceName: 'Transfer Family',
    description: 'Compatibilidad local persistente para servidores Transfer Family.',
    resources: [{ id: 'servers', label: 'Servers' }],
  },
  textract: {
    serviceName: 'Textract',
    description: 'Compatibilidad local persistente para jobs Textract.',
    resources: [{ id: 'jobs', label: 'Jobs' }],
  },
  pricing: {
    serviceName: 'Pricing',
    description: 'Compatibilidad local persistente para catalogo Pricing.',
    resources: [
      { id: 'services', label: 'Services' },
      { id: 'ec2-products', label: 'EC2 products' },
    ],
  },
  costexplorer: {
    serviceName: 'Cost Explorer',
    description: 'Compatibilidad local persistente para informes Cost Explorer.',
    resources: [
      { id: 'cost-and-usage', label: 'Cost and usage' },
      { id: 'dimension-values', label: 'Dimension values' },
    ],
  },
  cur: {
    serviceName: 'Cost and Usage Reports',
    description: 'Compatibilidad local persistente para definiciones CUR.',
    resources: [{ id: 'report-definitions', label: 'Report definitions' }],
  },
  bcmdataexports: {
    serviceName: 'BCM Data Exports',
    description: 'Compatibilidad local persistente para BCM Data Exports.',
    resources: [{ id: 'exports', label: 'Exports' }],
  },
  awsq: {
    serviceName: 'AWS Q Developer',
    description: 'Compatibilidad local persistente para aplicaciones de Amazon Q Business.',
    resources: [{ id: 'applications', label: 'Applications' }],
  },
};

export class CompatibilityService {
  private readonly codeArtifactStore = new JsonStateStore<CodeArtifactState>('codeartifact.json', {
    domains: [],
    repositories: [],
  });

  constructor(private readonly recipeService = new RecipeService()) {}

  canHandle(serviceKey: string) {
    return serviceKey === 'codeartifact' || serviceKey in genericCompatibilityCatalog;
  }

  shouldBypassNative(serviceKey: string) {
    return ['codeartifact', 'marketplace', 'transfer', 'iotcore'].includes(serviceKey);
  }

  canHandleResource(serviceKey: string, resourceId: string) {
    if (serviceKey === 'codeartifact') return ['domains', 'repositories'].includes(resourceId);
    return Boolean(genericCompatibilityCatalog[serviceKey]?.resources.some(resource => resource.id === resourceId));
  }

  async getOverview(serviceKey: string) {
    if (serviceKey === 'codeartifact') return this.getCodeArtifactOverview();
    if (genericCompatibilityCatalog[serviceKey]) return this.getGenericOverview(serviceKey);
    return null;
  }

  async getResource(serviceKey: string, resourceId: string) {
    if (serviceKey === 'codeartifact') {
      const state = await this.codeArtifactStore.read();
      if (resourceId === 'domains') return resource('domains', 'Domains', 'sidecar compat codeartifact list-domains', state.domains);
      if (resourceId === 'repositories') return resource('repositories', 'Repositories', 'sidecar compat codeartifact list-repositories', state.repositories);
      return null;
    }

    if (serviceKey === 'transfer' && resourceId === 'servers') {
      const installations: Record<string, any> = await this.recipeService.getInstallations().catch(() => ({}));
      const transferInst = installations['transfer'];
      if (transferInst && transferInst.status === 'RUNNING') {
        const sftpPort = transferInst.vars?.SFTP_PORT || 2222;
        const sftpUser = transferInst.vars?.SFTP_USER || 'floci';
        const sftpPass = transferInst.vars?.SFTP_PASSWORD || 'flocipass';
        const serverItem = {
          ServerId: 's-sftp-emulator',
          Arn: `arn:aws:transfer:${config.awsRegion}:${accountId}:server/s-sftp-emulator`,
          EndpointType: 'PUBLIC',
          State: 'ONLINE',
          UserCount: 1,
          Protocol: 'SFTP',
          EndpointDetails: `User: ${sftpUser} | Pass: ${sftpPass} | Port: ${sftpPort}`,
          CreatedTime: transferInst.installedAt || new Date().toISOString()
        };
        return resource(
          'servers',
          'Servers',
          'aws transfer list-servers',
          [serverItem]
        );
      } else {
        const serverItem = {
          ServerId: 's-sftp-emulator-offline',
          Arn: `arn:aws:transfer:${config.awsRegion}:${accountId}:server/s-sftp-emulator-offline`,
          EndpointType: 'PUBLIC',
          State: 'OFFLINE (Launch recipe in Software Marketplace)',
          UserCount: 0,
          Protocol: 'SFTP',
          EndpointDetails: 'No active listener running',
          CreatedTime: '-'
        };
        return resource(
          'servers',
          'Servers',
          'aws transfer list-servers',
          [serverItem]
        );
      }
    }

    if (serviceKey === 'iotcore' && resourceId === 'things') {
      const installations: Record<string, any> = await this.recipeService.getInstallations().catch(() => ({}));
      const iotInst = installations['iotcore'];
      const isRunning = iotInst && iotInst.status === 'RUNNING';
      const mqttPort = iotInst?.vars?.MQTT_PORT || 1883;

      const state = await this.genericStore('iotcore').read();
      const things = state.resources['things'] || [];
      
      const enrichedThings = things.map(thing => ({
        ThingName: thing.name,
        Arn: thing.arn,
        Status: isRunning ? 'ONLINE' : 'OFFLINE (Broker not running)',
        BrokerAddress: isRunning ? `localhost:${mqttPort}` : '-',
        Protocol: isRunning ? 'MQTT (mosquitto)' : '-',
        CreatedTime: thing.createdTime
      }));

      if (enrichedThings.length === 0 && isRunning) {
        enrichedThings.push({
          ThingName: 'default-floci-device',
          Arn: `arn:aws:iot:${config.awsRegion}:${accountId}:thing/default-floci-device`,
          Status: 'ONLINE',
          BrokerAddress: `localhost:${mqttPort}`,
          Protocol: 'MQTT (mosquitto)',
          CreatedTime: iotInst.installedAt || new Date().toISOString()
        });
      }

      return resource(
        'things',
        'Things',
        'aws iot list-things',
        enrichedThings
      );
    }

    const definition = genericCompatibilityCatalog[serviceKey];
    const resourceDefinition = definition?.resources.find(item => item.id === resourceId);
    if (!definition || !resourceDefinition) return null;

    const state = await this.genericStore(serviceKey).read();
    return resource(
      resourceDefinition.id,
      resourceDefinition.label,
      `sidecar compat ${serviceKey} ${resourceDefinition.id}`,
      state.resources[resourceDefinition.id] || [],
    );
  }

  async createCodeArtifactDomain(name: string) {
    const cleanName = normalizeName(name);
    if (!cleanName) throw new Error('Domain name is required');

    await this.codeArtifactStore.update(state => {
      if (!state.domains.some(domain => domain.name === cleanName)) {
        state.domains.push({
          name: cleanName,
          arn: codeArtifactDomainArn(cleanName),
          owner: accountId,
          status: 'Active',
          createdTime: new Date().toISOString(),
        });
      }
    });

    return this.getCodeArtifactOverview();
  }

  async createCodeArtifactRepository(domainName: string, repositoryName: string) {
    const cleanDomainName = normalizeName(domainName);
    const cleanRepositoryName = normalizeName(repositoryName);
    if (!cleanDomainName || !cleanRepositoryName) throw new Error('Domain and repository names are required');

    await this.codeArtifactStore.update(state => {
      if (!state.domains.some(domain => domain.name === cleanDomainName)) {
        state.domains.push({
          name: cleanDomainName,
          arn: codeArtifactDomainArn(cleanDomainName),
          owner: accountId,
          status: 'Active',
          createdTime: new Date().toISOString(),
        });
      }

      if (!state.repositories.some(repository => repository.domainName === cleanDomainName && repository.name === cleanRepositoryName)) {
        state.repositories.push({
          name: cleanRepositoryName,
          arn: codeArtifactRepositoryArn(cleanDomainName, cleanRepositoryName),
          domainName: cleanDomainName,
          administratorAccount: accountId,
          createdTime: new Date().toISOString(),
        });
      }
    });

    return this.getCodeArtifactOverview();
  }

  async deleteCodeArtifactRepository(domainName: string, repositoryName: string) {
    const cleanDomainName = normalizeName(domainName);
    const cleanRepositoryName = normalizeName(repositoryName);

    await this.codeArtifactStore.update(state => {
      state.repositories = state.repositories.filter(repository => (
        repository.domainName !== cleanDomainName || repository.name !== cleanRepositoryName
      ));
    });

    return this.getCodeArtifactOverview();
  }

  async createGenericResource(serviceKey: string, resourceId: string, name: string) {
    const definition = genericCompatibilityCatalog[serviceKey];
    const resourceDefinition = definition?.resources.find(resource => resource.id === resourceId);
    const cleanName = normalizeName(name);
    if (!definition || !resourceDefinition) throw new Error(`Unsupported compatibility resource: ${serviceKey}/${resourceId}`);
    if (!cleanName) throw new Error('Resource name is required');

    await this.genericStore(serviceKey).update(state => {
      const records = state.resources[resourceId] || [];
      if (!records.some(record => record.name === cleanName)) {
        records.push({
          id: `${resourceId}-${cleanName}`,
          name: cleanName,
          arn: genericArn(serviceKey, resourceId, cleanName),
          status: 'Active',
          createdTime: new Date().toISOString(),
          resourceType: resourceDefinition.label,
        });
        state.resources[resourceId] = records;
      }
    });

    return this.getGenericOverview(serviceKey);
  }

  async deleteGenericResource(serviceKey: string, resourceId: string, name: string) {
    const definition = genericCompatibilityCatalog[serviceKey];
    const cleanName = normalizeName(name);
    if (!definition?.resources.some(resource => resource.id === resourceId)) {
      throw new Error(`Unsupported compatibility resource: ${serviceKey}/${resourceId}`);
    }

    await this.genericStore(serviceKey).update(state => {
      state.resources[resourceId] = (state.resources[resourceId] || []).filter(record => (
        record.name !== cleanName && record.id !== cleanName
      ));
    });

    return this.getGenericOverview(serviceKey);
  }

  private async getCodeArtifactOverview() {
    const state = await this.codeArtifactStore.read();
    return {
      serviceKey: 'codeartifact',
      serviceName: 'CodeArtifact',
      description: 'Compatibilidad local persistente para dominios y repositorios CodeArtifact.',
      endpointUrl: config.awsEndpointUrl,
      region: config.awsRegion,
      generatedAt: new Date().toISOString(),
      source: 'sidecar-compat',
      resources: [
        resource('domains', 'Domains', 'sidecar compat codeartifact list-domains', state.domains),
        resource('repositories', 'Repositories', 'sidecar compat codeartifact list-repositories', state.repositories),
      ],
    };
  }

  private async getGenericOverview(serviceKey: string) {
    const definition = genericCompatibilityCatalog[serviceKey];
    const resources = await Promise.all(
      definition.resources.map(item => this.getResource(serviceKey, item.id))
    );

    return {
      serviceKey,
      serviceName: definition.serviceName,
      description: definition.description,
      endpointUrl: config.awsEndpointUrl,
      region: config.awsRegion,
      generatedAt: new Date().toISOString(),
      source: 'sidecar-compat',
      resources: resources.filter((r): r is NonNullable<typeof r> => r !== null),
    };
  }

  private genericStore(serviceKey: string) {
    return new JsonStateStore<GenericCompatibilityState>(`${serviceKey}.json`, { resources: {} });
  }
}

const resource = (id: string, label: string, command: string, items: unknown[]) => ({
  id,
  label,
  status: 'ok',
  source: 'sidecar-compat',
  command,
  count: items.length,
  items,
  payload: { items },
});

const normalizeName = (value: string) => value.trim().toLowerCase();

const codeArtifactDomainArn = (domainName: string) => (
  `arn:aws:codeartifact:${config.awsRegion}:${accountId}:domain/${domainName}`
);

const codeArtifactRepositoryArn = (domainName: string, repositoryName: string) => (
  `arn:aws:codeartifact:${config.awsRegion}:${accountId}:repository/${domainName}/${repositoryName}`
);

const genericArn = (serviceKey: string, resourceId: string, name: string) => (
  `arn:aws:${serviceKey}:${config.awsRegion}:${accountId}:${resourceId}/${name}`
);
