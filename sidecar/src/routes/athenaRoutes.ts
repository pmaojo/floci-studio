import { Router } from 'express';
import { AthenaService } from '../application/athenaService';

export const createAthenaRouter = (athenaService: AthenaService) => {
  const router = Router();

  // Get data catalogs and tables
  router.get('/athena/catalog', async (_request, response) => {
    try {
      const catalog = await athenaService.listCatalogs();
      response.json({ ok: true, catalog });
    } catch (error) {
      response.status(500).json({ ok: false, error: error instanceof Error ? error.message : String(error) });
    }
  });

  // Submit a query
  router.post('/athena/query', async (request, response) => {
    try {
      const { query, database, workGroup } = request.body;
      if (!query) {
        return response.status(400).json({ ok: false, error: 'query string is required' });
      }
      if (!database) {
        return response.status(400).json({ ok: false, error: 'database name is required' });
      }

      const queryExecutionId = await athenaService.startQuery(query, database, workGroup || 'primary');
      response.json({ ok: true, queryExecutionId });
    } catch (error) {
      response.status(500).json({ ok: false, error: error instanceof Error ? error.message : String(error) });
    }
  });

  // Check query status
  router.get('/athena/query/:id', async (request, response) => {
    try {
      const execution = await athenaService.getQueryStatus(request.params.id);
      response.json({ ok: true, execution });
    } catch (error) {
      response.status(404).json({ ok: false, error: error instanceof Error ? error.message : String(error) });
    }
  });

  // Get query results
  router.get('/athena/query/:id/results', async (request, response) => {
    try {
      const results = await athenaService.getQueryResults(request.params.id);
      response.json({ ok: true, results });
    } catch (error) {
      response.status(400).json({ ok: false, error: error instanceof Error ? error.message : String(error) });
    }
  });

  // Get query execution history
  router.get('/athena/history', async (_request, response) => {
    try {
      const history = await athenaService.getHistory();
      response.json({ ok: true, history });
    } catch (error) {
      response.status(500).json({ ok: false, error: error instanceof Error ? error.message : String(error) });
    }
  });

  // Clear query history
  router.delete('/athena/history', async (_request, response) => {
    try {
      await athenaService.clearHistory();
      response.json({ ok: true });
    } catch (error) {
      response.status(500).json({ ok: false, error: error instanceof Error ? error.message : String(error) });
    }
  });

  return router;
};
