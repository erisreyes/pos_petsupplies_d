/**
 * Mini Step POS — retail stress harness (Playwright + CDP).
 * Emulates iPad landscape + Slow 3G per QA spec.
 * Usage: node tests/stress/stress-harness.mjs S2|S3|...|S10|ALL
 */
import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const BASE_URL = process.env.STRESS_BASE_URL ?? 'http://localhost:5173';
const DEMO_USER = 'pos_demo_account';
const DEMO_PASS = 'pos_demo_account';
const OUT_DIR = join(process.cwd(), 'tests', 'stress', 'results');

const IPAD = { width: 1024, height: 768 };
const SLOW_3G = {
  offline: false,
  latency: 400,
  downloadThroughput: 51_200,
  uploadThroughput: 51_200,
};
const OFFLINE = {
  offline: true,
  latency: 0,
  downloadThroughput: 0,
  uploadThroughput: 0,
};

const metrics = {
  salesCompleted: 0,
  salesFailed: 0,
  checkoutTimesMs: [],
  syncLatencyMs: null,
  catalogLoadMs: null,
  consoleErrors: [],
};

async function ensureOutDir() {
  await mkdir(OUT_DIR, { recursive: true });
}

async function shot(page, name) {
  const path = join(OUT_DIR, `${name}.png`);
  try {
    await page.screenshot({ path, fullPage: true, timeout: 10_000, animations: 'disabled' });
  } catch {
    await page.screenshot({ path, timeout: 10_000, animations: 'disabled' });
  }
  return path;
}

async function attachConsole(page) {
  page.on('console', (msg) => {
    const text = msg.text();
    if (msg.type() !== 'error' || text.startsWith('Warning:')) return;
    // Transient on Slow 3G / intentional offline windows — not app crashes.
    if (/Failed to fetch|Error fetching products|Error fetching categories/i.test(text)) return;
    metrics.consoleErrors.push(text);
  });
  page.on('pageerror', (err) => {
    const s = String(err);
    if (/Failed to fetch/i.test(s)) return;
    metrics.consoleErrors.push(s);
  });
}

async function setNetwork(cdp, profile) {
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', profile);
}

async function createTabletContext(browser) {
  const context = await browser.newContext({
    viewport: IPAD,
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    userAgent:
      'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    serviceWorkers: 'block',
  });
  const page = await context.newPage();
  page.setDefaultTimeout(90_000);
  page.setDefaultNavigationTimeout(90_000);
  const cdp = await context.newCDPSession(page);
  await attachConsole(page);
  return { context, page, cdp };
}

async function login(page, cdp) {
  // Load app at full speed first — Slow 3G on cold Vite dev boot exceeds 90s.
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 120_000 });
  await setNetwork(cdp, SLOW_3G);
  const dialog = page.getByRole('dialog');
  if (await dialog.isVisible({ timeout: 15_000 }).catch(() => false)) {
    await dialog.getByLabel('Username', { exact: true }).fill(DEMO_USER);
    await dialog.getByLabel('Password', { exact: true }).fill(DEMO_PASS);
    await dialog.getByRole('button', { name: 'Login' }).click();
    await dialog.waitFor({ state: 'hidden', timeout: 90_000 });
  }
  await page.getByRole('heading', { name: 'Checkout' }).waitFor({ timeout: 90_000 });
  await waitProducts(page);
}

async function waitProducts(page) {
  await page.getByText('Loading products...').waitFor({ state: 'hidden', timeout: 60_000 }).catch(() => {});
  const addBtn = page.getByRole('button').filter({ has: page.getByRole('heading') }).first();
  await addBtn.waitFor({ timeout: 60_000 });
  return addBtn;
}

async function addFirstProduct(page) {
  const btn = await waitProducts(page);
  await btn.click();
}

async function addProductByName(page, name) {
  const btn = page.getByRole('button').filter({ has: page.getByRole('heading', { name }) }).first();
  await btn.waitFor({ timeout: 30_000 });
  await btn.click();
}

async function readProductStock(page, name) {
  return page.evaluate((productName) => {
    const headings = [...document.querySelectorAll('h3')];
    for (const h of headings) {
      if (h.textContent?.trim() !== productName) continue;
      const card = h.closest('button');
      const m = card?.textContent?.match(/\((\d+)\)/);
      return m ? Number(m[1]) : null;
    }
    return null;
  }, name);
}

/** Drain server stock to exactly 1 unit via online sales on one tab. */
async function drainStockToOne(page, productName, initialStock, notes) {
  const salesNeeded = initialStock - 1;
  if (salesNeeded <= 0) return;
  notes.push(`Draining ${productName}: ${salesNeeded} online sale(s) to reach stock=1`);
  for (let i = 0; i < salesNeeded; i++) {
    await addProductByName(page, productName);
    await completeSale(page, 'cash');
  }
  await page.reload();
  await waitProducts(page);
}

async function completeSale(page, method = 'cash', opts = {}) {
  const { cdp, flipBeforeConfirm = false, flipAfterSuccess = false } = opts;
  const t0 = Date.now();
  try {
    await page.getByRole('button', { name: /^Pay/ }).click();
    await page.getByRole('heading', { name: 'Complete payment' }).waitFor({ timeout: 20_000 });

    if (method === 'cash') {
      await page.getByRole('button', { name: /^Cash\b/ }).click();
      await page.getByRole('button', { name: 'Exact Amount' }).click();
    } else {
      await page.getByRole('button', { name: /^Cashless/ }).click();
    }

    if (flipBeforeConfirm && cdp) await setNetwork(cdp, OFFLINE);

    await page.getByRole('button', { name: 'Complete payment' }).click();
    await page.getByText('Payment successful').waitFor({ timeout: 60_000 });

    if (flipAfterSuccess && cdp) await setNetwork(cdp, OFFLINE);

    if (cdp && (flipBeforeConfirm || flipAfterSuccess)) {
      await page.waitForTimeout(1500);
      await setNetwork(cdp, SLOW_3G);
    }

    await page.getByText('Returning to cart').waitFor({ timeout: 15_000 }).catch(() => {});
    await page.getByRole('button', { name: /^Pay · ₱0/ }).waitFor({ timeout: 20_000 }).catch(() => {});
    metrics.salesCompleted += 1;
    metrics.checkoutTimesMs.push(Date.now() - t0);
    return true;
  } catch (e) {
    metrics.salesFailed += 1;
    if (cdp) await setNetwork(cdp, SLOW_3G).catch(() => {});
    await shot(page, `fail-sale-${Date.now()}`).catch(() => {});
    throw e;
  }
}

async function confirmLogout(page) {
  await page.getByRole('button', { name: 'Sign out' }).click();
  const dialog = page.getByRole('alertdialog');
  await dialog.getByRole('button', { name: 'Sign out' }).click();
}

async function getFirstProductSku(page) {
  return page.evaluate(() => {
    const h = document.querySelector('h3');
    const card = h?.closest('button');
    const text = card?.textContent ?? '';
    const stock = text.match(/\((\d+)\)/)?.[1];
    return { name: h?.textContent?.trim() ?? null, stock };
  });
}

async function dismissToasts(page) {
  const toasts = page.locator('[data-sonner-toast][data-visible="true"]');
  const count = await toasts.count().catch(() => 0);
  for (let i = 0; i < count; i++) {
    await toasts.nth(i).click({ force: true }).catch(() => {});
  }
  await page.keyboard.press('Escape').catch(() => {});
  await page.waitForTimeout(250);
}

async function closeScannerIfOpen(page) {
  const overlay = page.locator('.fixed.inset-0.z-50.bg-black\\/90');
  if (await overlay.isVisible().catch(() => false)) {
    // Header X is the first button in the scanner overlay (not "Enter SKU Manually").
    await overlay.locator('header button').first().click({ force: true }).catch(() => {});
    await overlay.waitFor({ state: 'hidden', timeout: 8000 }).catch(() => {});
  }
  await dismissToasts(page);
}

async function getFirstScannableSku(page) {
  return page.evaluate(async () => {
    const openDb = () =>
      new Promise((resolve, reject) => {
        const req = indexedDB.open('MiniStepPosOffline');
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    try {
      const db = await openDb();
      const tx = db.transaction('products', 'readonly');
      const store = tx.objectStore('products');
      const all = await store.getAll();
      const p = all.find((row) => row.barcode || row.id);
      return p?.barcode || p?.id || null;
    } catch {
      return null;
    }
  });
}

async function openBarcodeScanner(page) {
  await closeScannerIfOpen(page);
  await dismissToasts(page);
  const scanBtn = page.locator('header button[aria-label="Scan barcode"]').first();
  await scanBtn.waitFor({ state: 'visible', timeout: 15_000 });
  await scanBtn.click({ force: true });
  await page.getByRole('heading', { name: 'Scan Barcode' }).waitFor({ timeout: 15_000 });
}

async function manualBarcode(page, sku) {
  await openBarcodeScanner(page);
  await page.getByRole('button', { name: /Enter SKU Manually/i }).click({ timeout: 15_000 });
  await page.locator('#sku').waitFor({ timeout: 10_000 });
  await page.locator('#sku').fill(sku);
  await page.getByRole('button', { name: 'Add to Cart' }).click();
  await page.waitForTimeout(600);
  await closeScannerIfOpen(page);
}

async function closeInventoryEditSheet(page) {
  await page.keyboard.press('Escape').catch(() => {});
  await page.locator('#update-stock').waitFor({ state: 'hidden', timeout: 10_000 }).catch(() => {});
  await dismissToasts(page);
}

async function bumpInventoryStock(page, rowIndex = 0) {
  await page.getByText('Loading products...').waitFor({ state: 'hidden', timeout: 30_000 }).catch(() => {});
  await closeInventoryEditSheet(page);
  const editBtn = page.getByRole('button', { name: /^Edit / }).nth(rowIndex);
  await editBtn.scrollIntoViewIfNeeded();
  await editBtn.click({ timeout: 30_000 });
  await page.locator('#update-stock').waitFor({ timeout: 15_000 });
  const stockVal = await page.locator('#update-stock').inputValue();
  await page.locator('#update-stock').fill(String(Number(stockVal || 0) + 1));
  await page.getByRole('button', { name: 'Update Product' }).click();
  await page
    .getByText('Product updated successfully', { exact: false })
    .waitFor({ timeout: 30_000 })
    .catch(() => {});
  await closeInventoryEditSheet(page);
}

async function readNetworkBadge(page) {
  const badge = page.locator('header').getByRole('button').filter({ hasText: /Online|Offline|pending|failed|Syncing/i }).first();
  if (await badge.count()) {
    return (await badge.textContent())?.trim() ?? 'unknown';
  }
  return 'no-badge';
}

async function readOutboxCounts(page) {
  return page.evaluate(async () => {
    const open = indexedDB.open('MiniStepPosOffline');
    return new Promise((resolve) => {
      open.onsuccess = () => {
        const db = open.result;
        if (!db.objectStoreNames.contains('outbox_sales')) {
          resolve({ pending: 0, failed: 0, total: 0 });
          return;
        }
        const tx = db.transaction('outbox_sales', 'readonly');
        const store = tx.objectStore('outbox_sales');
        const req = store.getAll();
        req.onsuccess = () => {
          const rows = req.result ?? [];
          resolve({
            pending: rows.filter((r) => r.status === 'pending' || r.status === 'syncing').length,
            failed: rows.filter((r) => r.status === 'failed').length,
            total: rows.length,
          });
        };
        req.onerror = () => resolve({ pending: -1, failed: -1, total: -1 });
      };
      open.onerror = () => resolve({ pending: -1, failed: -1, total: -1 });
    });
  });
}

async function waitForSyncDrain(page, timeoutMs = 120_000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    const badge = await readNetworkBadge(page);
    const outbox = await readOutboxCounts(page);
    if (!/pending|failed|Syncing/i.test(badge) && outbox.pending === 0 && outbox.failed === 0) {
      metrics.syncLatencyMs = Date.now() - t0;
      return { badge, outbox, ok: true };
    }
    await page.waitForTimeout(2000);
  }
  return { badge: await readNetworkBadge(page), outbox: await readOutboxCounts(page), ok: false };
}

/** S2 — Offline burst */
async function runS2(browser) {
  const result = { scenario: 'S2', pass: false, notes: [], screenshots: [] };
  const { context, page, cdp } = await createTabletContext(browser);

  try {
    await login(page, cdp);
    result.screenshots.push(await shot(page, 'S2-00-login'));

    const methods = ['cash', 'cash', 'cashless', 'cash', 'cashless'];
    for (let i = 0; i < 5; i++) {
      await addFirstProduct(page);
      await completeSale(page, methods[i]);
      result.notes.push(`Online sale ${i + 1}/5 OK (${methods[i]})`);
    }
    result.screenshots.push(await shot(page, 'S2-05-online-done'));

    await setNetwork(cdp, OFFLINE);
    result.notes.push('Network: OFFLINE');

    for (let i = 0; i < 10; i++) {
      await addFirstProduct(page);
      await completeSale(page, i % 2 === 0 ? 'cash' : 'cashless');
      result.notes.push(`Offline sale ${i + 1}/10 OK`);
    }
    result.screenshots.push(await shot(page, 'S2-15-offline-done'));

    const offlineBadge = await readNetworkBadge(page);
    const offlineOutbox = await readOutboxCounts(page);
    result.notes.push(`Offline badge: ${offlineBadge}, outbox: ${JSON.stringify(offlineOutbox)}`);

    await setNetwork(cdp, SLOW_3G);
    result.notes.push('Network: Slow 3G reconnect');

    const sync = await waitForSyncDrain(page, 180_000);
    result.notes.push(`Sync drain: ${JSON.stringify(sync)}`);
    result.screenshots.push(await shot(page, 'S2-sync-done'));

    const finalOutbox = await readOutboxCounts(page);
    const finalBadge = await readNetworkBadge(page);

    result.pass =
      metrics.salesCompleted >= 15 &&
      sync.ok &&
      finalOutbox.pending === 0 &&
      finalOutbox.failed === 0 &&
      !/failed/i.test(finalBadge);

    if (!result.pass) {
      result.notes.push(`FAIL: completed=${metrics.salesCompleted}, sync=${sync.ok}, badge=${finalBadge}, outbox=${JSON.stringify(finalOutbox)}`);
    }
  } catch (e) {
    result.notes.push(`ERROR: ${e.message}`);
    try {
      result.screenshots.push(await shot(page, 'S2-error'));
    } catch {
      result.notes.push('Screenshot capture failed');
    }
  } finally {
    await context.close();
  }
  return result;
}

/** S4 — Stock contention */
async function runS4(browser) {
  const result = { scenario: 'S4', pass: false, notes: [], screenshots: [] };
  const ctxA = await createTabletContext(browser);
  const ctxB = await createTabletContext(browser);
  const { page: pageA, cdp: cdpA } = ctxA;
  const { page: pageB } = ctxB;

  try {
    await Promise.all([login(pageA, cdpA), login(pageB, ctxB.cdp)]);

    // Prefer stock=1 SKU; fall back to 2–5 for visibility in the grid.
    const lowStockName = await pageA.evaluate(() => {
      const headings = [...document.querySelectorAll('h3')];
      let fallback = null;
      for (const h of headings) {
        const card = h.closest('button');
        if (!card) continue;
        const text = card.textContent ?? '';
        const m = text.match(/\((\d+)\)/);
        if (!m) continue;
        const stock = Number(m[1]);
        const name = h.textContent?.trim() ?? null;
        if (stock === 1) return name;
        if (!fallback && stock >= 2 && stock <= 5) fallback = name;
      }
      return fallback;
    });

    if (!lowStockName) {
      result.notes.push('BLOCKER: No low-stock SKU visible in catalog. Seed inventory or pick manually.');
      result.screenshots.push(await shot(pageA, 'S4-no-low-stock'));
      return result;
    }
    const initialStock = await readProductStock(pageA, lowStockName);
    result.notes.push(`Target SKU: ${lowStockName} (stock=${initialStock ?? 'unknown'})`);

    if (!initialStock || initialStock < 1) {
      result.notes.push('BLOCKER: Could not read stock count from product card.');
      return result;
    }

    await drainStockToOne(pageA, lowStockName, initialStock, result.notes);
    await pageB.reload();
    await waitProducts(pageB);

    const stockAfterDrain = await readProductStock(pageA, lowStockName);
    result.notes.push(`Stock after drain: ${stockAfterDrain ?? 'unknown'} (expect 1)`);

    await Promise.all([
      addProductByName(pageA, lowStockName),
      addProductByName(pageB, lowStockName),
    ]);

    await setNetwork(cdpA, OFFLINE);
    await completeSale(pageA, 'cash');
    result.notes.push('Tab A: offline sale completed');
    result.screenshots.push(await shot(pageA, 'S4-A-offline-sale'));

    await setNetwork(cdpA, SLOW_3G);
    const sync = await waitForSyncDrain(pageA, 120_000);
    result.notes.push(`Tab A reconnect sync (before Tab B checkout): ${JSON.stringify(sync)}`);
    result.screenshots.push(await shot(pageA, 'S4-sync'));

    let tabBError = false;
    try {
      await pageB.getByRole('button', { name: /^Pay/ }).click();
      await pageB.getByRole('heading', { name: 'Complete payment' }).waitFor({ timeout: 15_000 });
      await pageB.getByRole('button', { name: /^Cash\b/ }).click();
      await pageB.getByRole('button', { name: 'Exact Amount' }).click();
      await pageB.getByRole('button', { name: 'Complete payment' }).click();
      await pageB.getByText('Payment successful').waitFor({ timeout: 45_000 });
      result.notes.push('Tab B: online sale succeeded — stock guard did NOT block (oversell risk)');
    } catch {
      tabBError = true;
      result.notes.push('Tab B: sale blocked or failed (expected after sync drained Tab A sale)');
      result.screenshots.push(await shot(pageB, 'S4-B-blocked'));
    }

    result.pass = tabBError && sync.ok;
    if (!tabBError) result.notes.push('FAIL: Tab B completed after Tab A sync — verify stock in Supabase');
  } catch (e) {
    result.notes.push(`ERROR: ${e.message}`);
    await shot(pageA, 'S4-error');
  } finally {
    await ctxA.context.close();
    await ctxB.context.close();
  }
  return result;
}

/** S1 — Rush hour (compressed: 10 sales across 3 tabs) */
async function runS1(browser) {
  const result = { scenario: 'S1', pass: false, notes: [], screenshots: [] };
  const tabs = await Promise.all([
    createTabletContext(browser),
    createTabletContext(browser),
    createTabletContext(browser),
  ]);

  try {
    await Promise.all(tabs.map((t) => login(t.page, t.cdp)));

    const salesTarget = 10;
    let done = 0;
    const start = Date.now();

    while (done < salesTarget) {
      const tab = tabs[done % 3];
      const method = done % 5 < 3 ? 'cash' : 'cashless';
      try {
        await addFirstProduct(tab.page);
        await completeSale(tab.page, method);
        done += 1;
        result.notes.push(`Sale ${done}/${salesTarget} tab ${(done % 3) + 1} (${method})`);
      } catch (e) {
        result.notes.push(`Sale attempt failed tab ${(done % 3) + 1}: ${e.message}`);
        metrics.salesFailed += 1;
      }
    }

    const elapsedMin = ((Date.now() - start) / 60_000).toFixed(1);
    const avgCheckout =
      metrics.checkoutTimesMs.length > 0
        ? (metrics.checkoutTimesMs.reduce((a, b) => a + b, 0) / metrics.checkoutTimesMs.length / 1000).toFixed(1)
        : 'n/a';

    result.notes.push(`Burst: ${done} sales in ${elapsedMin} min, avg checkout ${avgCheckout}s`);
    result.screenshots.push(await shot(tabs[0].page, 'S1-done'));

    const successRate = done / salesTarget;
    result.pass = successRate >= 0.95 && metrics.consoleErrors.length === 0;
    if (!result.pass) result.notes.push(`Console errors: ${metrics.consoleErrors.slice(0, 5).join(' | ')}`);
  } catch (e) {
    result.notes.push(`ERROR: ${e.message}`);
  } finally {
    await Promise.all(tabs.map((t) => t.context.close()));
  }
  return result;
}

/** S3 — Flaky network during checkout */
async function runS3(browser) {
  const result = { scenario: 'S3', pass: false, notes: [], screenshots: [] };
  const { context, page, cdp } = await createTabletContext(browser);
  let completed = 0;
  const target = 15;

  try {
    await login(page, cdp);
    for (let i = 0; i < target; i++) {
      const flipBefore = (i + 1) % 3 === 0;
      const flipAfter = (i + 1) % 5 === 0;
      try {
        await addFirstProduct(page);
        await completeSale(page, i % 2 === 0 ? 'cash' : 'cashless', {
          cdp,
          flipBeforeConfirm: flipBefore,
          flipAfterSuccess: flipAfter,
        });
        completed += 1;
        result.notes.push(`Sale ${i + 1}: OK (beforeOff=${flipBefore}, afterOff=${flipAfter})`);
      } catch (e) {
        result.notes.push(`Sale ${i + 1}: FAIL — ${e.message}`);
      }
    }
    const sync = await waitForSyncDrain(page, 120_000);
    result.notes.push(`Sync: ${JSON.stringify(sync)}`);
    result.screenshots.push(await shot(page, 'S3-done'));
    result.pass = completed >= Math.floor(target * 0.95) && sync.ok && metrics.consoleErrors.length === 0;
    if (!result.pass) result.notes.push(`Completed ${completed}/${target}`);
  } catch (e) {
    result.notes.push(`ERROR: ${e.message}`);
  } finally {
    await context.close();
  }
  return result;
}

/** S5 — Admin inventory edits while staff sell */
async function runS5(browser) {
  const result = { scenario: 'S5', pass: false, notes: [], screenshots: [] };
  const adminCtx = await createTabletContext(browser);
  const staffB = await createTabletContext(browser);
  const staffC = await createTabletContext(browser);

  try {
    await Promise.all([login(adminCtx.page, adminCtx.cdp), login(staffB.page, staffB.cdp), login(staffC.page, staffC.cdp)]);

    await adminCtx.page.goto(`${BASE_URL}/inventory`);
    await adminCtx.page.getByRole('heading', { name: 'Inventory Management' }).waitFor({ timeout: 60_000 });

    let staffSales = 0;
    let adminEdits = 0;
    for (let round = 0; round < 3; round++) {
      try {
        await bumpInventoryStock(adminCtx.page, round % 3);
        adminEdits += 1;
        result.notes.push(`Admin round ${round + 1}: stock bumped on row ${(round % 3) + 1}`);
      } catch (e) {
        result.notes.push(`Admin edit round ${round + 1} skipped: ${e.message}`);
        await closeInventoryEditSheet(adminCtx.page);
      }

      for (const tab of [staffB, staffC]) {
        try {
          await addFirstProduct(tab.page);
          await completeSale(tab.page, 'cash');
          staffSales += 1;
        } catch (e) {
          result.notes.push(`Staff sale failed: ${e.message}`);
        }
      }
    }
    result.screenshots.push(await shot(adminCtx.page, 'S5-inventory'));
    result.pass = adminEdits >= 2 && staffSales >= 4;
    if (metrics.consoleErrors.some((e) => /products_barcode_key/i.test(e))) {
      result.notes.push('WARN: inventory update hit duplicate barcode constraint — see defect D2');
    }
    result.notes.push(`Staff sales during admin edits: ${staffSales}`);
  } catch (e) {
    result.notes.push(`ERROR: ${e.message}`);
  } finally {
    await Promise.all([adminCtx, staffB, staffC].map((c) => c.context.close()));
  }
  return result;
}

/** S6 — Session & multi-tab */
async function runS6(browser) {
  const result = { scenario: 'S6', pass: false, notes: [], screenshots: [] };
  const ctxA = await createTabletContext(browser);
  const ctxB = await createTabletContext(browser);
  const { page: pageA, cdp: cdpA } = ctxA;
  const { page: pageB, cdp: cdpB } = ctxB;

  try {
    await login(pageA, cdpA);
    // Tab B: fresh context — login once only (no double goto).
    await pageB.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 120_000 });
    await setNetwork(cdpB, SLOW_3G);
    const dialogB = pageB.getByRole('dialog');
    if (await dialogB.isVisible({ timeout: 10_000 }).catch(() => false)) {
      await dialogB.getByLabel('Username', { exact: true }).fill(DEMO_USER);
      await dialogB.getByLabel('Password', { exact: true }).fill(DEMO_PASS);
      await dialogB.getByRole('button', { name: 'Login' }).click();
      await dialogB.waitFor({ state: 'hidden', timeout: 90_000 });
    }
    await pageB.getByRole('heading', { name: 'Checkout' }).waitFor({ timeout: 90_000 });
    result.notes.push('Tab B: separate browser context (Safari shared-session retest needed)');

    await addFirstProduct(pageA);
    await confirmLogout(pageA);
    await pageA.getByRole('dialog').waitFor({ state: 'visible', timeout: 15_000 });
    result.notes.push('Tab A logged out — login dialog shown');

    await addFirstProduct(pageB);
    await pageB.getByRole('button', { name: /^Pay/ }).click();
    const checkoutBlocked = await pageB
      .getByText(/Sign in to complete checkout|Staff Portal/i)
      .isVisible({ timeout: 5000 })
      .catch(() => false);
    result.notes.push(
      checkoutBlocked
        ? 'Tab B checkout requires auth after Tab A logout (isolated tabs — manual Safari retest recommended)'
        : 'Tab B still checkout-ready in its own session',
    );

    await login(pageA, cdpA);
    await addFirstProduct(pageA);
    await pageA.reload();
    await waitProducts(pageA);
    const cartAfterReload = await pageA.getByRole('button', { name: /^Pay \(1\)/ }).isVisible({ timeout: 10_000 }).catch(() => false);
    result.notes.push(cartAfterReload ? 'Cart survived reload (1 item)' : 'Cart empty after reload (expected or cleared)');
    if (!cartAfterReload) await addFirstProduct(pageA);

    await completeSale(pageA, 'cash');
    result.screenshots.push(await shot(pageA, 'S6-done'));
    result.pass = metrics.consoleErrors.length === 0;
  } catch (e) {
    result.notes.push(`ERROR: ${e.message}`);
  } finally {
    await ctxA.context.close();
    await ctxB.context.close();
  }
  return result;
}

/** S7 — Barcode / input spam */
async function runS7(browser) {
  const result = { scenario: 'S7', pass: false, notes: [], screenshots: [] };
  const { context, page, cdp } = await createTabletContext(browser);
  let validAdds = 0;
  let scannerOpens = 0;

  try {
    await login(page, cdp);
    const validSku = (await getFirstScannableSku(page)) ?? '40001';
    result.notes.push(`Scannable SKU: ${validSku}`);

    for (let i = 0; i < 10; i++) {
      try {
        await manualBarcode(page, validSku);
        validAdds += 1;
        scannerOpens += 1;
      } catch (e) {
        result.notes.push(`Valid scan ${i + 1} fallback: ${e.message.slice(0, 80)}`);
        await closeScannerIfOpen(page);
        await addFirstProduct(page);
        validAdds += 1;
      }
    }
    for (let i = 0; i < 5; i++) {
      try {
        await manualBarcode(page, `INVALID-${i}`);
      } catch {
        await closeScannerIfOpen(page);
      }
    }
    for (let i = 0; i < 5; i++) {
      try {
        await manualBarcode(page, validSku);
      } catch {
        await closeScannerIfOpen(page);
      }
    }

    await page.getByRole('button', { name: 'Cancel Order' }).click().catch(() => {});
    result.notes.push(`Valid scan attempts: ${validAdds}, scanner opens: ${scannerOpens}/10, invalid+dup: 10`);
    result.screenshots.push(await shot(page, 'S7-done'));
    result.pass = validAdds >= 8 && scannerOpens >= 8 && metrics.consoleErrors.length === 0;
  } catch (e) {
    result.notes.push(`ERROR: ${e.message}`);
  } finally {
    await context.close();
  }
  return result;
}

/** S8 — Catalog UX (measures actual catalog size; 3k SKU needs seed data) */
async function runS8(browser) {
  const result = { scenario: 'S8', pass: false, notes: [], screenshots: [] };
  const { context, page, cdp } = await createTabletContext(browser);

  try {
    await context.clearCookies();
    const t0 = Date.now();
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 120_000 });
    await setNetwork(cdp, SLOW_3G);
    await login(page, cdp);
    metrics.catalogLoadMs = Date.now() - t0;

    const productCount = await page.locator('h3').count();
    result.notes.push(`Catalog load: ${(metrics.catalogLoadMs / 1000).toFixed(1)}s, visible products: ${productCount}`);
    result.notes.push(productCount < 500 ? 'Safari note: full 3,000-SKU test requires seeded catalog — not present in dev DB' : 'Large catalog present');

    const tabs = ['All', 'Dog', 'Cat', 'Meds', 'All', 'Dog', 'Cat', 'Meds', 'All', 'Dog'];
    for (const tab of tabs) {
      await page.getByRole('tab', { name: tab, exact: true }).click();
      await page.waitForTimeout(300);
    }

    const terms = ['dog', 'cat', 'food', 'toy', 'vitamin'];
    for (const term of terms) {
      const t1 = Date.now();
      await page.getByPlaceholder('Search items...').fill(term);
      await page.waitForTimeout(800);
      result.notes.push(`Search "${term}": ${Date.now() - t1}ms`);
    }

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    result.screenshots.push(await shot(page, 'S8-grid'));
    result.pass = metrics.catalogLoadMs < 60_000 && productCount > 0 && metrics.consoleErrors.length === 0;
  } catch (e) {
    result.notes.push(`ERROR: ${e.message}`);
  } finally {
    await context.close();
  }
  return result;
}

/** S9 — Reports under volume */
async function runS9(browser) {
  const result = { scenario: 'S9', pass: false, notes: [], screenshots: [] };
  const { context, page, cdp } = await createTabletContext(browser);

  try {
    await login(page, cdp);
    const salesBefore = metrics.salesCompleted;
    const t0 = Date.now();
    await page.goto(`${BASE_URL}/reports`);
    await page.getByRole('button', { name: 'Today', exact: true }).waitFor({ timeout: 60_000 });
    const loadMs = Date.now() - t0;
    result.notes.push(`Reports initial load: ${(loadMs / 1000).toFixed(1)}s`);

    for (const label of ['Today', 'Yesterday', 'This Month']) {
      await page.getByRole('button', { name: label }).click();
      await page.waitForTimeout(2000);
      result.notes.push(`Range ${label}: rendered`);
    }

    result.screenshots.push(await shot(page, 'S9-reports'));
    result.pass = loadMs < 60_000 && metrics.consoleErrors.length === 0;
    result.notes.push(`Prior session sales in harness metrics: ${salesBefore}`);
  } catch (e) {
    result.notes.push(`ERROR: ${e.message}`);
  } finally {
    await context.close();
  }
  return result;
}

/** S10 — Endurance (compressed: 8 sales + 2 short offline windows) */
async function runS10(browser) {
  const result = { scenario: 'S10', pass: false, notes: [], screenshots: [] };
  const { context, page, cdp } = await createTabletContext(browser);
  const start = Date.now();

  try {
    await login(page, cdp);
    for (let i = 0; i < 8; i++) {
      if (i === 3) {
        await setNetwork(cdp, OFFLINE);
        result.notes.push('Offline window 1 (simulated 5 min → 30s)');
        await page.waitForTimeout(30_000);
        await setNetwork(cdp, SLOW_3G);
      }
      if (i === 6) {
        await setNetwork(cdp, SLOW_3G);
        await confirmLogout(page);
        await login(page, cdp);
        result.notes.push('Mid-run logout/login (online)');
      }
      await addFirstProduct(page);
      await completeSale(page, 'cash');
      result.notes.push(`Endurance sale ${i + 1}/8`);
    }
    const elapsed = ((Date.now() - start) / 60_000).toFixed(1);
    result.notes.push(`Compressed endurance: ${elapsed} min (full spec = 45–60 min)`);
    result.screenshots.push(await shot(page, 'S10-done'));
    result.pass = metrics.salesCompleted >= 8 && metrics.consoleErrors.length === 0;
  } catch (e) {
    result.notes.push(`ERROR: ${e.message}`);
  } finally {
    await context.close();
  }
  return result;
}

const SCENARIOS = {
  S2: runS2,
  S3: runS3,
  S4: runS4,
  S5: runS5,
  S6: runS6,
  S7: runS7,
  S8: runS8,
  S9: runS9,
  S10: runS10,
  S1: runS1,
};

function resetMetrics() {
  metrics.salesCompleted = 0;
  metrics.salesFailed = 0;
  metrics.checkoutTimesMs = [];
  metrics.syncLatencyMs = null;
  metrics.catalogLoadMs = null;
  metrics.consoleErrors = [];
}

async function runScenario(browser, id) {
  resetMetrics();
  const fn = SCENARIOS[id];
  if (!fn) throw new Error(`Unknown scenario ${id}`);
  const result = await fn(browser);
  const report = {
    ...result,
    metrics: { ...metrics },
    timestamp: new Date().toISOString(),
    environment: { url: BASE_URL, viewport: IPAD, network: 'Slow 3G' },
  };
  await writeFile(join(OUT_DIR, `${id}-report.json`), JSON.stringify(report, null, 2));
  return report;
}

async function main() {
  const arg = process.argv[2]?.toUpperCase() ?? 'S3';
  await ensureOutDir();
  const browser = await chromium.launch({ headless: true });

  if (arg === 'ALL') {
    const order = ['S3', 'S5', 'S6', 'S7', 'S8', 'S9', 'S10'];
    const summary = [];
    for (const id of order) {
      console.log(`\n=== Running ${id} ===\n`);
      const report = await runScenario(browser, id);
      summary.push({ id, pass: report.pass, notes: report.notes.slice(-2) });
      console.log(JSON.stringify(report, null, 2));
    }
    await writeFile(join(OUT_DIR, 'ALL-summary.json'), JSON.stringify(summary, null, 2));
    await browser.close();
    const allPass = summary.every((s) => s.pass);
    process.exit(allPass ? 0 : 1);
  }

  const report = await runScenario(browser, arg);
  await browser.close();
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.pass ? 0 : 1);
}

main().catch(async (e) => {
  console.error(e);
  await ensureOutDir();
  await writeFile(
    join(OUT_DIR, 'crash.json'),
    JSON.stringify({ error: String(e), metrics, timestamp: new Date().toISOString() }, null, 2),
  );
  process.exit(1);
});
