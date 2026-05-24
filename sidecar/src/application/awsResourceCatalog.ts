export interface AwsResourceDefinition {
  id: string;
  label: string;
  command: string[];
  resultPath?: string;
}

export interface AwsServiceDefinition {
  serviceName: string;
  description: string;
  resources: AwsResourceDefinition[];
}

export const awsResourceCatalog: Record<string, AwsServiceDefinition> = {
  s3: {
    serviceName: 'S3 Buckets',
    description: 'Inventario real de buckets leído desde s3api.',
    resources: [
      { id: 'buckets', label: 'Buckets', command: ['s3api', 'list-buckets'], resultPath: 'Buckets' },
    ],
  },
  dynamodb: {
    serviceName: 'DynamoDB',
    description: 'Tablas y límites reales leídos desde DynamoDB.',
    resources: [
      { id: 'tables', label: 'Tables', command: ['dynamodb', 'list-tables'], resultPath: 'TableNames' },
      { id: 'limits', label: 'Account limits', command: ['dynamodb', 'describe-limits'] },
    ],
  },
  sts: {
    serviceName: 'STS',
    description: 'Identidad de cuenta y caller real leidos desde STS.',
    resources: [
      { id: 'caller-identity', label: 'Caller identity', command: ['sts', 'get-caller-identity'] },
    ],
  },
  ses: {
    serviceName: 'SES Sink',
    description: 'Identidades y estadísticas reales disponibles en SES.',
    resources: [
      { id: 'identities', label: 'Identities', command: ['ses', 'list-identities'], resultPath: 'Identities' },
      { id: 'send-statistics', label: 'Send statistics', command: ['ses', 'get-send-statistics'], resultPath: 'SendDataPoints' },
      { id: 'v2-identities', label: 'SES v2 identities', command: ['sesv2', 'list-email-identities'], resultPath: 'EmailIdentities' },
      { id: 'v2-templates', label: 'SES v2 templates', command: ['sesv2', 'list-email-templates'], resultPath: 'TemplatesMetadata' },
    ],
  },
  ec2: {
    serviceName: 'EC2 Inventory',
    description: 'Inventario real de instancias, redes y seguridad EC2.',
    resources: [
      { id: 'instances', label: 'Instances', command: ['ec2', 'describe-instances'], resultPath: 'Reservations' },
      { id: 'vpcs', label: 'VPCs', command: ['ec2', 'describe-vpcs'], resultPath: 'Vpcs' },
      { id: 'subnets', label: 'Subnets', command: ['ec2', 'describe-subnets'], resultPath: 'Subnets' },
      { id: 'security-groups', label: 'Security groups', command: ['ec2', 'describe-security-groups'], resultPath: 'SecurityGroups' },
      { id: 'key-pairs', label: 'Key pairs', command: ['ec2', 'describe-key-pairs'], resultPath: 'KeyPairs' },
    ],
  },
  apigateway: {
    serviceName: 'API Gateway',
    description: 'APIs REST y HTTP/WebSocket leídas desde API Gateway.',
    resources: [
      { id: 'rest-apis', label: 'REST APIs', command: ['apigateway', 'get-rest-apis'], resultPath: 'items' },
      { id: 'v2-apis', label: 'HTTP/WebSocket APIs', command: ['apigatewayv2', 'get-apis'], resultPath: 'Items' },
    ],
  },
  route53: {
    serviceName: 'Route 53',
    description: 'Zonas hospedadas y reglas resolver reales.',
    resources: [
      { id: 'hosted-zones', label: 'Hosted zones', command: ['route53', 'list-hosted-zones'], resultPath: 'HostedZones' },
      { id: 'resolver-rules', label: 'Resolver rules', command: ['route53resolver', 'list-resolver-rules', '--max-results', '100'], resultPath: 'ResolverRules' },
    ],
  },
  stepfunctions: {
    serviceName: 'Step Functions',
    description: 'State machines y activities reales desde Step Functions.',
    resources: [
      { id: 'state-machines', label: 'State machines', command: ['stepfunctions', 'list-state-machines'], resultPath: 'stateMachines' },
      { id: 'activities', label: 'Activities', command: ['stepfunctions', 'list-activities'], resultPath: 'activities' },
    ],
  },
  cognito: {
    serviceName: 'Cognito',
    description: 'User pools e identity pools reales.',
    resources: [
      { id: 'user-pools', label: 'User pools', command: ['cognito-idp', 'list-user-pools', '--max-results', '60'], resultPath: 'UserPools' },
      { id: 'identity-pools', label: 'Identity pools', command: ['cognito-identity', 'list-identity-pools', '--max-results', '60'], resultPath: 'IdentityPools' },
    ],
  },
  athena: {
    serviceName: 'Athena',
    description: 'Workgroups, catálogos y ejecuciones reales de Athena.',
    resources: [
      { id: 'workgroups', label: 'Workgroups', command: ['athena', 'list-work-groups'], resultPath: 'WorkGroups' },
      { id: 'catalogs', label: 'Data catalogs', command: ['athena', 'list-data-catalogs'], resultPath: 'DataCatalogsSummary' },
      { id: 'queries', label: 'Query executions', command: ['athena', 'list-query-executions'], resultPath: 'QueryExecutionIds' },
    ],
  },
  cloudfront: {
    serviceName: 'CloudFront',
    description: 'Distribuciones y funciones reales de CloudFront.',
    resources: [
      { id: 'distributions', label: 'Distributions', command: ['cloudfront', 'list-distributions'], resultPath: 'DistributionList.Items' },
      { id: 'functions', label: 'Functions', command: ['cloudfront', 'list-functions'], resultPath: 'FunctionList.Items' },
    ],
  },
  cloudwatchmetrics: {
    serviceName: 'CloudWatch Metrics',
    description: 'Metricas y alarmas reales disponibles en CloudWatch Metrics.',
    resources: [
      { id: 'metrics', label: 'Metrics', command: ['cloudwatch', 'list-metrics'], resultPath: 'Metrics' },
      { id: 'alarms', label: 'Alarms', command: ['cloudwatch', 'describe-alarms'], resultPath: 'MetricAlarms' },
    ],
  },
  scheduler: {
    serviceName: 'EventBridge Scheduler',
    description: 'Schedule groups y schedules reales desde EventBridge Scheduler.',
    resources: [
      { id: 'schedule-groups', label: 'Schedule groups', command: ['scheduler', 'list-schedule-groups'], resultPath: 'ScheduleGroups' },
      { id: 'schedules', label: 'Schedules', command: ['scheduler', 'list-schedules'], resultPath: 'Schedules' },
    ],
  },
  firehose: {
    serviceName: 'Data Firehose',
    description: 'Delivery streams reales de Data Firehose.',
    resources: [
      { id: 'delivery-streams', label: 'Delivery streams', command: ['firehose', 'list-delivery-streams'], resultPath: 'DeliveryStreamNames' },
    ],
  },
  appconfig: {
    serviceName: 'AppConfig',
    description: 'Aplicaciones y estrategias de despliegue reales de AppConfig.',
    resources: [
      { id: 'applications', label: 'Applications', command: ['appconfig', 'list-applications'], resultPath: 'Items' },
      { id: 'deployment-strategies', label: 'Deployment strategies', command: ['appconfig', 'list-deployment-strategies'], resultPath: 'Items' },
    ],
  },
  appconfigdata: {
    serviceName: 'AppConfig Data',
    description: 'Data plane de AppConfig; no tiene listado global natural, asi que se gestiona desde el compat del sidecar.',
    resources: [],
  },
  bedrockruntime: {
    serviceName: 'Bedrock Runtime',
    description: 'Runtime local stub de Bedrock para invocaciones de desarrollo; no expone inventario global.',
    resources: [],
  },
  codebuild: {
    serviceName: 'CodeBuild',
    description: 'Proyectos y builds reales de CodeBuild.',
    resources: [
      { id: 'projects', label: 'Projects', command: ['codebuild', 'list-projects'], resultPath: 'projects' },
      { id: 'builds', label: 'Builds', command: ['codebuild', 'list-builds'], resultPath: 'ids' },
    ],
  },
  codeartifact: {
    serviceName: 'CodeArtifact',
    description: 'CodeArtifact no aparece en la matriz de servicios soportados por Floci; estas llamadas muestran la respuesta real del emulador.',
    resources: [
      { id: 'domains', label: 'Domains', command: ['codeartifact', 'list-domains'], resultPath: 'domains' },
      { id: 'repositories', label: 'Repositories', command: ['codeartifact', 'list-repositories'], resultPath: 'repositories' },
    ],
  },
  codepipeline: {
    serviceName: 'CodePipeline',
    description: 'Pipelines reales de CodePipeline.',
    resources: [
      { id: 'pipelines', label: 'Pipelines', command: ['codepipeline', 'list-pipelines'], resultPath: 'pipelines' },
    ],
  },
  codedeploy: {
    serviceName: 'CodeDeploy',
    description: 'Aplicaciones, deployment configs y deployments reales de CodeDeploy.',
    resources: [
      { id: 'applications', label: 'Applications', command: ['deploy', 'list-applications'], resultPath: 'applications' },
      { id: 'deployment-configs', label: 'Deployment configs', command: ['deploy', 'list-deployment-configs'], resultPath: 'deploymentConfigsList' },
      { id: 'deployments', label: 'Deployments', command: ['deploy', 'list-deployments'], resultPath: 'deployments' },
    ],
  },
  appsync: {
    serviceName: 'AppSync',
    description: 'GraphQL APIs reales de AppSync.',
    resources: [
      { id: 'graphql-apis', label: 'GraphQL APIs', command: ['appsync', 'list-graphql-apis'], resultPath: 'graphqlApis' },
    ],
  },
  marketplace: {
    serviceName: 'Software Marketplace',
    description: 'Catálogo real de AWS Marketplace cuando el emulador lo soporte.',
    resources: [
      { id: 'ami-products', label: 'AMI products', command: ['marketplace-catalog', 'list-entities', '--catalog', 'AWSMarketplace', '--entity-type', 'AmiProduct'], resultPath: 'EntitySummaryList' },
    ],
  },
  roadmap: {
    serviceName: 'Roadmap',
    description: 'No hay backend operativo configurado para roadmap dentro de Floci.',
    resources: [],
  },
  redshift: {
    serviceName: 'Redshift',
    description: 'Clusters reales de Redshift.',
    resources: [
      { id: 'clusters', label: 'Clusters', command: ['redshift', 'describe-clusters'], resultPath: 'Clusters' },
    ],
  },
  opensearch: {
    serviceName: 'OpenSearch',
    description: 'Dominios reales de OpenSearch.',
    resources: [
      { id: 'domains', label: 'Domains', command: ['opensearch', 'list-domain-names'], resultPath: 'DomainNames' },
    ],
  },
  msk: {
    serviceName: 'MSK',
    description: 'Clusters reales de Kafka/MSK.',
    resources: [
      { id: 'clusters', label: 'Clusters', command: ['kafka', 'list-clusters'], resultPath: 'ClusterInfoList' },
    ],
  },
  sagemaker: {
    serviceName: 'SageMaker',
    description: 'Modelos y endpoints reales de SageMaker.',
    resources: [
      { id: 'models', label: 'Models', command: ['sagemaker', 'list-models'], resultPath: 'Models' },
      { id: 'endpoints', label: 'Endpoints', command: ['sagemaker', 'list-endpoints'], resultPath: 'Endpoints' },
    ],
  },
  iotcore: {
    serviceName: 'IoT Core',
    description: 'Things reales de IoT Core.',
    resources: [
      { id: 'things', label: 'Things', command: ['iot', 'list-things'], resultPath: 'things' },
    ],
  },
  batch: {
    serviceName: 'AWS Batch',
    description: 'Colas y compute environments reales de AWS Batch.',
    resources: [
      { id: 'job-queues', label: 'Job queues', command: ['batch', 'describe-job-queues'], resultPath: 'jobQueues' },
      { id: 'compute-environments', label: 'Compute environments', command: ['batch', 'describe-compute-environments'], resultPath: 'computeEnvironments' },
    ],
  },
  autoscaling: {
    serviceName: 'Auto Scaling',
    description: 'Auto Scaling groups y launch configurations reales.',
    resources: [
      { id: 'auto-scaling-groups', label: 'Auto Scaling groups', command: ['autoscaling', 'describe-auto-scaling-groups'], resultPath: 'AutoScalingGroups' },
      { id: 'launch-configurations', label: 'Launch configurations', command: ['autoscaling', 'describe-launch-configurations'], resultPath: 'LaunchConfigurations' },
    ],
  },
  transitgateway: {
    serviceName: 'Transit Gateway',
    description: 'Transit gateways reales leídos desde EC2.',
    resources: [
      { id: 'transit-gateways', label: 'Transit gateways', command: ['ec2', 'describe-transit-gateways'], resultPath: 'TransitGateways' },
    ],
  },
  beanstalk: {
    serviceName: 'Elastic Beanstalk',
    description: 'Aplicaciones y entornos reales de Elastic Beanstalk.',
    resources: [
      { id: 'applications', label: 'Applications', command: ['elasticbeanstalk', 'describe-applications'], resultPath: 'Applications' },
      { id: 'environments', label: 'Environments', command: ['elasticbeanstalk', 'describe-environments'], resultPath: 'Environments' },
    ],
  },
  efs: {
    serviceName: 'EFS',
    description: 'File systems reales de EFS.',
    resources: [
      { id: 'file-systems', label: 'File systems', command: ['efs', 'describe-file-systems'], resultPath: 'FileSystems' },
    ],
  },
  neptune: {
    serviceName: 'Neptune',
    description: 'Clusters reales de Neptune.',
    resources: [
      { id: 'clusters', label: 'DB clusters', command: ['neptune', 'describe-db-clusters'], resultPath: 'DBClusters' },
    ],
  },
  cloudtrail: {
    serviceName: 'CloudTrail',
    description: 'Trails y eventos reales de CloudTrail.',
    resources: [
      { id: 'trails', label: 'Trails', command: ['cloudtrail', 'describe-trails'], resultPath: 'trailList' },
      { id: 'events', label: 'Events', command: ['cloudtrail', 'lookup-events'], resultPath: 'Events' },
    ],
  },
  identitycenter: {
    serviceName: 'IAM Identity Center',
    description: 'Instancias reales de IAM Identity Center.',
    resources: [
      { id: 'instances', label: 'Instances', command: ['sso-admin', 'list-instances'], resultPath: 'Instances' },
    ],
  },
  elb: {
    serviceName: 'Elastic Load Balancing',
    description: 'Load balancers reales de ELBv2.',
    resources: [
      { id: 'elbv2', label: 'ELBv2 load balancers', command: ['elbv2', 'describe-load-balancers'], resultPath: 'LoadBalancers' },
    ],
  },
  apprunner: {
    serviceName: 'App Runner',
    description: 'Servicios reales de App Runner.',
    resources: [
      { id: 'services', label: 'Services', command: ['apprunner', 'list-services'], resultPath: 'ServiceSummaryList' },
    ],
  },
  backup: {
    serviceName: 'Backup',
    description: 'Vaults y planes reales de AWS Backup.',
    resources: [
      { id: 'vaults', label: 'Backup vaults', command: ['backup', 'list-backup-vaults'], resultPath: 'BackupVaultList' },
      { id: 'plans', label: 'Backup plans', command: ['backup', 'list-backup-plans'], resultPath: 'BackupPlansList' },
    ],
  },
  transfer: {
    serviceName: 'Transfer Family',
    description: 'Servidores reales de AWS Transfer Family.',
    resources: [
      { id: 'servers', label: 'Servers', command: ['transfer', 'list-servers'], resultPath: 'Servers' },
    ],
  },
  textract: {
    serviceName: 'Textract',
    description: 'API stub de Textract para desarrollo local; los jobs se gestionan desde el compat del sidecar.',
    resources: [],
  },
  pricing: {
    serviceName: 'Pricing',
    description: 'Catalogo de servicios y productos del endpoint Pricing local.',
    resources: [
      { id: 'services', label: 'Services', command: ['pricing', 'describe-services'], resultPath: 'Services' },
      { id: 'ec2-products', label: 'EC2 products', command: ['pricing', 'get-products', '--service-code', 'AmazonEC2', '--max-results', '10'], resultPath: 'PriceList' },
    ],
  },
  costexplorer: {
    serviceName: 'Cost Explorer',
    description: 'Costes sintetizados desde el estado local de Floci; sin listado global estable para la pantalla generica.',
    resources: [],
  },
  cur: {
    serviceName: 'Cost and Usage Reports',
    description: 'Definiciones reales de Cost and Usage Reports.',
    resources: [
      { id: 'report-definitions', label: 'Report definitions', command: ['cur', 'describe-report-definitions'], resultPath: 'ReportDefinitions' },
    ],
  },
  bcmdataexports: {
    serviceName: 'BCM Data Exports',
    description: 'Exports reales de Billing and Cost Management Data Exports.',
    resources: [
      { id: 'exports', label: 'Exports', command: ['bcm-data-exports', 'list-exports'], resultPath: 'Exports' },
    ],
  },
  awsq: {
    serviceName: 'AWS Q Developer',
    description: 'Aplicaciones reales de Amazon Q Business cuando estén soportadas.',
    resources: [
      { id: 'applications', label: 'Applications', command: ['qbusiness', 'list-applications'], resultPath: 'applications' },
    ],
  },
  ssm: {
    serviceName: 'SSM Parameters',
    description: 'Parámetros reales de Systems Manager Parameter Store.',
    resources: [
      { id: 'parameters', label: 'Parameters', command: ['ssm', 'describe-parameters'], resultPath: 'Parameters' },
    ],
  },
};
