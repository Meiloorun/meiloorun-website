# Shared tracker caching

This describes the Cloudflare implementation on the `cloudflare` branch.
The `master` branch remains the static GitHub Pages version: its API loaders
run during builds, so browser visits do not update its tracker snapshots.

## What gets cached

The cache stores tracker data and game metadata, not a complete rendered page.
Astro renders each media page using that data when someone visits. The homepage,
projects page, and media hub are built as static HTML and need no tracker fetch.
There is no browser-local cache in this implementation.

Every visitor, on every device, uses the same private Durable Object. Workers
can run in different locations, but all tracker requests go to the named object
`media-v1` in the `TRACKER_CACHE` namespace. Its persistent storage is backed
by SQLite; the application uses its key/value API, so no SQL tables need managing.

## One page request, step by step

1. A browser requests a media page, such as `/media/music`.
2. `src/worker.ts` receives the request and gives Astro the Worker settings.
   `withTrackerRuntime` keeps those settings scoped to this request through
   AsyncLocalStorage. It does not copy credentials into a global variable.
3. The Astro route calls the existing loader, such as `loadLastFm()`.
4. `sharedTracker()` sends an internal request to the Durable Object. The
   object is accessed through a Cloudflare binding, not a public browser URL.
5. `TrackerCache` queues the request and runs the requested loader inside a
   context containing the object's persistent storage. The loader detects that
   it is already inside the object and executes directly, rather than calling
   the object recursively.
6. The loader calls `cachedMediaFeed()` or `cachedGameMetadata()`. That helper
   reads the saved value and checks its age before deciding whether to call
   the external API.
7. A successful API result replaces the saved snapshot. The object returns
   display data to the Astro route, which renders it into the response.
   Credentials and Simkl's raw library are not included in browser props.

## Freshness and expiry

A feed record looks conceptually like this:

```js
{
  version: 1,
  savedAt: 1791273600000,
  value: { /* successful tracker data */ },
  retryAfter: undefined
}
```

`savedAt` is the time of the successful cache write. `value.updatedAt`, when
present, is the tracker snapshot time shown in the UI. `retryAfter` is only
added after a failed refresh to delay another attempt.

| Data | Considered fresh for | Where to change it |
| --- | --- | --- |
| AniList manga and anime | 15 minutes per list | `mediaTrackers.ts` |
| Simkl TV and Movies together | 5 minutes | `mediaTrackers.ts` |
| Last.fm recent tracks / now playing | 5 minutes | `mediaTrackers.ts` |
| Last.fm top artists over seven days | 1 hour | `mediaTrackers.ts` |
| IGDB collection artwork and slugs | 7 days | `igdb.ts` |
| IGDB main-game details | 1 day per game ID | `igdb.ts` |
| Twitch app token for IGDB | 1 hour | `igdb.ts` |

Expiry is a freshness rule, not a timer that runs a job or deletes data.
If nobody visits for a week, there are no polling requests. The first visit
after expiry waits for a refresh; subsequent visits use the new snapshot.
For example, Music visited at 12:00 fetches recent tracks, 12:03 reuses them,
and the first visit at or after 12:05 refreshes them. The artists chart can
still be reused until its own one-hour interval expires.

Refreshing the browser page respects those rules. There is no automatic
updating while a page is already open, and manual force-refresh buttons are
not implemented yet. The now-playing label describes the last successful sync.

## Keys and invalidation

Loaders choose keys based on the account, feed, and relevant parameters.
The helpers hash each key with SHA-256 and use it as a storage identifier.
The `.cache/media/...json` and `.cache/igdb/...json` strings are identifiers
inside Cloudflare storage, not actual files on its server.

Different accounts/lists use different records. Changing `IGDB_GAME_ID` selects
a different main-game record. Collection artwork uses the sorted unique IGDB
IDs: changing game statuses or scores in the CSV reuses artwork, while adding
or removing an ID selects a new artwork cache. Older records are not currently
garbage-collected. Changing a loader's key/version can deliberately select a
new cache when the saved format changes.

Hashing keeps credentials out of identifiers; it is not encryption. Credential
values needed for refreshes remain in private Worker secrets or token records.
Protecting that storage depends on Cloudflare account access and the absence
of a public endpoint exposing it.

## Simultaneous visitors

The object has a promise queue (`tail`) that serializes whole loader operations,
including their network requests. The second request waits for the first to
finish, then checks the now-populated cache. This prevents duplicate cold loads
and competing Simkl token refreshes/checkpoint writes.

The `pending` maps in the cache helpers also combine overlapping loads of the
same key within one running process. Those maps alone would not coordinate
separate Workers, and disappear on restart. The Durable Object is what provides
the shared owner and durable state across requests.

The queue covers all trackers. At this site's low traffic that is simple and
safe, but a slow cold Games lookup can temporarily delay a Music request.
Splitting independent trackers into separate objects is a possible future
optimization if actual traffic makes that noticeable.

## Failed refreshes

`cachedMediaFeed` preserves the last successful value and snapshot time when
an upstream request fails. It records a retry delay of at least five minutes;
AniList and Last.fm `Retry-After` headers can extend that delay. During the
delay it serves the saved snapshot without calling the API again. If no good
snapshot exists, the loader shows its unavailable fallback and profile link.
A later successful refresh clears the backoff and saves a new snapshot.

API failures include up to three selected upstream error messages in Worker
logs (`upstreamMessages`), each limited to 1,000 characters, plus the upstream
Cloudflare Ray ID when available (`cfRay`). These fields are preserved in the
failure record so backoff events retain the original explanation. Error bodies,
request headers and credentials are not logged. Message capture covers AniList,
Last.fm, Simkl (including OAuth), IGDB and Twitch authentication. Credential
values are redacted before messages are logged or stored. AniList GraphQL,
Last.fm and Simkl application errors returned with HTTP 200 also retain messages.
Existing failure records gain these fields only after the next upstream attempt.

`cachedGameMetadata` also serves stale metadata after a failed refresh, but
currently has no persisted retry backoff. Once an IGDB record expires, each
new visit can retry until one succeeds. Failed first lookups are not cached.
Cache outages or Worker quota failures are separate from upstream API errors;
the cached upstream fallback does not guarantee availability during those outages.

## Simkl has an additional sync cache

The outer five-minute cache contains the formatted TV and Movies feeds.
Inside `syncSimkl`, two additional private records are retained:

- **Authentication:** refreshed access token and expiry. The initial refresh
  token comes from a Worker secret. Simkl authentication is renewed when the
  cached token is near expiry, or once after a 401 response.
- **Library checkpoint:** the raw shows/movies/anime library, previous activity
  timestamps, rating-sync state, and successful sync date.

After the five-minute cache expires, Simkl checks `/sync/activities`. Unchanged
categories reuse their saved library. Changed categories fetch and merge
incremental updates; deletions reconcile the active IDs. Movie/anime ratings
have their own delta checks. The library checkpoint advances only after the
whole sync succeeds. These raw/auth records never reach the browser.

Visits to either TV or Movies therefore refresh the same combined feed. Local
development and production have separate stores, so avoid refreshing the same
Simkl authorisation independently from both instances; the object cannot
coordinate a separate local server or the GitHub Pages build pipeline.

## Where the data lives

| Environment | Storage | Survives restart? | Shared with production? |
| --- | --- | --- | --- |
| Deployed Cloudflare Worker | Durable Object SQLite storage | Yes, including normal deployments | This is production storage |
| Local Cloudflare dev/preview | Wrangler's emulated storage under `.wrangler/` | Yes, unless deleted | No |
| Node CLI/cache tests | Private files under `.cache/` or a test directory | Yes, until deleted | No |

`cacheStorage.mjs` chooses the Durable Object's `get`/`put` methods when its
storage context exists. Otherwise it uses Node file reads and atomic writes.
That fallback keeps local Node tools/tests usable; it is not the deployed
Worker's persistence mechanism. `.cache/` and `.wrangler/` are ignored by Git
and are not uploaded as the production cache.

`wrangler.jsonc` declares the namespace, class, and initial SQLite migration.
Keep the Worker namespace and the named object identity stable to keep using
the existing cache. Renaming the object selects different storage; deleting
the namespace or its storage loses the cache. A new deployment updates code
and configured secrets without automatically clearing saved snapshots.

The CSV is separate: it is bundled with the server, parsed and reused in memory
while that Worker instance lives, and reparsed after an instance restarts.
Replacing the export still requires deployment. It is not fetched from Infinite
Backlog and is not uploaded into the shared tracker store.
