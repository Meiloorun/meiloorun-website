import type { TrackerFeed } from '../components/ui/TrackerPanel';
import type { trackerDiagnostic } from './trackerRequest.mjs';
export function syncSimkl(options: {
  clientId?: string; accessToken?: string; refreshToken?: string; clientSecret?: string; cacheDir?: string;
}): Promise<{ shows: TrackerFeed; movies: TrackerFeed; failure?: ReturnType<typeof trackerDiagnostic> }>;
