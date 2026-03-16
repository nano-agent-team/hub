import type { Application } from 'express';
export interface AppConfig {
    appId: string;
    appSlug: string;
    privateKey: string;
    installationId?: string;
    repos?: string[];
    pollingIntervalSec?: number;
}
export declare class ManifestFlow {
    private dataDir;
    private configPath;
    constructor(dataDir: string);
    private getInstanceId;
    loadConfig(): AppConfig | null;
    saveConfig(config: AppConfig): void;
    registerRoutes(app: Application, onReady: (config: AppConfig) => void): void;
}
