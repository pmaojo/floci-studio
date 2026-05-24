import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { buildTestApp } from './testHarness';
import { readdir, readFile } from 'node:fs/promises';

vi.mock('node:fs/promises', async (importOriginal) => {
  const original = await importOriginal<typeof import('node:fs/promises')>();
  return {
    ...original,
    readdir: vi.fn(),
    readFile: vi.fn(),
    writeFile: vi.fn(),
    mkdir: vi.fn(),
  };
});

describe('Transfer Family & IoT Core Emulation Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Transfer Family returns OFFLINE placeholder when stack is not running', async () => {
    // Mock getInstallations to return empty (not running)
    (readFile as any).mockImplementation((filePath: string) => {
      if (filePath.includes('marketplace-installations.json')) {
        return Promise.resolve(JSON.stringify({}));
      }
      return Promise.resolve(JSON.stringify({ resources: {} }));
    });

    const { app } = buildTestApp();
    const response = await request(app).get('/api/aws-services/transfer/overview');

    expect(response.status).toBe(200);
    expect(response.body.serviceKey).toBe('transfer');
    expect(response.body.resources).toHaveLength(1);
    
    const serversResource = response.body.resources.find((r: any) => r.id === 'servers');
    expect(serversResource).toBeDefined();
    expect(serversResource.count).toBe(1);
    expect(serversResource.items[0].ServerId).toBe('s-sftp-emulator-offline');
    expect(serversResource.items[0].State).toContain('OFFLINE');
  });

  it('Transfer Family returns ONLINE details when stack is running', async () => {
    // Mock getInstallations to return running Transfer Stack
    (readFile as any).mockImplementation((filePath: string) => {
      if (filePath.includes('marketplace-installations.json')) {
        return Promise.resolve(JSON.stringify({
          transfer: {
            recipeId: 'transfer',
            status: 'RUNNING',
            installedAt: '2026-05-21T11:00:00.000Z',
            vars: {
              SFTP_PORT: 3333,
              SFTP_USER: 'admin',
              SFTP_PASSWORD: 'securepassword'
            }
          }
        }));
      }
      return Promise.resolve(JSON.stringify({ resources: {} }));
    });

    const { app } = buildTestApp();
    const response = await request(app).get('/api/aws-services/transfer/overview');

    expect(response.status).toBe(200);
    expect(response.body.serviceKey).toBe('transfer');
    
    const serversResource = response.body.resources.find((r: any) => r.id === 'servers');
    expect(serversResource).toBeDefined();
    expect(serversResource.count).toBe(1);
    expect(serversResource.items[0].ServerId).toBe('s-sftp-emulator');
    expect(serversResource.items[0].State).toBe('ONLINE');
    expect(serversResource.items[0].EndpointDetails).toContain('User: admin');
    expect(serversResource.items[0].EndpointDetails).toContain('Port: 3333');
  });

  it('IoT Core returns offline registry devices when broker is not running', async () => {
    // Mock getInstallations to return empty and registered thing
    (readFile as any).mockImplementation((filePath: string) => {
      if (filePath.includes('marketplace-installations.json')) {
        return Promise.resolve(JSON.stringify({}));
      }
      if (filePath.includes('iotcore.json')) {
        return Promise.resolve(JSON.stringify({
          resources: {
            things: [
              {
                id: 'things-my-device',
                name: 'my-device',
                arn: 'arn:aws:iot:us-east-1:000000000000:thing/my-device',
                createdTime: '2026-05-21T10:00:00.000Z'
              }
            ]
          }
        }));
      }
      return Promise.resolve(JSON.stringify({ resources: {} }));
    });

    const { app } = buildTestApp();
    const response = await request(app).get('/api/aws-services/iotcore/overview');

    expect(response.status).toBe(200);
    expect(response.body.serviceKey).toBe('iotcore');

    const thingsResource = response.body.resources.find((r: any) => r.id === 'things');
    expect(thingsResource).toBeDefined();
    expect(thingsResource.count).toBe(1);
    expect(thingsResource.items[0].ThingName).toBe('my-device');
    expect(thingsResource.items[0].Status).toContain('OFFLINE');
    expect(thingsResource.items[0].BrokerAddress).toBe('-');
  });

  it('IoT Core returns online default thing when broker is running and registry is empty', async () => {
    // Mock getInstallations to return running IoT recipe
    (readFile as any).mockImplementation((filePath: string) => {
      if (filePath.includes('marketplace-installations.json')) {
        return Promise.resolve(JSON.stringify({
          iotcore: {
            recipeId: 'iotcore',
            status: 'RUNNING',
            installedAt: '2026-05-21T11:00:00.000Z',
            vars: {
              MQTT_PORT: 1883
            }
          }
        }));
      }
      if (filePath.includes('iotcore.json')) {
        return Promise.resolve(JSON.stringify({ resources: {} }));
      }
      return Promise.resolve(JSON.stringify({ resources: {} }));
    });

    const { app } = buildTestApp();
    const response = await request(app).get('/api/aws-services/iotcore/overview');

    expect(response.status).toBe(200);
    expect(response.body.serviceKey).toBe('iotcore');

    const thingsResource = response.body.resources.find((r: any) => r.id === 'things');
    expect(thingsResource).toBeDefined();
    expect(thingsResource.count).toBe(1);
    expect(thingsResource.items[0].ThingName).toBe('default-floci-device');
    expect(thingsResource.items[0].Status).toBe('ONLINE');
    expect(thingsResource.items[0].BrokerAddress).toBe('localhost:1883');
  });
});
