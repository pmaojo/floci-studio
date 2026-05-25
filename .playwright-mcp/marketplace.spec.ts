import { test, expect } from '@playwright/test';

test.describe('Software Marketplace E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigates directly to the marketplace
    await page.goto('/marketplace');
  });

  test('should load recipes and handle launcher configuration modal', async ({ page }) => {
    // Assert the page header is visible
    await expect(page.locator('h2:has-text("Software Marketplace")')).toBeVisible();

    // Verify key elements like the catalog description and list of items
    const recipeCards = page.locator('div.grid > div');
    await expect(recipeCards.first()).toBeVisible();

    // We should be able to find the newly added recipes in the cards list
    await expect(page.locator('text=Redis Cache & Broker').first()).toBeVisible();
    await expect(page.locator('text=RabbitMQ Broker').first()).toBeVisible();
    await expect(page.locator('text=PostgreSQL Database').first()).toBeVisible();

    // Locate the "Launch App" button for Redis
    const launchButton = page.locator('button:has-text("Launch App")').first();
    await expect(launchButton).toBeVisible();

    // Open configuration drawer modal
    await launchButton.click();

    // Verify configuration modal titles and controls
    await expect(page.locator('text=Deploy').first()).toBeVisible();
    await expect(page.locator('text=Configure las variables de entorno iniciales')).toBeVisible();

    // Close configuration drawer using the cancel button
    const cancelButton = page.locator('button:has-text("Cancel")');
    await expect(cancelButton).toBeVisible();
    await cancelButton.click();
  });
});
