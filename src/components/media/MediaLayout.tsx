import type { ReactNode } from 'react';
import { SiteShell } from '../layout/SiteShell';
import { Section } from '../ui/Section';
import { InkLabel } from '../ui/InkLabel';
import { ActionLink } from '../ui/ActionLink';
import { DecorativeImage } from '../ui/DecorativeImage';
import styles from './MediaPage.module.css';

export function MediaLayout({ title, description, children, hub = false, heroArtwork = '/images/deco-juri3.svg' }: {
  title: ReactNode; description: ReactNode; children: ReactNode; hub?: boolean; heroArtwork?: string;
}) {
  return (
    <SiteShell name="Meiloorun"
      navigation={[
        { label: '01 / Home', href: '/' },
        { label: '02 / Projects', href: '/projects' },
        { label: '03 / Media', href: '/media', current: hub },
      ]}
      headerNote={<>I have the greatest taste<br />of all time, no?</>}
      footerNote="PLAY / READ / WATCH / LISTEN"
      decorations={<>
        <DecorativeImage src="/images/deco-4.svg" placement="center-left" width="220px" offsetX="-170px" rotation={-18} opacity={0.5} hideOnMobile />
        <DecorativeImage src="/images/deco-7.svg" placement="bottom-right" width="100px" offsetX="28px" offsetY="25px" rotation={16} mobile={{ width: '55px', offsetX: '18px', offsetY: '15px' }} />
        <DecorativeImage src="/images/deco-3.svg" placement="center-right" width="clamp(120px, 16vw, 240px)" offsetX="120px" rotation={-22} opacity={0.5} hideOnMobile />
        <DecorativeImage src="/images/deco-8.svg" placement="bottom-left" width="150px" offsetX="-65px" offsetY="-90px" rotation={12} opacity={0.45}
          mobile={{ width: '75px', offsetX: '-45px', offsetY: '-85px', opacity: 0.25 }} />
      </>}
    >
      <Section headingLevel={1} className={styles.hero} titleClassName={styles.heroTitle}
        eyebrow={<InkLabel tone="yellow">MEDIA / {hub ? 'THE COLLECTION' : 'A CLOSER LOOK'}</InkLabel>}
        title={title}
        decorations={<>
          <DecorativeImage src="/images/deco-14.svg" placement="top-right" width="clamp(80px, 14%, 180px)" offsetY="30px" rotation={-10} opacity={0.65} mobile={{ width: '65px', opacity: 0.2 }} />
          <DecorativeImage src={heroArtwork} placement="bottom-right" width="clamp(190px, 30%, 390px)" offsetX="-25px" offsetY="35px" rotation={-3} opacity={0.65} className={styles.heroPortrait} hideOnMobile />
          <DecorativeImage src="/images/deco-9.svg" placement="bottom-right" width="240px" offsetX="65px" offsetY="55px" rotation={-18} opacity={0.4}
            mobile={{ width: '100px', offsetX: '50px', offsetY: '30px', opacity: 0.2 }} />
          <DecorativeImage src="/images/deco-6.svg" placement="top-center" width="60px" offsetX="80px" offsetY="24px" rotation={18} opacity={0.65} hideOnMobile />
        </>}
      >
        <p className={styles.lead}>{description}</p>
        {!hub && <ActionLink variant="plain" href="/media">All media</ActionLink>}
      </Section>
      {children}
    </SiteShell>
  );
}

