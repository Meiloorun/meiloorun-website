import type { ReactNode } from 'react';
import styles from './SiteShell.module.css';

export interface NavigationItem {
  label: string;
  href: string;
  current?: boolean;
}

export interface SiteShellProps {
  name: string;
  navigation: readonly NavigationItem[];
  children: ReactNode;
  skipTo?: string;
  headerNote?: ReactNode;
  footerNote?: ReactNode;
  decorations?: ReactNode;
}

/** Shared page chrome. Sections and their content remain the page's responsibility. */
export function SiteShell({
  name, navigation, children, skipTo = '#main-content', headerNote, footerNote, decorations,
}: SiteShellProps) {
  return (
    <div className={styles.page} id="top">
      {decorations && <div className={styles.decorations} aria-hidden="true">{decorations}</div>}
      <a className={styles.skipLink} href={skipTo}>Skip to content</a>
      <header className={styles.header}>
        <a className={styles.brand} href="/" aria-label={`${name} home`}>
          {name}<span aria-hidden="true">®</span>
        </a>
        <nav className={styles.nav} aria-label="Main navigation">
          {navigation.map(({ label, href, current }) => <a key={href} href={href} aria-current={current ? 'page' : undefined}>{label}</a>)}
        </nav>
        {headerNote && <div className={styles.headerNote}>{headerNote}</div>}
      </header>
      <main id="main-content" tabIndex={-1} className={styles.main}>{children}</main>
      <footer className={styles.footer}>
        <span>{name} / PERSONAL SPACE</span>
        {footerNote && <span className={styles.footerNote}>{footerNote}</span>}
        <span aria-hidden="true">✳</span>
      </footer>
    </div>
  );
}
