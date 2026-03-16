/**
 * GitHub Team Plugin — integrates GitHub with nano-agent-team via polling
 *
 * Setup flow (one-time, per user):
 *   GET /api/github-team/setup/start     → GitHub App manifest flow
 *   GET /api/github-team/setup/callback  → exchange code for App credentials
 *   GET /api/github-team/setup/installed → receive installation_id, start poller
 *
 * Status:
 *   GET /api/github-team/setup/status    → connection state + repos
 *
 * Publishes NATS topics:
 *   topic.github.pr.opened
 *   topic.github.pr.synchronized
 *   topic.github.pr.discussion
 *   topic.github.issue.opened
 *   topic.github.issue.comment
 *
 * Subscribes to:
 *   github.pr.reply.{owner}.{repo}.{prNumber} — agent review replies → posts as GitHub comment
 */
import type { Application } from 'express';
type Publisher = (subject: string, payload: string) => Promise<void>;
interface PluginOpts {
    emitSseEvent: (event: string, data: unknown) => void;
    publishNats: Publisher;
    dataDir: string;
    registerPlugin?: (info: {
        id: string;
        name: string;
        uiEntry: string | null;
        routes: Array<{
            path: string;
            component: string;
            nav?: {
                label: string;
                icon: string;
            };
        }>;
    }) => void;
}
declare const plugin: {
    register(app: Application, _nc: unknown, _manager: unknown, opts: PluginOpts): Promise<void>;
};
export default plugin;
