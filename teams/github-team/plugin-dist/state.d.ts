export interface RepoState {
    prs_since: string;
    issues_since: string;
    /** Last seen commit SHA per PR — key is PR number as string */
    pr_heads?: Record<string, string>;
}
export interface PollerState {
    repos: Record<string, RepoState>;
}
export declare class StateManager {
    private filePath;
    private state;
    constructor(dataDir: string);
    private load;
    save(): void;
    getRepoCursor(repo: string): RepoState;
    updateRepoCursor(repo: string, updates: Partial<RepoState>): void;
    getPrHead(repo: string, prNumber: number): string | undefined;
    setPrHead(repo: string, prNumber: number, sha: string): void;
}
