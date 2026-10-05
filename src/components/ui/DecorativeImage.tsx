import type { CSSProperties, ComponentPropsWithoutRef } from 'react';
import styles from './DecorativeImage.module.css';

export type DecorationPlacement =
  | 'top-left' | 'top-center' | 'top-right'
  | 'center-left' | 'center' | 'center-right'
  | 'bottom-left' | 'bottom-center' | 'bottom-right';

export interface DecorationAppearance {
  placement?: DecorationPlacement;
  size?: 'small' | 'medium' | 'large';
  /** CSS length, percentage, or clamp(). Numbers are pixels. Overrides size. */
  width?: CSSProperties['width'];
  /** Positive offsets move right/down. Percentages are relative to the container. */
  offsetX?: CSSProperties['left'];
  offsetY?: CSSProperties['top'];
  rotation?: number;
  opacity?: number;
  flipX?: boolean;
  flipY?: boolean;
}

export interface DecorativeImageProps extends DecorationAppearance {
  src: string;
  mobileSrc?: string;
  /** absolute anchors to the nearest positioned parent; fixed anchors to the viewport. */
  position?: 'absolute' | 'fixed';
  layer?: 'background' | 'foreground';
  mobile?: DecorationAppearance;
  hideOnMobile?: boolean;
  intrinsicWidth?: number;
  intrinsicHeight?: number;
  /** Defaults to eager without dimensions so clipped, edge-anchored images can load. */
  loading?: ComponentPropsWithoutRef<'img'>['loading'];
  className?: string;
  style?: CSSProperties;
}

const anchors: Record<DecorationPlacement, readonly [string, string, string, string]> = {
  'top-left': ['0%', '0%', '0%', '0%'],
  'top-center': ['50%', '0%', '-50%', '0%'],
  'top-right': ['100%', '0%', '-100%', '0%'],
  'center-left': ['0%', '50%', '0%', '-50%'],
  center: ['50%', '50%', '-50%', '-50%'],
  'center-right': ['100%', '50%', '-100%', '-50%'],
  'bottom-left': ['0%', '100%', '0%', '-100%'],
  'bottom-center': ['50%', '100%', '-50%', '-100%'],
  'bottom-right': ['100%', '100%', '-100%', '-100%'],
};

const sizes = {
  small: 'clamp(100px, 15%, 240px)',
  medium: 'clamp(160px, 25%, 420px)',
  large: 'clamp(240px, 40%, 640px)',
};

type DecorationStyle = CSSProperties & { [key: `--decoration-${string}`]: string | number };
const length = (value: CSSProperties['width']) => typeof value === 'number' ? `${value}px` : value;

function appearanceStyle(appearance: DecorationAppearance, mobile = false): DecorationStyle {
  const [left, top, anchorX, anchorY] = anchors[appearance.placement ?? 'top-left'];
  const prefix = mobile ? '--decoration-mobile-' : '--decoration-';
  return {
    [`${prefix}left`]: left,
    [`${prefix}top`]: top,
    [`${prefix}anchor-x`]: anchorX,
    [`${prefix}anchor-y`]: anchorY,
    [`${prefix}width`]: length(appearance.width) ?? sizes[appearance.size ?? 'medium'],
    [`${prefix}offset-x`]: length(appearance.offsetX) ?? '0px',
    [`${prefix}offset-y`]: length(appearance.offsetY) ?? '0px',
    [`${prefix}rotation`]: `${appearance.rotation ?? 0}deg`,
    [`${prefix}opacity`]: Math.min(1, Math.max(0, appearance.opacity ?? 1)),
    [`${prefix}flip-x`]: appearance.flipX ? -1 : 1,
    [`${prefix}flip-y`]: appearance.flipY ? -1 : 1,
  };
}

/** Purely decorative: hidden from assistive technology and never intercepts clicks. */
export function DecorativeImage({
  src, mobileSrc, position = 'absolute', layer = 'background', mobile, hideOnMobile = false,
  intrinsicWidth, intrinsicHeight, loading, className = '', style, ...appearance
}: DecorativeImageProps) {
  // A mobile size should replace a desktop custom width when no mobile width is supplied.
  const mobileAppearance = { ...appearance, ...mobile };
  if (mobile?.size !== undefined && mobile.width === undefined) delete mobileAppearance.width;

  return (
    <picture
      className={`${styles.decoration} ${className}`}
      aria-hidden="true"
      data-position={position}
      data-layer={layer}
      data-hide-on-mobile={hideOnMobile || undefined}
      style={{ ...appearanceStyle(appearance), ...appearanceStyle(mobileAppearance, true), ...style }}
    >
      {mobileSrc && <source media="(max-width: 720px)" srcSet={mobileSrc} />}
      <img src={src} alt="" width={intrinsicWidth} height={intrinsicHeight} loading={loading ?? (intrinsicWidth && intrinsicHeight ? 'lazy' : 'eager')} decoding="async" draggable={false} />
    </picture>
  );
}
