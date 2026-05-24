import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  Cloud, 
  Box, 
  MessageSquare, 
  Bell, 
  Zap, 
  Users, 
  Settings, 
  ChevronRight,
  ChevronDown,
  Activity,
  Shield,
  Archive,
  Mail,
  Fingerprint,
  BadgeCheck,
  Share2,
  Globe,
  Network,
  Globe2,
  GitBranch,
  Share,
  Target,
  Users2,
  Terminal,
  Layers,
  Database as DatabaseIcon,
  HardDrive as CacheIcon,
  Globe as GlobalIcon,
  Package as EcrIcon,
  List,
  KeyRound,
  ShieldAlert,
  Hammer,
  GitFork,
  ShoppingBag,
  Compass,
  Briefcase,
  HardDrive as HardDriveIcon,
  BarChart2,
  Search,
  Radio,
  Binary,
  FileText,
  Sparkles
} from 'lucide-react';
import { useAws } from '../contexts/AwsContext';
import { cn } from '../lib/utils';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar = ({ isOpen, onClose }: SidebarProps) => {
  const { isHealthy } = useAws();
  const [filterText, setFilterText] = React.useState('');
  const [collapsedCategories, setCollapsedCategories] = React.useState<Record<string, boolean>>({
    'Unsupported in Floci': true
  });
  const [memUsage, setMemUsage] = React.useState('N/A');

  React.useEffect(() => {
    const updateMemory = () => {
      if (typeof window !== 'undefined') {
        const perf = window.performance as any;
        if (perf && perf.memory) {
          const used = perf.memory.usedJSHeapSize / (1024 * 1024);
          setMemUsage(`${used.toFixed(1)} MiB`);
        } else {
          setMemUsage('N/A');
        }
      }
    };

    updateMemory();
    const timer = setInterval(updateMemory, 5000);
    return () => clearInterval(timer);
  }, []);

  const categories = [
    {
      label: 'Computing',
      items: [
        { to: '/lambda', icon: Zap, label: 'Lambda' },
        { to: '/ecs', icon: Cloud, label: 'ECS / EC2' },
        { to: '/ec2', icon: Cloud, label: 'EC2 Inventory' },
        { to: '/autoscaling', icon: Activity, label: 'Auto Scaling' },
        { to: '/eks', icon: Terminal, label: 'EKS Clusters (K8s)' },
        { to: '/apprunner', icon: Cloud, label: 'App Runner Containers' },
        { to: '/beanstalk', icon: Compass, label: 'Elastic Beanstalk' },
        { to: '/batch', icon: Briefcase, label: 'AWS Batch Jobs' },
      ]
    },
    {
      label: 'Storage',
      items: [
        { to: '/s3', icon: Box, label: 'S3 Buckets' },
        { to: '/dynamodb', icon: List, label: 'DynamoDB' },
        { to: '/ecr', icon: EcrIcon, label: 'ECR Registries' },
        { to: '/efs', icon: HardDriveIcon, label: 'EFS Filesystems' },
        { to: '/backup', icon: Archive, label: 'Backup Vault Cycles' },
        { to: '/transfer', icon: Share, label: 'Transfer Family' },
      ]
    },
    {
      label: 'Security & Identity',
      items: [
        { to: '/iam', icon: Users, label: 'IAM Roles' },
        { to: '/sts', icon: Fingerprint, label: 'STS Identity' },
        { to: '/cognito', icon: Users2, label: 'Cognito Pools' },
        { to: '/identitycenter', icon: Shield, label: 'IAM Identity Center' },
        { to: '/secrets', icon: Shield, label: 'Secrets Manager' },
        { to: '/ssm', icon: KeyRound, label: 'SSM Parameters' },
        { to: '/kms', icon: Fingerprint, label: 'KMS Keys' },
        { to: '/acm', icon: BadgeCheck, label: 'ACM Certs' },
      ]
    },
    {
      label: 'Networking & Content',
      items: [
        { to: '/vpc', icon: Network, label: 'VPC Fabrics' },
        { to: '/elb', icon: Network, label: 'Elastic Load Balancing' },
        { to: '/route53', icon: Globe2, label: 'DNS Zones' },
        { to: '/cloudfront', icon: GlobalIcon, label: 'CloudFront' },
        { to: '/apigateway', icon: Globe, label: 'API Gateway' },
        { to: '/appsync', icon: Share2, label: 'AppSync GraphQL' },
        { to: '/transitgateway', icon: Network, label: 'Transit Gateways' },
      ]
    },
    {
      label: 'Databases & Analytics',
      items: [
        { to: '/rds', icon: DatabaseIcon, label: 'RDS Instances' },
        { to: '/redshift', icon: BarChart2, label: 'Redshift Clusters' },
        { to: '/neptune', icon: Network, label: 'Neptune Graph' },
        { to: '/opensearch', icon: Search, label: 'OpenSearch Domains' },
        { to: '/msk', icon: Radio, label: 'MSK Kafka Clusters' },
        { to: '/elasticache', icon: CacheIcon, label: 'ElastiCache' },
        { to: '/athena', icon: Terminal, label: 'Athena Queries' },
        { to: '/glue', icon: Layers, label: 'Glue Catalog' },
      ]
    },
    {
      label: 'IoT & Machine Learning',
      items: [
        { to: '/sagemaker', icon: Binary, label: 'SageMaker Models' },
        { to: '/bedrock-runtime', icon: Sparkles, label: 'Bedrock Runtime' },
        { to: '/textract', icon: FileText, label: 'Textract' },
        { to: '/iotcore', icon: Radio, label: 'IoT Core Registry' },
      ]
    },
    {
      label: 'DevOps & App Integration',
      items: [
        { to: '/cloudformation', icon: Box, label: 'Stacks' },
        { to: '/appconfig', icon: Settings, label: 'AppConfig' },
        { to: '/appconfigdata', icon: Terminal, label: 'AppConfig Data' },
        { to: '/codebuild', icon: Hammer, label: 'CodeBuild' },
        { to: '/codepipeline', icon: GitFork, label: 'CodePipeline' },
        { to: '/codedeploy', icon: GitFork, label: 'CodeDeploy' },
        { to: '/sqs', icon: MessageSquare, label: 'SQS Queues' },
        { to: '/sns', icon: Bell, label: 'SNS Topics' },
        { to: '/eventbridge', icon: Share2, label: 'EventBridge' },
        { to: '/scheduler', icon: Activity, label: 'Scheduler' },
        { to: '/stepfunctions', icon: GitBranch, label: 'Step Functions' },
        { to: '/kinesis', icon: Share, label: 'Kinesis Streams' },
        { to: '/firehose', icon: Share, label: 'Data Firehose' },
      ]
    },
    {
      label: 'Observability',
      items: [
        { to: '/cloudwatch', icon: Activity, label: 'CloudWatch Logs' },
        { to: '/cloudwatch-metrics', icon: BarChart2, label: 'CloudWatch Metrics' },
        { to: '/cloudtrail', icon: FileText, label: 'CloudTrail Audit' },
      ]
    },
    {
      label: 'Billing & Cost',
      items: [
        { to: '/costexplorer', icon: DatabaseIcon, label: 'Cost Explorer' },
      ]
    },
    {
      label: 'Floci Management',
      items: [
        { to: '/roadmap', icon: Target, label: 'Roadmap' },
        { to: '/codeartifact', icon: Archive, label: 'CodeArtifact' },
        { to: '/ses', icon: Mail, label: 'SES Sink' },
        { to: '/settings', icon: Settings, label: 'System Settings' },
      ]
    },
    {
      label: 'Unsupported in Floci',
      items: [
        { to: '/waf', icon: ShieldAlert, label: 'WAF Web ACLs', badge: 'NOT IN FLOCI' },
        { to: '/pricing', icon: BarChart2, label: 'Pricing', badge: 'NOT IN FLOCI' },
        { to: '/cur', icon: FileText, label: 'Cost Reports', badge: 'NOT IN FLOCI' },
        { to: '/bcmdataexports', icon: Archive, label: 'BCM Data Exports', badge: 'NOT IN FLOCI' },
        { to: '/awsq', icon: Sparkles, label: 'AWS Q Developer', badge: 'NOT IN FLOCI' },
      ]
    }
  ];

  // Filter categories and elements
  const filteredCategories = categories.map(cat => {
    const matchedItems = cat.items.filter(item => 
      item.label.toLowerCase().includes(filterText.toLowerCase()) ||
      cat.label.toLowerCase().includes(filterText.toLowerCase())
    );
    return {
      ...cat,
      items: matchedItems
    };
  }).filter(cat => cat.items.length > 0);

  const showDashboard = !filterText || 'dashboard'.toLowerCase().includes(filterText.toLowerCase());
  const showEventStream = !filterText || 'event stream'.toLowerCase().includes(filterText.toLowerCase());
  const showMarketplace = !filterText || 'software marketplace'.toLowerCase().includes(filterText.toLowerCase());

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden" 
          onClick={onClose}
        />
      )}
      
      <nav className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-brand-bg border-r border-brand-text flex flex-col transition-transform duration-300 lg:static lg:translate-x-0 shrink-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-4 border-b border-brand-text flex items-center justify-between lg:block">
          <div className="relative flex-1">
            <input 
              type="text" 
              placeholder="Filter Services..." 
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className="w-full bg-white border border-brand-text px-2 py-1.5 text-[11px] focus:outline-none placeholder:italic"
            />
          </div>
          <button 
            onClick={onClose}
            className="ml-4 lg:hidden p-1 hover:bg-brand-muted border border-brand-text"
          >
            <ChevronRight className="rotate-180" size={16} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto py-2">
          {showDashboard && (
            <NavLink
              to="/"
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  "flex items-center px-4 py-2 text-xs font-bold uppercase tracking-tight",
                  isActive ? "bg-brand-text text-brand-bg" : "hover:bg-brand-text hover:text-brand-bg"
                )
              }
            >
              <Activity size={14} className="mr-2" />
              Dashboard
            </NavLink>
          )}

          {showEventStream && (
            <NavLink
              to="/events"
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  "flex items-center px-4 py-2 text-xs font-bold uppercase tracking-tight text-brand-green bg-black",
                  isActive ? "bg-brand-green !text-black" : "hover:bg-brand-green hover:!text-black"
                )
              }
            >
              <Activity size={14} className="mr-2 animate-pulse" />
              Event Stream
            </NavLink>
          )}

          {showMarketplace && (
            <NavLink
              to="/marketplace"
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  "flex items-center px-4 py-2 text-xs font-bold uppercase tracking-tight text-amber-500 bg-amber-950/20 border-b border-amber-950/30",
                  isActive ? "bg-amber-500 text-black font-bold" : "hover:bg-amber-500 hover:text-black"
                )
              }
            >
              <ShoppingBag size={14} className="mr-2" />
              Software Marketplace
            </NavLink>
          )}

          {filteredCategories.map((cat) => {
            const isCollapsible = cat.label === 'Unsupported in Floci';
            const isCollapsed = collapsedCategories[cat.label];
            return (
              <div key={cat.label} className="mt-4">
                {isCollapsible ? (
                  <button
                    onClick={() => setCollapsedCategories(prev => ({ ...prev, [cat.label]: !prev[cat.label] }))}
                    className="w-full text-left px-4 py-1 text-[10px] uppercase font-bold opacity-45 tracking-widest flex items-center justify-between hover:opacity-80 transition-opacity cursor-pointer group"
                  >
                    <span>{cat.label}</span>
                    <ChevronDown
                      size={10}
                      className={cn(
                        "opacity-50 group-hover:opacity-100 transition-transform duration-200",
                        isCollapsed ? "-rotate-90" : "rotate-0"
                      )}
                    />
                  </button>
                ) : (
                  <div className="px-4 py-1 text-[10px] uppercase font-bold opacity-40 tracking-widest">{cat.label}</div>
                )}
                
                {(!isCollapsible || !isCollapsed) && cat.items.map((item: any) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={onClose}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center px-4 py-1.5 text-xs transition-colors",
                        isActive 
                          ? "bg-brand-text text-brand-bg font-bold" 
                          : "hover:bg-brand-text hover:text-brand-bg"
                      )
                    }
                  >
                    <item.icon size={14} className="mr-2 opacity-70 shrink-0" />
                    <span className="truncate">{item.label}</span>
                    {item.badge && (
                      <span className="ml-auto text-[7px] font-bold px-1.5 py-0.5 border border-amber-600/30 bg-amber-500/10 text-amber-700 uppercase tracking-widest shrink-0 font-mono scale-90 rounded-xs">
                        {item.badge}
                      </span>
                    )}
                  </NavLink>
                ))}
              </div>
            );
          })}
        </div>

        <div className="p-4 border-t border-brand-text text-[10px] font-mono bg-brand-muted/50">
          <div className="flex justify-between mb-1">
            <span className="opacity-60">Status:</span>
            <span className={cn("font-bold", isHealthy ? "text-emerald-600" : "text-rose-600")}>
              {isHealthy ? 'RUNNING' : 'STOPPED'}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Mem:</span>
            <span className="font-bold">{memUsage}</span>
          </div>
        </div>
      </nav>
    </>
  );
};

export default Sidebar;
