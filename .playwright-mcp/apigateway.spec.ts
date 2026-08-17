import { test, expect } from '@playwright/test';

test.describe('API Gateway Native View Tests', () => {
  test('should load the API Gateway page and display the empty state correctly', async ({ page }) => {
    // 1. Navegar a la vista de API Gateway
    await page.goto('http://localhost:3000/apigateway');

    // 2. Esperar que el título se renderice
    await expect(page.getByText('API Gateway', { exact: true })).toBeVisible();

    // 3. Comprobar que existe la barra lateral (REST APIs)
    const sidebarHeading = page.locator('aside').getByText('REST APIs');
    await expect(sidebarHeading).toBeVisible();

    // 4. Comprobar que en el lado derecho aparece el mensaje de invitación
    await expect(page.getByText('Select an API from the list to inspect its resources and methods.')).toBeVisible();
  });
});
