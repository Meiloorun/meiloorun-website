import type { ReactNode } from 'react';
import { SiteShell } from '../layout/SiteShell';
import { Section } from '../ui/Section';
import { InkLabel } from '../ui/InkLabel';
import { DecorativeImage } from '../ui/DecorativeImage';
import styles from './AdminPage.module.css';

export default function AdminPage({ panel }: { panel?: ReactNode }) {
  return <SiteShell name="Meiloorun" headerNote={<>I SEE<br />EVERYTHING</>} footerNote="WE ARE AT THE BRIDGE.">
    <Section headingLevel={1} eyebrow={<InkLabel tone="yellow">OWNER / CONTROL ROOM</InkLabel>} title="ADMIN." titleClassName={styles.title}
      decorations={<DecorativeImage src="/images/deco-7.svg" placement="top-right" width="100px" rotation={12} offsetY="30px" opacity={0.6} hideOnMobile />}>
      <p className={styles.introduction}>If you not Meiloorun, then DIE.</p>
      {panel}
    </Section>
  </SiteShell>;
}
