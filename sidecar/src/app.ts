import express, { type Router, type Request, type Response, type NextFunction } from 'express';
import { config, SIDECAR_TOKEN_HEADER } from './config';

export interface CreateAppDependencies {
  lambdaRouter: Router;
  eksRouter: Router;
  awsResourceRouter: Router;
  diagnosticsRouter: Router;
  marketplaceRouter: Router;
  athenaRouter: Router;
}

export const createApp = ({ lambdaRouter, eksRouter, awsResourceRouter, diagnosticsRouter, marketplaceRouter, athenaRouter }: CreateAppDependencies) => {
  const app = express();

  app.use(express.json({ limit: `${config.maxBodyMb}mb` }));
  app.use(corsMiddleware);
  app.options('*', (_request, response) => response.sendStatus(204));

  // /health is always reachable so callers can detect the process without a token.
  app.get('/health', (_request, response) => {
    response.json({
      ok: true,
      endpointUrl: config.awsEndpointUrl,
      region: config.awsRegion,
      tokenRequired: Boolean(config.token),
    });
  });

  app.use('/api', tokenMiddleware);
  app.use('/api', lambdaRouter);
  app.use('/api', eksRouter);
  app.use('/api', awsResourceRouter);
  app.use('/api', diagnosticsRouter);
  app.use('/api', marketplaceRouter);
  app.use('/api', athenaRouter);

  app.use(errorMiddleware);

  return app;
};

const corsMiddleware = (request: Request, response: Response, next: NextFunction) => {
  const origin = request.headers.origin;
  if (origin && config.allowedOrigins.includes(origin)) {
    response.setHeader('Access-Control-Allow-Origin', origin);
    response.setHeader('Vary', 'Origin');
  }
  response.setHeader('Access-Control-Allow-Headers', `Content-Type, ${SIDECAR_TOKEN_HEADER}`);
  response.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  next();
};

const tokenMiddleware = (request: Request, response: Response, next: NextFunction) => {
  if (!config.token) return next();
  const provided = String(request.headers[SIDECAR_TOKEN_HEADER] || '').trim();
  if (provided && provided === config.token) return next();

  const authorization = request.headers.authorization;
  if (authorization?.startsWith('Bearer ') && authorization.slice(7).trim() === config.token) {
    return next();
  }

  response.status(401).json({ error: 'Sidecar token required' });
};

const errorMiddleware = (
  error: unknown,
  _request: Request,
  response: Response,
  _next: NextFunction,
) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error('[floci-sidecar] unhandled error', message);
  if (response.headersSent) return;
  response.status(500).json({ error: message });
};
