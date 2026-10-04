import { SiteShell } from '../layout/SiteShell';
import { Section } from '../ui/Section';
import { Project } from '../ui/Project';
import { InkLabel } from '../ui/InkLabel';
import { ActionLink } from '../ui/ActionLink';
import { DecorativeImage } from '../ui/DecorativeImage';
import styles from './ProjectsPage.module.css';

/** Add Project components directly below. Copy and layout stay in this file. */
export default function ProjectsPage() {
  return (
    <SiteShell
      name="Meiloorun"
      navigation={[
        { label: '01 / Home', href: '/' },
        { label: '02 / Projects', href: '/projects', current: true },
        { label: '03 / About', href: '/#about' },
      ]}
      headerNote={<>Enter the lab.<br />Curiosity at work.</>}
      footerNote="MADE OUT OF CURIOSITY. ALWAYS IN PROGRESS."
      decorations={
        <>
          <DecorativeImage src="/images/deco-12.svg" placement="top-left" width="340px" offsetX="-280px" offsetY="170px" rotation={-15} opacity={0.6} hideOnMobile />
          <DecorativeImage src="/images/deco-7.svg" placement="bottom-right" width="110px" offsetX="30px" offsetY="35px" rotation={15} mobile={{ width: '65px', offsetX: '20px', offsetY: '20px' }} />
        </>
      }
    >
      <Section
        id="projects-intro"
        headingLevel={1}
        className={styles.hero}
        contentClassName={styles.heroContent}
        titleClassName={styles.heroTitle}
        eyebrow={<InkLabel>Projects / The collection</InkLabel>}
        title={<>THINGS<br /><span className={styles.highlight}>I’VE MADE.</span></>}
        decorations={
          <>
            <DecorativeImage src="/images/deco-asura.svg" placement="bottom-right" width="clamp(190px, 30%, 350px)" offsetX="30px" offsetY="25px" rotation={-5} opacity={0.85} hideOnMobile />
            <DecorativeImage src="/images/deco-11.svg" placement="top-right" width="85px" offsetX="-15px" offsetY="10px" rotation={12} opacity={0.75} mobile={{ width: '55px', offsetX: '-5px', opacity: 0.25 }} />
          </>
        }
      >
        <p className={styles.introduction}>Experiments, works in progress, and things built because I wanted to see what would happen. Welcome to the lab.</p>
        <div className={styles.heroNotes}><span>BUILD / BREAK / FIGURE IT OUT</span><a href="#collection">Explore the collection <span aria-hidden="true">↓</span></a></div>
      </Section>

      <Section id="collection" spacing="none" className={styles.collection} aria-labelledby="collection-title">
        <div className={styles.sectionHeader}><h2 id="collection-title">ON THE WORKBENCH.</h2><span>01 / First entry. More to come.</span></div>
        <div className={styles.listing}>
          <Project
            title="Meiloorun — Personal site"
            number="01"
            status="In progress"
            featured
            image={{ src: '/images/intro.svg', alt: 'Meiloorun artwork from the homepage.', width: 600, height: 700 }}
            description="My own corner of the internet. A home for projects, media, and everyday discoveries, with an ink-and-yellow interface built from reusable components."
            tags={['Astro', 'React', 'TypeScript', 'CSS Modules']}
            links={[
              { label: 'Open the site', href: '/' },
              { label: 'Build notes', href: '#build-notes' },
            ]}
          >
            <p className={styles.projectNote}>A living project. The design and the collection keep growing together.</p>
          </Project>
          <aside className={styles.next} aria-labelledby="next-title">
            <span className={styles.nextNumber} aria-hidden="true">02 /</span>
            <InkLabel tone="yellow">Room for the next idea</InkLabel>
            <h3 id="next-title">WHAT’S<br />NEXT?</h3>
            <p>The next experiment hasn’t landed here yet. There’s always something else to make.</p>
            <span className={styles.nextSymbol} aria-hidden="true">✳</span>
          </aside>
        </div>
      </Section>

      <Section
        id="build-notes"
        className={styles.notes}
        title="BEHIND THE BUILD."
        titleClassName={styles.notesTitle}
        eyebrow={<InkLabel>Field notes / 001</InkLabel>}
        decorations={<DecorativeImage src="/images/deco-8.svg" placement="bottom-right" width="180px" offsetX="80px" offsetY="40px" rotation={15} opacity={0.12} mobile={{ width: '100px', opacity: 0.08 }} />}
      >
        <div className={styles.noteGrid}>
          <div><h3>Astro + React</h3><p>Astro handles the pages. React components supply the interface, with JavaScript added when an interaction needs it.</p></div>
          <div><h3>Pieces that fit together</h3><p>Sections, artwork frames, project entries, and decorations can be composed without rebuilding each page from scratch.</p></div>
          <div><h3>A work in progress</h3><p>The site is the first experiment in this collection. New projects will get their own entry as they take shape.</p></div>
        </div>
        <ActionLink variant="plain" href="/">Back to my corner</ActionLink>
      </Section>
    </SiteShell>
  );
}
