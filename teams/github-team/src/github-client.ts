import { createSign } from 'crypto';

export interface AppConfig {
  appId: string;
  privateKey: string;
  installationId: string;
}

interface InstallationToken {
  token: string;
  expiresAt: number; // ms timestamp
}

export class GitHubClient {
  private tokenCache: InstallationToken | null = null;

  constructor(private config: AppConfig) {}

  private signJWT(): string {
    const now = Math.floor(Date.now() / 1000);
    const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(
      JSON.stringify({ iat: now - 60, exp: now + 600, iss: this.config.appId }),
    ).toString('base64url');
    const signing = `${header}.${payload}`;
    const sign = createSign('RSA-SHA256');
    sign.update(signing);
    const signature = sign.sign(this.config.privateKey, 'base64url');
    return `${signing}.${signature}`;
  }

  async getInstallationToken(): Promise<string> {
    const now = Date.now();
    if (this.tokenCache && this.tokenCache.expiresAt > now + 60_000) {
      return this.tokenCache.token;
    }
    const jwt = this.signJWT();
    const res = await fetch(
      `https://api.github.com/app/installations/${this.config.installationId}/access_tokens`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${jwt}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      },
    );
    if (!res.ok) throw new Error(`Failed to get installation token: ${await res.text()}`);
    const data = (await res.json()) as { token: string; expires_at: string };
    this.tokenCache = { token: data.token, expiresAt: new Date(data.expires_at).getTime() };
    return data.token;
  }

  async get<T>(path: string): Promise<T> {
    const token = await this.getInstallationToken();
    const res = await fetch(`https://api.github.com${path}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });
    if (!res.ok) throw new Error(`GitHub API GET ${path} failed: ${res.status}`);
    return res.json() as Promise<T>;
  }

  async put<T>(path: string, body: unknown): Promise<T> {
    const token = await this.getInstallationToken();
    const res = await fetch(`https://api.github.com${path}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`GitHub API PUT ${path} failed: ${res.status} ${await res.text()}`);
    return res.json() as Promise<T>;
  }

  async post<T>(path: string, body: unknown): Promise<T> {
    const token = await this.getInstallationToken();
    const res = await fetch(`https://api.github.com${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`GitHub API POST ${path} failed: ${res.status}`);
    return res.json() as Promise<T>;
  }

  static async exchangeManifestCode(code: string): Promise<{
    id: number;
    slug: string;
    name: string;
    pem: string;
    webhook_secret: string;
  }> {
    const res = await fetch(`https://api.github.com/app-manifests/${code}/conversions`, {
      method: 'POST',
      headers: {
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });
    if (!res.ok) throw new Error(`Manifest code exchange failed: ${await res.text()}`);
    return res.json() as Promise<{
      id: number;
      slug: string;
      name: string;
      pem: string;
      webhook_secret: string;
    }>;
  }
}
