import { AwsCli } from '../src/infrastructure/awsCli';
import { CompatibilityService } from '../src/application/compatibilityService';
import { AwsResourceService } from '../src/application/awsResourceService';
import { LambdaService } from '../src/application/lambdaService';
import { EksService } from '../src/application/eksService';
import { DiagnosticsService } from '../src/application/diagnosticsService';
import { RecipeService } from '../src/application/recipeService';
import { AthenaService } from '../src/application/athenaService';
import { createAwsResourceRouter } from '../src/routes/awsResourceRoutes';
import { createLambdaRouter } from '../src/routes/lambdaRoutes';
import { createEksRouter } from '../src/routes/eksRoutes';
import { createDiagnosticsRouter } from '../src/routes/diagnosticsRoutes';
import { createMarketplaceRouter } from '../src/routes/marketplaceRoutes';
import { createAthenaRouter } from '../src/routes/athenaRoutes';
import { createApp } from '../src/app';

export type StubResponder = (args: string[]) => unknown | Promise<unknown>;

export class StubAwsCli extends AwsCli {
  public calls: string[][] = [];

  constructor(private readonly responder: StubResponder = () => ({})) {
    super();
  }

  override async run() {
    return { stdout: '', stderr: '' };
  }

  override async runJson<T>(args: string[]): Promise<T> {
    this.calls.push([...args]);
    return (await Promise.resolve(this.responder(args))) as T;
  }
}

export interface TestAppHandle {
  app: ReturnType<typeof createApp>;
  awsCli: StubAwsCli;
}

export const buildTestApp = (responder?: StubResponder): TestAppHandle => {
  const awsCli = new StubAwsCli(responder);
  const recipeService = new RecipeService();
  const compatibilityService = new CompatibilityService(recipeService);
  const lambdaService = new LambdaService(awsCli);
  const eksService = new EksService(awsCli);
  const awsResourceService = new AwsResourceService(awsCli, compatibilityService);
  const diagnosticsService = new DiagnosticsService(awsCli);
  const athenaService = new AthenaService(awsCli);

  const app = createApp({
    lambdaRouter: createLambdaRouter(lambdaService),
    eksRouter: createEksRouter(eksService),
    awsResourceRouter: createAwsResourceRouter(awsResourceService, compatibilityService),
    diagnosticsRouter: createDiagnosticsRouter(diagnosticsService),
    marketplaceRouter: createMarketplaceRouter(recipeService),
    athenaRouter: createAthenaRouter(athenaService),
  });

  return { app, awsCli };
};
