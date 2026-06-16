import { test as base, expect, type Page, type Locator } from '@playwright/test';
import {
  installSupabaseMock,
  type AppRole,
  TEST_USER_NAME,
} from './supabaseMock';

type RoleRef = { current: AppRole };
type DeleteRef = { current: ((id: string) => { ok: boolean; fkViolation?: boolean } | void) | undefined };

type Fixtures = {
  /** Mutable holder so tests can pick the role the mocked profile reports. */
  roleRef: RoleRef;
  /** Mutable holder to override product-delete behaviour per test. */
  deleteRef: DeleteRef;
  /** High-level page object for the POS app. */
  pos: PosApp;
};

/**
 * Page object that encapsulates the real selectors of the Pet Shop POS so the
 * specs read like a checklist of business behaviour, not a wall of CSS.
 */
export class PosApp {
  readonly page: Page;
  private readonly roleRef: RoleRef;

  constructor(page: Page, roleRef: RoleRef) {
    this.page = page;
    this.roleRef = roleRef;
  }

  // --- navigation / auth ---------------------------------------------------

  async open(path = '/') {
    await this.page.goto(path);
  }

  get loginDialog(): Locator {
    return this.page.getByRole('dialog');
  }

  async expectLoginRequired() {
    await expect(this.loginDialog).toBeVisible();
    await expect(this.loginDialog.getByText('Staff Portal')).toBeVisible();
  }

  async login(username = 'pos_demo_account', password = 'pos_demo_account') {
    const dialog = this.loginDialog;
    await dialog.getByLabel('Username', { exact: true }).fill(username);
    await dialog.getByLabel('Password', { exact: true }).fill(password);
    await dialog.getByRole('button', { name: 'Login' }).click();
  }

  /** Set the role, navigate, sign in and wait for the POS to be ready. */
  async loginAs(role: AppRole, username = 'pos_demo_account', password = 'pos_demo_account') {
    this.roleRef.current = role;
    await this.open('/');
    await this.expectLoginRequired();
    await this.login(username, password);
    await this.waitForPosReady();
  }

  async waitForPosReady() {
    await expect(this.loginDialog).toBeHidden();
    await expect(this.page.getByRole('heading', { name: 'Checkout' })).toBeVisible();
    await expect(this.productAddButton(/.+/).first()).toBeVisible();
  }

  // --- product grid + cart -------------------------------------------------

  /**
   * The "add to cart" button is the only button on a product card that wraps
   * the product's name heading, which makes it uniquely targetable.
   */
  productAddButton(name: string | RegExp): Locator {
    return this.page
      .getByRole('button')
      .filter({ has: this.page.getByRole('heading', { name }) });
  }

  async addProductToCart(name: string) {
    await this.productAddButton(name).first().click();
  }

  cartRegion(): Locator {
    // The checkout column that contains the cart and the Pay button.
    return this.page.locator('section', { has: this.page.getByRole('heading', { name: 'Checkout' }) });
  }

  cartIncrease(name: string): Locator {
    return this.page.getByRole('button', { name: `Increase ${name} quantity` });
  }

  cartDecrease(name: string): Locator {
    return this.page.getByRole('button', { name: `Decrease ${name} quantity` });
  }

  cartRemove(name: string): Locator {
    return this.page.getByRole('button', { name: `Remove ${name}` });
  }

  payButton(): Locator {
    return this.page.getByRole('button', { name: /^Pay/ });
  }

  // --- checkout panel ------------------------------------------------------

  checkoutHeading(): Locator {
    return this.page.getByRole('heading', { name: 'Complete payment' });
  }

  chooseCash(): Promise<void> {
    return this.page.getByRole('button', { name: /^Cash\b/ }).click();
  }

  chooseCashless(): Promise<void> {
    return this.page.getByRole('button', { name: /^Cashless/ }).click();
  }

  keypadKey(digit: number): Locator {
    return this.page.getByRole('button', { name: String(digit), exact: true });
  }

  async typeOnKeypad(digits: string) {
    for (const ch of digits) {
      await this.keypadKey(Number(ch)).click();
    }
  }

  exactAmountButton(): Locator {
    return this.page.getByRole('button', { name: 'Exact Amount' });
  }

  completePaymentButton(): Locator {
    return this.page.getByRole('button', { name: 'Complete payment' });
  }

  // --- header / navigation -------------------------------------------------

  menuButton(): Locator {
    return this.page.getByRole('button', { name: 'Open menu' });
  }

  logoutButton(): Locator {
    return this.page.getByRole('button', { name: 'Sign out' });
  }

  async confirmLogout() {
    await this.logoutButton().click();
    const dialog = this.page.getByRole('alertdialog');
    await expect(dialog.getByRole('heading', { name: 'Sign out?' })).toBeVisible();
    await dialog.getByRole('button', { name: 'Sign out' }).click();
  }

  welcomeToast(): Locator {
    return this.page.getByText(`Welcome, ${TEST_USER_NAME}`);
  }
}

export const test = base.extend<Fixtures>({
  roleRef: async ({}, use) => {
    await use({ current: 'admin' });
  },
  deleteRef: async ({}, use) => {
    await use({ current: undefined });
  },
  page: async ({ page, roleRef, deleteRef }, use) => {
    await installSupabaseMock(page, {
      getRole: () => roleRef.current,
      onDeleteProduct: (id) => deleteRef.current?.(id),
    });
    await use(page);
  },
  pos: async ({ page, roleRef }, use) => {
    await use(new PosApp(page, roleRef));
  },
});

export { expect };
