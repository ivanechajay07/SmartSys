import { expect, test } from '@playwright/test';

test.describe('Autenticacion y navegacion base', () => {
  test('muestra el formulario de inicio de sesion', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByRole('heading', { name: 'Iniciar sesión' })).toBeVisible();
    await expect(page.getByPlaceholder('usuario@smartsys.local')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Ingresar al sistema' })).toBeVisible();
  });

  test('redirige a login cuando no hay sesion', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/login/);
  });

  test('valida campos obligatorios del formulario', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: 'Ingresar al sistema' }).click();

    await expect(page.getByText('Ingrese su correo')).toBeVisible();
    await expect(page.getByText('Ingrese su contraseña')).toBeVisible();
  });

  test('alterna la visibilidad de la contraseña', async ({ page }) => {
    await page.goto('/login');

    await page.locator('#login-password').fill('Admin123!');
    await expect(page.locator('#login-password')).toHaveAttribute('type', 'password');

    await page.getByRole('button', { name: 'Mostrar contraseña' }).click();
    await expect(page.locator('#login-password')).toHaveAttribute('type', 'text');
    await page.getByRole('button', { name: 'Ocultar contraseña' }).click();
    await expect(page.locator('#login-password')).toHaveAttribute('type', 'password');
  });

  test('alterna el tema claro/oscuro y conserva la preferencia', async ({ page }) => {
    await page.goto('/login');

    const root = page.locator('.login-page');
    const initial = await root.getAttribute('data-theme');
    const expected = initial === 'dark' ? 'light' : 'dark';

    await page.getByRole('button', { name: /Cambiar a tema/ }).click();
    await expect(root).toHaveAttribute('data-theme', expected);

    await page.reload();
    await expect(root).toHaveAttribute('data-theme', expected);
  });

  test('solicita la recuperación de contraseña', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: '¿Olvidaste tu contraseña?' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.getByLabel('Correo corporativo').fill('admin@smartsys.local');
    await dialog.getByRole('button', { name: 'Enviar solicitud' }).click();
    await expect(dialog.getByText('Solicitud enviada')).toBeVisible();
  });

  test('la vista movil mantiene el acceso al formulario', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/login');

    await expect(page.getByRole('heading', { name: 'Iniciar sesión' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Ingresar al sistema' })).toBeInViewport();
  });
});
