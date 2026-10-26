import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const db = new PGlite();
let checks = 0;
const check = (condition, message) => { assert.ok(condition, message); checks++; };
const alice = '00000000-0000-4000-a000-000000000001';
const bob = '00000000-0000-4000-a000-000000000002';
const eve = '00000000-0000-4000-a000-000000000003';
const post = '10000000-0000-4000-a000-000000000001';
const beforeSetup = '00000000-0000-4000-a000-000000000004';
const twinA = '00000000-0000-4000-a000-000000000005';
const twinB = '00000000-0000-4000-a000-000000000006';
const unicodeName = '00000000-0000-4000-a000-000000000007';
const collisionUser = '00000000-0000-4000-a000-000000000008';

// Supply only the platform-owned schemas/roles/functions that Supabase normally
// provides. Application SQL, grants, policies, triggers, and RPCs run unchanged.
await db.exec(`
  create role anon;
  create role authenticated;
  create schema auth;
  create schema storage;
  create table auth.users (id uuid primary key, raw_user_meta_data jsonb);
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
  create function storage.foldername(path text) returns text[] language sql immutable as
    $$ select string_to_array(path, '/') $$;
  alter table storage.objects enable row level security;
  grant usage on schema public, auth, storage to anon, authenticated;
  grant select on storage.objects to anon;
  grant select, insert, delete on storage.objects to authenticated;
  create publication supabase_realtime;
`);
const schema = await readFile(new URL('../supabase/schema.sql', import.meta.url), 'utf8');
await db.query('insert into auth.users values ($1,$2)', [beforeSetup, {full_name:'Before Setup'}]);
await db.exec(schema);
check((await db.query('select name from profiles where id=$1', [beforeSetup])).rows[0].name === 'Before Setup', 'existing auth accounts receive profiles using full_name metadata');
await db.query('update profiles set name=$1 where id=$2', ['My edited name', beforeSetup]);
await db.exec(schema);
check((await db.query('select name from profiles where id=$1', [beforeSetup])).rows[0].name === 'My edited name', 'rerunning setup preserves existing profile edits');
checks++;
console.log('PASS complete schema applies and re-applies');

await db.query('insert into auth.users values ($1,$2),($3,$4),($5,$6)', [alice, {name:'Alice'}, bob, {name:'Bob'}, eve, {name:'Eve'}]);
check((await db.query('select * from public.profiles')).rows.length === 4, 'signup trigger creates a separate profile for each account');
await db.query('insert into auth.users values ($1,$2),($3,$4),($5,$6)', [twinA, {name:'Same Creator'}, twinB, {name:'Same Creator'}, unicodeName, {name:'東京'}]);
const twins = (await db.query('select username from profiles where id in ($1,$2)', [twinA,twinB])).rows;
check(twins.length === 2 && twins[0].username !== twins[1].username, 'same display names and UUID prefixes still receive unique usernames');
const unicodeProfile = (await db.query('select name,username from profiles where id=$1', [unicodeName])).rows[0];
check(unicodeProfile.name === '東京' && /^creator_[a-f0-9]{12}$/.test(unicodeProfile.username), 'non-Latin display names retain their name and receive a valid username');
// Deliberately occupy the next account's first candidate to exercise retries.
await db.query("update profiles set username='collision_' || left(md5($1 || ':0'),12) where id=$2", [collisionUser,alice]);
await db.query('insert into auth.users values ($1,$2)', [collisionUser,{name:'Collision'}]);
check((await db.query("select username = 'collision_' || left(md5($1 || ':1'),12) as retried from profiles where id=$2", [collisionUser,collisionUser])).rows[0].retried, 'username collision retries create the account successfully');

async function asUser(id, action) {
  await db.exec('set role authenticated');
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
  try { return await action(); }
  finally { await db.exec('reset role'); }
}
async function mustDeny(sql, params, message) {
  let denied = false;
  try { await db.query(sql, params); } catch { denied = true; }
  check(denied, message);
}

await asUser(alice, async () => {
  await db.query(`insert into posts (id,creator_id,title,media_type,media_url,thumbnail,category)
    values ($1,$2,'Test post','video','https://example.com/video.mp4','','Travel')`, [post,alice]);
  await mustDeny(`insert into posts (creator_id,title,media_type,media_url,category)
    values ($1,'Forged','video','https://example.com/video.mp4','Travel')`, [bob], 'post ownership cannot be forged');
  await db.query('update profiles set name=$1 where id=$2', ['Alice Updated',alice]);
  await mustDeny('update profiles set verified=true where id=$1', [alice], 'users cannot verify themselves');
  await mustDeny('select provision_user_profile($1,$2)', [bob,{name:'Forged'}], 'internal account provisioner is not browser callable');
  await db.query('update profiles set name=$1 where id=$2', ['Attacker',bob]);
  await db.query('insert into messages(sender_id,recipient_id,text) values($1,$2,$3)', [alice,bob,'A private message']);
  await mustDeny('insert into messages(sender_id,recipient_id,text) values($1,$2,$3)', [bob,eve,'Forged sender'], 'sender cannot be forged');
});
check((await db.query('select name from profiles where id=$1',[bob])).rows[0].name === 'Bob', 'another profile cannot be updated');

await asUser(bob, async () => {
  check((await db.query('select * from messages')).rows.length === 1, 'recipient sees private message');
  check((await db.query('select * from posts where id=$1',[post])).rows.length === 1, 'another real account can browse a published post');
  await db.query('insert into post_likes(user_id,post_id) values($1,$2)', [bob,post]);
  await db.query('insert into comments(creator_id,post_id,text) values($1,$2,$3)', [bob,post,'A shared comment']);
  await db.query('insert into reposts(user_id,post_id) values($1,$2)', [bob,post]);
  await db.query('insert into follows(follower_id,following_id) values($1,$2)', [bob,alice]);
  await mustDeny('insert into post_likes(user_id,post_id) values($1,$2)', [alice,post], 'like ownership cannot be forged');
  await mustDeny('insert into comments(creator_id,post_id,text) values($1,$2,$3)', [alice,post,'Forged comment'], 'comment ownership cannot be forged');
  await mustDeny('insert into follows(follower_id,following_id) values($1,$2)', [alice,bob], 'follow ownership cannot be forged');
  await db.query('select set_post_saved($1,true)', [post]);
  await db.query('select set_post_saved($1,true)', [post]);
  check((await db.query('select * from saved_posts')).rows.length === 1, 'saving is idempotent');
  check((await db.query('select * from boards')).rows.length === 1, 'one default Saved board');
  check((await db.query('select * from board_posts')).rows.length === 1, 'saved post appears in default board');
  await mustDeny('insert into saved_posts(user_id,post_id) values($1,$2)',[alice,post], 'save ownership cannot be forged');
  await db.query('insert into storage.objects(bucket_id,name) values($1,$2)', ['media',`${bob}/valid.jpg`]);
  await mustDeny('insert into storage.objects(bucket_id,name) values($1,$2)', ['media',`${alice}/forged.jpg`], 'upload path belongs to caller');
});

await asUser(alice, async () => {
  check((await db.query('select user_id from post_likes where post_id=$1',[post])).rows[0].user_id === bob, 'post owner sees another account like');
  check((await db.query('select creator_id,text from comments where post_id=$1',[post])).rows[0].creator_id === bob, 'post owner sees another account comment');
  check((await db.query('select user_id from reposts where post_id=$1',[post])).rows[0].user_id === bob, 'post owner sees another account repost');
  check((await db.query('select follower_id from follows where following_id=$1',[alice])).rows[0].follower_id === bob, 'recipient sees another account follow');
});

const bobBoardId = (await asUser(bob, async () => (await db.query('select id from boards')).rows[0].id));
await asUser(eve, async () => {
  check((await db.query('select * from messages')).rows.length === 0, 'outsider cannot see private messages');
  check((await db.query('select * from saved_posts')).rows.length === 0, 'outsider cannot see saves');
  check((await db.query('select * from boards')).rows.length === 0, 'outsider cannot see boards');
  check((await db.query('select * from board_posts')).rows.length === 0, 'outsider cannot see collection membership');
  await mustDeny('select save_post_to_board($1,$2)', [post,bobBoardId], 'RPC cannot save into another account collection');
});

await asUser(bob, async () => {
  await db.query('select set_post_saved($1,false)',[post]);
  check((await db.query('select * from saved_posts')).rows.length === 0, 'unsaving clears personal saves');
  check((await db.query('select * from board_posts')).rows.length === 0, 'unsaving clears board membership');
  await mustDeny('update messages set text=$1', ['Tampered'], 'messages cannot be edited');
});

await db.exec('set role anon');
check((await db.query('select * from posts')).rows.length === 1, 'anonymous users can browse public posts');
await mustDeny(`insert into posts(creator_id,title,media_type,media_url,category) values($1,'Anonymous post','image','https://example.com/p.jpg','Art')`, [alice], 'anonymous visitors cannot publish as another account');
await mustDeny('select * from messages', [], 'anonymous users cannot read private messages');
await mustDeny('select set_post_saved($1,true)', [post], 'anonymous users cannot invoke save RPC');
await db.exec('reset role');

const publications = (await db.query("select tablename from pg_publication_tables where pubname='supabase_realtime'")).rows.map((row) => row.tablename);
check(!['saved_posts','board_posts','boards','message_reads'].some((table) => publications.includes(table)), 'private composite keys stay outside Realtime');
check(publications.includes('messages'), 'new private messages can stream through participant RLS');
console.log(`PASS ${checks} PostgreSQL schema/access checks`);
await db.close();
