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

`/media` is the hub, with one section per category and Games first. Edit the
sections directly in `src/components/media/MediaPage.tsx`. Individual page copy
lives inline in `GamesPage.tsx`, `MangaPage.tsx`, `ComicsPage.tsx`,
`TvShowsPage.tsx`, `MoviesPage.tsx`, and `MusicPage.tsx`. Routes live under
`src/pages/media/`; `MediaLayout` shares the header and hero treatment.

`TrackerPanel` accepts a `profileUrl`, optional `embedUrl`, and an optional
`TrackerFeed` containing `current` and `recent` entries. It always includes
an external tracker button. Without a personal URL, that button opens the
tracker's homepage; it does not claim to link to your profile.

Fill in the account settings in your local `.env`:

- AniList: `ANILIST_USERNAME` enables public manga and anime lists.
- Last.fm: `LASTFM_USERNAME` and `LASTFM_API_KEY` enable recent scrobbles
  and the currently playing track at the time of the snapshot.
- Simkl: `SIMKL_PROFILE_URL` sets the TV/movie profile button. Set
  `SIMKL_CLIENT_ID`, then run `npm run connect:simkl` to authorise your account.
  TV shows display currently watching and recently watched entries. Movies
  display the watchlist and recently watched films, including anime movies.
- Comics: `BATCAVE_PROFILE_URL` sets the profile button. Set `BATCAVE_EMBED_URL`
  only after testing whether that actual profile permits embedding.
- Games: `INFINITE_BACKLOG_PROFILE_URL` sets the backlog button. Backlog embedding
  remains deferred; the main-game showcase, Twitch stream, and CSV library are implemented.

TV and Movies use the API without embeds; profile buttons remain available
if the API is unconfigured or unavailable.

The AniList and Last.fm loaders live in `src/lib/mediaTrackers.ts` and run only
in Astro frontmatter. Keys are not sent to the browser. Missing settings avoid
network requests entirely; failed requests show a fallback without breaking
the build. AniList and Last.fm requests have an eight-second timeout;
Simkl requests have a fifteen-second timeout.

### Connecting Simkl

1. Register a new **AUTH V2** application in
   [Simkl developer settings](https://simkl.com/settings/developer/).
   Select **TV, devices & command line** for the local connection helper.
   No redirect URL or client secret is needed for that app type. Use
   `https://meiloorun.github.io` as the application homepage.
2. Put the client ID in `SIMKL_CLIENT_ID` in `.env`, and set
   `SIMKL_PROFILE_URL` to your profile URL.
3. Run `npm run connect:simkl`. Open the printed Simkl PIN page, enter the
   code, and approve read-only access. The helper saves `SIMKL_ACCESS_TOKEN`
   and `SIMKL_REFRESH_TOKEN` to `.env` without printing them.
4. Run `npm run build` to take the first snapshot.

The loader refreshes expired access tokens automatically and caches the refreshed
token and library privately under `.cache/simkl/` (ignored by Git).
It checks activities before reading library changes, merges incremental updates,
and reconciles removed entries. TV and Movies share one sync per production build.
Recent entries are ordered by their actual last-watched timestamps.

For deployment, provide `SIMKL_CLIENT_ID`, `SIMKL_REFRESH_TOKEN`, and
`SIMKL_PROFILE_URL` through the build environment/secrets. The access token is
optional when a refresh token is available. Persist `.cache/simkl/` between CI
builds in a private cache to retain the sync checkpoint. Never publish that
directory or `.env`. A confidential Server app also needs `SIMKL_CLIENT_SECRET`.
Avoid concurrent builds sharing the same grant: refreshing invalidates its old
access token. Use separate authorisations for independent build environments.
If account access is revoked or the refresh token expires, rerun the connection helper.

This is a static site: feeds are snapshots taken during `npm run build`.
Rebuild/redeploy to update them. In development they update on page requests.
For continuously refreshed feeds, add a server adapter or a scheduled rebuild.
Simkl uses a shared five-minute feed cache in `.cache/media/`, alongside its
activity-based library cache. Failed syncs retain the previous snapshot and
back off before retrying. Other media loaders fetch their data on each build
or development page request.
AniList's recent panel is explicitly labelled **Recent list updates** because
a list edit is not proof that a chapter or episode was consumed at that time.
Its anime list can also contain films; the Movies page is intended to use
Simkl for both live-action and anime movies.

API references: [AniList media lists](https://docs.anilist.co/guide/graphql/queries/media-list),
[Last.fm recent tracks](https://www.last.fm/api/show/user.getRecentTracks),
and [Simkl API](https://api.simkl.org/).

## Main game and Twitch stream

### Infinite Backlog CSV

Keep exactly one CSV in `src/data/games_export/`. To update the library, delete
the old export, add the new one, and build/deploy. No filename or environment
setting needs to change. A missing or duplicate CSV stops the build with a clear
message instead of choosing a file arbitrarily. `src/lib/gameLibrary.ts` imports
the CSV as build-only data; the raw export is not copied to the public site.

The backlog shows all entries marked `Playing`, six recent `Beaten`/`Completed`
entries ordered by their completion date, and an expandable full collection.
Platform copies remain separate library entries. The snapshot date comes from
the dated export filename; an undated filename gets a generic snapshot label.
Only game ID, title, platform, status, completion, completion date, and overall
rating are passed to the UI. Notes, purchases, and borrowing details are omitted.

IGDB supplies canonical game slugs and covers for all unique library game IDs,
using sequential batches of 100 with a pause between requests. The requests
share the main game's app token. CSV details remain visible if requests fail;
successfully fetched batches are retained. Metadata is refreshed at build time
and has no persistent cache. Recent completions reflect recorded completion
dates, not the last-edited timestamp. The main game uses `IGDB_GAME_ID`.

Game links reuse the IGDB slug at `https://infinitebacklog.net/users/meiloorun/collection/<slug>`.
`gameLibrary.ts` derives the username from the configured profile URL;
there is no JSON mapping, handmade slug, or collection-entry ID. For example,
Valheim opens `/users/meiloorun/collection/valheim` without a query string.
The main game, playing cards, completion cards, and full collection use this
pattern. Entries with no available IGDB slug fall back to the collection URL.
Platform copies share the same game-level collection link.

The Games page loads its current main game from IGDB at build time. Change
`IGDB_GAME_ID` in `.env` and rebuild to switch games. Fill in the added settings:

```env
IGDB_GAME_ID=
IGDB_CLIENT_ID=
IGDB_CLIENT_SECRET=
```

Get the Client ID and Client Secret from a confidential app in the
[Twitch Developer Console](https://dev.twitch.tv/console/apps). IGDB uses Twitch
app authentication; these are not your Last.fm credentials. IGDB says its OAuth
redirect URL is unused for this integration (use `http://localhost` for registration).
See the [IGDB getting started guide](https://api-docs.igdb.com/#getting-started).
The ID is IGDB's numeric game ID, not a slug, Steam ID, or Twitch category ID.
`src/lib/igdb.ts` validates the ID, obtains an app token, and requests game details
only in Astro frontmatter. No credentials are included in browser props or HTML.
Missing credentials or failed requests leave a readable fallback and an IGDB link.
Set the same private variables in your deployment build environment/GitHub Actions
secrets; GitHub Pages serves only the generated static game details.

`TwitchStream` is a reusable iframe component taking a channel and parent hostnames.
The page embeds `meiloorun_` and includes localhost, 127.0.0.1, meiloorun.github.io,
meiloorun.gg, and www.meiloorun.gg. Add any different preview hostname to the inline
`parents` prop in `GamesPage.tsx`. Production embeds require HTTPS. Autoplay is off,
and the stream loads independently of the game's build-time data. Twitch requires
a player of at least 400×300 pixels; narrower layouts show a direct Twitch button.
See [Twitch embed documentation](https://dev.twitch.tv/docs/embed/video-and-clips/).

## Commands

- `npm install`: install dependencies.
- `npm run dev -- --background`: start the development server.
- `npm run astro -- dev stop`: stop the background server.
- `npm run check`: check Astro and TypeScript types.
- `npm run build`: generate the static site in `dist/`.
- `npm run preview`: preview the production build.
