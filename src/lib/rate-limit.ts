/**
 * シンプルなメモリ内レートリミッタ。
 * 1サーバーレスインスタンスごとのメモリなので厳密ではないが、
 * 単純なブルートフォース防止には十分。
 */
const buckets = new Map<string, { count: number; resetAt: number }>();

interface CheckOptions {
  windowMs: number;
  max: number;
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  resetAt: number;
}

export function checkRateLimit(key: string, opts: CheckOptions): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    const resetAt = now + opts.windowMs;
    buckets.set(key, { count: 1, resetAt });
    return { ok: true, remaining: opts.max - 1, resetAt };
  }
  if (existing.count >= opts.max) {
    return { ok: false, remaining: 0, resetAt: existing.resetAt };
  }
  existing.count += 1;
  return { ok: true, remaining: opts.max - existing.count, resetAt: existing.resetAt };
}

export function clientKey(req: Request, suffix: string): string {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown';
  return `${ip}:${suffix}`;
}
