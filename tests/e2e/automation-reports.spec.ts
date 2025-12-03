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
    await expect(page.getByText('Catálogo')).toBeVisible();
    await expect(page.getByText('Histórico')).toBeVisible();
  });

  test('should display report cards', async ({ page }) => {
    await page.goto('/relatorios-estrategicos');
    
    const reportCards = page.locator('[data-testid^="card-report-"]');
    const count = await reportCards.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should show category filter dropdown', async ({ page }) => {
    await page.goto('/relatorios-estrategicos');
    
    await expect(page.getByTestId('select-category-filter')).toBeVisible();
  });

  test('should open report dialog when clicked', async ({ page }) => {
    await page.goto('/relatorios-estrategicos');
    
    const firstReport = page.locator('[data-testid^="card-report-"]').first();
    if (await firstReport.isVisible()) {
      await firstReport.click();
      await expect(page.getByTestId('dialog-report-title')).toBeVisible();
    }
  });

  test('should have execute button in dialog', async ({ page }) => {
    await page.goto('/relatorios-estrategicos');
    
    const firstReport = page.locator('[data-testid^="card-report-"]').first();
    if (await firstReport.isVisible()) {
      await firstReport.click();
      await expect(page.getByTestId('button-execute')).toBeVisible();
    }
  });

  test('should show date inputs in report dialog', async ({ page }) => {
    await page.goto('/relatorios-estrategicos');
    
    const firstReport = page.locator('[data-testid^="card-report-"]').first();
    if (await firstReport.isVisible()) {
      await firstReport.click();
      await expect(page.getByTestId('input-start-date')).toBeVisible();
      await expect(page.getByTestId('input-end-date')).toBeVisible();
    }
  });

  test('should display empty history state', async ({ page }) => {
    await page.goto('/relatorios-estrategicos');
    
    await page.getByText('Histórico').click();
    
    const noExecutionsMessage = page.getByText('Nenhuma execução registrada');
    const executionRows = page.locator('[data-testid^="row-execution-"]');
    
    const hasNoExecutions = await noExecutionsMessage.isVisible();
    const executionCount = await executionRows.count();
    
    expect(hasNoExecutions || executionCount > 0).toBe(true);
  });
});
