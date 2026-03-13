FROM node:22-alpine
WORKDIR /app

# Tester needs: git (checkout branch for testing), curl (API)
RUN apk add --no-cache curl git bash

# Git global config
RUN git config --global user.email "tester-agent@nano-agent-team" && \
    git config --global user.name "Tester Agent"

# Copy package files and install production dependencies
COPY agent-runner/package.json agent-runner/package-lock.json* ./
RUN npm ci --omit=dev

# Copy compiled JavaScript
COPY agent-runner/dist/ ./dist/

RUN mkdir -p /workspace/vault /workspace/sessions /workspace/agent /workspace/personal

CMD ["node", "dist/index.js"]
