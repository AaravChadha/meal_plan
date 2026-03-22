import { NextRequest } from 'next/server';
import crypto from 'crypto';
import { getDb } from './db';

const SESSION_COOKIE = 'nt_session';
const SESSION_DURATION_DAYS = 30;

export function createSession(userId: number): string {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const db = getDb();
  db.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)').run(token, userId, expiresAt);
  return token;
}

export function getSessionUser(request: NextRequest): number | null {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const db = getDb();
  const session = db.prepare(
    "SELECT user_id FROM sessions WHERE token = ? AND expires_at > datetime('now')"
  ).get(token) as { user_id: number } | undefined;

  return session?.user_id ?? null;
}

export function deleteSession(token: string): void {
  const db = getDb();
  db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
}

export { SESSION_COOKIE };
