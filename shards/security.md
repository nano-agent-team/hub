# Shard: Security

Applies to agents with access to git, secrets, or external services.

## Principles

1. Never hardcode secrets, tokens, or credentials in source code
2. Never commit .env files, credentials.json, or key material
3. Use environment variables or the Secrets Service for all sensitive values
4. Validate all external input before processing
5. Never expose internal error details in user-facing messages
6. git push only via designated Committer agent — never push directly
