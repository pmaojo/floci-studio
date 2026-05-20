import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
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
import { CodeartifactClient } from '@aws-sdk/client-codeartifact';
import { SESClient } from '@aws-sdk/client-ses';
import { KMSClient } from '@aws-sdk/client-kms';
import { ACMClient } from '@aws-sdk/client-acm';
import { CloudWatchLogsClient } from '@aws-sdk/client-cloudwatch-logs';
import { EventBridgeClient } from '@aws-sdk/client-eventbridge';
import { APIGatewayClient } from '@aws-sdk/client-api-gateway';
import { RDSClient } from '@aws-sdk/client-rds';
import { Route53Client } from '@aws-sdk/client-route-53';
import { SFNClient } from '@aws-sdk/client-sfn';
import { KinesisClient } from '@aws-sdk/client-kinesis';
import { CloudFormationClient } from '@aws-sdk/client-cloudformation';
import { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';
import { ECRClient } from '@aws-sdk/client-ecr';
import { GlueClient } from '@aws-sdk/client-glue';
import { SSMClient } from '@aws-sdk/client-ssm';
import { CloudFrontClient } from '@aws-sdk/client-cloudfront';
import { ElastiCacheClient } from '@aws-sdk/client-elasticache';
import { AthenaClient } from '@aws-sdk/client-athena';
import { WAFV2Client } from '@aws-sdk/client-wafv2';
import { CodeBuildClient } from '@aws-sdk/client-codebuild';
import { CodePipelineClient } from '@aws-sdk/client-codepipeline';
import { AppSyncClient } from '@aws-sdk/client-appsync';
import { DEFAULT_CONFIG, type AwsConfig } from '../types';

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
    codeartifact: CodeartifactClient;
    ses: SESClient;
    kms: KMSClient;
    acm: ACMClient;
    cloudwatch: CloudWatchLogsClient;
    eventbridge: EventBridgeClient;
    apigateway: APIGatewayClient;
    rds: RDSClient;
    route53: Route53Client;
    sfn: SFNClient;
    kinesis: KinesisClient;
    cloudformation: CloudFormationClient;
    cognito: CognitoIdentityProviderClient;
    ecr: ECRClient;
    glue: GlueClient;
    ssm: SSMClient;
    cloudfront: CloudFrontClient;
    elasticache: ElastiCacheClient;
    athena: AthenaClient;
    waf: WAFV2Client;
    codebuild: CodeBuildClient;
    codepipeline: CodePipelineClient;
    appsync: AppSyncClient;
  };
  isHealthy: boolean | null;
  checkHealth: () => Promise<void>;
  activity: ActivityLog[];
  logActivity: (service: string, action: string, status: 'success' | 'error', details?: string) => void;
}

const AwsContext = createContext<AwsContextType | undefined>(undefined);

export const AwsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [config, setConfig] = useState<AwsConfig>(() => {
    const saved = localStorage.getItem('floci-aws-config');
    return saved ? JSON.parse(saved) : DEFAULT_CONFIG;
  });

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
      forcePathStyle: true, // Important for S3 in LocalStack/Floci
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
      codeartifact: new CodeartifactClient(commonParams),
      ses: new SESClient(commonParams),
      kms: new KMSClient(commonParams),
      acm: new ACMClient(commonParams),
      cloudwatch: new CloudWatchLogsClient(commonParams),
      eventbridge: new EventBridgeClient(commonParams),
      apigateway: new APIGatewayClient(commonParams),
      rds: new RDSClient(commonParams),
      route53: new Route53Client(commonParams),
      sfn: new SFNClient(commonParams),
      kinesis: new KinesisClient(commonParams),
      cloudformation: new CloudFormationClient(commonParams),
      cognito: new CognitoIdentityProviderClient(commonParams),
      ecr: new ECRClient(commonParams),
      glue: new GlueClient(commonParams),
      ssm: new SSMClient(commonParams),
      cloudfront: new CloudFrontClient(commonParams),
      elasticache: new ElastiCacheClient(commonParams),
      athena: new AthenaClient(commonParams),
      waf: new WAFV2Client(commonParams),
      codebuild: new CodeBuildClient(commonParams),
      codepipeline: new CodePipelineClient(commonParams),
      appsync: new AppSyncClient(commonParams),
    };
  }, [config]);

  const logActivity = (service: string, action: string, status: 'success' | 'error', details?: string) => {
    const newLog: ActivityLog = {
      id: Math.random().toString(36).substring(7),
      service,
      action,
      timestamp: new Date(),
      status,
      details
    };
    setActivity(prev => [newLog, ...prev].slice(0, 500)); // Increased for true logging
  };

  // Real background activity: periodic identity check
  useEffect(() => {
    if (!isHealthy) return;

    const interval = setInterval(async () => {
      try {
        await clients.sts.send(new GetCallerIdentityCommand({}));
        logActivity('STS', 'HealthCheck', 'success', 'identity/floci-daemon-bg');
      } catch (e) {
        // Silent fail for background health check
      }
    }, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, [isHealthy, clients.sts]);

  useEffect(() => {
    localStorage.setItem('floci-aws-config', JSON.stringify(config));
  }, [config]);

  const checkHealth = async () => {
    try {
      // Small hack: check if the endpoint is reachable using fetch
      // Floci usually responds to /_localstack/health or just /
      const response = await fetch(config.endpoint, { mode: 'no-cors' });
      setIsHealthy(true);
    } catch (e) {
      setIsHealthy(false);
    }
  };

  useEffect(() => {
    checkHealth();
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
