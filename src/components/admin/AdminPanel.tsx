import { useEffect, useRef, useState } from 'react';
import type { AdminStatus } from '../../lib/adminTypes';
import styles from './AdminPage.module.css';
import MainGameSettings from './MainGameSettings';

const dateLabel = (value: string) => `${new Date(value).toISOString().slice(0, 16).replace('T', ' ')} UTC`;

export default function AdminPanel({ initialStatus, initialError = '' }: { initialStatus: AdminStatus; initialError?: string }) {
  const [status, setStatus] = useState(initialStatus);
  const [code, setCode] = useState('');
  const [label, setLabel] = useState('');
  const [recovery, setRecovery] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(initialError);
  const [message, setMessage] = useState('');
  const [retryUntil, setRetryUntil] = useState(0);
  const [clock, setClock] = useState(0);
  const sequence = useRef(0);

  async function refresh() {
    const revision = ++sequence.current;
    try {
      const response = await fetch('/api/admin/session', { cache: 'no-store', signal: AbortSignal.timeout(15000) });
      const value = await response.json();
      if (!response.ok) throw new Error(value.error || 'Could not check admin access.');
      if (revision === sequence.current) setStatus(value);
    } catch (error) { if (revision === sequence.current) setError(error instanceof Error ? error.message : 'Could not check admin access.'); }
  }
  useEffect(() => {
    const focus = () => { void refresh(); };
    void refresh();
    window.addEventListener('focus', focus);
    return () => { sequence.current++; window.removeEventListener('focus', focus); };
  }, []);
  useEffect(() => {
    if (!retryUntil) return;
    setClock(Date.now());
    const timer = setInterval(() => { const now = Date.now(); setClock(now); if (now >= retryUntil) setRetryUntil(0); }, 1000);
    return () => clearInterval(timer);
  }, [retryUntil]);

  async function login() {
    if (busy || Date.now() < retryUntil) return;
    setBusy(true); setError(''); setMessage('');
    try {
      const response = await fetch('/api/admin/session', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, label }), signal: AbortSignal.timeout(15000),
      });
      const body = await response.json();
      if (!response.ok) {
        if (response.status === 429) setRetryUntil(Date.now() + Math.max(1, Number(response.headers.get('Retry-After')) || 300) * 1000);
        throw new Error(body.error || 'Could not sign in.');
      }
      setCode(''); setRetryUntil(0);
      await refresh();
      setMessage('This browser is signed in.');
    } catch (error) { setError(error instanceof Error ? error.message : 'Could not sign in. Please retry.'); }
    finally { setBusy(false); }
  }
  async function revoke(body: { id?: string; all?: true }) {
    if (busy) return;
    setBusy(true); setError(''); setMessage('');
    try {
      const response = await fetch('/api/admin/session', { method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body), signal: AbortSignal.timeout(15000),
      });
      const value = await response.json();
      if (!response.ok) {
        if (response.status === 401) await refresh();
        throw new Error(value.error || 'Could not revoke this session.');
      }
      await refresh();
      setMessage(value.signedOut ? 'You have signed out of this browser.' : 'Session revoked.');
    } catch (error) { setError(error instanceof Error ? error.message : 'Could not revoke this session.'); }
    finally { setBusy(false); }
  }
  const secondsLeft = retryUntil ? Math.max(0, Math.ceil((retryUntil - (clock || Date.now())) / 1000)) : 0;
  return <div className={styles.panel}>
    {error && <p role="alert" className={styles.error}>{error}</p>}
    {message && <p role="status">{message}</p>}
    {!status.configured ? <div><h2>Admin access is unavailable</h2><p>Configure the existing admin credentials in this server’s environment settings, then restart the service.</p></div> :
      !status.authenticated ? <form className={styles.login} onSubmit={event => { event.preventDefault(); void login(); }}>
        <h2>OWNER ACCESS.</h2>
        <p>{recovery ? 'Enter one of your saved single-use recovery codes.' : 'Enter the current six-digit code from your authenticator app.'}</p>
        <label htmlFor="admin-code">{recovery ? 'Recovery code' : 'Authenticator code'}</label>
        <input id="admin-code" name="code" type="text" inputMode={recovery ? 'text' : 'numeric'} autoComplete="one-time-code" value={code}
          required maxLength={recovery ? 39 : 6} pattern={recovery ? '[a-fA-F0-9-]{32,39}' : '[0-9]{6}'} onChange={event => setCode(event.target.value)} disabled={busy} />
        <label htmlFor="admin-browser">Browser name <span>(optional)</span></label>
        <input id="admin-browser" name="browser" value={label} maxLength={80} placeholder="Firefox on my laptop" onChange={event => setLabel(event.target.value)} disabled={busy} />
        <p>This browser stays signed in for seven days, unless you sign out or revoke it.</p>
        <button type="submit" disabled={busy || secondsLeft > 0}>{busy ? 'Signing in…' : secondsLeft > 0 ? `Try again in ${secondsLeft}s` : 'Sign in →'}</button>
        <button type="button" className={styles.secondary} disabled={busy} onClick={() => { setRecovery(value => !value); setCode(''); }}>{recovery ? 'Use authenticator code' : 'Use a recovery code'}</button>
      </form> : <>
        <div className={styles.controls}><h2>WELCOME, MEILOORUN.</h2><button type="button" disabled={busy} onClick={() => void revoke({})}>Sign out</button></div>
        <MainGameSettings />
        <div className={styles.tools}>
          <a href="/life">Personal life dashboard<small>Today's calendar, tasks, and the week ahead.</small></a>
          <a href="/media/comics">Marvel reading checklist <span aria-hidden="true">↗</span><small>Mark issues read or unread.</small></a>
        </div>
        <div className={styles.controls}><h2>YOUR BROWSER SESSIONS.</h2><button className={styles.secondary} type="button" disabled={busy} onClick={() => void refresh()}>Refresh</button></div>
        <p>Each session expires seven days after sign-in. Revoke a session to remove its editing access.</p>
        <ul className={styles.sessions}>{status.sessions.map(session => <li key={session.id}>
          <div><strong>{session.label}</strong>{session.current && <span className={styles.badge}>THIS BROWSER</span>}
            <small>Signed in <time dateTime={session.createdAt}>{dateLabel(session.createdAt)}</time> · Expires <time dateTime={session.expiresAt}>{dateLabel(session.expiresAt)}</time></small></div>
          <button type="button" disabled={busy} onClick={() => void revoke({ id: session.id })}>{session.current ? 'Sign out' : 'Revoke'}</button>
        </li>)}</ul>
        <button className={styles.secondary} type="button" disabled={busy} onClick={() => void revoke({ all: true })}>Sign out all browsers</button>
      </>}
  </div>;
}
