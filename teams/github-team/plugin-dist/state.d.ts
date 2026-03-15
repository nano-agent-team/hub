export interface RepoState {
    prs_since: string;
    issues_since: string;
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
}
