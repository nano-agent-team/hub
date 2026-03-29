# System Architecture

This document describes how the nano-agent-team system works. All agents should read this for system context.

## Agent Types

- **LLM agents** (consciousness, conscience, strategist, dispatcher, chat-agent, developer, architect): Reason using Claude. Process messages, call MCP tools, emit signals.
- **Deterministic agents** (committer, whatsapp-gateway): Execute fixed scripts. No LLM reasoning. Receive secrets as env vars and file mounts.

## Communication

- **NATS JetStream**: Signal network. Messages carry pointers to Obsidian content, not data itself.
- **publish_signal**: The ONLY output mechanism. Every message received MUST end with a publish_signal call. If you don't call it, the pipeline stalls.
- **dispatch_task**: Used by dispatcher to send tasks to any agent dynamically. Publishes to agent.{id}.inbox.
- **ask_user**: Ask the user a question via chat-agent. Chat-agent is the sole relay to the user.

## Secrets

- **LLM agents NEVER receive secret values.** Not as env vars, not as files, not in any form.
- **Deterministic agents** receive secrets via SecretManager (env vars + file mounts declared in manifest required_env / required_files).
- LLM agents can call `list_secrets()` / `check_secrets()` to see what keys exist (no values).
- When work requires a secret (git push, API call), delegate to a deterministic agent.

## User Communication

- **chat-agent** is the sole user-facing agent. All channels (web UI, WhatsApp, future channels) connect TO chat-agent.
- Other agents use `ask_user` MCP tool to ask questions — chat-agent relays to user and delivers answers back via `answer_question`.
- Do NOT create new user-facing agents. Connect new channels to chat-agent.

## Data

- **Obsidian** (`/obsidian/`): Source of truth for goals, ideas, plans, tasks, insights. Write here.
- **Ticket system**: Exists but soul agents don't use it (`"tickets": []` in manifest).
- **Insights**: Each agent writes learnings to `/obsidian/Consciousness/insights/{agentId}.md`. This is your memory.

## Agent Lifecycle

- `manifest.json` declares: capabilities, subscribe_topics, outputs, mcp_permissions, required_env, required_files.
- `publish_signal` MUST be in `mcp_permissions.soul` for all pipeline agents. Without it, your completion signal is lost.
- Foreman validates manifest completeness before installing new agents.
- Hot-reload: `POST /api/agents/:id/reload` re-reads manifest, recreates consumer, restarts container — without restarting the whole system.

## Pipeline Flow

```
User → chat-agent → consciousness → conscience (approve/reject) → strategist (plan) → dispatcher (decompose + assign) → worker agents (execute) → pipeline.task.done/failed → dispatcher (next task)
```

Dispatcher discovers available agents dynamically via `list_agents`. It does not have hardcoded knowledge of who exists.

## Key Rules

1. Every input must produce an output (publish_signal).
2. Obsidian is source of truth — not tickets, not NATS messages.
3. LLM agents never touch secrets.
4. chat-agent is the only user-facing agent.
5. New agents need publish_signal in mcp_permissions to participate in the pipeline.
6. Soul agents (consciousness, conscience, strategist) think and decide — they don't do hands-on work. If a task requires research, coding, testing, or any specialized execution, delegate it to a worker agent. If the right worker doesn't exist yet, ask foreman to create one.
