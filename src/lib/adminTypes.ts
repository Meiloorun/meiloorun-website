export type AdminSession = { id: string; label: string; createdAt: string; expiresAt: string };
export type AdminStatus = {
  configured: boolean;
  authenticated: boolean;
  sessions: (AdminSession & { current: boolean })[];
};
