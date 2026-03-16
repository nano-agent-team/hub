import type { Application, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { GitHubClient } from './github-client.js';

export interface AppConfig {
  appId: string;
  appSlug: string;
  privateKey: string;
  installationId?: string;
  repos?: string[];
  pollingIntervalSec?: number;
}

export class ManifestFlow {
  private configPath: string;

  constructor(private dataDir: string) {
    this.configPath = path.join(dataDir, 'teams', 'github-team', 'config', 'app-config.json');
  }

  private getInstanceId(): string {
    const idPath = path.join(this.dataDir, 'instance-id');
    try {
      return fs.readFileSync(idPath, 'utf-8').trim();
    } catch {
      const id = crypto.randomBytes(3).toString('hex'); // 6 chars, e.g. "a1b2c3"
      fs.mkdirSync(path.dirname(idPath), { recursive: true });
      fs.writeFileSync(idPath, id, 'utf-8');
      return id;
    }
  }

  loadConfig(): AppConfig | null {
    try {
      const raw = fs.readFileSync(this.configPath, 'utf-8');
      return JSON.parse(raw) as AppConfig;
    } catch {
      return null;
    }
  }

  saveConfig(config: AppConfig): void {
    fs.mkdirSync(path.dirname(this.configPath), { recursive: true });
    fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2), { mode: 0o600 });
  }

  registerRoutes(app: Application, onReady: (config: AppConfig) => void): void {
    // Step 1b: Receive form, build manifest and auto-submit to GitHub
    app.post('/api/github-team/setup/manifest', (req: Request, res: Response) => {
      const target = (req.body?.target as string) === 'org' ? 'org' : 'personal';
      const org = (req.body?.org as string | undefined)?.trim() ?? '';
      const proto = req.headers['x-forwarded-proto'] ?? req.protocol ?? 'http';
      const host = req.headers['x-forwarded-host'] ?? req.headers.host ?? 'localhost:3001';
      const baseUrl = `${proto}://${host}`;
      const callbackUrl = new URL(`${baseUrl}/api/github-team/setup/callback`);
      callbackUrl.searchParams.set('target', target);
      if (target === 'org' && org) callbackUrl.searchParams.set('org', org);

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

    // Step 2: GitHub redirects back with ?code= after user confirms App creation
    app.get('/api/github-team/setup/callback', (req: Request, res: Response) => {
      const code = req.query['code'] as string | undefined;
      const target = (req.query['target'] as string) === 'org' ? 'org' : 'personal';
      const org = (req.query['org'] as string | undefined) ?? '';
      if (!code) {
        res.status(400).send('Missing code parameter from GitHub.');
        return;
      }

      GitHubClient.exchangeManifestCode(code)
        .then((appData) => {
          const config: AppConfig = {
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
          } else {
            // Personal: redirect directly to install page
            res.redirect(`https://github.com/apps/${appData.slug}/installations/new`);
          }
        })
        .catch((err: unknown) => {
          console.error('[github-team] Manifest exchange failed:', err);
          res.status(500).send(`Setup failed: ${String(err)}`);
        });
    });

    // Step 3: GitHub redirects here with ?installation_id= after user installs App on repos
    app.get('/api/github-team/setup/installed', (req: Request, res: Response) => {
      const installationId = req.query['installation_id'] as string | undefined;
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
        .get<{ repositories: Array<{ full_name: string }> }>('/installation/repositories')
        .then((data) => {
          const repos = data.repositories.map((r) => r.full_name);
          const updated: AppConfig = { ...config, installationId, repos };
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
        .catch((err: unknown) => {
          console.error('[github-team] Failed to fetch repos:', err);
          res.status(500).send(`Failed to fetch repositories: ${String(err)}`);
        });
    });

    // Status endpoint — used by UI to show connection state
    app.get('/api/github-team/setup/status', (_req: Request, res: Response) => {
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
