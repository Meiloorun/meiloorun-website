import { defineMiddleware } from 'astro:middleware';
import process from 'node:process';
import { withNodeTrackerRuntime } from './lib/nodeTrackerRuntime.mjs';
import { findAdminSession } from './lib/adminAuth';
import { adminDatabase, adminToken, adminWriteError, currentAdminConfig, sameOriginError } from './lib/adminRequest';

// Development uses local .env files. Production reads Railway runtime variables.
// Neither source is passed to the client or required to render static build routes.
const developmentEnv = import.meta.env.DEV
  ? (await import('vite')).loadEnv(import.meta.env.MODE, process.cwd(), '') : {};

export const onRequest = defineMiddleware((context, next) => {
  if (context.isPrerendered) return next();
  const env = { ...developmentEnv, ...process.env };
  if (!env.DATABASE_URL?.trim()) return Response.json({ status: 'unavailable' }, { status: 503 });
  return withNodeTrackerRuntime(env, async () => {
    const path = context.url.pathname.replace(/\/+$/, '') || '/';
    const adminRoute = path === '/admin' || path.startsWith('/api/admin/') || path === '/life';
    const personalizedPage = path === '/media/comics';
    const mutation = path.startsWith('/api/') && !['GET', 'HEAD', 'OPTIONS'].includes(context.request.method);
    context.locals.adminSession = null;
    if (adminRoute || personalizedPage || mutation) {
      try {
        const config = currentAdminConfig();
        const token = adminToken(context.request);
        if (config && token) context.locals.adminSession = await findAdminSession(adminDatabase(), config, token);
      } catch {
        // Public reading remains available if optional admin access cannot be checked.
        // Admin routes and writes still fail closed.
        if (adminRoute || mutation) return Response.json({ error: 'Admin authentication is unavailable. Check configuration and migrations.' }, {
          status: 503, headers: { 'Cache-Control': 'private, no-store' },
        });
      }
    }
    // All present and future API mutations require admin access, except the login endpoint.
    if (mutation) {
      const error = path === '/api/admin/session' ? sameOriginError(context.request) : adminWriteError(context.request, context.locals.adminSession);
      if (error) return error;
    }
    const response = await next();
    if (adminRoute || personalizedPage) {
      response.headers.set('Cache-Control', 'private, no-store');
      response.headers.set('Content-Security-Policy', "frame-ancestors 'none'");
      response.headers.set('X-Frame-Options', 'DENY');
      response.headers.set('X-Content-Type-Options', 'nosniff');
      response.headers.set('Referrer-Policy', 'same-origin');
    }
    return response;
  });
});
