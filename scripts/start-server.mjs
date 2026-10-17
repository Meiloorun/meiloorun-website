// Railway provides PORT. Binding all interfaces is required for external traffic.
process.env.HOST ||= '0.0.0.0';
await import('../dist/server/entry.mjs');
