import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import styles from './ArtworkFrame.module.css';

export interface Artwork {
  src: string;
  alt: string;
  position?: string;
  width?: number;
  height?: number;
}

export interface ArtworkFrameProps {
  image?: Artwork;
  label?: ReactNode;
  variant?: 'plain' | 'collage';
  metadata?: ReactNode;
  sticker?: ReactNode;
  className?: string;
  loading?: ComponentPropsWithoutRef<'img'>['loading'];
  fetchPriority?: ComponentPropsWithoutRef<'img'>['fetchPriority'];
}

/** The placeholder and final artwork share the same frame and dimensions. */
export function ArtworkFrame({
  image, label, variant = 'plain', metadata, sticker,
  className = '', loading = 'lazy', fetchPriority,
}: ArtworkFrameProps) {
  const hasLabel = label != null && label !== false && label !== '';
  return (
    <div className={`${styles.wrapper} ${className}`} data-variant={variant}>
      {metadata && (
        <div className={styles.metadata}>{metadata}<span aria-hidden="true">✳</span></div>
      )}
      <figure className={styles.frame} data-has-caption={hasLabel}>
        <div className={styles.visual}>
          {image ? (
            <img
              className={styles.image}
              src={image.src}
              alt={image.alt}
              width={image.width}
              height={image.height}
              loading={loading}
              fetchPriority={fetchPriority}
              style={{ objectPosition: image.position }}
            />
          ) : (
            <div className={styles.placeholder} role="img" aria-label="Placeholder for custom artwork">
              <span className={styles.crosshair} aria-hidden="true" />
              <span className={styles.placeholderTitle}>YOUR<br />ART HERE.</span>
              <span className={styles.placeholderDetail}>Illustration / photograph / collage</span>
            </div>
          )}
        </div>
        <span className={styles.cornerTop} aria-hidden="true" />
        <span className={styles.cornerBottom} aria-hidden="true" />
        {hasLabel && (
          <figcaption className={styles.caption}>{label}<span aria-hidden="true">↗</span></figcaption>
        )}
      </figure>
      {sticker && <span className={styles.sticker}>{sticker}</span>}
    </div>
  );
}
