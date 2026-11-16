import type { CSSProperties, ReactNode } from 'react';
import styles from './LoadingScreen.module.css';

export interface LoadingScreenProps {
  message?: ReactNode;
  /** Omit when the operation cannot report real progress. Values are 0–100. */
  progress?: number;
  logoSrc?: string;
  /** False for a section placeholder; its parent determines the available space. */
  fullScreen?: boolean;
  active?: boolean;
  className?: string;
}

/** Presentation only: navigation, React state or a deferred fallback controls its lifetime. */
export function LoadingScreen({ message = 'Did you know that the Meiloorun is a fruit from "Star Wars", first introduced in "Star Wars: Rebels"? It looks like a mango and I love mangoes which is why I became attached to it.', progress, logoSrc = '/favicon.svg',
  fullScreen = true, active = true, className = '' }: LoadingScreenProps) {
  if (!active) return null;
  const value = typeof progress === 'number' && Number.isFinite(progress) ? Math.min(100, Math.max(0, progress)) : undefined;
  return <div className={`${styles.screen} ${fullScreen ? styles.fullScreen : styles.contained} ${className}`}>
    <p className={styles.message} role="status" aria-live="polite" aria-atomic="true">{message}</p>
    <div className={styles.indicator}>
      <img className={styles.logo} src={logoSrc} alt="" aria-hidden="true" width={120} height={120} decoding="async" />
      <div className={styles.bar} role="progressbar" aria-label="Loading" aria-valuemin={0} aria-valuemax={100} aria-valuenow={value}
        data-indeterminate={value === undefined || undefined} style={{ '--progress': `${value ?? 0}%` } as CSSProperties}>
        <span className={styles.fill} />
      </div>
      <span className={styles.label} aria-hidden="true">LOADING{value === undefined ? '…' : ` / ${Math.round(value)}%`}</span>
    </div>
  </div>;
}
