import { test, expect } from '@playwright/test';

test.describe('Data Seeder E2E Tests', () => {
  test('should load the data seeder and show correct options', async ({ page }) => {
    // Navigate to local seeder
    await page.goto('/seeder');

    // Check application title or brand text
    await expect(page.locator('text=Visual Data Seeder')).toBeVisible();

    // Check for the configuration card
    await expect(page.locator('text=Configuration')).toBeVisible();

    // Check target options
    await expect(page.locator('select').first()).toHaveValue('postgres');

    // Switch to DynamoDB
    await page.locator('select').first().selectOption('dynamodb');

    // Verify connection string is hidden for DynamoDB
    await expect(page.locator('text=Connection String')).not.toBeVisible();

    // Switch back to Postgres
    await page.locator('select').first().selectOption('postgres');

    // Verify connection string is shown for Postgres
    await expect(page.locator('text=Connection String')).toBeVisible();
  });
});
