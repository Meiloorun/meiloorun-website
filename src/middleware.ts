import { defineMiddleware } from 'astro:middleware';
import process from 'node:process';
import { withNodeTrackerRuntime } from './lib/nodeTrackerRuntime.mjs';

// Development uses local .env files. Production reads Railway runtime variables.
// Neither source is passed to the client or required to render static build routes.
const developmentEnv = import.meta.env.DEV
  ? (await import('vite')).loadEnv(import.meta.env.MODE, process.cwd(), '') : {};

export const onRequest = defineMiddleware((_context, next) =>
  withNodeTrackerRuntime({ ...developmentEnv, ...process.env }, next));
