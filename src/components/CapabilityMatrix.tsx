import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  HelpCircle, 
  Search, 
  ExternalLink,
  Cpu,
  Layers
} from 'lucide-react';
import { Card, Input } from './ui-elements';

export interface CapabilityServiceInfo {
  key: string;
  name: string;
  category: string;
  type: 'native' | 'compat' | 'unsupported';
  endpoint: 'Browser-Direct (SDK)' | 'Sidecar Routed' | 'None';
  storage: 'Localstack Memory' | 'JSON Persistent Store' | 'None';
  description: string;
}

const SERVICES_DATA: CapabilityServiceInfo[] = [
  // Computing
  { key: 'lambda', name: 'Lambda', category: 'Computing', type: 'native', endpoint: 'Browser-Direct (SDK)', storage: 'Localstack Memory', description: 'Execution of functions and layers directly on the local emulator.' },
  { key: 'ecs', name: 'ECS / EC2', category: 'Computing', type: 'native', endpoint: 'Browser-Direct (SDK)', storage: 'Localstack Memory', description: 'Containers, tasks and clusters emulated on standard ports.' },
  { key: 'ec2', name: 'EC2 Inventory', category: 'Computing', type: 'native', endpoint: 'Browser-Direct (SDK)', storage: 'Localstack Memory', description: 'Instances, VPCs, subnets, and keys accessed via browser-direct clients.' },
  { key: 'autoscaling', name: 'Auto Scaling', category: 'Computing', type: 'compat', endpoint: 'Sidecar Routed', storage: 'JSON Persistent Store', description: 'Scaling groups and launch configuration persistent states.' },
  { key: 'eks', name: 'EKS Clusters (K8s)', category: 'Computing', type: 'compat', endpoint: 'Sidecar Routed', storage: 'JSON Persistent Store', description: 'Kubernetes EKS simulation leveraging kubectl and kubeconfig mounts.' },
  { key: 'apprunner', name: 'App Runner Containers', category: 'Computing', type: 'compat', endpoint: 'Sidecar Routed', storage: 'JSON Persistent Store', description: 'Fast app container runner emulating service definitions.' },
  { key: 'beanstalk', name: 'Elastic Beanstalk', category: 'Computing', type: 'compat', endpoint: 'Sidecar Routed', storage: 'JSON Persistent Store', description: 'App and environment metadata store.' },
  { key: 'batch', name: 'AWS Batch Jobs', category: 'Computing', type: 'compat', endpoint: 'Sidecar Routed', storage: 'JSON Persistent Store', description: 'Job queues and compute environment emulated states.' },

  // Storage
  { key: 's3', name: 'S3 Buckets', category: 'Storage', type: 'native', endpoint: 'Browser-Direct (SDK)', storage: 'Localstack Memory', description: 'Storage buckets, file upload, download, and object browser.' },
  { key: 'dynamodb', name: 'DynamoDB', category: 'Storage', type: 'native', endpoint: 'Browser-Direct (SDK)', storage: 'Localstack Memory', description: 'NoSQL tables, document editor, primary keys and indexes.' },
  { key: 'ecr', name: 'ECR Registries', category: 'Storage', type: 'native', endpoint: 'Browser-Direct (SDK)', storage: 'Localstack Memory', description: 'Docker repositories and image tags registry.' },
  { key: 'efs', name: 'EFS Filesystems', category: 'Storage', type: 'compat', endpoint: 'Sidecar Routed', storage: 'JSON Persistent Store', description: 'Networked file systems persistent definitions.' },
  { key: 'backup', name: 'Backup Vault Cycles', category: 'Storage', type: 'compat', endpoint: 'Sidecar Routed', storage: 'JSON Persistent Store', description: 'Backup vault and plan emulated configurations.' },
  { key: 'transfer', name: 'Transfer Family', category: 'Storage', type: 'compat', endpoint: 'Sidecar Routed', storage: 'JSON Persistent Store', description: 'Orchestrated local SFTP listener backed by Docker-Compose.' },

  // Security & Identity
  { key: 'iam', name: 'IAM Roles', category: 'Security & Identity', type: 'native', endpoint: 'Browser-Direct (SDK)', storage: 'Localstack Memory', description: 'Users, groups, policies and execution role definitions.' },
  { key: 'sts', name: 'STS Identity', category: 'Security & Identity', type: 'native', endpoint: 'Browser-Direct (SDK)', storage: 'Localstack Memory', description: 'Token validation and caller identity operations.' },
  { key: 'cognito', name: 'Cognito Pools', category: 'Security & Identity', type: 'compat', endpoint: 'Sidecar Routed', storage: 'JSON Persistent Store', description: 'User pools, identity pools and developer authentication.' },
  { key: 'identitycenter', name: 'IAM Identity Center', category: 'Security & Identity', type: 'compat', endpoint: 'Sidecar Routed', storage: 'JSON Persistent Store', description: 'Single sign-on instances metadata store.' },
  { key: 'secrets', name: 'Secrets Manager', category: 'Security & Identity', type: 'native', endpoint: 'Browser-Direct (SDK)', storage: 'Localstack Memory', description: 'Database credentials and API key secure store.' },
  { key: 'ssm', name: 'SSM Parameters', category: 'Security & Identity', type: 'native', endpoint: 'Browser-Direct (SDK)', storage: 'Localstack Memory', description: 'Systems Manager Parameter Store configuration strings.' },
  { key: 'kms', name: 'KMS Keys', category: 'Security & Identity', type: 'native', endpoint: 'Browser-Direct (SDK)', storage: 'Localstack Memory', description: 'Key management, cryptographic aliases and KMS diagnostic diagnostics.' },
  { key: 'acm', name: 'ACM Certs', category: 'Security & Identity', type: 'native', endpoint: 'Browser-Direct (SDK)', storage: 'Localstack Memory', description: 'SSL/TLS certificates definitions.' },

  // Networking
  { key: 'vpc', name: 'VPC Fabrics', category: 'Networking & Content', type: 'native', endpoint: 'Browser-Direct (SDK)', storage: 'Localstack Memory', description: 'Subnets, route tables, gateway links and internet routes.' },
  { key: 'elb', name: 'Elastic Load Balancing', category: 'Networking & Content', type: 'compat', endpoint: 'Sidecar Routed', storage: 'JSON Persistent Store', description: 'Load balancer classic and v2 emulations.' },
  { key: 'route53', name: 'DNS Zones', category: 'Networking & Content', type: 'compat', endpoint: 'Sidecar Routed', storage: 'JSON Persistent Store', description: 'Hosted zones, resolver rules and DNS records.' },
  { key: 'cloudfront', name: 'CloudFront', category: 'Networking & Content', type: 'compat', endpoint: 'Sidecar Routed', storage: 'JSON Persistent Store', description: 'CDN distributions and edge functions configuration.' },
  { key: 'apigateway', name: 'API Gateway', category: 'Networking & Content', type: 'compat', endpoint: 'Sidecar Routed', storage: 'JSON Persistent Store', description: 'REST APIs, WebSocket and HTTP APIs endpoint routing.' },
  { key: 'appsync', name: 'AppSync GraphQL', category: 'Networking & Content', type: 'compat', endpoint: 'Sidecar Routed', storage: 'JSON Persistent Store', description: 'GraphQL APIs schemas and resolvers.' },
  { key: 'transitgateway', name: 'Transit Gateways', category: 'Networking & Content', type: 'compat', endpoint: 'Sidecar Routed', storage: 'JSON Persistent Store', description: 'VPC transit gateway routing nodes.' },

  // Databases & Analytics
  { key: 'rds', name: 'RDS Instances', category: 'Databases & Analytics', type: 'native', endpoint: 'Browser-Direct (SDK)', storage: 'Localstack Memory', description: 'Relational database instances and engine versions.' },
  { key: 'redshift', name: 'Redshift Clusters', category: 'Databases & Analytics', type: 'compat', endpoint: 'Sidecar Routed', storage: 'JSON Persistent Store', description: 'Data warehouse Redshift cluster configurations.' },
  { key: 'neptune', name: 'Neptune Graph', category: 'Databases & Analytics', type: 'compat', endpoint: 'Sidecar Routed', storage: 'JSON Persistent Store', description: 'Graph database DB clusters.' },
  { key: 'opensearch', name: 'OpenSearch Domains', category: 'Databases & Analytics', type: 'compat', endpoint: 'Sidecar Routed', storage: 'JSON Persistent Store', description: 'Search and analytics domain configurations.' },
  { key: 'msk', name: 'MSK Kafka Clusters', category: 'Databases & Analytics', type: 'compat', endpoint: 'Sidecar Routed', storage: 'JSON Persistent Store', description: 'Managed Streaming for Apache Kafka cluster configs.' },
  { key: 'elasticache', name: 'ElastiCache', category: 'Databases & Analytics', type: 'native', endpoint: 'Browser-Direct (SDK)', storage: 'Localstack Memory', description: 'Redis and Memcached memory cluster states.' },
  { key: 'athena', name: 'Athena Queries', category: 'Databases & Analytics', type: 'compat', endpoint: 'Sidecar Routed', storage: 'JSON Persistent Store', description: 'Interactive query executions, schemas and workgroups.' },
  { key: 'glue', name: 'Glue Catalog', category: 'Databases & Analytics', type: 'native', endpoint: 'Browser-Direct (SDK)', storage: 'Localstack Memory', description: 'Database registry and schemas catalog.' },

  // IoT & ML
  { key: 'sagemaker', name: 'SageMaker Models', category: 'IoT & Machine Learning', type: 'compat', endpoint: 'Sidecar Routed', storage: 'JSON Persistent Store', description: 'Machine learning model endpoints.' },
  { key: 'bedrock-runtime', name: 'Bedrock Runtime', category: 'IoT & Machine Learning', type: 'compat', endpoint: 'Sidecar Routed', storage: 'JSON Persistent Store', description: 'AI bedrock models local inference stubs.' },
  { key: 'textract', name: 'Textract', category: 'IoT & Machine Learning', type: 'compat', endpoint: 'Sidecar Routed', storage: 'JSON Persistent Store', description: 'Text extractor background jobs.' },
  { key: 'iotcore', name: 'IoT Core Registry', category: 'IoT & Machine Learning', type: 'compat', endpoint: 'Sidecar Routed', storage: 'JSON Persistent Store', description: 'Docker-composed MQTT Broker backed by Mosquitto.' },

  // DevOps
  { key: 'cloudformation', name: 'Stacks', category: 'DevOps & App Integration', type: 'native', endpoint: 'Browser-Direct (SDK)', storage: 'Localstack Memory', description: 'Infrastructure-as-code template stacks.' },
  { key: 'appconfig', name: 'AppConfig', category: 'DevOps & App Integration', type: 'compat', endpoint: 'Sidecar Routed', storage: 'JSON Persistent Store', description: 'Feature flags and configs.' },
  { key: 'appconfigdata', name: 'AppConfig Data', category: 'DevOps & App Integration', type: 'compat', endpoint: 'Sidecar Routed', storage: 'JSON Persistent Store', description: 'Dynamic config session data.' },
  { key: 'codebuild', name: 'CodeBuild', category: 'DevOps & App Integration', type: 'native', endpoint: 'Browser-Direct (SDK)', storage: 'Localstack Memory', description: 'Build projects and continuous build logs.' },
  { key: 'codepipeline', name: 'CodePipeline', category: 'DevOps & App Integration', type: 'compat', endpoint: 'Sidecar Routed', storage: 'JSON Persistent Store', description: 'Continuous integration pipelines.' },
  { key: 'codedeploy', name: 'CodeDeploy', category: 'DevOps & App Integration', type: 'compat', endpoint: 'Sidecar Routed', storage: 'JSON Persistent Store', description: 'Application deployment profiles.' },
  { key: 'sqs', name: 'SQS Queues', category: 'DevOps & App Integration', type: 'native', endpoint: 'Browser-Direct (SDK)', storage: 'Localstack Memory', description: 'Simple Queue Service queue browser and messages.' },
  { key: 'sns', name: 'SNS Topics', category: 'DevOps & App Integration', type: 'native', endpoint: 'Browser-Direct (SDK)', storage: 'Localstack Memory', description: 'Notification topic publish and subscriptions.' },
  { key: 'eventbridge', name: 'EventBridge', category: 'DevOps & App Integration', type: 'native', endpoint: 'Browser-Direct (SDK)', storage: 'Localstack Memory', description: 'Event buses, rules and target triggers.' },
  { key: 'scheduler', name: 'Scheduler', category: 'DevOps & App Integration', type: 'native', endpoint: 'Browser-Direct (SDK)', storage: 'Localstack Memory', description: 'EventBridge Scheduler recurring execution plans.' },
  { key: 'stepfunctions', name: 'Step Functions', category: 'DevOps & App Integration', type: 'native', endpoint: 'Browser-Direct (SDK)', storage: 'Localstack Memory', description: 'Visual state machines orchestration.' },
  { key: 'kinesis', name: 'Kinesis Streams', category: 'DevOps & App Integration', type: 'native', endpoint: 'Browser-Direct (SDK)', storage: 'Localstack Memory', description: 'Real-time data streaming shard browser.' },
  { key: 'firehose', name: 'Data Firehose', category: 'DevOps & App Integration', type: 'compat', endpoint: 'Sidecar Routed', storage: 'JSON Persistent Store', description: 'Delivery streams persistent targets.' },

  // Observability
  { key: 'cloudwatch', name: 'CloudWatch Logs', category: 'Observability', type: 'native', endpoint: 'Browser-Direct (SDK)', storage: 'Localstack Memory', description: 'Log groups browser and stream event output.' },
  { key: 'cloudwatch-metrics', name: 'CloudWatch Metrics', category: 'Observability', type: 'native', endpoint: 'Browser-Direct (SDK)', storage: 'Localstack Memory', description: 'Numerical metric streams and alerts.' },
  { key: 'cloudtrail', name: 'CloudTrail Audit', category: 'Observability', type: 'compat', endpoint: 'Sidecar Routed', storage: 'JSON Persistent Store', description: 'Audit trail and API event logs.' },

  // Billing
  { key: 'costexplorer', name: 'Cost Explorer', category: 'Billing & Cost', type: 'compat', endpoint: 'Sidecar Routed', storage: 'JSON Persistent Store', description: 'Visual cost allocation dashboards based on local resources.' },

  // Floci
  { key: 'roadmap', name: 'Roadmap', category: 'Floci Management', type: 'compat', endpoint: 'Sidecar Routed', storage: 'JSON Persistent Store', description: 'Development roadmap items.' },
  { key: 'codeartifact', name: 'CodeArtifact', category: 'Floci Management', type: 'compat', endpoint: 'Sidecar Routed', storage: 'JSON Persistent Store', description: 'Code repository artifact domains.' },
  { key: 'ses', name: 'SES Sink', category: 'Floci Management', type: 'compat', endpoint: 'Sidecar Routed', storage: 'JSON Persistent Store', description: 'Email transmission sink logs.' },

  // Special/Legacy/WAF
  { key: 'waf', name: 'WAF Web ACLs', category: 'Unsupported in Floci', type: 'native', endpoint: 'Browser-Direct (SDK)', storage: 'Localstack Memory', description: 'Shield WAFv2 rules and ACL blocks.' },
  { key: 'pricing', name: 'Pricing', category: 'Unsupported in Floci', type: 'compat', endpoint: 'Sidecar Routed', storage: 'JSON Persistent Store', description: 'AWS product price catalogs.' },
  { key: 'cur', name: 'Cost Reports', category: 'Unsupported in Floci', type: 'compat', endpoint: 'Sidecar Routed', storage: 'JSON Persistent Store', description: 'Cost and Usage Report definitions.' },
  { key: 'bcmdataexports', name: 'BCM Data Exports', category: 'Unsupported in Floci', type: 'compat', endpoint: 'Sidecar Routed', storage: 'JSON Persistent Store', description: 'BCM billing data exports.' },
  { key: 'awsq', name: 'AWS Q Developer', category: 'Unsupported in Floci', type: 'compat', endpoint: 'Sidecar Routed', storage: 'JSON Persistent Store', description: 'Amazon Q developer assistant configuration.' },
];

export default function CapabilityMatrix() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'native' | 'compat' | 'unsupported'>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const categoriesList = useMemo(() => {
    const cats = new Set<string>();
    SERVICES_DATA.forEach(s => cats.add(s.category));
    return Array.from(cats);
  }, []);

  const stats = useMemo(() => {
    const total = SERVICES_DATA.length;
    const native = SERVICES_DATA.filter(s => s.type === 'native').length;
    const compat = SERVICES_DATA.filter(s => s.type === 'compat').length;
    return { total, native, compat };
  }, []);

  const filteredServices = useMemo(() => {
    return SERVICES_DATA.filter(service => {
      const matchSearch = 
        service.name.toLowerCase().includes(search.toLowerCase()) || 
        service.category.toLowerCase().includes(search.toLowerCase()) ||
        service.key.toLowerCase().includes(search.toLowerCase());
      
      const matchType = filterType === 'all' || service.type === filterType;
      const matchCategory = filterCategory === 'all' || service.category === filterCategory;

      return matchSearch && matchType && matchCategory;
    });
  }, [search, filterType, filterCategory]);

  const getBadgeColor = (type: 'native' | 'compat' | 'unsupported') => {
    switch (type) {
      case 'native':
        return 'border-emerald-600 bg-emerald-50 text-emerald-800';
      case 'compat':
        return 'border-amber-600 bg-amber-50 text-amber-800';
      default:
        return 'border-rose-600 bg-rose-50 text-rose-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Summary Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="font-mono">
          <p className="text-[9px] opacity-50 mb-2">Total Connected Capabilities</p>
          <div className="flex justify-between items-baseline">
            <span className="text-xl font-bold">{stats.total} Services</span>
            <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1 border border-emerald-600/20">100% OPERATIONAL</span>
          </div>
        </Card>
        <Card className="font-mono">
          <p className="text-[9px] opacity-50 mb-2">Native Client Connections</p>
          <div className="flex justify-between items-baseline">
            <span className="text-xl font-bold text-emerald-800">{stats.native} Nativos</span>
            <span className="text-[8px] opacity-40">Direct SDK Link</span>
          </div>
        </Card>
        <Card className="font-mono">
          <p className="text-[9px] opacity-50 mb-2">Sidecar Compatibility Layer</p>
          <div className="flex justify-between items-baseline">
            <span className="text-xl font-bold text-amber-800">{stats.compat} Compats</span>
            <span className="text-[8px] opacity-40">JSON Persistent</span>
          </div>
        </Card>
      </div>

      {/* Filters Area */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text opacity-30" size={14} />
          <Input 
            placeholder="Search Capability Index..." 
            className="pl-10 font-mono text-[11px]" 
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Filter Integrations */}
        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value as any)}
          className="bg-white border border-brand-text px-3 py-1.5 text-xs focus:outline-none uppercase font-bold font-mono tracking-tight cursor-pointer"
        >
          <option value="all">ALL INTEGRATIONS</option>
          <option value="native">NATIVO (DIRECT SDK)</option>
          <option value="compat">COMPATIBILITY (SIDECAR)</option>
        </select>

        {/* Filter Category */}
        <select
          value={filterCategory}
          onChange={e => setFilterCategory(e.target.value)}
          className="bg-white border border-brand-text px-3 py-1.5 text-xs focus:outline-none uppercase font-bold font-mono tracking-tight cursor-pointer"
        >
          <option value="all">ALL CATEGORIES</option>
          {categoriesList.map(cat => (
            <option key={cat} value={cat}>{cat.toUpperCase()}</option>
          ))}
        </select>
      </div>

      {/* Grid Capability Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredServices.length === 0 ? (
          <div className="col-span-full py-16 text-center border border-dashed border-brand-text/30 bg-brand-muted/20">
            <HelpCircle size={28} className="mx-auto mb-2 opacity-25" />
            <p className="text-[10px] font-bold opacity-40 tracking-wider">NO_MATCHING_CAPABILITIES</p>
          </div>
        ) : (
          filteredServices.map(service => (
            <Card 
              key={service.key} 
              className="hover:border-brand-text transition-all bg-white flex flex-col justify-between p-5 min-h-[175px] group cursor-pointer hover:shadow-xs"
              onClick={() => navigate(service.key === 'secrets' ? '/secrets' : service.key === 'cloudwatch' ? '/cloudwatch' : `/${service.key}`)}
            >
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <span className="text-[8px] font-mono font-bold opacity-30 tracking-widest">{service.category.toUpperCase()}</span>
                  <span className={`text-[8px] font-bold border px-1.5 py-0.5 rounded-sm uppercase tracking-wider ${getBadgeColor(service.type)}`}>
                    {service.type === 'native' ? 'Nativo' : 'Compatibilidad'}
                  </span>
                </div>
                <div>
                  <h4 className="font-bold text-xs tracking-tight text-brand-text group-hover:text-brand-text/85 transition-colors">{service.name}</h4>
                  <p className="text-[9px] text-neutral-500 normal-case mt-2 leading-relaxed">
                    {service.description}
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-brand-text/5 flex items-center justify-between text-[8px] font-mono opacity-50">
                <div className="flex items-center gap-1.5">
                  <Cpu size={10} />
                  <span>{service.endpoint}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Layers size={10} />
                  <span>{service.storage}</span>
                </div>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity ml-auto text-brand-text">
                  <ExternalLink size={10} />
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
