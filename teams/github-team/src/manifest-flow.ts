import type { Application, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
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
    this.configPath = path.join(dataDir, 'teams', 'github-team', 'app-config.json');
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
    // Step 1: Auto-submit form to GitHub with App manifest
    app.get('/api/github-team/setup/start', (_req: Request, res: Response) => {
      const manifest = {
        name: 'NATE GitHub Team',
        url: 'http://localhost:3001',
        redirect_url: 'http://localhost:3001/api/github-team/setup/callback',
        setup_url: 'http://localhost:3001/api/github-team/setup/installed',
        setup_on_update: false,
        public: false,
        default_permissions: {
          pull_requests: 'write',
          issues: 'write',
          contents: 'read',
          metadata: 'read',
        },
        default_events: ['pull_request', 'issues', 'issue_comment'],
      };

      // Auto-submitting form — browser lands on GitHub confirmation page
      res.send(`<!DOCTYPE html>
<html>
<head><title>Setting up NATE GitHub Team...</title></head>
<body>
  <p>Redirecting to GitHub...</p>
  <form id="f" action="https://github.com/settings/apps/new" method="post">
    <input type="hidden" name="manifest" value="${JSON.stringify(manifest).replace(/"/g, '&quot;')}">
  </form>
  <script>document.getElementById('f').submit();</script>
</body>
</html>`);
    });

    // Step 2: GitHub redirects back with ?code= after user confirms App creation
    app.get('/api/github-team/setup/callback', (req: Request, res: Response) => {
      const code = req.query['code'] as string | undefined;
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
          console.log(`[github-team] App created: ${appData.name} (id=${appData.id})`);
          // Redirect user to install the App on their repos
          res.redirect(`https://github.com/apps/${appData.slug}/installations/new`);
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
