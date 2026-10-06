import { handle } from '@astrojs/cloudflare/handler';
import { withTrackerRuntime } from './lib/trackerRuntime.mjs';
export { TrackerCache } from './lib/trackerCacheObject';

export default {
  fetch(request: Request, env: Record<string, any>, ctx: any) {
    return withTrackerRuntime({ env }, () => handle(request, env, ctx));
  },
};
