import { expect, test } from '@playwright/test';
import { createDemoState } from '../lib/demo-state';
import { demoUser, seedBoards, seedComments, seedCreators, seedMessages, seedPosts } from '../lib/seed';

// Run against the normal, unconfigured build. Connected-project coverage lives
// in live-sync.spec.ts and uses its explicitly enabled local API fixture.
test.skip(Boolean(process.env.LIVE_TEST_BASE_URL), 'This test exercises a build without Supabase configuration.');

test('the default app requires real account setup and ignores an old browser demo identity', async ({ page }) => {
  const oldDemo = createDemoState({ user: demoUser, creators: seedCreators, posts: seedPosts, comments: seedComments, messages: seedMessages, boards: seedBoards });
  await page.addInitScript(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)), { key: 'turbowatch:demo:v1', value: oldDemo });
  await page.goto('/');
  await expect(page.locator('.account-button strong')).toHaveText('Join the community');
  await expect(page.locator('.account-button')).not.toContainText('Alex Carter');
  await expect(page.locator('.post-card')).toHaveCount(0);
  await page.getByRole('button', { name: 'Create', exact: true }).click();
  const setup = page.getByRole('dialog', { name: 'Account setup required', exact: true });
  await expect(setup).toBeVisible();
  await expect(setup.getByRole('link', { name: 'Supabase setup instructions', exact: true })).toHaveAttribute('href', /supabase\/SETUP\.md/);
  await expect(setup.getByRole('textbox')).toHaveCount(0);
  await expect(page.locator('.account-button strong')).toHaveText('Join the community');
});

test('leaving the sample preview opens real account setup without refreshing or keeping Alex signed in', async ({ page }) => {
  await page.goto('/?demo=1');
  await expect(page.locator('.post-card')).toHaveCount(seedPosts.length);
  await page.evaluate(() => { document.documentElement.dataset.authDocument = 'same-document'; });
  await page.getByRole('button', { name: 'Sign in to real account', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Account setup required', exact: true })).toBeVisible();
  await expect(page.locator('.account-button strong')).toHaveText('Join the community');
  await expect(page.locator('.post-card')).toHaveCount(0);
  expect(new URL(page.url()).searchParams.has('demo')).toBe(false);
  expect(await page.evaluate(() => document.documentElement.dataset.authDocument)).toBe('same-document');
});

test('an expired email confirmation link explains recovery and can be dismissed without refreshing', async ({ page }) => {
  await page.goto('/#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired');
  const warning = page.getByRole('alert').filter({ hasText: 'Your email confirmation link has expired or is invalid.' });
  await expect(warning).toBeVisible();
  await expect(warning).toContainText('request a fresh confirmation email');
  await page.evaluate(() => { document.documentElement.dataset.authDocument = 'expired-link-document'; });
  await warning.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Account setup required', exact: true })).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: 'Close dialog', exact: true }).click();
  await warning.getByRole('button', { name: 'Dismiss confirmation error', exact: true }).click();
  await expect(warning).toBeHidden();
  expect(await page.evaluate(() => document.documentElement.dataset.authDocument)).toBe('expired-link-document');
  expect(new URL(page.url()).hash).toBe('');
});
