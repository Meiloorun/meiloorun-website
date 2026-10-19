export const marvelSource = 'https://comicbookreadingorders.com/marvel/marvel-master-reading-order/';

export type ComicIssue = {
  id: string; title: string; year: string | null; chapter: string;
  position: number; readerUrl: string | null; isRead: boolean;
};
export type ReadingChapter = { id: string; title: string; total: number; read: number; sourceUrl: string };
export type ReadingSummary = { total: number; read: number; chapters: ReadingChapter[] };
export type ReadingPage = {
  summary: ReadingSummary; issues: ComicIssue[]; total: number; page: number; pageSize: number;
};
