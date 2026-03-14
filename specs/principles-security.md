# Security Principles

> Validate at the boundary, trust nothing from users, prepare for multi-tenant from day one.

## Core Principles

### 1. Input Validation at the Boundary
All markdown input is untrusted. The Rust parser validates and sanitizes before producing the graph IR. No raw user content passes through to the frontend unsanitized.

### 2. No Secrets in Code
API keys, OAuth credentials, and AWS configuration live in environment variables or a secrets manager — never in source code or config files checked into git.

### 3. Multi-Tenant Readiness
Even though v1 is local, design data paths assuming users will only see their own content. No global mutable state. User context is explicit, not ambient.

### 4. Content Security
The visualization renders user-provided concept labels and descriptions. All text content must be escaped/sanitized before DOM insertion to prevent XSS. React's default escaping handles most cases — avoid `dangerouslySetInnerHTML`.

### 5. OAuth as the Only Auth Path (Web Mode)
When deployed, authentication is via OAuth (provider TBD). No custom password storage. Session management follows standard practices (httpOnly cookies, short-lived tokens).

## Patterns to Follow
- `.env` files in `.gitignore` for local secrets
- Input size limits on markdown files (prevent DoS via massive inputs)
- CORS configuration for API endpoints (future)
- Content-Security-Policy headers on the web app (future)

## Anti-Patterns to Avoid
- Rendering user-provided HTML or markdown as raw HTML in the frontend
- Storing credentials in localStorage
- Processing arbitrarily large files without limits
- Exposing internal error details to users in production

## See Also
- [Architecture Principles](principles-architecture.md)
- [Development Principles](principles-development.md)
