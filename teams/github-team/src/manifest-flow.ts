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
    // Step 1a: Show account-type selection form
    app.get('/api/github-team/setup/start', (_req: Request, res: Response) => {
      res.send(`<!DOCTYPE html>
<html lang="cs">
<head>
<meta charset="UTF-8">
<title>Propojit GitHub</title>
<style>
  body { font-family: system-ui, sans-serif; max-width: 480px; margin: 80px auto; padding: 0 20px; background: #0d1117; color: #e6edf3; }
  h2 { margin-bottom: 8px; }
  p { color: #8b949e; margin-bottom: 24px; }
  .card { background: #161b22; border: 1px solid #30363d; border-radius: 10px; padding: 20px; margin-bottom: 12px; cursor: pointer; display: flex; align-items: center; gap: 14px; }
  .card:has(input:checked) { border-color: #388bfd; background: #1c2433; }
  .card input[type=radio] { width: 18px; height: 18px; accent-color: #388bfd; flex-shrink: 0; }
  .card-text strong { display: block; margin-bottom: 2px; }
  .card-text span { font-size: 13px; color: #8b949e; }
  .field { margin-top: 12px; display: none; }
  .field label { display: block; font-size: 13px; color: #8b949e; margin-bottom: 4px; }
  input[type=text], textarea { width: 100%; box-sizing: border-box; padding: 8px 12px; background: #0d1117; border: 1px solid #30363d; border-radius: 6px; color: #e6edf3; font-size: 14px; }
  textarea { font-family: monospace; font-size: 12px; resize: vertical; }
  input[type=text]:focus, textarea:focus { outline: none; border-color: #388bfd; }
  .hint { font-size: 12px; color: #8b949e; margin-top: 4px; }
  .hint a { color: #58a6ff; }
  button { width: 100%; padding: 10px; background: #238636; border: none; border-radius: 6px; color: #fff; font-size: 15px; cursor: pointer; margin-top: 12px; }
  button:hover { background: #2ea043; }
  hr { border: none; border-top: 1px solid #30363d; margin: 20px 0; }
</style>
</head>
<body>
<h2>Propojit GitHub</h2>

<p>Máš už vytvořenou GitHub App pro NATE?</p>
<label class="card">
  <input type="radio" name="mode" value="existing" onchange="toggleMode('existing')">
  <div class="card-text">
    <strong>Ano, mám existující app</strong>
    <span>Použiju již vytvořenou GitHub App</span>
  </div>
</label>
<label class="card">
  <input type="radio" name="mode" value="new" checked onchange="toggleMode('new')">
  <div class="card-text">
    <strong>Ne, vytvořit novou</strong>
    <span>GitHub App se vytvoří automaticky</span>
  </div>
</label>

<div id="existing-form" style="display:none">
  <hr>
  <p style="margin-bottom:12px">Otevři svou app na GitHubu, zkopíruj App ID a vygeneruj nový Private Key.</p>
  <div class="field" style="display:block">
    <label>App slug <span style="color:#8b949e">(z URL: github.com/apps/<strong>tento-text</strong>)</span></label>
    <input type="text" id="slug-input" placeholder="nate-github-team" autocomplete="off">
    <div class="hint"><a href="https://github.com/settings/apps" target="_blank">Zobrazit moje GitHub Apps →</a></div>
  </div>
  <div class="field" style="display:block; margin-top:12px">
    <label>App ID</label>
    <input type="text" id="appid-input" placeholder="123456" autocomplete="off">
  </div>
  <div class="field" style="display:block; margin-top:12px">
    <label>Private Key (PEM)</label>
    <textarea id="pem-input" rows="6" placeholder="-----BEGIN RSA PRIVATE KEY-----&#10;...&#10;-----END RSA PRIVATE KEY-----"></textarea>
  </div>
  <button onclick="submitExisting()">Připojit →</button>
</div>

<div id="new-form">
  <hr>
  <form action="/api/github-team/setup/manifest" method="post">
    <label class="card">
      <input type="radio" name="target" value="personal" checked onchange="toggleOrg(this)">
      <div class="card-text">
        <strong>Osobní účet</strong>
        <span>github.com/váš-username</span>
      </div>
    </label>
    <label class="card">
      <input type="radio" name="target" value="org" onchange="toggleOrg(this)">
      <div class="card-text">
        <strong>Organizace</strong>
        <span>github.com/název-organizace</span>
      </div>
    </label>
    <div id="org-field" class="field">
      <input id="org-input" type="text" name="org" placeholder="Název organizace (např. my-company)" autocomplete="off">
    </div>
    <button type="submit">Pokračovat na GitHub →</button>
  </form>
</div>

<script>
function toggleMode(mode) {
  document.getElementById('existing-form').style.display = mode === 'existing' ? 'block' : 'none';
  document.getElementById('new-form').style.display = mode === 'new' ? 'block' : 'none';
}
function toggleOrg(el) {
  document.getElementById('org-field').style.display = el.value === 'org' ? 'block' : 'none';
  document.getElementById('org-input').required = el.value === 'org';
}
function submitExisting() {
  const slug = document.getElementById('slug-input').value.trim();
  const appId = document.getElementById('appid-input').value.trim();
  const pem = document.getElementById('pem-input').value.trim();
  if (!slug || !appId || !pem) { alert('Vyplň všechna pole.'); return; }
  fetch('/api/github-team/setup/existing', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slug, appId, pem }),
  }).then(r => r.json()).then(d => {
    if (d.installUrl) window.location.href = d.installUrl;
    else alert('Chyba: ' + (d.error ?? 'Neznámá chyba'));
  }).catch(e => alert('Chyba: ' + e));
}
</script>
</body>
</html>`);
    });

    // Step 1c: Existing app — save config and redirect to installation
    app.post('/api/github-team/setup/existing', (req: Request, res: Response) => {
      const { slug, appId, pem } = req.body as { slug?: string; appId?: string; pem?: string };
      if (!slug || !appId || !pem) {
        res.status(400).json({ error: 'Missing slug, appId or pem' });
        return;
      }
      const config: AppConfig = { appId, appSlug: slug, privateKey: pem };
      this.saveConfig(config);
      const proto = req.headers['x-forwarded-proto'] ?? req.protocol ?? 'http';
      const host = req.headers['x-forwarded-host'] ?? req.headers.host ?? 'localhost:3001';
      const baseUrl = `${proto}://${host}`;
      const installUrl = `https://github.com/apps/${slug}/installations/new?state=${encodeURIComponent(baseUrl)}`;
      res.json({ installUrl });
    });

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
        name: 'NATE GitHub Team',
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

      res.send(`<!DOCTYPE html>
<html>
<head><title>Přesměrování na GitHub...</title></head>
<body>
  <p>Přesměrování na GitHub...</p>
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
