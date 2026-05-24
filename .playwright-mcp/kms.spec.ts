import { test, expect } from '@playwright/test';

test.describe('KMS Cryptography E2E Tests', () => {
  test('should load KMS page and render core control buttons', async ({ page }) => {
    // Navigate directly to the KMS page
    await page.goto('/kms');

    // Confirm that the page header for KMS is visible
    await expect(page.locator('h2:has-text("KMS / Cryptography")')).toBeVisible();

    // Verify key control buttons in the page header actions area
    const diagnoseButton = page.locator('button:has-text("Diagnose")');
    await expect(diagnoseButton).toBeVisible();

    const amadeusButton = page.locator('button:has-text("Amadeus Alias")');
    await expect(amadeusButton).toBeVisible();

    const generateKeyButton = page.locator('button:has-text("Generate Key")');
    await expect(generateKeyButton).toBeVisible();

    // Check search / filter input field
    const searchFilter = page.locator('input[placeholder="Filter Keys..."]');
    await expect(searchFilter).toBeVisible();
  });
});
