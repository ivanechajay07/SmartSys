import { expect, test } from '@playwright/test';

const EMAIL = process.env.E2E_EMAIL ?? 'admin@smartsys.local';
const PASSWORD = process.env.E2E_PASSWORD ?? 'Admin123!';

test.describe('Flujo autenticado del panel', () => {
  test.beforeEach(async ({ request }) => {
    const response = await request.post('/api/v1/auth/login', {
      data: { email: EMAIL, password: PASSWORD },
    });
    test.skip(
      !response.ok(),
      'El API no esta disponible; inicie el backend y reintente el flujo autenticado.',
    );
  });

  test('inicia sesion y consulta el panel general', async ({ page }) => {
    test.slow();
    await page.goto('/login');
    await page.getByPlaceholder('usuario@smartsys.local').fill(EMAIL);
    await page.getByPlaceholder('••••••••••').fill(PASSWORD);
    await page.getByRole('button', { name: 'Ingresar al sistema' }).click();

    await expect(page.getByRole('heading', { name: 'Panel general' })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('Cumplimiento promedio').first()).toBeVisible();

    await page.goto('/solicitudes');
    await expect(page.getByRole('heading', { name: 'Solicitudes de material' })).toBeVisible();
    await page.getByRole('button', { name: 'Tarjetas' }).click();
    await page.getByRole('button', { name: 'Tabla' }).click();
    await page.getByRole('button', { name: /Cambiar a tema/ }).click();

    await page.goto('/despachos');
    await expect(page.getByRole('heading', { name: 'Despachos', exact: true })).toBeVisible();

    await page.goto('/inventario');
    await expect(page.getByRole('heading', { name: 'Inventario central' })).toBeVisible();
    await page.getByRole('button', { name: 'Ingreso', exact: true }).click();
    await expect(page.getByText('Proveedor', { exact: true })).toBeVisible();
    await page.locator('.modal-body .ss-trigger').nth(1).click();
    await expect(page.locator('.ss-option', { hasText: 'Distribuidora Higiene Total' })).toBeVisible();
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Cerrar', exact: true }).click();

    await page.goto('/trazabilidad');
    await expect(page.getByRole('heading', { name: 'Trazabilidad' })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Órdenes de servicio \(\d+\)/ })).toBeVisible();
    await page.getByRole('button', { name: /^Ingresos de almacén\s+\d+$/ }).click();
    await expect(page.getByRole('heading', { name: /Ingresos de almacén \(\d+\)/ })).toBeVisible();
    await page.getByRole('button', { name: /^Salidas de almacén\s+\d+$/ }).click();
    await expect(page.getByRole('heading', { name: /Salidas de almacén \(\d+\)/ })).toBeVisible();
    await expect(page.getByText('SAL-1')).toBeVisible();

    await page.goto('/usuarios');
    await expect(page.getByRole('heading', { name: 'Usuarios y roles' })).toBeVisible();
    await page.getByRole('button', { name: 'Nuevo usuario' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('button', { name: 'Cerrar', exact: true }).click();

    await page.goto('/datos-maestros');
    await expect(page.getByRole('heading', { name: 'Datos maestros' })).toBeVisible();
    await page.getByRole('button', { name: /^Proveedores\s+\d+$/ }).click();
    await expect(page.getByRole('heading', { name: /Proveedores \(\d+\)/ })).toBeVisible();
    await page.getByRole('button', { name: 'Nuevo proveedor' }).click();
    await expect(page.getByRole('dialog').getByText('Nuevo proveedor')).toBeVisible();
    await page.getByRole('button', { name: 'Cerrar', exact: true }).click();

    await page.getByRole('button', { name: /^Roles\s+\d+$/ }).click();
    await expect(page.getByRole('heading', { name: /Roles del sistema \(\d+\)/ })).toBeVisible();
    await page.getByRole('button', { name: /Contratos y TDR/ }).click();
    await expect(page.getByRole('heading', { name: /Contratos \(\d+\)/ })).toBeVisible();
    await page.getByRole('button', { name: 'Ver TDR' }).first().click();
    await page.getByRole('button', { name: 'Cláusula' }).first().click();
    await expect(page.getByRole('dialog').getByText(/Nueva cláusula/)).toBeVisible();
    await page.getByRole('button', { name: 'Cerrar', exact: true }).click();

    await page.goto('/perfil');
    await expect(page.getByRole('heading', { name: 'Mi perfil' })).toBeVisible();
    await expect(page.getByText('Foto de perfil')).toBeVisible();

    await page.getByRole('button', { name: 'Centro de notificaciones' }).click();
    await expect(page.getByText('Centro de actividad')).toBeVisible();
    await page.keyboard.press('Escape');

    await page.getByRole('button', { name: 'Menú de usuario' }).click();
    await expect(page.getByRole('menu')).toBeVisible();
    await page.keyboard.press('Escape');

    await page.goto('/reportes');
    await expect(page.getByRole('heading', { name: 'Historial de exportaciones' })).toBeVisible();
    await expect(
      page.getByText('Sin exportaciones registradas').or(page.getByRole('columnheader', { name: 'Formato' })),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Exportar' }).first().click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText('Exportar reporte')).toBeVisible();
    await page.keyboard.press('Escape');
  });

  test('consulta la bandeja de notificaciones y la auditoria', async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder('usuario@smartsys.local').fill(EMAIL);
    await page.getByPlaceholder('••••••••••').fill(PASSWORD);
    await page.getByRole('button', { name: 'Ingresar al sistema' }).click();
    await expect(page.getByRole('heading', { name: 'Panel general' })).toBeVisible({ timeout: 15_000 });

    await page.goto('/notificaciones');
    await expect(page.getByRole('heading', { name: 'Centro de notificaciones' })).toBeVisible();

    await page.goto('/auditoria');
    await expect(page.getByRole('heading', { name: /Auditor[ií]a del sistema/ })).toBeVisible();
  });

  test('el transportista consulta su ruta movil', async ({ page, request }) => {
    const login = await request.post('/api/v1/auth/login', {
      data: { email: 'transporte@smartsys.local', password: PASSWORD },
    });
    test.skip(!login.ok(), 'El transportista demo no esta disponible.');
    const token = (await login.json()).token as string;
    const response = await request.get('/api/v1/mobile/assignments?incluirFinalizadas=true', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const assignments = response.ok() ? await response.json() : [];
    test.skip(
      !Array.isArray(assignments) || assignments.length === 0,
      'Sin asignaciones demo para el transportista.',
    );

    await page.goto('/login');
    await page.getByPlaceholder('usuario@smartsys.local').fill('transporte@smartsys.local');
    await page.getByPlaceholder('••••••••••').fill(PASSWORD);
    await page.getByRole('button', { name: 'Ingresar al sistema' }).click();
    await expect(page.getByRole('heading', { name: 'Panel general' })).toBeVisible({ timeout: 15_000 });

    await page.goto('/ruta-movil');
    await expect(page.getByRole('heading', { name: 'Ruta móvil' })).toBeVisible();
    await expect(page.getByRole('button', { name: /GPS/ })).toBeVisible();
    await expect(
      page.getByText('Sin asignaciones activas').or(page.locator('.mod-card').first()),
    ).toBeVisible();
    await page.getByRole('tab', { name: 'Todas' }).click();
    await expect(page.locator('.mod-card').first()).toBeVisible();
  });
});
