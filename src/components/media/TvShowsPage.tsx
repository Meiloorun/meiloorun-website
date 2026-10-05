import { MediaLayout } from './MediaLayout';
import { Section } from '../ui/Section';
import { MediaSectionDecorations } from './MediaSectionDecorations';
import { TrackerPanel, type TrackerFeed } from '../ui/TrackerPanel';
import styles from './MediaPage.module.css';

export default function TvShowsPage({ simklUrl = 'https://simkl.com/', simklFeed, animeUrl, animeFeed }: {
  simklUrl?: string; simklFeed: TrackerFeed; animeUrl: string; animeFeed: TrackerFeed;
}) {
  return <MediaLayout heroArtwork="/images/deco-lelouch.svg" title={<>MY LIST OF<br /><span className={styles.highlight}>TELEVISION.</span></>} description="All types of shows, from anime to live-action.">
    <nav className={styles.jumpLinks} aria-label="TV sections"><a href="#television">TV shows</a><a href="#anime">Anime</a></nav>
    <Section id="television" title="TV shows / watch log" decorations={<MediaSectionDecorations mark="/images/deco-6.svg" />}>
      <TrackerPanel name="Simkl" profileUrl={simklUrl} feed={simklFeed} currentLabel="Currently watching" recentLabel="Recently watched" emptyMessage="My TV watch log is coming soon. The full history lives on Simkl." />
    </Section>
    <Section id="anime" title="Anime / watch log" divider="top" decorations={<MediaSectionDecorations mark="/images/deco-14.svg" flip />}>
      <TrackerPanel name="AniList" profileUrl={animeUrl} feed={animeFeed} currentLabel="Currently watching" recentLabel="Recent list updates" emptyMessage="My anime watch log is coming soon. The full list lives on AniList." />
    </Section>
  </MediaLayout>;
}

