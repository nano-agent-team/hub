# General Agents

Standalone agents that are not tied to a specific team. These can be referenced by multiple teams or deployed independently.

## Structure

```
agents/
  {agent-id}/
    manifest.json  — agent manifest (id, name, version, description, model, topics)
    CLAUDE.md      — system prompt
    Dockerfile     — (optional) custom container
```

## Difference from team agents

| | Team agent | General agent |
|---|---|---|
| Location | `teams/{team-id}/agents/{agent-id}/` | `agents/{agent-id}/` |
| Scope | Belongs to one team, uses team context | Reusable across teams |
| NATS topics | Team-specific (`topic.{team-id}.*`) | Generic or configurable |

## Adding a general agent

See [CONTRIBUTING.md](../CONTRIBUTING.md).
