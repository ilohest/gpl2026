// backend/utils/httpErrors.ts
export class HttpError extends Error {
  status: number;
  code: string;
  meta: unknown;

  constructor(status: number, code: string, meta?: unknown) {
    super(code);
    this.status = status;
    this.code = code;
    this.meta = meta || null;
  }
}

export function badRequest(code: string, meta?: unknown): HttpError {
  return new HttpError(400, code, meta);
}
export function forbidden(code: string, meta?: unknown): HttpError {
  return new HttpError(403, code, meta);
}
export function notFound(code: string, meta?: unknown): HttpError {
  return new HttpError(404, code, meta);
}
export function conflict(code: string, meta?: unknown): HttpError {
  return new HttpError(409, code, meta);
}
export function gone(code: string, meta?: unknown): HttpError {
  return new HttpError(410, code, meta);
}
