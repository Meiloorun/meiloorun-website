import { useId, type ReactNode } from 'react';
import { ActionLink } from './ActionLink';
import styles from './TrackerPanel.module.css';

export interface MediaEntry {
  title: string; href: string; image?: string; detail?: string; date?: string;
}
export interface TrackerFeed {
  state: 'unconfigured' | 'ready' | 'unavailable';
  current: MediaEntry[];
  recent: MediaEntry[];
  topArtists?: MediaEntry[];
  topArtistsState?: TrackerFeed['state'];
  updatedAt?: string;
}

/** Always retains an external link, whether displaying a feed, an embed, or neither. */
export function TrackerPanel({ name, profileUrl, feed, currentLabel = 'Currently consuming',
  recentLabel = 'Recent activity', currentVisual, embedUrl, emptyMessage = 'The collection will appear here once the tracker is connected.',
}: {
  name: string; profileUrl: string; feed?: TrackerFeed; currentLabel?: string;
  recentLabel?: string; currentVisual?: ReactNode; embedUrl?: string; emptyMessage?: string;
}) {
  const id = useId();
  return <div className={styles.panel}>
    <div className={styles.header}>
      <span className={styles.source}>TRACKED ON / {name}</span>
      <ActionLink href={profileUrl} target="_blank" rel="noopener noreferrer" aria-label={`Open ${name} in a new tab`}>Open {name}</ActionLink>
    </div>
    {feed?.state === 'ready' ? <>
      <div className={styles.feeds}>
        <section aria-labelledby={`${id}-current`}>
          <h3 id={`${id}-current`}>{currentLabel}</h3>
          {currentVisual}
          <EntryList entries={feed.current} empty="Nothing recorded here right now." />
        </section>
        <section aria-labelledby={`${id}-recent`}>
          <h3 id={`${id}-recent`}>{recentLabel}</h3>
          <EntryList entries={feed.recent} empty="No recent activity to show." />
        </section>
      </div>
      {feed.updatedAt && <p className={styles.timestamp}>Tracker snapshot: <time dateTime={feed.updatedAt}>{new Date(feed.updatedAt).toLocaleString('en-GB', { timeZone: 'UTC' })} UTC</time></p>}
    </> : <p className={styles.empty}>{feed?.state === 'unavailable' ? 'The tracker is unavailable right now. You can still open it above.' : emptyMessage}</p>}
    {embedUrl && feed?.state !== 'ready' && <details className={styles.embed}>
      <summary>View {name} here</summary>
      <p>If the tracker blocks embedding, use the button above to open it directly.</p>
      <iframe src={embedUrl} title={`${name} profile`} loading="lazy" referrerPolicy="no-referrer" />
    </details>}
  </div>;
}

function EntryList({ entries, empty }: { entries: MediaEntry[]; empty: string }) {
  return entries.length ? <ul className={styles.entries}>{entries.map((entry, index) =>
    <li key={`${entry.href}-${index}`}>
      {entry.image && <img src={entry.image} alt="" width={70} height={96} loading="lazy" />}
      <div><a href={entry.href} target="_blank" rel="noopener noreferrer">{entry.title}<span className={styles.srOnly}> (opens in a new tab)</span></a>
        {entry.detail && <p>{entry.detail}</p>}
        {entry.date && <time dateTime={entry.date}>{new Date(entry.date).toLocaleDateString('en-GB', { timeZone: 'UTC' })}</time>}
      </div>
    </li>)}</ul> : <p className={styles.empty}>{empty}</p>;
}

