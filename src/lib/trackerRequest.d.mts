export function trackerRequest(url: string, init?: RequestInit): Promise<any>;
export function trackerDiagnostic(error: unknown): { code: string; httpStatus?: number; responseType?: string };
