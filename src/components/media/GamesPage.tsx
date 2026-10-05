import { MediaLayout } from './MediaLayout';
import { Section } from '../ui/Section';
import { GameLibrary } from '../ui/GameLibrary';
import { gameCollectionUrl, type GameLibrary as LibraryData } from '../../lib/gameLibrary';
import type { LibraryGameArtwork } from '../../lib/igdb';
import { GameShowcase, type GameResult } from '../ui/GameShowcase';
import { TwitchStream } from '../ui/TwitchStream';
import { MediaSectionDecorations } from './MediaSectionDecorations';
import styles from './MediaPage.module.css';

export default function GamesPage({ profileUrl = 'https://infinitebacklog.net/users/meiloorun/collection', mainGame, library, artwork }: { profileUrl?: string; mainGame: GameResult; library: LibraryData; artwork: Record<number, LibraryGameArtwork> }) {
  return <MediaLayout heroArtwork="/images/deco-jin.svg" title={<>VIDEO<br /><span className={styles.highlight}>GAMES.</span></>} description="Enter the domain of the ultimate gamer.">
    <Section id="stream" title="Watch me play" divider="top" decorations={<MediaSectionDecorations mark="/images/deco-7.svg" />}>
      <p>I'm not a streamer, I'm jess a gamer.</p>
      <TwitchStream channel="meiloorun_" parents={['localhost', '127.0.0.1', 'meiloorun.github.io', 'meiloorun.gg', 'www.meiloorun.gg']} />
    </Section>
    <Section title="Current main game" decorations={<MediaSectionDecorations flip />}>
      <GameShowcase result={mainGame} collectionUrl={(mainGame.state === 'ready' ? gameCollectionUrl(mainGame.game.slug, profileUrl) : undefined) ?? profileUrl} />
    </Section>
    <Section title="The backlog" decorations={<MediaSectionDecorations mark="/images/deco-14.svg" />}>
      <GameLibrary library={library} artwork={artwork} profileUrl={profileUrl} />
    </Section>
  </MediaLayout>;
}

