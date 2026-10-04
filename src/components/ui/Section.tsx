import { useId, type ComponentPropsWithoutRef, type ReactNode } from 'react';
import { SectionBackground, type BackgroundImage } from './SectionBackground';
import styles from './Section.module.css';

export type SectionMediaPosition = 'left' | 'center' | 'right' | 'none';
export type SectionImage = ComponentPropsWithoutRef<'img'> & { src: string; alt: string };

type MediaProps =
  | { image?: SectionImage; media?: never }
  | { image?: never; media?: ReactNode };

export type SectionProps = Omit<ComponentPropsWithoutRef<'section'>, 'title'> & MediaProps & {
  title?: ReactNode;
  headingLevel?: 1 | 2 | 3 | 4 | 5 | 6;
  eyebrow?: ReactNode;
  header?: ReactNode;
  footer?: ReactNode;
  actions?: ReactNode;
  /** Inside the main content column, after actions. footer remains full-width. */
  contentFooter?: ReactNode;
  /** Optional third column when mediaPosition is center. Stacks below content otherwise. */
  secondaryContent?: ReactNode;
  mediaPosition?: SectionMediaPosition;
  mediaWidth?: 'compact' | 'balanced' | 'wide';
  mobileOrder?: 'content-first' | 'media-first';
  align?: 'start' | 'center' | 'end';
  textAlign?: 'left' | 'center' | 'right';
  spacing?: 'none' | 'compact' | 'normal' | 'spacious';
  width?: 'readable' | 'wide' | 'full';
  tone?: 'transparent' | 'paper' | 'ink' | 'yellow';
  divider?: 'none' | 'top' | 'bottom' | 'both';
  minHeight?: 'auto' | 'screen';
  backgroundImage?: BackgroundImage;
  overlayOpacity?: number;
  decorations?: ReactNode;
  /** Clips decoration overflow without clipping the content or artwork frame. */
  clipDecorations?: boolean;
  contentClassName?: string;
  mediaClassName?: string;
  titleClassName?: string;
  eyebrowClassName?: string;
  actionsClassName?: string;
};

/** Layout and slots only: children supply cards, forms, galleries, or any other UI. */
export function Section({
  title,
  headingLevel = 2,
  eyebrow,
  header,
  footer,
  actions,
  contentFooter,
  children,
  secondaryContent,
  image,
  media,
  mediaPosition = 'left',
  mediaWidth = 'balanced',
  mobileOrder = 'content-first',
  align = 'center',
  textAlign = 'left',
  spacing = 'normal',
  width = 'wide',
  tone = 'transparent',
  divider = 'none',
  minHeight = 'auto',
  backgroundImage,
  overlayOpacity,
  decorations,
  clipDecorations = true,
  contentClassName = '',
  mediaClassName = '',
  titleClassName = '',
  eyebrowClassName = '',
  actionsClassName = '',
  className = '',
  ...props
}: SectionProps) {
  const titleId = `section-title-${useId()}`;
  const Heading = `h${headingLevel}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  const hasTitle = title !== undefined && title !== null && title !== false;
  const hasMedia = mediaPosition !== 'none' && (image != null || (media != null && media !== false));
  const placement = hasMedia ? mediaPosition : 'none';
  const threeColumns = placement === 'center' && secondaryContent != null;
  const mediaSlot = hasMedia ? (
    <div key="media" className={`${styles.media} ${mediaClassName}`}>
      {image ? <img loading="lazy" {...image} className={`${styles.image} ${image.className ?? ''}`} /> : media}
    </div>
  ) : null;
  const contentSlot = (
    <div key="content" className={`${styles.content} ${contentClassName}`}>
      {eyebrow && <div className={`${styles.eyebrow} ${eyebrowClassName}`}>{eyebrow}</div>}
      {hasTitle && <Heading id={titleId} className={`${styles.title} ${titleClassName}`}>{title}</Heading>}
      {children}
      {actions && <div className={`${styles.actions} ${actionsClassName}`}>{actions}</div>}
      {contentFooter}
    </div>
  );
  return (
    <section
      {...props}
      aria-labelledby={props['aria-labelledby'] ?? (props['aria-label'] ? undefined : hasTitle ? titleId : undefined)}
      className={`${styles.section} ${className}`}
      data-media-position={placement}
      data-media-width={mediaWidth}
      data-mobile-order={mobileOrder}
      data-align={align}
      data-text-align={textAlign}
      data-spacing={spacing}
      data-width={width}
      data-tone={tone}
      data-divider={divider}
      data-min-height={minHeight}
      data-three-columns={threeColumns || undefined}
    >
      {backgroundImage && <SectionBackground image={backgroundImage} overlayOpacity={overlayOpacity} />}
      {decorations && <div className={styles.decorations} data-clip={clipDecorations} aria-hidden="true">{decorations}</div>}
      <div className={styles.container}>
        {header && <div className={styles.header}>{header}</div>}
        <div className={styles.layout}>
          {placement === 'left' ? [mediaSlot, contentSlot] : [contentSlot, mediaSlot]}
          {secondaryContent != null && <div className={styles.secondary}>{secondaryContent}</div>}
        </div>
        {footer && <div className={styles.footer}>{footer}</div>}
      </div>
    </section>
  );
}
