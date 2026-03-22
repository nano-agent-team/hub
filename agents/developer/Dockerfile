FROM nano-agent:latest

USER root

# Developer needs build/test tools
RUN apt-get update && apt-get install -y python3 python3-pip && rm -rf /var/lib/apt/lists/*

# Git global config
RUN git config --global user.email "developer-agent@nano-agent-team" && \
    git config --global user.name "Developer Agent"

# Copy superpowers skills
COPY skills/dev/ /home/agent/.claude/skills/

# Back to non-root
USER agent
