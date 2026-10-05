import { MediaLayout } from './MediaLayout';
import { Section } from '../ui/Section';
import { MediaSectionDecorations } from './MediaSectionDecorations';
import { TrackerPanel, type TrackerFeed } from '../ui/TrackerPanel';
import styles from './MediaPage.module.css';

export default function MoviesPage({ profileUrl = 'https://simkl.com/', feed }: { profileUrl?: string; feed: TrackerFeed }) {
  return <MediaLayout heroArtwork="/images/deco-vader.svg" title={<>ABSOLUTE CINEMA<br /><span className={styles.highlight}>MOVIES.</span></>} description="Take a look at the movies I've watched... and the ones I'll watch eventually.">
    <Section title="Movies / watch log" decorations={<MediaSectionDecorations mark="/images/deco-7.svg" flip />}>
      <TrackerPanel name="Simkl" profileUrl={profileUrl} feed={feed} currentLabel="On the watchlist" recentLabel="Recently watched" emptyMessage="My film log is coming soon. The full watch history lives on Simkl." />
    </Section>
  </MediaLayout>;
}

