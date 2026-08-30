import { test, expect } from '@playwright/test';

test.describe('API Gateway Native View E2E Tests', () => {
  test('should load API Gateway page and display correct title', async ({ page }) => {
    await page.goto('/apigateway');
    await expect(page.locator('h2')).toContainText('API Gateway (REST APIs)');
  });
});
