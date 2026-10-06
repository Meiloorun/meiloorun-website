# Cloudflare setup

This site uses Cloudflare Workers for Astro server rendering and one
SQLite-backed Durable Object (`TrackerCache`) for private shared storage.
The homepage, projects page, and media hub are static. Individual media pages
run when visited. The object is internal: there is no public endpoint exposing
its raw storage, tokens, or Simkl library.

## First deployment through GitHub Actions

1. Create a free Cloudflare account and select your account's `workers.dev`
   subdomain in **Workers & Pages**. You can use this address before buying or
   configuring a domain.
2. Find your **Account ID** in Cloudflare. In your source GitHub repository,
   add it as an Actions secret named `CLOUDFLARE_ACCOUNT_ID`.
3. Create a Cloudflare API token using the **Edit Cloudflare Workers** template,
   scoped to your account. Save it as `CLOUDFLARE_API_TOKEN` in the source repo's
   Actions secrets. Your GitHub personal access token cannot deploy to Cloudflare.
4. Keep/add the tracker secrets listed in `.dev.vars.example`, using the same
   names as before. The workflow uploads these as Worker runtime secrets.
   Optional settings can be left unset. Values must not include `KEY=` or
   surrounding quotes. Do not commit an environment file or send values in chat.
   Unset GitHub secrets are skipped and do not delete an existing Worker secret;
   remove a retired setting in the Cloudflare dashboard when needed.
5. `SITE_URL` is optional. Once your Worker address is known, you can set this
   Actions variable to `https://meiloorun-website.YOUR-SUBDOMAIN.workers.dev`.
   It supplies Astro's site metadata; it does not select the deployment address.
   No address is hard-coded as a fallback, and no custom domain is required.
6. Push the `cloudflare` branch, or manually run **Build and deploy Cloudflare**
   with `cloudflare` selected. The workflow checks types/tests, builds, and deploys.
   The Durable Object namespace and its SQLite storage are created by the
   binding/migration in `wrangler.jsonc`; no database ID needs to be pasted in.
7. Open the Worker address, then visit Manga, TV, Movies, Music, and Games.
   Repeat visits within their cache intervals should reuse saved results.
   Check Worker logs if a tracker displays its unavailable fallback.

Use this GitHub workflow as the deployment pipeline. There is no need to also
enable Cloudflare Git builds. The source `master` branch retains its original
static build and GitHub Pages workflow. Cloudflare work lives on `cloudflare`.
The Pages workflow is also retained here, with a job guard so it cannot publish
this branch's server bundle even if manually selected. The Cloudflare workflow
only runs on `cloudflare`. Your existing Pages site and `/samitracker` keep their
current deployment process. `meiloorun.github.io` cannot host this Worker.

Use `git switch master` for the GitHub Pages version and `git switch cloudflare`
for the server version. Run `npm ci` after switching because the dependency
sets differ. Keep the deployment branches separate; merging the server version
into `master` would require deciding how to maintain its static build first.

## Local development

Run Node 22.12 or newer, then `npm ci`.
Existing `.env` values are recognised locally by Wrangler; alternatively copy
`.dev.vars.example` to `.dev.vars` and fill it in. A `.dev.vars` file takes
precedence over `.env`, so copy all needed settings if switching.
Both local credentials and generated `.wrangler/` storage are ignored by Git.

```powershell
npm run dev -- --background
npm run astro -- dev status
npm run astro -- dev logs
npm run astro -- dev stop
```

Local Durable Object state persists under `.wrangler/` between server restarts.
It is separate from production storage. A local build needs no working tracker
credentials: media feeds are loaded on visits, not during the build.

`npm run check`, `npm test`, and `npm run build` validate the change.
`npm run preview` previews the production Worker locally.

For a manual deployment, run `npx wrangler login`, upload runtime secrets with
`npx wrangler secret put NAME`, and run `npm run deploy`. Do not paste secrets
into shell commands; Wrangler prompts for the value. GitHub Actions remains the
recommended path because it also supplies all configured tracker settings.

## Cache behaviour

For the full flow, key selection, failure behaviour, concurrency, and Simkl's
additional sync state, see [CACHE.md](CACHE.md).

Each visitor reads the same shared cached data. The cache survives Worker
restarts and deployments. Refreshes are serialized inside the object, including
Simkl token refreshes and incremental library checkpoint updates. No credentials
are sent as browser props. Server code reads runtime settings through
`trackerRuntime.mjs`, not build-time `import.meta.env`.

| Data | Refresh interval |
| --- | --- |
| AniList manga / anime | 15 minutes per list |
| Simkl TV / movies | 5 minutes, one shared sync |
| Last.fm recent tracks | 5 minutes |
| Last.fm top artists over seven days | 1 hour |
| IGDB game covers / canonical slugs | 7 days |
| IGDB main game | 1 day per game ID |
| Twitch app token | 1 hour |

Expiry triggers a refresh on the next visit. There is no background polling.
Failed media refreshes retain the last successful snapshot and back off for at
least five minutes; supported `Retry-After` responses extend that interval.
IGDB failures retain stale metadata. Normal browser reloads respect these
intervals; dedicated manual refresh controls are not implemented in this migration.

Simkl's refreshed access token and library checkpoint are stored privately in
the same object. Avoid using the same authorisation simultaneously from other
deployments or local servers: a new access token can invalidate the previous
one. If access is revoked or the refresh token expires, run
`npm run connect:simkl` and update the GitHub secrets with the new credentials.

The Infinite Backlog CSV stays in `src/data/games_export/`. Replacing it still
requires a deployment because it is bundled with the server. Only one CSV is
allowed. The browser receives the importer's allowed display fields, not the
original CSV or private notes. Changing the collection's game IDs invalidates
the shared IGDB artwork cache; changing statuses does not.

## Custom domain

When you control `meiloorun.gg`, add it to Cloudflare and configure its DNS
there. In the Worker, add `meiloorun.gg` under **Settings → Domains & Routes →
Add → Custom Domain**. Update GitHub's `SITE_URL` variable to
`https://meiloorun.gg` and redeploy. Twitch's parent parameter uses the hostname
of the current request, so previews and the custom domain both work.

Start on the free plan and monitor actual usage. Large server-rendered game
collections should be checked against the free Worker's CPU limits after
deployment; a successful local build does not measure production quota usage.

References: [Astro Cloudflare adapter](https://docs.astro.build/en/guides/integrations-guide/cloudflare/),
[Workers deployment](https://docs.astro.build/en/guides/deploy/cloudflare/),
[Durable storage](https://developers.cloudflare.com/durable-objects/best-practices/access-durable-objects-storage/),
[Worker secrets](https://developers.cloudflare.com/workers/configuration/secrets/).
