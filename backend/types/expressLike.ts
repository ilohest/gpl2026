// backend/types/expressLike.ts
export type NextLike = (err?: unknown) => void;

export type SessionLike = Record<string, unknown> & {
  authenticated?: boolean;
  uid?: string;
  save?: (cb?: () => void) => void;
  destroy?: (cb?: () => void) => void;
};

export type UserLike = {
  uid: string;
  email: string;
  claims: Record<string, unknown>;
  permissions: string[];
  permissionsFromClaims?: string[];
  permissionsFromUserDoc?: string[];
};

export type RequestLike = {
  method?: string;
  originalUrl?: string;
  headers: Record<string, string | string[] | undefined>;
  session?: SessionLike;
  body?: unknown;
  query?: Record<string, unknown>;
  params?: Record<string, unknown>;
  user?: UserLike;
  claims?: Record<string, unknown>;
};

export type ResponseLike = {
  status: (code: number) => ResponseLike;
  json: (payload: unknown) => unknown;
};
