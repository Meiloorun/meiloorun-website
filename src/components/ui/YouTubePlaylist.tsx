import { ActionLink } from './ActionLink';
import styles from './StreamEmbed.module.css';

export function YouTubePlaylist({ playlistId, title = 'VOD playlist', label = 'REPLAY / STREAM VODS' }: {
  playlistId: string; title?: string; label?: string;
}) {
  const embed = new URL('https://www.youtube-nocookie.com/embed/videoseries');
  embed.search = new URLSearchParams({ list: playlistId, autoplay: '0', playsinline: '1' }).toString();
  const playlist = new URL('https://www.youtube.com/playlist');
  playlist.searchParams.set('list', playlistId);

  return <div className={styles.stream}>
    <div className={styles.header}>
      <span>{label}</span>
      <ActionLink href={playlist.href} target="_blank" rel="noopener noreferrer" aria-label="Watch playlist on YouTube (opens in a new tab)">Watch on YouTube</ActionLink>
    </div>
    <div className={styles.frame}>
      <iframe src={embed.href} title={title} width="1280" height="720" loading="lazy"
        referrerPolicy="strict-origin-when-cross-origin" allow="encrypted-media; fullscreen; picture-in-picture" allowFullScreen />
    </div>
  </div>;
}
