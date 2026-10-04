import type { ComponentPropsWithoutRef } from 'react';
import styles from './ActionLink.module.css';

export type ActionLinkProps = ComponentPropsWithoutRef<'a'> & { variant?: 'primary' | 'plain' };

export function ActionLink({ children, variant = 'primary', className = '', ...props }: ActionLinkProps) {
  return <a {...props} className={`${styles.link} ${styles[variant]} ${className}`}>{children}<span aria-hidden="true">↗</span></a>;
}
