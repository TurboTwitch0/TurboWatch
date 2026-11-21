import { expect, test, type Page, type Route } from '@playwright/test';
import { seedPosts } from '../lib/seed';
import { fixturePassword, fixtureUsers, startSupabaseFixture } from './support/live-fixture.mjs';

const liveBaseUrl = process.env.LIVE_TEST_BASE_URL;

async function signIn(page: Page) {
  await page.goto(liveBaseUrl!);
  await page.getByRole('button', { name: 'Create', exact: true }).click();
  const auth = page.getByRole('dialog', { name: 'Good to have you back.', exact: true });
  await auth.getByRole('textbox', { name: 'Email address', exact: true }).fill(fixtureUsers.alice.email);
  await auth.getByLabel('Password', { exact: true }).fill(fixturePassword);
  await auth.getByRole('button', { name: 'Sign in', exact: true }).last().click();
  await expect(auth).toBeHidden();
  await expect(page.locator('.account-button strong')).toHaveText(fixtureUsers.alice.name);
}

test.describe('connected dialog lifetime', () => {
  test.skip(!liveBaseUrl, 'Requires the documented local Supabase fixture app.');
  let fixture: Awaited<ReturnType<typeof startSupabaseFixture>>;
  test.beforeAll(async () => { fixture = await startSupabaseFixture({ port: 4400, appOrigin: new URL(liveBaseUrl!).origin }); });
  test.afterAll(async () => { await fixture?.close(); });

  for (const operation of ['collection', 'publish', 'profile'] as const) {
    test(`a delayed ${operation} does not replace the next dialog or its draft`, async ({ page }) => {
      await signIn(page);
      const table = operation === 'collection' ? 'boards' : operation === 'publish' ? 'posts' : 'profiles';
      let capture!: (route: Route) => void;
      const pending = new Promise<Route>(resolve => { capture = resolve; });
      await page.route(`http://127.0.0.1:4400/rest/v1/${table}*`, route => route.request().method() === (operation === 'profile' ? 'PATCH' : 'POST') ? capture(route) : route.continue());
      const name = `Delayed ${operation}`;
      if (operation === 'collection') {
        await page.getByRole('button', { name: 'New collection', exact: true }).click();
        const old = page.getByRole('dialog', { name: 'A home for your next obsession.', exact: true });
        await old.getByRole('textbox', { name: 'Collection name', exact: true }).fill(name);
        await old.getByRole('button', { name: 'Create collection', exact: true }).click();
      } else if (operation === 'profile') {
        await page.locator('.account-button').click();
        await page.getByRole('button', { name: 'Edit profile', exact: true }).click();
        const old = page.getByRole('dialog', { name: 'A little more you.', exact: true });
        await old.getByRole('textbox', { name: 'Name', exact: true }).fill(name);
        await old.getByRole('button', { name: 'Save profile', exact: true }).click();
      } else {
        await page.getByRole('button', { name: 'Create', exact: true }).click();
        const old = page.getByRole('dialog', { name: 'Make something worth sharing.', exact: true });
        await old.getByRole('textbox', { name: 'Title', exact: true }).fill(name);
        await old.getByRole('textbox', { name: /Or use a image link/ }).fill(`${liveBaseUrl!}/media/studio.jpg`);
        await old.getByRole('button', { name: 'Publish post', exact: true }).click();
      }
      const route = await pending;
      await page.getByRole('dialog').getByRole('button', { name: 'Close dialog', exact: true }).click();
      await page.getByRole('button', { name: operation === 'collection' ? 'Create' : 'New collection', exact: true }).click();
      const next = page.getByRole('dialog');
      const draft = next.getByRole('textbox', { name: operation === 'collection' ? 'Title' : 'Collection name', exact: true });
      await draft.fill('Keep this new draft');
      await route.fulfill({ response: await route.fetch() });
      if (operation === 'collection') await expect(page.locator('.sidebar').getByRole('button', { name })).toBeVisible();
      else if (operation === 'profile') await expect(page.locator('.account-button strong')).toHaveText(name);
      else await expect(page.locator('.post-card .post-title').filter({ hasText: name })).toBeVisible();
      await expect(next).toBeVisible();
      await expect(draft).toHaveValue('Keep this new draft');
    });
  }
});

test('closing during a local upload preserves the next draft and does not publish afterward', async ({ page }) => {
  await page.addInitScript(() => {
    const read = FileReader.prototype.readAsDataURL;
    type UploadWindow = Window & { releaseUpload?: () => void; uploadFinished?: boolean };
    FileReader.prototype.readAsDataURL = function (blob) {
      (window as UploadWindow).releaseUpload = () => read.call(this, blob);
      this.addEventListener('loadend', () => { (window as UploadWindow).uploadFinished = true; }, { once: true });
    };
  });
  await page.goto('/?demo=1');
  await expect(page.locator('.post-card')).toHaveCount(seedPosts.length);
  await page.getByRole('button', { name: 'Create', exact: true }).click();
  const create = page.getByRole('dialog', { name: 'Make something worth sharing.', exact: true });
  await create.locator('input[type=file]').setInputFiles('public/media/studio.jpg');
  await create.getByRole('textbox', { name: 'Title', exact: true }).fill('A closed upload');
  await create.getByRole('button', { name: 'Publish post', exact: true }).click();
  await page.waitForFunction(() => typeof (window as Window & { releaseUpload?: unknown }).releaseUpload === 'function');
  await create.getByRole('button', { name: 'Close dialog', exact: true }).click();
  await page.getByRole('button', { name: 'New collection', exact: true }).click();
  const next = page.getByRole('dialog', { name: 'A home for your next obsession.', exact: true });
  await next.getByRole('textbox', { name: 'Collection name', exact: true }).fill('Keep this collection draft');
  await page.evaluate(() => (window as Window & { releaseUpload?: () => void }).releaseUpload?.());
  await page.waitForFunction(() => (window as Window & { uploadFinished?: boolean }).uploadFinished);
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await expect(next.getByRole('textbox', { name: 'Collection name', exact: true })).toHaveValue('Keep this collection draft');
  await expect(page.locator('.post-card .post-title').filter({ hasText: 'A closed upload' })).toHaveCount(0);
});
