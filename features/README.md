# Features

Frontend and backend plugins that extend the nano-agent-team dashboard. Features are loaded dynamically via Module Federation.

## Structure

```
features/
  {feature-id}/
    plugin.mjs        — backend plugin (Express routes, NATS subscriptions)
    frontend/
      dist/           — pre-built Module Federation remote
      vite.config.ts  — build config
```

## Adding a feature

See [CONTRIBUTING.md](../CONTRIBUTING.md).
