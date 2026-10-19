import { useEffect, useState } from 'react';
import styles from './AdminPage.module.css';

export default function MainGameSettings() {
  const [gameId, setGameId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let disposed = false;
    const timeout = setTimeout(() => controller.abort(), 15000);
    setLoading(true); setError('');
    void (async () => {
      try {
        const response = await fetch('/api/admin/main-game', { cache: 'no-store', signal: controller.signal });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || 'Could not load the main game setting.');
        if (!disposed) { setGameId(body.mainGameId === null ? '' : String(body.mainGameId)); setLoading(false); }
      } catch (error) {
        if (!disposed) setError(controller.signal.aborted ? 'Loading took too long. Please retry.' : error instanceof Error ? error.message : 'Could not load the main game setting.');
      } finally { clearTimeout(timeout); }
    })();
    return () => { disposed = true; clearTimeout(timeout); controller.abort(); };
  }, [revision]);

  async function save() {
    if (loading || saving) return;
    setSaving(true); setError(''); setMessage('');
    try {
      const response = await fetch('/api/admin/main-game', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mainGameId: gameId.trim() ? Number(gameId.trim()) : null }), signal: AbortSignal.timeout(15000),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Could not save the main game setting.');
      setGameId(body.mainGameId === null ? '' : String(body.mainGameId));
      setMessage(body.mainGameId === null ? 'Main game cleared.' : 'Main game saved. Reload the games page to see it.');
    } catch (error) { setError(error instanceof Error ? error.message : 'Could not save the main game setting.'); }
    finally { setSaving(false); }
  }

  return <section className={styles.gameSettings} aria-labelledby="main-game-heading">
    <form className={styles.login} onSubmit={event => { event.preventDefault(); void save(); }}>
      <h2 id="main-game-heading">CURRENT MAIN GAME.</h2>
      <p>Choose the game showcased on the <a href="/media/games">games page</a>. Use its numeric IGDB ID; leave this blank to clear the showcase.</p>
      <label htmlFor="main-game-id">IGDB game ID</label>
      <input id="main-game-id" name="mainGameId" type="text" inputMode="numeric" pattern="[1-9][0-9]*" maxLength={10}
        value={gameId} onChange={event => { setGameId(event.target.value); setMessage(''); }} disabled={loading || saving} aria-describedby="main-game-help" />
      <p id="main-game-help">Saving stores your selection. Details and artwork come from IGDB when the games page loads.</p>
      {error && <p role="alert" className={styles.error}>{error}</p>}
      {message && <p role="status">{message}</p>}
      {loading && !error && <p role="status">Loading main game…</p>}
      {loading && error && <button type="button" onClick={() => setRevision(value => value + 1)}>Retry loading</button>}
      <button type="submit" disabled={loading || saving}>{saving ? 'Saving…' : 'Save main game'}</button>
    </form>
  </section>;
}
