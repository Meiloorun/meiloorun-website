import { useEffect, useState } from 'react';
import { ActionLink } from './ActionLink';
import { twitterUsername } from '../../lib/twitterTypes';
import type { TwitterFeed } from '../../lib/twitterTypes';
import styles from './TwitterTimeline.module.css';

/** Fetches public, server-cached posts from our endpoint. */
export function TwitterTimeline({ endpoint = '/api/social/twitter', height = 620, className = '' }: {
  endpoint?: string; height?: number; className?: string;
}) {
  const [feed, setFeed] = useState<TwitterFeed>();
  const [failed, setFailed] = useState(false);
  const handle = feed?.username || twitterUsername;
  const profileUrl = `https://x.com/${encodeURIComponent(handle)}`;

  useEffect(() => {
    const controller = new AbortController();
    setFeed(undefined);
    setFailed(false);
    void fetch(endpoint, { signal: controller.signal, cache: 'no-store' }).then(async response => {
      if (!response.ok) throw new Error(`Timeline request failed (${response.status})`);
      const data: TwitterFeed = await response.json();
      if (!Array.isArray(data.posts) || !['ready', 'stale'].includes(data.state)) throw new Error('Invalid timeline response');
      if (!controller.signal.aborted) setFeed(data);
    }).catch(error => {
      if (controller.signal.aborted) return;
      console.warn('[TwitterTimeline] Could not load cached posts.', error);
      setFailed(true);
    });
    return () => controller.abort();
  }, [endpoint]);

  return <div className={`${styles.timeline} ${className}`}>
    <div className={styles.header}><span>@{handle} / Xitter</span>
      <ActionLink href={profileUrl} target="_blank" rel="noopener noreferrer">View my profile</ActionLink>
    </div>
    <div className={styles.frame}>
      {!feed && <p className={styles.message} role="status">{failed
        ? 'Xosts are unavailable right now. Use the profile link above to browse them on Xitter.'
        : 'Loading xosts from Xitter…'}</p>}
      {feed && <>
        <div className={styles.posts} style={{ maxHeight: height }} role="region" aria-label={`Posts from @${handle}`} tabIndex={0}>
          {!feed.posts.length && <p className={styles.message}>No public posts to display yet.</p>}
          {feed.posts.map(post => <article className={styles.post} key={post.id}>
            {post.repostedBy && <p className={styles.repost}>Reposted by @{post.repostedBy}</p>}
            <header className={styles.author}>
              {post.author.avatar && <img src={post.author.avatar} alt="" width={40} height={40} loading="lazy" referrerPolicy="no-referrer" />}
              <a href={`https://x.com/${post.author.username}`} target="_blank" rel="noopener noreferrer">
                <strong>{post.author.name}</strong><span>@{post.author.username}</span>
              </a>
              <a className={styles.date} href={post.url} target="_blank" rel="noopener noreferrer">
                <time dateTime={post.createdAt}>{new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/London' }).format(new Date(post.createdAt))}</time>
              </a>
            </header>
            <p className={styles.text}>{post.text}</p>
            {!!post.photos.length && <div className={styles.photos}>
              {post.photos.map(photo => <a href={post.url} key={photo.url} target="_blank" rel="noopener noreferrer">
                <img src={photo.url} alt={photo.alt} loading="lazy" referrerPolicy="no-referrer" />
              </a>)}
            </div>}
            {post.video && <video className={styles.video} controls playsInline preload="none" poster={post.video.poster} src={post.video.url}>
              <a href={post.url}>Watch on Xitter</a>
            </video>}
            {post.quote && <blockquote className={styles.quote}>
              <a href={post.quote.url} target="_blank" rel="noopener noreferrer">@{post.quote.username}</a>
              <p className={styles.text}>{post.quote.text}</p>
            </blockquote>}
            <a className={styles.postLink} href={post.url} target="_blank" rel="noopener noreferrer">View post ↗</a>
          </article>)}
        </div>
        <p className={styles.meta} role="status">{feed.state === 'stale' ? 'Showing saved posts; the latest refresh was unavailable. ' : ''}
          {feed.checkedAt && <>Last synced {new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/London' }).format(new Date(feed.checkedAt))} (UK time). </>}
          Via <a href="https://fxembed.com" target="_blank" rel="noopener noreferrer">FxTwitter</a>.
        </p>
      </>}
    </div>
  </div>;
}
