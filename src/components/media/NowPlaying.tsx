import { useEffect, useState } from 'react';
import { EntryList, type NowPlayingFeed } from '../ui/TrackerPanel';
import { DecorativeImage } from '../ui/DecorativeImage';
import { RecordPlayer } from '../ui/RecordPlayer';
import styles from './MusicPage.module.css';

export default function NowPlaying({ initialFeed }: { initialFeed: NowPlayingFeed }) {
  const [feed, setFeed] = useState(initialFeed);
  useEffect(() => {
    if (initialFeed.state === 'unconfigured') return;
    let disposed = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let controller: AbortController | undefined;
    let retryAt = Date.now() + (initialFeed.retryAfter || 0) * 1000;
    async function refresh() {
      if (disposed || document.hidden || controller) return;
      if (retryAt > Date.now()) { timer = setTimeout(refresh, retryAt - Date.now()); return; }
      controller = new AbortController();
      const timeout = setTimeout(() => controller?.abort(), 10000);
      let delay = 15000;
      try {
        const response = await fetch('/api/music/now-playing', { cache: 'no-store', signal: controller.signal });
        if (!response.ok) {
          delay = Math.max(60000, (Number(response.headers.get('Retry-After')) || 0) * 1000);
          throw new Error('Now playing unavailable');
        }
        const value: NowPlayingFeed = await response.json();
        retryAt = 0;
        if (!disposed) setFeed(value);
      } catch {
        delay = Math.max(delay, 60000);
        retryAt = Date.now() + delay;
        if (!disposed) setFeed({ state: 'unavailable', current: [], checkedAt: new Date().toISOString() });
      } finally {
        clearTimeout(timeout);
        controller = undefined;
        if (!disposed && !document.hidden) timer = setTimeout(refresh, delay);
      }
    }
    const visibilityChanged = () => {
      clearTimeout(timer);
      if (document.hidden) controller?.abort();
      else void refresh();
    };
    document.addEventListener('visibilitychange', visibilityChanged);
    if (!document.hidden) timer = setTimeout(refresh, Math.max(15000, (initialFeed.retryAfter || 0) * 1000));
    return () => { disposed = true; clearTimeout(timer); controller?.abort(); document.removeEventListener('visibilitychange', visibilityChanged); };
  }, [initialFeed.state]);
  return <div>
    <div className={styles.nowPlayingArtwork}>
      <DecorativeImage src="/images/deco-9.svg" placement="bottom-left" width="140px" offsetX="-12px" offsetY="12px" rotation={-12} opacity={0.65} />
      <DecorativeImage src="/images/deco-7.svg" placement="top-right" width="70px" offsetX="-4px" offsetY="6px" rotation={16} layer="foreground" mobile={{ width: '50px', offsetX: '-4px' }} />
      {/* Add gifSrc="/images/record-player.gif" when your GIF is in public/images. */}
      <RecordPlayer playing={feed.state === 'ready' && feed.current.length > 0} />
    </div>
    <div aria-live="polite">
      {feed.state === 'ready' ? <EntryList entries={feed.current} empty="Nothing playing right now." /> :
        <p>{feed.state === 'unconfigured' ? 'Now playing will appear once Last.fm is connected.' : 'Live playback status is unavailable right now.'}</p>}
    </div>
  </div>;
}
