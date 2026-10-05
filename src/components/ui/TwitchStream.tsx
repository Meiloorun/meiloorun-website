import { ActionLink } from './ActionLink';
import styles from './TwitchStream.module.css';

export function TwitchStream({ channel, parents }: { channel: string; parents: readonly string[] }) {
  const url = new URL('https://player.twitch.tv/');
  url.searchParams.set('channel', channel);
  url.searchParams.set('autoplay', 'false');
  for (const parent of parents) url.searchParams.append('parent', parent);
  return <div className={styles.stream}>
    <div className={styles.header}><span>ON AIR / {channel}</span><ActionLink href={`https://www.twitch.tv/${encodeURIComponent(channel)}`} target="_blank" rel="noopener noreferrer" aria-label="Watch on Twitch (opens in a new tab)">Watch on Twitch</ActionLink></div>
    <div className={styles.frame}>
      <iframe src={url.href} title={`${channel} Twitch stream`} width="1280" height="720" loading="lazy" allowFullScreen />
      <p className={styles.smallScreen}>Open Twitch above to watch on a smaller screen.</p>
    </div>
  </div>;
}
