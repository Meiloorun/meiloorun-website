export function withNodeTrackerRuntime<T>(env: Record<string, string | undefined>, task: () => T): Promise<Awaited<T>>;
