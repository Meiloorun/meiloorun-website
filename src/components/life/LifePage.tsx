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
  stale: 'Showing saved tasks; refresh failed',
  ready: 'Up to date', partial: 'Some sources could not be loaded', unconfigured: 'Not connected', unavailable: 'Could not load. Try refreshing.',
};

export default function LifePage({ data, prayers }: { data: LifeData; prayers: PrayerTimesResult }) {
  const [today, ...upcoming] = data.days;
  return <SiteShell name="Meiloorun" currentPage="/life" headerNote={<>ONE DAY<br />AT A TIME.</>} footerNote="PRIVATE / PERSONAL LIFE"
    decorations={<>
      <DecorativeImage src="/images/deco-4.svg" placement="top-left" width="clamp(260px, 26vw, 430px)"
        offsetX="-300px" offsetY="780px" rotation={-18} opacity={0.7}
        mobile={{ width: '200px', offsetX: '-150px', offsetY: '700px', opacity: 0.25 }} />
      <DecorativeImage src="/images/deco-4.svg" placement="bottom-right" width="clamp(240px, 24vw, 380px)"
        offsetX="250px" offsetY="-20px" rotation={22} flipX opacity={0.55}
        mobile={{ width: '180px', offsetX: '130px', offsetY: '0px', opacity: 0.2 }} />
    </>}>
    <Section headingLevel={1} eyebrow={<InkLabel tone="yellow">PERSONAL / ADMIN ACCESS</InkLabel>}
      title={<>LIFE IS<br /><span className={styles.highlight}>BEATING MY ARSE</span></>} titleClassName={styles.title}
      decorations={<>
        <DecorativeImage src="/images/deco-deviljin2.svg" placement="center-right" width="450px" rotation={0} opacity={0.8} hideOnMobile />
        <DecorativeImage src="/images/deco-2.svg" placement="top-left" width="300px" offsetX="-140px" offsetY="-25px" rotation={-12} opacity={0.12}
          mobile={{ width: '180px', offsetX: '-90px', offsetY: '-10px', opacity: 0.08 }} />
        <DecorativeImage src="/images/deco-kazama.svg" placement="bottom-right" width="65px" offsetX="-30px" offsetY="-12px" rotation={12} opacity={0.65}
          mobile={{ width: '42px', offsetX: '-4px', offsetY: '-12px', opacity: 0.35 }} />
      </>}>
      <DecorativeImage src="/images/deco-6.svg" placement="bottom-center" width="110px" rotation={10} opacity={0.5} hideOnMobile />
      <p className={styles.intro}>Here's what today looks like.</p>
      <div className={styles.toolbar}>
        <ActionLink href="/life?refresh=tasks">Refresh live data ↻</ActionLink>
        <a href="https://ticktick.com/webapp/" target="_blank" rel="noopener noreferrer">Open TickTick ↗</a>
        <a href="https://calendar.google.com/" target="_blank" rel="noopener noreferrer">Open Google Calendar ↗</a>
      </div>
      <p className={styles.meta}>Fetched <time dateTime={data.checkedAt}>{clock.format(new Date(data.checkedAt))}</time> / Europe/London / View only</p>
      <div className={styles.sources} role="status">
        <span data-state={data.tasksState}>TICKTICK / {sourceMessages[data.tasksState]}</span>
        <span data-state={data.calendarState}>CALENDAR / {sourceMessages[data.calendarState]}</span>
      </div>
    </Section>
    <Section title="TODAY / the main event" divider="top" clipDecorations={false}
      decorations={<>
        <DecorativeImage src="/images/deco-1.svg" placement="top-left" width="220px" offsetX="-145px" offsetY="18px" rotation={-25} opacity={0.2}
          mobile={{ width: '130px', offsetX: '-90px', offsetY: '20px', opacity: 0.1 }} />
        <DecorativeImage src="/images/deco-6.svg" placement="bottom-left" width="90px" offsetX="-35px" offsetY="20px" rotation={-14} opacity={0.65}
          mobile={{ width: '55px', offsetX: '-16px', offsetY: '16px', opacity: 0.35 }} />
      </>}>
      <div className={styles.todayHeader}><h3>{today.label}</h3><span>{today.events.length} events / {today.tasks.length} tasks</span></div>
      <PrayerTimes result={prayers} />
      <DecorativeImage src="/images/deco-10.svg" placement="top-right" width="110px" rotation={10} opacity={0.5} hideOnMobile />
      <DecorativeImage src="/images/deco-3.svg" placement="center-right" width="110px" rotation={10} opacity={0.5} offsetX="50px" hideOnMobile />
      <DecorativeImage src="/images/deco-3.svg" placement="center-right" width="110px" rotation={40} opacity={0.5} offsetX="50px" offsetY="10px" hideOnMobile />
      <DecorativeImage src="/images/deco-3.svg" placement="center-right" width="110px" rotation={50} opacity={0.5} offsetX="50px" offsetY="40px" hideOnMobile />
      <DecorativeImage src="/images/deco-3.svg" placement="center-right" width="110px" rotation={120} opacity={0.5} offsetX="50px" offsetY="70px" hideOnMobile />
      <div className={styles.today}>
        <div className={styles.panel}><h3>THE AGENDA.</h3><Events day={today} state={data.calendarState} /></div>
        <div className={styles.panel}><h3>ON THE LIST.</h3><Tasks tasks={today.tasks} state={data.tasksState} empty="No tasks scheduled for today." /></div>
      </div>
    </Section>
    <Section title="NEXT UP / the week ahead" divider="top" clipDecorations={false}
      decorations={<>
        <DecorativeImage src="/images/deco-kazama.svg" placement="top-right" width="65px" offsetX="-12px" offsetY="10px" rotation={-16} opacity={0.75}
          mobile={{ width: '42px', offsetX: '12px', offsetY: '18px', opacity: 0.15 }} />
        <DecorativeImage src="/images/deco-2.svg" placement="bottom-left" width="clamp(240px, 28vw, 380px)" offsetX="-200px" offsetY="60px" rotation={18} opacity={0.5}
          mobile={{ width: '190px', offsetX: '-130px', offsetY: '30px', opacity: 0.22 }} />
      </>}>
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
    <Section title="LOOSE ENDS" divider="top" clipDecorations={false}
      decorations={<>
        <DecorativeImage src="/images/deco-5.svg" placement="top-right" width="220px" offsetX="75px" offsetY="-25px" rotation={15} opacity={0.2}
          mobile={{ width: '150px', offsetX: '65px', offsetY: '-10px', opacity: 0.1 }} />
        <DecorativeImage src="/images/deco-6.svg" placement="bottom-right" width="100px" offsetX="45px" offsetY="45px" rotation={18} opacity={0.7}
          mobile={{ width: '65px', offsetX: '22px', offsetY: '30px', opacity: 0.35 }} />
      </>}>
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
