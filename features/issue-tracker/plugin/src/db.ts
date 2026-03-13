/**
 * Dev Team Plugin — SQLite ticket database
 */

import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

export const DB_PATH =
  process.env.DB_PATH ?? path.join(process.env.HOME ?? '/root', 'nano-agent-team', 'data', 'nano-agent-team.db');

let db: Database.Database | undefined;

export function openDb(): Database.Database {
  if (db) return db;

  const dir = path.dirname(DB_PATH);
  fs.mkdirSync(dir, { recursive: true });

  db = new Database(DB_PATH);

  // Enable WAL mode for concurrent access (host + containers)
  try { db.pragma('journal_mode = WAL'); } catch { /* already set */ }

  db.exec(`
    CREATE TABLE IF NOT EXISTS tickets (
      id          TEXT PRIMARY KEY,
      title       TEXT NOT NULL,
      status      TEXT NOT NULL CHECK(status IN ('idea','approved','spec_ready','in_progress','review','done','rejected','epic','verified','pending_input')),
      priority    TEXT NOT NULL DEFAULT 'MED' CHECK(priority IN ('CRITICAL','HIGH','MED','LOW')),
      type        TEXT NOT NULL DEFAULT 'task' CHECK(type IN ('epic','story','task','bug','idea')),
      parent_id   TEXT REFERENCES tickets(id),
      blocked_by  TEXT,
      author      TEXT,
      assigned_to TEXT,
      labels      TEXT,
      body        TEXT,
      model_hint  TEXT,
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_tickets_status   ON tickets(status);
    CREATE INDEX IF NOT EXISTS idx_tickets_assigned ON tickets(assigned_to);

    CREATE TABLE IF NOT EXISTS ticket_history (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_id   TEXT NOT NULL REFERENCES tickets(id),
      from_status TEXT,
      to_status   TEXT NOT NULL,
      changed_by  TEXT,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_history_ticket ON ticket_history(ticket_id);

    CREATE TABLE IF NOT EXISTS ticket_comments (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_id   TEXT NOT NULL REFERENCES tickets(id),
      author      TEXT NOT NULL,
      body        TEXT NOT NULL,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_comments_ticket ON ticket_comments(ticket_id);
  `);

  return db;
}

export function nextTicketId(): string {
  const database = openDb();
  const row = database.prepare('SELECT COUNT(*) as cnt FROM tickets').get() as { cnt: number };
  return `TICK-${(row.cnt + 1).toString().padStart(4, '0')}`;
}

export interface Ticket {
  id: string;
  title: string;
  status: string;
  priority: string;
  type: string;
  parent_id?: string | null;
  blocked_by?: string | null;
  author?: string | null;
  assigned_to?: string | null;
  labels?: string | null;
  body?: string | null;
  model_hint?: string | null;
  created_at: string;
  updated_at: string;
}

export interface TicketComment {
  id: number;
  ticket_id: string;
  author: string;
  body: string;
  created_at: string;
}

export function listTickets(filters: { status?: string; priority?: string; assigned_to?: string } = {}): Ticket[] {
  const database = openDb();
  let sql = 'SELECT * FROM tickets WHERE 1=1';
  const params: string[] = [];
  if (filters.status) { sql += ' AND status = ?'; params.push(filters.status); }
  if (filters.priority) { sql += ' AND priority = ?'; params.push(filters.priority); }
  if (filters.assigned_to) { sql += ' AND assigned_to = ?'; params.push(filters.assigned_to); }
  sql += ' ORDER BY created_at DESC';
  return database.prepare(sql).all(...params) as Ticket[];
}

export function getTicket(id: string): Ticket | undefined {
  return openDb().prepare('SELECT * FROM tickets WHERE id = ?').get(id) as Ticket | undefined;
}

export function createTicket(data: Partial<Ticket> & { title: string }): Ticket {
  const database = openDb();
  const id = nextTicketId();
  const now = new Date().toISOString().replace('T', ' ').replace(/\.\d+Z$/, '');
  database.prepare(`
    INSERT INTO tickets (id, title, status, priority, type, parent_id, blocked_by, author, assigned_to, labels, body, model_hint, created_at, updated_at)
    VALUES (@id, @title, @status, @priority, @type, @parent_id, @blocked_by, @author, @assigned_to, @labels, @body, @model_hint, @created_at, @updated_at)
  `).run({
    id, title: data.title,
    status: data.status ?? 'idea',
    priority: data.priority ?? 'MED',
    type: data.type ?? 'task',
    parent_id: data.parent_id ?? null,
    blocked_by: data.blocked_by ?? null,
    author: data.author ?? null,
    assigned_to: data.assigned_to ?? null,
    labels: data.labels ?? null,
    body: data.body ?? null,
    model_hint: data.model_hint ?? null,
    created_at: now,
    updated_at: now,
  });
  return getTicket(id)!;
}

export function updateTicket(id: string, data: Partial<Omit<Ticket, 'id' | 'created_at'>>, changedBy?: string): Ticket | undefined {
  const database = openDb();
  const existing = getTicket(id);
  if (!existing) return undefined;
  const now = new Date().toISOString().replace('T', ' ').replace(/\.\d+Z$/, '');
  const updates: string[] = ['updated_at = @updated_at'];
  const params: Record<string, unknown> = { id, updated_at: now };
  const fields = ['title', 'status', 'priority', 'type', 'parent_id', 'blocked_by', 'author', 'assigned_to', 'labels', 'body', 'model_hint'] as const;
  for (const field of fields) {
    if (data[field] !== undefined) {
      updates.push(`${field} = @${field}`);
      params[field] = data[field] ?? null;
    }
  }
  database.prepare(`UPDATE tickets SET ${updates.join(', ')} WHERE id = @id`).run(params);
  if (data.status && data.status !== existing.status) {
    database.prepare(`INSERT INTO ticket_history (ticket_id, from_status, to_status, changed_by, created_at) VALUES (?, ?, ?, ?, ?)`).run(id, existing.status, data.status, changedBy ?? null, now);
  }
  return getTicket(id);
}

export function listComments(ticketId: string): TicketComment[] {
  return openDb().prepare('SELECT * FROM ticket_comments WHERE ticket_id = ? ORDER BY created_at ASC').all(ticketId) as TicketComment[];
}

export function addComment(ticketId: string, author: string, body: string): TicketComment {
  const database = openDb();
  const now = new Date().toISOString().replace('T', ' ').replace(/\.\d+Z$/, '');
  const result = database.prepare('INSERT INTO ticket_comments (ticket_id, author, body, created_at) VALUES (?, ?, ?, ?)').run(ticketId, author, body, now);
  return database.prepare('SELECT * FROM ticket_comments WHERE id = ?').get(result.lastInsertRowid) as TicketComment;
}
