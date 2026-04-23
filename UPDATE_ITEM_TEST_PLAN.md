# Update Item Function Test Plan

## Purpose
This document describes how to test the `Update Item` feature in the POS application. It covers the modal form, field validation, stock and pricing behavior, category defaults, low stock alert, and logout color retention.

## Location
- `src/app/components/UpdateItemModal.tsx`

## Prerequisites
- Application is running locally
- A staff user is logged in
- There is at least one existing product in the catalog
- The update modal is accessible from the UI

## Test Cases

### 1. Open Update Item modal
- Click the `+ Add New Item` button or the control that opens the update modal.
- Expected: the `Update Item` dialog appears with the following fields:
  - Barcode
  - Category
  - Product Name
  - Price (₱)
  - Stock
  - Minimum Stock Level (Low Stock Alert)
- Expected: the form uses the same color styling as the login UI (green accent, white/background combos).

### 2. Fetch product by barcode
- Enter a valid existing barcode in the `Barcode` field.
- Expected: the product details populate in the form.
- Expected fields filled:
  - `Category`
  - `Product Name`
  - `Price`
  - `Stock`
  - `Minimum Stock Level`
- If the barcode is not found, test the error message appears: `Product not found`.

### 3. Field validation
- Leave required fields blank and submit.
- Expected: a validation error appears and the product is not updated.
- Required fields:
  - `Barcode`
  - `Category`
  - `Product Name`
  - `Price`
  - `Stock`

### 4. Price prefix formatting
- Verify the price field displays a peso prefix (`₱`) on the form.
- Enter a numeric value into the Price field.
- Expected: only the numeric value is editable, while the `₱` prefix remains visible in the field UI.

### 5. Minimum stock level alert
- Set the `Minimum Stock Level` field to a value above current stock.
- Update the product.
- Expected: the product card should later display low stock styling or warning color once stock is below the configured minimum.
- Note: verify the app correctly propagates `minStockLevel` to product state.

### 6. Stock adjustment buttons
- Use the `Add 5`, `Add 10`, and `Add 20` buttons.
- Expected: the `Stock` field increments by the correct amount each time.
- Also verify the final stock value remains editable.

### 7. Auto-categorization default behavior
- Open the modal after updating one product category.
- If the implementation uses the last entered category as default, verify the next new entry selection defaults to that category.
- Expected: the category dropdown should preselect the last updated category if supported.

### 8. Update submission
- Modify multiple fields and submit the form.
- Expected: the toast message `Product updated successfully!` appears.
- Expected: the modal closes after successful update.
- Expected: the updated values are reflected in the product list.

### 9. Cancel behavior
- Click `Cancel` while the modal is open.
- Expected: the modal closes without saving changes and all fields reset.

### 10. Role-based access
- If login is required, verify only logged-in staff can open and submit the modal.
- Expected: unauthorized or logged-out users cannot edit products.

## Notes
- If the current implementation has `UpdateItemModal` but no `Add New Item` workflow for new products, this test plan still applies to the update path.
- The low stock alert depends on the product card color styling elsewhere in the app; verify the alert state visually in the product list.

## Suggested Test Data
- Existing product barcode: use a known product ID from the test catalog
- Example price: `199.99`
- Example stock: `15`
- Example minimum stock level: `5`
- Example category: `Dog` or `Cat`

## Reporting
- Record whether each step passes or fails
- Log any unexpected error messages or form behavior
- Capture screen state after update to confirm low stock alert color changes
