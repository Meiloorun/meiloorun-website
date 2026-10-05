import { SiteShell } from '../layout/SiteShell';
import { Section } from '../ui/Section';
import { Project } from '../ui/Project';
import { InkLabel } from '../ui/InkLabel';
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
      headerNote={<>Enter the lab.<br />Watch ahttt... </>}
      footerNote="MADE OUT OF CURIOSITY. ALWAYS IN PROGRESS."
      decorations={
        <>
          <DecorativeImage src="/images/deco-12.svg" intrinsicWidth={226} intrinsicHeight={207} loading="eager" placement="top-left" width="340px" offsetX="-280px" offsetY="170px" rotation={-15} opacity={0.6} hideOnMobile />
          <DecorativeImage src="/images/deco-7.svg" intrinsicWidth={436} intrinsicHeight={452} placement="bottom-right" width="110px" offsetX="30px" offsetY="35px" rotation={15} mobile={{ width: '65px', offsetX: '20px', offsetY: '20px' }} />
          {/* Page edges: positioned relative to the full page as the list grows. */}
          <DecorativeImage src="/images/deco-4.svg" intrinsicWidth={226} intrinsicHeight={217} placement="top-right" width="clamp(140px, 18vw, 240px)" offsetX="120px" offsetY="32%" rotation={-18} opacity={0.55} hideOnMobile />
          <DecorativeImage src="/images/deco-5.svg" intrinsicWidth={226} intrinsicHeight={226} placement="center-left" width="190px" offsetX="-120px" offsetY="8%" rotation={22} opacity={0.65} hideOnMobile />
          <DecorativeImage src="/images/deco-14.svg" intrinsicWidth={226} intrinsicHeight={148} placement="top-right" width="150px" offsetX="75px" offsetY="78%" rotation={-14} opacity={0.65} hideOnMobile />
          <DecorativeImage src="/images/deco-3.svg" intrinsicWidth={226} intrinsicHeight={226} placement="bottom-left" width="240px" offsetX="-130px" offsetY="-30px" rotation={-25} opacity={0.4} mobile={{ width: '100px', offsetX: '-60px', offsetY: '-25px', opacity: 0.2 }} />
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
        title={<>MY<br /><span className={styles.highlight}>PROJECTS.</span></>}
        decorations={
          <>
            <DecorativeImage src="/images/deco-asura2.svg" intrinsicWidth={500} intrinsicHeight={500} loading="eager" placement="bottom-right" width="clamp(250px, 80%, 500px)" offsetX="-130px" offsetY="-50px" rotation={-5} opacity={0.85} hideOnMobile />
            <DecorativeImage src="/images/deco-11.svg" intrinsicWidth={225} intrinsicHeight={242} loading="eager" placement="top-right" width="85px" offsetX="-15px" offsetY="10px" rotation={12} opacity={0.75} mobile={{ width: '55px', offsetX: '-5px', opacity: 0.25 }} />
            <DecorativeImage src="/images/deco-7.svg" intrinsicWidth={436} intrinsicHeight={452} loading="eager" placement="bottom-right" width="100px" offsetX="-22px" offsetY="-24px" rotation={18} mobile={{ width: '42px', offsetX: '-8px', offsetY: '-12px', opacity: 0.65 }} />
          </>
        }
      >
        <p className={styles.introduction}>This is my list of projects, that I want to display, its got ones I've done, in progress and future ones too.</p>
        <div className={styles.heroNotes}><span>CREATE / DESTROY</span><a href="#collection">look at da list <span aria-hidden="true">↓</span></a></div>
      </Section>

      <Section id="collection" spacing="none" className={styles.collection} aria-labelledby="collection-title">
        <div className={styles.sectionHeader}><h2 id="collection-title">ON THE WORKBENCH.</h2><span>INFINITY / Constantly increasing entries.</span></div>
        <div className={styles.listing}>
          <Project
            title="Meiloorun — Personal site"
            number="01"
            status="In progress"
            featured
            image={{ src: '/images/intro.svg', alt: 'Meiloorun artwork from the homepage.', width: 600, height: 700 }}
            description="My personal website (which you are currently on). This is my home on the internet."
            tags={['Astro', 'React', 'TypeScript', 'CSS Modules']}
            links={[
              { label: 'Open the site', href: '/' },
              { label: 'Source', href: 'https://github.com/meiloorun/meiloorun-website' },
            ]}
          >
            <p className={styles.projectNote}>A living project. The design and the collection keep growing together.</p>
          </Project>
          <Project
            title="Sami Tracker"
            number="02"
            status="Completed - currently down"
            image={{ src: '/images/sami-tracker.jpg', alt: 'Sami.', width: 600, height: 700 }}
            description="An App + Website that allows for the logging and history of the feeding of my cat Sami"
            tags={['Android', 'Web', 'React Native', 'TypeScript', 'PostgreSQL']}
            links={[
              { label: 'Open the site', href: 'https://meiloorun.github.io/samitracker' },
              { label: 'Source', href: 'https://github.com/Meiloorun/sami-tracker' },
            ]}
          >
            <p className={styles.projectNote}>I luv my cat.</p>
          </Project>
          <Project
            title="Lightsaber Duelists"
            number="03"
            status="Research phase"
            description="A s&box game that lets you duel with lightsabers with others with deep mechanics."
            tags={['s&box', 'C#', 'Source 2 Engine', 'Game Development']}
          >
            <p className={styles.projectNote}>I'm still learning s&box engine for this one</p>
          </Project>
          <Project
            title="UNTITLED GAME"
            number="04"
            status="Research / Planning phase"
            description="A Fighting x Character Action game that is still in the planning phase. I have a lot of ideas for this one."
            tags={['Story Heavy', 'Character Action Game', 'Fighting Game', 'Game Development']}
            links={[
              { label: 'The Wiki', href: 'https://app.clickup.com/90152426489/docs/2kyr1pzt-195/2kyr1pzt-215' }
            ]}
          >
            <p className={styles.projectNote}>This is my magnum opus, I dont even have the funds for this.</p>
          </Project>
          <Project
            title="Tajneed Spreadsheet Updater"
            number="05"
            status="Completed"
            description="This is a tool I used for updating our local MKA Farnborough Tajneed Spreadsheet with data directly from CARS."
            tags={['Python', 'Batchfile', 'Google Cloud', 'Pandas', 'Google Sheets API']}
            links={[
              { label: 'Releases', href: 'https://github.com/Meiloorun/Tajneed-Spreadsheet-Updater/releases/' },
              { label: 'Source', href: 'https://github.com/Meiloorun/Tajneed-Spreadsheet-Updater' }
            ]}
          >
            <p className={styles.projectNote}>Current Version - 2.0</p>
          </Project>
        </div>
      </Section>
    </SiteShell>
  );
}
