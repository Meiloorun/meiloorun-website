export interface TrackerRequestOptions { includeErrorMessages?: boolean; secrets?: (string | undefined)[]; timeout?: number }
export function trackerRequest(url: string, init?: RequestInit, options?: TrackerRequestOptions): Promise<any>;
export function trackerHttpError(response: Response, options?: TrackerRequestOptions): Promise<Error>;
export function trackerErrorMessages(errors: unknown, secrets?: (string | undefined)[]): string[];
export function trackerDiagnostic(error: unknown): { code: string; httpStatus?: number; responseType?: string; upstreamMessages?: string[]; cfRay?: string };
