import { Router } from 'express';
import { RecipeService } from '../application/recipeService';

export const createMarketplaceRouter = (recipeService: RecipeService) => {
  const router = Router();

  // List all recipes
  router.get('/marketplace/recipes', async (_request, response) => {
    try {
      const recipes = await recipeService.listRecipes();
      response.json({ ok: true, recipes });
    } catch (error) {
      response.status(500).json({ ok: false, error: error instanceof Error ? error.message : String(error) });
    }
  });

  // Get active installations
  router.get('/marketplace/installations', async (_request, response) => {
    try {
      const installations = await recipeService.getInstallations();
      response.json({ ok: true, installations });
    } catch (error) {
      response.status(500).json({ ok: false, error: error instanceof Error ? error.message : String(error) });
    }
  });

  // Get installation logs for a recipe
  router.get('/marketplace/recipes/:id/logs', async (request, response) => {
    try {
      const logs = await recipeService.getLogs(request.params.id);
      response.json({ ok: true, logs });
    } catch (error) {
      response.status(500).json({ ok: false, error: error instanceof Error ? error.message : String(error) });
    }
  });

  // Install a recipe
  router.post('/marketplace/install', async (request, response) => {
    try {
      const { recipeId, vars } = request.body;
      if (!recipeId) {
        return response.status(400).json({ ok: false, error: 'recipeId is required' });
      }
      const installation = await recipeService.installRecipe(recipeId, vars || {});
      response.json({ ok: true, installation });
    } catch (error) {
      response.status(500).json({ ok: false, error: error instanceof Error ? error.message : String(error) });
    }
  });

  // Uninstall a recipe
  router.delete('/marketplace/install/:id', async (request, response) => {
    try {
      const installation = await recipeService.uninstallRecipe(request.params.id);
      response.json({ ok: true, installation });
    } catch (error) {
      response.status(500).json({ ok: false, error: error instanceof Error ? error.message : String(error) });
    }
  });

  return router;
};
