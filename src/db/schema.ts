import { boolean, index, integer, jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

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
