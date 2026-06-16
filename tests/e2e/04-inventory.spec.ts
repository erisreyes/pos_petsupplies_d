import { test, expect } from './support/fixtures';

/**
 * Inventory Management: table + search, the right-side drawer (Add / Update
 * item Sheets) and the Delete confirmation AlertDialog.
 * Covers HP-10 plus the destructive-action safeguards.
 */
test.describe('Inventory management', () => {
  test.beforeEach(async ({ pos, page }) => {
    await pos.loginAs('admin');
    await page.goto('/inventory');
    await expect(page.getByRole('heading', { name: 'Inventory Management' })).toBeVisible();
  });

  test('lists products and filters them by search', async ({ page }) => {
    await expect(page.getByRole('cell', { name: 'Premium Dog Kibble' })).toBeVisible();

    await page.getByPlaceholder(/Search SKU/).fill('Tuna');

    await expect(page.getByRole('cell', { name: 'Gourmet Cat Tuna' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Premium Dog Kibble' })).toHaveCount(0);
  });

  test('opens the Add-item right-side drawer and closes it', async ({ page }) => {
    await page.getByRole('button', { name: '+ Add', exact: true }).click();

    const drawer = page.getByRole('dialog');
    await expect(drawer.getByText('Add New Item')).toBeVisible();
    await expect(drawer.getByText('Enter product details for inventory and POS.')).toBeVisible();

    await drawer.getByRole('button', { name: 'Close panel' }).click();
    await expect(page.getByText('Add New Item')).toHaveCount(0);
  });

  test('opens the Update-item drawer pre-filled with the product', async ({ page }) => {
    await page.getByPlaceholder(/Search SKU/).fill('Premium Dog Kibble');
    await page.getByRole('button', { name: 'Edit Premium Dog Kibble' }).click();

    await expect(page.getByText('Update Item')).toBeVisible();
    await expect(page.locator('#update-name')).toHaveValue('Premium Dog Kibble');

    await page.getByRole('button', { name: 'Close panel' }).click();
    await expect(page.getByText('Update Item')).toHaveCount(0);
  });

  test('Delete confirmation: Cancel keeps the product', async ({ page }) => {
    await page.getByPlaceholder(/Search SKU/).fill('Pet Multivitamins');
    await page.getByRole('button', { name: 'Delete Pet Multivitamins' }).click();

    const dialog = page.getByRole('alertdialog');
    await expect(dialog.getByRole('heading', { name: 'Delete product?' })).toBeVisible();
    await expect(dialog).toContainText('Pet Multivitamins');
    await expect(dialog).toContainText('SKU: 60002');

    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByRole('cell', { name: 'Pet Multivitamins' })).toBeVisible();
  });

  test('Delete confirmation: Confirm deletes the product', async ({ page }) => {
    let deleteRequests = 0;
    page.on('request', (req) => {
      if (req.method() === 'DELETE' && req.url().includes('/rest/v1/products')) {
        deleteRequests += 1;
      }
    });

    await page.getByPlaceholder(/Search SKU/).fill('Oatmeal Pet Shampoo');
    await page.getByRole('button', { name: 'Delete Oatmeal Pet Shampoo' }).click();

    const dialog = page.getByRole('alertdialog');
    await dialog.getByRole('button', { name: 'Delete product' }).click();

    await expect(page.getByText('Deleted product')).toBeVisible();
    expect(deleteRequests).toBe(1);
  });

  test('Delete is blocked when the product has transaction history', async ({ page, deleteRef }) => {
    // Simulate a foreign-key violation from the database.
    deleteRef.current = () => ({ ok: false, fkViolation: true });

    await page.getByPlaceholder(/Search SKU/).fill('Premium Dog Kibble');
    await page.getByRole('button', { name: 'Delete Premium Dog Kibble' }).click();

    const dialog = page.getByRole('alertdialog');
    await dialog.getByRole('button', { name: 'Delete product' }).click();

    await expect(page.getByText('Unable to delete product')).toBeVisible();
    // The product is still there — past receipts stay accurate.
    await expect(page.getByRole('cell', { name: 'Premium Dog Kibble' })).toBeVisible();
  });
});
