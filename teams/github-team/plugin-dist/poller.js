import { prToNats, prDiscussionToNats, issueToNats, commentToNats } from './transformer.js';
export class Poller {
    client;
    state;
    repos;
    publish;
    intervalMs;
    appSlug;
    timer = null;
    running = false;
    constructor(client, state, repos, publish, intervalMs, appSlug) {
        this.client = client;
        this.state = state;
        this.repos = repos;
        this.publish = publish;
        this.intervalMs = intervalMs;
        this.appSlug = appSlug;
    }
    start() {
        console.log(`[github-team poller] Starting — interval=${this.intervalMs}ms repos=${this.repos.join(', ')}`);
        void this.poll();
        this.timer = setInterval(() => void this.poll(), this.intervalMs);
    }
    stop() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }
    async poll() {
        if (this.running)
            return; // skip if previous cycle still in progress
        this.running = true;
        try {
            for (const repo of this.repos) {
                try {
                    await this.pollRepo(repo);
                }
                catch (err) {
                    console.error(`[github-team poller] Error polling ${repo}:`, err);
                }
            }
        }
        finally {
            this.running = false;
        }
    }
    async pollRepo(repo) {
        const [owner, repoName] = repo.split('/');
        // Fetch a fresh installation token once per poll cycle so agents can use gh CLI
        const ghToken = await this.client.getInstallationToken();
        // ── Pull Requests ────────────────────────────────────────────────────────
        // Stateless approach: for each open PR, check GitHub itself to determine
        // whether a review is needed — no local SHA state required.
        const prs = await this.client.get(`/repos/${owner}/${repoName}/pulls?state=open&sort=updated&direction=desc&per_page=50`);
        for (const pr of prs) {
            // Skip merged or closed PRs (defensive — API should only return open, but guard against stale data)
            if (pr.state !== 'open' || pr.merged_at !== null)
                continue;
            // Get latest commit on the PR
            const commits = await this.client.get(`/repos/${owner}/${repoName}/pulls/${pr.number}/commits?per_page=100`);
            if (!commits.length)
                continue;
            const latestCommit = commits[commits.length - 1];
            const latestCommitDate = new Date(latestCommit.commit.committer.date);
            // Get all comments on the PR and find the last bot comment
            const comments = await this.client.get(`/repos/${owner}/${repoName}/issues/${pr.number}/comments?per_page=100`);
            const botComments = comments.filter((c) => c.user.type === 'Bot');
            const lastBotComment = botComments[botComments.length - 1];
            const lastBotCommentDate = lastBotComment ? new Date(lastBotComment.created_at) : null;
            // Get PR reviews (gh pr review --approve creates a review, not a comment)
            const reviews = await this.client.get(`/repos/${owner}/${repoName}/pulls/${pr.number}/reviews?per_page=100`);
            const botReviews = reviews.filter((r) => r.user.type === 'Bot' && r.submitted_at);
            const lastBotReview = botReviews[botReviews.length - 1];
            const lastBotReviewDate = lastBotReview ? new Date(lastBotReview.submitted_at) : null;
            // Use the latest of comment date and review date
            const lastBotActivityDate = lastBotCommentDate && lastBotReviewDate
                ? new Date(Math.max(lastBotCommentDate.getTime(), lastBotReviewDate.getTime()))
                : lastBotCommentDate ?? lastBotReviewDate;
            const latestSha = latestCommit.sha;
            const lastPublishedSha = this.state.getPrHead(repo, pr.number);
            if (!lastBotActivityDate) {
                // No bot activity yet — only publish if we haven't already queued this SHA
                if (lastPublishedSha !== latestSha) {
                    const event = prToNats(repo, pr, 'opened', ghToken);
                    await this.publish(event.topic, JSON.stringify(event.payload));
                    this.state.setPrHead(repo, pr.number, latestSha);
                    console.log(`[github-team poller] ${event.topic} PR#${pr.number} in ${repo} (no prior review)`);
                }
                else {
                    console.log(`[github-team poller] PR#${pr.number} already queued for SHA ${latestSha.slice(0, 7)} — skip`);
                }
            }
            else if (latestCommitDate > lastBotActivityDate) {
                // New commits pushed after last review — only publish if SHA is new
                if (lastPublishedSha !== latestSha) {
                    const event = prToNats(repo, pr, 'synchronized', ghToken);
                    await this.publish(event.topic, JSON.stringify(event.payload));
                    this.state.setPrHead(repo, pr.number, latestSha);
                    console.log(`[github-team poller] ${event.topic} PR#${pr.number} in ${repo} (new commits since ${lastBotActivityDate.toISOString()})`);
                }
                else {
                    console.log(`[github-team poller] PR#${pr.number} already queued for SHA ${latestSha.slice(0, 7)} — skip`);
                }
            }
            else {
                // No new commits — check if bot was explicitly requested to review
                const botRequested = pr.requested_reviewers?.some((r) => r.login === this.appSlug);
                if (botRequested) {
                    const event = prToNats(repo, pr, 'opened', ghToken);
                    await this.publish(event.topic, JSON.stringify(event.payload));
                    console.log(`[github-team poller] ${event.topic} PR#${pr.number} in ${repo} (review requested)`);
                }
                else {
                    // Check if author tagged the bot in a new comment
                    const mentionPattern = `@${this.appSlug}`;
                    const newMentions = comments.filter((c) => c.user.type !== 'Bot' &&
                        new Date(c.created_at) > lastBotActivityDate &&
                        c.body.includes(mentionPattern));
                    if (newMentions.length > 0) {
                        const latest = newMentions[newMentions.length - 1];
                        const event = prDiscussionToNats(repo, pr, latest, ghToken);
                        await this.publish(event.topic, JSON.stringify(event.payload));
                        console.log(`[github-team poller] ${event.topic} PR#${pr.number} in ${repo} (mention by @${latest.user.login})`);
                    }
                    else {
                        console.log(`[github-team poller] PR#${pr.number} already reviewed at latest commit — skip`);
                    }
                }
            }
        }
        // ── Issues ───────────────────────────────────────────────────────────────
        const cursor = this.state.getRepoCursor(repo);
        const issues = await this.client.get(`/repos/${owner}/${repoName}/issues?state=open&sort=updated&direction=desc&since=${cursor.issues_since}&per_page=50`);
        let latestIssueUpdate = cursor.issues_since;
        for (const issue of issues) {
            if (issue.pull_request)
                continue; // issues endpoint also returns PRs
            if (issue.updated_at <= cursor.issues_since)
                continue;
            if (issue.updated_at > latestIssueUpdate)
                latestIssueUpdate = issue.updated_at;
            if (issue.created_at > cursor.issues_since) {
                const event = issueToNats(repo, issue, ghToken);
                await this.publish(event.topic, JSON.stringify(event.payload));
                console.log(`[github-team poller] ${event.topic} Issue#${issue.number} in ${repo}`);
            }
            // ── Comments on updated issues ─────────────────────────────────────────
            const comments = await this.client.get(`/repos/${owner}/${repoName}/issues/${issue.number}/comments?since=${cursor.issues_since}&per_page=50`);
            for (const comment of comments) {
                if (comment.created_at <= cursor.issues_since)
                    continue;
                const event = commentToNats(repo, issue.number, comment, ghToken);
                await this.publish(event.topic, JSON.stringify(event.payload));
                console.log(`[github-team poller] ${event.topic} comment#${comment.id} on Issue#${issue.number}`);
            }
        }
        this.state.updateRepoCursor(repo, {
            issues_since: latestIssueUpdate,
        });
    }
}
//# sourceMappingURL=poller.js.map