import type { GitHubClient } from './github-client.js';
import type { StateManager } from './state.js';
import type { GitHubPR, GitHubIssue, GitHubComment } from './transformer.js';
import { prToNats, issueToNats, commentToNats } from './transformer.js';

type Publisher = (topic: string, payload: string) => Promise<void>;

export class Poller {
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(
    private client: GitHubClient,
    private state: StateManager,
    private repos: string[],
    private publish: Publisher,
    private intervalMs: number,
  ) {}

  start(): void {
    console.log(
      `[github-team poller] Starting — interval=${this.intervalMs}ms repos=${this.repos.join(', ')}`,
    );
    void this.poll();
    this.timer = setInterval(() => void this.poll(), this.intervalMs);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private async poll(): Promise<void> {
    if (this.running) return; // skip if previous cycle still in progress
    this.running = true;
    try {
      for (const repo of this.repos) {
        try {
          await this.pollRepo(repo);
        } catch (err) {
          console.error(`[github-team poller] Error polling ${repo}:`, err);
        }
      }
    } finally {
      this.running = false;
    }
  }

  private async pollRepo(repo: string): Promise<void> {
    const cursor = this.state.getRepoCursor(repo);
    const [owner, repoName] = repo.split('/');

    // Fetch a fresh installation token once per poll cycle so agents can use gh CLI
    const ghToken = await this.client.getInstallationToken();

    // ── Pull Requests ────────────────────────────────────────────────────────
    const prs = await this.client.get<GitHubPR[]>(
      `/repos/${owner}/${repoName}/pulls?state=open&sort=updated&direction=desc&per_page=50`,
    );

    let latestPrUpdate = cursor.prs_since;
    for (const pr of prs) {
      if (pr.updated_at <= cursor.prs_since) continue;
      if (pr.updated_at > latestPrUpdate) latestPrUpdate = pr.updated_at;

      const eventType = pr.created_at > cursor.prs_since ? 'opened' : 'synchronized';
      const event = prToNats(repo, pr, eventType, ghToken);
      await this.publish(event.topic, JSON.stringify(event.payload));
      console.log(`[github-team poller] ${event.topic} PR#${pr.number} in ${repo}`);
    }

    // ── Issues ───────────────────────────────────────────────────────────────
    const issues = await this.client.get<GitHubIssue[]>(
      `/repos/${owner}/${repoName}/issues?state=open&sort=updated&direction=desc&since=${cursor.issues_since}&per_page=50`,
    );

    let latestIssueUpdate = cursor.issues_since;
    for (const issue of issues) {
      if (issue.pull_request) continue; // issues endpoint also returns PRs
      if (issue.updated_at <= cursor.issues_since) continue;
      if (issue.updated_at > latestIssueUpdate) latestIssueUpdate = issue.updated_at;

      if (issue.created_at > cursor.issues_since) {
        const event = issueToNats(repo, issue, ghToken);
        await this.publish(event.topic, JSON.stringify(event.payload));
        console.log(`[github-team poller] ${event.topic} Issue#${issue.number} in ${repo}`);
      }

      // ── Comments on updated issues ─────────────────────────────────────────
      const comments = await this.client.get<GitHubComment[]>(
        `/repos/${owner}/${repoName}/issues/${issue.number}/comments?since=${cursor.issues_since}&per_page=50`,
      );
      for (const comment of comments) {
        if (comment.created_at <= cursor.issues_since) continue;
        const event = commentToNats(repo, issue.number, comment, ghToken);
        await this.publish(event.topic, JSON.stringify(event.payload));
        console.log(
          `[github-team poller] ${event.topic} comment#${comment.id} on Issue#${issue.number}`,
        );
      }
    }

    this.state.updateRepoCursor(repo, {
      prs_since: latestPrUpdate,
      issues_since: latestIssueUpdate,
    });
  }
}
