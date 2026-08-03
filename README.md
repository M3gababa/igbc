# IGBC — InterGalactic Banking Clan

Multi-platform demo application showcasing [Auth0](https://auth0.com) authentication
capabilities: native mobile login, a server-side web BFF, a JWT + FGA-secured API, and (soon) an
MCP server exposing the same backend as tools for AI agents. The IGBC ("InterGalactic Banking
Clan", Star Wars) theme is a story wrapper for demos — not a production banking system.

Full architecture, Auth0 tenant config, shared design tokens, and cross-platform decisions live in
[`CLAUDE.md`](CLAUDE.md) — read that first for anything spanning more than one platform.

---

## Child repositories

Each platform is its own git repository, checked out as a subfolder here. Start a session inside
a platform's folder to work on it — its own `CLAUDE.md` loads alongside this root one.

| Platform | Folder | Stack | Docs |
|---|---|---|---|
| API | [`api/`](api/) | Fastify/JS + MongoDB, Auth0 JWT + FGA | [`api/CLAUDE.md`](api/CLAUDE.md) |
| Web | [`webapp/`](webapp/) | Vue 3 + Fastify BFF | [`webapp/CLAUDE.md`](webapp/CLAUDE.md) |
| Android | [`android/`](android/) | Kotlin, Jetpack Compose, Koin | [`android/CLAUDE.md`](android/CLAUDE.md) |
| iOS | [`ios/`](ios/) | Swift, SwiftUI | [`ios/CLAUDE.md`](ios/CLAUDE.md) |
| MCP server | [`mcp/`](mcp/) | Model Context Protocol server (not started) | [`mcp/CLAUDE.md`](mcp/CLAUDE.md) |

See [`CLAUDE.md`](CLAUDE.md)'s Platforms table for current build status of each.

---

## Folder structure

```
IGBC/
├── android/       Native Android app (own git repo)
├── api/           Backend API (own git repo)
├── ios/           Native iOS app (own git repo)
├── mcp/           MCP server exposing api/ to AI agents (own git repo)
├── webapp/        Web frontend + BFF (own git repo)
├── auth0/         Auth0 Actions (.js) and Forms (.json) for tenant-wide auth-flow customization
├── scripts/       Local Docker (local-deploy.sh) and AWS redeploy (aws-redeploy.sh) scripts,
│                  plus the corporate TLS cert they mount (prisma_certificates.pem)
├── images/        Shared logos/branding assets (IGBC_logo.png, Auth0_logo.png, wp13328211.jpg)
├── CLAUDE.md              Cross-platform architecture, Auth0 tenant config, shared decisions
├── DEPLOYMENT.md          Local run instructions (Docker for api/webapp, native for android/ios)
├── SCREENS.md             Canonical screen list/navigation for mobile + web
├── THEME.md               Shared color palette and contrast rules
├── aws_deployment_tasks.md   AWS ECS Express Mode setup + ongoing redeploy steps
└── architecture.html      Standalone architecture diagram
```

`android/`, `api/`, `ios/`, `mcp/`, and `webapp/` are separate git repositories (see
[`.gitignore`](.gitignore)) — commits to those folders happen in their own repos, not this one.

---

## Where to look for what

- **Auth0 tenant, callback URLs, SDK quirks per platform:** [`CLAUDE.md`](CLAUDE.md)
- **Running everything locally:** [`DEPLOYMENT.md`](DEPLOYMENT.md) and [`scripts/`](scripts/)
- **Deploying `api/`/`webapp/` to AWS:** `api/DEPLOYMENT.md`, `webapp/DEPLOYMENT.md`,
  [`aws_deployment_tasks.md`](aws_deployment_tasks.md)
- **Screens and navigation:** [`SCREENS.md`](SCREENS.md)
- **Colors and contrast rules:** [`THEME.md`](THEME.md)
- **What to build next on a given platform:** that platform's own `CLAUDE.md` TODO section
