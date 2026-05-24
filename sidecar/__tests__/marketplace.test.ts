import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { readdir, readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { buildTestApp } from './testHarness';

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

vi.mock('node:child_process', () => {
  return {
    spawn: vi.fn(),
  };
});

describe('Marketplace Router & RecipeService', () => {
  const mockRecipe = {
    id: 'test-recipe',
    name: 'Test Recipe',
    description: 'A recipe for testing purposes',
    version: '1.0.0',
    variables: [
      {
        key: 'PORT',
        label: 'App Port',
        type: 'number',
        default: 8080,
        description: 'Testing port',
      },
    ],
    accessUrl: 'http://localhost:{{PORT}}',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists available recipes from the filesystem', async () => {
    const mockDirents = [
      { isDirectory: () => true, name: 'test-recipe' },
      { isDirectory: () => false, name: 'random-file.txt' },
    ];
    (readdir as any).mockImplementation(() => Promise.resolve(mockDirents));
    (readFile as any).mockImplementation(() => Promise.resolve(JSON.stringify(mockRecipe)));

    const { app } = buildTestApp();

    const response = await request(app).get('/api/marketplace/recipes');

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(response.body.recipes).toHaveLength(1);
    expect(response.body.recipes[0].id).toBe('test-recipe');
  });

  it('returns empty list if recipes folder is empty or readdir fails', async () => {
    (readdir as any).mockImplementation(() => Promise.reject(new Error('ENOENT')));

    const { app } = buildTestApp();
    const response = await request(app).get('/api/marketplace/recipes');

    expect(response.status).toBe(200);
    expect(response.body.recipes).toEqual([]);
  });

  it('returns 500/error on install with an unknown recipe', async () => {
    (readdir as any).mockImplementation(() => Promise.resolve([]));

    const { app } = buildTestApp();
    const response = await request(app)
      .post('/api/marketplace/install')
      .send({ recipeId: 'unknown-recipe', vars: {} });

    expect(response.status).toBe(500);
    expect(response.body.ok).toBe(false);
    expect(response.body.error).toContain('not found');
  });

  it('returns 400 when recipeId is missing from POST install body', async () => {
    const { app } = buildTestApp();
    const response = await request(app)
      .post('/api/marketplace/install')
      .send({ vars: {} });

    expect(response.status).toBe(400);
    expect(response.body.ok).toBe(false);
    expect(response.body.error).toContain('recipeId is required');
  });

  it('successfully starts a recipe installation by spawning docker process', async () => {
    // 1. Mock listing the recipes
    const mockDirents = [{ isDirectory: () => true, name: 'test-recipe' }];
    (readdir as any).mockImplementation(() => Promise.resolve(mockDirents));
    (readFile as any).mockImplementation(async (filePath: any) => {
      if (String(filePath).includes('recipe.json')) {
        return JSON.stringify(mockRecipe);
      }
      if (String(filePath).includes('marketplace-installations.json')) {
        return '{}';
      }
      throw new Error('File not found');
    });

    // 2. Mock child_process spawn
    const mockProcess = {
      stdout: { on: vi.fn() },
      stderr: { on: vi.fn() },
      on: vi.fn(),
    };
    (spawn as any).mockReturnValue(mockProcess);

    const { app } = buildTestApp();

    const response = await request(app)
      .post('/api/marketplace/install')
      .send({ recipeId: 'test-recipe', vars: { PORT: 9000 } });

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(response.body.installation.recipeId).toBe('test-recipe');
    expect(response.body.installation.status).toBe('INSTALLING');
    expect(response.body.installation.vars).toEqual({ PORT: '9000' });

    // Assert docker compose spawn details
    expect(spawn).toHaveBeenCalledTimes(1);
    const spawnArgs = (spawn as any).mock.calls[0];
    expect(spawnArgs[0]).toBe('docker');
    expect(spawnArgs[1]).toContain('compose');
    expect(spawnArgs[1]).toContain('up');
    expect(spawnArgs[2]?.shell).toBe(false);
    expect(spawnArgs[2]?.env?.PORT).toBe('9000');
  });
});
