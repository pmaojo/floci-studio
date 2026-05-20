import React from 'react';
import { CheckCircle2, Circle, Clock, ArrowRight, Zap, Target, BookOpen } from 'lucide-react';
import { PageHeader, Card, Button } from '../components/ui-elements';
import { Link } from 'react-router-dom';

const RoadmapView = () => {
  const implemented = [
    'S3 Storage', 'Lambda Functions', 'DynamoDB Tables', 'SQS Queues', 'SNS Topics', 
    'IAM Roles/Users', 'KMS Encryption', 'Secrets Manager', 'VPC Networking', 
    'RDS Databases', 'API Gateway', 'ECS Containers', 'EventBridge', 'Step Functions',
    'Kinesis Streams', 'Route 53 DNS', 'SES Email', 'ACM Certificates', 
    'CloudWatch Logs', 'CloudFormation Stacks', 'CodeArtifact', 'Cognito Pools',
    'ECR Registries', 'Athena Queries', 'CloudFront CDN', 'ElastiCache Redis', 
    'Glue Catalog', 'SSM Parameters', 'WAF Web ACLs', 'CodeBuild Projects', 
    'CodePipeline', 'AppSync GraphQL', 'Cognito Identity Pools', 'Redshift Clusters',
    'OpenSearch Domains', 'MSK Kafka Clusters', 'SageMaker Models', 'IoT Core Registry',
    'AWS Batch Jobs', 'Transit Gateways', 'EFS Filesystems', 'Neptune Graph',
    'CloudTrail Auditing', 'IAM Identity Center'
  ];

  const phase2Completed = [
    'Route 53 Resolver Rules', 'Lambda Layers & Extensions', 'S3 Lifecycle & Replication'
  ];

  const phase3Completed = [
    'Athena Federated Queries', 'CloudFront Functions v2', 'API Gateway WebSocket Mocking', 'Step Functions Express workflows',
    'Elastic Load Balancing (ALB/NLB)', 'EKS Kubernetes Pod Mocking', 'App Runner Containers', 'Backup Vault Cycles'
  ];

  const phase4Completed = [
    'Global DynamoDB Real-time Tables', 'AWS Q Developer Assistant emulations', 'EKS Fargate Cluster Node Scheduling', 'S3 Glacier Archival Vault integrations'
  ];

  const future = [
    'Deep localstack multi-node clustering', 'Terraform orchestration parity', 'Visual architectural drag-drop builder', 'Direct CloudFormation drift detection'
  ];

  return (
    <div className="flex flex-col h-full bg-brand-bg uppercase">
      <PageHeader 
        title="Project Roadmap" 
        icon={<Target size={18} />}
      />

      <div className="p-8 max-w-5xl mx-auto w-full space-y-12 pb-20 overflow-auto">
        <section className="space-y-4">
          <div className="flex items-center gap-3 border-b-2 border-brand-text pb-2">
             <CheckCircle2 className="text-emerald-600" size={24} />
             <h2 className="font-serif-italic text-2xl lowercase">Phase 1: Foundations (Implemented)</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
             {implemented.map(s => (
                <div key={s} className="p-3 bg-white border border-brand-text/10 flex items-center gap-2 group hover:border-brand-text transition-all">
                   <div className="w-2 h-2 rounded-full bg-emerald-500" />
                   <span className="text-[10px] font-bold opacity-70 group-hover:opacity-100">{s}</span>
                </div>
             ))}
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-3 border-b-2 border-brand-text pb-2">
             <CheckCircle2 className="text-emerald-600" size={24} />
             <h2 className="font-serif-italic text-2xl lowercase">Phase 2: Data & Networking (Implemented)</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
             {phase2Completed.map(s => (
                <div key={s} className="p-3 bg-white border border-brand-text/10 flex items-center gap-2 group hover:border-brand-text transition-all">
                   <div className="w-2 h-2 rounded-full bg-emerald-500" />
                   <span className="text-[10px] font-bold opacity-70 group-hover:opacity-100">{s}</span>
                </div>
             ))}
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-3 border-b-2 border-brand-text pb-2">
             <CheckCircle2 className="text-emerald-600" size={24} />
             <h2 className="font-serif-italic text-2xl lowercase">Phase 3: Integration & Scale (Implemented)</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
             {phase3Completed.map(s => (
                <div key={s} className="p-3 bg-white border border-brand-text/10 flex items-center gap-2 group hover:border-brand-text transition-all">
                   <div className="w-2 h-2 rounded-full bg-emerald-500" />
                   <span className="text-[10px] font-bold opacity-70 group-hover:opacity-100">{s}</span>
                </div>
             ))}
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-3 border-b-2 border-brand-text pb-2">
             <CheckCircle2 className="text-emerald-600" size={24} />
             <h2 className="font-serif-italic text-2xl lowercase">Phase 4: Advanced Horizons & AI (Implemented)</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
             {phase4Completed.map(s => (
                <div key={s} className="p-3 bg-white border border-brand-text/10 flex items-center gap-2 group hover:border-brand-text transition-all">
                   <div className="w-2 h-2 rounded-full bg-emerald-500" />
                   <span className="text-[10px] font-bold opacity-70 group-hover:opacity-100">{s}</span>
                </div>
             ))}
          </div>
        </section>

        <section className="space-y-4 opacity-80">
          <div className="flex items-center gap-3 border-b-2 border-brand-text/10 pb-2">
             <Clock className="text-amber-500 animate-pulse" size={24} />
             <h2 className="font-serif-italic text-2xl text-brand-text/60 lowercase">Future Horizons (In Pipeline)</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
             {future.map(s => (
                <div key={s} className="p-3 bg-brand-muted/30 border border-brand-text/5 flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                   <span className="text-[10px] font-bold opacity-50">{s}</span>
                </div>
             ))}
          </div>
        </section>

        <Card className="bg-brand-text text-white border-0 mt-20">
           <div className="flex flex-col md:flex-row items-center justify-between gap-8 p-4">
              <div className="space-y-2">
                 <h3 className="font-serif-italic text-3xl lowercase">Towards 1.0</h3>
                 <p className="text-sm opacity-70 max-w-md">FLOCI aims to be the definitive AWS emulator interface, matching 1:1 parity with all 50+ localstack/floci managed services.</p>
              </div>
              <Button variant="ghost" className="bg-white/10 hover:bg-white/20 border-white/20 text-white flex gap-2">
                <BookOpen size={16} /> View Documentation
              </Button>
           </div>
        </Card>
      </div>
    </div>
  );
};

export default RoadmapView;
