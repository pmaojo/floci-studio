import { test, expect } from '@playwright/test';

test.describe('API Gateway E2E Tests', () => {
  test('should load API Gateway page and render core control buttons', async ({ page }) => {
    await page.goto('/apigateway');

    // Verifica que se carga el header
    const header = page.locator('h2', { hasText: 'API Gateway' });
    await expect(header).toBeVisible();

    // Verifica que el botón de crear API existe
    const createButton = page.locator('button', { hasText: 'Create REST API' });
    await expect(createButton).toBeVisible();

    // Verifica que se muestre el empty state o alguna API (esperar carga)
    const emptyState = page.locator('h3', { hasText: 'No REST APIs' });
    const createButtonEmpty = page.locator('button', { hasText: 'Create API' });

    // Esperamos a que la página se haya cargado verificando que Skeleton ya no está
    // Observamos un texto específico o al boton de 'Create API' o 'No REST APIs'

    // Verificamos si existe el empty state o una card de api
    const hasEmptyState = await emptyState.isVisible();
    if (hasEmptyState) {
        await expect(createButtonEmpty).toBeVisible();
    } else {
        const apiCard = page.locator('h3').nth(1); // El primero es "API Gateway"
        await expect(apiCard).toBeVisible();
    }
  });
});
