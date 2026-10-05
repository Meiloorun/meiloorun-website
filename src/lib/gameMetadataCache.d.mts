export function cachedGameMetadata<T>(key: string, maxAge: number, load: () => Promise<T>, cacheDir?: string): Promise<T>;
