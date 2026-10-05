export function cachedMediaFeed<T>(key: string, maxAge: number, load: () => Promise<T>, cacheDir?: string): Promise<T>;
