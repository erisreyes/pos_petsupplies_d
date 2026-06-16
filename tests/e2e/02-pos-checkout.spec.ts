import { test, expect } from './support/fixtures';
import { PRIMARY_PRODUCT, MOCK_PRODUCTS } from './support/supabaseMock';

/**
 * Tablet POS: cart, custom numeric keypad, Cash/Cashless toggle, scrollable cart.
 * Covers HP-02, HP-03, HP-04.
 */
test.describe('Tablet POS checkout', () => {
  test.beforeEach(async ({ pos }) => {
    await pos.loginAs('admin');
  });

  test('adding a product builds the cart and updates the Pay total', async ({ pos }) => {
    await pos.addProductToCart(PRIMARY_PRODUCT.name);

    await expect(pos.cartRegion().getByText(PRIMARY_PRODUCT.name)).toBeVisible();
    await expect(pos.payButton()).toContainText('(1)');
    await expect(pos.payButton()).toContainText('₱540.00');

    // Quantity stepper.
    await pos.cartIncrease(PRIMARY_PRODUCT.name).click();
    await expect(pos.payButton()).toContainText('(2)');
    await expect(pos.payButton()).toContainText('₱1080.00');

    await pos.cartDecrease(PRIMARY_PRODUCT.name).click();
    await expect(pos.payButton()).toContainText('(1)');
  });

  test('completes a CASH sale using the custom numeric keypad', async ({ pos, page }) => {
    await pos.addProductToCart(PRIMARY_PRODUCT.name); // ₱540.00
    await pos.payButton().click();

    await expect(pos.checkoutHeading()).toBeVisible();
    await pos.chooseCash();

    // The on-screen keypad is the in-app one (not the OS keyboard).
    await expect(page.getByText('Keypad')).toBeVisible();

    // Enter ₱600.00 cent-by-cent: 6,0,0,0,0 -> 60000 cents.
    await pos.typeOnKeypad('60000');
    await expect(page.getByText('₱600.00')).toBeVisible();

    await pos.completePaymentButton().click();

    await expect(page.getByText('Payment successful')).toBeVisible();
    await expect(page.getByText('Change: ₱60.00')).toBeVisible();

    // Returns to an empty cart.
    await expect(pos.payButton()).toContainText('₱0.00');
  });

  test('Exact Amount shortcut tenders the precise total', async ({ pos, page }) => {
    await pos.addProductToCart(PRIMARY_PRODUCT.name);
    await pos.payButton().click();
    await pos.chooseCash();

    await pos.exactAmountButton().click();
    await expect(page.getByText('₱540.00').first()).toBeVisible();

    await pos.completePaymentButton().click();
    await expect(page.getByText('Payment successful')).toBeVisible();
  });

  test('blocks completing a CASH sale when tender is short', async ({ pos, page }) => {
    await pos.addProductToCart(PRIMARY_PRODUCT.name); // ₱540.00
    await pos.payButton().click();
    await pos.chooseCash();

    await pos.typeOnKeypad('100'); // ₱1.00 — far short
    await expect(page.getByText(/Short by/)).toBeVisible();
    await expect(pos.completePaymentButton()).toBeDisabled();
  });

  test('completes a CASHLESS sale', async ({ pos, page }) => {
    await pos.addProductToCart(PRIMARY_PRODUCT.name);
    await pos.payButton().click();

    await pos.chooseCashless();
    await expect(page.getByText(/GCash \/ Maya/)).toBeVisible();

    await pos.completePaymentButton().click();
    await expect(page.getByText('Payment successful')).toBeVisible();
    await expect(pos.payButton()).toContainText('₱0.00');
  });

  test('toggles between Cash and Cashless payment methods', async ({ pos, page }) => {
    await pos.addProductToCart(PRIMARY_PRODUCT.name);
    await pos.payButton().click();

    await pos.chooseCash();
    await expect(page.getByText('Keypad')).toBeVisible();

    await page.getByRole('button', { name: 'Change method' }).click();
    await pos.chooseCashless();
    await expect(page.getByText(/GCash \/ Maya/)).toBeVisible();

    await page.getByRole('button', { name: 'Change method' }).click();
    await pos.chooseCash();
    await expect(page.getByText('Keypad')).toBeVisible();
  });

  test('scrollable cart keeps every line reachable on a full order', async ({ pos, page }) => {
    // Load the cart with the whole catalog so it overflows the panel.
    for (const product of MOCK_PRODUCTS) {
      await pos.addProductToCart(product.name);
    }

    const lastName = MOCK_PRODUCTS[MOCK_PRODUCTS.length - 1].name;
    const firstName = MOCK_PRODUCTS[0].name;

    // Every distinct line is present.
    await expect(pos.payButton()).toContainText(`(${MOCK_PRODUCTS.length})`);

    // The last line can be scrolled into view (proves the cart scrolls).
    const lastRow = pos.cartRegion().getByText(lastName, { exact: true });
    await lastRow.scrollIntoViewIfNeeded();
    await expect(lastRow).toBeVisible();

    // And we can scroll back to the first.
    const firstRow = pos.cartRegion().getByText(firstName, { exact: true });
    await firstRow.scrollIntoViewIfNeeded();
    await expect(firstRow).toBeVisible();
  });

  test('category filter narrows the product grid', async ({ pos, page }) => {
    // Cat tab should show cat products and hide dog-only products.
    await page.getByRole('tab', { name: 'Cat', exact: true }).click();
    await expect(pos.productAddButton('Gourmet Cat Tuna')).toBeVisible();
    await expect(pos.productAddButton('Premium Dog Kibble')).toHaveCount(0);

    await page.getByRole('tab', { name: 'All', exact: true }).click();
    await expect(pos.productAddButton('Premium Dog Kibble')).toBeVisible();
  });
});
