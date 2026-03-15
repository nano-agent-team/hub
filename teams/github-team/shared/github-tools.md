# GitHub Tools Reference

This document provides a comprehensive reference for GitHub API operations and CLI commands used by GitHub Management Team agents.

## GitHub CLI (`gh`)

The `gh` CLI is the primary tool for interacting with GitHub from agents.

### Authentication

```bash
# Check auth status
gh auth status

# Login (uses GH_TOKEN env var)
gh auth login --with-token < $GH_TOKEN
```

---

## Pull Requests

### View PRs

```bash
# List all open PRs
gh pr list --repo {owner}/{repo}

# List PRs with specific state
gh pr list --repo {owner}/{repo} --state open|closed|merged

# View specific PR
gh pr view {number} --repo {owner}/{repo}

# Get PR details as JSON
gh pr view {number} --repo {owner}/{repo} --json title,body,author,state,createdAt,updatedAt

# Get PR with comments
gh pr view {number} --repo {owner}/{repo} --json comments

# Get changed files
gh pr view {number} --repo {owner}/{repo} --json files
```

### Create PRs

```bash
# Create PR interactively
gh pr create --repo {owner}/{repo}

# Create PR with flags
gh pr create \
  --repo {owner}/{repo} \
  --title "feat: add new feature" \
  --body "Description of changes" \
  --base main \
  --head feature-branch

# Create PR with HEREDOC body
gh pr create \
  --repo {owner}/{repo} \
  --title "feat: add feature" \
  --body "$(cat <<'EOF'
## Summary
- Added feature X
- Fixed bug Y

## Test Plan
- [ ] Test scenario 1
- [ ] Test scenario 2
EOF
)"
```

### Review PRs

```bash
# Approve PR
gh pr review {number} --repo {owner}/{repo} --approve --body "LGTM!"

# Request changes
gh pr review {number} --repo {owner}/{repo} --request-changes --body "Please fix X"

# Comment only (no approve/reject)
gh pr review {number} --repo {owner}/{repo} --comment --body "Some feedback"

# Review with HEREDOC body
gh pr review {number} --repo {owner}/{repo} --approve --body "$(cat <<'EOF'
## Code Review

All looks good! Clean implementation.

✅ Approved
EOF
)"
```

### Comment on PRs

```bash
# Add general comment
gh pr comment {number} --repo {owner}/{repo} --body "Great work!"

# Add comment with HEREDOC
gh pr comment {number} --repo {owner}/{repo} --body "$(cat <<'EOF'
## Review Feedback

Please address:
1. Fix typo in line 42
2. Add unit test
EOF
)"
```

### Manage PRs

```bash
# Checkout PR locally
gh pr checkout {number} --repo {owner}/{repo}

# Get PR diff
gh pr diff {number} --repo {owner}/{repo}

# Merge PR
gh pr merge {number} --repo {owner}/{repo} --squash|--merge|--rebase

# Close PR
gh pr close {number} --repo {owner}/{repo}
```

---

## Issues

### View Issues

```bash
# List all open issues
gh issue list --repo {owner}/{repo}

# List issues with label
gh issue list --repo {owner}/{repo} --label bug

# View specific issue
gh issue view {number} --repo {owner}/{repo}

# Get issue as JSON
gh issue view {number} --repo {owner}/{repo} --json title,body,author,labels,comments
```

### Create Issues

```bash
# Create issue interactively
gh issue create --repo {owner}/{repo}

# Create issue with flags
gh issue create \
  --repo {owner}/{repo} \
  --title "Bug: something broke" \
  --body "Steps to reproduce..."

# Create with labels
gh issue create \
  --repo {owner}/{repo} \
  --title "Feature request" \
  --body "..." \
  --label enhancement,needs-discussion
```

### Manage Issues

```bash
# Comment on issue
gh issue comment {number} --repo {owner}/{repo} --body "Updated info"

# Add label
gh issue edit {number} --repo {owner}/{repo} --add-label aligned

# Remove label
gh issue edit {number} --repo {owner}/{repo} --remove-label needs-discussion

# Close issue
gh issue close {number} --repo {owner}/{repo}

# Reopen issue
gh issue reopen {number} --repo {owner}/{repo}
```

---

## GitHub API (via `gh api`)

For operations not covered by `gh` subcommands, use direct API access.

### General Pattern

```bash
gh api {endpoint} [flags]
```

### Common Endpoints

#### Get Repository Info

```bash
gh api repos/{owner}/{repo}
```

#### List PR Files

```bash
gh api repos/{owner}/{repo}/pulls/{number}/files
```

Example output:
```json
[
  {
    "filename": "src/index.js",
    "status": "modified",
    "additions": 10,
    "deletions": 2,
    "changes": 12,
    "patch": "@@ -1,5 +1,15 @@\n..."
  }
]
```

#### Add Inline PR Comment

```bash
gh api repos/{owner}/{repo}/pulls/{number}/comments \
  -f body="Fix this typo" \
  -f path="src/file.js" \
  -F line=42 \
  -f side=RIGHT
```

#### Get PR Reviews

```bash
gh api repos/{owner}/{repo}/pulls/{number}/reviews
```

#### Create Issue Label

```bash
gh api repos/{owner}/{repo}/labels \
  -f name="aligned" \
  -f color="0E8A16" \
  -f description="Aligns with project vision"
```

#### Webhooks

```bash
# List webhooks
gh api repos/{owner}/{repo}/hooks

# Create webhook
gh api repos/{owner}/{repo}/hooks \
  -f name=web \
  -f active=true \
  -f events[]="pull_request" \
  -f events[]="issues" \
  -f config[url]="https://example.com/webhook" \
  -f config[content_type]="json"
```

---

## Git Operations

Agents with `workspace: true` can use git commands.

### Clone Repository

```bash
# Clone via HTTPS
git clone https://github.com/{owner}/{repo}.git /path/to/dir

# Clone via SSH (if ssh_mount: true)
git clone git@github.com:{owner}/{repo}.git /path/to/dir
```

### Branch Management

```bash
# Create new branch
git checkout -b feature/TICK-123

# Switch branch
git checkout main

# List branches
git branch -a

# Delete branch
git branch -d feature/old-branch
```

### Commit & Push

```bash
# Stage files
git add src/file.js

# Commit with message
git commit -m "feat(TICK-123): add new feature

Detailed description here.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"

# Push to remote
git push origin feature/TICK-123

# Push new branch with upstream tracking
git push -u origin feature/TICK-123
```

### Sync with Remote

```bash
# Fetch changes
git fetch origin

# Pull changes
git pull origin main

# Rebase on main
git rebase origin/main
```

---

## NATS Integration

Agents communicate via NATS topics.

### Publish Event

```bash
nats pub {topic} '{json_payload}'
```

Example:
```bash
nats pub topic.github.pr.review-completed '{
  "pr_number": 42,
  "repo": "owner/repo",
  "verdict": "approve",
  "reviewer": "pr-reviewer"
}'
```

### Subscribe to Topic

Configured in agent `manifest.json`:
```json
{
  "subscribe_topics": [
    "topic.github.pr.opened"
  ]
}
```

---

## Error Handling

### Rate Limiting

GitHub API has rate limits:
- **Authenticated**: 5,000 requests/hour
- **Unauthenticated**: 60 requests/hour

Check rate limit:
```bash
gh api rate_limit
```

If rate limited:
```json
{
  "message": "API rate limit exceeded"
}
```

**Solution**: Wait or use secondary token.

### Authentication Failures

```bash
# Error: HTTP 401 Unauthorized
```

**Solution**: Check `GH_TOKEN` env var or SSH keys.

### Not Found (404)

```bash
# Error: HTTP 404 Not Found
```

**Solution**: Verify repo/PR/issue number exists.

---

## Best Practices

### ✅ DO:
- Use `gh` CLI instead of raw `curl` when possible
- Cache repository clones (don't re-clone every time)
- Use JSON output for parsing: `--json field1,field2`
- Rate limit your requests (avoid loops without delays)
- Use HEREDOC for multi-line strings

### ❌ DON'T:
- Hardcode repo names (use variables)
- Push directly to `main` branch
- Merge PRs without review
- Expose `GH_TOKEN` in logs
- Make excessive API calls (cache data)

---

## Common Workflows

### Full PR Review Flow

```bash
# 1. Get PR details
gh pr view 42 --repo owner/repo --json title,body,files

# 2. Get diff
gh pr diff 42 --repo owner/repo

# 3. Clone repo for context (optional)
git clone https://github.com/owner/repo.git /tmp/review
cd /tmp/review
gh pr checkout 42

# 4. Analyze code
# ... (agent-specific logic) ...

# 5. Submit review
gh pr review 42 --repo owner/repo --approve --body "LGTM!"

# 6. Publish event
nats pub topic.github.pr.review-completed '{...}'
```

### Create Feature PR

```bash
# 1. Clone repo
git clone git@github.com:owner/repo.git /workspace/feature
cd /workspace/feature

# 2. Create branch
git checkout -b feat/TICK-123

# 3. Make changes
# ... (implement feature) ...

# 4. Commit
git add src/
git commit -m "feat(TICK-123): add feature X"

# 5. Push
git push -u origin feat/TICK-123

# 6. Create PR
gh pr create --title "feat(TICK-123): add feature X" --body "..." --base main

# 7. Publish event
nats pub topic.github.pr.opened '{...}'
```

---

## Reference Links

- [GitHub CLI Manual](https://cli.github.com/manual/)
- [GitHub REST API Docs](https://docs.github.com/en/rest)
- [Git Documentation](https://git-scm.com/doc)
- [NATS CLI Guide](https://docs.nats.io/using-nats/nats-tools/nats_cli)

---

**Last Updated**: 2026-03-15
**Maintained By**: GitHub Management Team
