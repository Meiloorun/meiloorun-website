// @ts-check
import { defineConfig } from 'astro/config';
import { loadEnv } from 'vite';

import react from '@astrojs/react';
import node from '@astrojs/node';

// https://astro.build/config
export default defineConfig({
  // Optional metadata origin. Railway's generated domain works without a custom domain.
  site: loadEnv('production', '.', 'SITE_').SITE_URL || undefined,
  adapter: node({ mode: 'standalone' }),
  image: { service: { entrypoint: 'astro/assets/services/noop' } },
  session: false,
  integrations: [react()]
});
