/** Server-only upstream fetch. Errors contain safe diagnostics, never URLs/bodies. */
export async function trackerRequest(url, init) {
  let response;
  try {
    response = await fetch(url, { ...init, signal: AbortSignal.timeout(8000) });
  } catch (cause) {
    throw Object.assign(new Error('Tracker connection failed'), {
      code: cause?.name === 'TimeoutError' || cause?.name === 'AbortError' ? 'timeout' : 'network',
    });
  }
  if (!response.ok) {
    const retryAfter = response.headers.get('Retry-After');
    const error = Object.assign(new Error('Tracker request failed'), {
      code: response.headers.get('cf-mitigated') === 'challenge' ? 'upstream-challenge' : 'http',
      httpStatus: response.status,
      responseType: response.headers.get('Content-Type')?.includes('json') ? 'json' : 'other',
    });
    if (retryAfter) error.retryDelay = /^\d+$/.test(retryAfter) ? Number(retryAfter) * 1000 : Math.max(0, Date.parse(retryAfter) - Date.now());
    throw error;
  }
  try { return await response.json(); }
  catch { throw Object.assign(new Error('Invalid tracker JSON'), { code: 'invalid-json', httpStatus: response.status }); }
}

export function trackerDiagnostic(error) {
  const allowed = ['http', 'upstream-challenge', 'timeout', 'network', 'invalid-json', 'graphql', 'invalid-data', 'cache-backoff'];
  return {
    code: allowed.includes(error?.code) ? error.code : 'unknown',
    ...(Number.isInteger(error?.httpStatus) && error.httpStatus >= 100 && error.httpStatus <= 599 ? { httpStatus: error.httpStatus } : {}),
    ...(['json', 'other'].includes(error?.responseType) ? { responseType: error.responseType } : {}),
  };
}
