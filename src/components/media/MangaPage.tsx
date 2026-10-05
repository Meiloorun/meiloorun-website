import { MediaLayout } from './MediaLayout';
import { Section } from '../ui/Section';
import { MediaSectionDecorations } from './MediaSectionDecorations';
import { TrackerPanel, type TrackerFeed } from '../ui/TrackerPanel';
import styles from './MediaPage.module.css';

export default function MangaPage({ profileUrl, feed }: { profileUrl: string; feed: TrackerFeed }) {
  return <MediaLayout heroArtwork="/images/deco-chihara.svg" title={<>これは私の<br /><span className={styles.highlight}>MANGA.</span></>} description="This is a lil preview of the manga I read.">
    <Section title="Manga / reading log" decorations={<MediaSectionDecorations mark="/images/deco-14.svg" />}>
      <TrackerPanel name="AniList" profileUrl={profileUrl} feed={feed} currentLabel="Currently reading" recentLabel="Recent list updates" emptyMessage="My reading log is coming soon. The full collection lives on AniList." />
    </Section>
  </MediaLayout>;
}

