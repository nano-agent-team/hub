import type { GitHubClient } from './github-client.js';
import type { StateManager } from './state.js';
type Publisher = (topic: string, payload: string) => Promise<void>;
export declare class Poller {
    private client;
    private state;
    private repos;
    private publish;
    private intervalMs;
    private timer;
    private running;
    constructor(client: GitHubClient, state: StateManager, repos: string[], publish: Publisher, intervalMs: number);
    start(): void;
    stop(): void;
    private poll;
    private pollRepo;
}
export {};
