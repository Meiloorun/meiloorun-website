export type LifeSourceState = 'ready' | 'unconfigured' | 'unavailable' | 'partial' | 'stale';
export interface LifeTask {
  id: string; title: string; href: string; list: string; day?: string; time?: string; priority: number; recurring: boolean;
}
export interface LifeEvent {
  id: string; title: string; start: string; end: string; allDay: boolean;
}
export interface LifeDay {
  date: string; label: string; events: LifeEvent[]; tasks: LifeTask[];
}
export interface LifeData {
  checkedAt: string; timeZone: string; days: LifeDay[]; overdue: LifeTask[]; undated: LifeTask[];
  tasksState: LifeSourceState; calendarState: LifeSourceState;
}
