import { MediaLayout } from './MediaLayout';
import { Section } from '../ui/Section';
import { TrackerPanel, type TrackerFeed } from '../ui/TrackerPanel';
import { DecorativeImage } from '../ui/DecorativeImage';
import { MediaSectionDecorations } from './MediaSectionDecorations';
import { ActionLink } from '../ui/ActionLink';
import { RecordPlayer } from '../ui/RecordPlayer';
import musicStyles from './MusicPage.module.css';
import styles from './MediaPage.module.css';

export default function MusicPage({ profileUrl, feed }: { profileUrl: string; feed: TrackerFeed }) {
  return <MediaLayout heroArtwork="/images/deco-dontoliver.svg" title={<>ALWAYS ON<br /><span className={styles.highlight}>REPEAT.</span></>} description="Whatever's in my headphones. Recent scrobbles, current listening, and the soundtrack to everything else.">
    <Section title="Music / listening log" decorations={<MediaSectionDecorations mark="/images/deco-6.svg" />}>
      <TrackerPanel name="Last.fm" profileUrl={profileUrl} feed={feed} currentLabel="Now playing at last sync" recentLabel="Recently listened" emptyMessage="My listening history is coming soon. The soundtrack lives on Last.fm."
        currentVisual={<div className={musicStyles.nowPlayingArtwork}>
          <DecorativeImage src="/images/deco-9.svg" placement="bottom-left" width="140px" offsetX="-12px" offsetY="12px" rotation={-12} opacity={0.65} />
          <DecorativeImage src="/images/deco-7.svg" placement="top-right" width="70px" offsetX="-4px" offsetY="6px" rotation={16} layer="foreground" mobile={{ width: '50px', offsetX: '-4px' }} />
          {/* Add gifSrc="/images/record-player.gif" when your GIF is in public/images. */}
          <RecordPlayer playing={feed.current.length > 0} />
        </div>}
      />
    </Section>
    <Section title="Top artists / last 7 days" divider="top" decorations={<MediaSectionDecorations mark="/images/deco-7.svg" flip />}
      actions={<ActionLink variant="plain" href={profileUrl} target="_blank" rel="noopener noreferrer" aria-label="More listening on Last.fm (opens in a new tab)">More listening on Last.fm</ActionLink>}
    >
      <p className={musicStyles.introduction}>My most played artists over the last seven days, ranked by play count.</p>
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

