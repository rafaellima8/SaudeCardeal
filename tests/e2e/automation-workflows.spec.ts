import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

test.describe('Workflows Page', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('should display workflows page with title', async ({ page }) => {
    await page.goto('/workflows');
    
    await expect(page.getByTestId('text-page-title')).toBeVisible();
    await expect(page.getByText('Fluxos de Aprovação')).toBeVisible();
  });

  test('should show workflow count badge', async ({ page }) => {
    await page.goto('/workflows');
    
    await expect(page.getByTestId('badge-workflow-count')).toBeVisible();
  });

  test('should show stats cards', async ({ page }) => {
    await page.goto('/workflows');
    
    await expect(page.getByTestId('card-stat-total')).toBeVisible();
    await expect(page.getByTestId('card-stat-pending')).toBeVisible();
    await expect(page.getByTestId('card-stat-approved')).toBeVisible();
  });

  test('should show SINAN workflow card', async ({ page }) => {
    await page.goto('/workflows');
    
    await expect(page.getByTestId('card-workflow-sinan')).toBeVisible();
    await expect(page.getByText('Fluxo SINAN')).toBeVisible();
  });

  test('should show TFD workflow card', async ({ page }) => {
    await page.goto('/workflows');
    
    await expect(page.getByTestId('card-workflow-tfd')).toBeVisible();
    await expect(page.getByText('Fluxo TFD')).toBeVisible();
  });

  test('should show Prescription workflow card', async ({ page }) => {
    await page.goto('/workflows');
    
    await expect(page.getByTestId('card-workflow-prescription')).toBeVisible();
    await expect(page.getByText('Fluxo Prescrição')).toBeVisible();
  });

  test('should show Diaper workflow card', async ({ page }) => {
    await page.goto('/workflows');
    
    await expect(page.getByTestId('card-workflow-diaper')).toBeVisible();
    await expect(page.getByText('Fluxo Fraldas')).toBeVisible();
  });

  test('should display workflow details dialog when clicked', async ({ page }) => {
    await page.goto('/workflows');
    
    const sinanWorkflow = page.getByTestId('card-workflow-sinan');
    await sinanWorkflow.click();
    await expect(page.getByTestId('dialog-definition-title')).toBeVisible();
  });

  test('should have tabs for definitions and instances', async ({ page }) => {
    await page.goto('/workflows');
    
    await expect(page.getByTestId('tabs-workflow')).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Definições de Fluxo' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Instâncias Ativas' })).toBeVisible();
  });
});
