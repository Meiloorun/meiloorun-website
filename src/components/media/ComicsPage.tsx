import { MediaLayout } from './MediaLayout';
import { Section } from '../ui/Section';
import { TrackerPanel } from '../ui/TrackerPanel';
import { MediaSectionDecorations } from './MediaSectionDecorations';
import styles from './MediaPage.module.css';
import type { ReactNode } from 'react';

export default function ComicsPage({ profileUrl = 'https://batcave.biz/', embedUrl, readingTracker }: { profileUrl?: string; embedUrl?: string; readingTracker?: ReactNode }) {
  return <MediaLayout heroArtwork="/images/deco-logan.svg" title={<>MY COLLECTION OF<br /><span className={styles.highlight}>COMICS.</span></>} description="Currently reading through entire universes.">
    <Section title="Comics / the shelf" decorations={<MediaSectionDecorations />}>
      <TrackerPanel name="BatCave.biz" profileUrl={profileUrl} embedUrl={embedUrl} emptyMessage="Open BatCave.biz to explore and read the collection." />
    </Section>
    <Section title="Marvel / Reading progress" decorations={<MediaSectionDecorations />}>
      {readingTracker}
    </Section>
  </MediaLayout>;
}

