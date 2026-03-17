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
import { ManifestFlow, type AppConfig } from './manifest-flow.js';
import { GitHubClient } from './github-client.js';
import { StateManager } from './state.js';
import { Poller } from './poller.js';

type Publisher = (subject: string, payload: string) => Promise<void>;

interface NatsMsg {
  subject: string;
  string(): string;
}

interface NatsSubscription extends AsyncIterable<NatsMsg> {
  unsubscribe(): void;
}

interface NatsConnection {
  subscribe(subject: string): NatsSubscription;
}

interface PluginOpts {
  emitSseEvent: (event: string, data: unknown) => void;
  publishNats: Publisher;
  dataDir: string;
  registerPlugin?: (info: {
    id: string;
    name: string;
    uiEntry: string | null;
    routes: Array<{ path: string; component: string; nav?: { label: string; icon: string } }>;
  }) => void;
}

let activePoller: Poller | null = null;
let activeClient: GitHubClient | null = null;

const plugin = {
  async register(
    app: Application,
    _nc: unknown,
    _manager: unknown,
    opts: PluginOpts,
  ): Promise<void> {
    const { publishNats, dataDir } = opts;

    const flow = new ManifestFlow(dataDir);
    const state = new StateManager(dataDir);

    flow.registerRoutes(app, (config) => {
      startPoller(config, state, publishNats);
    });

    // Resume poller if already configured from a previous run
    const existing = flow.loadConfig();
    if (existing?.installationId && existing.repos?.length) {
      startPoller(existing, state, publishNats);
    } else {
      console.log('[github-team plugin] Not connected. Visit /api/github-team/setup/start');
    }

    if (opts.registerPlugin) {
      opts.registerPlugin({
        id: 'github-team',
        name: 'GitHub Team',
        uiEntry: null,
        routes: [],
      });
    }

    // Subscribe to PR review replies from agents.
    // Subject pattern: github.pr.reply.{owner}.{repo}.{prNumber}
    // Set via replySubject field in prToNats() payload so the agent runner
    // publishes its response to this subject instead of the default agent.{id}.reply.
    if (_nc) {
      const nc = _nc as NatsConnection;
      const sub = nc.subscribe('github.pr.reply.>');
      (async () => {
        for await (const msg of sub) {
          try {
            const reply = JSON.parse(msg.string()) as { agentId: string; result: string; error?: boolean };
            if (reply.error || !reply.result.trim()) continue;

            // Parse: github.pr.reply.<owner>.<repo>.<prNumber>
            // Use lastIndexOf to handle repo names with dots (e.g. my.api.service)
            const prefix = 'github.pr.reply.';
            if (!msg.subject.startsWith(prefix)) continue;
            const remainder = msg.subject.slice(prefix.length); // "<owner>.<repo>.<prNumber>"
            const lastDot = remainder.lastIndexOf('.');
            if (lastDot === -1) continue;
            const prNumber = parseInt(remainder.slice(lastDot + 1), 10);
            if (isNaN(prNumber)) continue;
            const ownerRepo = remainder.slice(0, lastDot); // "<owner>.<repo>"
            const ownerDot = ownerRepo.indexOf('.');
            if (ownerDot === -1) continue;
            const owner = ownerRepo.slice(0, ownerDot);
            const repoName = ownerRepo.slice(ownerDot + 1);

            if (!activeClient) {
              console.warn('[github-team plugin] Received PR reply but no active client — skipping');
              continue;
            }

            await activeClient.post(`/repos/${owner}/${repoName}/issues/${prNumber}/comments`, {
              body: reply.result,
            });
            console.log(`[github-team plugin] Posted review comment on ${owner}/${repoName}#${prNumber}`);
          } catch (err) {
            console.error('[github-team plugin] Failed to post review comment:', err);
          }
        }
      })().catch((err) => console.error('[github-team plugin] Reply subscriber error:', err));
    }

    console.log('[github-team plugin] Registered.');
  },
};

function startPoller(config: AppConfig, state: StateManager, publish: Publisher): void {
  if (activePoller) activePoller.stop();

  activeClient = new GitHubClient({
    appId: config.appId,
    privateKey: config.privateKey,
    installationId: config.installationId!,
  });

  const intervalMs = (config.pollingIntervalSec ?? 120) * 1000;
  activePoller = new Poller(activeClient, state, config.repos!, publish, intervalMs, config.appSlug);
  activePoller.start();
}

export default plugin;
