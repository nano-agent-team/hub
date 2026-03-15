import { createSign } from 'crypto';
export class GitHubClient {
    config;
    tokenCache = null;
    constructor(config) {
        this.config = config;
    }
    signJWT() {
        const now = Math.floor(Date.now() / 1000);
        const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
        const payload = Buffer.from(JSON.stringify({ iat: now - 60, exp: now + 600, iss: this.config.appId })).toString('base64url');
        const signing = `${header}.${payload}`;
        const sign = createSign('RSA-SHA256');
        sign.update(signing);
        const signature = sign.sign(this.config.privateKey, 'base64url');
        return `${signing}.${signature}`;
    }
    async getInstallationToken() {
        const now = Date.now();
        if (this.tokenCache && this.tokenCache.expiresAt > now + 60_000) {
            return this.tokenCache.token;
        }
        const jwt = this.signJWT();
        const res = await fetch(`https://api.github.com/app/installations/${this.config.installationId}/access_tokens`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${jwt}`,
                Accept: 'application/vnd.github+json',
                'X-GitHub-Api-Version': '2022-11-28',
            },
        });
        if (!res.ok)
            throw new Error(`Failed to get installation token: ${await res.text()}`);
        const data = (await res.json());
        this.tokenCache = { token: data.token, expiresAt: new Date(data.expires_at).getTime() };
        return data.token;
    }
    async get(path) {
        const token = await this.getInstallationToken();
        const res = await fetch(`https://api.github.com${path}`, {
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: 'application/vnd.github+json',
                'X-GitHub-Api-Version': '2022-11-28',
            },
        });
        if (!res.ok)
            throw new Error(`GitHub API GET ${path} failed: ${res.status}`);
        return res.json();
    }
    async post(path, body) {
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
        if (!res.ok)
            throw new Error(`GitHub API POST ${path} failed: ${res.status}`);
        return res.json();
    }
    static async exchangeManifestCode(code) {
        const res = await fetch(`https://api.github.com/app-manifests/${code}/conversions`, {
            method: 'POST',
            headers: {
                Accept: 'application/vnd.github+json',
                'X-GitHub-Api-Version': '2022-11-28',
            },
        });
        if (!res.ok)
            throw new Error(`Manifest code exchange failed: ${await res.text()}`);
        return res.json();
    }
}
//# sourceMappingURL=github-client.js.map