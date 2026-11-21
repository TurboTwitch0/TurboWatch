import { expect, test, type Page, type Route } from '@playwright/test';
import { fixturePassword, fixtureUsers, startSupabaseFixture } from './support/live-fixture.mjs';

const liveBaseUrl = process.env.LIVE_TEST_BASE_URL;
test.skip(!liveBaseUrl, 'Requires the documented isolated Supabase HTTP fixture app.');
let fixture: Awaited<ReturnType<typeof startSupabaseFixture>>;
const charlie = { id: '33333333-3333-4333-8333-333333333333', name: 'Charlie Fixture', username: 'charlie_fixture' };
const messageUrl = 'http://127.0.0.1:4400/rest/v1/messages*';

test.beforeAll(async () => {
  fixture = await startSupabaseFixture({ port: 4400, appOrigin: new URL(liveBaseUrl!).origin });
  fixture.tables.profiles.push({ ...charlie, avatar: '', bio: '', verified: false, cover: '', created_at: new Date().toISOString() });
});
test.afterAll(async () => { await fixture?.close(); });

async function signIn(page: Page, user = fixtureUsers.alice, initial = true) {
  if (initial) await page.goto(liveBaseUrl!);
  await page.getByRole('button', { name: 'Create', exact: true }).click();
  const auth = page.getByRole('dialog', { name: 'Good to have you back.', exact: true });
  await auth.getByRole('textbox', { name: 'Email address', exact: true }).fill(user.email);
  await auth.getByLabel('Password', { exact: true }).fill(fixturePassword);
  await auth.getByRole('button', { name: 'Sign in', exact: true }).last().click();
  await expect(auth).toBeHidden();
  await expect(page.locator('.account-button strong')).toHaveText(user.name);
}

async function chooseRecipient(page: Page, name: string, openMessages = true) {
  if (openMessages) await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name: /^Messages/ }).click();
  await page.getByRole('textbox', { name: 'Find a person to message', exact: true }).fill(name);
  await page.locator('.conversation-item').filter({ hasText: name }).click();
}

async function holdSend(page: Page, text: string) {
  let capture!: (route: Route) => void;
  const pending = new Promise<Route>(resolve => { capture = resolve; });
  await page.route(messageUrl, route => route.request().method() === 'POST' ? capture(route) : route.continue());
  await page.getByRole('textbox', { name: 'Your message', exact: true }).fill(text);
  await page.getByRole('button', { name: 'Send message', exact: true }).click();
  return pending;
}

for (const sameText of [false, true]) {
  test(`a delayed send preserves ${sameText ? 'an edited draft restored to the same text' : 'the next draft'}`, async ({ page }) => {
    await signIn(page);
    await chooseRecipient(page, fixtureUsers.bob.name);
    const original = `Earlier message ${sameText}`;
    const route = await holdSend(page, original);
    const input = page.getByRole('textbox', { name: 'Your message', exact: true });
    await input.fill('A newly edited draft');
    const next = sameText ? original : 'Keep this follow-up draft';
    await input.fill(next);
    await route.fulfill({ response: await route.fetch() });
    await expect(page.locator('.message-form')).toHaveAttribute('aria-busy', 'false');
    await expect(input).toHaveValue(next);
    expect(fixture.tables.messages.filter(message => message.text === original)).toHaveLength(1);
    const firstId = route.request().postDataJSON().id;
    await page.unroute(messageUrl);
    await page.getByRole('button', { name: 'Send message', exact: true }).click();
    await expect(input).toHaveValue('');
    const followUp = fixture.tables.messages.filter(message => message.text === next);
    expect(followUp).toHaveLength(sameText ? 2 : 1);
    expect(followUp.at(-1)?.id).not.toBe(firstId);
  });
}

test('completion only clears the submitted recipient draft', async ({ page }) => {
  await signIn(page);
  await chooseRecipient(page, fixtureUsers.bob.name);
  const route = await holdSend(page, 'A message for Bob while selecting Charlie');
  await chooseRecipient(page, charlie.name, false);
  const input = page.getByRole('textbox', { name: 'Your message', exact: true });
  await input.fill('Keep Charlie’s draft');
  await route.fulfill({ response: await route.fetch() });
  await expect(page.locator('.message-form')).toHaveAttribute('aria-busy', 'false');
  await expect(input).toHaveValue('Keep Charlie’s draft');
  await chooseRecipient(page, fixtureUsers.bob.name, false);
  await expect(input).toHaveValue('');
  await chooseRecipient(page, charlie.name, false);
  await expect(input).toHaveValue('Keep Charlie’s draft');
});

test('an old send cannot change a new account’s draft or show its error there', async ({ page }) => {
  await signIn(page);
  await chooseRecipient(page, fixtureUsers.bob.name);
  const text = 'Alice’s pending message before switching accounts';
  const route = await holdSend(page, text);
  await page.getByRole('button', { name: 'Account menu', exact: true }).click();
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Account menu', exact: true })).toBeHidden();
  await signIn(page, fixtureUsers.bob, false);
  await chooseRecipient(page, fixtureUsers.alice.name);
  const input = page.getByRole('textbox', { name: 'Your message', exact: true });
  await input.fill('Keep Bob’s new draft');
  await route.fulfill({ response: await route.fetch() });
  await expect.poll(() => fixture.tables.messages.some(message => message.text === text)).toBe(true);
  await expect(input).toHaveValue('Keep Bob’s new draft');
  await expect(page.locator('.message-form')).toHaveAttribute('aria-busy', 'false');
  await expect(page.locator('.toast')).not.toContainText('previous session');
  expect(fixture.tables.messages.find(message => message.text === text)?.sender_id).toBe(fixtureUsers.alice.id);
});

test('retrying an unchanged draft after a lost INSERT response keeps one message', async ({ page }) => {
  await signIn(page);
  await chooseRecipient(page, fixtureUsers.bob.name);
  const ids: string[] = [];
  await page.route(messageUrl, async route => {
    if (route.request().method() !== 'POST') return route.continue();
    ids.push(route.request().postDataJSON().id);
    if (ids.length !== 1) return route.continue();
    await route.fetch();
    await route.abort('failed');
  });
  const text = 'One message despite a lost server response';
  const input = page.getByRole('textbox', { name: 'Your message', exact: true });
  await input.fill(text);
  await page.getByRole('button', { name: 'Send message', exact: true }).click();
  await expect(page.locator('.message-form')).toHaveAttribute('aria-busy', 'false');
  await expect(input).toHaveValue(text);
  expect(fixture.tables.messages.filter(message => message.text === text)).toHaveLength(1);
  await page.getByRole('button', { name: 'Send message', exact: true }).click();
  await expect(input).toHaveValue('');
  expect(ids).toHaveLength(2);
  expect(ids[0]).toBe(ids[1]);
  expect(fixture.tables.messages.filter(message => message.text === text)).toHaveLength(1);
});

for (const mismatch of ['text', 'recipient', 'sender'] as const) {
  test(`a conflicting UUID is not delivery confirmation for a different ${mismatch}`, async ({ page }) => {
    await signIn(page);
    await chooseRecipient(page, fixtureUsers.bob.name);
    let conflictingId = '';
    await page.route(messageUrl, async route => {
      if (route.request().method() !== 'POST') return route.continue();
      const message = route.request().postDataJSON();
      conflictingId = message.id;
      fixture.tables.messages.push({
        ...message,
        ...(mismatch === 'text' ? { text: 'A different private message' } : mismatch === 'recipient' ? { recipient_id: charlie.id } : { sender_id: fixtureUsers.bob.id, recipient_id: fixtureUsers.alice.id }),
        created_at: new Date().toISOString(),
      });
      await route.fulfill({ status: 409, contentType: 'application/json', body: JSON.stringify({ code: '23505', message: 'duplicate key value violates messages_pkey' }) });
    });
    const input = page.getByRole('textbox', { name: 'Your message', exact: true });
    await input.fill('This message was not delivered');
    await page.getByRole('button', { name: 'Send message', exact: true }).click();
    await expect(page.locator('.message-form')).toHaveAttribute('aria-busy', 'false');
    await expect(input).toHaveValue('This message was not delivered');
    await expect(page.locator('.toast')).toContainText('duplicate key');
    expect(fixture.tables.messages.filter(message => message.id === conflictingId)).toHaveLength(1);
    const existing = fixture.tables.messages.find(message => message.id === conflictingId);
    if (mismatch === 'text') expect(existing?.text).toBe('A different private message');
    else if (mismatch === 'recipient') expect(existing?.recipient_id).toBe(charlie.id);
    else expect(existing?.sender_id).toBe(fixtureUsers.bob.id);
  });
}
