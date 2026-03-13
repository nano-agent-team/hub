/**
 * Dev Team Plugin — registers tickets API and UI into nano-agent-team core
 *
 * Registered by core when it finds plugin.mjs in agents/dev-team/ symlink parent.
 *
 * Provides:
 *   POST   /api/tickets              — create ticket
 *   GET    /api/tickets              — list tickets
 *   GET    /api/tickets/:id          — get ticket
 *   PATCH  /api/tickets/:id          — update ticket (auto-publishes NATS events on status change)
 *   GET    /api/tickets/:id/comments — list comments
 *   POST   /api/tickets/:id/comments — add comment
 *   GET    /api/plugins              — plugin registry (used by dashboard for dynamic UI)
 *   static /plugins/dev-team/        — tickets frontend (Vue 3 bundle)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { Application, Request, Response } from 'express';
import type { NatsConnection } from 'nats';

import {
  listTickets,
  getTicket,
  createTicket,
  updateTicket,
  listComments,
  addComment,
} from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Status → NATS topic mapping (server-side pipeline automation)
const STATUS_TOPIC: Record<string, string> = {
  approved: 'topic.ticket.approved',
  spec_ready: 'topic.ticket.spec-ready',
  review: 'topic.pr.opened',
  done: 'topic.deploy.ready',
};

// SSE broadcast function (set by core via plugin registration)
let sseEmitter: ((event: string, data: unknown) => void) | undefined;

export function setSseEmitter(fn: (event: string, data: unknown) => void): void {
  sseEmitter = fn;
}

function emit(event: string, data: unknown): void {
  sseEmitter?.(event, data);
}

// ─── Plugin registration ──────────────────────────────────────────────────────

export interface TeamPlugin {
  register(
    app: Application,
    nc: NatsConnection,
    manager: { getStates(): unknown },
    opts: {
      emitSseEvent: (event: string, data: unknown) => void;
      publishNats: (subject: string, payload: string) => Promise<void>;
      dataDir?: string;
      configService?: unknown;
      reloadFeatures?: () => Promise<void>;
    }
  ): Promise<void>;
}

const plugin: TeamPlugin = {
  async register(app, _nc, _manager, opts) {
    // Wire up SSE emitter from core
    setSseEmitter(opts.emitSseEvent);

    // Use publishNats helper from core (avoids dynamic import issues)
    const publishNats = opts.publishNats;

    // ── Tickets API ──────────────────────────────────────────────────────────

    app.get('/api/tickets', (req: Request, res: Response) => {
      try {
        const { status, priority, assigned_to } = req.query as Record<string, string>;
        res.json(listTickets({ status, priority, assigned_to }));
      } catch (err) {
        res.status(500).json({ error: String(err) });
      }
    });

    app.get('/api/tickets/:id', (req: Request, res: Response) => {
      try {
        const ticket = getTicket(req.params.id);
        if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
        res.json(ticket);
      } catch (err) {
        res.status(500).json({ error: String(err) });
      }
    });

    app.post('/api/tickets', (req: Request, res: Response) => {
      try {
        const { title } = req.body as { title?: string };
        if (!title) return res.status(400).json({ error: '"title" required' });
        const ticket = createTicket(req.body);
        emit('ticket:created', ticket);
        res.status(201).json(ticket);
      } catch (err) {
        res.status(500).json({ error: String(err) });
      }
    });

    app.patch('/api/tickets/:id', (req: Request, res: Response) => {
      try {
        const { id } = req.params;
        const existing = getTicket(id);
        if (!existing) return res.status(404).json({ error: 'Ticket not found' });

        const changedBy = (req.body.changed_by as string) ?? 'api';
        const updated = updateTicket(id, req.body, changedBy);
        if (!updated) return res.status(404).json({ error: 'Ticket not found' });

        emit('ticket:updated', updated);

        // Auto-publish NATS pipeline event on status change
        const newStatus = req.body.status as string | undefined;
        if (newStatus && newStatus !== existing.status) {
          const topic = STATUS_TOPIC[newStatus];
          if (topic) {
            const payload = JSON.stringify({ ticket_id: id, status: newStatus, ticket: updated });
            void publishNats(topic, payload).catch((e) =>
              console.error(`[dev-team plugin] Failed to publish ${topic}:`, e),
            );
            console.log(`[dev-team plugin] Published NATS: ${topic} for ${id}`);
          }
          if (newStatus === 'done') emit('ticket:done', { id, ticket: updated });
        }

        res.json(updated);
      } catch (err) {
        res.status(500).json({ error: String(err) });
      }
    });

    app.get('/api/tickets/:id/comments', (req: Request, res: Response) => {
      try {
        if (!getTicket(req.params.id)) return res.status(404).json({ error: 'Ticket not found' });
        res.json(listComments(req.params.id));
      } catch (err) {
        res.status(500).json({ error: String(err) });
      }
    });

    app.post('/api/tickets/:id/comments', (req: Request, res: Response) => {
      try {
        if (!getTicket(req.params.id)) return res.status(404).json({ error: 'Ticket not found' });
        const { body, author } = req.body as { body?: string; author?: string };
        if (!body) return res.status(400).json({ error: '"body" required' });
        const comment = addComment(req.params.id, author ?? 'api', body);
        emit('comment:added', { ticket_id: req.params.id, comment });
        res.status(201).json(comment);
      } catch (err) {
        res.status(500).json({ error: String(err) });
      }
    });

    // ── Plugin registry endpoint (used by core dashboard) ────────────────────

    // Register this plugin in the global plugin list.
    // install.sh copies frontend/dist → agents/frontend-dist/
    // __dirname is agents/plugin-dist/ → ../frontend-dist = agents/frontend-dist/
    // Module Federation remote entry: assets/remoteEntry.js (Vite default)
    const frontendDist = path.join(__dirname, '..', 'frontend-dist');
    const hasFrontend = fs.existsSync(path.join(frontendDist, 'assets', 'remoteEntry.js'));

    app.get('/api/plugins', (_req: Request, res: Response) => {
      res.json([
        {
          id: 'dev-team',
          name: 'Dev Team',
          // uiEntry points to the Module Federation remoteEntry.js
          // Core dashboard vite.config.ts maps devTeamPlugin → this URL
          uiEntry: hasFrontend ? '/plugins/dev-team/assets/remoteEntry.js' : null,
        },
      ]);
    });

    // ── Serve plugin frontend (if built) ──────────────────────────────────────

    if (hasFrontend) {
      const express = (await import('express')).default;
      app.use('/plugins/dev-team', express.static(frontendDist));
      console.log('[dev-team plugin] Serving federation remote from', frontendDist);
    } else {
      console.log('[dev-team plugin] Frontend not built — run: cd frontend && npm run build && ./install.sh');
    }

    console.log('[dev-team plugin] Tickets API registered (/api/tickets)');
  },
};

export default plugin;
