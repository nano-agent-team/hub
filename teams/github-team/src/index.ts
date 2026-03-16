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
 */
import type { Application } from 'express';
import { ManifestFlow, type AppConfig } from './manifest-flow.js';
import { GitHubClient } from './github-client.js';
import { StateManager } from './state.js';
import { Poller } from './poller.js';

type Publisher = (subject: string, payload: string) => Promise<void>;

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

    console.log('[github-team plugin] Registered.');
  },
};

function startPoller(config: AppConfig, state: StateManager, publish: Publisher): void {
  if (activePoller) activePoller.stop();

  const client = new GitHubClient({
    appId: config.appId,
    privateKey: config.privateKey,
    installationId: config.installationId!,
  });

  const intervalMs = (config.pollingIntervalSec ?? 120) * 1000;
  activePoller = new Poller(client, state, config.repos!, publish, intervalMs, config.appSlug);
  activePoller.start();
}

export default plugin;
