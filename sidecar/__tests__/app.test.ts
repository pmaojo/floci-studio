import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { config, SIDECAR_TOKEN_HEADER } from '../src/config';
import { buildTestApp } from './testHarness';

describe('sidecar HTTP surface', () => {
  let originalToken: string;
  let originalOrigins: string[];

  beforeEach(() => {
    originalToken = config.token;
    originalOrigins = [...config.allowedOrigins];
  });

  afterEach(() => {
    config.token = originalToken;
    config.allowedOrigins = originalOrigins;
  });

  it('returns /health without requiring a token', async () => {
    const { app } = buildTestApp();
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(response.body).toHaveProperty('endpointUrl');
    expect(response.body).toHaveProperty('region');
    expect(response.body).toHaveProperty('tokenRequired');
  });

  it('rejects /api requests without the configured token', async () => {
    config.token = 's3cr3t';
    const { app } = buildTestApp();
    const response = await request(app).get('/api/aws-services');
    expect(response.status).toBe(401);
    expect(response.body.error).toMatch(/token required/i);
  });

  it('accepts /api requests with the matching token header', async () => {
    config.token = 's3cr3t';
    const { app } = buildTestApp();
    const response = await request(app)
      .get('/api/aws-services')
      .set(SIDECAR_TOKEN_HEADER, 's3cr3t');
    expect(response.status).toBe(200);
    expect(response.body.services).toBeInstanceOf(Array);
  });

  it('accepts /api requests with Bearer-token Authorization header', async () => {
    config.token = 's3cr3t';
    const { app } = buildTestApp();
    const response = await request(app)
      .get('/api/aws-services')
      .set('Authorization', 'Bearer s3cr3t');
    expect(response.status).toBe(200);
  });

  it('echoes Access-Control-Allow-Origin only for allowlisted origins', async () => {
    config.allowedOrigins = ['http://localhost:3000'];
    const { app } = buildTestApp();

    const allowed = await request(app)
      .options('/api/aws-services')
      .set('Origin', 'http://localhost:3000');
    expect(allowed.headers['access-control-allow-origin']).toBe('http://localhost:3000');

    const denied = await request(app)
      .options('/api/aws-services')
      .set('Origin', 'http://evil.example');
    expect(denied.headers['access-control-allow-origin']).toBeUndefined();
  });
});
