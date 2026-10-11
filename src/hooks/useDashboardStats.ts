import { useState, useEffect, useCallback } from 'react';
import { useAws } from '../contexts/AwsContext';
import { ListBucketsCommand } from '@aws-sdk/client-s3';
import { ListTablesCommand } from '@aws-sdk/client-dynamodb';
import { ListFunctionsCommand } from '@aws-sdk/client-lambda';
import { ListQueuesCommand } from '@aws-sdk/client-sqs';
import { sidecarApi } from '../lib/sidecarApi';

export interface DashboardStats {
  s3: number;
  dynamo: number;
  lambda: number;
  sqs: number;
  codeartifact: number;
  loading: boolean;
  error: string | null;
}

export const useDashboardStats = () => {
  const { clients, isHealthy } = useAws();
  const [stats, setStats] = useState<DashboardStats>({
    s3: 0,
    dynamo: 0,
    lambda: 0,
    sqs: 0,
    codeartifact: 0,
    loading: true,
    error: null,
  });

  const fetchStats = useCallback(async () => {
    if (!isHealthy) {
        setStats(prev => ({ ...prev, loading: false }));
        return;
    }

    setStats(prev => ({ ...prev, loading: true, error: null }));

    try {
      const [s3, dynamo, lambda, sqs, ca] = await Promise.allSettled([
        clients.s3.send(new ListBucketsCommand({})),
        clients.dynamo.send(new ListTablesCommand({})),
        clients.lambda.send(new ListFunctionsCommand({})),
        clients.sqs.send(new ListQueuesCommand({})),
        sidecarApi.getAwsServiceOverview('codeartifact'),
      ]);

      setStats({
        s3: s3.status === 'fulfilled' ? (s3.value.Buckets?.length || 0) : 0,
        dynamo: dynamo.status === 'fulfilled' ? (dynamo.value.TableNames?.length || 0) : 0,
        lambda: lambda.status === 'fulfilled' ? (lambda.value.Functions?.length || 0) : 0,
        sqs: sqs.status === 'fulfilled' ? (sqs.value.QueueUrls?.length || 0) : 0,
        codeartifact: ca.status === 'fulfilled' ? ca.value.resources.reduce((total, resource) => total + resource.count, 0) : 0,
        loading: false,
        error: null,
      });
    } catch (err) {
      setStats(prev => ({ ...prev, loading: false, error: err instanceof Error ? err.message : String(err) }));
    }
  }, [clients, isHealthy]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { ...stats, refresh: fetchStats };
};
