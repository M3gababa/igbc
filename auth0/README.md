# auth0/

Reserved for Auth0 tenant-level flow customization shared across the IGBC tenant
(`auth.sheev.fr`). No code here yet. Will hold:

- **Actions** (`.js`) — custom serverless functions run at points in the authentication flow,
  e.g. post-login, pre-user-registration.
- **Forms** (`.json`) — Auth0 Forms definitions used within those flows (e.g. pre-registration,
  Guardian enrollment).

Application/platform-specific Auth0 config (client IDs, callback URLs, SDK usage) lives in each
platform's own folder and `CLAUDE.md` — see the root [`README.md`](../README.md).
