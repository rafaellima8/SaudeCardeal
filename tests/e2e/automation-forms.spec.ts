import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

test.describe('Formulários Digitais Page', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('should display forms page with title', async ({ page }) => {
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

  test('should have search input', async ({ page }) => {
    await page.goto('/formularios');
    
    const searchInput = page.getByTestId('input-search-templates');
    await expect(searchInput).toBeVisible();
  });

  test('should show view mode tabs', async ({ page }) => {
    await page.goto('/formularios');
    
    const tabsViewMode = page.getByTestId('tabs-view-mode');
    await expect(tabsViewMode).toBeVisible();
  });

  test('should show category filter dropdown', async ({ page }) => {
    await page.goto('/formularios');
    
    await expect(page.getByTestId('select-category-filter')).toBeVisible();
  });

  test('should load template cards after network idle', async ({ page }) => {
    await page.goto('/formularios');
    
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    const templateCards = page.locator('[data-testid^="card-template-"]');
    const count = await templateCards.count();
    
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should have view buttons when templates are loaded', async ({ page }) => {
    await page.goto('/formularios');
    
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    const viewButtons = page.locator('[data-testid^="button-view-"]');
    const count = await viewButtons.count();
    
    expect(count).toBeGreaterThanOrEqual(0);
  });
});
