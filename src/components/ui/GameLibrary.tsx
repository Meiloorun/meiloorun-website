import { gameCollectionUrl, type GameLibrary as LibraryData, type LibraryGame } from '../../lib/gameLibrary';
import type { LibraryGameArtwork } from '../../lib/igdb';
import { ActionLink } from './ActionLink';
import styles from './GameLibrary.module.css';

export function GameLibrary({ library, artwork, profileUrl }: { library: LibraryData; artwork: Record<number, LibraryGameArtwork>; profileUrl: string }) {
  return <div>
    <div className={styles.header}>
      <p>{library.entries.length} library entries / {library.playing.length} currently playing<br />
        {library.snapshotDate ? <>Library snapshot: <time dateTime={library.snapshotDate}>{library.snapshotDate}</time></> : 'Library snapshot from a manual export'}</p>
      <ActionLink href={profileUrl} target="_blank" rel="noopener noreferrer">Open Infinite Backlog</ActionLink>
    </div>
    <section aria-labelledby="library-playing"><h3 className={styles.heading} id="library-playing">Currently playing</h3>
      <GameCards games={library.playing} artwork={artwork} profileUrl={profileUrl} empty="No games marked as Playing in this snapshot." />
    </section>
    <section aria-labelledby="library-completed"><h3 className={styles.heading} id="library-completed">Recently completed</h3>
      <GameCards games={library.recentlyCompleted} artwork={artwork} profileUrl={profileUrl} empty="No dated completions in this snapshot." showCompletion />
    </section>
    <details className={styles.collection}><summary>Browse the full collection / {library.entries.length} entries</summary>
      <ul className={styles.fullList}>{[...library.entries].sort((a, b) => a.title.localeCompare(b.title)).map((game, i) => {
        const entryUrl = gameCollectionUrl(game.igdbId ? artwork[game.igdbId]?.slug : undefined, profileUrl);
        return <li key={i}>
          <strong><a href={entryUrl ?? profileUrl} target="_blank" rel="noopener noreferrer" aria-label={`${game.title}: ${entryUrl ? 'open my Infinite Backlog entry' : 'browse my Infinite Backlog collection'} (opens in a new tab)`}>{game.title}</a></strong><span>{[game.platform, game.status || 'No status', game.completion].filter(Boolean).join(' / ')}</span>
        </li>;
      })}</ul>
    </details>
  </div>;
}

function GameCards({ games, artwork, profileUrl, empty, showCompletion = false }: { games: LibraryGame[]; artwork: Record<number, LibraryGameArtwork>; profileUrl: string; empty: string; showCompletion?: boolean }) {
  return games.length ? <ul className={styles.cards}>{games.map((game, i) => {
    const art = game.igdbId ? artwork[game.igdbId] : undefined;
    const entryUrl = gameCollectionUrl(art?.slug, profileUrl);
    return <li key={i}>
      {art?.cover && <img src={art.cover} alt="" width={90} height={120} loading="lazy" />}
      <div><h4><a href={entryUrl ?? profileUrl} target="_blank" rel="noopener noreferrer" aria-label={`${game.title}: ${entryUrl ? 'open my Infinite Backlog entry' : 'browse my Infinite Backlog collection'} (opens in a new tab)`}>{game.title}</a></h4>
        <p>{game.platform}</p>
        {showCompletion && game.completedOn && <p>{game.completion} / <time dateTime={game.completedOn}>{game.completedOn}</time></p>}
        {game.rating && <p>My rating: {game.rating}/10</p>}
      </div>
    </li>;
  })}</ul> : <p>{empty}</p>;
}
