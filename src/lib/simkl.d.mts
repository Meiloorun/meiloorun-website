import type { TrackerFeed } from '../components/ui/TrackerPanel';
export function syncSimkl(options: {
  clientId?: string; accessToken?: string; refreshToken?: string; clientSecret?: string; cacheDir?: string;
}): Promise<{ shows: TrackerFeed; movies: TrackerFeed }>;
