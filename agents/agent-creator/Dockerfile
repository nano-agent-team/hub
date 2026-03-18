FROM nano-agent:latest

# Extra tooling for researching packages and APIs during agent design
RUN apt-get update && apt-get install -y \
    jq \
    python3 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

# pip for inspecting Python packages
RUN pip3 install --no-cache-dir pip-search 2>/dev/null || true
