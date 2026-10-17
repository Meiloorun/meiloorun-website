import type { ReactNode } from 'react';
import { MediaLayout } from './MediaLayout';
import { Section } from '../ui/Section';
import { TrackerPanel, type TrackerFeed } from '../ui/TrackerPanel';
import { MediaSectionDecorations } from './MediaSectionDecorations';
import { ActionLink } from '../ui/ActionLink';
import musicStyles from './MusicPage.module.css';
import styles from './MediaPage.module.css';

export default function MusicPage({ profileUrl, feed, nowPlaying }: { profileUrl: string; feed: TrackerFeed; nowPlaying?: ReactNode }) {
  return <MediaLayout heroArtwork="/images/deco-dontoliver.svg" title={<>MY<br /><span className={styles.highlight}>MURZIK.</span></>} description="i got a pretty diverse and comp murszik taste, yeah i got spotify premium.">
    <Section title="Music / listening log" decorations={<MediaSectionDecorations mark="/images/deco-6.svg" />}>
      <TrackerPanel name="Last.fm" profileUrl={profileUrl} feed={feed} currentLabel="Now playing / live" recentLabel="Recently listened" emptyMessage="My listening history is coming soon. The soundtrack lives on Last.fm."
        currentContent={nowPlaying}
      />
    </Section>
    <Section title="Top artists / last 7 days" divider="top" decorations={<MediaSectionDecorations mark="/images/deco-7.svg" flip />}
      actions={<ActionLink variant="plain" href={profileUrl} target="_blank" rel="noopener noreferrer" aria-label="More listening on Last.fm (opens in a new tab)">More listening on Last.fm</ActionLink>}
    >
      <p className={musicStyles.introduction}>My most listened to artists over the last seven days, ranked by play count.</p>
      {feed.topArtistsState === 'ready' && feed.topArtists?.length ? (
        <ol className={musicStyles.artists}>
          {feed.topArtists.map((artist, index) => (
            <li key={artist.href}>
              <span className={musicStyles.number} aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
              <a href={artist.href} target="_blank" rel="noopener noreferrer" aria-label={`${artist.title} on Last.fm (opens in a new tab)`}>{artist.title}<span aria-hidden="true"> ↗</span></a>
              <p>{artist.detail}</p>
            </li>
          ))}
        </ol>
      ) : (
        <p className={musicStyles.empty}>{feed.topArtistsState === 'unavailable' ? 'Top artists are unavailable right now. You can still explore my listening on Last.fm.' : feed.topArtistsState === 'ready' ? 'No artists recorded in the last seven days yet.' : 'Top artists will appear here once my listening log is connected.'}</p>
      )}
    </Section>
  </MediaLayout>;
}

