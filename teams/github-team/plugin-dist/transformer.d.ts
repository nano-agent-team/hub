export interface NatsEvent {
    topic: string;
    payload: Record<string, unknown>;
}
export interface GitHubPR {
    number: number;
    title: string;
    body: string;
    state: string;
    user: {
        login: string;
    };
    head: {
        ref: string;
        sha: string;
    };
    base: {
        ref: string;
    };
    html_url: string;
    created_at: string;
    updated_at: string;
}
export interface GitHubIssue {
    number: number;
    title: string;
    body: string;
    state: string;
    user: {
        login: string;
    };
    html_url: string;
    created_at: string;
    updated_at: string;
    pull_request?: unknown;
}
export interface GitHubComment {
    id: number;
    body: string;
    user: {
        login: string;
        type: string;
    };
    html_url: string;
    created_at: string;
    updated_at: string;
}
export interface GitHubCommit {
    sha: string;
    commit: {
        committer: {
            date: string;
        };
    };
}
export declare function prToNats(repo: string, pr: GitHubPR, eventType: 'opened' | 'synchronized', ghToken?: string): NatsEvent;
export declare function issueToNats(repo: string, issue: GitHubIssue, ghToken?: string): NatsEvent;
export declare function commentToNats(repo: string, issueNumber: number, comment: GitHubComment, ghToken?: string): NatsEvent;
