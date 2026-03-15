import { ManifestFlow } from './manifest-flow.js';
import { GitHubClient } from './github-client.js';
import { StateManager } from './state.js';
import { Poller } from './poller.js';
let activePoller = null;
const plugin = {
    async register(app, _nc, _manager, opts) {
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
        }
        else {
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
function startPoller(config, state, publish) {
    if (activePoller)
        activePoller.stop();
    const client = new GitHubClient({
        appId: config.appId,
        privateKey: config.privateKey,
        installationId: config.installationId,
    });
    const intervalMs = (config.pollingIntervalSec ?? 120) * 1000;
    activePoller = new Poller(client, state, config.repos, publish, intervalMs);
    activePoller.start();
}
export default plugin;
//# sourceMappingURL=index.js.map