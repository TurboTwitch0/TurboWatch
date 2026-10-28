import { expect, test, type Page } from '@playwright/test';
import { fixturePassword, fixtureUsers, startSupabaseFixture } from './support/live-fixture.mjs';

// Actual SDK requests against a controlled local API; never hosted Auth/RLS.
const liveBaseUrl = process.env.LIVE_TEST_BASE_URL;
test.skip(!liveBaseUrl, 'Set LIVE_TEST_BASE_URL to the app using the controlled local Supabase API.');

let fixture: Awaited<ReturnType<typeof startSupabaseFixture>>;
test.beforeAll(async () => {
  fixture = await startSupabaseFixture({ port: Number(process.env.LIVE_FIXTURE_PORT || 4400), appOrigin: new URL(liveBaseUrl!).origin });
});
test.afterAll(async () => { await fixture?.close(); });

async function openSignIn(page: Page) {
  await page.getByRole('button', { name: 'Create', exact: true }).click();
  return page.getByRole('dialog', { name: 'Good to have you back.', exact: true });
}

async function signIn(page: Page, user: typeof fixtureUsers.alice, password = fixturePassword) {
  await page.goto(liveBaseUrl!);
  const dialog = await openSignIn(page);
  await dialog.getByRole('textbox', { name: 'Email address', exact: true }).fill(user.email);
  await dialog.getByLabel('Password', { exact: true }).fill(password);
  await dialog.getByRole('button', { name: 'Sign in', exact: true }).last().click();
  await expect(dialog).toBeHidden();
  await expect(page.locator('.account-button strong')).toHaveText(user.name);
}

test('password reset requests use the real email endpoint, handle retry errors, and keep visitors signed out', async ({ page }) => {
  await page.goto(liveBaseUrl!);
  const signIn = await openSignIn(page);
  await signIn.getByRole('button', { name: 'Forgot password?', exact: true }).click();
  const reset = page.getByRole('dialog', { name: 'Reset your password.', exact: true });
  await reset.getByRole('textbox', { name: 'Email address', exact: true }).fill(fixtureUsers.alice.email);
  fixture.rejectNextRecoveryEmail();
  await reset.getByRole('button', { name: 'Send reset link', exact: true }).click();
  await expect(reset.getByRole('alert')).toContainText('Please wait before requesting another password reset email.');
  await expect(reset.getByRole('textbox', { name: 'Email address', exact: true })).toHaveValue(fixtureUsers.alice.email);
  await reset.getByRole('button', { name: 'Send reset link', exact: true }).click();
  await expect(reset.getByRole('status')).toContainText(fixtureUsers.alice.email);
  await expect(page.locator('.account-button strong')).toHaveText('Join the community');
  expect(fixture.recoveryRequests).toHaveLength(2);
  expect(fixture.recoveryRequests[1]).toEqual({ email: fixtureUsers.alice.email, redirectTo: `${new URL(liveBaseUrl!).origin}/?auth=recovery` });
  expect(fixture.passwordUpdates).toHaveLength(0);
  expect(await page.evaluate(() => localStorage.getItem('turbowatch:demo:v1'))).toBeNull();
});

test('a recovery URL without a recovery session cannot change a password', async ({ page }) => {
  const requestsBefore = fixture.requests.filter(request => request.path === '/auth/v1/user' && request.method === 'PUT').length;
  await page.goto(`${liveBaseUrl!}/?auth=recovery`);
  const recovery = page.getByRole('dialog', { name: 'Choose a new password.', exact: true });
  await expect(recovery).toContainText('This reset link is invalid or has expired.');
  await expect(recovery.getByLabel('New password', { exact: true })).toHaveCount(0);
  await recovery.getByRole('button', { name: 'Request a new reset link', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Reset your password.', exact: true })).toBeVisible();
  await page.goto(`${liveBaseUrl!}/?auth=recovery#access_token=invalid&refresh_token=invalid&token_type=bearer&type=recovery&expires_in=3600`);
  await expect(recovery).toContainText('This reset link is invalid or has expired.');
  await expect(recovery.getByLabel('New password', { exact: true })).toHaveCount(0);
  expect(fixture.requests.filter(request => request.path === '/auth/v1/user' && request.method === 'PUT')).toHaveLength(requestsBefore);
});

test('an expired recovery link cannot authorize a password change for another signed-in account', async ({ page }) => {
  await signIn(page, fixtureUsers.bob);
  const requestsBefore = fixture.requests.filter(request => request.path === '/auth/v1/user' && request.method === 'PUT').length;
  await page.goto(`${liveBaseUrl!}/?auth=recovery`);
  const recovery = page.getByRole('dialog', { name: 'Choose a new password.', exact: true });
  await expect(recovery).toContainText('This reset link is invalid or has expired.');
  await expect(recovery.getByLabel('New password', { exact: true })).toHaveCount(0);
  await page.goto(`${liveBaseUrl!}/?auth=recovery#error=access_denied&error_code=otp_expired&error_description=This+link+has+expired`);
  await expect(recovery).toContainText('This reset link is invalid or has expired.');
  await expect(recovery.getByLabel('New password', { exact: true })).toHaveCount(0);
  await expect(page.locator('.account-button strong')).toHaveText(fixtureUsers.bob.name);
  expect(fixture.requests.filter(request => request.path === '/auth/v1/user' && request.method === 'PUT')).toHaveLength(requestsBefore);
});

test('a valid recovery session survives reload, updates only its account, and requires the new password after sign-out', async ({ page }) => {
  test.setTimeout(90_000);
  await signIn(page, fixtureUsers.bob);
  await page.goto(fixture.recoveryLink(fixtureUsers.alice.email));
  const recovery = page.getByRole('dialog', { name: 'Choose a new password.', exact: true });
  await expect(recovery.getByLabel('New password', { exact: true })).toBeVisible();
  await expect(page.locator('.account-button strong')).toHaveText(fixtureUsers.alice.name);
  await expect.poll(() => new URL(page.url()).hash).toBe('');
  await page.reload();
  await expect(recovery.getByLabel('New password', { exact: true })).toBeVisible();
  await expect(page.locator('.account-button strong')).toHaveText(fixtureUsers.alice.name);
  const password = 'changed-password-456';
  await recovery.getByLabel('New password', { exact: true }).fill(password);
  await recovery.getByLabel('Confirm new password', { exact: true }).fill('a-different-password');
  await recovery.getByRole('button', { name: 'Update password', exact: true }).click();
  await expect(recovery.getByRole('alert')).toContainText(/match/i);
  expect(fixture.passwordUpdates).toHaveLength(0);
  await recovery.getByLabel('Confirm new password', { exact: true }).fill(password);
  fixture.rejectNextPasswordUpdate();
  await recovery.getByRole('button', { name: 'Update password', exact: true }).click();
  await expect(recovery.getByRole('alert')).toContainText('Could not update your password. Please try again.');
  await expect(recovery.getByLabel('New password', { exact: true })).toHaveValue(password);
  await recovery.getByRole('button', { name: 'Update password', exact: true }).click();
  await expect(recovery).toBeHidden();
  expect(fixture.passwordUpdates).toEqual([{ userId: fixtureUsers.alice.id }]);
  expect(new URL(page.url()).searchParams.has('auth')).toBe(false);
  await page.getByRole('button', { name: 'My profile', exact: true }).click();
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page.locator('.account-button strong')).toHaveText('Join the community');
  const login = await openSignIn(page);
  await login.getByRole('textbox', { name: 'Email address', exact: true }).fill(fixtureUsers.alice.email);
  await login.getByLabel('Password', { exact: true }).fill(fixturePassword);
  await login.getByRole('button', { name: 'Sign in', exact: true }).last().click();
  await expect(login.getByRole('alert')).toContainText('Invalid login credentials');
  await login.getByLabel('Password', { exact: true }).fill(password);
  await login.getByRole('button', { name: 'Sign in', exact: true }).last().click();
  await expect(login).toBeHidden();
  await expect(page.locator('.account-button strong')).toHaveText(fixtureUsers.alice.name);
});

test('an account switch during password recovery never applies the response to the new account', async ({ page, context }) => {
  test.setTimeout(90_000);
  await page.goto(fixture.recoveryLink(fixtureUsers.alice.email));
  const recovery = page.getByRole('dialog', { name: 'Choose a new password.', exact: true });
  await expect(recovery.getByLabel('New password', { exact: true })).toBeVisible();
  const before = fixture.passwordUpdates.length;
  let releaseUpdate!: () => void;
  let updateReached!: () => void;
  const release = new Promise<void>(resolve => { releaseUpdate = resolve; });
  const reached = new Promise<void>(resolve => { updateReached = resolve; });
  let updateUserId = '';
  await page.route('**/auth/v1/user', async route => {
    if (route.request().method() !== 'PUT') { await route.continue(); return; }
    const token = (route.request().headers().authorization || '').replace(/^Bearer /i, '');
    updateUserId = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString()).sub;
    updateReached();
    await release;
    await route.continue();
  });
  try {
    await recovery.getByLabel('New password', { exact: true }).fill('a-second-alice-password-789');
    await recovery.getByLabel('Confirm new password', { exact: true }).fill('a-second-alice-password-789');
    await recovery.getByRole('button', { name: 'Update password', exact: true }).click();
    await reached;
    expect(updateUserId).toBe(fixtureUsers.alice.id);
    const otherTab = await context.newPage();
    await otherTab.goto(liveBaseUrl!);
    await expect(otherTab.locator('.account-button strong')).toHaveText(fixtureUsers.alice.name);
    await otherTab.getByRole('button', { name: 'Account menu', exact: true }).click();
    await otherTab.getByRole('navigation', { name: 'Your account', exact: true }).getByRole('button', { name: 'Sign out', exact: true }).click();
    await expect(otherTab.locator('.account-button strong')).toHaveText('Join the community');
    const login = await openSignIn(otherTab);
    await login.getByRole('textbox', { name: 'Email address', exact: true }).fill(fixtureUsers.bob.email);
    await login.getByLabel('Password', { exact: true }).fill(fixturePassword);
    await login.getByRole('button', { name: 'Sign in', exact: true }).last().click();
    await expect(otherTab.locator('.account-button strong')).toHaveText(fixtureUsers.bob.name);
    await expect(page.locator('.account-button strong')).toHaveText(fixtureUsers.bob.name);
    const responseReceived = page.waitForResponse(response => response.request().method() === 'PUT' && new URL(response.url()).pathname === '/auth/v1/user');
    releaseUpdate();
    const response = await responseReceived;
    await response.finished();
    // Let the SDK consume the response and React commit its resulting state.
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    await expect.poll(() => fixture.passwordUpdates.length).toBe(before + 1);
    expect(fixture.passwordUpdates.at(-1)).toEqual({ userId: fixtureUsers.alice.id });
    await expect(page.locator('.account-button strong')).toHaveText(fixtureUsers.bob.name);
    await expect(recovery).toBeHidden();
    await expect(page.locator('.toast').filter({ hasText: /password.*updated|updated.*password/i })).toHaveCount(0);
    await otherTab.close();
  } finally { releaseUpdate(); }
});
