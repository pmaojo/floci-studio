import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Terminal, MessageSquare, ShieldAlert, Sparkles, Send, Cpu, Sliders, ShieldCheck, FileCode, CheckSquare, Zap, BadgeCheck, CornerDownLeft, HelpCircle, Code, Copy, Check } from 'lucide-react';
import { PageHeader, Card, Button, Input, Select } from '../components/ui-elements';
import { useAws } from '../contexts/AwsContext';

interface ChatMessage {
  id: string;
  sender: 'user' | 'q';
  text: string;
  codeBlock?: { language: string; code: string };
  timestamp: string;
}

interface IaCDecisions {
  title: string;
  desc: string;
  prompt: string;
}

const AwsQView = () => {
  const { logActivity } = useAws();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-1',
      sender: 'q',
      text: 'hello! I am AWS Q, your cloud infrastructure and IAM security developer assistant of FLOCI. I can assist you with optimizing DynamoDB Global tables, establishing WORM Glacier compliance locks, troubleshooting Kubernetes Fargate schedulers, or writing IaC templates.',
      timestamp: new Date(Date.now() - 60000).toISOString()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Suggested Actions / One-Click Recipes
  const suggestions: IaCDecisions[] = [
    {
      title: 'global-ddb-replicator',
      desc: 'CDK construct for globally routed tables',
      prompt: 'Write a CDK TS construct establishing a DynamoDB Global Table replicated in us-east-1 and eu-west-1.'
    },
    {
      title: 'locked-glacier-vault',
      desc: 'CloudFormation stack for strict WORM lock',
      prompt: 'Write a CloudFormation template for an S3 Glacier Vault with a locked WORM compliance policy.'
    },
    {
      title: 'eks-fargate-scheduler',
      desc: 'Kubernetes manifest for fargate deployment',
      prompt: 'Generate a Kubernetes Deployment YAML for EKS with Fargate profile targeting namespace default.'
    }
  ];

  // Simulated Audit Reports
  const auditIssues = [
    {
      id: 'audit-1',
      severity: 'HIGH' as const,
      service: 'DynamoDB',
      msg: 'Tables missing Global replication redundancy targets in eu-west-1.',
      remediation: 'Enable Global Table Replicas to avoid latency drops.'
    },
    {
      id: 'audit-2',
      severity: 'MEDIUM' as const,
      service: 'Glacier Compliance',
      msg: 'Glacier Vault medical-images-coldstore is UNLOCKED (No strict WORM protection active).',
      remediation: 'Initiate PutVaultLock API or lock the JSON Policy document.'
    },
    {
      id: 'audit-3',
      severity: 'INFO' as const,
      service: 'EKS Clusters',
      msg: 'Pod deployments lacking matching Fargate namespace routing profile subnets.',
      remediation: 'Add EKS namespace default target to a Fargate profile context.'
    }
  ];

  const handleCopyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    logActivity('AWS Q', 'CopyGeneratedCode', 'success', 'IaC template copied to clipboard');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSendPrompt = (promptText: string) => {
    if (!promptText.trim()) return;

    const userMessage: ChatMessage = {
      id: `u-${Math.random().toString(36).substring(4)}`,
      sender: 'user',
      text: promptText,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsTyping(true);
    logActivity('AWS Q', 'GenerateRecommendation', 'success', `Prompt: ${promptText.substring(0, 30)}...`);

    // Intelligent responses router based on keywords
    setTimeout(() => {
      let qAnswer = 'I have processed your prompt. Here is the suggested cloud configuration code block prepared according to AWS security best-practices:';
      let code = '';
      let lang = 'typescript';

      const lower = promptText.toLowerCase();
      if (lower.includes('dynamodb') || lower.includes('global') || lower.includes('ddb-replicator')) {
        qAnswer = 'To deploy high-fidelity DynamoDB Global Tables, we configure attributes schema utilizing DynamoDB version 2017.11.29 (replicated tables) in AWS CDK. This automatically establishes active writes replicating in real time:';
        lang = 'typescript';
        code = `import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';

export class GlobalTableStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Provisioning a replicated DynamoDB cluster
    const table = new dynamodb.TableV2(this, 'GlobalUserStore', {
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      billing: dynamodb.Billing.onDemand(),
      // active replica nodes configuration
      replicas: [
        { region: 'us-east-1' },
        { region: 'eu-west-1' }
      ],
      timeToLiveAttribute: 'ttl'
    });
  }
}`;
      } else if (lower.includes('glacier') || lower.includes('worm') || lower.includes('locked-glacier-vault')) {
        qAnswer = 'For S3 Glacier WORM (Write-Once-Read-Many) compliance regulations, CloudFormation lets us define S3::Glacier::Vault alongside an irreversible VaultLock policy. Here is the complete manifest stack:';
        lang = 'yaml';
        code = `AWSTemplateFormatVersion: '2012-10-17'
Description: 'Irreversible S3 Glacier Vault with Sealed WORM policy stack'

Resources:
  ComplianceGlacierVault:
    Type: 'AWS::Glacier::Vault'
    Properties:
      VaultName: 'corporate-worm-vault-logs'

  GlacierVaultLockPolicy:
    Type: 'AWS::Glacier::VaultLock'
    Properties:
      VaultName: !Ref ComplianceGlacierVault
      Policy:
        Version: '2012-10-17'
        Statement:
          - Sid: 'LockRegulationsDenyDeletes'
            Effect: 'Deny'
            Principal: '*'
            Action: 'glacier:DeleteArchive'
            Resource: !Sub 'arn:aws:glacier:\${AWS::Region}:\${AWS::AccountId}:vaults/corporate-worm-vault-logs'
`;
      } else if (lower.includes('eks') || lower.includes('fargate') || lower.includes('namespace') || lower.includes('eks-fargate-scheduler')) {
        qAnswer = 'To route kubernetes pods serverlessly onto EKS Fargate node schedules, use the target matched namespace default. Under this deployment, kube-scheduler routes scheduling to serverless microVM subnets:';
        lang = 'yaml';
        code = `apiVersion: apps/v1
kind: Deployment
metadata:
  name: fargate-billing-api
  namespace: default # Matched and rerouted by EKS Fargate Profile
  labels:
    app: billing-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: billing-api
  template:
    metadata:
      labels:
        app: billing-api
    spec:
      containers:
        - name: payment-core
          image: 000000000000.dkr.ecr.us-east-1.amazonaws.com/billing-api:stable
          ports:
            - containerPort: 8080
          resources:
            requests:
              cpu: "100m"
              memory: "128Mi"
`;
      } else if (lower.includes('s3') || lower.includes('bucket') || lower.includes('lifecycle') || lower.includes('retention')) {
        qAnswer = 'This CDK template configures S3 Bucket parameters alongside optimized Lifecycle parameters, promoting object transition automatically onto secure GLACIER cold storage within 30 days:';
        lang = 'typescript';
        code = `import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';

export class S3LifecycleStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const bucket = new s3.Bucket(this, 'ComplianceLogBucket', {
      versioned: true,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      lifecycleRules: [{
        id: 'ArchiveAfter30Days',
        enabled: true,
        transitions: [{
          storageClass: s3.StorageClass.GLACIER,
          transitionAfter: cdk.Duration.days(30)
        }],
        expiration: cdk.Duration.days(365)
      }]
    });
  }
}`;
      } else if (lower.includes('lambda') || lower.includes('serverless') || lower.includes('function')) {
        qAnswer = 'Here is a modular serverless Lambda Function CDK blueprint. It configures optimized node runtimes, execution memory bounds, and timeouts:';
        lang = 'typescript';
        code = `import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';

export class ServerlessApiStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const apiHandler = new lambda.Function(this, 'BillingApiHandler', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(\`
        exports.handler = async (event) => {
          return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Billing process stable' })
          };
        };
      \`),
      timeout: cdk.Duration.seconds(15),
      memorySize: 256
    });
  }
}`;
      } else if (lower.includes('backup') || lower.includes('plan') || lower.includes('vault')) {
        qAnswer = 'This enterprise backup strategy CDK stack provisions an isolated secure backup vault, rotatable KMS encryption keys, and continuous retention cycles matching custom recovery parameters:';
        lang = 'typescript';
        code = `import * as cdk from 'aws-cdk-lib';
import * as backup from 'aws-cdk-lib/aws-backup';
import * as kms from 'aws-cdk-lib/aws-kms';

export class EnterpriseBackupStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vaultKmsKey = new kms.Key(this, 'BackupVaultKey', {
      enableKeyRotation: true,
    });

    const vault = new backup.BackupVault(this, 'ComplianceBackupVault', {
      backupVaultName: 'corporate-retention-vault',
      encryptionKey: vaultKmsKey
    });

    // Automatically schedules standard daily compliance backup runs
    const plan = backup.BackupPlan.dailyWeeklyWeeklyRetention(this, 'DailyRetentionPlan', vault);
  }
}`;
      } else if (lower.includes('iam') || lower.includes('policy') || lower.includes('role')) {
        qAnswer = 'According to the principle of least privilege, we can lock execution down using strict, conditional IAM policy statements inside AWS IAM CDK constructs:';
        lang = 'typescript';
        code = `import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';

export class SecurityComplianceIamStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const devopsRole = new iam.Role(this, 'ComplianceDevOpsRole', {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
      description: 'DevOps execution role with strictly mandated compliance controls',
    });

    // Explicitly deny structural modifications unless MFA is present
    devopsRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.DENY,
      actions: ['s3:DeleteBucket', 'dynamodb:DeleteTable'],
      resources: ['*'],
      conditions: {
        'Bool': { 'aws:MultiFactorAuthPresent': 'false' }
      }
    }));
  }
}`;
      } else if (lower.includes('sqs') || lower.includes('sns') || lower.includes('queue') || lower.includes('topic')) {
        qAnswer = 'This CDK template leverages SNS fanout triggers linked directly with SQS consumer queue topics, reinforcing robust distributed transactional pipelines:';
        lang = 'typescript';
        code = `import * as cdk from 'aws-cdk-lib';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as subs from 'aws-cdk-lib/aws-sns-subscriptions';

export class MessagingPipesStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const topic = new sns.Topic(this, 'BillingTransactionEventsTopic');
    const queue = new sqs.Queue(this, 'BillingAuditQueue', {
      visibilityTimeout: cdk.Duration.seconds(300)
    });

    topic.addSubscription(new subs.SqsSubscription(queue));
  }
}`;
      } else {
        qAnswer = `I have reviewed your inquiry regarding [${promptText}]. Within local LocalStack and FLOCI emulated stacks, we recommend checking credentials configuration parameters in your system settings so AWS clients initialize with correct port binds. Let me know if you want me to write the CDK construct lines.`;
      }

      const qMessage: ChatMessage = {
        id: `q-${Math.random().toString(36).substring(4)}`,
        sender: 'q',
        text: qAnswer,
        timestamp: new Date().toISOString(),
        ...(code ? { codeBlock: { language: lang, code } } : {})
      };

      setMessages(prev => [...prev, qMessage]);
      setIsTyping(false);
    }, 1800);
  };

  const chatEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  return (
    <div className="flex flex-col h-full uppercase">
      <PageHeader 
        title="AWS Q Developer Assistant" 
        icon={<Sparkles size={18} className="text-zinc-600 animate-pulse" />}
      />

      <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 overflow-hidden bg-brand-bg">
        {/* Left Side: Real-Time DevOps Security Auditing Panels */}
        <div className="lg:col-span-1 flex flex-col gap-6 overflow-auto">
          {/* Audits */}
          <Card>
            <h3 className="font-bold text-xs pb-3 border-b border-brand-text/10 mb-4 tracking-wider flex items-center gap-1.5">
              <ShieldAlert size={14} className="text-rose-600 animate-bounce" />
              FLOCI_RESOURCE_SECURITY_AUDIT
            </h3>
            
            <div className="space-y-4 font-mono text-[9px]">
              {auditIssues.map((issue) => (
                <div key={issue.id} className="border-b border-brand-text/5 pb-3 last:border-b-0 space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-800">{issue.service}</span>
                    <span className={`text-[7.5px] font-sans px-1 rounded font-bold ${
                      issue.severity === 'HIGH' ? 'bg-rose-100 text-rose-800 border border-rose-300' :
                      issue.severity === 'MEDIUM' ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {issue.severity}
                    </span>
                  </div>
                  <p className="text-neutral-500 font-sans lowercase leading-relaxed font-semibold">{issue.msg}</p>
                  <p className="text-indigo-800 lowercase break-normal pt-1 flex items-start gap-1 font-sans font-bold">
                    <CornerDownLeft size={10} className="shrink-0 relative top-0.5" />
                    fix: {issue.remediation}
                  </p>
                </div>
              ))}
            </div>
          </Card>

          {/* Quick-Run Suggestions templates recipes */}
          <Card className="flex-1">
            <h3 className="font-bold text-xs pb-3 border-b border-brand-text/10 mb-3 tracking-wider flex items-center gap-1.5">
              <FileCode size={14} className="text-zinc-500" />
              CDK_CLOUDFORMATION_RECIPES
            </h3>
            <p className="text-[9px] text-zinc-400 lowercase italic mb-4 font-sans leading-relaxed">
              Click any blueprint below to instantly ask Q to construct fully WORM-compliant AWS templates:
            </p>
            <div className="space-y-3 font-mono">
              {suggestions.map((sug) => (
                <button
                  key={sug.title}
                  onClick={() => handleSendPrompt(sug.prompt)}
                  className="w-full text-left border border-neutral-200 hover:border-indigo-500 bg-white hover:bg-indigo-50/10 p-2.5 transition-all rounded-sm group flex flex-col gap-1 text-[9px]"
                >
                  <span className="font-bold text-slate-800 group-hover:text-indigo-900">{sug.title}</span>
                  <span className="text-[8.5px] text-neutral-400 lowercase font-sans font-semibold leading-snug">{sug.desc}</span>
                </button>
              ))}
            </div>
          </Card>
        </div>

        {/* Right Side: AWS Q Interactive Chat Simulator Workspace */}
        <div className="lg:col-span-2 flex flex-col border border-brand-text bg-white rounded-sm overflow-hidden h-full">
          {/* Chat Header banner */}
          <div className="px-4 py-3 bg-brand-muted border-b border-brand-text flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" />
              <span className="font-bold text-xs tracking-wider">AWS_Q_CORE_SERVICE (ACTIVE_EMULATOR)</span>
            </div>
            <span className="text-[8px] font-mono opacity-40">MODEL: GEMINI_3.5_FLASH</span>
          </div>

          {/* Dialog Log Stream View area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0 bg-neutral-50">
            {messages.map((msg) => (
              <div 
                key={msg.id} 
                className={`flex flex-col gap-1.5 max-w-[85%] ${msg.sender === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'}`}
              >
                {/* Meta details */}
                <div className="flex items-center gap-1.5 text-[8.5px] font-mono text-zinc-400">
                  <span className="font-bold uppercase tracking-tight">{msg.sender === 'user' ? 'DEVOPS_USER' : 'Q_BOT'}</span>
                  <span>•</span>
                  <span>{new Date(msg.timestamp).toLocaleTimeString()}</span>
                </div>

                {/* Chat Bubble container */}
                <div 
                  className={`px-3.5 py-2.5 rounded text-[11px] font-sans leading-relaxed border ${
                    msg.sender === 'user' 
                      ? 'bg-brand-text text-brand-bg border-brand-text font-medium text-right' 
                      : 'bg-white text-zinc-800 border-neutral-200'
                  }`}
                >
                  {msg.text}
                </div>

                {/* Optional generated IaC code Block */}
                {msg.codeBlock && (
                  <div className="w-full mt-2 border border-neutral-800 bg-neutral-900 rounded-sm overflow-hidden">
                    {/* Header bar */}
                    <div className="px-3 py-1.5 bg-neutral-950 text-neutral-400 border-b border-neutral-800 flex justify-between items-center font-mono text-[8px] select-none">
                      <span>IaC: {msg.codeBlock.language} format</span>
                      <button
                        onClick={() => handleCopyCode(msg.codeBlock!.code, msg.id)}
                        className="hover:text-white flex items-center gap-1 uppercase font-bold text-[8.5px]"
                      >
                        {copiedId === msg.id ? (
                          <>
                            <Check size={10} className="text-emerald-400" />
                            <span>COPIED</span>
                          </>
                        ) : (
                          <>
                            <Copy size={10} />
                            <span>COPY_CODE</span>
                          </>
                        )}
                      </button>
                    </div>
                    {/* Syntax Code Pre */}
                    <pre className="p-3 text-emerald-400 font-mono text-[10px] text-left lowercase overflow-x-auto whitespace-pre leading-relaxed select-text">
                      <code>{msg.codeBlock.code}</code>
                    </pre>
                  </div>
                )}
              </div>
            ))}

            {isTyping && (
              <div className="mr-auto items-start flex flex-col gap-1">
                <span className="text-[8.5px] font-mono text-zinc-400">Q_BOT IS ANALYZING SYNTAX...</span>
                <div className="px-4 py-3 bg-white border border-neutral-200 rounded text-zinc-500 text-xs flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
            
            <div ref={chatEndRef} />
          </div>

          {/* Prompt Entry Box */}
          <div className="p-3.5 bg-brand-muted border-t border-brand-text shrink-0 flex gap-2">
            <Input
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSendPrompt(inputText);
                }
              }}
              placeholder="Ask Q about compliant CDK setups, Glacier locks, or EKS microVM nodes..."
              disabled={isTyping}
              className="font-sans leading-none text-xs flex-1 !py-3"
            />
            <Button
              onClick={() => handleSendPrompt(inputText)}
              disabled={isTyping || !inputText.trim()}
              className="bg-brand-text text-brand-bg"
              icon={<Send size={12} />}
            >
              Ask Q
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AwsQView;
