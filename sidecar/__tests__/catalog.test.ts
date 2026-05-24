import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { awsResourceCatalog } from '../src/application/awsResourceCatalog';
import { buildTestApp } from './testHarness';

const catalogEntries = Object.entries(awsResourceCatalog);

describe('AWS resource catalog overview shape', () => {
  it.each(catalogEntries)('GET /api/aws-services/%s/overview returns a well-formed payload', async (serviceKey, definition) => {
    const responder = (args: string[]) => {
      // Return shapes that look reasonable for the resultPath used by the catalog.
      // Most AWS list responses are objects whose payload sits under a top-level key.
      // We return an empty array under a likely candidate so the service normaliser
      // produces count=0 with a clean OK status.
      const subcommand = `${args[0]} ${args[1]}`;
      return { __subcommand: subcommand };
    };

    const { app } = buildTestApp(responder);
    const response = await request(app).get(`/api/aws-services/${serviceKey}/overview`);

    expect(response.status, `service ${serviceKey} should respond 200, body=${JSON.stringify(response.body)}`).toBe(200);
    expect(response.body.serviceKey).toBe(serviceKey);
    expect(typeof response.body.serviceName).toBe('string');
    expect(typeof response.body.description).toBe('string');
    expect(response.body.resources).toBeInstanceOf(Array);

    // When the catalog has zero native resources, the compatibility shim takes over
    // and substitutes its own service description. For everything else, the catalog
    // description and name are authoritative.
    const servedFromCompat = response.body.source === 'sidecar-compat';
    if (!servedFromCompat) {
      expect(response.body.serviceName).toBe(definition.serviceName);
      expect(response.body.description).toBe(definition.description);
    }

    // Each resource entry must include the catalog identifiers and a status from the contract.
    const validStatuses = new Set(['ok', 'unsupported', 'error']);
    for (const resource of response.body.resources) {
      expect(resource).toHaveProperty('id');
      expect(resource).toHaveProperty('label');
      expect(resource).toHaveProperty('status');
      expect(validStatuses.has(resource.status)).toBe(true);
      expect(resource).toHaveProperty('count');
      expect(resource).toHaveProperty('items');
      expect(resource.items).toBeInstanceOf(Array);
    }

    // The catalog declares N resources; the overview must surface one of:
    //   - same count from native AWS CLI calls, or
    //   - a compatibility-service shim when canHandle(serviceKey).
    // Either way, every catalog-declared resource id should appear in the response.
    const responseIds = new Set(response.body.resources.map((resource: { id: string }) => resource.id));
    for (const declared of definition.resources) {
      expect(responseIds.has(declared.id), `missing resource ${declared.id} in ${serviceKey}`).toBe(true);
    }
  });

  it('GET /api/aws-services returns the catalog summary', async () => {
    const { app } = buildTestApp();
    const response = await request(app).get('/api/aws-services');
    expect(response.status).toBe(200);
    expect(response.body.services).toBeInstanceOf(Array);
    expect(response.body.services.length).toBe(catalogEntries.length);
    for (const summary of response.body.services) {
      expect(summary).toHaveProperty('key');
      expect(summary).toHaveProperty('serviceName');
      expect(summary).toHaveProperty('description');
      expect(summary.resources).toBeInstanceOf(Array);
    }
  });

  it('returns 404 for an unknown service key', async () => {
    const { app } = buildTestApp();
    const response = await request(app).get('/api/aws-services/not-a-service/overview');
    expect(response.status).toBe(404);
  });
});
