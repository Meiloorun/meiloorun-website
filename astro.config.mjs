// @ts-check
import { defineConfig } from 'astro/config';
import { loadEnv } from 'vite';

import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
  site: loadEnv('production', '.', 'PAGES_').PAGES_SITE_URL || 'https://meiloorun.github.io',
  integrations: [react()]
});
