import { test, expect } from './support/fixtures';
import { PRIMARY_PRODUCT } from './support/supabaseMock';

/**
 * Real-world tablet hardening.
 *
 * These are the bugs that bite a busy counter on an iPad: the on-screen
 * keyboard covering the submit button, a cashier double-tapping a slow button,
 * and rapid-fire taps on a product. Each test asserts the app stays correct.
 */
test.describe('Tablet resilience', () => {
  test('login submit stays reachable when the on-screen keyboard shrinks the screen', async ({
    pos,
    page,
  }) => {
    await pos.open('/');
    await pos.expectLoginRequired();

    // Simulate iOS software keyboard claiming ~55% of the height.
    await page.setViewportSize({ width: 1080, height: 360 });

    const dialog = pos.loginDialog;
    await dialog.getByLabel('Username', { exact: true }).fill('pos_demo_account');
    await dialog.getByLabel('Password', { exact: true }).fill('pos_demo_account');

    const loginBtn = dialog.getByRole('button', { name: 'Login' });
    // The sticky footer must keep the primary action on screen and tappable.
    await expect(loginBtn).toBeInViewport();
    await loginBtn.click();

    await pos.waitForPosReady();
  });

  test('rapid-fire tapping a product never drops or duplicates cart quantity', async ({ pos }) => {
    await pos.loginAs('admin');

    const taps = 6;
    const addBtn = pos.productAddButton(PRIMARY_PRODUCT.name).first();
    for (let i = 0; i < taps; i += 1) {
      await addBtn.click();
    }

    await expect(pos.payButton()).toContainText(`(${taps})`);
    await expect(pos.cartRegion().getByText(String(taps), { exact: true })).toBeVisible();
  });

  test('double-tapping "Complete payment" charges the customer only once', async ({ pos, page }) => {
    let transactionPosts = 0;
    page.on('request', (req) => {
      if (req.method() === 'POST' && req.url().includes('/rest/v1/transactions')) {
        transactionPosts += 1;
      }
    });

    await pos.loginAs('admin');
    await pos.addProductToCart(PRIMARY_PRODUCT.name);
    await pos.payButton().click();
    await pos.chooseCash();
    await pos.exactAmountButton().click();

    const completeBtn = pos.completePaymentButton();
    // Two near-simultaneous taps (a panicked double-tap).
    await Promise.all([
      completeBtn.click(),
      completeBtn.click({ force: true }).catch(() => {}),
    ]);

    await expect(page.getByText('Payment successful')).toBeVisible();
    // The disabled-while-processing guard prevents a second sale.
    expect(transactionPosts).toBe(1);
  });

  test('the numeric keypad enters, backspaces and clears amounts exactly', async ({ pos, page }) => {
    await pos.loginAs('admin');
    await pos.addProductToCart(PRIMARY_PRODUCT.name);
    await pos.payButton().click();
    await pos.chooseCash();

    await pos.typeOnKeypad('12345'); // 12345 cents
    await expect(page.getByText('₱123.45')).toBeVisible();

    await page.getByRole('button', { name: 'Backspace' }).click(); // -> 1234 cents
    await expect(page.getByText('₱12.34')).toBeVisible();

    await page.getByRole('button', { name: 'Clear' }).click();
    await expect(page.getByText('₱0.00').first()).toBeVisible();
  });
});
