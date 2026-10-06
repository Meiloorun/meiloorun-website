// @ts-check
import { defineConfig } from 'astro/config';
import { loadEnv } from 'vite';

import react from '@astrojs/react';
import cloudflare from '@astrojs/cloudflare';

// https://astro.build/config
export default defineConfig({
  // Optional metadata origin. Hosting works on workers.dev without a domain.
  site: loadEnv('production', '.', 'SITE_').SITE_URL || undefined,
  adapter: cloudflare({ imageService: 'passthrough' }),
  session: false,
  integrations: [react()]
});
