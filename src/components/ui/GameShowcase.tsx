import { ActionLink } from './ActionLink';
import { InkLabel } from './InkLabel';
import styles from './GameShowcase.module.css';

export interface GameDetails {
  id: number; title: string; url: string; slug?: string; summary?: string; cover?: string;
  released?: string; developers: string[]; genres: string[]; platforms: string[];
}

export type GameResult = { state: 'ready'; game: GameDetails } | { state: 'unconfigured' | 'unavailable' | 'not-found' };

export function GameShowcase({ result, collectionUrl }: { result: GameResult; collectionUrl?: string }) {
  if (result.state !== 'ready') return <div className={styles.empty}>
    <InkLabel tone="yellow">MAIN GAME / SAVE SLOT</InkLabel>
    <p>{result.state === 'unconfigured' ? 'My current main game will appear here soon.' : result.state === 'not-found' ? 'This game could not be found on IGDB.' : 'Game details are unavailable right now. Check back soon.'}</p>
    <ActionLink href={collectionUrl ?? 'https://www.igdb.com/'} variant="plain" target="_blank" rel="noopener noreferrer">{collectionUrl ? 'View my Infinite Backlog collection' : 'Explore IGDB'}</ActionLink>
  </div>;
  const { game } = result;
  return <article className={styles.showcase}>
    {game.cover && <div className={styles.cover}><img src={game.cover} alt={`${game.title} cover`} width={264} height={352} decoding="async" /></div>}
    <div className={styles.content}>
      <InkLabel tone="yellow">CURRENT MAIN / LOCKED IN</InkLabel>
      <h3>{game.title}</h3>
      {game.summary && <p className={styles.summary}>{game.summary}</p>}
      <dl className={styles.details}>
        {game.developers.length > 0 && <div><dt>Developer</dt><dd>{game.developers.join(', ')}</dd></div>}
        {game.released && <div><dt>Released</dt><dd><time dateTime={game.released}>{new Date(game.released).toLocaleDateString('en-GB', { timeZone: 'UTC' })}</time></dd></div>}
        {game.genres.length > 0 && <div><dt>Genres</dt><dd>{game.genres.join(' / ')}</dd></div>}
        {game.platforms.length > 0 && <div><dt>Platforms</dt><dd>{game.platforms.join(' / ')}</dd></div>}
      </dl>
      <ActionLink href={collectionUrl ?? game.url} target="_blank" rel="noopener noreferrer" aria-label={`${game.title} on ${collectionUrl ? 'Infinite Backlog' : 'IGDB'} (opens in a new tab)`}>{collectionUrl ? 'View my Infinite Backlog collection' : 'Game details on IGDB'}</ActionLink>
      <p className={styles.credit}>Game information and artwork from IGDB.</p>
    </div>
  </article>;
}
