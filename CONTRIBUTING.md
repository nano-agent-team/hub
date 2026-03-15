# Contributing to nano-agent-team hub

Thank you for contributing to the hub catalog! This guide explains how to add a new team or agent.

## Development Setup

No dependencies required — the hub is a catalog of JSON manifests and Markdown system prompts. You just need a text editor and Git.

## Adding a New Team

### 1. Required Structure

Create a directory under `teams/{your-team-id}/` with the following files:

```
teams/{your-team-id}/
  team.json          ← required
  setup.json         ← required
  agents/
    {agent-id}/
      manifest.json  ← required
      CLAUDE.md      ← required
```

### 2. team.json

```json
{
  "id": "your-team-id",
  "name": "Human-readable Team Name",
  "version": "0.1.0",
  "description": "What this team does in one sentence.",
  "agents": ["agent-one", "agent-two"],
  "pipeline": {
    "topics": {
      "event_name": "topic.your-team.event-name"
    }
  }
}
```

Required fields: `id`, `name`, `version`, `description`, `agents`.

### 3. setup.json

Defines configuration fields shown in the setup wizard:

```json
{
  "requires": [
    {
      "key": "repo_url",
      "label": "GitHub repo URL",
      "type": "text",
      "shared": true,
      "placeholder": "git@github.com:org/repo.git"
    }
  ]
}
```

Field types: `text`, `secret`, `generate_ssh`.

### 4. manifest.json (per agent)

```json
{
  "id": "agent-id",
  "name": "Agent Name",
  "version": "0.1.0",
  "description": "What this agent does.",
  "model": "claude-sonnet-4-5",
  "session_type": "stateless",
  "subscribe_topics": ["topic.your-team.event"],
  "publish_topics": ["topic.your-team.result"]
}
```

Required fields: `id`, `name`, `version`, `description`.

### 5. CLAUDE.md (system prompt)

Write a clear, structured system prompt. Include:
- Agent identity and role
- Available tools (MCP servers, NATS topics)
- Responsibilities and workflow
- Response format

## Naming Conventions

- Team IDs: `kebab-case` (e.g. `dev-team`, `github-team`)
- Agent IDs: `kebab-case` (e.g. `pm`, `pr-reviewer`)
- NATS topics: `topic.{team-id}.{event}` (e.g. `topic.dev-team.ticket.new`)

## Submitting a PR

1. Fork the repo
2. Create a branch: `feat/{team-id}`
3. Add your team following the structure above
4. Run a quick sanity check: `find teams -name "*.json" | xargs -I{} node -e "require('./{}')" 2>&1`
5. Open a PR — CI validates all JSON automatically

## Commit Conventions

```
feat(team-id): short description
fix(team-id): short description
docs: update README
```

## Code of Conduct

Be respectful. Focus on constructive feedback. Agent definitions in this catalog are executed autonomously — quality and safety matter.
