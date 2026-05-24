export interface AwsConfig {
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
}

export const LEGACY_DEFAULT_ENDPOINT = 'http://localhost:4566';

const readViteEnv = (key: string, fallback: string) => {
  const value = import.meta.env[key];
  return typeof value === 'string' && value.trim().length > 0 ? value : fallback;
};

export const DEFAULT_CONFIG: AwsConfig = {
  endpoint: readViteEnv('VITE_FLOCI_ENDPOINT', LEGACY_DEFAULT_ENDPOINT),
  region: readViteEnv('VITE_AWS_REGION', 'us-east-1'),
  accessKeyId: readViteEnv('VITE_AWS_ACCESS_KEY_ID', 'test'),
  secretAccessKey: readViteEnv('VITE_AWS_SECRET_ACCESS_KEY', 'test'),
};
