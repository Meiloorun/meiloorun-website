export function cachedGameMetadata<T>(key: string, maxAge: number, load: () => Promise<T>): Promise<T>;
