# Vision Evaluation Criteria

This document provides detailed criteria for the **Vision Keeper** agent to evaluate features, issues, and pull requests against the project vision defined in `/VISION.md`.

## Evaluation Framework

When evaluating a proposal (issue, PR, feature request), the Vision Keeper uses this structured framework:

---

## Step 1: Mission Alignment Check

**Question**: Does this proposal align with the core mission?

**Core Mission** (from VISION.md):
> Provide a public catalog of teams and agents for the nano-agent-team ecosystem

### ✅ PASS if:
- Adds new team or agent definitions to catalog
- Improves catalog usability (search, docs, examples)
- Enhances agent configuration/deployment experience
- Enables better agent collaboration patterns

### ❌ FAIL if:
- Unrelated to agent catalog (e.g., building a CMS)
- Focuses on runtime execution (we catalog agents, not run them)
- Tries to replace external services (issue trackers, CI/CD)

---

## Step 2: Scope Check

**Question**: Is this in scope or out of scope?

### ✅ IN SCOPE (from VISION.md):
- Team and agent definitions (manifests, prompts)
- Setup wizards and configuration schemas
- Documentation and examples
- Multi-agent orchestration patterns
- GitHub workflow automation (PR review, issue triage)
- Integration guides for NATS, MCP servers, etc.

### ❌ OUT OF SCOPE (from VISION.md):
- Runtime infrastructure (orchestration engines)
- Agent training/fine-tuning
- Custom LLM hosting (use Anthropic API only)
- General-purpose automation (non-agent workflows)
- Building issue tracking systems

### 🟡 BORDERLINE (needs discussion):
- Agent monitoring/observability (catalog vs. runtime?)
- Version control for agent definitions (useful, but how far?)
- Agent testing frameworks (in scope if for catalog quality)

---

## Step 3: Principles Check

**Question**: Does this follow project principles?

### Principle 1: Modularity First
- ✅ Self-contained teams/agents
- ✅ NATS-based communication (loose coupling)
- ✅ Shared components in `shared/` directories
- ❌ Monolithic or tightly coupled designs

### Principle 2: Developer Experience
- ✅ Clear JSON schemas
- ✅ Readable CLAUDE.md prompts
- ✅ Minimal config, sensible defaults
- ❌ Complex setup requiring deep knowledge

### Principle 3: Security & Safety
- ✅ No direct pushes to main/master
- ✅ PR review process enforced
- ✅ Secrets in secure storage (never committed)
- ✅ Rate limiting on APIs
- ❌ Bypasses security (force push, skip review)

### Principle 4: Quality Standards
- ✅ Documentation included
- ✅ Acceptance criteria defined
- ✅ Follows conventions
- ✅ Test plans provided
- ❌ Undocumented, no tests, poor quality

### Principle 5: Alignment with Purpose
- ✅ Serves core mission (agent catalog)
- ✅ Avoids scope creep
- ✅ Prioritizes usability
- ❌ Unrelated tangents

---

## Step 4: Feature Evaluation Criteria

Apply these questions from VISION.md:

| Criterion | Question | Weight |
|-----------|----------|--------|
| **Relevance** | Does this help users discover/deploy agent teams? | High |
| **Reusability** | Can others use this beyond a single use case? | High |
| **Maintainability** | Is this simple enough to maintain long-term? | Medium |
| **Security** | Does this follow safety principles? | High |
| **Alignment** | Does this serve the core mission or dilute focus? | High |

### Scoring:
- All High criteria → ✅ **ALIGNED**
- One High failed → 🟡 **NEEDS_DISCUSSION**
- Two+ High failed → ❌ **OUT_OF_SCOPE**

---

## Verdict Decision Tree

```
START: New proposal received
  ↓
Q1: Does it align with core mission (agent catalog)?
  ├─ NO → ❌ OUT_OF_SCOPE
  └─ YES → Continue
      ↓
Q2: Is it explicitly in "Out of Scope" section?
  ├─ YES → ❌ OUT_OF_SCOPE
  └─ NO → Continue
      ↓
Q3: Is it explicitly in "In Scope" section?
  ├─ YES → Continue
  └─ NO (borderline) → 🟡 NEEDS_DISCUSSION
      ↓
Q4: Does it follow ALL principles?
  ├─ NO (major violation) → ❌ OUT_OF_SCOPE
  ├─ NO (minor violation) → 🟡 NEEDS_DISCUSSION
  └─ YES → Continue
      ↓
Q5: Does it pass evaluation criteria (relevance, reusability, etc.)?
  ├─ All High criteria → ✅ ALIGNED
  ├─ Most criteria → 🟡 NEEDS_DISCUSSION
  └─ Few criteria → ❌ OUT_OF_SCOPE
```

---

## Verdict Definitions

### ✅ ALIGNED
**Meaning**: This proposal clearly fits the project vision and should proceed.

**Actions**:
- Add `aligned` label
- Comment with positive feedback
- Approve moving to next phase (spec, implementation, etc.)

**Example Comment**:
> ## Vision Alignment Check
>
> **Verdict**: ✅ ALIGNED
>
> This proposal fits perfectly with our mission to provide a catalog of reusable agent teams. Adding a Python development team expands coverage and serves a clear use case.
>
> **Recommendation**: Proceed with implementation. Ensure manifest follows existing structure.

---

### 🟡 NEEDS_DISCUSSION
**Meaning**: This proposal has potential but requires clarification or maintainer decision.

**Actions**:
- Add `needs-discussion` label
- Comment with specific questions/concerns
- Tag maintainers for input
- Propose modifications to align better

**Example Comment**:
> ## Vision Alignment Check
>
> **Verdict**: 🟡 NEEDS_DISCUSSION
>
> This proposal has merit but raises questions about scope.
>
> **Concerns**:
> - VISION.md "Out of Scope" section mentions no runtime infrastructure
> - This adds orchestration logic, which may cross that line
>
> **Questions for maintainers**:
> - Should we revise VISION.md to allow limited runtime utilities?
> - Can this be simplified to stay in "catalog" territory?
>
> **Recommendation**: Discuss with @maintainers before proceeding.

---

### ❌ OUT_OF_SCOPE
**Meaning**: This proposal does not align with project vision and should not proceed as-is.

**Actions**:
- Add `out-of-scope` label
- Comment with polite explanation
- Suggest alternatives (fork, different project, modify proposal)
- Close issue if appropriate (after discussion)

**Example Comment**:
> ## Vision Alignment Check
>
> **Verdict**: ❌ OUT_OF_SCOPE
>
> While I appreciate the effort, this proposal doesn't align with our project mission. VISION.md explicitly states:
>
> > "Issue tracking system: We integrate with external ticketing (MCP tickets server), not build one."
>
> **Why**: Building an issue tracker would shift focus from our core purpose (agent catalog) and duplicate existing mature tools.
>
> **Alternative**: Consider integrating with existing issue tracking via MCP servers. This provides the functionality without expanding scope.
>
> **Recommendation**: Close this issue or repurpose as "Improve MCP tickets integration" if that fits your needs.

---

## Special Case: New Teams

When evaluating a proposal to add a new team to the catalog:

### Minimum Requirements:
- [ ] **At least 3 agents** (teams should solve multi-faceted problems)
- [ ] **Clear use case** (what workflow does this enable?)
- [ ] **Well-defined roles** (each agent has distinct responsibility)
- [ ] **NATS topics defined** (how agents communicate)
- [ ] **Documentation** (team.json, agent manifests, CLAUDE.md prompts)

### Evaluation:
1. **Is the use case common enough?** (Will others benefit?)
2. **Are the agents distinct?** (Or is it just one agent's job split artificially?)
3. **Does this overlap with existing teams?** (Avoid duplication)

**Example**:
- ✅ ALIGNED: "Data Science Team" (distinct from dev-team, clear use case)
- 🟡 NEEDS_DISCUSSION: "Backend Team" (overlaps with dev-team?)
- ❌ OUT_OF_SCOPE: "Email Marketing Team" (not agent-based workflow)

---

## Special Case: New Agents

When evaluating adding an agent to an existing team:

### Minimum Requirements:
- [ ] **Distinct role** (not duplicating existing agent)
- [ ] **Clear trigger** (what events activate this agent?)
- [ ] **Well-defined output** (what does it produce?)
- [ ] **Integration with team** (how does it collaborate?)

### Evaluation:
1. **Is this a separate concern?** (Or can existing agent handle it?)
2. **Does it justify the complexity?** (Adding agents adds maintenance burden)
3. **Will it be actively used?** (Or edge case?)

**Example**:
- ✅ ALIGNED: "Security Auditor" for github-team (distinct from PR Reviewer)
- 🟡 NEEDS_DISCUSSION: "Code Formatter" (could be part of PR Reviewer?)
- ❌ OUT_OF_SCOPE: "Email Notifier" (infrastructure, not agent role)

---

## Special Case: VISION.md Changes

Proposals to change VISION.md itself require **extra scrutiny**:

### ✅ ALIGNED (meta-changes):
- Fix typos, clarify wording
- Add examples to existing sections
- Update "Last Updated" date

### 🟡 NEEDS_DISCUSSION (scope changes):
- Add new item to "In Scope"
- Remove item from "Out of Scope"
- Change core mission statement
- Add/remove principles

### ❌ OUT_OF_SCOPE (without maintainer consensus):
- Fundamental mission change (catalog → something else)
- Removing safety principles

**Process**:
1. Vision Keeper labels as `needs-discussion`
2. Tag all maintainers
3. Require explicit approval from majority
4. Update vision version number if merged

---

## Context to Consider

When evaluating, also consider:

### Project Maturity
- Early stage → More open to experiments
- Mature stage → Stricter scope adherence

### Community Demand
- Many users requesting → Higher weight
- Single request → Lower weight

### Maintenance Burden
- Simple addition → Lower bar
- Complex feature → Higher bar

### Strategic Fit
- Aligns with roadmap → Favored
- Random tangent → Questioned

---

## Example Evaluations

### Proposal: "Add Slack integration for agent notifications"

**Mission**: ❓ Borderline (notifications useful, but is this catalog's job?)
**Scope**: ❓ Not in "In Scope", not in "Out of Scope"
**Principles**: ✅ Could follow modularity (MCP Slack server)
**Criteria**:
- Relevance: 🟡 Helps deployment, but not catalog itself
- Reusability: ✅ Many would use
- Maintainability: ✅ Simple MCP integration
- Security: ✅ No issues
- Alignment: 🟡 Stretches focus

**Verdict**: 🟡 **NEEDS_DISCUSSION**
**Reason**: Useful feature but stretches scope. Needs maintainer call on whether catalog should include deployment utilities.

---

### Proposal: "Add example multi-agent tic-tac-toe game"

**Mission**: ❌ Game != agent catalog
**Scope**: ❌ Not in "In Scope"
**Principles**: ✅ Could be modular, documented
**Criteria**:
- Relevance: ❌ Doesn't help discover/deploy useful teams
- Reusability: ❌ Toy example, not production use
- Maintainability: ✅ Simple enough
- Security: ✅ No issues
- Alignment: ❌ Dilutes focus

**Verdict**: ❌ **OUT_OF_SCOPE**
**Reason**: While it might demonstrate multi-agent patterns, a toy game doesn't serve the catalog's mission of providing production-ready teams. Suggest creating this in separate "examples" repo.

---

### Proposal: "Add PR Reviewer agent to github-team"

**Mission**: ✅ GitHub team is in catalog
**Scope**: ✅ Agent definitions are in scope
**Principles**: ✅ Modular, documented, secure
**Criteria**:
- Relevance: ✅ Helps users deploy GitHub automation
- Reusability: ✅ Every repo needs PR reviews
- Maintainability: ✅ Standard agent pattern
- Security: ✅ Follows review-before-merge
- Alignment: ✅ Core catalog offering

**Verdict**: ✅ **ALIGNED**
**Reason**: Perfect fit. This is exactly what the catalog should provide.

---

## Tips for Vision Keeper Agent

- **Read VISION.md fresh** for each evaluation (don't rely on memory)
- **Be consistent**: Similar proposals should get similar verdicts
- **Explain clearly**: Always provide reasoning, not just verdict
- **Be respectful**: Out-of-scope doesn't mean bad idea
- **Suggest alternatives**: Help redirect misaligned proposals
- **Update this doc**: If patterns emerge, propose updates to criteria

---

**Last Updated**: 2026-03-15
**Version**: 0.1.0
**Used By**: Vision Keeper Agent
