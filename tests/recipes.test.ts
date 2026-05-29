import { describe, it, expect } from 'vitest';
import { readdirSync, statSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Marketplace recipe integrity tests.
 *
 * These guard the contract the backend RecipeService and the MarketplaceView UI
 * rely on: every recipe folder must expose a valid recipe.json, a docker-compose.yml
 * that Docker Compose can actually interpolate (i.e. uses ${VAR}, never {{VAR}}),
 * and a README. They also catch the class of bug where recipe.json variable keys
 * drift away from the placeholders used in the compose file / accessUrl.
 */

const RECIPES_DIR = join(process.cwd(), 'recipes');

const recipeDirs = readdirSync(RECIPES_DIR).filter((entry) =>
  statSync(join(RECIPES_DIR, entry)).isDirectory()
);

const ID_PATTERN = /^[a-z0-9-]+$/;
const VALID_TYPES = new Set(['text', 'password', 'number']);

describe('marketplace recipes', () => {
  it('has at least one recipe', () => {
    expect(recipeDirs.length).toBeGreaterThan(0);
  });

  for (const dir of recipeDirs) {
    describe(`recipe: ${dir}`, () => {
      const recipePath = join(RECIPES_DIR, dir, 'recipe.json');
      const composePath = join(RECIPES_DIR, dir, 'docker-compose.yml');

      it('ships a recipe.json, docker-compose.yml and README.md', () => {
        expect(existsSync(recipePath), `${dir}/recipe.json missing`).toBe(true);
        expect(existsSync(composePath), `${dir}/docker-compose.yml missing`).toBe(true);
        expect(existsSync(join(RECIPES_DIR, dir, 'README.md')), `${dir}/README.md missing`).toBe(true);
      });

      it('has a recipe.json whose id matches the folder and is well-formed', () => {
        const recipe = JSON.parse(readFileSync(recipePath, 'utf-8'));
        expect(recipe.id, `${dir} id`).toBe(dir);
        expect(ID_PATTERN.test(recipe.id), `${dir} id format`).toBe(true);
        expect(typeof recipe.name).toBe('string');
        expect(recipe.name.length).toBeGreaterThan(0);
        expect(typeof recipe.version).toBe('string');
        expect(Array.isArray(recipe.variables)).toBe(true);

        for (const v of recipe.variables) {
          expect(typeof v.key, `${dir} variable key`).toBe('string');
          expect(ID_PATTERN.test(v.key.toLowerCase()) || /^[A-Z0-9_]+$/.test(v.key)).toBe(true);
          expect(typeof v.label).toBe('string');
          expect(VALID_TYPES.has(v.type), `${dir} variable ${v.key} type=${v.type}`).toBe(true);
          expect(v.default, `${dir} variable ${v.key} default`).toBeDefined();
          expect(typeof v.description).toBe('string');
        }
      });

      it('uses ${VAR} interpolation, never {{VAR}}, in docker-compose.yml', () => {
        const compose = readFileSync(composePath, 'utf-8');
        expect(compose.includes('{{'), `${dir} compose still uses mustache {{ }} placeholders`).toBe(false);
        expect(/^version:/m.test(compose), `${dir} compose has obsolete version: attribute`).toBe(false);
      });

      it('declares every {{VAR}} used in accessUrl as a variable', () => {
        const recipe = JSON.parse(readFileSync(recipePath, 'utf-8'));
        const declared = new Set(recipe.variables.map((v: { key: string }) => v.key));
        const accessUrl: string = recipe.accessUrl ?? '';
        const placeholders = [...accessUrl.matchAll(/\{\{\s*([A-Z0-9_]+)\s*\}\}/g)].map((m) => m[1]);
        for (const key of placeholders) {
          expect(declared.has(key), `${dir} accessUrl uses {{${key}}} not declared in variables`).toBe(true);
        }
      });

      it('references each declared variable somewhere in the compose file or accessUrl', () => {
        const recipe = JSON.parse(readFileSync(recipePath, 'utf-8'));
        const compose = readFileSync(composePath, 'utf-8');
        const accessUrl: string = recipe.accessUrl ?? '';
        for (const v of recipe.variables) {
          const usedInCompose = compose.includes(`\${${v.key}`);
          const usedInUrl = accessUrl.includes(`{{${v.key}}}`) || accessUrl.includes(`{{ ${v.key} }}`);
          expect(
            usedInCompose || usedInUrl,
            `${dir} declares variable ${v.key} but never uses it in compose or accessUrl`
          ).toBe(true);
        }
      });
    });
  }
});
