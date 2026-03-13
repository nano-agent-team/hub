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
import type { Application } from 'express';
import type { NatsConnection } from 'nats';
export declare function setSseEmitter(fn: (event: string, data: unknown) => void): void;
export interface TeamPlugin {
    register(app: Application, nc: NatsConnection, manager: {
        getStates(): unknown;
    }, opts: {
        emitSseEvent: (event: string, data: unknown) => void;
        publishNats: (subject: string, payload: string) => Promise<void>;
    }): Promise<void>;
}
declare const plugin: TeamPlugin;
export default plugin;
