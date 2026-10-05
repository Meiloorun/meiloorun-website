import { MediaLayout } from './MediaLayout';
import { Section } from '../ui/Section';
import { ActionLink } from '../ui/ActionLink';
import { DecorativeImage } from '../ui/DecorativeImage';
import styles from './MediaPage.module.css';

export default function MediaPage() {
  return <MediaLayout hub title={<>MY<br /><span className={styles.highlight}>MEDIA.</span></>}
    description="Here is all of the media I consume. I might have the greatest taste of all time nabs.">
    <nav className={styles.jumpLinks} aria-label="Media categories">
      <a href="#games">01 / Games</a><a href="#manga">02 / Manga</a><a href="#comics">03 / Comics</a>
      <a href="#tv">04 / TV + Anime</a><a href="#movies">05 / Movies</a><a href="#music">06 / Music</a>
    </nav>
    <Section id="games" className={styles.category} contentClassName={styles.categoryContent}
      titleClassName={styles.categoryTitle} title="Video Games" tone="transparent"
      eyebrow={<span className={styles.number}>01 / INFINITE BACKLOG</span>}
      actions={<ActionLink href="/media/games">Explore Video Games</ActionLink>}
      decorations={<>
        <DecorativeImage src="/images/deco-sephiroth2.svg" placement="center-right" width="240px" offsetX="-24px" rotation={12} opacity={0.7} hideOnMobile />
        <DecorativeImage src="/images/deco-7.svg" placement="top-right" width="55px" offsetY="12px" rotation={18} opacity={0.6} mobile={{ width: '32px', opacity: 0.25 }} />
      </>}
    >
      <p>I might be the most diverse gamer, I still got a billion games to get thru tho.</p>
    </Section>
    <Section id="manga" className={styles.category} contentClassName={styles.categoryContent}
      titleClassName={styles.categoryTitle} title="Manga" tone="transparent"
      eyebrow={<span className={styles.number}>02 / ANILIST</span>}
      actions={<ActionLink href="/media/manga">Explore Manga</ActionLink>}
      decorations={<>
        <DecorativeImage src="/images/deco-chihara.svg" placement="center-right" width="200px" offsetX="-24px" rotation={0} opacity={0.7} hideOnMobile />
        <DecorativeImage src="/images/deco-14.svg" placement="top-right" width="60px" offsetY="12px" rotation={-12} opacity={0.6} mobile={{ width: '32px', opacity: 0.25 }} />
      </>}
    >
      <p>lowk might be a lil degen but i luv reading manga.</p>
    </Section>
    <Section id="comics" className={styles.category} contentClassName={styles.categoryContent}
      titleClassName={styles.categoryTitle} title="Comics" tone="transparent"
      eyebrow={<span className={styles.number}>03 / BATCAVE.BIZ</span>}
      actions={<ActionLink href="/media/comics">Explore Comics</ActionLink>}
      decorations={<>
        <DecorativeImage src="/images/deco-logan.svg" placement="center-right" width="170px" offsetX="-32px" rotation={0} opacity={0.7} hideOnMobile />
        <DecorativeImage src="/images/deco-11.svg" placement="top-right" width="60px" offsetY="12px" rotation={14} opacity={0.6} mobile={{ width: '32px', opacity: 0.25 }} />
      </>}
    >
      <p>Yes, I've also started reading comics.</p>
    </Section>
    <Section id="tv" className={styles.category} contentClassName={styles.categoryContent}
      titleClassName={styles.categoryTitle} title="TV Shows + Anime" tone="transparent"
      eyebrow={<span className={styles.number}>04 / SIMKL / ANILIST</span>}
      actions={<ActionLink href="/media/tv-shows">Explore TV Shows + Anime</ActionLink>}
      decorations={<>
        <DecorativeImage src="/images/deco-lelouch.svg" placement="center-right" width="200px" offsetX="-24px" rotation={0} opacity={0.7} hideOnMobile />
        <DecorativeImage src="/images/deco-6.svg" placement="top-right" width="55px" offsetY="12px" rotation={-18} opacity={0.6} mobile={{ width: '32px', opacity: 0.25 }} />
      </>}
    >
      <p>I watch peak + trash and i luv both. Got Western + Eastern shows.</p>
    </Section>
    <Section id="movies" className={styles.category} contentClassName={styles.categoryContent}
      titleClassName={styles.categoryTitle} title="Movies" tone="transparent"
      eyebrow={<span className={styles.number}>05 / SIMKL</span>}
      actions={<ActionLink href="/media/movies">Explore Movies</ActionLink>}
      decorations={<>
        <DecorativeImage src="/images/deco-vader.svg" placement="center-right" width="240px" offsetX="-24px" rotation={0} opacity={0.7} hideOnMobile />
        <DecorativeImage src="/images/deco-7.svg" placement="top-right" width="55px" offsetY="12px" rotation={-16} opacity={0.6} mobile={{ width: '32px', opacity: 0.25 }} />
      </>}
    >
      <p>This might be the only place im lacking in taste but i'll work on it.</p>
    </Section>
    <Section id="music" className={styles.category} contentClassName={styles.categoryContent}
      titleClassName={styles.categoryTitle} title="Music" tone="transparent"
      eyebrow={<span className={styles.number}>06 / LAST.FM</span>}
      actions={<ActionLink href="/media/music">Explore Music</ActionLink>}
      decorations={<>
        <DecorativeImage src="/images/deco-dontoliver.svg" placement="center-right" width="240px" offsetX="-24px" rotation={0} opacity={0.7} hideOnMobile />
        <DecorativeImage src="/images/deco-6.svg" placement="top-right" width="55px" offsetY="12px" rotation={18} opacity={0.6} mobile={{ width: '32px', opacity: 0.25 }} />
      </>}
    >
      <p>Welcome to the best, most diverse music taste of all time.</p>
    </Section>
  </MediaLayout>;
}

