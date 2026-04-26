/**
 * 環境変数を取得するヘルパー。値の前後空白・改行を自動で trim する。
 * 過去に Vercel CLI 経由で末尾改行が混入した事故があったため、再発防止用。
 */
export function getEnv(key: string, opts?: { required?: false }): string | undefined;
export function getEnv(key: string, opts: { required: true }): string;
export function getEnv(key: string, opts?: { required?: boolean }): string | undefined {
  const raw = process.env[key];
  const trimmed = typeof raw === 'string' ? raw.trim() : undefined;
  if (opts?.required && !trimmed) {
    throw new Error(`Missing required env: ${key}`);
  }
  return trimmed;
}
