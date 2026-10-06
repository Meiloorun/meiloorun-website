/** Server-only fetch. Public API error messages can be explicitly included in diagnostics. */
export async function trackerRequest(url, init, { includeErrorMessages = false, secrets = [], timeout = 8000 } = {}) {
  let response;
  try {
    response = await fetch(url, { ...init, signal: AbortSignal.timeout(timeout) });
  } catch (cause) {
    throw Object.assign(new Error('Tracker connection failed'), {
      code: cause?.name === 'TimeoutError' || cause?.name === 'AbortError' ? 'timeout' : 'network',
    });
  }
  if (!response.ok) throw await trackerHttpError(response, {
    includeErrorMessages, secrets: [...secrets, ...requestSecrets(url, init)],
  });
  try { return await response.json(); }
  catch { throw Object.assign(new Error('Invalid tracker JSON'), { code: 'invalid-json', httpStatus: response.status }); }
}

function requestSecrets(url, init) {
  const values = [];
  const collect = params => {
    for (const [key, value] of params) if (/secret|token|api[_-]?key|client[_-]?id|device[_-]?code/i.test(key)) values.push(value);
  };
  collect(new URL(url).searchParams);
  if (init?.body instanceof URLSearchParams) collect(init.body);
  const headers = new Headers(init?.headers);
  const authorization = headers.get('Authorization');
  if (authorization) values.push(authorization, authorization.replace(/^Bearer\s+/i, ''));
  if (headers.has('Client-ID')) values.push(headers.get('Client-ID'));
  return values;
}

export async function trackerHttpError(response, { includeErrorMessages = true, secrets = [] } = {}) {
    const retryAfter = response.headers.get('Retry-After');
    const error = Object.assign(new Error('Tracker request failed'), {
      code: response.headers.get('cf-mitigated') === 'challenge' ? 'upstream-challenge' : 'http',
      httpStatus: response.status,
      responseType: response.headers.get('Content-Type')?.includes('json') ? 'json' : 'other',
    });
    if (includeErrorMessages && error.responseType === 'json') {
      try {
        const body = await response.json();
        const messages = trackerErrorMessages(body, secrets);
        if (messages.length) error.upstreamMessages = messages;
      } catch { /* Keep HTTP diagnostics if the error response is not valid JSON. */ }
    }
    const ray = response.headers.get('cf-ray');
    if (ray && /^[a-f0-9]+(?:-[A-Z]{3})?$/i.test(ray)) error.cfRay = ray;
    if (retryAfter) error.retryDelay = /^\d+$/.test(retryAfter) ? Number(retryAfter) * 1000 : Math.max(0, Date.parse(retryAfter) - Date.now());
    return error;
}

// Select messages only; never retain whole upstream bodies, queries or request headers.
export function trackerErrorMessages(errors, secrets = []) {
  const items = Array.isArray(errors) ? errors : errors?.errors && Array.isArray(errors.errors) ? [...errors.errors, errors] : [errors];
  return items.flatMap(error => [error?.message, error?.error_description, typeof error?.error === 'string' ? error.error : undefined,
    error?.cause, error?.title])
    .filter(message => typeof message === 'string' && message.trim())
    .slice(0, 3).map(message => {
      for (const secret of [...secrets].filter(value => typeof value === 'string' && value).sort((a, b) => b.length - a.length)) {
        for (const value of new Set([secret, encodeURIComponent(secret)])) message = message.replaceAll(value, '[redacted]');
      }
      return message.replace(/[\u0000-\u001f\u007f]/g, ' ').slice(0, 1000);
    });
}

export function trackerDiagnostic(error) {
  const allowed = ['http', 'upstream-challenge', 'timeout', 'network', 'invalid-json', 'graphql', 'api', 'invalid-data', 'cache-backoff'];
  const messages = trackerErrorMessages(Array.isArray(error?.upstreamMessages) ?
    error.upstreamMessages.map(message => ({ message })) : []);
  return {
    code: allowed.includes(error?.code) ? error.code : 'unknown',
    ...(Number.isInteger(error?.httpStatus) && error.httpStatus >= 100 && error.httpStatus <= 599 ? { httpStatus: error.httpStatus } : {}),
    ...(['json', 'other'].includes(error?.responseType) ? { responseType: error.responseType } : {}),
    ...(messages.length ? { upstreamMessages: messages } : {}),
    ...(typeof error?.cfRay === 'string' && /^[a-f0-9]+(?:-[A-Z]{3})?$/i.test(error.cfRay) ? { cfRay: error.cfRay } : {}),
  };
}
