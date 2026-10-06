# Meiloorun

A personal Astro site with React, strict TypeScript, and a reusable ink-and-yellow UI.

## Structure

- `src/pages/index.astro`: a thin route connecting the page to its document layout.
- `src/pages/projects.astro`: the `/projects` route.
- `src/layouts/PageLayout.astro`: reusable document structure and metadata.
- `src/components/home/HomePage.tsx`: homepage copy, navigation, and section composition.
- `src/components/layout/SiteShell.tsx`: shared page navigation, gutters, texture, and footer.
- `src/components/ui/Section.tsx`: reusable section layout and content slots.
- `src/components/projects/ProjectsPage.tsx`: projects page content and composition.
- `src/components/ui/Project.tsx`: reusable project listings with optional images and links.
- `src/components/ui/DecorativeImage.tsx`: responsive portraits, splashes, and other decorative images.
- `src/styles/global.css`: browser defaults; shared theme values live in `tokens.css`.

## Where to edit

| Change | File |
| --- | --- |
| Text, interests, navigation labels, artwork, captions | `src/components/home/HomePage.tsx` |
| Section order, layout options, component slots | `src/components/home/HomePage.tsx` |
| Colours, fonts, shared page width and gutters | `src/styles/tokens.css` |
| Shared page header, footer, and texture | `src/components/layout/SiteShell.module.css` |
| Homepage-specific arrangements and notes | `src/components/home/HomePage.module.css` |
| Intro typography and spacing | `src/components/home/HomePage.module.css` |
| Artwork borders, captions, sticker, and collage treatment | `src/components/ui/ArtworkFrame.module.css` |

Keep page copy out of shared UI components. Use `Section` for layout, specialised
components for visual presets, and `children`/slots for functionality. A section
should not own the page navigation or know another section's ID. Homepage anchor
copy, navigation links, and section IDs are written directly in the JSX in `HomePage.tsx`.
When changing a section ID, update its navigation and action links too.

## Component conventions

Build the UI in small, named `.tsx` components with explicit props. Keep page
components focused on composition. Extract repeated patterns when they emerge,
rather than building a large component framework in advance.

Place component styles beside the component in `ComponentName.module.css` and
import them as `styles`. Use descriptive names such as `styles.panel` and
`styles.heading`. Keep global CSS limited to defaults and shared design tokens
(colour, typography, spacing, borders, motion) once the visual direction is chosen.

Use semantic HTML inside components. Use a headless library for complex controls
such as dialogs and tabs when needed, preserving keyboard and focus behaviour.
Keep decorative textures separate from content and respect reduced-motion settings.

Use `PageLayout` for future routes. Add `client:load` to an interactive React page
or component when it needs hooks or browser events; static components need no
client directive. No UI library or animation library has been added yet.

## Building sections

Import `Section` from `src/components/ui/Section`. It renders a semantic section,
handles responsive layout, and accepts any React content through its slots.

```tsx
<Section
  id="projects"
  title="Things I make"
  image={{ src: '/images/project.webp', alt: 'A preview of my project' }}
  mediaPosition="right"
  mediaWidth="compact"
  divider="top"
  actions={<ActionLink href="/projects">All projects</ActionLink>}
>
  <p>Experiments, discoveries, and works in progress.</p>
</Section>
```

Supply either `image` (standard image attributes, including required `src` and
`alt`) or `media` (any component, such as `ArtworkFrame`, a gallery, or a video).
The types prevent supplying both. Omit both for a section with no media, or use
`mediaPosition="none"` to hide configured media.

```tsx
<Section
  title="A closer look"
  mediaPosition="center"
  media={<ArtworkFrame image={artwork} label="Field notes" />}
  secondaryContent={<p>The story behind the illustration.</p>}
>
  <p>Primary content goes on the left.</p>
</Section>
```

Centre placement uses content / media / secondary content columns on desktop.
Without `secondaryContent`, centre placement stacks content above centred media.
Secondary content in other layouts spans a row below the main content.
All layouts stack at 720px; `mobileOrder` chooses which main slot appears first.
It changes visual order, so keep keyboard focus order in mind for interactive media.

| Prop | Values / purpose |
| --- | --- |
| `mediaPosition` | `left` (default), `center`, `right`, `none` |
| `mediaWidth` | `compact`, `balanced` (default), `wide` |
| `mobileOrder` | `content-first` (default), `media-first` |
| `align` | Vertical alignment: `start`, `center` (default), `end` |
| `textAlign` | `left` (default), `center`, `right` |
| `spacing` | Vertical padding: `none`, `compact`, `normal` (default), `spacious` |
| `width` | Inner maximum width: `readable`, `wide` (default), `full` |
| `tone` | `transparent` (default), `paper`, `ink`, `yellow` |
| `divider` | `none` (default), `top`, `bottom`, `both` |
| `minHeight` | `auto` (default), `screen` |
| `title`, `headingLevel` | Custom heading content; heading level defaults to 2 |
| `eyebrow`, `actions` | Content above the heading and after the children |
| `header`, `footer` | Full-width content before and after the layout |
| `contentFooter` | Custom content inside the main column, after actions |
| `children`, `secondaryContent` | Main content and optional secondary content |
| `backgroundImage`, `overlayOpacity` | Decorative responsive background and paper wash |
| `decorations`, `clipDecorations` | Decorative image slots; crop their overflow by default |
| `className`, `style` | Standard section styling and CSS variable overrides |
| `contentClassName`, `mediaClassName`, `titleClassName`, `eyebrowClassName`, `actionsClassName` | Styling specific slots |

`width` constrains the inner container; horizontal page gutters belong to the
page layout. Each section inherits the yellow, paper, and ink theme tokens.
With `title`, Section automatically links its heading to the section using a
unique ID. For custom headings in children, pass `aria-labelledby` yourself.
Native section attributes, including `id`, `aria-*`, and event handlers, pass through.

The homepage uses `Section` directly for its intro, explore, and about sections.
Copy, layout, and component slots are written directly inside the
`HomePage` function in `HomePage.tsx`. Intro appearance belongs to
`HomePage.module.css`; the shared Section has no homepage-specific styling.

For an intro, use `headingLevel={1}`, supply custom heading content through
`title`, and pass `titleClassName`/`contentClassName` for page-specific styling.
Use `mediaPosition="right"` to move artwork or `mediaPosition="none"` to hide it.
Custom components still work through `media`, `children`, and the other slots.

`ArtworkFrame` supports `plain` and `collage` variants, editable `label`,
`metadata`, and `sticker` slots, image dimensions, and loading priority.
Use `loading="eager"` and `fetchPriority="high"` for the main hero artwork;
frames and decorative section backgrounds default to lazy loading elsewhere.
`InterestPanel` accepts native details attributes (including `open` and
`onToggle`), optional numbering, and children for additional panel content.
`InkLabel` and `ActionLink` also accept their native HTML attributes and `className`.

Static React content needs no hydration. Components with React event handlers or
hooks need a `client:*` directive on their owning React island in the Astro route.
See [Astro framework components](https://docs.astro.build/en/guides/framework-components/).

## Project listings

The `/projects` page uses the shared page shell, sections, and decorative images.
Edit its content directly in `src/components/projects/ProjectsPage.tsx`. The first
entry is this website; add your own `Project` components as the collection grows.
The next-experiment panel is a space for future work rather than a published project.

```tsx
import { Project } from '../ui/Project';

<Project
  title="My project"
  description="What it does and why I built it."
  status="In progress"
  tags={['React', 'Experiment']}
  links={[{ label: 'Visit project', href: '/my-project' }]}
/>
```

Only `title` is required. `image` accepts `src`, `alt`, optional dimensions, and
`position` for cropping. Omitting it produces a text-only entry with no empty image
space. `links` accepts multiple `{ label, href, newTab? }` objects; the first link
is highlighted. New-tab links get accessible context and `noopener noreferrer`.
Optional `number`, `year`, and `status` provide metadata; `tags` list technologies
or categories. `featured` uses a large image-above-content layout with larger
headings and spacing. Regular entries use a compact image-beside-content layout
on desktop; both stack on mobile.
`children` adds custom content before the links, and native article attributes
and `className` pass through. `headingLevel` defaults to 3 and can be 2, 3, or 4.

## Decorative images


Import `DecorativeImage` from `src/components/ui/DecorativeImage`. Add transparent
WebP, PNG, or SVG assets to `public/images/`, then supply them directly in a
section's `decorations` slot:

```tsx
import { DecorativeImage } from '../ui/DecorativeImage';

<Section
  title="About me"
  decorations={
    <>
      <DecorativeImage
        src="/images/ink-splash.webp"
        placement="top-left"
        size="medium"
        offsetX="-3rem"
        rotation={-12}
        opacity={0.15}
        hideOnMobile
      />
      <DecorativeImage
        src="/images/portrait.webp"
        mobileSrc="/images/portrait-mobile.webp"
        placement="bottom-right"
        width="clamp(200px, 35%, 520px)"
        mobile={{ placement: 'top-right', width: '140px', opacity: 0.12 }}
      />
    </>
  }
>
  <p>Your section content.</p>
</Section>
```

| Prop | Purpose |
| --- | --- |
| `placement` | Nine anchors: `top-left`, `top-center`, `top-right`, `center-left`, `center`, `center-right`, `bottom-left`, `bottom-center`, `bottom-right` |
| `size` | Responsive `small`, `medium` (default), or `large` width |
| `width` | Custom CSS width or clamp expression; overrides `size` |
| `offsetX`, `offsetY` | Move right/down from the anchor; negative values move left/up |
| `rotation`, `opacity`, `flipX`, `flipY` | Angle in degrees, opacity, and mirrored artwork |
| `mobile` | Override placement, size, width, offsets, rotation, opacity, or flips at 720px and below |
| `mobileSrc`, `hideOnMobile` | Alternate mobile artwork or hide the image on mobile |
| `position` | `absolute` (default) follows the parent; `fixed` follows the viewport |
| `layer` | `background` (default) sits behind content; `foreground` sits above it |
| `intrinsicWidth`, `intrinsicHeight` | Optional source image dimensions |
| `className`, `style` | Additional styling overrides |

Numeric widths and offsets are pixels. Percentage widths and offsets are relative
to the positioned parent (or viewport when fixed). The image's edge or centre is
aligned to the chosen anchor, so a bottom-right image grows toward the inside.
Mobile options inherit desktop values; a mobile `size` replaces a custom desktop
width unless a mobile width is also supplied.

For page-wide decorations, use the same `decorations` slot on `SiteShell`. For
viewport artwork that stays in place while scrolling, place a `position="fixed"`
image there. To attach a decoration to another component, render it inside a
wrapper with `position: relative` and enough height for the composition.
Transformed ancestors can make fixed positioning relative to that ancestor;
prefer the page shell for viewport decorations.

Section decorations are clipped to their section by default. Set
`clipDecorations={false}` for intentional overlap across section edges. The
page shell still clips page overflow. Decorations do not reserve layout space;
use section padding or the `media` slot for prominent portraits that need their
own space. Background decorations are intended for decorative artwork only:
they use empty alt text, are hidden from assistive technology, and never capture
pointer events. Images are lazy-loaded by default; use `loading="eager"` for
immediately visible artwork.

## Media pages

`/media` is the hub, with Games first. Page content stays inline in
`src/components/media/*Page.tsx`; routes live in `src/pages/media/`.
`MediaLayout` shares the header and decorative treatment. `TrackerPanel`
accepts a profile URL, optional embed URL, and normalized current/recent feeds.

The individual media pages now run on Cloudflare Workers. All visitors share
a persistent SQLite-backed Durable Object cache, including Simkl's refreshed
token and incremental sync checkpoint. The homepage, projects page, and media
hub remain static. Credentials are read at runtime and never passed to React.

See [CLOUDFLARE.md](CLOUDFLARE.md) for account setup, GitHub Actions secrets,
local development, cache intervals, and custom-domain instructions.
See [CACHE.md](CACHE.md) for the full request flow and storage explanation.
This implementation lives on `cloudflare`; `master` keeps the existing GitHub
Pages build. The workflows deploy only their respective branches. Cloudflare
uses its default `workers.dev` address until a custom domain is configured.
`.dev.vars.example` lists supported settings. Existing `.env` settings can
still be used locally; production settings are uploaded as Worker secrets.

- AniList uses `ANILIST_USERNAME` for manga and anime. Recent entries describe
  list updates, which are not necessarily consumption dates.
- Last.fm uses `LASTFM_USERNAME` and `LASTFM_API_KEY` for recent scrobbles,
  the now-playing snapshot, and top artists over the last seven days.
- TV and Movies share one Simkl sync. Movies include anime movies and your
  ratings. Profile links remain available when an API is unavailable.
- Comics uses `BATCAVE_PROFILE_URL` and an optional `BATCAVE_EMBED_URL`.

### Connecting Simkl

Register an AUTH V2 application in [Simkl developer settings](https://simkl.com/settings/developer/).
The local helper uses the **TV, devices & command line** app type, which requires
no redirect URL or client secret. Put `SIMKL_CLIENT_ID` in `.env`, then run
`npm run connect:simkl`. Approve the printed PIN; the helper writes the access
and refresh tokens to your local `.env` without printing them.

Supply `SIMKL_CLIENT_ID`, `SIMKL_REFRESH_TOKEN`, and `SIMKL_PROFILE_URL`
as deployment secrets. `SIMKL_ACCESS_TOKEN` is optional with a refresh token.
A confidential server app also requires `SIMKL_CLIENT_SECRET`.
Use separate authorisations for independently running local/production
environments because refreshing can invalidate another instance's access token.

## Main game and Twitch stream

Set `IGDB_GAME_ID`, `IGDB_CLIENT_ID`, and `IGDB_CLIENT_SECRET` as runtime
settings. Twitch app credentials come from the [Twitch Developer Console](https://dev.twitch.tv/console/apps).
IGDB uses client-credentials authentication; its redirect URL is unused here
(`http://localhost` is suitable for registration).
See [IGDB documentation](https://api-docs.igdb.com/#getting-started).

Keep exactly one CSV in `src/data/games_export/`. Delete the old export, add
the new one, and deploy to update the backlog. There is no filename setting.
Only game ID, title, platform, status, completion, completion date, and rating
reach the browser; private notes and purchase details are omitted.
The collection shows playing entries, recent completions, and an expandable
full library. The snapshot date comes from the export filename.

IGDB supplies canonical slugs and covers in sequential batches of 100. Artwork
is cached for seven days, keyed by sorted game IDs, and main-game details for
one day per ID. Game links reuse the IGDB slug under your Infinite Backlog
collection profile. Entries without a slug fall back to the profile link.

`TwitchStream` embeds `meiloorun_`. Its parent hostname is supplied by the
Astro route, including Worker previews and custom domains. Autoplay is off;
narrow layouts show the direct Twitch button.

## Commands

- `npm install`: install dependencies.
- `npm run dev -- --background`: start the development server.
- `npm run astro -- dev stop`: stop the background server.
- `npm run check`: check Astro and TypeScript types.
- `npm run build`: build static assets and the Cloudflare Worker in `dist/`.
- `npm run preview`: preview the production build.
- `npm test`: run cache and Simkl regression tests.
- `npm run deploy`: build and deploy the Cloudflare Worker after Wrangler login.
