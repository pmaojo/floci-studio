import { Router } from 'express';
import { EksService } from '../application/eksService';

export const createEksRouter = (eksService: EksService) => {
  const router = Router();

  router.get('/eks/overview', async (_request, response) => {
    try {
      response.json(await eksService.getOverview());
    } catch (error: any) {
      response.status(500).json({ error: error.message || 'Failed to read EKS overview' });
    }
  });

  return router;
};
