# Happy Path Test Case Plan

## Purpose

End-to-end **happy path** scenarios for Mini Step POS: flows that should succeed under normal conditions with valid data, network, and credentials. Edge cases, validation failures, and offline/error paths are out of scope here.

For granular step-by-step cases (including edge cases), run `npm run test-plan:xlsx` to generate `APP_TEST_PLAN.xlsx`. For Update Item details, see `UPDATE_ITEM_TEST_PLAN.md`.

## Scope

| Area | Routes / components |
|------|---------------------|
| Auth | `UserLogin`, `AuthContext`, Supabase `profiles` + `auth` |
| POS | `/` — `PosPage`, cart, checkout, scanner |
| Inventory | `/inventory` — `InventoryPage` |
| Reports | `/reports` — `ReportDashboard` |
| Users | `/users` — placeholder |
| Roles | `staff` (POS only), `admin` / `manager` (full nav) |

## Prerequisites

- App running: `npm run dev` (or deployed build)
- `.env.local` has `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- Supabase has products in the catalog and matching `profiles` rows for test users
- Browser: Chrome or Safari; tablet/landscape recommended for POS layout

## Test data

| Item | Example |
|------|---------|
| Demo credentials (pre-filled in UI) | Username: `pos_demo_account`, Password: `pos_demo_account` |
| Admin account | User with `profiles.role = admin` (or demo account if admin) |
| Staff account | User with `profiles.role = staff` |
| Product for cart | Any in-stock product visible on POS grid |
| Barcode | Existing `products.barcode` or product `id` |
| Cash tender | Amount ≥ cart total (e.g. quick bill ₱500) |

## Reporting

Record per scenario: **Pass** / **Fail** / **Blocked**, tester, date, device/browser, notes.

---

## HP-01 — Cold start and staff login

**Role:** Any valid user (e.g. `pos_demo_account`)  
**Goal:** Unauthenticated user can sign in and reach POS.

| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | Open `/` with no active session | **Staff Portal** dialog is open and required (cannot dismiss) |
| 2 | Confirm username/password fields | Pre-filled with `pos_demo_account` (if using demo build) |
| 3 | Tap **Login** | Loading state, then success (no error alert) |
| 4 | After login | Dialog closes; welcome toast: `Welcome, {name}` |
| 5 | Observe POS | Product grid loads; checkout column visible (landscape/tablet) |

---

## HP-02 — Staff completes a cash sale (core POS)

**Role:** Staff or any logged-in cashier  
**Goal:** Standard sale from product tap through cash payment.

| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | Log in (HP-01) | On POS home |
| 2 | Tap a product in the grid | Success toast; line appears in checkout cart |
| 3 | Verify **Pay** button | Shows item count and total, e.g. `Pay (1) · ₱X.XX` |
| 4 | Tap **Pay** | Checkout panel opens: **Complete payment** |
| 5 | Review order summary | Line items and **Total due** match cart |
| 6 | Choose **Cash** | Cash keypad / tender UI shown |
| 7 | Enter tender ≥ total (keypad or quick bill) | Change calculated when tender > total |
| 8 | Confirm payment | **Payment successful**; change shown if applicable |
| 9 | After completion | Returns to cart view; cart empty; total ₱0.00 |
| 10 | Optional: transaction history | Session shows completed sale (if visible in UI) |

---

## HP-03 — Staff completes a cashless sale

**Role:** Staff or any logged-in cashier  
**Goal:** Non-cash payment path succeeds.

| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | Add at least one item to cart | Cart not empty |
| 2 | Tap **Pay** | Checkout panel opens |
| 3 | Choose **Cashless** | Confirmation step for GCash / Maya |
| 4 | Confirm payment | **Payment successful** |
| 5 | After completion | Cart cleared; back to product/checkout layout |

---

## HP-04 — Search and category filter (then sale)

**Role:** Any logged-in user  
**Goal:** Filters narrow products; sale still completes.

| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | Select category tab (e.g. **Dog**) | Grid shows only matching products |
| 2 | Type part of a product name in search | Grid further filtered (AND with category) |
| 3 | Add a visible product and complete checkout (HP-02 or HP-03) | Sale succeeds |

---

## HP-05 — Barcode scan adds to cart

**Role:** Any logged-in user  
**Goal:** Scanner finds product and adds to cart.

| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | Open barcode scanner from POS (scan/camera control) | Scanner overlay opens |
| 2 | Scan or enter a **valid** barcode/SKU | Product found; added to cart; success feedback |
| 3 | Close scanner | Overlay closes; cart retains item |
| 4 | Complete payment (HP-02) | Sale succeeds |

---

## HP-06 — Session persists on reload

**Role:** Any logged-in user  
**Goal:** Supabase session survives refresh.

| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | Log in and reach POS | Products visible |
| 2 | Refresh the browser | Login dialog **not** shown |
| 3 | Verify POS | Still authenticated; products load |

---

## HP-07 — Logout and sign in again

**Role:** Any logged-in user  
**Goal:** Clean sign-out and re-authentication.

| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | From POS, sign out (staff bar or header logout) | Success toast; Staff Portal opens |
| 2 | Verify cart | Cart cleared |
| 3 | Log in again | POS available; welcome toast |

---

## HP-08 — Admin: add product from POS

**Role:** `admin`  
**Goal:** Admin can create a catalog item from POS.

| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | Log in as admin | **+ Add New Item** visible on POS |
| 2 | Open **+ Add New Item** | Add Item modal opens |
| 3 | Fill required fields and save | Success toast; modal closes |
| 4 | Check product grid | New product appears |

---

## HP-09 — Admin: edit product from POS

**Role:** `admin`  
**Goal:** Admin can update an existing product from the grid.

| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | Log in as admin | Edit affordance on product cards |
| 2 | Open edit on an existing product | Update Item modal opens with fields populated |
| 3 | Change name/price/stock and save | Success toast; modal closes |
| 4 | Check grid | Updated values visible |

*Field-level steps: see `UPDATE_ITEM_TEST_PLAN.md`.*

---

## HP-10 — Admin/Manager: inventory management

**Role:** `admin` or `manager` (not `staff`)  
**Goal:** Inventory page lists, searches, and edits products.

| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | Log in as admin/manager | App header with menu visible on POS |
| 2 | Menu → **Inventory Management** | Navigate to `/inventory`; table loads |
| 3 | Search by name or SKU | Table filters correctly |
| 4 | Open edit on a row | Update Item modal; save updates list |
| 5 | Add new item (if button present) | Product added; table refreshes |

---

## HP-11 — Admin/Manager: sales reports

**Role:** `admin` or `manager`  
**Goal:** Report dashboard loads metrics for selected range.

| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | Menu → **Sales Report** (or report nav label) | Navigate to `/reports` |
| 2 | Default range **Today** | Hero metrics and charts render (or empty state without error) |
| 3 | Switch to **Yesterday** or **This Month** | Data refreshes for new range |
| 4 | Optional: **Custom Range** | Pick start/end; dashboard updates |

---

## HP-12 — Admin/Manager: navigation round-trip

**Role:** `admin` or `manager`  
**Goal:** All main routes reachable and return to POS.

| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | Open menu | POS, Inventory, Reports, User Management listed |
| 2 | Visit Inventory → Reports → Users | Each page loads without crash |
| 3 | Menu → **Point of Sale** | Returns to `/`; POS layout restored |
| 4 | Close menu | Drawer closes |

---

## HP-13 — Staff: POS-only access (role happy path)

**Role:** `staff`  
**Goal:** Staff uses POS successfully; restricted routes are blocked gracefully.

| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | Log in as staff | POS loads; staff bar (no full AppHeader on POS) |
| 2 | Complete a sale (HP-02) | Success |
| 3 | Navigate directly to `/inventory` or use any nav if exposed | Redirect to `/`; toast: access denied |
| 4 | Stay on POS | Can continue selling |

---

## HP-14 — User Management placeholder

**Role:** `admin` or `manager`  
**Goal:** Route loads for future work.

| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | Menu → **User Management** | `/users` shows placeholder text |
| 2 | Sign out from header | Returns to login on `/` |

---

## Summary checklist

| ID | Scenario | Pass | Fail | Notes |
|----|----------|------|------|-------|
| HP-01 | Cold start & login | | | |
| HP-02 | Cash sale | | | |
| HP-03 | Cashless sale | | | |
| HP-04 | Search & category | | | |
| HP-05 | Barcode scan | | | |
| HP-06 | Session reload | | | |
| HP-07 | Logout & re-login | | | |
| HP-08 | Admin add product | | | |
| HP-09 | Admin edit product | | | |
| HP-10 | Inventory | | | |
| HP-11 | Reports | | | |
| HP-12 | Navigation | | | |
| HP-13 | Staff POS-only | | | |
| HP-14 | Users placeholder | | | |

## Related artifacts

- `UPDATE_ITEM_TEST_PLAN.md` — Update Item modal (detailed)
- `scripts/generate-app-test-plan-xlsx.mjs` — Full test matrix → `npm run test-plan:xlsx`
- `POS_SCREENS.md` — UI screen reference
