import { useEffect, useId, useState } from 'react';
import { marvelSource, type ReadingPage, type ReadingSummary } from '../../lib/comicReadingTypes';
import styles from './ComicReadingChecklist.module.css';

const emptySummary: ReadingSummary = { total: 0, read: 0, chapters: [] };

export default function ComicReadingChecklist({ initialSummary, canEdit: initiallyCanEdit = false }: {
  initialSummary?: ReadingSummary; canEdit?: boolean;
}) {
  const formId = useId();
  const [expanded, setExpanded] = useState(false);
  const [summary, setSummary] = useState(initialSummary || emptySummary);
  const [data, setData] = useState<ReadingPage>();
  const [chapter, setChapter] = useState('');
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [canEdit, setCanEdit] = useState(initiallyCanEdit);
  const [error, setError] = useState(initialSummary ? '' : 'Reading progress is temporarily unavailable.');

  useEffect(() => {
    if (!expanded) return;
    const controller = new AbortController();
    let disposed = false;
    const timeout = setTimeout(() => controller.abort(new DOMException('Request timed out', 'TimeoutError')), 15000);
    setLoading(true);
    setError('');
    const params = new URLSearchParams({ chapter, status, q: query, page: String(page) });
    void (async () => {
      try {
        const response = await fetch(`/api/comics/reading?${params}`, { cache: 'no-store', signal: controller.signal });
        if (!response.ok) throw new Error('Could not load the reading list. Please retry.');
        const value: ReadingPage = await response.json();
        if (!controller.signal.aborted) { setData(value); setSummary(value.summary); }
      } catch (error) {
        if (!disposed) setError(controller.signal.aborted ? 'The reading list took too long to load. Please retry.' : error instanceof Error ? error.message : 'Could not load reading progress.');
      } finally { clearTimeout(timeout); if (!disposed) setLoading(false); }
    })();
    return () => { disposed = true; clearTimeout(timeout); controller.abort(); };
  }, [expanded, chapter, status, query, page, revision]);

  async function markRead(id: string, isRead: boolean) {
    if (!canEdit || saving || loading) return;
    setSaving(true);
    setError('');
    try {
      const response = await fetch('/api/comics/reading', { method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, isRead }), signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) {
        if (response.status === 401) setCanEdit(false);
        const body = await response.json();
        throw new Error(body.error || 'Could not save reading progress.');
      }
      // Show only confirmed writes; reload counts and filtered pagination from PostgreSQL.
      setData(current => current ? { ...current, issues: current.issues.map(issue => issue.id === id ? { ...issue, isRead } : issue) } : current);
      setRevision(value => value + 1);
    } catch (error) { setError(error instanceof Error ? error.message : 'Could not save reading progress. Please retry.'); }
    finally { setSaving(false); }
  }

  return <details className={styles.checklist} onToggle={event => setExpanded(event.currentTarget.open)}>
    <summary className={styles.heading}>
      <span className={styles.title}>THE MARVEL READ-THROUGH.</span>
      <span className={styles.counter}>{summary.read.toLocaleString()} / {summary.total.toLocaleString()} READ</span>
      <span className={styles.expand} aria-hidden="true">+</span>
    </summary>
    <div className={styles.body}>
      <progress className={styles.progress} value={summary.read} max={summary.total || 1} aria-label="Marvel reading progress" />
      <p className={styles.intro}>One issue at a time. Following the <a href={marvelSource} target="_blank" rel="noreferrer">Comic Book Reading Orders Marvel master list ↗</a>.</p>
      <p className={styles.status}>Includes publicly available parts and their event lists. Membership-only lists are excluded.</p>
      <p className={styles.status}>{canEdit ? 'Admin editing is enabled.' : <>Reading progress is view-only. <a href="/admin">Sign in as admin</a> to make changes.</>}</p>
      <div className={styles.filters}>
        <label>Reading order<select value={chapter} disabled={saving} onChange={event => { setChapter(event.target.value); setPage(1); }}>
          <option value="">All parts</option>
          {summary.chapters.map(part => <option key={part.id} value={part.id}>{part.title.replace('Marvel Master Reading Order ', '')} · {part.read}/{part.total}</option>)}
        </select></label>
        <label>Show<select value={status} disabled={saving} onChange={event => { setStatus(event.target.value); setPage(1); }}>
          <option value="all">All issues</option><option value="unread">Unread</option><option value="read">Read</option>
        </select></label>
        <form className={styles.search} onSubmit={event => { event.preventDefault(); setQuery(search.trim()); setPage(1); }}>
          <label htmlFor={`${formId}-search`}>Find an issue</label>
          <div><input id={`${formId}-search`} type="search" value={search} maxLength={150} onChange={event => setSearch(event.target.value)} placeholder="Series or issue number" disabled={saving} /><button disabled={saving}>Search</button></div>
        </form>
      </div>
      {error && <div role="alert" className={styles.error}>{error} <button type="button" onClick={() => setRevision(value => value + 1)}>Retry loading</button></div>}
      <p role="status" className={styles.status}>{loading ? 'Loading issues…' : saving ? 'Saving progress…' : summary.total ? `${data?.total.toLocaleString() ?? summary.total.toLocaleString()} issues in this view.` : 'No issues have been added yet.'}</p>
      <ol className={styles.issues} aria-busy={loading || saving}>
        {data?.issues.map(issue => <li key={issue.id} className={styles.issue} data-read={issue.isRead}>
          <label>
            <input type="checkbox" checked={issue.isRead} disabled={!canEdit || saving || loading} onChange={event => void markRead(issue.id, event.target.checked)} />
            <span className={styles.position}>{String(issue.position).padStart(4, '0')}</span>
            <span className={styles.issueTitle}>{issue.title}{issue.year && <small> ({issue.year})</small>}</span>
            <span className={styles.readLabel}>{issue.isRead ? 'Read' : 'Unread'}</span>
          </label>
          {issue.readerUrl && <a href={issue.readerUrl} target="_blank" rel="noreferrer" aria-label={`Read ${issue.title} on Marvel`}>Read ↗</a>}
        </li>)}
      </ol>
      {!loading && data && data.total === 0 && summary.total > 0 && <p>No issues match these filters.</p>}
      {data && data.total > data.pageSize && <nav className={styles.pagination} aria-label="Reading-list pages">
        <button type="button" disabled={loading || saving || data.page <= 1} onClick={() => setPage(data.page - 1)}>← Previous</button>
        <span>Page {data.page} / {Math.ceil(data.total / data.pageSize)}</span>
        <button type="button" disabled={loading || saving || data.page * data.pageSize >= data.total} onClick={() => setPage(data.page + 1)}>Next →</button>
      </nav>}
    </div>
  </details>;
}
