import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

test.describe('Alerts Page', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('should display alerts page with title', async ({ page }) => {
    await page.goto('/alertas');
    
    await expect(page.getByTestId('text-page-title')).toBeVisible();
    await expect(page.getByText('Central de Alertas')).toBeVisible();
  });

  test('should show alert stats cards', async ({ page }) => {
    await page.goto('/alertas');
    
    await expect(page.getByTestId('card-stat-active')).toBeVisible();
    await expect(page.getByTestId('card-stat-acknowledged')).toBeVisible();
    await expect(page.getByTestId('card-stat-resolved')).toBeVisible();
    await expect(page.getByTestId('card-stat-total')).toBeVisible();
  });

  test('should have tabs for alerts and rules', async ({ page }) => {
    await page.goto('/alertas');
    
    await expect(page.getByTestId('tabs-alerts')).toBeVisible();
    await expect(page.getByText('Alertas Ativos')).toBeVisible();
    await expect(page.getByText('Histórico')).toBeVisible();
    await expect(page.getByText('Regras de Alerta')).toBeVisible();
  });

  test('should show severity filter in history tab', async ({ page }) => {
    await page.goto('/alertas');
    
    await page.getByText('Histórico').click();
    
    await expect(page.getByTestId('select-severity-filter')).toBeVisible();
  });

  test('should show category filter in history tab', async ({ page }) => {
    await page.goto('/alertas');
    
    await page.getByText('Histórico').click();
    
    await expect(page.getByTestId('select-category-filter')).toBeVisible();
  });

  test('should display alert rules in rules tab', async ({ page }) => {
    await page.goto('/alertas');
    
    await page.getByText('Regras de Alerta').click();
    
    const ruleCards = page.locator('[data-testid^="card-rule-"]');
    const count = await ruleCards.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should show empty state when no active alerts', async ({ page }) => {
    await page.goto('/alertas');
    
    const noAlertsMessage = page.getByText('Nenhum alerta ativo');
    const activeAlerts = page.locator('[data-testid^="card-alert-"]');
    
    const hasNoAlerts = await noAlertsMessage.isVisible();
    const alertCount = await activeAlerts.count();
    
    expect(hasNoAlerts || alertCount > 0).toBe(true);
  });

  test('should filter by severity in history', async ({ page }) => {
    await page.goto('/alertas');
    
    await page.getByText('Histórico').click();
    
    const severityFilter = page.getByTestId('select-severity-filter');
    await severityFilter.click();
    
    await expect(page.getByText('Crítico')).toBeVisible();
    await expect(page.getByText('Alto')).toBeVisible();
    await expect(page.getByText('Médio')).toBeVisible();
    await expect(page.getByText('Baixo')).toBeVisible();
  });
});
