export interface NatsEvent {
  topic: string;
  payload: Record<string, unknown>;
}

export interface GitHubPR {
  number: number;
  title: string;
  body: string;
  state: string;
  user: { login: string };
  head: { ref: string; sha: string };
  base: { ref: string };
  html_url: string;
  created_at: string;
  updated_at: string;
  requested_reviewers?: Array<{ login: string; type: string }>;
}

export interface GitHubIssue {
  number: number;
  title: string;
  body: string;
  state: string;
  user: { login: string };
  html_url: string;
  created_at: string;
  updated_at: string;
  pull_request?: unknown;
}

export interface GitHubComment {
  id: number;
  body: string;
  user: { login: string; type: string };
  html_url: string;
  created_at: string;
  updated_at: string;
}

export interface GitHubCommit {
  sha: string;
  commit: { committer: { date: string } };
}

export interface GitHubReview {
  id: number;
  user: { login: string; type: string };
  body: string;
  state: 'APPROVED' | 'CHANGES_REQUESTED' | 'COMMENTED' | 'DISMISSED' | 'PENDING';
  submitted_at: string;
}

export function prToNats(repo: string, pr: GitHubPR, eventType: 'opened' | 'synchronized', ghToken?: string): NatsEvent {
  const topic = eventType === 'opened' ? 'topic.github.pr.opened' : 'topic.github.pr.synchronized';
  const [owner, repoName] = repo.split('/');
  return {
    topic,
    payload: {
      repo,
      pr_number: pr.number,
      title: pr.title,
      author: pr.user.login,
      base_branch: pr.base.ref,
      head_branch: pr.head.ref,
      sha: pr.head.sha,
      url: pr.html_url,
      replySubject: `github.pr.reply.${owner}.${repoName}.${pr.number}`,
      ...(ghToken ? { gh_token: ghToken } : {}),
    },
  };
}

export function issueToNats(repo: string, issue: GitHubIssue, ghToken?: string): NatsEvent {
  return {
    topic: 'topic.github.issue.opened',
    payload: {
      repo,
      issue_number: issue.number,
      title: issue.title,
      body: issue.body,
      author: issue.user.login,
      url: issue.html_url,
      ...(ghToken ? { gh_token: ghToken } : {}),
    },
  };
}

export function prDiscussionToNats(
  repo: string,
  pr: GitHubPR,
  comment: GitHubComment,
  ghToken?: string,
): NatsEvent {
  return {
    topic: 'topic.github.pr.discussion',
    payload: {
      repo,
      pr_number: pr.number,
      title: pr.title,
      author: pr.user.login,
      base_branch: pr.base.ref,
      head_branch: pr.head.ref,
      sha: pr.head.sha,
      url: pr.html_url,
      comment_id: comment.id,
      comment_author: comment.user.login,
      comment_body: comment.body,
      comment_url: comment.html_url,
      ...(ghToken ? { gh_token: ghToken } : {}),
    },
  };
}

export function commentToNats(repo: string, issueNumber: number, comment: GitHubComment, ghToken?: string): NatsEvent {
  return {
    topic: 'topic.github.issue.comment',
    payload: {
      repo,
      issue_number: issueNumber,
      comment_id: comment.id,
      body: comment.body,
      author: comment.user.login,
      url: comment.html_url,
      ...(ghToken ? { gh_token: ghToken } : {}),
    },
  };
}
