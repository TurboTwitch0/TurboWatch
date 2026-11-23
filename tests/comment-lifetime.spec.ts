import { expect, test, type Page, type Route } from '@playwright/test';
import { fixturePassword, fixtureUsers, startSupabaseFixture } from './support/live-fixture.mjs';

const liveBaseUrl = process.env.LIVE_TEST_BASE_URL;
test.skip(!liveBaseUrl, 'Requires the isolated local Supabase HTTP fixture app.');
let fixture: Awaited<ReturnType<typeof startSupabaseFixture>>;
const commentUrl = 'http://127.0.0.1:4400/rest/v1/comments*';

test.beforeAll(async () => { fixture = await startSupabaseFixture({ port: 4400, appOrigin: new URL(liveBaseUrl!).origin }); });
test.afterAll(async () => { await fixture?.close(); });

async function openStory(page: Page) {
  await page.goto(liveBaseUrl!);
  await page.getByRole('button', { name: 'Create', exact: true }).click();
  const auth = page.getByRole('dialog', { name: 'Good to have you back.', exact: true });
  await auth.getByRole('textbox', { name: 'Email address', exact: true }).fill(fixtureUsers.alice.email);
  await auth.getByLabel('Password', { exact: true }).fill(fixturePassword);
  await auth.getByRole('button', { name: 'Sign in', exact: true }).last().click();
  await expect(auth).toBeHidden();
  await page.locator('.post-card .post-title').first().click();
  return page.getByRole('dialog', { name: 'A shared coastline', exact: true });
}

async function holdComment(page: Page, text: string) {
  let capture!: (route: Route) => void;
  const pending = new Promise<Route>(resolve => { capture = resolve; });
  await page.route(commentUrl, route => route.request().method() === 'POST' ? capture(route) : route.continue());
  await page.getByRole('textbox', { name: 'Write a comment', exact: true }).fill(text);
  await page.getByRole('button', { name: 'Post comment', exact: true }).click();
  return pending;
}

for (const sameText of [false, true]) {
  test(`a delayed comment keeps ${sameText ? 'a draft edited back to identical text' : 'the follow-up draft'}`, async ({ page }) => {
    const detail = await openStory(page);
    const original = `Earlier comment ${sameText}`;
    const route = await holdComment(page, original);
    const input = detail.getByRole('textbox', { name: 'Write a comment', exact: true });
    await input.fill('A new thought');
    const next = sameText ? original : 'Keep my follow-up thought';
    await input.fill(next);
    await route.fulfill({ response: await route.fetch() });
    await expect(detail.locator('.comment').filter({ hasText: original })).toHaveCount(1);
    await expect(input).toHaveValue(next);
    await expect(detail.locator('.comment-form')).toHaveAttribute('aria-busy', 'false');
    expect(fixture.tables.comments.filter(comment => comment.text === original)).toHaveLength(1);
    await page.unroute(commentUrl);
    await detail.getByRole('button', { name: 'Post comment', exact: true }).click();
    await expect(input).toHaveValue('');
    expect(fixture.tables.comments.filter(comment => comment.text === next)).toHaveLength(sameText ? 2 : 1);
  });
}

test('an unchanged comment clears after success and failed submissions retain their draft', async ({ page }) => {
  const detail = await openStory(page);
  const text = 'A recoverable comment';
  const route = await holdComment(page, text);
  await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'Local fixture unavailable. Try again.' }) });
  const input = detail.getByRole('textbox', { name: 'Write a comment', exact: true });
  await expect(detail.getByRole('alert')).toHaveText('Local fixture unavailable. Try again.');
  await expect(input).toHaveValue(text);
  await page.unroute(commentUrl);
  await detail.getByRole('button', { name: 'Post comment', exact: true }).click();
  await expect(input).toHaveValue('');
  await expect(detail.getByRole('alert')).toHaveCount(0);
  expect(fixture.tables.comments.filter(comment => comment.text === text)).toHaveLength(1);
});

test('a closed story completion cannot clear or report an error in its reopened draft', async ({ page }) => {
  const detail = await openStory(page);
  const route = await holdComment(page, 'A comment in the closed story');
  await detail.getByRole('button', { name: 'Close dialog', exact: true }).click();
  await page.locator('.post-card .post-title').first().click();
  const input = detail.getByRole('textbox', { name: 'Write a comment', exact: true });
  await input.fill('Keep this reopened draft');
  await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'Old request failed.' }) });
  await expect(input).toHaveValue('Keep this reopened draft');
  await expect(detail.getByRole('alert')).toHaveCount(0);
  await expect(detail.getByRole('button', { name: 'Post comment', exact: true })).toBeEnabled();
});
