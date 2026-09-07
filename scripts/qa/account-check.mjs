const { chromium } = await import(
  process.env.GGC_PLAYWRIGHT_MODULE || 'playwright'
);
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
const output =
  process.env.GGC_ACCOUNT_QA_OUTPUT || join(tmpdir(), 'ggc-account-browser');
mkdirSync(output, { recursive: true });
import assert from 'node:assert/strict';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto('http://127.0.0.1:4319/account');
await page.getByText('Your account is up to date.').waitFor();
await page
  .getByLabel('Preferred / display name')
  .fill('Jordan / The Collective');
await page.getByLabel('Contact phone (optional)').fill('+1 312 555 0199');
await page
  .getByLabel('Business / salon affiliation (optional)')
  .fill('Ellis Grooming');
await page.getByLabel('Reduce motion', { exact: true }).check();
await page.getByLabel('Communication preference').selectOption('email');
await page.getByRole('button', { name: 'Save changes', exact: true }).click();
await page.getByText('Your account details are saved.').waitFor();
await page.reload();
await page.getByText('Your account is up to date.').waitFor();
assert.equal(
  await page.getByLabel('Preferred / display name').inputValue(),
  'Jordan / The Collective',
);
assert.equal(
  await page.getByLabel('Business / salon affiliation (optional)').inputValue(),
  'Ellis Grooming',
);
assert.equal(
  await page.getByLabel('Reduce motion', { exact: true }).isChecked(),
  true,
);
assert.equal(
  await page.evaluate(() => document.documentElement.dataset.accountMotion),
  'reduce',
);
await page.getByRole('switch', { name: 'Cassius personalization' }).click();
await page.getByText('Your Cassius preference is saved.').waitFor();
await page.reload();
await page.getByText('Your account is up to date.').waitFor();
assert.equal(
  await page.getByRole('switch').getAttribute('aria-checked'),
  'true',
);
const downloading = page.waitForEvent('download');
await page.getByRole('button', { name: 'Download my account data' }).click();
const download = await downloading;
await download.saveAs(join(output, 'export.json'));
assert.equal(
  await page.evaluate(
    () => document.documentElement.scrollWidth <= window.innerWidth,
  ),
  true,
);
await page.screenshot({ path: join(output, 'mobile.png'), fullPage: true });
await page.setViewportSize({ width: 1440, height: 1000 });
await page.screenshot({ path: join(output, 'desktop.png'), fullPage: true });
assert.equal(
  await page.evaluate(
    () => document.documentElement.scrollWidth <= window.innerWidth,
  ),
  true,
);
// Failed save preserves edits, then a successful retry persists them.
await page.getByLabel('City / region (optional)').fill('Chicago');
await page.route('**/api/account/settings', async (route) => {
  if (route.request().method() === 'PUT')
    await route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Temporary test outage' }),
    });
  else await route.continue();
});
await page.getByRole('button', { name: 'Save changes', exact: true }).click();
await page.getByText('Temporary test outage').waitFor();
assert.equal(
  await page.getByLabel('City / region (optional)').inputValue(),
  'Chicago',
);
await page.unroute('**/api/account/settings');
await page.getByRole('button', { name: 'Save changes', exact: true }).click();
await page.getByText('Your account details are saved.').waitFor();
await page
  .getByRole('button', { name: 'Log out', exact: true })
  .first()
  .click();
await page.waitForURL('**/sign-in');
assert.equal(
  (
    await page.request.get('http://127.0.0.1:4319/api/account/settings')
  ).status(),
  401,
);
await page.getByRole('link', { name: 'Sign in to test account' }).click();
await page.getByText('Your account is up to date.').waitFor();
assert.equal(
  await page.getByLabel('City / region (optional)').inputValue(),
  'Chicago',
);
await page.setViewportSize({ width: 320, height: 740 });
assert.equal(
  await page.evaluate(
    () => document.documentElement.scrollWidth <= window.innerWidth,
  ),
  true,
);
assert.deepEqual(errors, []);
console.log(
  'PASS: mobile 320/390, desktop 1440, saved details + refresh + mock-provider re-login, Cassius consent, failed-save recovery, export, signed-out API denial, no browser errors. Clerk live auth NOT tested.',
);
await browser.close();
