import { test, expect } from '@playwright/test';

test.describe('Cognito E2E Tests', () => {
  test('should load Cognito User Pools page and display empty state', async ({ page }) => {
    // Navigate to the Cognito page
    await page.goto('http://localhost:3000/cognito');

    // Wait for the specific page header which is rendered as a h1 or h2, let's just check text globally
    await expect(page.getByText('COGNITO USER POOLS').first()).toBeVisible();

    // Check create pool button exists
    await expect(page.getByRole('button', { name: 'Create Pool' })).toBeVisible();

    // The right pane should have the empty selection message
    await expect(page.getByText('SELECT A USER POOL TO MANAGE USERS')).toBeVisible();
  });
});
