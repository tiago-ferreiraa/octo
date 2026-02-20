import Database from 'better-sqlite3';
import path from 'path';
import type { ExamData } from './types';

const db = new Database(path.join(process.cwd(), 'exam-shares.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS shared_exams (
    id         TEXT PRIMARY KEY,
    data       TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  )
`);

export function saveShare(id: string, data: ExamData, expiresAt: number): void {
  db.prepare(
    'INSERT INTO shared_exams (id, data, expires_at, created_at) VALUES (?, ?, ?, ?)',
  ).run(id, JSON.stringify(data), expiresAt, Math.floor(Date.now() / 1000));
}

export function getShare(id: string): ExamData | null {
  const now = Math.floor(Date.now() / 1000);

  // Lazy cleanup of expired rows
  db.prepare('DELETE FROM shared_exams WHERE expires_at <= ?').run(now);

  const row = db.prepare('SELECT data FROM shared_exams WHERE id = ?').get(id) as
    | { data: string }
    | undefined;

  if (!row) return null;
  return JSON.parse(row.data) as ExamData;
}

export function getShareWithExpiry(id: string): { data: ExamData; expiresAt: number } | null {
  const now = Math.floor(Date.now() / 1000);

  const row = db
    .prepare('SELECT data, expires_at FROM shared_exams WHERE id = ? AND expires_at > ?')
    .get(id, now) as { data: string; expires_at: number } | undefined;

  if (!row) return null;
  return { data: JSON.parse(row.data) as ExamData, expiresAt: row.expires_at };
}
