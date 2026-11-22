import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const EMAIL = process.env.E2E_EMAIL ?? 'admin@smartsys.local';
const PASSWORD = process.env.E2E_PASSWORD ?? 'Admin123!';

async function violations(page: Page) {
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  return result.violations;
}

async function login(page: Page) {
  await page.goto('/login');
  await page.getByPlaceholder('usuario@smartsys.local').fill(EMAIL);
  await page.locator('input[type="password"]').fill(PASSWORD);
  await page.getByRole('button', { name: 'Ingresar al sistema' }).click();
  await expect(page.getByRole('heading', { name: 'Panel general' })).toBeVisible({ timeout: 15_000 });
}

test.use({ reducedMotion: 'reduce' });

test.describe('Accesibilidad WCAG 2.1 AA', () => {
  test('login sin violaciones', async ({ page }) => {
    await page.goto('/login');
    await page.waitForTimeout(500);
    expect(await violations(page)).toEqual([]);
    await expect(page.getByRole('heading', { name: 'Iniciar sesión' })).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Correo corporativo' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Mostrar contraseña' })).toBeVisible();
  });

  test('panel general claro y oscuro sin violaciones', async ({ page }) => {
    test.slow();
    await login(page);
    await page.waitForTimeout(500);
    expect(await violations(page)).toEqual([]);

    await page.getByRole('button', { name: /Cambiar a tema/ }).click();
    await page.waitForTimeout(400);
    expect(await violations(page)).toEqual([]);
  });

  test('módulos operativos sin violaciones', async ({ page }) => {
    test.slow();
    await login(page);

    await page.goto('/inventario');
    await expect(page.getByRole('heading', { name: 'Inventario central' })).toBeVisible();
    await page.waitForTimeout(400);
    expect(await violations(page)).toEqual([]);

    await page.goto('/usuarios');
    await expect(page.getByRole('heading', { name: 'Usuarios y roles' })).toBeVisible();
    await page.waitForTimeout(400);
    expect(await violations(page)).toEqual([]);
  });

  test('auditoría, trazabilidad y permisos sin violaciones', async ({ page }) => {
    test.slow();
    await login(page);

    await page.goto('/auditoria');
    await expect(page.getByRole('heading', { name: /Auditoría del sistema/ })).toBeVisible();
    await page.waitForTimeout(400);
    expect(await violations(page)).toEqual([]);

    await page.goto('/trazabilidad');
    await expect(page.getByRole('heading', { name: 'Trazabilidad' })).toBeVisible();
    await page.waitForTimeout(400);
    expect(await violations(page)).toEqual([]);

    await page.goto('/datos-maestros');
    await expect(page.getByRole('heading', { name: 'Datos maestros' })).toBeVisible();
    await page.getByRole('button', { name: /^Roles\s+\d+$/ }).click();
    await page.getByRole('button', { name: 'Permisos' }).first().click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.waitForTimeout(300);
    expect(await violations(page)).toEqual([]);
  });

  test('drawer de filtros móvil sin violaciones', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'El drawer solo se muestra en móvil.');
    await login(page);
    await page.goto('/solicitudes');
    await expect(page.getByRole('heading', { name: 'Solicitudes de material' })).toBeVisible();
    await page.getByRole('button', { name: 'Abrir filtros de solicitudes' }).click();
    const dialog = page.getByRole('dialog', { name: 'Filtros de solicitudes' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Aplicar filtros' })).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Limpiar' })).toBeVisible();
    await page.waitForTimeout(300);
    expect(await violations(page)).toEqual([]);
  });

  test('wizard de usuario con estructura accesible', async ({ page }) => {
    await login(page);
    await page.goto('/usuarios');
    await page.getByRole('button', { name: 'Nuevo usuario' }).click();
    const dialog = page.getByRole('dialog', { name: 'Nuevo usuario' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('button', { name: /Datos personales/ })).toBeVisible();
    await expect(dialog.getByRole('button', { name: /Rol y acceso/ })).toBeVisible();
    await expect(dialog.getByRole('button', { name: /Seguridad/ })).toBeVisible();
    expect(await violations(page)).toEqual([]);
  });

  test('design system sin violaciones', async ({ page }) => {
    test.slow();
    await login(page);
    await page.goto('/design-system');
    await expect(page.getByRole('heading', { name: 'SmartSys UI' })).toBeVisible();
    await page.waitForTimeout(500);
    expect(await violations(page)).toEqual([]);
  });
});
