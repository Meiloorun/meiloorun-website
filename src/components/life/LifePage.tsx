import { SiteShell } from '../layout/SiteShell';
import { Section } from '../ui/Section';
import { InkLabel } from '../ui/InkLabel';
import { ActionLink } from '../ui/ActionLink';
import { DecorativeImage } from '../ui/DecorativeImage';
import type { LifeData, LifeDay, LifeSourceState, LifeTask } from '../../lib/lifeTypes';
import styles from './LifePage.module.css';
import { PrayerTimes } from './PrayerTimes';
import type { PrayerTimesResult } from '../../lib/prayerTimes';

const clock = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', hour: '2-digit', minute: '2-digit' });
const sourceMessages: Record<LifeSourceState, string> = {
  ready: 'Up to date', partial: 'Some sources could not be loaded', unconfigured: 'Not connected', unavailable: 'Could not load. Try refreshing.',
};

export default function LifePage({ data, prayers }: { data: LifeData; prayers: PrayerTimesResult }) {
  const [today, ...upcoming] = data.days;
  return <SiteShell name="Meiloorun" currentPage="/life" headerNote={<>ONE DAY<br />AT A TIME.</>} footerNote="PRIVATE / PERSONAL LIFE">
    <Section headingLevel={1} eyebrow={<InkLabel tone="yellow">PERSONAL / ADMIN ACCESS</InkLabel>}
      title={<>LIFE IN<br /><span className={styles.highlight}>PROGRESS.</span></>} titleClassName={styles.title}
      decorations={<DecorativeImage src="/images/deco-7.svg" placement="top-right" width="110px" rotation={10} opacity={0.5} hideOnMobile />}>
      <p className={styles.intro}>A little structure for everything outside the screen. Here's what today looks like.</p>
      <div className={styles.toolbar}>
        <ActionLink href="/life">Refresh live data ↻</ActionLink>
        <a href="https://ticktick.com/webapp/" target="_blank" rel="noopener noreferrer">Open TickTick ↗</a>
        <a href="https://calendar.google.com/" target="_blank" rel="noopener noreferrer">Open Google Calendar ↗</a>
      </div>
      <p className={styles.meta}>Fetched <time dateTime={data.checkedAt}>{clock.format(new Date(data.checkedAt))}</time> / Europe/London / View only</p>
      <div className={styles.sources} role="status">
        <span data-state={data.tasksState}>TICKTICK / {sourceMessages[data.tasksState]}</span>
        <span data-state={data.calendarState}>CALENDAR / {sourceMessages[data.calendarState]}</span>
      </div>
    </Section>
    <Section title="TODAY / the main event" divider="top">
      <div className={styles.todayHeader}><h3>{today.label}</h3><span>{today.events.length} events / {today.tasks.length} tasks</span></div>
      <PrayerTimes result={prayers} />
      <div className={styles.today}>
        <div className={styles.panel}><h3>THE AGENDA.</h3><Events day={today} state={data.calendarState} /></div>
        <div className={styles.panel}><h3>ON THE LIST.</h3><Tasks tasks={today.tasks} state={data.tasksState} empty="No tasks scheduled for today." /></div>
      </div>
    </Section>
    <Section title="NEXT UP / the week ahead" divider="top">
      <div className={styles.upcoming}>{upcoming.map(day => <article className={styles.day} key={day.date}>
        <h3>{day.label}</h3><p className={styles.meta}>{day.events.length} events / {day.tasks.length} tasks</p>
        <details><summary>View the day</summary>
          <h4>Calendar</h4><Events day={day} state={data.calendarState} />
          <h4>Tasks</h4><Tasks tasks={day.tasks} state={data.tasksState} empty="No tasks scheduled." />
        </details>
        <ul className={styles.preview}>{[...day.events.slice(0, 2).map(event => ({ key: event.id, title: event.title, href: undefined, type: event.allDay ? 'All day' : clock.format(new Date(event.start)) })),
          ...day.tasks.slice(0, 2).map(task => ({ key: task.id, title: task.title, href: task.href, type: 'Task' }))].map(item => <li key={item.key}><small>{item.type}</small>{item.href ? <a href={item.href} target="_blank" rel="noopener noreferrer" aria-label={`${item.title}: open in TickTick (opens in a new tab)`}>{item.title}</a> : item.title}</li>)}</ul>
      </article>)}</div>
    </Section>
    <Section title="LOOSE ENDS" divider="top">
      <div className={styles.today}>
        <details className={styles.panel}><summary>OVERDUE / {data.overdue.length}</summary><Tasks tasks={data.overdue} state={data.tasksState} empty="Nothing overdue." showDate /></details>
        <details className={styles.panel}><summary>NO DATE / {data.undated.length}</summary><Tasks tasks={data.undated} state={data.tasksState} empty="No undated tasks." /></details>
      </div>
    </Section>
  </SiteShell>;
}

function Tasks({ tasks, state, empty, showDate = false }: { tasks: LifeTask[]; state: LifeSourceState; empty: string; showDate?: boolean }) {
  if (state === 'unavailable' || state === 'unconfigured') return <p>{sourceMessages[state]}</p>;
  return tasks.length ? <ul className={styles.tasks}>{tasks.map(task => <li key={task.id}>
    <div><strong><a href={task.href} target="_blank" rel="noopener noreferrer" aria-label={`${task.title}: open in TickTick (opens in a new tab)`}>{task.title}</a></strong><small>{task.list}{showDate && task.day ? ` / ${task.day}` : ''}{task.time ? ` / ${task.time}` : ''}{task.recurring ? ' / Recurring' : ''}{task.priority >= 5 ? ' / High priority' : ''}</small></div>
  </li>)}</ul> : <p>{state === 'partial' ? 'No tasks returned; some lists are unavailable.' : empty}</p>;
}

function Events({ day, state }: { day: LifeDay; state: LifeSourceState }) {
  if (state === 'unavailable' || state === 'unconfigured') return <p>{sourceMessages[state]}</p>;
  return <>{state === 'partial' && <p>Some calendars are unavailable. Showing events from the calendars that loaded.</p>}{day.events.length ? <ol className={styles.events}>{day.events.map(event => <li key={event.id} data-all-day={event.allDay}>
    <span className={styles.eventTime}>{event.allDay ? 'ALL DAY' : <><time dateTime={event.start}>{clock.format(new Date(event.start))}</time><span>–</span><time dateTime={event.end}>{clock.format(new Date(event.end))}</time></>}</span>
    <strong>{event.title}</strong>
  </li>)}</ol> : <p>{state === 'partial' ? 'No events returned from the calendars that loaded.' : 'No events scheduled.'}</p>}</>;
}
