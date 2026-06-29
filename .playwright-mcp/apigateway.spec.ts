import { test, expect } from '@playwright/test';

test.describe('API Gateway E2E Tests', () => {
  test('should load the API Gateway page and display core elements', async ({ page }) => {
    // Navigate to the dashboard and wait for network idle to ensure context is fully loaded
    await page.goto('http://localhost:3000/');
    await page.waitForLoadState('networkidle');

    // Wait for the side navigation to be visible
    await expect(page.locator('nav')).toBeVisible({ timeout: 15000 });

    // Attempt to open the "Networking & Content" accordion menu if the link is not visible
    const linkLocator = page.locator('nav a', { hasText: 'API Gateway' });
    if (!(await linkLocator.isVisible())) {
      const accordionBtn = page.getByRole('button', { name: 'Networking & Content' });
      if (await accordionBtn.isVisible()) {
        await accordionBtn.click();
      }
    }

    await expect(linkLocator).toBeVisible({ timeout: 5000 });
    await linkLocator.click();

    // Verify navigation to the correct URL route
    await expect(page).toHaveURL(/.*\/apigateway/);

    // Verify the page title rendered by PageHeader
    const pageTitle = page.getByRole('heading', { name: /API Gateway/i, level: 2 });
    await expect(pageTitle).toBeVisible();

    // Verify the search input element is present
    const searchInput = page.getByPlaceholder(/FILTER APIS BY NAME OR ID/i);
    await expect(searchInput).toBeVisible();

    // Verify the refresh button exists
    const refreshButton = page.getByRole('button', { name: /Refresh/i });
    await expect(refreshButton).toBeVisible();
    await refreshButton.click();

    // We only want to test the UI components rendering and basic interactions.
    // The state could be empty or have an error depending on the local env.
    const hasData = await page.getByText('TOTAL APIS:').isVisible();
    expect(hasData).toBeTruthy();
  });
});
