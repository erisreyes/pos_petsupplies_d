import { test, expect } from './support/fixtures';

/**
 * Role-Based Access Control.
 * Covers HP-12, HP-13: staff are confined to the POS; admin/manager get the
 * full navigation header and the protected Inventory / Reports / Users routes.
 */
test.describe('Role-based security', () => {
  test('STAFF never sees the navigation menu in the header', async ({ pos }) => {
    await pos.loginAs('staff');

    // Staff see the slim POS staff bar, not the AppHeader hamburger menu.
    await expect(pos.menuButton()).toHaveCount(0);
    await expect(pos.page.getByText('POS Demo')).toBeVisible();
  });

  test('STAFF deep-linking to /inventory is redirected back to the POS', async ({ pos, page }) => {
    await pos.loginAs('staff');

    await page.goto('/inventory');

    await expect(page).toHaveURL(/localhost:5173\/$/);
    await expect(page).not.toHaveURL(/\/inventory/);
    await pos.waitForPosReady();
    await expect(page.getByText('You do not have access to this page')).toBeVisible();
  });

  test('STAFF deep-linking to /reports and /users is also blocked', async ({ pos, page }) => {
    await pos.loginAs('staff');

    for (const route of ['/reports', '/users']) {
      await page.goto(route);
      await expect(page).not.toHaveURL(new RegExp(route));
      await pos.waitForPosReady();
    }
  });

  test('ADMIN sees the menu and can open Inventory Management', async ({ pos, page }) => {
    await pos.loginAs('admin');

    await expect(pos.menuButton()).toBeVisible();
    await pos.menuButton().click();

    await page.getByRole('button', { name: 'Inventory Management' }).click();

    await expect(page).toHaveURL(/\/inventory/);
    await expect(page.getByRole('heading', { name: 'Inventory Management' })).toBeVisible();
  });

  test('MANAGER can access the protected Inventory route directly', async ({ pos, page }) => {
    await pos.loginAs('manager');

    await page.goto('/inventory');

    await expect(page).toHaveURL(/\/inventory/);
    await expect(page.getByRole('heading', { name: 'Inventory Management' })).toBeVisible();
  });
});
