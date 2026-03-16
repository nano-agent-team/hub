import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { GitHubClient } from './github-client.js';
export class ManifestFlow {
    dataDir;
    configPath;
    constructor(dataDir) {
        this.dataDir = dataDir;
        this.configPath = path.join(dataDir, 'teams', 'github-team', 'app-config.json');
    }
    getInstanceId() {
        const idPath = path.join(this.dataDir, 'instance-id');
        try {
            return fs.readFileSync(idPath, 'utf-8').trim();
        }
        catch {
            const id = crypto.randomBytes(3).toString('hex'); // 6 chars, e.g. "a1b2c3"
            fs.mkdirSync(path.dirname(idPath), { recursive: true });
            fs.writeFileSync(idPath, id, 'utf-8');
            return id;
        }
    }
    loadConfig() {
        try {
            const raw = fs.readFileSync(this.configPath, 'utf-8');
            return JSON.parse(raw);
        }
        catch {
            return null;
        }
    }
    saveConfig(config) {
        fs.mkdirSync(path.dirname(this.configPath), { recursive: true });
        fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2), { mode: 0o600 });
    }
    registerRoutes(app, onReady) {
        // Step 1b: Receive form, build manifest and auto-submit to GitHub
        app.post('/api/github-team/setup/manifest', (req, res) => {
            const target = req.body?.target === 'org' ? 'org' : 'personal';
            const org = req.body?.org?.trim() ?? '';
            const proto = req.headers['x-forwarded-proto'] ?? req.protocol ?? 'http';
            const host = req.headers['x-forwarded-host'] ?? req.headers.host ?? 'localhost:3001';
            const baseUrl = `${proto}://${host}`;
            const callbackUrl = new URL(`${baseUrl}/api/github-team/setup/callback`);
            callbackUrl.searchParams.set('target', target);
            if (target === 'org' && org)
                callbackUrl.searchParams.set('org', org);
            const manifest = {
                name: `NATE GitHub Team [${this.getInstanceId()}]`,
                url: baseUrl,
                redirect_url: callbackUrl.toString(),
                setup_url: `${baseUrl}/api/github-team/setup/installed`,
                setup_on_update: false,
                public: false,
                hook_attributes: { url: 'https://example.com/nate-placeholder', active: false },
                default_permissions: {
                    pull_requests: 'write',
                    issues: 'write',
                    contents: 'read',
                    metadata: 'read',
                },
                default_events: ['pull_request', 'issues', 'issue_comment'],
            };
            const ghAction = target === 'org' && org
                ? `https://github.com/organizations/${org}/settings/apps/new`
                : 'https://github.com/settings/apps/new';
            res.send(`<!DOCTYPE html>
<html>
<head><title>Přesměrování na GitHub...</title></head>
<body>
  <p>Přesměrování na GitHub...</p>
  <form id="f" action="${ghAction}" method="post">
    <input type="hidden" name="manifest" value="${JSON.stringify(manifest).replace(/"/g, '&quot;')}">
  </form>
  <script>document.getElementById('f').submit();</script>
</body>
</html>`);
        });
        // Step 1c: Existing app — save config and redirect to installation
        app.post('/api/github-team/setup/existing', (req, res) => {
            const { slug, appId, pem } = req.body;
            if (!slug || !appId || !pem) {
                res.status(400).json({ error: 'Missing slug, appId or pem' });
                return;
            }
            const config = { appId, appSlug: slug, privateKey: pem };
            this.saveConfig(config);
            const proto = req.headers['x-forwarded-proto'] ?? req.protocol ?? 'http';
            const host = req.headers['x-forwarded-host'] ?? req.headers.host ?? 'localhost:3001';
            const baseUrl = `${proto}://${host}`;
            const installUrl = `https://github.com/apps/${slug}/installations/new?state=${encodeURIComponent(baseUrl)}`;
            res.json({ installUrl });
        });
        // Step 2: GitHub redirects back with ?code= after user confirms App creation
        app.get('/api/github-team/setup/callback', (req, res) => {
            const code = req.query['code'];
            const target = req.query['target'] === 'org' ? 'org' : 'personal';
            const org = req.query['org'] ?? '';
            if (!code) {
                res.status(400).send('Missing code parameter from GitHub.');
                return;
            }
            GitHubClient.exchangeManifestCode(code)
                .then((appData) => {
                const config = {
                    appId: String(appData.id),
                    appSlug: appData.slug,
                    privateKey: appData.pem,
                };
                this.saveConfig(config);
                console.log(`[github-team] App created: ${appData.name} (id=${appData.id}), target=${target}`);
                // For org: show intermediate page explaining user must install on org
                if (target === 'org' && org) {
                    const installUrl = `https://github.com/apps/${appData.slug}/installations/new`;
                    res.send(`<!DOCTYPE html>
<html lang="cs">
<head>
<meta charset="UTF-8">
<title>Instalace na organizaci</title>
<style>
  body { font-family: system-ui, sans-serif; max-width: 480px; margin: 80px auto; padding: 0 20px; background: #0d1117; color: #e6edf3; }
  h2 { margin-bottom: 8px; }
  p { color: #8b949e; margin-bottom: 20px; }
  .info { background: #1c2433; border: 1px solid #388bfd; border-radius: 8px; padding: 16px; margin-bottom: 20px; font-size: 14px; }
  a.btn { display: block; padding: 10px; background: #238636; border-radius: 6px; color: #fff; text-align: center; text-decoration: none; font-size: 15px; }
  a.btn:hover { background: #2ea043; }
</style>
</head>
<body>
<h2>GitHub App vytvořena ✓</h2>
<p>Teď ji nainstaluj na organizaci <strong>${org}</strong>.</p>
<div class="info">
  Na další stránce GitHub vyber organizaci <strong>${org}</strong> z rozbalovacího menu a zvol konkrétní repozitáře.
</div>
<a class="btn" href="${installUrl}">Instalovat na organizaci ${org} →</a>
</body>
</html>`);
                }
                else {
                    // Personal: redirect directly to install page
                    res.redirect(`https://github.com/apps/${appData.slug}/installations/new`);
                }
            })
                .catch((err) => {
                console.error('[github-team] Manifest exchange failed:', err);
                res.status(500).send(`Setup failed: ${String(err)}`);
            });
        });
        // Step 3: GitHub redirects here with ?installation_id= after user installs App on repos
        app.get('/api/github-team/setup/installed', (req, res) => {
            const installationId = req.query['installation_id'];
            if (!installationId) {
                res.status(400).send('Missing installation_id from GitHub.');
                return;
            }
            const config = this.loadConfig();
            if (!config) {
                res.status(400).send('App not configured yet. Please run setup first.');
                return;
            }
            const client = new GitHubClient({ ...config, installationId });
            client
                .get('/installation/repositories')
                .then((data) => {
                const repos = data.repositories.map((r) => r.full_name);
                const updated = { ...config, installationId, repos };
                this.saveConfig(updated);
                console.log(`[github-team] Installation ${installationId} connected. Repos: ${repos.join(', ')}`);
                onReady(updated);
                res.send(`<!DOCTYPE html>
<html>
<head><title>NATE GitHub Team Connected</title></head>
<body>
  <h2>✅ NATE GitHub Team connected!</h2>
  <p>Monitoring <strong>${repos.length}</strong> repo(s):</p>
  <ul>${repos.map((r) => `<li>${r}</li>`).join('')}</ul>
  <p><a href="/">Back to NATE</a></p>
</body>
</html>`);
            })
                .catch((err) => {
                console.error('[github-team] Failed to fetch repos:', err);
                res.status(500).send(`Failed to fetch repositories: ${String(err)}`);
            });
        });
        // Status endpoint — used by UI to show connection state
        app.get('/api/github-team/setup/status', (_req, res) => {
            const config = this.loadConfig();
            if (!config?.installationId) {
                res.json({ connected: false });
                return;
            }
            res.json({
                connected: true,
                appSlug: config.appSlug,
                installationId: config.installationId,
                repos: config.repos ?? [],
                pollingIntervalSec: config.pollingIntervalSec ?? 120,
            });
        });
    }
}
//# sourceMappingURL=manifest-flow.js.map