import type { PrayerTimesResult } from '../../lib/prayerTimes';
import styles from './LifePage.module.css';

export function PrayerTimes({ result }: { result: PrayerTimesResult }) {
  return <section className={`${styles.panel} ${styles.prayers}`} aria-labelledby="mubarak-prayer-times">
    <div className={styles.prayerHeader}><h3 id="mubarak-prayer-times">MASJID MUBARAK / SALAT.</h3>
      <a href="https://khuddam.org.uk/salat/" target="_blank" rel="noopener noreferrer">View MKA UK timings ↗</a>
    </div>
    {result.state === 'ready' ? <>
      <dl className={styles.prayerGrid}>{result.schedule.times.map(prayer => <div key={prayer.name}>
        <dt>{prayer.name}</dt><dd>{prayer.time}</dd>
      </div>)}</dl>
      <p className={styles.meta}>{result.schedule.sourceNote} / Europe/London<br />
        Source checked <time dateTime={result.checkedAt}>{new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(result.checkedAt))}</time>
      </p>
    </> : <p role="status">Prayer timings are temporarily unavailable. Check the source for the published schedule.</p>}
  </section>;
}
