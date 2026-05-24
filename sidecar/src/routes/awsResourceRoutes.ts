import { Router } from 'express';
import { AwsResourceService } from '../application/awsResourceService';
import { CompatibilityService } from '../application/compatibilityService';

export const createAwsResourceRouter = (
  awsResourceService: AwsResourceService,
  compatibilityService: CompatibilityService,
) => {
  const router = Router();

  router.get('/aws-services', (_request, response) => {
    response.json({ services: awsResourceService.listServices() });
  });

  router.get('/aws-services/:serviceKey/overview', async (request, response) => {
    try {
      response.json(await awsResourceService.getOverview(request.params.serviceKey));
    } catch (error: any) {
      response.status(error.statusCode || 500).json({
        error: error.message || 'Failed to read AWS service overview',
      });
    }
  });

  router.post('/aws-services/codeartifact/domains', async (request, response) => {
    try {
      response.json(await compatibilityService.createCodeArtifactDomain(String(request.body?.name || '')));
    } catch (error: any) {
      response.status(400).json({ error: error.message || 'Failed to create CodeArtifact domain' });
    }
  });

  router.post('/aws-services/codeartifact/repositories', async (request, response) => {
    try {
      response.json(await compatibilityService.createCodeArtifactRepository(
        String(request.body?.domainName || ''),
        String(request.body?.repositoryName || ''),
      ));
    } catch (error: any) {
      response.status(400).json({ error: error.message || 'Failed to create CodeArtifact repository' });
    }
  });

  router.delete('/aws-services/codeartifact/repositories/:domainName/:repositoryName', async (request, response) => {
    try {
      response.json(await compatibilityService.deleteCodeArtifactRepository(
        request.params.domainName,
        request.params.repositoryName,
      ));
    } catch (error: any) {
      response.status(400).json({ error: error.message || 'Failed to delete CodeArtifact repository' });
    }
  });

  router.post('/aws-services/:serviceKey/resources/:resourceId', async (request, response) => {
    try {
      response.json(await compatibilityService.createGenericResource(
        request.params.serviceKey,
        request.params.resourceId,
        String(request.body?.name || ''),
      ));
    } catch (error: any) {
      response.status(400).json({ error: error.message || 'Failed to create compatibility resource' });
    }
  });

  router.delete('/aws-services/:serviceKey/resources/:resourceId/:name', async (request, response) => {
    try {
      response.json(await compatibilityService.deleteGenericResource(
        request.params.serviceKey,
        request.params.resourceId,
        request.params.name,
      ));
    } catch (error: any) {
      response.status(400).json({ error: error.message || 'Failed to delete compatibility resource' });
    }
  });

  return router;
};
