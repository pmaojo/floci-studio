import { Router, type Request, type Response } from 'express';
import { AwsCliError } from '../infrastructure/awsCli';
import { LambdaService } from '../application/lambdaService';

type AsyncHandler = (request: Request, response: Response) => Promise<unknown>;

export const createLambdaRouter = (lambdaService: LambdaService) => {
  const router = Router();

  router.get('/lambda/capabilities', handle(async (_request, response) => {
    response.json(await lambdaService.getCapabilities());
  }));

  router.get('/lambda/functions', handle(async (_request, response) => {
    response.json(await lambdaService.listFunctions());
  }));

  router.post('/lambda/functions', handle(async (request, response) => {
    response.status(201).json(await lambdaService.createFunction(request.body));
  }));

  router.put('/lambda/functions/:functionName/code', handle(async (request, response) => {
    response.json(await lambdaService.updateFunctionCode(request.params.functionName, request.body));
  }));

  router.put('/lambda/functions/:functionName/configuration', handle(async (request, response) => {
    response.json(await lambdaService.updateFunctionConfiguration(request.params.functionName, request.body));
  }));

  router.post('/lambda/functions/:functionName/invoke', handle(async (request, response) => {
    response.json(await lambdaService.invokeFunction(request.params.functionName, request.body));
  }));

  router.get('/lambda/functions/:functionName/logs', handle(async (request, response) => {
    response.json(await lambdaService.getLogs(request.params.functionName));
  }));

  router.delete('/lambda/functions/:functionName', handle(async (request, response) => {
    response.json(await lambdaService.deleteFunction(request.params.functionName));
  }));

  return router;
};

const handle = (handler: AsyncHandler) => async (request: Request, response: Response) => {
  try {
    await handler(request, response);
  } catch (error) {
    const status = error instanceof AwsCliError ? 502 : 400;
    response.status(status).json({
      error: error instanceof Error ? error.message : String(error),
      stderr: error instanceof AwsCliError ? error.stderr : undefined,
    });
  }
};
