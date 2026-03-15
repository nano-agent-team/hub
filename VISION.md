# Project Vision

## Mission

This repository serves as a **public catalog of teams and agents** for the nano-agent-team ecosystem. It enables users to discover, deploy, and configure multi-agent teams for various workflows.

### Core Purpose
- Provide reusable, production-ready agent teams
- Enable rapid deployment of specialized AI workflows
- Foster collaboration through open-source agent definitions

## Principles

### 1. **Modularity First**
- ✅ Teams are self-contained and independently deployable
- ✅ Agents communicate via well-defined NATS topics
- ✅ Shared components are documented in `shared/` directories

### 2. **Developer Experience**
- ✅ Clear manifests with JSON schema validation
- ✅ Human-readable CLAUDE.md system prompts
- ✅ Minimal configuration required (sensible defaults)

### 3. **Security & Safety**
- ✅ No direct pushes to main/master branches
- ✅ All changes go through PR review process
- ✅ Secrets managed via secure storage (never committed)
- ✅ Rate limiting on external API calls

### 4. **Quality Standards**
- ✅ Every team has clear documentation
- ✅ Acceptance criteria defined upfront
- ✅ Code follows conventions (linting, formatting)
- ✅ Test plans included for each feature

### 5. **Alignment with Purpose**
- ✅ Features must serve the core mission (agent catalog)
- ✅ Avoid scope creep into unrelated domains
- ✅ Prioritize catalog usability over complexity

## In Scope

### ✅ Included in This Project
- Team and agent definitions (manifests, prompts)
- Setup wizards and configuration schemas
- Documentation and examples
- Multi-agent orchestration patterns
- GitHub workflow automation (PR review, issue triage)
- Integration guides for NATS, MCP servers, etc.

## Out of Scope

### ❌ NOT Part of This Project
- **Runtime infrastructure**: This is a catalog, not an orchestrator. Deployment and execution happen elsewhere.
- **Agent training/fine-tuning**: We use Claude models as-is via Anthropic API.
- **Custom LLM hosting**: No self-hosted models, only Anthropic Claude.
- **General-purpose automation**: Focus on agent team workflows, not arbitrary CI/CD pipelines.
- **Issue tracking system**: We integrate with external ticketing (MCP tickets server), not build one.

## Feature Evaluation Criteria

When proposing a new feature or team, ask:

| Criterion | Question |
|-----------|----------|
| **Relevance** | Does this help users discover/deploy agent teams? |
| **Reusability** | Can others use this beyond a single use case? |
| **Maintainability** | Is this simple enough to maintain long-term? |
| **Security** | Does this follow safety principles (no direct main pushes, etc.)? |
| **Alignment** | Does this serve the core mission or dilute focus? |

### Verdicts
- **Aligned**: Merge it! Fits vision perfectly.
- **Needs Discussion**: Potentially valuable, but unclear fit. Discuss with maintainers.
- **Out of Scope**: Doesn't align with mission. Consider forking for separate project.

## Decision Framework

For **new teams**:
1. Is there a clear use case with at least 3 agents?
2. Are the agents well-defined with specific roles?
3. Does the team solve a real workflow problem?

For **new agents**:
1. Is the role distinct from existing agents?
2. Does it integrate with existing teams?
3. Is the system prompt clear and actionable?

For **breaking changes**:
1. Discuss in GitHub issue first
2. Provide migration path for existing users
3. Version bump with changelog

---

**Last Updated**: 2026-03-15
**Maintained By**: nano-agent-team contributors
