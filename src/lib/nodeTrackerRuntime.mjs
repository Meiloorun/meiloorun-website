import { resolve } from 'node:path';
import { withTrackerRuntime } from './trackerRuntime.mjs';

/** Keeps the existing loaders usable on Node without Cloudflare bindings. */
export function withNodeTrackerRuntime(env, task) {
  return withTrackerRuntime({ env, node: true,
    cacheRoot: env.TRACKER_DATA_DIR ? resolve(env.TRACKER_DATA_DIR) : undefined,
  }, task);
}
