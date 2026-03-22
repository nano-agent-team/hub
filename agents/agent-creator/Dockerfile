FROM nano-agent:latest
USER root

# jq for inspecting JSON manifests during agent design
RUN apt-get update && apt-get install -y jq && rm -rf /var/lib/apt/lists/*

USER agent
