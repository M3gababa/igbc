# IGBC — InterGalactic Banking Clan

Multi-platform demo application showcasing Auth0 authentication capabilities.
The IGBC (Star Wars — InterGalactic Banking Clan) theme is a story wrapper for demonstrations.

---

## Platforms

| Platform | Folder | Stack | Status |
|---|---|---|---|
| Android | `android/` | Kotlin, Jetpack Compose, Koin | ✅ Login + original 7 screens working, Guardian stubbed pending Firebase. 🔧 Nav/screen UX redesign pending (mock data, no live API from mobile yet) — see `android/CLAUDE.md` TODO section |
| iOS | `ios/` | Swift, SwiftUI | ✅ Login (custom scheme, temporary) + original 7 screens working, Guardian stubbed pending APNs — see `ios/CLAUDE.md`. 🔧 Nav/screen UX redesign pending (mock data, no live API from mobile yet) — see `ios/CLAUDE.md` TODO section |
| Web | `webapp/` | Vue 3 + Fastify BFF | ✅ Login/session/debug working via BFF. ✅ Full SCREENS.md/THEME.md redesign shipped 2026-07-27 — 13 routes, master-detail Accounts, Transfers/Send/Cancel, Payment Contest, Activity, Dashboard analytics, all proxied through the BFF — see `webapp/CLAUDE.md` "Resolved" section. Adapted same-day to `api/`'s balance-mutation change (below) |
| API | `api/` | Fastify/JS + MongoDB | ✅ Full CRUD for `users`/`accounts`/`payments`/`transfers`, backed by MongoDB (Atlas) with Auth0 JWT + Auth0 FGA object-level authorization — see `api/CLAUDE.md`. ✅ SCREENS.md gaps resolved 2026-07-27 (payment dispute fields, account lookup endpoint, server-side account number generation), now wired into `webapp/`. ✅ Transfers/payments now move real balance atomically on creation (2026-07-27) — see `api/CLAUDE.md` "Account Balance Mutation" |

Each platform has its own `CLAUDE.md` with stack-specific details.
Shared design decisions live here and in `THEME.md` / `SCREENS.md`.

---

## Auth0 Tenant (shared across all platforms)

| Field | Value |
|---|---|
| Custom domain | `auth.sheev.fr` |
| Raw tenant | `bduvey-training.cic-demo-platform.auth0app.com` (corrected 2026-07-31 — was documented as `bduvey-training.auth0.com`, which doesn't resolve; confirmed via `auth0 tenants list`) |
| Audience | `api://sheev/v1` |
| MFA factor | Guardian push notifications |
| Push delivery | Amazon SNS → platform push (FCM for Android, APNs for iOS) |

Each platform registers a **separate application** in the Auth0 dashboard.
The Android client ID is already configured. iOS and Web will need new applications.

**Callback URL pattern:**
- Android: `https://auth.sheev.fr/android/com.sheev.igbc/callback`
- iOS: `https://auth.sheev.fr/ios/com.sheev.igbc/callback`
- Web BFF: `http://localhost:3000/auth/callback` (dev) / `https://YOUR_PROD_DOMAIN/auth/callback` (prod)

**Auth0 application types:**
- Android: Native
- iOS: Native
- Web BFF: **Regular Web Application** (holds client secret server-side)

**App package / Bundle ID:** `com.sheev.igbc` (used across Android and iOS for consistency)

---

## Shared Design

See `THEME.md` for the full palette. Quick reference:

| Token | Hex | Use |
|---|---|---|
| SpaceBlack | `#0A0A12` | App background |
| SpaceDeep | `#14141F` | Surface / cards |
| GoldPrimary | `#D4A800` | Primary accent, buttons |
| CreditGreen | `#4CAF82` | Positive amounts |
| AlertRed | `#CF6679` | Errors, destructive actions |

**Assets:** `igbc_logo.png` (transparent background), `auth0_shield_white.png`
**Currency:** "Galactic Credits" (full) or "cred" (abbreviated, lowercase)

---

## Canonical Screens

**As of 2026-07-27, mobile and web no longer implement "the same 7 screens" — they have deliberately different navigation shapes**, built from a larger shared set of underlying screens (Accounts, Transfers, Payments, Full Activity, and platform-specific takes on "Dashboard"). `SCREENS.md` is now the single source of truth for both — don't duplicate its screen list here, it will just drift again (like this section did). Read `SCREENS.md` in full before touching navigation or screen content on any platform.

Quick orientation:
- **Mobile** (Android/iOS): 4 tabs — Dashboard (account switcher + ledger), Transfers, Profile, Others (tile grid → Security, Debug). MFA Approval stays push-triggered only, never a tab.
- **Web**: two-row header — Row 1 (utility: Profile/Security/Debug/Logout), Row 2 (banking menu: Dashboard/Accounts/Transfers). Web's "Dashboard" means analytics/graphs; mobile's "Dashboard" means the account+ledger workhorse — same word, different screen, see `SCREENS.md` for why.
- Profile was redesigned around real ID token claims (standard + the `api://sheev/v1/` custom namespace) instead of a raw claims dump — that's `DebugScreen`'s job now.
- `THEME.md` picked up explicit contrast rules (2026-07-27) after the live webapp shipped with under-contrast text — every platform's CLAUDE.md TODO section references this.

**Build order for this round of changes, per explicit user preference:** `api/` → `webapp/` → `android/` → `ios/`. `api/` and `webapp/` are done as of 2026-07-27 (see their CLAUDE.md "Resolved" sections) — `android/` is next. Each repo's own `CLAUDE.md` has a dated TODO section with the concrete work items and open decisions for that repo — that's where to start in each one, not here.

---

## Critical Auth0 SDK Learnings (Android — apply when starting iOS/Web)

**Auth0 v4 Android SDK (`4.0.1`):**
- `WebAuthProvider` with `.start()` requires `registerCallbacks()` in `onCreate()` or the URL construction breaks (all params collapse into the `scope` parameter). **Always use `.await()` (coroutine API) instead** — it does not require `registerCallbacks()`.
- `SecureCredentialsManager` and `CredentialsManager` constructors are `internal` in v4.0.x — cannot be instantiated from app code. Workaround: store tokens manually in `SharedPreferences` and reconstruct `Credentials` objects as needed.
- `Credentials` has no `.claims` map and no `.user` property — decode the ID token JWT manually (base64url-decode the payload segment).
- Manifest placeholders must use **literal string values**, not `@string/` resource references. `@string/com_auth0_domain` in a manifest placeholder stays as the literal text and breaks App Links routing.

**Auth0.swift (iOS — confirmed, v3.0.1):**
- Pin **v3.0.1**, not v4 — the earlier v4 mention here was wrong. `logout()` replaced `clearSession()` as of v3.0.0.
- The default `.start()`/`.logout()` flow uses `ASWebAuthenticationSession`, which captures the callback by scheme match internally — **no `CFBundleURLTypes` Info.plist entry is needed**. The callback scheme defaults to the bundle identifier and must match the Auth0 Dashboard's Allowed Callback/Logout URLs (`{scheme}://auth.sheev.fr/ios/com.sheev.igbc/callback`).
- Universal Links are opt-in via `.useHTTPS()` (not `.useUniversalLink()`), and require the **Associated Domains** entitlement — which a free "Personal Team" cannot provision (needs a paid Apple Developer Program membership). **Currently deferred**: the app logs in with the default custom-scheme flow using scheme `com.sheev.igbc` (the bundle identifier). Switch to `.useHTTPS()` once a paid account exists — the Auth0 Native app (`IGBC/Resources/Auth0.plist`) will then need the `https://` callback added alongside the custom-scheme one, and Team ID + Bundle ID registered under Auth0 Dashboard → Advanced Settings → Device Settings.
- `CredentialsManager` is Keychain-backed and its biometric methods (`enableBiometrics`) are `mutating` — declare instances as `var`, not `let`. `store(credentials:)` and `clear()` both `throws`. Check validity with `hasValid(minTTL:)`.
- The project has `SWIFT_UPCOMING_FEATURE_MEMBER_IMPORT_VISIBILITY = YES` (Xcode 16 default) — any file that touches a `Credentials` property (e.g. `.idToken`) needs its own `import Auth0`, even if it never calls `Auth0.webAuth()` directly and only receives a `Credentials` value from `AuthSession`.

**`@auth0/auth0-fastify` (Web BFF — apply when starting webapp):**
- BFF uses `@auth0/auth0-fastify`; API resource server uses `@auth0/auth0-fastify-api`. Both require Fastify v5 + Node 20 LTS+.
- The BFF auto-mounts `/auth/login`, `/auth/callback`, `/auth/logout`, `/auth/backchannel-logout` — do not define these routes manually.
- `getAccessToken({ request, reply })` handles silent token refresh automatically; call it on every proxied request to the API.
- Auth0 app type for the BFF must be **Regular Web Application** (not SPA) — the client secret is held server-side.

---

## Prerequisites Not Yet Completed

| Item | Needed for |
|---|---|
| Firebase project + `google-services.json` | Android Guardian push |
| APNs certificate/key configured on Auth0 | iOS Guardian push |
| Amazon SNS → APNs endpoint registration | iOS Guardian push |
| `api/` publicly reachable from mobile (not yet published anywhere Android/iOS can reach) | Wiring Android/iOS's new mock-data screens to real data — until then, build against mocks per each platform's `CLAUDE.md` TODO section |

---

## Build Environment Notes (Android)

- Gradle must use Android Studio's bundled JDK (Java 21), not system Java 25 — pinned via `org.gradle.java.home` in `android/gradle.properties`
- Guardian SDK 0.7.0 has a broken `okhttp-bom` transitive dependency — excluded in `app/build.gradle.kts` with `okhttp:4.12.0` added directly
- `android.suppressUnsupportedCompileSdk=37.0` is set because AGP 8.10.1 was tested up to SDK 36

---

## Deployment (2026-08-01)

`api/` and `webapp/` now have Docker + AWS deployment tooling in place — **not yet actually
deployed to AWS**, this is the groundwork (Dockerfiles, docs, secrets plan), not a live
production status update to the Platforms table above.

**Target:** `api/` → `https://api.igbc.sheev.fr`, `webapp/` → `https://igbc.sheev.fr`, both as
**Amazon ECS Express Mode** services (Fargate) sharing one auto-provisioned ALB (host-header
routed). Express Mode was chosen because **AWS App Runner stopped accepting new customers as of
2026-04-30** — it's AWS's recommended replacement and needs a container image rather than
building from source, hence the Dockerfiles.

- **Docs are split by scope, not by platform-and-scope:** `IGBC/DEPLOYMENT.md` is **local-only**
  (Docker run steps for `api/`/`webapp/`, plus native build/run steps for `android/`/`ios/`).
  `api/DEPLOYMENT.md` and `webapp/DEPLOYMENT.md` are **AWS-only** (ECR push, Secrets Manager, ECS
  Express Mode service creation, ACM/ALB/Route 53 custom-domain wiring). Don't add local-run
  content back into the per-service docs — that duplication is what this split was fixing.
- **`IGBC/scripts/local-deploy.sh`** — wraps the full local Docker flow (build both images, network,
  health-check wait, run both, `up`/`down`/`logs`/`status`) so `IGBC/DEPLOYMENT.md`'s manual
  commands don't have to be typed by hand each time.
- **Every `.env` value goes into AWS Secrets Manager** for both services, not just the
  traditionally-"secret" ones (domains, store/client IDs included) — explicit user decision,
  since they're still tenant-specific config that shouldn't drift between environments. The only
  exception is `PORT`, which isn't a credential and is set directly on the ECS service.
- **MongoDB Atlas stays on a `0.0.0.0/0` network allowlist** (auth still enforced via
  username/password + TLS) rather than a VPC connector + NAT gateway for a static egress IP —
  deliberately simple, this is a demo tenant, not a production banking system.
- **Deploys are manual for now** (`docker build` → push to ECR → `aws ecs update-service
  --force-new-deployment`) — no CI/CD pipeline yet, automate later if it becomes annoying.
- **`webapp/` is a single deployable, single origin:** the BFF (`bff/src/index.js`) now serves the
  built Vue frontend directly via `@fastify/static` + SPA fallback when `frontend/dist` exists,
  falling back to the old dev-server redirect when it doesn't. This keeps `igbc.sheev.fr` a single
  origin (the BFF's Auth0 session is a cookie — splitting frontend/BFF across origins would mean
  cross-site cookies for no benefit here). No separate S3/CloudFront deployment for the frontend.
- **Both ECS Express Mode services build/push amd64 images (`docker buildx build --platform
  linux/amd64`), even though local dev happens on an Apple Silicon Mac** — Express Mode's console
  create flow is locked to X86_64 with no CPU architecture picker exposed (confirmed against the
  live console, 2026-08-03); ARM64/Graviton is only reachable via a separate post-create
  custom-task-definition CLI update (`aws ecs update-express-gateway-service
  --task-definition-arn ...`), not worth the added complexity for this demo. A plain `docker build`
  on Apple Silicon produces an arm64 image, which fails at container start with
  `exec /usr/local/bin/docker-entrypoint.sh: exec format error` — always keep the `--platform
  linux/amd64` flag on these builds, don't drop it.
- **Real bug fixed along the way:** `api/src/index.js` was calling `fastify.listen({ port })`
  without `host: '0.0.0.0'` — it only bound to loopback, unreachable from outside any container.
  Don't reintroduce a bare `fastify.listen({ port })` there.
- **Corporate TLS-intercepting proxy note (local dev only):** if `docker run` for either service
  fails with `self-signed certificate in certificate chain` on any outbound HTTPS call
  (Auth0/Mongo/FGA), it's a TLS-inspecting corporate proxy — the host trusts its root CA via the OS
  keychain, the container's minimal CA bundle doesn't. `IGBC/scripts/prisma_certificates.pem`
  (Okta's decryption proxy CA chain) fixes this via `NODE_EXTRA_CA_CERTS`, already wired into
  `local-deploy.sh` and documented in `IGBC/DEPLOYMENT.md`. This is an AWS-deployment non-issue —
  Fargate tasks won't sit behind this proxy.

---

## How to Work in This Repo

**Cross-platform session** (theme, Auth0 config, shared decisions):
Start Claude Code from the `IGBC/` parent folder. This file is loaded automatically.

**Platform-specific session** (write code for one platform):
Start Claude Code from `IGBC/android/`, `IGBC/ios/`, `IGBC/webapp/`, or `IGBC/api/`.
Both this file and the platform's own `CLAUDE.md` are loaded automatically.
