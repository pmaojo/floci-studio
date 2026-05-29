import { createContext, useContext, useState, useEffect, useMemo, type ReactNode } from 'react';
import { S3Client } from '@aws-sdk/client-s3';
import { SQSClient } from '@aws-sdk/client-sqs';
import { SNSClient } from '@aws-sdk/client-sns';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { LambdaClient } from '@aws-sdk/client-lambda';
import { IAMClient } from '@aws-sdk/client-iam';
import { SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
import { EC2Client } from '@aws-sdk/client-ec2';
import { ECSClient } from '@aws-sdk/client-ecs';
import { STSClient, GetCallerIdentityCommand } from '@aws-sdk/client-sts';
import { KMSClient } from '@aws-sdk/client-kms';
import { ACMClient } from '@aws-sdk/client-acm';
import { CloudWatchLogsClient } from '@aws-sdk/client-cloudwatch-logs';
import { EventBridgeClient } from '@aws-sdk/client-eventbridge';
import { RDSClient } from '@aws-sdk/client-rds';
import { KinesisClient } from '@aws-sdk/client-kinesis';
import { CloudFormationClient } from '@aws-sdk/client-cloudformation';
import { ECRClient } from '@aws-sdk/client-ecr';
import { GlueClient } from '@aws-sdk/client-glue';
import { ElastiCacheClient } from '@aws-sdk/client-elasticache';
import { WAFV2Client } from '@aws-sdk/client-wafv2';
import { CodeBuildClient } from '@aws-sdk/client-codebuild';
import { SchedulerClient } from '@aws-sdk/client-scheduler';
import { SFNClient } from '@aws-sdk/client-sfn';
import { SSMClient } from '@aws-sdk/client-ssm';
import { CloudWatchClient } from '@aws-sdk/client-cloudwatch';
import { SESClient } from '@aws-sdk/client-ses';
import { DEFAULT_CONFIG, LEGACY_DEFAULT_ENDPOINT, type AwsConfig } from '../types';

export interface ActivityLog {
  id: string;
  service: string;
  action: string;
  timestamp: Date;
  status: 'success' | 'error';
  details?: string;
}

interface AwsContextType {
  config: AwsConfig;
  updateConfig: (newConfig: Partial<AwsConfig>) => void;
  clients: {
    s3: S3Client;
    sqs: SQSClient;
    sns: SNSClient;
    dynamo: DynamoDBClient;
    lambda: LambdaClient;
    iam: IAMClient;
    secrets: SecretsManagerClient;
    ec2: EC2Client;
    ecs: ECSClient;
    sts: STSClient;
    kms: KMSClient;
    acm: ACMClient;
    cloudwatch: CloudWatchLogsClient;
    eventbridge: EventBridgeClient;
    rds: RDSClient;
    kinesis: KinesisClient;
    cloudformation: CloudFormationClient;
    ecr: ECRClient;
    glue: GlueClient;
    elasticache: ElastiCacheClient;
    waf: WAFV2Client;
    codebuild: CodeBuildClient;
    scheduler: SchedulerClient;
    sfn: SFNClient;
    ssm: SSMClient;
    cloudwatchMetrics: CloudWatchClient;
    ses: SESClient;
  };
  isHealthy: boolean | null;
  checkHealth: () => Promise<void>;
  activity: ActivityLog[];
  logActivity: (service: string, action: string, status: 'success' | 'error', details?: string) => void;
}

const AwsContext = createContext<AwsContextType | undefined>(undefined);

const getInitialConfig = (): AwsConfig => {
  const saved = localStorage.getItem('floci-aws-config');
  if (!saved) return DEFAULT_CONFIG;

  try {
    const parsed = JSON.parse(saved) as AwsConfig;
    const shouldUpgradeEndpoint =
      DEFAULT_CONFIG.endpoint !== LEGACY_DEFAULT_ENDPOINT &&
      parsed.endpoint === LEGACY_DEFAULT_ENDPOINT;

    return {
      ...DEFAULT_CONFIG,
      ...parsed,
      endpoint: shouldUpgradeEndpoint ? DEFAULT_CONFIG.endpoint : parsed.endpoint,
    };
  } catch {
    localStorage.removeItem('floci-aws-config');
    return DEFAULT_CONFIG;
  }
};

const buildEndpointUrl = (endpoint: string, path: string) => {
  return `${endpoint.replace(/\/+$/, '')}${path}`;
};

export const AwsProvider = ({ children }: { children: ReactNode }) => {
  const [config, setConfig] = useState<AwsConfig>(getInitialConfig);

  const [isHealthy, setIsHealthy] = useState<boolean | null>(null);
  const [activity, setActivity] = useState<ActivityLog[]>([]);

  const clients = useMemo(() => {
    const credentials = {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    };
    const region = config.region;
    const endpoint = config.endpoint;

    const commonParams = {
      region,
      endpoint,
      credentials,
      forcePathStyle: true, // Required for S3 against LocalStack/Floci.
    };

    return {
      s3: new S3Client(commonParams),
      sqs: new SQSClient(commonParams),
      sns: new SNSClient(commonParams),
      dynamo: new DynamoDBClient(commonParams),
      lambda: new LambdaClient(commonParams),
      iam: new IAMClient(commonParams),
      secrets: new SecretsManagerClient(commonParams),
      ec2: new EC2Client(commonParams),
      ecs: new ECSClient(commonParams),
      sts: new STSClient(commonParams),
      kms: new KMSClient(commonParams),
      acm: new ACMClient(commonParams),
      cloudwatch: new CloudWatchLogsClient(commonParams),
      eventbridge: new EventBridgeClient(commonParams),
      rds: new RDSClient(commonParams),
      kinesis: new KinesisClient(commonParams),
      cloudformation: new CloudFormationClient(commonParams),
      ecr: new ECRClient(commonParams),
      glue: new GlueClient(commonParams),
      elasticache: new ElastiCacheClient(commonParams),
      waf: new WAFV2Client(commonParams),
      codebuild: new CodeBuildClient(commonParams),
      scheduler: new SchedulerClient(commonParams),
      sfn: new SFNClient(commonParams),
      ssm: new SSMClient(commonParams),
      cloudwatchMetrics: new CloudWatchClient(commonParams),
      ses: new SESClient(commonParams),
    };
  }, [config]);

  const logActivity = (service: string, action: string, status: 'success' | 'error', details?: string) => {
    const newLog: ActivityLog = {
      id: Math.random().toString(36).substring(7),
      service,
      action,
      timestamp: new Date(),
      status,
      details,
    };
    setActivity(prev => [newLog, ...prev].slice(0, 500));
  };

  // Background heartbeat — confirms STS stays reachable without blocking the UI.
  useEffect(() => {
    if (!isHealthy) return;

    const interval = setInterval(async () => {
      try {
        await clients.sts.send(new GetCallerIdentityCommand({}));
        logActivity('STS', 'HealthCheck', 'success', 'identity/floci-daemon-bg');
      } catch {
        // The heartbeat must never interrupt the experience if the emulator restarts.
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [isHealthy, clients.sts]);

  useEffect(() => {
    localStorage.setItem('floci-aws-config', JSON.stringify(config));
  }, [config]);

  const checkHealth = async () => {
    try {
      // Floci keeps the LocalStack-compatible health endpoint.
      const response = await fetch(buildEndpointUrl(config.endpoint, '/_localstack/health'));
      setIsHealthy(response.ok);
    } catch {
      setIsHealthy(false);
    }
  };

  useEffect(() => {
    checkHealth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.endpoint]);

  const updateConfig = (newConfig: Partial<AwsConfig>) => {
    setConfig(prev => ({ ...prev, ...newConfig }));
  };

  return (
    <AwsContext.Provider value={{ config, updateConfig, clients, isHealthy, checkHealth, activity, logActivity }}>
      {children}
    </AwsContext.Provider>
  );
};

export const useAws = () => {
  const context = useContext(AwsContext);
  if (!context) throw new Error('useAws must be used within an AwsProvider');
  return context;
};
