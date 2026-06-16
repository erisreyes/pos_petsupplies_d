import { test, expect } from './support/fixtures';
import { TEST_USER_NAME, UNKNOWN_USERNAME } from './support/supabaseMock';

/**
 * Login via Username (Staff Portal).
 * Covers HP-01, HP-06, HP-07 plus the unhappy "unknown username" path.
 */
test.describe('Login via Username', () => {
  test('cold start forces a non-dismissable Staff Portal login', async ({ pos, page }) => {
    await pos.open('/');

    await pos.expectLoginRequired();

    // Required dialog: Escape and outside-click must NOT close it.
    await page.keyboard.press('Escape');
    await expect(pos.loginDialog).toBeVisible();
    await page.mouse.click(5, 5);
    await expect(pos.loginDialog).toBeVisible();

    // There is no close (X) button on a required login.
    await expect(pos.loginDialog.getByRole('button', { name: 'Close login' })).toHaveCount(0);

    // Login is disabled until both fields are filled.
    const loginBtn = pos.loginDialog.getByRole('button', { name: 'Login' });
    await expect(loginBtn).toBeDisabled();
    await pos.loginDialog.getByLabel('Username', { exact: true }).fill('pos_demo_account');
    await expect(loginBtn).toBeDisabled();
    await pos.loginDialog.getByLabel('Password', { exact: true }).fill('pos_demo_account');
    await expect(loginBtn).toBeEnabled();
  });

  test('valid username + password signs in and reaches the POS', async ({ pos }) => {
    await pos.open('/');
    await pos.expectLoginRequired();
    await pos.login();

    await pos.waitForPosReady();
    await expect(pos.welcomeToast()).toBeVisible();
    await expect(pos.loginDialog).toBeHidden();
  });

  test('unknown username is rejected with a clear error', async ({ pos }) => {
    await pos.open('/');
    await pos.expectLoginRequired();
    await pos.login(UNKNOWN_USERNAME, 'whatever');

    await expect(pos.loginDialog.getByRole('alert')).toContainText(/username not found/i);
    // Stays on the login screen — never lets an unknown user in.
    await expect(pos.loginDialog).toBeVisible();
  });

  test('session persists across a page reload', async ({ pos, page }) => {
    await pos.loginAs('admin');

    await page.reload();

    // No login dialog after reload; POS is immediately usable.
    await expect(pos.loginDialog).toBeHidden();
    await pos.waitForPosReady();
  });

  test('logout returns to the Staff Portal', async ({ pos }) => {
    await pos.loginAs('admin');

    await pos.confirmLogout();

    await pos.expectLoginRequired();
  });
});
