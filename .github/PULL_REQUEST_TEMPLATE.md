## Description

<!-- What team or agent does this PR add/modify? -->

## Type

- [ ] New team
- [ ] New agent (added to existing team)
- [ ] Update to existing team/agent
- [ ] Documentation
- [ ] Fix

## Checklist

- [ ] `team.json` has all required fields: `id`, `name`, `version`, `description`, `agents`
- [ ] Every agent has `manifest.json` and `CLAUDE.md`
- [ ] `setup.json` defines all required configuration fields
- [ ] NATS topics follow the naming convention: `topic.{team-id}.{event}`
- [ ] System prompts (CLAUDE.md) are clear about agent responsibilities and workflow
- [ ] No secrets or API keys committed
- [ ] CI passes (JSON validation)
