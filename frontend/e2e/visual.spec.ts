import { expect, test, type Page } from '@playwright/test';

const EMAIL = process.env.E2E_EMAIL ?? 'admin@smartsys.local';
const PASSWORD = process.env.E2E_PASSWORD ?? 'Admin123!';

test.use({ reducedMotion: 'reduce' });
test.describe.configure({ mode: 'serial' });
test.skip(
  process.platform !== 'win32' && process.env.VISUAL_CROSS_PLATFORM !== '1',
  'Baselines visuales generados en Windows; habilite VISUAL_CROSS_PLATFORM=1 para regenerarlos.',
);

async function stabilize(page: Page) {
  await page.addStyleTag({
    content:
      '*,*::before,*::after{animation-duration:0s!important;animation-delay:0s!important;transition-duration:0s!important;caret-color:transparent!important}',
  });
  await page.evaluate(() => document.fonts.ready);
}

async function login(page: Page) {
  await page.goto('/login');
  await page.getByPlaceholder('usuario@smartsys.local').fill(EMAIL);
  await page.locator('input[type="password"]').fill(PASSWORD);
  await page.getByRole('button', { name: 'Ingresar al sistema' }).click();
  await expect(page.getByRole('heading', { name: 'Panel general' })).toBeVisible({ timeout: 15_000 });
}

const screenshotOptions = {
  animations: 'disabled' as const,
  maxDiffPixelRatio: 0.015,
  threshold: 0.2,
  maskColor: '#eef2f7',
};

test.describe('Regresión visual', () => {
  test('login estable claro y oscuro', async ({ page }) => {
    await page.goto('/login');
    await stabilize(page);
    await expect(page).toHaveScreenshot('login.png', { ...screenshotOptions, fullPage: true });

    await page.getByRole('button', { name: /Cambiar a tema/ }).click();
    await page.waitForTimeout(350);
    await stabilize(page);
    await expect(page).toHaveScreenshot('login-dark.png', { ...screenshotOptions, fullPage: true });
  });

  test('design system claro y oscuro', async ({ page, request }) => {
    const check = await request.post('/api/v1/auth/login', { data: { email: EMAIL, password: PASSWORD } });
    test.skip(!check.ok(), 'API no disponible para la regresión visual autenticada.');
    await login(page);
    await page.goto('/design-system');
    await expect(page.getByRole('heading', { name: 'SmartSys UI' })).toBeVisible();
    await stabilize(page);
    await expect(page).toHaveScreenshot('design-system-light.png', { ...screenshotOptions, fullPage: true });

    await page.getByRole('button', { name: /Cambiar a tema/ }).click();
    await page.waitForTimeout(250);
    await stabilize(page);
    await expect(page).toHaveScreenshot('design-system-dark.png', { ...screenshotOptions, fullPage: true });
  });

  test('inventario en tabla y tarjetas', async ({ page, request }) => {
    const check = await request.post('/api/v1/auth/login', { data: { email: EMAIL, password: PASSWORD } });
    test.skip(!check.ok(), 'API no disponible para la regresión visual autenticada.');
    await login(page);
    await page.goto('/inventario');
    await expect(page.getByRole('heading', { name: 'Inventario central' })).toBeVisible();
    await page.getByRole('button', { name: 'Tabla' }).click();
    await expect(page.locator('.inventory-table')).toBeVisible();
    await stabilize(page);
    await expect(page.locator('.inventory-table')).toHaveScreenshot('inventory-table.png', screenshotOptions);

    await page.getByRole('button', { name: 'Tarjetas' }).click();
    await expect(page.locator('.inventory-card').first()).toBeVisible();
    await stabilize(page);
    await expect(page.locator('.mod-grid').first()).toHaveScreenshot('inventory-cards.png', screenshotOptions);
  });

  test('login con errores de validación', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: 'Ingresar al sistema' }).click();
    await expect(page.getByText('Ingrese su correo')).toBeVisible();
    await stabilize(page);
    await expect(page).toHaveScreenshot('login-errors.png', { ...screenshotOptions, fullPage: true });
  });

  test('formulario de usuario claro y oscuro', async ({ page, request }) => {
    const check = await request.post('/api/v1/auth/login', { data: { email: EMAIL, password: PASSWORD } });
    test.skip(!check.ok(), 'API no disponible para la regresión visual autenticada.');
    await login(page);
    await page.goto('/usuarios');
    await expect(page.getByRole('heading', { name: 'Usuarios y roles' })).toBeVisible();

    await page.getByRole('button', { name: 'Nuevo usuario' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await stabilize(page);
    await expect(page.getByRole('dialog')).toHaveScreenshot('user-form-light.png', {
      ...screenshotOptions,
      mask: [page.locator('.cu-avatar')],
    });
    await page.getByRole('button', { name: 'Cerrar', exact: true }).click();

    await page.getByRole('button', { name: /Cambiar a tema/ }).click();
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: 'Nuevo usuario' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await stabilize(page);
    await expect(page.getByRole('dialog')).toHaveScreenshot('user-form-dark.png', {
      ...screenshotOptions,
      mask: [page.locator('.cu-avatar')],
    });
  });

  test('auditoría en tarjetas', async ({ page, request }) => {
    const check = await request.post('/api/v1/auth/login', { data: { email: EMAIL, password: PASSWORD } });
    test.skip(!check.ok(), 'API no disponible para la regresión visual autenticada.');
    await login(page);
    await page.goto('/auditoria');
    await expect(page.getByRole('heading', { name: /Auditoría del sistema/ })).toBeVisible();
    await page.getByRole('button', { name: 'Tarjetas' }).click();
    await expect(page.locator('.audit-card').first()).toBeVisible();
    await stabilize(page);
    await expect(page.locator('.audit-grid')).toHaveScreenshot('audit-cards.png', {
      ...screenshotOptions,
      mask: [
        page.locator('.audit-card-date'),
        page.locator('.audit-card-meta'),
      ],
    });
  });

  test('matriz de permisos', async ({ page, request }) => {
    const check = await request.post('/api/v1/auth/login', { data: { email: EMAIL, password: PASSWORD } });
    test.skip(!check.ok(), 'API no disponible para la regresión visual autenticada.');
    await login(page);
    await page.goto('/datos-maestros');
    await expect(page.getByRole('heading', { name: 'Datos maestros' })).toBeVisible();
    await page.getByRole('button', { name: /^Roles\s+\d+$/ }).click();
    await expect(page.getByRole('heading', { name: /Roles del sistema/ })).toBeVisible();
    await page.getByRole('button', { name: 'Permisos' }).first().click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.locator('.permissions-shell')).toBeVisible();
    await stabilize(page);
    await expect(page.locator('.permissions-shell')).toHaveScreenshot('permissions-matrix.png', screenshotOptions);
  });

  test('usuarios en tabla y tarjetas', async ({ page, request }, testInfo) => {
    const check = await request.post('/api/v1/auth/login', { data: { email: EMAIL, password: PASSWORD } });
    test.skip(!check.ok(), 'API no disponible para la regresión visual autenticada.');
    await login(page);
    await page.goto('/usuarios');
    await expect(page.getByRole('heading', { name: 'Usuarios y roles' })).toBeVisible();
    if (testInfo.project.name === 'mobile') {
      await page.getByRole('button', { name: 'Tabla' }).click();
    }
    await expect(page.getByRole('columnheader', { name: /Usuario/ })).toBeVisible();
    await stabilize(page);
    await expect(page.locator('.users-table')).toHaveScreenshot('users-table.png', {
      ...screenshotOptions,
      mask: [
        page.locator('.users-cell-access'),
        page.locator('.users-cell-presence'),
      ],
    });

    await page.getByRole('button', { name: 'Tarjetas' }).click();
    await expect(page.locator('.user-card').first()).toBeVisible();
    await stabilize(page);
    await expect(page.locator('.mod-grid').first()).toHaveScreenshot('users-cards.png', {
      ...screenshotOptions,
      mask: [
        page.locator('.user-card-state'),
        page.locator('.user-card-grid'),
      ],
    });
  });
});
