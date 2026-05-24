import { spawn } from 'node:child_process';
import { AwsCli } from '../infrastructure/awsCli';
import { config } from '../config';

interface EksListClustersResponse {
  clusters?: string[];
}

interface EksDescribeClusterResponse {
  cluster?: {
    name?: string;
    arn?: string;
    createdAt?: string;
    version?: string;
    endpoint?: string;
    roleArn?: string;
    status?: string;
    platformVersion?: string;
    resourcesVpcConfig?: {
      vpcId?: string;
      subnetIds?: string[];
      securityGroupIds?: string[];
    };
  };
}

interface EksListFargateProfilesResponse {
  fargateProfileNames?: string[];
}

interface KubernetesPodListResponse {
  items?: Array<{
    metadata?: {
      name?: string;
      namespace?: string;
      creationTimestamp?: string;
    };
    spec?: {
      nodeName?: string;
    };
    status?: {
      phase?: string;
      podIP?: string;
      containerStatuses?: Array<{
        name?: string;
        restartCount?: number;
        ready?: boolean;
      }>;
    };
  }>;
}

interface ProcessResult {
  stdout: string;
  stderr: string;
}

export class EksService {
  constructor(private readonly awsCli: AwsCli) {}

  async getOverview() {
    const list = await this.awsCli.runJson<EksListClustersResponse>(['eks', 'list-clusters']);
    const clusterNames = list.clusters || [];
    const clusters = await Promise.all(clusterNames.map(name => this.describeCluster(name)));
    const kubernetes = await this.listKubernetesPods();

    return {
      endpointUrl: config.awsEndpointUrl,
      region: config.awsRegion,
      clusters,
      kubernetes,
    };
  }

  private async describeCluster(name: string) {
    const [description, fargateProfiles] = await Promise.all([
      this.awsCli.runJson<EksDescribeClusterResponse>(['eks', 'describe-cluster', '--name', name]),
      this.listFargateProfiles(name),
    ]);

    const cluster = description.cluster || { name };

    return {
      name: cluster.name || name,
      arn: cluster.arn,
      createdAt: cluster.createdAt,
      version: cluster.version,
      endpoint: cluster.endpoint,
      roleArn: cluster.roleArn,
      status: cluster.status,
      platformVersion: cluster.platformVersion,
      vpcId: cluster.resourcesVpcConfig?.vpcId,
      subnetIds: cluster.resourcesVpcConfig?.subnetIds || [],
      securityGroupIds: cluster.resourcesVpcConfig?.securityGroupIds || [],
      fargateProfiles,
    };
  }

  private async listFargateProfiles(clusterName: string) {
    try {
      const response = await this.awsCli.runJson<EksListFargateProfilesResponse>([
        'eks',
        'list-fargate-profiles',
        '--cluster-name',
        clusterName,
      ]);
      return response.fargateProfileNames || [];
    } catch (error: any) {
      return [];
    }
  }

  private async listKubernetesPods() {
    const kubeconfig = process.env.KUBECONFIG;

    if (!kubeconfig) {
      return {
        available: false,
        reason: 'KUBECONFIG is not configured in the sidecar container.',
        pods: [],
      };
    }

    try {
      const result = await this.runProcess('kubectl', ['get', 'pods', '--all-namespaces', '-o', 'json'], {
        ...process.env,
        KUBECONFIG: kubeconfig,
      });
      const payload = JSON.parse(result.stdout || '{}') as KubernetesPodListResponse;

      return {
        available: true,
        source: kubeconfig,
        pods: (payload.items || []).map(pod => {
          const containers = pod.status?.containerStatuses || [];
          return {
            name: pod.metadata?.name || '',
            namespace: pod.metadata?.namespace || 'default',
            status: pod.status?.phase || 'Unknown',
            restarts: containers.reduce((total, container) => total + (container.restartCount || 0), 0),
            createdAt: pod.metadata?.creationTimestamp,
            nodeName: pod.spec?.nodeName,
            podIp: pod.status?.podIP,
            containers: containers.map(container => ({
              name: container.name || '',
              ready: Boolean(container.ready),
              restarts: container.restartCount || 0,
            })),
          };
        }),
      };
    } catch (error: any) {
      return {
        available: false,
        reason: error.message || 'kubectl failed while reading pods.',
        pods: [],
      };
    }
  }

  private runProcess(command: string, args: string[], env: NodeJS.ProcessEnv): Promise<ProcessResult> {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        shell: false,
        env,
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', chunk => {
        stdout += chunk.toString();
      });

      child.stderr.on('data', chunk => {
        stderr += chunk.toString();
      });

      child.on('error', reject);

      child.on('close', exitCode => {
        if (exitCode === 0) {
          resolve({ stdout, stderr });
          return;
        }

        reject(new Error(stderr.trim() || stdout.trim() || `${command} exited with ${exitCode}`));
      });
    });
  }
}
