FROM nano-agent:latest

# Developer needs build/test tools — no SSH, no GH_TOKEN (Committer handles git push)
# Base image already includes: git, curl, wget, gh CLI, node/npm, bash

# Python (for Python projects)
RUN apt-get update && apt-get install -y python3 python3-pip && rm -rf /var/lib/apt/lists/*

# Git global config (local commits only — push delegated to Committer)
RUN git config --global user.email "developer-agent@nano-agent-team" && \
    git config --global user.name "Developer Agent"
