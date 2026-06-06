import { createContext, useContext, useState, useEffect, useMemo, useCallback, type ReactNode } from 'react';
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
import {
  DEFAULT_CONFIG,
  LEGACY_DEFAULT_ENDPOINT,
  PROFILES_STORAGE_KEY,
  type AwsConfig,
  type SavedProfile,
} from '../types';
import { useRealtimeSocket } from '../hooks/useRealtimeSocket';

export interface ActivityLog {
  id: string;
  service: string;
  action: string;
  timestamp: Date;
  status: 'success' | 'error';
  details?: string;
}

export interface ResourceCounts {
  s3: number;
  dynamodb: number;
  lambda: number;
  sqs: number;
  sns: number;
  secrets: number;
  kms: number;
  eventbridge: number;
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
  wsConnected: boolean;
  resourceCounts: ResourceCounts | null;
  checkHealth: () => Promise<void>;
  activity: ActivityLog[];
  logActivity: (service: string, action: string, status: 'success' | 'error', details?: string) => void;
  // Profile management
  savedProfiles: SavedProfile[];
  saveProfile: (name: string) => void;
  deleteProfile: (name: string) => void;
  applyProfile: (profile: SavedProfile) => void;
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

const getInitialProfiles = (): SavedProfile[] => {
  try {
    const raw = localStorage.getItem(PROFILES_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SavedProfile[]) : [];
  } catch {
    return [];
  }
};

const buildEndpointUrl = (endpoint: string, path: string) =>
  `${endpoint.replace(/\/+$/, '')}${path}`;

export const AwsProvider = ({ children }: { children: ReactNode }) => {
  const [config, setConfig] = useState<AwsConfig>(getInitialConfig);
  const [isHealthy, setIsHealthy] = useState<boolean | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [resourceCounts, setResourceCounts] = useState<ResourceCounts | null>(null);
  const [activity, setActivity] = useState<ActivityLog[]>([]);
  const [savedProfiles, setSavedProfiles] = useState<SavedProfile[]>(getInitialProfiles);

  const clients = useMemo(() => {
    const credentials = {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
      ...(config.sessionToken ? { sessionToken: config.sessionToken } : {}),
    };
    const commonParams = {
      region: config.region,
      endpoint: config.endpoint,
      credentials,
      forcePathStyle: true,
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

  const logActivity = useCallback((
    service: string,
    action: string,
    status: 'success' | 'error',
    details?: string,
  ) => {
    const newLog: ActivityLog = {
      id: Math.random().toString(36).substring(7),
      service,
      action,
      timestamp: new Date(),
      status,
      details,
    };
    setActivity(prev => [newLog, ...prev].slice(0, 500));
  }, []);

  // WebSocket — real-time resource snapshots from the backend
  const { subscribe } = useRealtimeSocket(setWsConnected);

  useEffect(() => {
    const unsub = subscribe('resource_snapshot', (payload) => {
      setResourceCounts(payload as ResourceCounts);
    });
    return () => { unsub(); };
  }, [subscribe]);

  // Background heartbeat — confirms STS stays reachable without blocking the UI
  useEffect(() => {
    if (!isHealthy) return;
    const interval = setInterval(async () => {
      try {
        await clients.sts.send(new GetCallerIdentityCommand({}));
        logActivity('STS', 'HealthCheck', 'success', 'identity/floci-daemon-bg');
      } catch {
        // never interrupt the experience if the emulator restarts
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [isHealthy, clients.sts, logActivity]);

  useEffect(() => {
    localStorage.setItem('floci-aws-config', JSON.stringify(config));
  }, [config]);

  useEffect(() => {
    localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(savedProfiles));
  }, [savedProfiles]);

  const checkHealth = useCallback(async () => {
    try {
      const response = await fetch(buildEndpointUrl(config.endpoint, '/_localstack/health'));
      setIsHealthy(response.ok);
    } catch {
      setIsHealthy(false);
    }
  }, [config.endpoint]);

  useEffect(() => {
    checkHealth();
  }, [checkHealth]);

  const updateConfig = (newConfig: Partial<AwsConfig>) => {
    setConfig(prev => ({ ...prev, ...newConfig }));
  };

  const saveProfile = useCallback((name: string) => {
    setSavedProfiles(prev => {
      const filtered = prev.filter(p => p.name !== name);
      return [...filtered, { name, config }];
    });
  }, [config]);

  const deleteProfile = useCallback((name: string) => {
    setSavedProfiles(prev => prev.filter(p => p.name !== name));
  }, []);

  const applyProfile = useCallback((profile: SavedProfile) => {
    setConfig(profile.config);
  }, []);

  return (
    <AwsContext.Provider value={{
      config,
      updateConfig,
      clients,
      isHealthy,
      wsConnected,
      resourceCounts,
      checkHealth,
      activity,
      logActivity,
      savedProfiles,
      saveProfile,
      deleteProfile,
      applyProfile,
    }}>
      {children}
    </AwsContext.Provider>
  );
};

export const useAws = () => {
  const context = useContext(AwsContext);
  if (!context) throw new Error('useAws must be used within an AwsProvider');
  return context;
};
