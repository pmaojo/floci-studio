import { test, expect } from '@playwright/test';

test.describe('API Gateway Native View E2E Tests', () => {
  test('should load the API Gateway page and render V1 and V2 sections', async ({ page }) => {
    await page.goto('http://localhost:3000/apigateway');

    // Wait for the view to load
    await expect(page.locator('h2:has-text("API Gateway")')).toBeVisible();

    // Verify sections are present
    await expect(page.locator('text=REST APIs (V1)')).toBeVisible();
    await expect(page.locator('text=HTTP / WebSocket APIs (V2)')).toBeVisible();

    // Check refresh button
    const refreshButton = page.locator('button:has-text("Refresh")');
    await expect(refreshButton).toBeVisible();
  });
});
