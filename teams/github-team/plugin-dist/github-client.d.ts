export interface AppConfig {
    appId: string;
    privateKey: string;
    installationId: string;
}
export declare class GitHubClient {
    private config;
    private tokenCache;
    constructor(config: AppConfig);
    private signJWT;
    getInstallationToken(): Promise<string>;
    get<T>(path: string): Promise<T>;
    put<T>(path: string, body: unknown): Promise<T>;
    post<T>(path: string, body: unknown): Promise<T>;
    static exchangeManifestCode(code: string): Promise<{
        id: number;
        slug: string;
        name: string;
        pem: string;
        webhook_secret: string;
    }>;
}
