// @ts-check
import { defineConfig } from 'astro/config';
import { loadEnv } from 'vite';

import react from '@astrojs/react';
import node from '@astrojs/node';

const site = loadEnv('production', '.', 'SITE_').SITE_URL || undefined;
// Trust proxy headers only for this site's exact public hosts, never every Railway app.
const publicHosts = new Set([
  'meiloorun.gg', 'www.meiloorun.gg', 'meiloorun-site-production.up.railway.app', 'www.meiloorun-site-production.up.railway.app',
  ...(site ? [new URL(site).hostname] : []),
  ...(process.env.RAILWAY_PUBLIC_DOMAIN ? [process.env.RAILWAY_PUBLIC_DOMAIN] : []),
]);

// https://astro.build/config
export default defineConfig({
  // Optional metadata origin. Railway's generated domain works without a custom domain.
  site,
  security: {
    allowedDomains: [
      ...[...publicHosts].map(hostname => ({ hostname, protocol: 'https' })),
      { hostname: 'localhost', protocol: 'http' },
      { hostname: '127.0.0.1', protocol: 'http' },
    ],
  },
  adapter: node({ mode: 'standalone' }),
  image: { service: { entrypoint: 'astro/assets/services/noop' } },
  session: false,
  integrations: [react()]
});
