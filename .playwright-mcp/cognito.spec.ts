import { test, expect } from '@playwright/test';

test.describe('Cognito E2E Tests', () => {
  test('should load Cognito page and render core layout elements', async ({ page }) => {
    await page.goto('/cognito');

    // Wait for the main elements to render
    await expect(page.locator('h2:has-text("Cognito User Pools")')).toBeVisible();

    // Verify Create Pool section
    await expect(page.locator('h3:has-text("Create User Pool")')).toBeVisible();
    const poolNameInput = page.locator('input[placeholder="e.g., prod-users-pool"]');
    await expect(poolNameInput).toBeVisible();
    const provisionButton = page.locator('button:has-text("Provision Pool")');
    await expect(provisionButton).toBeVisible();
    await expect(provisionButton).toBeDisabled();

    // Verify Active Pools section
    await expect(page.locator('h3:has-text("Active Pools")')).toBeVisible();
  });
});
