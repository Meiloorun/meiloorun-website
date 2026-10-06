export interface TrackerRuntime {
  env: Record<string, any>;
  storage?: { get<T = any>(key: string): Promise<T | undefined>; put(key: string, value: any): Promise<void> };
}
export function withTrackerRuntime<T>(context: TrackerRuntime, task: () => T): T;
export function trackerRuntime(): TrackerRuntime | undefined;
export function setting(name: string): string | undefined;
export function sharedTracker<T = any>(kind: string, args?: unknown[]): Promise<{ value: T } | undefined>;
