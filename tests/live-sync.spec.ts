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
  await page.getByRole('button', { name: 'Create', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Good to have you back.', exact: true });
  await dialog.getByRole('textbox', { name: 'Email address', exact: true }).fill(user.email);
  await dialog.getByLabel('Password', { exact: true }).fill(fixturePassword);
  await dialog.getByRole('button', { name: 'Sign in', exact: true }).last().click();
  await expect(dialog).toBeHidden();
  await expect(page.locator('.account-button strong')).toHaveText(user.name);
  await expect(page.locator('.demo-indicator')).toContainText('Community');
  await expect(page.locator('.post-card')).toHaveCount(fixture.tables.posts.length);
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
    await create.getByRole('combobox', { name: 'Category', exact: true }).selectOption('Design');
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

    // Newly published content and real profiles must be discoverable by another account.
    const search = bob.getByRole('textbox', { name: 'Search TurboWatch', exact: true });
    await bob.getByRole('button', { name: 'Travel', exact: true }).click();
    await expect(bob.locator('.post-card')).toHaveCount(1);
    await search.fill('A photo shared with Bob');
    await expect(bob.locator('.post-card')).toHaveCount(1);
    await expect(bob.getByRole('button', { name: 'A photo shared with Bob', exact: true })).toBeVisible();
    await expect.poll(() => new URL(bob.url()).searchParams.get('q')).toBe('A photo shared with Bob');
    await bob.reload();
    await expect(search).toHaveValue('A photo shared with Bob');
    await expect(bob.getByRole('button', { name: 'A photo shared with Bob', exact: true })).toBeVisible();
    await expect(bob.locator('.account-button strong')).toHaveText(fixtureUsers.bob.name);
    await search.fill('#sharedcoast');
    await expect(bob.locator('.post-card')).toHaveCount(1);
    await expect(bob.getByRole('button', { name: 'A shared coastline', exact: true })).toBeVisible();
    await search.fill('@alice_fixture');
    await expect(bob.locator('.creator-chip').filter({ hasText: 'Alice Fixture' })).toBeVisible();
    expect(fixture.tables.posts.some(post => post.title === 'A photo shared with Bob' && post.creator_id === fixtureUsers.alice.id)).toBe(true);

    // Incoming uploads must not replace a short that someone is already watching.
    await bob.evaluate(name => { document.documentElement.dataset.liveDocument = name; }, fixtureUsers.bob.name);
    await bob.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name: 'Shorts', exact: true }).click();
    const playing = bob.locator('.short-player video');
    await expect.poll(() => playing.evaluate(node => (node as HTMLVideoElement).readyState)).toBeGreaterThanOrEqual(2);
    await playing.evaluate(async node => {
      const video = node as HTMLVideoElement;
      video.dataset.incomingShort = 'keep-watching-this-short';
      video.muted = true; video.currentTime = 2; await video.play();
    });
    await alice.getByRole('dialog', { name: 'A photo shared with Bob', exact: true }).getByRole('button', { name: 'Close dialog', exact: true }).click();
    await alice.getByRole('button', { name: 'Create', exact: true }).click();
    const upload = alice.getByRole('dialog', { name: 'Make something worth sharing.', exact: true });
    await upload.getByRole('button', { name: 'Video', exact: true }).click();
    await upload.getByRole('textbox', { name: /Or use a video link/ }).fill(`${new URL(liveBaseUrl!).origin}/media/clip-city.mp4`);
    await upload.getByRole('textbox', { name: 'Title', exact: true }).fill('A new short arrives while Bob watches');
    await upload.getByRole('button', { name: 'Publish post', exact: true }).click();
    await expect(alice.getByRole('dialog', { name: 'A new short arrives while Bob watches', exact: true })).toBeVisible();
    await expect(bob.locator('.shorts-counter')).toContainText('/ 02', { timeout: 20_000 });
    await expect(playing).toHaveAttribute('data-incoming-short', 'keep-watching-this-short');
    await expect(playing).toHaveAttribute('src', `${new URL(liveBaseUrl!).origin}/media/coast.mp4`);
    expect(await playing.evaluate(node => (node as HTMLVideoElement).currentTime)).toBeGreaterThan(2);
    expect(await bob.evaluate(() => document.documentElement.dataset.liveDocument)).toBe(fixtureUsers.bob.name);
  } finally {
    await aliceContext.close();
    await bobContext.close();
  }
});

test('real authentication rejects bad passwords and never substitutes a demo profile', async ({ page }) => {
  await page.goto(liveBaseUrl!);
  await expect(page.locator('.account-button strong')).toHaveText('Join the community');
  await expect(page.locator('.demo-indicator')).toContainText('Community');
  await expect(page.locator('.account-button')).not.toContainText('Alex Carter');
  await page.getByRole('button', { name: 'Create', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Good to have you back.', exact: true });
  await dialog.getByRole('textbox', { name: 'Email address', exact: true }).fill(fixtureUsers.alice.email);
  await dialog.getByLabel('Password', { exact: true }).fill('wrong-password-123');
  await dialog.getByRole('button', { name: 'Sign in', exact: true }).last().click();
  await expect(dialog.getByRole('alert')).toContainText('Invalid login credentials');
  await expect(page.locator('.account-button strong')).toHaveText('Join the community');
  expect(await page.evaluate(() => localStorage.getItem('turbowatch:demo:v1'))).toBeNull();
  await dialog.getByLabel('Password', { exact: true }).fill(fixturePassword);
  await dialog.getByRole('button', { name: 'Sign in', exact: true }).last().click();
  await expect(dialog).toBeHidden();
  await expect(page.locator('.account-button strong')).toHaveText(fixtureUsers.alice.name);
  expect(fixture.requests.some(request => request.path === '/auth/v1/token' && request.method === 'POST')).toBe(true);
  await page.getByRole('button', { name: 'Account menu', exact: true }).click();
  await page.getByRole('navigation', { name: 'Your account', exact: true }).getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page.locator('.account-button strong')).toHaveText('Join the community');
});

test('signing out in another tab removes the old account and clears its unfinished comment', async ({ page, context }) => {
  await signIn(page, fixtureUsers.alice);
  await page.getByRole('button', { name: 'Open A shared coastline', exact: true }).click();
  const detail = page.getByRole('dialog', { name: 'A shared coastline', exact: true });
  await detail.getByRole('textbox', { name: 'Write a comment', exact: true }).fill('A private unfinished draft from Alice.');
  const secondTab = await context.newPage();
  await secondTab.goto(liveBaseUrl!);
  await expect(secondTab.locator('.account-button strong')).toHaveText(fixtureUsers.alice.name);
  await secondTab.getByRole('button', { name: 'Account menu', exact: true }).click();
  await secondTab.getByRole('navigation', { name: 'Your account', exact: true }).getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page.locator('.account-button strong')).toHaveText('Join the community');
  await expect(detail.getByRole('textbox', { name: 'Write a comment', exact: true })).toHaveValue('');
  expect(fixture.tables.comments.some(comment => comment.text === 'A private unfinished draft from Alice.')).toBe(false);
  await secondTab.close();
});

test('a new signup gets its own profile, persists its session, publishes publicly, and signs out cleanly', async ({ browser }) => {
  test.setTimeout(90_000);
  const memberContext = await browser.newContext();
  const viewerContext = await browser.newContext();
  const memberName = 'Nora Real Account';
  const memberEmail = 'nora@example.test';
  try {
    const member = await memberContext.newPage();
    const viewer = await viewerContext.newPage();
    await member.goto(liveBaseUrl!);
    await member.getByRole('button', { name: 'Create', exact: true }).click();
    await member.getByRole('dialog').getByRole('button', { name: 'Create account', exact: true }).first().click();
    const signup = member.getByRole('dialog', { name: 'Find your people.', exact: true });
    await signup.getByRole('textbox', { name: 'Your name', exact: true }).fill(memberName);
    await signup.getByRole('textbox', { name: 'Email address', exact: true }).fill(memberEmail);
    await signup.getByLabel('Password', { exact: true }).fill(fixturePassword);
    await signup.getByRole('button', { name: 'Create account', exact: true }).last().click();
    await expect(signup).toBeHidden();
    await expect(member.locator('.account-button strong')).toHaveText(memberName);
    const profile = fixture.tables.profiles.find(row => row.name === memberName)!;
    expect(profile).toBeTruthy();
    expect(profile.id).not.toBe(fixtureUsers.alice.id);
    expect(profile.id).not.toBe(fixtureUsers.bob.id);
    expect(profile.username).not.toBe('alexcreates');
    await member.reload();
    await expect(member.locator('.account-button strong')).toHaveText(memberName);
    expect(await member.evaluate(() => localStorage.getItem('turbowatch:demo:v1'))).toBeNull();
    await member.getByRole('button', { name: 'Create', exact: true }).click();
    const create = member.getByRole('dialog', { name: 'Make something worth sharing.', exact: true });
    await create.getByRole('textbox', { name: /Or use a image link/ }).fill(`${new URL(liveBaseUrl!).origin}/media/studio.jpg`);
    await create.getByRole('textbox', { name: 'Title', exact: true }).fill('Nora publishes for everyone');
    await create.getByRole('textbox', { name: 'Caption', exact: true }).fill('A new real member, not the sample profile. #community');
    await create.getByRole('button', { name: 'Publish post', exact: true }).click();
    await expect(member.getByRole('dialog', { name: 'Nora publishes for everyone', exact: true })).toBeVisible();
    expect(fixture.tables.posts.some(row => row.title === 'Nora publishes for everyone' && row.creator_id === profile.id)).toBe(true);

    await signIn(viewer, fixtureUsers.bob);
    await viewer.getByRole('textbox', { name: 'Search TurboWatch', exact: true }).fill('Nora publishes for everyone');
    await expect(viewer.getByRole('button', { name: 'Nora publishes for everyone', exact: true })).toBeVisible();
    await viewer.getByRole('textbox', { name: 'Search TurboWatch', exact: true }).fill(`@${profile.username}`);
    await expect(viewer.locator('.creator-chip').filter({ hasText: memberName })).toBeVisible();

    await member.getByRole('dialog', { name: 'Nora publishes for everyone', exact: true }).getByRole('button', { name: 'Close dialog', exact: true }).click();
    await member.getByRole('button', { name: 'My profile', exact: true }).click();
    await expect(member.getByRole('heading', { name: memberName, exact: true })).toBeVisible();
    await member.getByRole('button', { name: 'Sign out', exact: true }).click();
    await expect(member.locator('.account-button strong')).toHaveText('Join the community');
    await expect(member.locator('.conversation-item')).toHaveCount(0);
    await member.reload();
    await expect(member.locator('.account-button strong')).toHaveText('Join the community');
    await expect(member.locator('.account-button')).not.toContainText('Alex Carter');
    await expect(member.getByRole('button', { name: 'Nora publishes for everyone', exact: true })).toBeVisible();
    await member.getByRole('button', { name: 'Create', exact: true }).click();
    await expect(member.getByRole('dialog', { name: 'Good to have you back.', exact: true })).toBeVisible();
  } finally {
    await memberContext.close();
    await viewerContext.close();
  }
});

test('confirmation-required signup stays signed out until the email is confirmed and the real credentials are used', async ({ page }) => {
  fixture.setSignupConfirmationRequired(true);
  const email = 'confirmed-member@example.test';
  try {
    await page.goto(liveBaseUrl!);
    await page.getByRole('button', { name: 'Create', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Create account', exact: true }).first().click();
    const signup = page.getByRole('dialog', { name: 'Find your people.', exact: true });
    await signup.getByRole('textbox', { name: 'Your name', exact: true }).fill('Confirmed Member');
    await signup.getByRole('textbox', { name: 'Email address', exact: true }).fill(email);
    await signup.getByLabel('Password', { exact: true }).fill(fixturePassword);
    await signup.getByRole('button', { name: 'Create account', exact: true }).last().click();
    const confirmation = page.getByRole('dialog', { name: 'Check your email.', exact: true });
    await expect(confirmation.getByRole('status')).toContainText(email);
    await expect(page.locator('.account-button strong')).toHaveText('Join the community');
    await confirmation.getByRole('button', { name: 'Resend confirmation email', exact: true }).click();
    await expect(confirmation.getByRole('status')).toContainText(email);
    await expect(confirmation.getByRole('button', { name: 'Resend confirmation email', exact: true })).toBeEnabled();
    expect(fixture.requests.filter(request => request.path === '/auth/v1/resend' && request.method === 'POST')).toHaveLength(1);
    fixture.rejectNextConfirmationResend();
    await confirmation.getByRole('button', { name: 'Resend confirmation email', exact: true }).click();
    await expect(confirmation.getByRole('alert')).toContainText('Please wait before requesting another confirmation email.');
    await expect(page.locator('.account-button strong')).toHaveText('Join the community');
    await confirmation.getByRole('button', { name: 'Back to sign in', exact: true }).click();
    const signInDialog = page.getByRole('dialog', { name: 'Good to have you back.', exact: true });
    await signInDialog.getByRole('textbox', { name: 'Email address', exact: true }).fill(email);
    await signInDialog.getByLabel('Password', { exact: true }).fill(fixturePassword);
    await signInDialog.getByRole('button', { name: 'Sign in', exact: true }).last().click();
    await expect(signInDialog.getByRole('alert')).toContainText('Email not confirmed');
    fixture.confirmAccount(email);
    await signInDialog.getByRole('button', { name: 'Sign in', exact: true }).last().click();
    await expect(signInDialog).toBeHidden();
    await expect(page.locator('.account-button strong')).toHaveText('Confirmed Member');
  } finally {
    fixture.setSignupConfirmationRequired(false);
  }
});
