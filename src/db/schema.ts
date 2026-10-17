import { jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

/** Private tracker snapshots, retry state, and Simkl synchronization records. */
export const trackerCache = pgTable('tracker_cache', {
  key: text('key').primaryKey(),
  value: jsonb('value').$type<unknown>().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
