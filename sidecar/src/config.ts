export interface SidecarConfig {
  host: string;
  port: number;
  awsEndpointUrl: string;
  awsRegion: string;
  awsAccessKeyId: string;
  awsSecretAccessKey: string;
  defaultLambdaRoleArn: string;
  stateDir: string;
  token: string;
  allowedOrigins: string[];
  maxBodyMb: number;
}

const readEnv = (key: string, fallback: string) => {
  const value = process.env[key];
  return value && value.trim().length > 0 ? value : fallback;
};

const parseOrigins = (value: string) => value
  .split(',')
  .map(origin => origin.trim())
  .filter(origin => origin.length > 0);

export const config: SidecarConfig = {
  host: readEnv('SIDECAR_HOST', '127.0.0.1'),
  port: Number(readEnv('SIDECAR_PORT', '4317')),
  awsEndpointUrl: readEnv('AWS_ENDPOINT_URL', 'http://localhost:4566'),
  awsRegion: readEnv('AWS_DEFAULT_REGION', 'us-east-1'),
  awsAccessKeyId: readEnv('AWS_ACCESS_KEY_ID', 'test'),
  awsSecretAccessKey: readEnv('AWS_SECRET_ACCESS_KEY', 'test'),
  defaultLambdaRoleArn: readEnv('LAMBDA_DEFAULT_ROLE_ARN', 'arn:aws:iam::000000000000:role/lambda-role'),
  stateDir: readEnv('SIDECAR_STATE_DIR', '.sidecar-state'),
  token: readEnv('SIDECAR_TOKEN', ''),
  allowedOrigins: parseOrigins(readEnv('SIDECAR_ALLOWED_ORIGINS', 'http://localhost:3000,http://127.0.0.1:3000')),
  maxBodyMb: Number(readEnv('SIDECAR_MAX_BODY_MB', '60')),
};

export const SIDECAR_TOKEN_HEADER = 'x-floci-sidecar-token';
