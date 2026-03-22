FROM nano-agent:latest
USER root

# E2E Tester needs Playwright and browser dependencies
RUN apt-get update && apt-get install -y \
    chromium \
    chromium-driver \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnss3 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxkbcommon0 \
    libxrandr2 \
    xvfb \
    && rm -rf /var/lib/apt/lists/*

# Install Playwright
RUN npm install -g @playwright/test && npx playwright install chromium --with-deps 2>/dev/null || true

ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
ENV DISPLAY=:99

# Ensure Playwright browser binaries are readable by agent user
RUN chmod -R o+rx /ms-playwright || true

USER agent
