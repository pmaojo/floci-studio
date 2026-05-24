import { Router } from 'express';
import { DiagnosticsService } from '../application/diagnosticsService';

export const createDiagnosticsRouter = (diagnostics: DiagnosticsService) => {
  const router = Router();

  router.get('/diagnostics/kms', async (_request, response) => {
    try {
      const result = await diagnostics.runKmsRoundTrip();
      response.status(result.ok ? 200 : 502).json(result);
    } catch (error) {
      response.status(500).json({
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  router.get('/diagnostics/cost-forecast', async (_request, response) => {
    try {
      const result = await diagnostics.runCostForecast();
      response.status(result.ok ? 200 : 500).json(result);
    } catch (error) {
      response.status(500).json({
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  return router;
};

