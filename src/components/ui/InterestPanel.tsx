import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import styles from './InterestPanel.module.css';

export interface Interest {
  title: string;
  subtitle: string;
  description: string;
}

export type InterestPanelProps = Omit<ComponentPropsWithoutRef<'details'>, 'title'> & Interest & {
  number?: string;
  children?: ReactNode;
};

export function InterestPanel({
  title, subtitle, description, number, children, className = '', ...props
}: InterestPanelProps) {
  return (
    <details {...props} className={`${styles.panel} ${className}`}>
      <summary className={styles.summary}>
        {number && <span className={styles.number}>{number} /</span>}
        <span className={styles.title}>{title}</span>
        <span className={styles.subtitle}>{subtitle}</span>
        <span className={styles.toggle} aria-hidden="true" />
      </summary>
      <p className={styles.description}>{description}</p>
      {children && <div className={styles.extraContent}>{children}</div>}
    </details>
  );
}
