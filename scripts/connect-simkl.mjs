import { readFile, writeFile } from 'node:fs/promises';
import { setTimeout } from 'node:timers/promises';
import { oauthRequest } from '../src/lib/simkl.mjs';

try {
  try { process.loadEnvFile('.env'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  const clientId = process.env.SIMKL_CLIENT_ID;
  if (!clientId) throw new Error('Add SIMKL_CLIENT_ID to .env first. Create an AUTH V2 app of type TV, devices & command line.');
  const device = await oauthRequest(clientId, 'device', { scope: 'media:read' });
  if (!device.ok || !device.device_code || !device.user_code || !Number.isFinite(device.expires_in)) {
    throw new Error('Could not request a code. Check that SIMKL_CLIENT_ID belongs to an AUTH V2 app.');
  }
  console.log(`Open https://simkl.com/pin and enter: ${device.user_code}\nWaiting for approval (Ctrl+C to cancel)...`);
  const deadline = Date.now() + Math.min(device.expires_in, 600) * 1000;
  let interval = Math.max(Number(device.interval) || 5, 5);
  while (Date.now() < deadline) {
    await setTimeout(interval * 1000);
    if (Date.now() >= deadline) break;
    const result = await oauthRequest(clientId, 'token', {
      grant_type: 'urn:ietf:params:oauth:grant-type:device_code', device_code: device.device_code,
      ...(process.env.SIMKL_CLIENT_SECRET ? { client_secret: process.env.SIMKL_CLIENT_SECRET } : {}),
    });
    if (result.error === 'authorization_pending') continue;
    if (result.error === 'slow_down') { interval += 5; continue; }
    if (!result.ok || !result.access_token || !result.refresh_token || !result.scope?.split(' ').includes('media:read')) {
      throw new Error('Connection failed or expired. Check your app settings and run the command again.');
    }
    let contents = await readFile('.env', 'utf8').catch(error => { if (error.code === 'ENOENT') return ''; throw error; });
    for (const [key, value] of Object.entries({ SIMKL_ACCESS_TOKEN: result.access_token, SIMKL_REFRESH_TOKEN: result.refresh_token })) {
      const line = `${key}=${JSON.stringify(value)}`;
      const pattern = new RegExp(`^${key}=.*$`, 'm');
      contents = pattern.test(contents) ? contents.replace(pattern, () => line) : `${contents.trimEnd()}\n${line}\n`;
    }
    await writeFile('.env', contents, { mode: 0o600 });
    console.log('Simkl connected. Tokens saved privately to .env. Run npm run build to update the pages.');
    process.exit(0);
  }
  throw new Error('Approval timed out. Run npm run connect:simkl to request a new code.');
} catch (error) {
  // Only print our own messages, never a network exception containing credentials.
  console.error(error.message.startsWith('Add ') || error.message.startsWith('Could not ') || error.message.startsWith('Connection ') || error.message.startsWith('Approval ') ? error.message : 'Simkl connection failed. Check your network and app settings, then try again.');
  process.exitCode = 1;
}
