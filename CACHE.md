# PostgreSQL tracker caching

This `railway` branch uses PostgreSQL for all persistent tracker state. Set
`DATABASE_URL` in Railway and in the private local `.env` used for development.
There is no filesystem-cache backend, cache import, or website cache volume.
The `cloudflare` and `collector` branches retain their separate implementations.

## Request flow

1. Astro middleware places a request-scoped PostgreSQL adapter in the tracker
   runtime. Without `DATABASE_URL`, dynamic routes return an unavailable response.
2. A loader checks its cache record using the shared `readCache`/`writeCache`
   boundary. The Drizzle adapter executes selects and upserts through a small,
   reused connection pool.
3. Fresh data is returned. Expired data is refreshed on demand and saved on success.
   Cache expiry does not schedule work by itself; ordinary feeds refresh on visits.
4. The page receives formatted display data. Authentication records and Simkl's
   raw synchronization checkpoint remain server-side.

`src/db/schema.ts` defines `tracker_cache`: `key`, JSONB `value`, and `updated_at`.
The stored payload contains snapshot dates, expiry/backoff state and diagnostics.
`updated_at` records the write, not a new successful API sync. Internal identifiers
may retain `.cache/...json` naming for compatibility with existing database keys;
these are strings in PostgreSQL, not files or filesystem operations.

## Freshness

| Data | Fresh for |
| --- | --- |
| AniList Manga / Anime | 1 minute per list |
| Last.fm completed listening history | 1 minute |
| Last.fm seven-day top artists | 1 minute |
| IGDB collection artwork and slugs | 7 days |
| IGDB main-game details | 1 day per game ID |
| Twitch app-token lookup | 1 hour |
| Simkl combined TV / Movies feed | 5 minutes, unchanged |
| Last.fm now playing | Never stored; fresh API request |

Simkl checks activities first, downloads only changed categories and retains its
incremental library, ratings checkpoint and refreshed authentication records in
PostgreSQL. Keeping that state is necessary even though local disk caches are gone.

## Live music status

Now playing uses Last.fm's `user.getrecenttracks` now-playing marker. The music
page fetches fresh status during rendering, then a small React island requests
`/api/music/now-playing` every 15 seconds while visible. Background tabs pause;
returning to the page requests an update. Fetches and endpoint responses use
`no-store`; there is no database, browser-storage or completed-response cache.
Only concurrent, overlapping upstream requests share a promise.

History caching filters out the currently playing track before writing its record.
Now playing and history can therefore share the initial upstream request without
persisting live status. Playback stopping clears the track; a failure shows status
unavailable instead of an old song as live. Errors back off for at least a minute,
and the browser honours a longer upstream Retry-After. This is polling, not push
notifications, and depends on the music player's Last.fm reporting.

## Failures and coordination

Media-feed failures preserve successful stale snapshots and a retry delay of at
least five minutes, extended by Retry-After when applicable. Failure backoff is
separate from successful-data freshness intervals. IGDB preserves stale metadata
on failure without a persisted retry delay. Database failures are not cache misses:
they do not silently switch to another backend or trigger fresh API requests.

Pending-load maps coordinate overlapping requests in one Node process. Keep one
replica/process until distributed refresh locking is implemented; PostgreSQL shares
data but does not itself serialize independent Simkl token-refresh operations.

## Migrations and privacy

Run `npm run db:generate` after editing the typed schema and review its generated
migration. Railway applies outstanding migrations using `npm run db:migrate` in
pre-deploy. `/api/health` verifies database/table access without contacting trackers.
No database is needed during the static production build.

The table contains private tokens as well as public snapshots. It is not exposed
through a public data endpoint. Known credential values are redacted from selected
API diagnostics; database driver exceptions are replaced with safe errors because
query parameters can contain tokens. Enable database backups separately in Railway.
The Infinite Backlog CSV remains a bundled manual export, parsed in memory; it is
not an old disk-cache backend and still requires deployment when replaced.
