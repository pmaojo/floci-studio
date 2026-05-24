import { mkdir, readFile, writeFile, readdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { config } from '../config';

export interface RecipeVariable {
  key: string;
  label: string;
  type: 'text' | 'number' | 'password';
  default: string | number;
  description: string;
}

export interface Recipe {
  id: string;
  name: string;
  description: string;
  version: string;
  variables: RecipeVariable[];
  accessUrl?: string;
}

export interface Installation {
  recipeId: string;
  status: 'IDLE' | 'INSTALLING' | 'RUNNING' | 'FAILED' | 'UNINSTALLING';
  installedAt?: string;
  vars?: Record<string, any>;
  error?: string | null;
}

export class RecipeService {
  private readonly stateFilePath: string;
  private readonly recipesDirPath: string;
  private logMap: Map<string, string[]> = new Map();

  constructor() {
    this.stateFilePath = path.resolve(config.stateDir, 'marketplace-installations.json');
    this.recipesDirPath = path.resolve(process.cwd(), 'recipes');
  }

  // List all available recipes by scanning the recipes/ directory
  async listRecipes(): Promise<Recipe[]> {
    const recipes: Recipe[] = [];
    try {
      const dirs = await readdir(this.recipesDirPath, { withFileTypes: true });
      for (const dir of dirs) {
        if (dir.isDirectory()) {
          const recipeJsonPath = path.join(this.recipesDirPath, dir.name, 'recipe.json');
          try {
            const content = await readFile(recipeJsonPath, 'utf8');
            recipes.push(JSON.parse(content));
          } catch {
            // Skip invalid recipes
          }
        }
      }
    } catch {
      // recipes folder doesn't exist yet, return empty
    }
    return recipes;
  }

  // Get active installation records
  async getInstallations(): Promise<Record<string, Installation>> {
    try {
      const content = await readFile(this.stateFilePath, 'utf8');
      return JSON.parse(content);
    } catch {
      return {};
    }
  }

  // Get live installation logs
  async getLogs(recipeId: string): Promise<string[]> {
    return this.logMap.get(recipeId) || [];
  }

  // Save installation state
  private async saveInstallationState(recipeId: string, inst: Installation): Promise<void> {
    const state = await this.getInstallations();
    if (inst.status === 'IDLE') {
      delete state[recipeId];
    } else {
      state[recipeId] = inst;
    }
    await mkdir(path.dirname(this.stateFilePath), { recursive: true });
    await writeFile(this.stateFilePath, JSON.stringify(state, null, 2), 'utf8');
  }

  // Install a marketplace recipe using Docker Compose
  async installRecipe(recipeId: string, vars: Record<string, any>): Promise<Installation> {
    if (!recipeId || !/^[a-z0-9-]+$/.test(recipeId)) {
      throw new Error('Invalid recipe ID format');
    }

    const recipes = await this.listRecipes();
    const recipe = recipes.find(r => r.id === recipeId);
    if (!recipe) {
      throw new Error(`Recipe ${recipeId} not found`);
    }

    // Filter variables to only declared ones and map to strings, falling back to default
    const safeVars: Record<string, string> = {};
    for (const v of recipe.variables) {
      const val = vars && vars[v.key] !== undefined ? vars[v.key] : v.default;
      safeVars[v.key] = String(val);
    }

    const inst: Installation = {
      recipeId,
      status: 'INSTALLING',
      vars: safeVars,
      error: null
    };

    await this.saveInstallationState(recipeId, inst);
    this.logMap.set(recipeId, [`[SYSTEM] Starting installation for ${recipe.name}...`]);

    const composeFile = path.join(this.recipesDirPath, recipeId, 'docker-compose.yml');

    const processVars = {
      ...process.env,
      ...safeVars
    };

    const cmd = spawn('docker', ['compose', '-f', composeFile, 'up', '-d'], {
      env: processVars,
      cwd: path.dirname(composeFile),
      shell: false
    });

    cmd.stdout.on('data', (data) => {
      const lines = data.toString().split('\n').filter(Boolean);
      const logs = this.logMap.get(recipeId) || [];
      logs.push(...lines);
      this.logMap.set(recipeId, logs);
    });

    cmd.stderr.on('data', (data) => {
      const lines = data.toString().split('\n').filter(Boolean);
      const logs = this.logMap.get(recipeId) || [];
      logs.push(...lines);
      this.logMap.set(recipeId, logs);
    });

    cmd.on('close', async (code) => {
      const logs = this.logMap.get(recipeId) || [];
      if (code === 0) {
        logs.push('[SYSTEM] Docker compose deployment finished successfully!');
        inst.status = 'RUNNING';
        inst.installedAt = new Date().toISOString();
      } else {
        logs.push(`[SYSTEM] Installation failed with exit code ${code}`);
        inst.status = 'FAILED';
        inst.error = `Docker compose exited with code ${code}`;
      }
      this.logMap.set(recipeId, logs);
      await this.saveInstallationState(recipeId, inst);
    });

    return inst;
  }

  // Uninstall a marketplace recipe
  async uninstallRecipe(recipeId: string): Promise<Installation> {
    if (!recipeId || !/^[a-z0-9-]+$/.test(recipeId)) {
      throw new Error('Invalid recipe ID format');
    }

    const recipes = await this.listRecipes();
    const recipe = recipes.find(r => r.id === recipeId);
    if (!recipe) {
      throw new Error(`Recipe ${recipeId} not found`);
    }

    const inst: Installation = {
      recipeId,
      status: 'UNINSTALLING',
      error: null
    };

    await this.saveInstallationState(recipeId, inst);
    this.logMap.set(recipeId, [`[SYSTEM] Stopping and removing containers for ${recipeId}...`]);

    const composeFile = path.join(this.recipesDirPath, recipeId, 'docker-compose.yml');

    const cmd = spawn('docker', ['compose', '-f', composeFile, 'down', '-v'], {
      env: process.env,
      cwd: path.dirname(composeFile),
      shell: false
    });

    cmd.stdout.on('data', (data) => {
      const lines = data.toString().split('\n').filter(Boolean);
      const logs = this.logMap.get(recipeId) || [];
      logs.push(...lines);
      this.logMap.set(recipeId, logs);
    });

    cmd.stderr.on('data', (data) => {
      const lines = data.toString().split('\n').filter(Boolean);
      const logs = this.logMap.get(recipeId) || [];
      logs.push(...lines);
      this.logMap.set(recipeId, logs);
    });

    cmd.on('close', async (code) => {
      const logs = this.logMap.get(recipeId) || [];
      if (code === 0) {
        logs.push('[SYSTEM] Teardown finished successfully.');
        inst.status = 'IDLE';
      } else {
        logs.push(`[SYSTEM] Teardown failed with exit code ${code}`);
        inst.status = 'FAILED';
        inst.error = `Docker compose down exited with code ${code}`;
      }
      this.logMap.set(recipeId, logs);
      await this.saveInstallationState(recipeId, inst);
    });

    return inst;
  }
}
