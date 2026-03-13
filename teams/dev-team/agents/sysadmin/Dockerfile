FROM node:22-alpine
WORKDIR /app

# Sysadmin needs: git (merge/tag), gh (PR merge, releases), curl (API)
RUN apk add --no-cache curl git bash openssh-client

# Install gh CLI
RUN apk add --no-cache github-cli 2>/dev/null || \
    (ARCH=$(uname -m) && \
     if [ "$ARCH" = "x86_64" ]; then \
       wget -q https://github.com/cli/cli/releases/download/v2.45.0/gh_2.45.0_linux_amd64.tar.gz -O /tmp/gh.tar.gz && \
       tar -xzf /tmp/gh.tar.gz -C /tmp && \
       mv /tmp/gh_2.45.0_linux_amd64/bin/gh /usr/local/bin/gh && \
       rm -rf /tmp/gh*; \
     elif [ "$ARCH" = "aarch64" ]; then \
       wget -q https://github.com/cli/cli/releases/download/v2.45.0/gh_2.45.0_linux_arm64.tar.gz -O /tmp/gh.tar.gz && \
       tar -xzf /tmp/gh.tar.gz -C /tmp && \
       mv /tmp/gh_2.45.0_linux_arm64/bin/gh /usr/local/bin/gh && \
       rm -rf /tmp/gh*; \
     fi)

# SSH config
RUN mkdir -p /root/.ssh && \
    ssh-keyscan github.com >> /root/.ssh/known_hosts && \
    chmod 700 /root/.ssh

RUN git config --global user.email "sysadmin-agent@nano-agent-team" && \
    git config --global user.name "Sysadmin Agent"

# Copy package files and install production dependencies
COPY agent-runner/package.json agent-runner/package-lock.json* ./
RUN npm ci --omit=dev

# Copy compiled JavaScript
COPY agent-runner/dist/ ./dist/

RUN mkdir -p /workspace/vault /workspace/sessions /workspace/agent

CMD ["node", "dist/index.js"]
