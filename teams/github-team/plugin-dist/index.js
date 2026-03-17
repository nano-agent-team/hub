import { ManifestFlow } from './manifest-flow.js';
import { GitHubClient } from './github-client.js';
import { StateManager } from './state.js';
import { Poller } from './poller.js';
let activePoller = null;
let activeClient = null;
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
        // Subscribe to PR review replies from agents.
        // Subject pattern: github.pr.reply.{owner}.{repo}.{prNumber}
        // Set via replySubject field in prToNats() payload so the agent runner
        // publishes its response to this subject instead of the default agent.{id}.reply.
        if (_nc) {
            const nc = _nc;
            const sub = nc.subscribe('github.pr.reply.>');
            (async () => {
                for await (const msg of sub) {
                    try {
                        const reply = JSON.parse(msg.string());
                        if (reply.error || !reply.result.trim())
                            continue;
                        // Parse: github.pr.reply.<owner>.<repo>.<prNumber>
                        // Use lastIndexOf to handle repo names with dots (e.g. my.api.service)
                        const prefix = 'github.pr.reply.';
                        if (!msg.subject.startsWith(prefix))
                            continue;
                        const remainder = msg.subject.slice(prefix.length); // "<owner>.<repo>.<prNumber>"
                        const lastDot = remainder.lastIndexOf('.');
                        if (lastDot === -1)
                            continue;
                        const prNumber = parseInt(remainder.slice(lastDot + 1), 10);
                        if (isNaN(prNumber))
                            continue;
                        const ownerRepo = remainder.slice(0, lastDot); // "<owner>.<repo>"
                        const ownerDot = ownerRepo.indexOf('.');
                        if (ownerDot === -1)
                            continue;
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
                    }
                    catch (err) {
                        console.error('[github-team plugin] Failed to post review comment:', err);
                    }
                }
            })().catch((err) => console.error('[github-team plugin] Reply subscriber error:', err));
        }
        console.log('[github-team plugin] Registered.');
    },
};
function startPoller(config, state, publish) {
    if (activePoller)
        activePoller.stop();
    activeClient = new GitHubClient({
        appId: config.appId,
        privateKey: config.privateKey,
        installationId: config.installationId,
    });
    const intervalMs = (config.pollingIntervalSec ?? 120) * 1000;
    activePoller = new Poller(activeClient, state, config.repos, publish, intervalMs, config.appSlug);
    activePoller.start();
}
export default plugin;
//# sourceMappingURL=index.js.map