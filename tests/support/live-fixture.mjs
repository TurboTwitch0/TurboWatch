/**
 * A controlled, local Supabase-compatible HTTP fixture for browser integration.
 * This exercises the real Supabase JS client and the app's polling fallback.
 * It does not validate hosted Supabase Auth, Realtime, storage, or PostgreSQL RLS.
 */
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';

export const fixturePublicKey = 'sb_publishable_turbowatch_local_fixture';
export const fixturePassword = 'fixture-password-123';
export const fixtureUsers = {
  alice: { id: '11111111-1111-4111-8111-111111111111', email: 'alice@example.test', name: 'Alice Fixture', username: 'alice_fixture' },
  bob: { id: '22222222-2222-4222-8222-222222222222', email: 'bob@example.test', name: 'Bob Fixture', username: 'bob_fixture' },
};
export const fixturePostId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

function jwt(user) {
  const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: user.id, aud: 'authenticated', role: 'authenticated', email: user.email, exp: Math.floor(Date.now() / 1000) + 3600 })}.local-fixture-signature`;
}

function authUser(user) {
  return { id: user.id, email: user.email, aud: 'authenticated', role: 'authenticated', app_metadata: { provider: 'email', providers: ['email'] }, user_metadata: { name: user.name }, identities: [], created_at: '2026-10-25T12:00:00.000Z', ...(user.confirmed === false ? {} : { email_confirmed_at: '2026-10-25T12:00:00.000Z' }) };
}

function session(user) {
  return { access_token: jwt(user), token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: `fixture-refresh-${user.id}`, user: authUser(user) };
}

export async function startSupabaseFixture({ port = 4400, appOrigin = 'http://127.0.0.1:3002' } = {}) {
  const users = Object.values(fixtureUsers).map(user => ({ ...user, password: fixturePassword, confirmed: true }));
  let requireEmailConfirmation = false;
  let rejectNextResend = false;
  /** @type {Record<string, Array<Record<string, unknown>>>} */
  const tables = {
    profiles: Object.values(fixtureUsers).map(user => ({ id: user.id, name: user.name, username: user.username, avatar: `${appOrigin}/media/avatar-${user === fixtureUsers.alice ? 'alex' : 'theo'}.svg`, bio: 'A controlled local integration-test account.', verified: false, cover: '', created_at: '2026-10-25T12:00:00.000Z' })),
    posts: [{ id: fixturePostId, creator_id: fixtureUsers.bob.id, title: 'A shared coastline', description: 'A video post shared between two separate browser accounts.', media_type: 'video', media_url: `${appOrigin}/media/coast.mp4`, thumbnail: `${appOrigin}/media/coast.jpg`, category: 'Travel', tags: ['fixture', 'shared', 'sharedcoast'], aspect: 'landscape', duration: '0:37', views: 0, created_at: '2026-10-25T12:00:00.000Z' }],
    post_likes: [], comments: [], follows: [], reposts: [], saved_posts: [], boards: [], board_posts: [], messages: [], message_reads: [],
  };
  const requests = [];
  let realtimeRefusals = 0;
  const knownUser = id => users.find(user => user.id === id);
  const userForRequest = request => {
    const token = String(request.headers.authorization || '').replace(/^Bearer /i, '');
    return users.find(user => token === jwt(user)) || (() => {
      try { return knownUser(JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString()).sub); } catch { return undefined; }
    })();
  };
  const owned = (table, row, user) => {
    if (!user) return false;
    if (table === 'profiles') return row.id === user.id;
    if (['posts', 'comments'].includes(table)) return row.creator_id === user.id;
    if (table === 'messages') return row.sender_id === user.id;
    if (table === 'follows') return row.follower_id === user.id;
    if (table === 'board_posts') return tables.boards.some(board => board.id === row.board_id && board.user_id === user.id);
    return row.user_id === user.id;
  };
  const visible = (table, row, user) => {
    if (['profiles', 'posts', 'post_likes', 'comments', 'follows', 'reposts'].includes(table)) return true;
    if (table === 'messages') return user && (row.sender_id === user.id || row.recipient_id === user.id);
    return owned(table, row, user);
  };
  const matches = (row, params) => {
    for (const [key, expression] of params) {
      if (['select', 'order', 'limit', 'offset', 'on_conflict'].includes(key)) continue;
      if (key === 'or') {
        const parts = expression.replace(/^\(|\)$/g, '').split(',');
        if (!parts.some(part => { const [column, op, ...value] = part.split('.'); return op === 'eq' && String(row[column]) === value.join('.'); })) return false;
      } else if (expression.startsWith('eq.') && String(row[key]) !== expression.slice(3)) return false;
      else if (expression.startsWith('neq.') && String(row[key]) === expression.slice(4)) return false;
    }
    return true;
  };
  const uniqueKeys = {
    profiles: ['id'], posts: ['id'], comments: ['id'], boards: ['id'], messages: ['id'],
    post_likes: ['user_id', 'post_id'], reposts: ['user_id', 'post_id'], saved_posts: ['user_id', 'post_id'],
    follows: ['follower_id', 'following_id'], board_posts: ['board_id', 'post_id'], message_reads: ['user_id', 'peer_id'],
  };
  const upsert = (table, row) => {
    const keys = uniqueKeys[table];
    const index = tables[table].findIndex(existing => keys.every(key => existing[key] === row[key]));
    if (index === -1) tables[table].push(row);
    else tables[table][index] = { ...tables[table][index], ...row };
  };
  const server = createServer(async (request, response) => {
    const url = new URL(request.url || '/', `http://127.0.0.1:${port}`);
    const user = userForRequest(request);
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
    response.setHeader('Access-Control-Allow-Headers', 'authorization,apikey,content-type,prefer,x-client-info,x-supabase-api-version,accept-profile,content-profile,x-retry-count');
    response.setHeader('Access-Control-Expose-Headers', 'content-range');
    response.setHeader('Content-Type', 'application/json');
    response.setHeader('Cache-Control', 'no-store');
    const reply = (status, data) => { response.statusCode = status; response.end(status === 204 ? undefined : JSON.stringify(data)); };
    if (request.method === 'OPTIONS') { reply(204); return; }
    requests.push({ method: request.method, path: url.pathname, userId: user?.id || null, at: Date.now() });
    try {
      if (request.headers.apikey !== fixturePublicKey) { reply(403, { message: 'The controlled fixture requires its public test key.' }); return; }
      const chunks = [];
      for await (const chunk of request) chunks.push(chunk);
      const text = Buffer.concat(chunks).toString();
      const body = text ? JSON.parse(text) : {};
      if (url.pathname === '/auth/v1/signup') {
        const email = String(body.email || '').trim().toLowerCase();
        const name = String(body.data?.name || body.data?.full_name || '').trim();
        if (!name || !email.includes('@') || String(body.password || '').length < 8) { reply(422, { code: 'validation_failed', msg: 'Enter your name, email, and a password of at least eight characters.' }); return; }
        if (users.some(value => value.email === email)) { reply(422, { code: 'user_already_exists', msg: 'User already registered' }); return; }
        const candidate = { id: randomUUID(), email, name, username: `${name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20) || 'creator'}_${randomUUID().slice(0, 8)}`, password: body.password, confirmed: !requireEmailConfirmation };
        users.push(candidate);
        tables.profiles.push({ id: candidate.id, name: candidate.name, username: candidate.username, avatar: '', bio: '', verified: false, cover: '', created_at: new Date().toISOString() });
        reply(200, candidate.confirmed ? session(candidate) : authUser(candidate)); return;
      }
      if (url.pathname === '/auth/v1/token') {
        const candidate = url.searchParams.get('grant_type') === 'refresh_token'
          ? users.find(value => body.refresh_token === `fixture-refresh-${value.id}`)
          : users.find(value => value.email === String(body.email).trim().toLowerCase() && body.password === value.password);
        if (!candidate) { reply(400, { error: 'invalid_grant', error_description: 'Invalid login credentials', msg: 'Invalid login credentials', code: 'invalid_credentials' }); return; }
        if (!candidate.confirmed) { reply(400, { code: 'email_not_confirmed', msg: 'Email not confirmed' }); return; }
        reply(200, session(candidate)); return;
      }
      if (url.pathname === '/auth/v1/user') { reply(user ? 200 : 401, user ? authUser(user) : { message: 'No fixture session.' }); return; }
      if (url.pathname === '/auth/v1/logout') { reply(204); return; }
      if (url.pathname === '/auth/v1/resend') {
        if (rejectNextResend) { rejectNextResend = false; reply(429, { code: 'over_email_send_rate_limit', msg: 'Please wait before requesting another confirmation email.' }); return; }
        if (body.type !== 'signup' || !String(body.email || '').includes('@')) { reply(422, { msg: 'Enter an account email address.' }); return; }
        reply(200, {}); return;
      }
      if (url.pathname.startsWith('/rest/v1/rpc/')) {
        if (!user) { reply(401, { message: 'Sign in first.' }); return; }
        const rpc = url.pathname.split('/').at(-1);
        if (rpc === 'set_post_saved') {
          if (body.should_save) {
            upsert('saved_posts', { user_id: user.id, post_id: body.target_post_id, created_at: new Date().toISOString() });
            let board = tables.boards.find(value => value.user_id === user.id && value.name === 'Saved');
            if (!board) { board = { id: randomUUID(), user_id: user.id, name: 'Saved', description: '', created_at: new Date().toISOString() }; tables.boards.push(board); }
            upsert('board_posts', { board_id: board.id, post_id: body.target_post_id });
          } else {
            tables.saved_posts = tables.saved_posts.filter(row => !(row.user_id === user.id && row.post_id === body.target_post_id));
            tables.board_posts = tables.board_posts.filter(row => !(owned('board_posts', row, user) && row.post_id === body.target_post_id));
          }
          reply(200, null); return;
        }
        if (rpc === 'save_post_to_board') {
          if (!tables.boards.some(board => board.id === body.target_board_id && board.user_id === user.id)) { reply(403, { message: 'Collection not owned by this test user.' }); return; }
          upsert('saved_posts', { user_id: user.id, post_id: body.target_post_id, created_at: new Date().toISOString() });
          upsert('board_posts', { board_id: body.target_board_id, post_id: body.target_post_id });
          reply(200, null); return;
        }
        reply(404, { message: `Fixture RPC ${rpc} is not implemented.` }); return;
      }
      if (!url.pathname.startsWith('/rest/v1/')) { reply(404, { message: 'Fixture endpoint not implemented.' }); return; }
      const table = url.pathname.slice('/rest/v1/'.length);
      if (!(table in tables)) { reply(404, { code: 'PGRST205', message: `Unknown fixture table: ${table}` }); return; }
      if (request.method === 'GET') {
        let rows = tables[table].filter(row => visible(table, row, user) && matches(row, url.searchParams));
        const order = url.searchParams.get('order');
        if (order) { const [key, direction] = order.split('.'); rows = [...rows].sort((a, b) => String(a[key] || '').localeCompare(String(b[key] || '')) * (direction === 'desc' ? -1 : 1)); }
        const limit = Number(url.searchParams.get('limit') || rows.length);
        rows = rows.slice(0, limit);
        response.setHeader('Content-Range', `0-${Math.max(0, rows.length - 1)}/${rows.length}`);
        reply(200, String(request.headers.accept).includes('vnd.pgrst.object') ? rows[0] || null : rows); return;
      }
      if (!user) { reply(401, { message: 'Test session required for writes.' }); return; }
      if (request.method === 'POST') {
        const rows = (Array.isArray(body) ? body : [body]).map(row => ({ created_at: new Date().toISOString(), ...row }));
        if (rows.some(row => !owned(table, row, user))) { reply(403, { message: 'The fixture rejected another user’s write.' }); return; }
        for (const row of rows) upsert(table, row);
        if (String(request.headers.prefer).includes('return=representation')) reply(201, rows);
        else reply(201, null);
        return;
      }
      if (request.method === 'DELETE') { tables[table] = tables[table].filter(row => !(owned(table, row, user) && matches(row, url.searchParams))); reply(204); return; }
      if (request.method === 'PATCH') {
        for (const row of tables[table]) if (owned(table, row, user) && matches(row, url.searchParams)) Object.assign(row, body);
        reply(204); return;
      }
      reply(405, { message: 'Unsupported fixture method.' });
    } catch (error) { reply(500, { message: error instanceof Error ? error.message : String(error) }); }
  });
  server.on('upgrade', (_request, socket) => {
    realtimeRefusals += 1;
    // Intentional failure: the browser must receive changes via app polling.
    socket.end('HTTP/1.1 503 Service Unavailable\r\nConnection: close\r\nContent-Length: 0\r\n\r\n');
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', resolve); });
  return {
    url: `http://127.0.0.1:${port}`, tables, requests,
    setSignupConfirmationRequired(required) { requireEmailConfirmation = required; },
    rejectNextConfirmationResend() { rejectNextResend = true; },
    confirmAccount(email) { const user = users.find(value => value.email === email); if (!user) throw new Error('Unknown fixture account'); user.confirmed = true; },
    get realtimeRefusals() { return realtimeRefusals; },
    async close() { server.closeAllConnections(); await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())); },
  };
}
