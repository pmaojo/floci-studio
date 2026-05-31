export interface AwsCliProfile {
  name: string;
  source: 'config' | 'credentials';
  type: 'static' | 'sso' | 'assume_role';
  region?: string;
  roleArn?: string;
  ssoStartUrl?: string;
}

export interface AssumeRoleResult {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken: string;
  expiration: string;
}

export type LambdaCodeInput =
  | { mode: 'template' }
  | { mode: 'inline'; fileName: string; source: string }
  | { mode: 'zipBase64'; zipBase64: string };

export interface LambdaRuntimeOption {
  value: string;
  label: string;
  supportsTemplate: boolean;
}

export interface LambdaTemplate {
  runtime: string;
  fileName: string;
  handler: string;
  source: string;
}

export interface LambdaCapabilities {
  endpointUrl: string;
  defaultRegion: string;
  defaultRoleArn: string;
  runtimes: LambdaRuntimeOption[];
  templates: LambdaTemplate[];
  sourceModes: string[];
}

export interface CreateLambdaPayload {
  functionName: string;
  runtime: string;
  handler: string;
  role?: string;
  description?: string;
  timeout?: number;
  memorySize?: number;
  code: LambdaCodeInput;
}

export interface UpdateLambdaCodePayload {
  runtime: string;
  code: LambdaCodeInput;
}

export interface UpdateLambdaConfigurationPayload {
  runtime?: string;
  handler?: string;
  role?: string;
  description?: string;
  timeout?: number;
  memorySize?: number;
}

export interface EksClusterSummary {
  name: string;
  arn?: string;
  createdAt?: string;
  version?: string;
  endpoint?: string;
  roleArn?: string;
  status?: string;
  platformVersion?: string;
  vpcId?: string;
  subnetIds: string[];
  securityGroupIds: string[];
  fargateProfiles: string[];
}

export interface KubernetesPodSummary {
  name: string;
  namespace: string;
  status: string;
  restarts: number;
  createdAt?: string;
  nodeName?: string;
  podIp?: string;
  containers: Array<{
    name: string;
    ready: boolean;
    restarts: number;
  }>;
}

export interface EksOverview {
  endpointUrl: string;
  region: string;
  clusters: EksClusterSummary[];
  kubernetes: {
    available: boolean;
    source?: string;
    reason?: string;
    pods: KubernetesPodSummary[];
  };
}

export interface AwsServiceResourceOverview {
  id: string;
  label: string;
  status: 'ok' | 'unsupported' | 'error';
  command: string;
  count: number;
  items: unknown[];
  source?: string;
  payload?: unknown;
  error?: string;
}

export interface AwsServiceOverview {
  serviceKey: string;
  serviceName: string;
  description: string;
  endpointUrl: string;
  region: string;
  generatedAt: string;
  source?: string;
  resources: AwsServiceResourceOverview[];
}

export interface AwsServiceSummary {
  key: string;
  serviceName: string;
  description: string;
  resources: Array<{
    id: string;
    label: string;
  }>;
}

export interface DiagnosticStep {
  name: string;
  ok: boolean;
  durationMs: number;
  detail?: string;
  error?: string;
}

export interface KmsRoundTripResult {
  ok: boolean;
  matches: boolean;
  keyId?: string;
  plaintext: string;
  decrypted?: string;
  steps: DiagnosticStep[];
  cleanup: { ok: boolean; error?: string };
}

export interface CostForecastItem {
  service: string;
  resourceType: string;
  count: number;
  unitPrice: number;
  monthly: number;
  source: string;
}

export interface CostForecastResult {
  ok: boolean;
  totalMonthlyForecast: number;
  forecasts: CostForecastItem[];
}

export interface RecipeVariable {
  key: string;
  label: string;
  type: 'text' | 'number' | 'password';
  default: string | number;
  description: string;
}

export interface RecipeAwsTarget {
  /** The managed AWS service this recipe maps to in production. */
  service: string;
  /** How local behavior mirrors the AWS service (parity note). */
  parity: string;
  /** The step to switch from local to the managed AWS service. */
  deploy: string;
}

export interface Recipe {
  id: string;
  name: string;
  description: string;
  version: string;
  variables: RecipeVariable[];
  accessUrl?: string;
  /** Local-to-AWS parity metadata: which managed service this maps to. */
  aws?: RecipeAwsTarget;
}

export interface Installation {
  recipeId: string;
  status: 'IDLE' | 'INSTALLING' | 'RUNNING' | 'FAILED' | 'UNINSTALLING';
  installedAt?: string;
  vars?: Record<string, any>;
  error?: string | null;
}

const sidecarBaseUrl = import.meta.env.VITE_SIDECAR_URL || '/sidecar';

const requestSidecar = async <T>(path: string, options: RequestInit = {}): Promise<T> => {
  const response = await fetch(`${sidecarBaseUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || `Sidecar request failed with ${response.status}`);
  }

  return payload as T;
};

// The diagnostic endpoint replies 200 on success and 502 on a failed round-trip — both
// return the same shape. Surface the body in both cases so the UI can render per-step results.
const requestDiagnostic = async <T>(path: string): Promise<T> => {
  const response = await fetch(`${sidecarBaseUrl}${path}`, {
    headers: { 'Accept': 'application/json' },
  });
  const payload = await response.json().catch(() => ({}));
  return payload as T;
};

export const sidecarApi = {
  health: () => requestSidecar<{ ok: boolean; endpointUrl: string; region: string }>('/health'),
  getLambdaCapabilities: () => requestSidecar<LambdaCapabilities>('/api/lambda/capabilities'),
  listLambdaFunctions: () => requestSidecar<{ ok: boolean; Functions?: any[] }>('/api/lambda/functions'),
  createLambdaFunction: (payload: CreateLambdaPayload) => requestSidecar<{ ok: boolean; [key: string]: any }>('/api/lambda/functions', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  updateLambdaCode: (functionName: string, payload: UpdateLambdaCodePayload) => requestSidecar<{ ok: boolean; [key: string]: any }>(`/api/lambda/functions/${encodeURIComponent(functionName)}/code`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  }),
  updateLambdaConfiguration: (functionName: string, payload: UpdateLambdaConfigurationPayload) => requestSidecar<{ ok: boolean; [key: string]: any }>(`/api/lambda/functions/${encodeURIComponent(functionName)}/configuration`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  }),
  invokeLambdaFunction: (functionName: string, payload: unknown) => requestSidecar<{ ok: boolean; [key: string]: any }>(`/api/lambda/functions/${encodeURIComponent(functionName)}/invoke`, {
    method: 'POST',
    body: JSON.stringify({ payload }),
  }),
  getLambdaLogs: (functionName: string) => requestSidecar<{ ok: boolean; [key: string]: any }>(`/api/lambda/functions/${encodeURIComponent(functionName)}/logs`),
  deleteLambdaFunction: (functionName: string) => requestSidecar<{ ok: boolean; [key: string]: any }>(`/api/lambda/functions/${encodeURIComponent(functionName)}`, {
    method: 'DELETE',
  }),
  getEksOverview: () => requestSidecar<EksOverview>('/api/eks/overview'),
  listAwsServices: () => requestSidecar<{ services: AwsServiceSummary[] }>('/api/aws-services'),
  getAwsServiceOverview: (serviceKey: string) => requestSidecar<AwsServiceOverview>(`/api/aws-services/${encodeURIComponent(serviceKey)}/overview`),
  createCodeArtifactDomain: (name: string) => requestSidecar<AwsServiceOverview>('/api/aws-services/codeartifact/domains', {
    method: 'POST',
    body: JSON.stringify({ name }),
  }),
  createCodeArtifactRepository: (domainName: string, repositoryName: string) => requestSidecar<AwsServiceOverview>('/api/aws-services/codeartifact/repositories', {
    method: 'POST',
    body: JSON.stringify({ domainName, repositoryName }),
  }),
  deleteCodeArtifactRepository: (domainName: string, repositoryName: string) => requestSidecar<AwsServiceOverview>(
    `/api/aws-services/codeartifact/repositories/${encodeURIComponent(domainName)}/${encodeURIComponent(repositoryName)}`,
    { method: 'DELETE' },
  ),
  createCompatibilityResource: (serviceKey: string, resourceId: string, name: string) => requestSidecar<AwsServiceOverview>(
    `/api/aws-services/${encodeURIComponent(serviceKey)}/resources/${encodeURIComponent(resourceId)}`,
    {
      method: 'POST',
      body: JSON.stringify({ name }),
    },
  ),
  deleteCompatibilityResource: (serviceKey: string, resourceId: string, name: string) => requestSidecar<AwsServiceOverview>(
    `/api/aws-services/${encodeURIComponent(serviceKey)}/resources/${encodeURIComponent(resourceId)}/${encodeURIComponent(name)}`,
    { method: 'DELETE' },
  ),
  runKmsDiagnostic: () => requestDiagnostic<KmsRoundTripResult>('/api/diagnostics/kms'),
  runCostForecast: () => requestDiagnostic<CostForecastResult>('/api/diagnostics/cost-forecast'),
  listRecipes: () => requestSidecar<{ ok: boolean; recipes: Recipe[] }>('/api/marketplace/recipes'),
  getInstallations: () => requestSidecar<{ ok: boolean; installations: Record<string, Installation> }>('/api/marketplace/installations'),
  getRecipeLogs: (recipeId: string) => requestSidecar<{ ok: boolean; logs: string[] }>(`/api/marketplace/recipes/${recipeId}/logs`),
  installRecipe: (recipeId: string, vars: Record<string, any>) => requestSidecar<{ ok: boolean; installation: Installation }>(
    '/api/marketplace/install',
    {
      method: 'POST',
      body: JSON.stringify({ recipeId, vars }),
      headers: { 'Content-Type': 'application/json' },
    }
  ),
  uninstallRecipe: (recipeId: string) => requestSidecar<{ ok: boolean; installation: Installation }>(
    `/api/marketplace/install/${recipeId}`,
    { method: 'DELETE' }
  ),
  getAthenaCatalog: () => requestSidecar<{ ok: boolean; catalog: any }>('/api/athena/catalog'),
  startAthenaQuery: (query: string, database: string, workGroup?: string) => requestSidecar<{ ok: boolean; queryExecutionId: string }>('/api/athena/query', {
    method: 'POST',
    body: JSON.stringify({ query, database, workGroup }),
  }),
  getAthenaQueryStatus: (id: string) => requestSidecar<{ ok: boolean; execution: any }>(`/api/athena/query/${id}`),
  getAthenaQueryResults: (id: string) => requestSidecar<{ ok: boolean; results: any }>(`/api/athena/query/${id}/results`),
  getAthenaHistory: () => requestSidecar<{ ok: boolean; history: any[] }>('/api/athena/history'),
  clearAthenaHistory: () => requestSidecar<{ ok: boolean }>('/api/athena/history', { method: 'DELETE' }),
  // Auth / profile helpers
  listAwsProfiles: () => requestSidecar<{ profiles: AwsCliProfile[] }>('/api/auth/aws-profiles'),
  assumeRole: (roleArn: string, sessionName?: string, durationSeconds?: number, externalId?: string) =>
    requestSidecar<AssumeRoleResult>('/api/auth/assume-role', {
      method: 'POST',
      body: JSON.stringify({ roleArn, sessionName, durationSeconds, externalId }),
    }),
};

export const fileToBase64 = (file: File) => {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        reject(new Error('FileReader did not return a base64 data URL'));
        return;
      }
      resolve(result);
    };
    reader.onerror = () => reject(reader.error || new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
};
