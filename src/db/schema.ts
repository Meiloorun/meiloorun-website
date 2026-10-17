import { sql } from 'drizzle-orm';
import { boolean, check, index, integer, jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

/** A single row for owner-managed site settings, independent of cached API data. */
export const siteSettings = pgTable('site_settings', {
  id: text('id').primaryKey().default('main'),
  mainGameId: integer('main_game_id'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, table => [
  check('site_settings_singleton', sql`${table.id} = 'main'`),
  check('site_settings_positive_game_id', sql`${table.mainGameId} > 0`),
]);

/** Private tracker snapshots, retry state, and Simkl synchronization records. */
export const trackerCache = pgTable('tracker_cache', {
  key: text('key').primaryKey(),
  value: jsonb('value').$type<unknown>().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

/** Personal progress is durable application data, independent of tracker caches. */
export const comicIssues = pgTable('comic_issues', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  year: text('year'),
  chapter: text('chapter').notNull(),
  chapterTitle: text('chapter_title').notNull(),
  chapterOrder: integer('chapter_order').notNull(),
  position: integer('position').notNull(),
  sourceUrl: text('source_url').notNull(),
  readerUrl: text('reader_url'),
  isRead: boolean('is_read').default(false).notNull(),
  readAt: timestamp('read_at', { withTimezone: true }),
  active: boolean('active').default(true).notNull(),
}, table => [index('comic_issues_order_idx').on(table.active, table.chapterOrder, table.position)]);

/** One fixed administrator; these rows represent browser sessions, not users. */
export const adminSessions = pgTable('admin_sessions', {
  id: text('id').primaryKey(),
  tokenHash: text('token_hash').notNull().unique(),
  credentialKey: text('credential_key').notNull(),
  label: text('label').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
}, table => [index('admin_sessions_expiry_idx').on(table.expiresAt)]);

/** Persistent throttling and replay prevention survive restarts and multiple instances. */
export const adminAuthState = pgTable('admin_auth_state', {
  credentialKey: text('credential_key').primaryKey(),
  lastTotpStep: integer('last_totp_step').default(-1).notNull(),
  failures: integer('failures').default(0).notNull(),
  windowStartedAt: timestamp('window_started_at', { withTimezone: true }).defaultNow().notNull(),
  blockedUntil: timestamp('blocked_until', { withTimezone: true }),
  usedRecoveryHashes: jsonb('used_recovery_hashes').$type<string[]>().default([]).notNull(),
});
