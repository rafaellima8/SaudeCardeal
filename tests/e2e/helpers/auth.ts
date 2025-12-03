import { Page } from '@playwright/test';

export async function loginAsAdmin(page: Page) {
  await page.goto('/login');
  await page.getByTestId('input-email').fill('admin@saude.gov.br');
  await page.getByTestId('input-password').fill('Admin@2025');
  await page.getByTestId('button-submit').click();
  await page.waitForURL(/^(?!.*login).*$/, { timeout: 10000 });
}

export async function loginAsACS(page: Page) {
  await page.goto('/login');
  await page.getByTestId('input-email').fill('acs@saude.gov.br');
  await page.getByTestId('input-password').fill('Acs@2025');
  await page.getByTestId('button-submit').click();
  await page.waitForURL(/^(?!.*login).*$/, { timeout: 10000 });
}

export async function loginAsAssistente(page: Page) {
  await page.goto('/login');
  await page.getByTestId('input-email').fill('assistente@saude.gov.br');
  await page.getByTestId('input-password').fill('Assistente@2025');
  await page.getByTestId('button-submit').click();
  await page.waitForURL(/^(?!.*login).*$/, { timeout: 10000 });
}

export async function logout(page: Page) {
  await page.getByTestId('button-logout').click();
  await page.waitForURL('/login');
}
