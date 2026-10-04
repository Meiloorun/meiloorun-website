import { SiteShell } from '../layout/SiteShell';
import { Section } from '../ui/Section';
import { ArtworkFrame } from '../ui/ArtworkFrame';
import { InkLabel } from '../ui/InkLabel';
import { ActionLink } from '../ui/ActionLink';
import { InterestPanel } from '../ui/InterestPanel';
import { DecorativeImage } from '../ui/DecorativeImage';
import styles from './HomePage.module.css';

/** All homepage sections use the shared Section component directly. */
export default function HomePage() {
  return (
    <SiteShell
      name="Meiloorun"
      navigation={[
        { label: '01 / Intro', href: '#intro' },
        { label: '02 / Explore', href: '#explore' },
        { label: '03 / About', href: '#about' },
        { label: '04 / Projects', href: '/projects' },
      ]}
      headerNote={<>A personal collection<br />of all my things.</>}
      footerNote="EVEN IF THE WHOLE WORLD FORGETS YOU, I WILL NEVER FORGET YOU"
      decorations={
        <>
          {/* Heavy ink stays in the page gutters; yellow marks bookend the composition. */}
          <DecorativeImage
            src="/images/deco-12.svg"
            placement="top-left"
            width="clamp(260px, 24vw, 380px)"
            offsetX="-280px"
            offsetY="140px"
            rotation={-16}
            opacity={0.8}
            mobile={{ width: '210px', offsetX: '-180px', offsetY: '180px', opacity: 0.35 }}
          />
          <DecorativeImage
            src="/images/deco-12.svg"
            placement="bottom-left"
            width="clamp(260px, 24vw, 380px)"
            offsetX="-280px"
            offsetY="95px"
            rotation={15}
            flipX
            opacity={0.55}
            mobile={{ width: '220px', offsetX: '-180px', offsetY: '80px', opacity: 0.25 }}
          />
          <DecorativeImage
            src="/images/deco-7.svg"
            placement="bottom-right"
            width="clamp(75px, 8vw, 115px)"
            offsetX="35px"
            offsetY="38px"
            rotation={-14}
            mobile={{ width: '60px', offsetX: '20px', offsetY: '20px' }}
          />
        </>
      }
    >
      <Section
        id="intro"
        headingLevel={1}
        spacing="none"
        className={styles.hero}
        contentClassName={styles.introContent}
        titleClassName={styles.introTitle}
        eyebrowClassName={styles.introEyebrow}
        actionsClassName={styles.introActions}
        title={
          <>
            <span>THIS IS<br /></span>
            <span>MY<br /></span>
            <span className={styles.highlight}>UNIVERSE.</span>
          </>
        }
        mediaPosition="left"
        mediaWidth="compact"
        mobileOrder="content-first"
        clipDecorations={false}
        decorations={
          <>
            {/* Devil Jin occupies the open right edge; the main artwork stays in its frame. */}
            <DecorativeImage
              src="/images/deco-deviljin.svg"
              placement="top-right"
              width="clamp(260px, 28%, 440px)"
              offsetX="120px"
              offsetY="40px"
              rotation={-5}
              opacity={0.85}
              intrinsicWidth={564}
              intrinsicHeight={564}
              loading="eager"
              hideOnMobile
            />
            <DecorativeImage
              src="/images/deco-3.svg"
              placement="bottom-right"
              width="clamp(220px, 28%, 400px)"
              offsetX="100px"
              offsetY="55px"
              rotation={20}
              opacity={0.14}
              mobile={{ width: '180px', offsetX: '60px', offsetY: '35px', opacity: 0.1 }}
            />
            <DecorativeImage
              src="/images/deco-7.svg"
              placement="bottom-left"
              width="clamp(80px, 9%, 125px)"
              offsetX="-16px"
              offsetY="-14px"
              rotation={12}
              layer="foreground"
              mobile={{ width: '75px', offsetX: '-8px', offsetY: '-20px', rotation: -8 }}
            />
          </>
        }
        eyebrow={
          <div className={styles.eyebrow}>
            <InkLabel tone="yellow">HEY LOL</InkLabel>
            <span>EST. / ALWAYS IN MOTION</span>
          </div>
        }
        media={
          <ArtworkFrame
            variant="collage"
            image={{
              src: '/images/intro.svg',
              alt: 'A grungy image of a Meiloorun.',
              width: 600,
              height: 700,
            }}
            label="wassup dewd"
            metadata="RESEARCH / 001"
            loading="eager"
            fetchPriority="high"
          />
        }
        actions={
          <>
            <ActionLink href="#explore">Here's where everything begins</ActionLink>
            <span className={styles.sideNote}>Here's<br />where everything begins.</span>
          </>
        }
        contentFooter={
          <div className={styles.heroFooter}>
            <span>#CHUDLYFESTYLE</span><span aria-hidden="true">↓↓</span>
          </div>
        }
      >
        <div className={styles.introCopy}>
          <span className={styles.cross} aria-hidden="true">✳</span>
          <p>This is my homepage, it's where I put all of myself, everything I do and everything I am.</p>
        </div>
      </Section>
      <Section
        id="explore"
        spacing="none"
        className={styles.explore}
        aria-labelledby="explore-title"
        decorations={
          <>
            <DecorativeImage
              src="/images/deco-9.svg"
              placement="bottom-left"
              width="clamp(160px, 20%, 240px)"
              offsetX="-25px"
              offsetY="55px"
              rotation={-5}
              opacity={0.8}
              mobile={{ width: '140px', offsetX: '-15px', offsetY: '30px', opacity: 0.5 }}
            />
            <DecorativeImage
              src="/images/deco-11.svg"
              placement="bottom-right"
              width="100px"
              offsetX="25px"
              offsetY="35px"
              rotation={14}
              opacity={0.75}
              mobile={{ width: '65px', offsetX: '12px', offsetY: '15px', opacity: 0.5 }}
            />
          </>
        }
      >
        <div className={styles.sectionHeader}>
          <h2 id="explore-title">SELECT YOUR FIGHTER.</h2>
          <span>Open a universe. Make sure you don't get lost.<span aria-hidden="true">↙</span></span>
        </div>
        <div className={styles.panels}>
          <InterestPanel
            number="01"
            title="Projects"
            subtitle="Enter The Lab. Be Careful."
            description="A home for my experiments, works in progress, and things built out of curiosity."
          >
            <ActionLink href="/projects">Enter the lab</ActionLink>
          </InterestPanel>
          <InterestPanel
            number="02"
            title="Media"
            subtitle=" What am I into? Where am I up to? Do I know ball?"
            description="Games, shows, music, films, etc."
          />
          <InterestPanel
            number="03"
            title="Everyday life"
            subtitle="What I need to exist."
            description="All the things that assist me in my day-to-day."
          />
        </div>
      </Section>
      <Section
        id="about"
        spacing="none"
        className={styles.about}
        contentClassName={styles.aboutContent}
        aria-labelledby="about-title"
        clipDecorations={false}
        decorations={
          <>
            <DecorativeImage
              src="/images/deco-8.svg"
              placement="top-left"
              width="clamp(140px, 15%, 210px)"
              offsetX="-75px"
              offsetY="10px"
              rotation={-15}
              opacity={0.1}
              hideOnMobile
            />
            <DecorativeImage
              src="/images/deco-14.svg"
              placement="bottom-right"
              width="clamp(100px, 13%, 180px)"
              offsetX="-10px"
              offsetY="-8px"
              rotation={-8}
              opacity={0.85}
              mobile={{ placement: 'top-right', width: '75px', offsetX: 0, offsetY: '-14px', rotation: 8, opacity: 0.6 }}
            />
          </>
        }
      >
        <InkLabel>Behind the curtains</InkLabel>
        <h2 id="about-title">Hey, I’m Meiloorun.</h2>
        <p>This site is to hold all my weight. I wanted a space on the internet for myself where I can just put things and here it is.</p>
        <ActionLink variant="plain" href="#top">Back to origin</ActionLink>
      </Section>
    </SiteShell>
  );
}
