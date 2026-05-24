import { config } from './config';
import { EksService } from './application/eksService';
import { AwsResourceService } from './application/awsResourceService';
import { CompatibilityService } from './application/compatibilityService';
import { LambdaService } from './application/lambdaService';
import { DiagnosticsService } from './application/diagnosticsService';
import { RecipeService } from './application/recipeService';
import { AthenaService } from './application/athenaService';
import { AwsCli } from './infrastructure/awsCli';
import { createAwsResourceRouter } from './routes/awsResourceRoutes';
import { createEksRouter } from './routes/eksRoutes';
import { createLambdaRouter } from './routes/lambdaRoutes';
import { createDiagnosticsRouter } from './routes/diagnosticsRoutes';
import { createMarketplaceRouter } from './routes/marketplaceRoutes';
import { createAthenaRouter } from './routes/athenaRoutes';
import { createApp } from './app';

const awsCli = new AwsCli();
const recipeService = new RecipeService();
const compatibilityService = new CompatibilityService(recipeService);
const lambdaService = new LambdaService(awsCli);
const eksService = new EksService(awsCli);
const awsResourceService = new AwsResourceService(awsCli, compatibilityService);
const diagnosticsService = new DiagnosticsService(awsCli, compatibilityService);
const athenaService = new AthenaService(awsCli);

const app = createApp({
  lambdaRouter: createLambdaRouter(lambdaService),
  eksRouter: createEksRouter(eksService),
  awsResourceRouter: createAwsResourceRouter(awsResourceService, compatibilityService),
  diagnosticsRouter: createDiagnosticsRouter(diagnosticsService),
  marketplaceRouter: createMarketplaceRouter(recipeService),
  athenaRouter: createAthenaRouter(athenaService),
});

app.listen(config.port, config.host, () => {
  const tokenState = config.token ? 'token=required' : 'token=open';
  console.log(`Floci sidecar listening on http://${config.host}:${config.port} (${tokenState})`);
  if (!config.token && config.host !== '127.0.0.1' && config.host !== 'localhost') {
    console.warn('[floci-sidecar] WARNING: SIDECAR_TOKEN is empty and host is not loopback. Set SIDECAR_TOKEN before exposing this port.');
  }
});
