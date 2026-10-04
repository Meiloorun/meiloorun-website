import type { ComponentPropsWithoutRef } from 'react';
import styles from './InkLabel.module.css';

export type InkLabelProps = ComponentPropsWithoutRef<'span'> & { tone?: 'ink' | 'yellow' };

export function InkLabel({ children, tone = 'ink', className = '', ...props }: InkLabelProps) {
  return <span {...props} className={`${styles.label} ${styles[tone]} ${className}`}>{children}</span>;
}
