import { and, asc, count, eq, ilike, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { databaseConnection } from '../db/client.ts';
import { comicIssues } from '../db/schema.ts';
import { setting } from './trackerRuntime.mjs';
import type { ReadingPage, ReadingSummary } from './comicReadingTypes.ts';

export function readingDatabase() {
  const url = setting('DATABASE_URL');
  if (!url) throw new Error('Reading database is not configured');
  return databaseConnection(url).db;
}

export async function readingSummary(db: NodePgDatabase): Promise<ReadingSummary> {
  const rows = await db.select({
    id: comicIssues.chapter, title: comicIssues.chapterTitle, sourceUrl: comicIssues.sourceUrl,
    total: count().as('total_count'), read: sql<number>`count(*) filter (where ${comicIssues.isRead})`.mapWith(Number).as('read_count'),
  }).from(comicIssues).where(eq(comicIssues.active, true))
    .groupBy(comicIssues.chapter, comicIssues.chapterTitle, comicIssues.sourceUrl, comicIssues.chapterOrder)
    .orderBy(asc(comicIssues.chapterOrder));
  return { chapters: rows, total: rows.reduce((n, row) => n + row.total, 0), read: rows.reduce((n, row) => n + row.read, 0) };
}

export async function readingPage(db: NodePgDatabase, params: URLSearchParams): Promise<ReadingPage> {
  const pageSize = 75;
  const requested = Number(params.get('page') || 1);
  const page = Number.isSafeInteger(requested) && requested > 0 ? Math.min(requested, 100000) : 1;
  const query = (params.get('q') || '').trim().slice(0, 150);
  const chapter = params.get('chapter');
  const status = params.get('status');
  const where = and(eq(comicIssues.active, true), chapter ? eq(comicIssues.chapter, chapter) : undefined,
    query ? ilike(comicIssues.title, `%${query.replace(/[\\%_]/g, '\\$&')}%`) : undefined,
    status === 'read' || status === 'unread' ? eq(comicIssues.isRead, status === 'read') : undefined);
  const [{ total }] = await db.select({ total: count() }).from(comicIssues).where(where);
  const boundedPage = Math.min(page, Math.max(1, Math.ceil(total / pageSize)));
  const issues = await db.select({ id: comicIssues.id, title: comicIssues.title, year: comicIssues.year,
    chapter: comicIssues.chapter, position: comicIssues.position, readerUrl: comicIssues.readerUrl, isRead: comicIssues.isRead,
  }).from(comicIssues).where(where).orderBy(asc(comicIssues.chapterOrder), asc(comicIssues.position))
    .limit(pageSize).offset((boundedPage - 1) * pageSize);
  return { summary: await readingSummary(db), issues, total, page: boundedPage, pageSize };
}

export async function markComicRead(db: NodePgDatabase, id: string, isRead: boolean) {
  const [issue] = await db.update(comicIssues).set({ isRead, readAt: isRead ? new Date() : null })
    .where(and(eq(comicIssues.id, id), eq(comicIssues.active, true))).returning({ id: comicIssues.id, isRead: comicIssues.isRead });
  return issue;
}

