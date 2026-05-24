import { test, expect } from '@playwright/test';

test.describe('Dashboard E2E Tests', () => {
  test('should load the dashboard and check core layout elements', async ({ page }) => {
    // Navigate to local dashboard
    await page.goto('/');

    // Check application title or brand text
    await expect(page.locator('text=FLOCI.IO')).toBeVisible();

    // Check for the "REAL DATA ONLY" policy badge
    await expect(page.locator('text=REAL DATA ONLY')).toBeVisible();

    // Check for "AWS Local Emulation Console" subtitle
    await expect(page.locator('text=AWS Local Emulation Console')).toBeVisible();

    // Verify sidebar elements are present or togglable
    const sidebar = page.locator('nav');
    if (await sidebar.isVisible()) {
      await expect(page.locator('text=Dashboard')).toBeVisible();
      await expect(page.locator('text=Software Marketplace')).toBeVisible();
    }

    // Verify presence of event console / activity stream
    await expect(page.locator('text=Event Stream')).toBeVisible();

    // Verify Capability Matrix Tab exists and is clickable
    const matrixTab = page.locator('button:has-text("AWS Capability Matrix")');
    await expect(matrixTab).toBeVisible();
    await matrixTab.click();

    // Verify Capability Matrix content loads
    await expect(page.locator('text=Total Connected Capabilities')).toBeVisible();
    await expect(page.locator('text=S3 Buckets')).toBeVisible();
    await expect(page.locator('text=Lambda')).toBeVisible();

    // Switch back to System Overview
    const systemTab = page.locator('button:has-text("System Overview")');
    await expect(systemTab).toBeVisible();
    await systemTab.click();
    await expect(page.locator('text=System Overview')).toBeVisible();
  });
});
