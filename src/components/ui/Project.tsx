import { useId, type ComponentPropsWithoutRef, type ReactNode } from 'react';
import { ActionLink } from './ActionLink';
import { InkLabel } from './InkLabel';
import styles from './Project.module.css';

export interface ProjectImage {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  position?: string;
}

export interface ProjectLink {
  label: string;
  href: string;
  newTab?: boolean;
}

export type ProjectProps = Omit<ComponentPropsWithoutRef<'article'>, 'title'> & {
  title: string;
  description?: ReactNode;
  image?: ProjectImage;
  links?: readonly ProjectLink[];
  tags?: readonly string[];
  status?: string;
  year?: string;
  number?: string;
  featured?: boolean;
  headingLevel?: 2 | 3 | 4;
};

/** A project can be text-only, have multiple destinations, or include custom content. */
export function Project({
  title, description, image, links = [], tags = [], status, year, number,
  featured = false, headingLevel = 3, children, className = '', ...props
}: ProjectProps) {
  const headingId = `project-${useId()}`;
  const Heading = `h${headingLevel}` as 'h2' | 'h3' | 'h4';

  return (
    <article
      {...props}
      aria-labelledby={props['aria-labelledby'] ?? (props['aria-label'] ? undefined : headingId)}
      className={`${styles.project} ${className}`}
      data-featured={featured || undefined}
      data-has-image={Boolean(image)}
    >
      {image && (
        <div className={styles.visual}>
          <img src={image.src} alt={image.alt} width={image.width} height={image.height} loading="lazy" decoding="async" style={{ objectPosition: image.position }} />
          <span className={styles.imageMark} aria-hidden="true">↗</span>
        </div>
      )}
      <div className={styles.content}>
        {(number || year || status) && (
          <div className={styles.metadata}>
            {(number || year) && <span className={styles.reference}>{[number && `PROJECT / ${number}`, year].filter(Boolean).join(' · ')}</span>}
            {status && <InkLabel tone="yellow">{status}</InkLabel>}
          </div>
        )}
        <Heading id={headingId} className={styles.title}>{title}</Heading>
        {description && <div className={styles.description}>{description}</div>}
        {tags.length > 0 && (
          <ul className={styles.tags} aria-label="Project technologies and categories">
            {tags.map((tag) => <li key={tag}>{tag}</li>)}
          </ul>
        )}
        {children && <div className={styles.extra}>{children}</div>}
        {links.length > 0 && (
          <nav className={styles.links} aria-label={`${title} links`}>
            {links.map(({ label, href, newTab }, index) => (
              <ActionLink
                key={`${href}-${label}`}
                href={href}
                variant={index === 0 ? 'primary' : 'plain'}
                target={newTab ? '_blank' : undefined}
                rel={newTab ? 'noopener noreferrer' : undefined}
                aria-label={`${label}: ${title}${newTab ? ' (opens in a new tab)' : ''}`}
              >
                {label}
              </ActionLink>
            ))}
          </nav>
        )}
      </div>
    </article>
  );
}
