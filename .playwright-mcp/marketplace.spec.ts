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
    await expect(page.locator('text=Redis Cache & Broker')).toBeVisible();
    await expect(page.locator('text=RabbitMQ Broker')).toBeVisible();
    await expect(page.locator('text=PostgreSQL Database')).toBeVisible();

    // Locate the "Launch App" button for Redis
    const redisCard = page.locator('div:has-text("Redis Cache & Broker")').last();
    const launchButton = redisCard.locator('button:has-text("Launch App")');
    await expect(launchButton).toBeVisible();

    // Open configuration drawer modal
    await launchButton.click();

    // Verify configuration modal titles and controls
    await expect(page.locator('text=Deploy Redis Cache & Broker')).toBeVisible();
    await expect(page.locator('text=Configure las variables de entorno iniciales')).toBeVisible();

    // Check variables default inputs
    await expect(page.locator('label:has-text("Redis Host Port")')).toBeVisible();
    await expect(page.locator('label:has-text("Access Password")')).toBeVisible();

    // Close configuration drawer using the cancel button
    const cancelButton = page.locator('button:has-text("Cancel")');
    await expect(cancelButton).toBeVisible();
    await cancelButton.click();

    // Check modal has closed
    await expect(page.locator('text=Deploy Redis Cache & Broker')).not.toBeVisible();
  });
});
