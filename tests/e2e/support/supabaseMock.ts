import type { Page, Route } from '@playwright/test';

/**
 * Deterministic Supabase backend mock.
 *
 * The real app authenticates and loads its catalog from Supabase. To make the
 * end-to-end suite *bulletproof* — fast, offline, and independent of live data
 * or real credentials — we intercept every request to `*.supabase.co` and serve
 * predictable fixtures. The shape of each response mirrors what PostgREST /
 * GoTrue actually return, including CORS headers and the `single()` /
 * `maybeSingle()` semantics that supabase-js relies on.
 */

export type AppRole = 'admin' | 'staff' | 'manager';

/** Stable identity returned by the mocked auth + profiles endpoints. */
export const TEST_USER_ID = '00000000-0000-4000-8000-000000000abc';
export const TEST_USER_EMAIL = 'demo@petshop.test';
export const TEST_USER_NAME = 'Demo Cashier';

/** A username the mock treats as "does not exist" (for the rejection test). */
export const UNKNOWN_USERNAME = 'ghost_account';

export type MockCategory = { id: string; name: string };

export const MOCK_CATEGORIES: MockCategory[] = [
  { id: 'dog-food', name: 'Dog Food' },
  { id: 'cat-food', name: 'Cat Food' },
  { id: 'cat-toys', name: 'Cat Toys' },
  { id: 'pharmacy', name: 'Pharmacy' },
  { id: 'accessories', name: 'Accessories' },
  { id: 'grooming', name: 'Grooming' },
];

export type MockProductRow = {
  id: string;
  barcode: string;
  name: string;
  price: number;
  cost: number;
  category: string;
  category_id: string;
  stock: number;
  min_stock_level: number;
};

/**
 * A catalog big enough to overflow the checkout cart (scroll testing) and to
 * exercise every category filter. Names are unique so they make stable
 * selectors.
 */
export const MOCK_PRODUCTS: MockProductRow[] = [
  { id: '40001', barcode: '4000011', name: 'Premium Dog Kibble', price: 540, cost: 300, category: 'Dog Food', category_id: 'dog-food', stock: 42, min_stock_level: 5 },
  { id: '40002', barcode: '4000022', name: 'Puppy Starter Pack', price: 320, cost: 180, category: 'Dog Food', category_id: 'dog-food', stock: 30, min_stock_level: 5 },
  { id: '40003', barcode: '4000033', name: 'Dog Dental Chews', price: 150, cost: 80, category: 'Dog Food', category_id: 'dog-food', stock: 25, min_stock_level: 5 },
  { id: '40004', barcode: '4000044', name: 'Senior Dog Formula', price: 610, cost: 360, category: 'Dog Food', category_id: 'dog-food', stock: 15, min_stock_level: 5 },
  { id: '20001', barcode: '2000011', name: 'Gourmet Cat Tuna', price: 95, cost: 50, category: 'Cat Food', category_id: 'cat-food', stock: 60, min_stock_level: 5 },
  { id: '20002', barcode: '2000022', name: 'Kitten Milk Formula', price: 210, cost: 120, category: 'Cat Food', category_id: 'cat-food', stock: 12, min_stock_level: 5 },
  { id: '20003', barcode: '2000033', name: 'Clumping Cat Litter 10kg', price: 480, cost: 300, category: 'Cat Food', category_id: 'cat-food', stock: 8, min_stock_level: 5 },
  { id: '30001', barcode: '3000011', name: 'Catnip Mice 3-Pack', price: 120, cost: 60, category: 'Cat Toys', category_id: 'cat-toys', stock: 50, min_stock_level: 5 },
  { id: '60001', barcode: '6000011', name: 'Tick & Flea Tablets', price: 360, cost: 200, category: 'Pharmacy', category_id: 'pharmacy', stock: 4, min_stock_level: 5 },
  { id: '60002', barcode: '6000022', name: 'Pet Multivitamins', price: 275, cost: 150, category: 'Pharmacy', category_id: 'pharmacy', stock: 19, min_stock_level: 5 },
  { id: '10001', barcode: '1000011', name: 'Adjustable Dog Leash', price: 199, cost: 90, category: 'Accessories', category_id: 'accessories', stock: 33, min_stock_level: 5 },
  { id: '50001', barcode: '5000011', name: 'Oatmeal Pet Shampoo', price: 165, cost: 80, category: 'Grooming', category_id: 'grooming', stock: 27, min_stock_level: 5 },
];

/** The product specs reference most often (price ₱540.00). */
export const PRIMARY_PRODUCT = MOCK_PRODUCTS[0];

const CORS_HEADERS: Record<string, string> = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET,HEAD,POST,PATCH,PUT,DELETE,OPTIONS',
  'access-control-allow-headers':
    'authorization, x-client-info, apikey, content-type, accept, accept-profile, content-profile, prefer, range, x-supabase-api-version',
  'access-control-expose-headers': 'content-range, content-profile, content-type',
};

function jsonBody(route: Route, body: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: 'application/json',
    headers: CORS_HEADERS,
    body: JSON.stringify(body),
  });
}

function noContent(route: Route, status = 204) {
  return route.fulfill({ status, headers: CORS_HEADERS, body: '' });
}

/** PostgREST "0 rows" error that supabase-js maybeSingle() swallows into null. */
function notFoundSingle(route: Route) {
  return jsonBody(
    route,
    {
      code: 'PGRST116',
      details: 'The result contains 0 rows',
      hint: null,
      message: 'JSON object requested, multiple (or no) rows returned',
    },
    406,
  );
}

function wantsSingleObject(route: Route): boolean {
  const accept = route.request().headers()['accept'] ?? '';
  return accept.includes('application/vnd.pgrst.object+json');
}

/** Respond to a `.maybeSingle()` style query (0 or 1 row tolerated). */
function respondMaybeSingle(route: Route, row: unknown | null) {
  if (wantsSingleObject(route)) {
    return row ? jsonBody(route, row) : notFoundSingle(route);
  }
  return jsonBody(route, row ? [row] : []);
}

/** Respond to a `.single()` style query (exactly 1 row expected). */
function respondSingle(route: Route, row: unknown) {
  return wantsSingleObject(route) ? jsonBody(route, row) : jsonBody(route, [row]);
}

function buildProfile(role: AppRole) {
  return {
    id: TEST_USER_ID,
    username: 'pos_demo_account',
    full_name: TEST_USER_NAME,
    role,
    phone: '09171234567',
    email: TEST_USER_EMAIL,
  };
}

function buildSession() {
  const nowSeconds = Math.floor(Date.now() / 1000);
  return {
    access_token: 'mock-access-token',
    token_type: 'bearer',
    // Far-future expiry so supabase-js never tries a (real) token refresh.
    expires_in: 60 * 60 * 24 * 7,
    expires_at: nowSeconds + 60 * 60 * 24 * 7,
    refresh_token: 'mock-refresh-token',
    user: buildAuthUser(),
  };
}

function buildAuthUser() {
  const nowIso = new Date().toISOString();
  return {
    id: TEST_USER_ID,
    aud: 'authenticated',
    role: 'authenticated',
    email: TEST_USER_EMAIL,
    email_confirmed_at: nowIso,
    phone: '',
    confirmed_at: nowIso,
    last_sign_in_at: nowIso,
    app_metadata: { provider: 'email', providers: ['email'] },
    user_metadata: { full_name: TEST_USER_NAME },
    identities: [],
    created_at: nowIso,
    updated_at: nowIso,
  };
}

type MockOptions = {
  /** Returns the role the mocked profile should report (read per request). */
  getRole: () => AppRole;
  /** Optional hook to observe/override product DELETE behaviour. */
  onDeleteProduct?: (id: string) => { ok: boolean; fkViolation?: boolean } | void;
};

/**
 * Install the mock onto a page. Must be called *before* the first navigation.
 */
export async function installSupabaseMock(page: Page, options: MockOptions): Promise<void> {
  await page.route(
    (url) => url.hostname.endsWith('supabase.co'),
    async (route) => {
      const request = route.request();
      const method = request.method();

      // CORS preflight — every cross-origin supabase call triggers one.
      if (method === 'OPTIONS') {
        return noContent(route);
      }

      const url = new URL(request.url());
      const path = url.pathname;
      const params = url.searchParams;
      const role = options.getRole();

      // ---- GoTrue (auth) ----------------------------------------------------
      if (path.startsWith('/auth/v1/token')) {
        return jsonBody(route, buildSession());
      }
      if (path.startsWith('/auth/v1/logout')) {
        return noContent(route);
      }
      if (path.startsWith('/auth/v1/user')) {
        return jsonBody(route, buildAuthUser());
      }
      if (path.startsWith('/auth/v1')) {
        return jsonBody(route, {});
      }

      // ---- PostgREST (rest) -------------------------------------------------
      if (path === '/rest/v1/profiles') {
        const select = params.get('select') ?? '';
        // Username -> email lookup during login.
        if (select.includes('email')) {
          const usernameFilter = params.get('username') ?? '';
          const username = usernameFilter.replace(/^eq\./, '');
          if (username === UNKNOWN_USERNAME) {
            return respondMaybeSingle(route, null);
          }
          return respondMaybeSingle(route, { email: TEST_USER_EMAIL });
        }
        // Role refresh.
        if (select === 'role' || (select.includes('role') && !select.includes('*'))) {
          return respondSingle(route, { role });
        }
        // Full profile after sign-in.
        return respondSingle(route, buildProfile(role));
      }

      if (path === '/rest/v1/products_with_categories') {
        if (wantsSingleObject(route)) {
          const idFilter = params.get('id') ?? '';
          const id = idFilter.replace(/^eq\./, '');
          const match = MOCK_PRODUCTS.find((p) => p.id === id) ?? null;
          return respondMaybeSingle(route, match);
        }
        return jsonBody(route, MOCK_PRODUCTS);
      }

      if (path === '/rest/v1/categories') {
        return jsonBody(route, MOCK_CATEGORIES);
      }

      if (path === '/rest/v1/products') {
        if (method === 'DELETE') {
          const idFilter = params.get('id') ?? '';
          const id = idFilter.replace(/^eq\./, '');
          const result = options.onDeleteProduct?.(id);
          if (result && result.ok === false) {
            if (result.fkViolation) {
              return jsonBody(
                route,
                {
                  code: '23503',
                  message: 'update or delete on table "products" violates foreign key constraint',
                  details: 'Key is still referenced from table "transaction_items".',
                },
                409,
              );
            }
            return jsonBody(route, { code: 'XXXXX', message: 'Delete failed' }, 400);
          }
          return noContent(route);
        }
        if (method === 'GET') {
          if (wantsSingleObject(route)) return notFoundSingle(route);
          return jsonBody(route, []);
        }
        // POST / PATCH (add / update item flows)
        return respondSingle(route, { id: '99999', ...MOCK_PRODUCTS[0] });
      }

      if (path === '/rest/v1/transactions') {
        return respondSingle(route, { id: `txn-${Date.now()}` });
      }

      if (path === '/rest/v1/transaction_items') {
        return jsonBody(route, [], 201);
      }

      if (path.startsWith('/rest/v1/rpc/')) {
        return jsonBody(route, null);
      }

      // Anything else on the supabase host: succeed quietly.
      return jsonBody(route, {});
    },
  );
}
