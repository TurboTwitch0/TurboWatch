import { expect, test, type Page } from '@playwright/test';
import { fixturePassword, fixturePostId, fixtureUsers, startSupabaseFixture } from './support/live-fixture.mjs';

// Opt in only against a separately started Next instance configured with:
// NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:4400
// NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_turbowatch_local_fixture
// This is SDK/app integration coverage, not hosted Supabase or RLS validation.
const liveBaseUrl = process.env.LIVE_TEST_BASE_URL;
test.skip(!liveBaseUrl, 'Set LIVE_TEST_BASE_URL to the app using the controlled local Supabase API.');

let fixture: Awaited<ReturnType<typeof startSupabaseFixture>>;

test.beforeAll(async () => {
  fixture = await startSupabaseFixture({ port: Number(process.env.LIVE_FIXTURE_PORT || 4400), appOrigin: new URL(liveBaseUrl!).origin });
});
test.afterAll(async () => { await fixture?.close(); });

async function signIn(page: Page, user: typeof fixtureUsers.alice) {
  await page.goto(liveBaseUrl!);
  await page.getByRole('button', { name: 'View your profile', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Good to have you back.', exact: true });
  await dialog.getByRole('textbox', { name: 'Email address', exact: true }).fill(user.email);
  await dialog.getByLabel('Password', { exact: true }).fill(fixturePassword);
  await dialog.getByRole('button', { name: 'Sign in', exact: true }).last().click();
  await expect(dialog).toBeHidden();
  await expect(page.locator('.account-button strong')).toHaveText(user.name);
  await expect(page.locator('.demo-indicator')).toContainText('Community');
  await expect(page.locator('.post-card')).toHaveCount(1);
  await page.evaluate(name => { document.documentElement.dataset.liveDocument = name; }, user.name);
}

test('controlled Supabase API: two isolated accounts see social updates and notifications without reloading', async ({ browser }) => {
  test.setTimeout(150_000);
  const aliceContext = await browser.newContext({ viewport: { width: 1440, height: 1050 }, reducedMotion: 'reduce' });
  const bobContext = await browser.newContext({ viewport: { width: 1440, height: 1050 }, reducedMotion: 'reduce' });
  try {
    const alice = await aliceContext.newPage();
    const bob = await bobContext.newPage();
    await signIn(alice, fixtureUsers.alice);
    await signIn(bob, fixtureUsers.bob);
    await alice.getByRole('button', { name: 'Open A shared coastline', exact: true }).click();
    await bob.getByRole('button', { name: 'Open A shared coastline', exact: true }).click();
    const aliceDetail = alice.getByRole('dialog', { name: 'A shared coastline', exact: true });
    const bobDetail = bob.getByRole('dialog', { name: 'A shared coastline', exact: true });
    const bobVideo = bobDetail.locator('video');
    await expect.poll(() => bobVideo.evaluate(node => (node as HTMLVideoElement).readyState)).toBeGreaterThanOrEqual(2);
    await bobVideo.evaluate(async node => {
      const video = node as HTMLVideoElement;
      video.dataset.liveVideo = 'same-receiver-video';
      video.muted = true; video.currentTime = 2; await video.play();
    });
    await bobDetail.getByRole('textbox', { name: 'Write a comment', exact: true }).fill('Bob is still writing this draft.');

    await aliceDetail.getByRole('button', { name: 'Like post', exact: true }).click();
    await expect(aliceDetail.getByRole('button', { name: 'Unlike post', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(bobDetail.getByRole('button', { name: 'Like post', exact: true })).toHaveText('1', { timeout: 20_000 });
    await expect(bobVideo).toHaveAttribute('data-live-video', 'same-receiver-video');
    expect(await bobVideo.evaluate(node => (node as HTMLVideoElement).currentTime)).toBeGreaterThan(2);

    const comment = 'Hello Bob — a comment from a separate signed-in browser.';
    await aliceDetail.getByRole('textbox', { name: 'Write a comment', exact: true }).fill(comment);
    await aliceDetail.getByRole('button', { name: 'Post comment', exact: true }).click();
    await expect(bobDetail.getByText(comment, { exact: true })).toBeVisible({ timeout: 20_000 });
    await expect(bobDetail.getByRole('textbox', { name: 'Write a comment', exact: true })).toHaveValue('Bob is still writing this draft.');
    await expect(bobVideo).toHaveAttribute('data-live-video', 'same-receiver-video');

    await aliceDetail.getByRole('button', { name: 'Follow', exact: true }).click();
    await expect(aliceDetail.getByRole('button', { name: 'Following', exact: true })).toBeVisible();
    await aliceDetail.getByRole('button', { name: 'Repost post', exact: true }).click();
    await expect(aliceDetail.getByRole('button', { name: 'Repost post', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(bobVideo).toHaveAttribute('data-live-video', 'same-receiver-video');
    await expect(bobDetail.getByRole('textbox', { name: 'Write a comment', exact: true })).toHaveValue('Bob is still writing this draft.');
    await bobDetail.getByRole('button', { name: 'Close dialog', exact: true }).click();
    await bob.getByRole('button', { name: 'Activity', exact: true }).click();
    const activity = bob.locator('.activity-panel');
    await expect(activity).toContainText(comment, { timeout: 20_000 });
    await expect(activity).toContainText(/liked/i, { timeout: 20_000 });
    await expect(activity).toContainText(/follow/i, { timeout: 20_000 });
    await expect(activity).toContainText(/repost/i, { timeout: 20_000 });
    await bob.getByRole('button', { name: 'Close activity', exact: true }).click();

    await aliceDetail.getByRole('button', { name: 'View Bob Fixture profile', exact: true }).click();
    await alice.getByRole('button', { name: 'Message', exact: true }).click();
    await bob.getByRole('button', { name: /^Messages/ }).first().click();
    const message = 'A private message delivered to Bob without a refresh.';
    await alice.getByRole('textbox', { name: 'Your message', exact: true }).fill(message);
    await alice.getByRole('button', { name: 'Send message', exact: true }).click();
    await expect(bob.locator('.conversation-item').filter({ hasText: message })).toBeVisible({ timeout: 20_000 });
    await bob.locator('.conversation-item').filter({ hasText: 'Alice Fixture' }).click();
    await expect(bob.locator('.message-bubble.incoming').filter({ hasText: message })).toBeVisible();
    const reply = 'Received, Alice. This reply is from Bob’s separate account.';
    await bob.getByRole('textbox', { name: 'Your message', exact: true }).fill(reply);
    await bob.getByRole('button', { name: 'Send message', exact: true }).click();
    await expect(alice.locator('.message-bubble.incoming').filter({ hasText: reply })).toBeVisible({ timeout: 20_000 });
    await expect(alice.locator('.message-bubble')).toHaveCount(2);
    await expect(bob.locator('.message-bubble')).toHaveCount(2);

    await alice.getByRole('button', { name: 'Create', exact: true }).click();
    const create = alice.getByRole('dialog', { name: 'Make something worth sharing.', exact: true });
    await create.getByRole('textbox', { name: /Or use a image link/ }).fill(`${new URL(liveBaseUrl!).origin}/media/studio.jpg`);
    await create.getByRole('textbox', { name: 'Title', exact: true }).fill('A photo shared with Bob');
    await create.getByRole('textbox', { name: 'Caption', exact: true }).fill('Created by Alice and delivered through the shared API.');
    await create.getByRole('button', { name: 'Publish post', exact: true }).click();
    await expect(alice.getByRole('dialog', { name: 'A photo shared with Bob', exact: true })).toBeVisible();
    await bob.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name: 'For you', exact: true }).click();
    await expect(bob.getByRole('button', { name: 'A photo shared with Bob', exact: true })).toBeVisible({ timeout: 20_000 });
    expect(await alice.evaluate(() => document.documentElement.dataset.liveDocument)).toBe(fixtureUsers.alice.name);
    expect(await bob.evaluate(() => document.documentElement.dataset.liveDocument)).toBe(fixtureUsers.bob.name);
    expect(fixture.tables.comments.some(commentRow => commentRow.creator_id === fixtureUsers.alice.id && commentRow.post_id === fixturePostId && commentRow.text === comment)).toBe(true);
    expect(fixture.tables.post_likes.some(row => row.user_id === fixtureUsers.alice.id && row.post_id === fixturePostId)).toBe(true);
    expect(fixture.tables.follows.some(row => row.follower_id === fixtureUsers.alice.id && row.following_id === fixtureUsers.bob.id)).toBe(true);
    expect(fixture.tables.reposts.some(row => row.user_id === fixtureUsers.alice.id && row.post_id === fixturePostId)).toBe(true);
    expect(fixture.tables.messages).toHaveLength(2);
    expect(fixture.requests.filter(request => request.path === '/rest/v1/messages' && request.method === 'GET' && request.userId === fixtureUsers.bob.id).length).toBeGreaterThan(1);
    expect(fixture.realtimeRefusals).toBeGreaterThan(0);
  } finally {
    await aliceContext.close();
    await bobContext.close();
  }
});
