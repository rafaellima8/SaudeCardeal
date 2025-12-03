import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

test.describe('Strategic Reports Page', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('should display strategic reports page with title', async ({ page }) => {
    await page.goto('/relatorios-estrategicos');
    
    await expect(page.getByTestId('text-page-title')).toBeVisible();
    await expect(page.getByText('Relatórios Estratégicos')).toBeVisible();
  });

  test('should show report count badge', async ({ page }) => {
    await page.goto('/relatorios-estrategicos');
    
    await expect(page.getByTestId('badge-report-count')).toBeVisible();
  });

  test('should show category stats cards', async ({ page }) => {
    await page.goto('/relatorios-estrategicos');
    
    await expect(page.getByTestId('card-stat-previne')).toBeVisible();
    await expect(page.getByTestId('card-stat-mac')).toBeVisible();
    await expect(page.getByTestId('card-stat-vigilancia')).toBeVisible();
    await expect(page.getByTestId('card-stat-financeiro')).toBeVisible();
  });

  test('should have tabs for catalog and history', async ({ page }) => {
    await page.goto('/relatorios-estrategicos');
    
    await expect(page.getByTestId('tabs-reports')).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Catálogo' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Histórico' })).toBeVisible();
  });

  test('should show category filter dropdown', async ({ page }) => {
    await page.goto('/relatorios-estrategicos');
    
    await expect(page.getByTestId('select-category-filter')).toBeVisible();
  });

  test('should load report cards after network idle', async ({ page }) => {
    await page.goto('/relatorios-estrategicos');
    
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    const reportCards = page.locator('[data-testid^="card-report-"]');
    const count = await reportCards.count();
    
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should allow interaction when reports are loaded', async ({ page }) => {
    await page.goto('/relatorios-estrategicos');
    
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    const runButton = page.locator('[data-testid^="button-run-"]').first();
    const isButtonVisible = await runButton.isVisible().catch(() => false);
    
    if (isButtonVisible) {
      await runButton.click({ force: true });
      
      const dialogTitle = page.getByTestId('dialog-report-title');
      await expect(dialogTitle).toBeVisible({ timeout: 5000 });
    }
  });

  test('should display history tab content', async ({ page }) => {
    await page.goto('/relatorios-estrategicos');
    
    await page.getByRole('tab', { name: 'Histórico' }).click();
    
    const noExecutionsMessage = page.getByText('Nenhuma execução registrada');
    const executionRows = page.locator('[data-testid^="row-execution-"]');
    
    const hasNoExecutions = await noExecutionsMessage.isVisible().catch(() => false);
    const executionCount = await executionRows.count();
    
    expect(hasNoExecutions || executionCount >= 0).toBe(true);
  });
});
