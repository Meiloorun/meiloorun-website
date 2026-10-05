import styles from './RecordPlayer.module.css';

export interface RecordPlayerProps {
  /** Optional rotating record GIF. Place the file in public/images and use /images/name.gif. */
  gifSrc?: string;
  playing?: boolean;
}

/** Decorative GIF slot with a CSS record fallback for paused/reduced-motion views. */
export function RecordPlayer({ gifSrc, playing = false }: RecordPlayerProps) {
  return <div className={styles.player} data-playing={playing} data-has-gif={Boolean(gifSrc)} aria-hidden="true">
    <span className={styles.caption}>SIDE A / {playing ? 'ON ROTATION' : 'NEEDLE UP'}</span>
    <div className={styles.platter}>
      <div className={styles.record}><span className={styles.label}>MEILOORUN<br />33⅓ RPM</span></div>
      {gifSrc && <img className={styles.gif} src={gifSrc} alt="" width={260} height={260} decoding="async" />}
    </div>
    <span className={styles.tonearm} />
    <span className={styles.light} />
  </div>;
}
