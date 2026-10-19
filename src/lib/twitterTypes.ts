export const twitterUsername = 'Meil00run';
export interface TwitterPost {
  id: string; url: string; text: string; createdAt: string;
  author: { name: string; username: string; avatar?: string };
  repostedBy?: string;
  photos: { url: string; alt: string }[];
  video?: { url: string; poster?: string };
  quote?: { text: string; username: string; url: string };
}
export interface TwitterFeed {
  state: 'ready' | 'stale' | 'unavailable';
  username: string; posts: TwitterPost[]; checkedAt?: string;
}
