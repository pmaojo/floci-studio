import { test, expect } from '@playwright/test';

test.describe('CloudWatch Logs E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to CloudWatch Logs page
    await page.goto('http://localhost:3000/cloudwatch');
  });

  test('should load the CloudWatch Logs view and check search group components', async ({ page }) => {
    // Verify header exists
    await expect(page.locator('text=CloudWatch Logs').first()).toBeVisible();

    // Verify Log Groups section
    await expect(page.locator('text=LOG_GROUPS').first()).toBeVisible();

    // The search input should be present but disabled initially
    const searchInput = page.locator('input[placeholder*="Select a group to search"]');
    await expect(searchInput).toBeVisible();
    await expect(searchInput).toBeDisabled();

    const searchBtn = page.locator('button', { hasText: 'Search Group' });
    await expect(searchBtn).toBeVisible();
    await expect(searchBtn).toBeDisabled();
  });
});
