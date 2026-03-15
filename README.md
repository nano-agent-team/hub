# nano-agent-team hub

[![Validate](https://github.com/nano-agent-team/hub/actions/workflows/validate.yml/badge.svg)](https://github.com/nano-agent-team/hub/actions/workflows/validate.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Public catalog of teams and agents for [nano-agent-team](https://github.com/nano-agent-team/nano-agent-team).

Browse, install, and contribute multi-agent AI teams — each team is a self-contained unit with defined roles, workflows, and configuration.

---

## Available Teams

| Team | Status | Agents | Description |
|---|---|---|---|
| [dev-team](teams/dev-team/) | stable | PM, Architect, Developer, Tester, Reviewer, Scrum Master | Full software development lifecycle via ticket-driven workflow |
| [github-team](teams/github-team/) | experimental | PR Reviewer, Developer, Vision Keeper, Discussion Facilitator | Automated GitHub repo management: PR reviews, issue triage, vision alignment |

**Status:** `stable` — production ready · `beta` — usable but may change · `experimental` — work in progress · `deprecated` — no longer maintained

---

## How to Install a Team

Teams are installed through the nano-agent-team Setup Wizard.

1. Start nano-agent-team and open the setup wizard at `http://localhost:3001`
2. Select **Add Team** and enter the team ID (e.g. `dev-team`)
3. Fill in the required configuration fields (repo URL, credentials, etc.)
4. The team is deployed and agents start listening on their NATS topics

---

## Repository Structure

```
teams/
  {team-id}/
    team.json          — team manifest (id, name, description, agents, pipeline topics)
    setup.json         — required config fields shown in the setup wizard
    agents/
      {agent-id}/
        manifest.json  — agent manifest (id, name, model, subscribe/publish topics)
        CLAUDE.md      — system prompt
        Dockerfile     — (optional) custom container

agents/                — standalone agents reusable across multiple teams
  {agent-id}/
    manifest.json
    CLAUDE.md

features/              — frontend + backend plugins extending the dashboard
  {feature-id}/
    plugin.mjs         — backend plugin
    frontend/dist/     — pre-built Module Federation remote
```

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for how to submit a new team or agent.

Quick summary:
1. Fork the repo and create a branch: `feat/{team-id}`
2. Add your team under `teams/{team-id}/` following the structure above
3. Open a PR using the provided template
4. CI validates all JSON — make sure it passes

---

## License

[MIT](LICENSE)
