import type { CSSProperties } from 'react';
import styles from './SectionBackground.module.css';

export interface BackgroundImage {
  src: string;
  mobileSrc?: string;
  position?: string;
  mobilePosition?: string;
  loading?: 'eager' | 'lazy';
  fetchPriority?: 'high' | 'low' | 'auto';
}

interface SectionBackgroundProps {
  image?: BackgroundImage;
  /** Strength of the light wash over the image, from 0 to 1. */
  overlayOpacity?: number;
}

type BackgroundStyles = CSSProperties & {
  '--image-position': string;
  '--mobile-image-position': string;
};

/** Decorative artwork stays separate from the section's accessible content. */
export function SectionBackground({ image, overlayOpacity = 0.6 }: SectionBackgroundProps) {
  const imageStyles: BackgroundStyles = {
    '--image-position': image?.position ?? 'center',
    '--mobile-image-position': image?.mobilePosition ?? image?.position ?? 'center',
  };

  return (
    <div className={styles.background} style={imageStyles} aria-hidden="true">
      {image && (
        <picture>
          {image.mobileSrc && <source media="(max-width: 720px)" srcSet={image.mobileSrc} />}
          <img className={styles.image} src={image.src} alt="" loading={image.loading ?? 'lazy'} fetchPriority={image.fetchPriority ?? 'auto'} />
        </picture>
      )}
      <div className={styles.overlay} style={{ opacity: Math.min(1, Math.max(0, overlayOpacity)) }} />
    </div>
  );
}
