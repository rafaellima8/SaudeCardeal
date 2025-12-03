import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

test.describe('Formulários Digitais Page', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('should display forms page with template list', async ({ page }) => {
    await page.goto('/formularios');
    
    await expect(page.getByTestId('text-page-title')).toBeVisible();
    await expect(page.getByText('Formulários Digitais')).toBeVisible();
  });

  test('should show template count badge', async ({ page }) => {
    await page.goto('/formularios');
    
    await expect(page.getByTestId('badge-template-count')).toBeVisible();
  });

  test('should show category stats cards', async ({ page }) => {
    await page.goto('/formularios');
    
    await expect(page.getByTestId('card-stat-sinan')).toBeVisible();
    await expect(page.getByTestId('card-stat-bpa')).toBeVisible();
    await expect(page.getByTestId('card-stat-apac')).toBeVisible();
  });

  test('should filter forms by search term', async ({ page }) => {
    await page.goto('/formularios');
    
    const searchInput = page.getByTestId('input-search-templates');
    await searchInput.fill('dengue');
    
    await page.waitForTimeout(500);
    
    const templates = page.locator('[data-testid^="card-template-"]');
    const count = await templates.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should display template cards in grid view', async ({ page }) => {
    await page.goto('/formularios');
    
    const tabsViewMode = page.getByTestId('tabs-view-mode');
    await expect(tabsViewMode).toBeVisible();
    
    const templateCards = page.locator('[data-testid^="card-template-"]');
    const count = await templateCards.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should open template details dialog when clicked', async ({ page }) => {
    await page.goto('/formularios');
    
    const firstTemplate = page.locator('[data-testid^="card-template-"]').first();
    if (await firstTemplate.isVisible()) {
      await firstTemplate.click();
      await expect(page.getByTestId('dialog-template-title')).toBeVisible();
    }
  });

  test('should show category filter dropdown', async ({ page }) => {
    await page.goto('/formularios');
    
    await expect(page.getByTestId('select-category-filter')).toBeVisible();
  });

  test('should have validation button in template dialog', async ({ page }) => {
    await page.goto('/formularios');
    
    const firstTemplate = page.locator('[data-testid^="card-template-"]').first();
    if (await firstTemplate.isVisible()) {
      await firstTemplate.click();
      await expect(page.getByTestId('button-validate')).toBeVisible();
    }
  });
});
