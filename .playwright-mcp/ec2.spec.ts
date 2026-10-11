import { test, expect } from '@playwright/test';

test.describe('EC2 Native View E2E Tests', () => {
  test('should load the EC2 page and render core elements', async ({ page }) => {
    // Navigate to the dashboard first to ensure the app is loaded, then to EC2
    await page.goto('/');
    await page.waitForSelector('text=Dashboard', { state: 'visible' });

    // Navigate to the new EC2 view
    await page.goto('/ec2');

    // Verify the PageHeader title is correct
    const headerTitle = page.locator('h2', { hasText: 'EC2 INVENTORY' });
    await expect(headerTitle).toBeVisible();

    // Verify the 4 main metric cards are visible
    await expect(page.locator('p', { hasText: 'INSTANCES' })).toBeVisible();
    await expect(page.locator('p', { hasText: 'VPCs' })).toBeVisible();
    await expect(page.locator('p', { hasText: 'SUBNETS' })).toBeVisible();
    await expect(page.locator('p', { hasText: 'SECURITY GROUPS' })).toBeVisible();

    // Verify tabs are visible
    await expect(page.locator('button', { hasText: 'Instances' })).toBeVisible();
    await expect(page.locator('button', { hasText: 'VPCs' })).toBeVisible();
    await expect(page.locator('button', { hasText: 'Subnets' })).toBeVisible();
    await expect(page.locator('button', { hasText: 'Security Groups' })).toBeVisible();
  });
});
