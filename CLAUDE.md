# IGBC — InterGalactic Banking Clan

Multi-platform demo application showcasing Auth0 authentication capabilities.
The IGBC (Star Wars — InterGalactic Banking Clan) theme is a story wrapper for demonstrations.

---

## Platforms

| Platform | Folder | Stack | Status |
|---|---|---|---|
| Android | `android/` | Kotlin, Jetpack Compose, Koin | ✅ Fully wired to the live `api/` — SCREENS.md/THEME.md nav redesign, real data, Management-API-backed Security/MFA/sessions all shipped 2026-08-04. ✅ 2026-08-05: delete/close account, step-up MFA (SCA) on the same 3 call sites as webapp/iOS, and real Profile edit + Consent Management wiring (`EditProfileScreen`, `GET`/`PUT /api/profile`) all shipped too — full parity with `webapp/`/`ios/`, nothing decorative left. Guardian still stubbed pending Firebase — kept on the native-SDK path deliberately, not switching to iOS's ticket-URL simplification — see `android/CLAUDE.md`'s "Resolved" section |
| iOS | `ios/` | Swift, SwiftUI | ✅ Fully wired to the live `api/` — SCREENS.md/THEME.md nav redesign, real data, step-up MFA, delete/close account, and real Profile/Consent wiring all shipped 2026-08-05 (parity with Android/webapp built in from the start, not a later retrofit). ⚠️ 2026-08-06: on-device Guardian SDK removed (personal-team code-signing wall on Push Notifications capability + a `Result` type collision with Guardian.swift) and **temporarily** replaced with Management-API-backed ticket-URL enrollment for every MFA factor. **User confirmed same day the native SDK will be reintroduced** once the Apple Developer Program is purchased (fixes the signing wall) — see "Prerequisites Not Yet Completed" §1.3 for the re-add plan and `ios/CLAUDE.md`'s two 2026-08-05/2026-08-06 "Resolved" sections for what's there today |
| Web | `webapp/` | Vue 3 + Fastify BFF | ✅ Login/session/debug working via BFF. ✅ Full SCREENS.md/THEME.md redesign shipped 2026-07-27 — 13 routes, master-detail Accounts, Transfers/Send/Cancel, Payment Contest, Activity, Dashboard analytics, all proxied through the BFF — see `webapp/CLAUDE.md` "Resolved" section. Adapted same-day to `api/`'s balance-mutation change (below). ✅ 2026-08-05: GDPR "Delete my account" wired on the Profile Danger Zone (soft-block + cascade via `api/`'s `DELETE /api/profile`, step-up MFA → confirm → delete → logout), and the account-delete flow simplified to a plain passthrough now that `api/` enforces the empty-balance guard server-side — see `webapp/CLAUDE.md`'s two 2026-08-05 "Resolved" sections |
| API | `api/` | Fastify/JS + MongoDB | ✅ Full CRUD for `users`/`accounts`/`payments`/`transfers`, backed by MongoDB (Atlas) with Auth0 JWT + Auth0 FGA object-level authorization — see `api/CLAUDE.md`. ✅ SCREENS.md gaps resolved 2026-07-27 (payment dispute fields, account lookup endpoint, server-side account number generation), now wired into `webapp/`. ✅ Transfers/payments now move real balance atomically on creation (2026-07-27) — see `api/CLAUDE.md` "Account Balance Mutation". ✅ 2026-08-05: public `/api/test` debug route removed, GDPR `DELETE /api/profile` shipped (soft-block via Management API + cascade-delete owned Accounts/Payments/Transfers), and `DELETE /api/accounts/:id` now enforces the empty-balance guard server-side — see `api/CLAUDE.md`'s three 2026-08-05 "Resolved" sections |

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

**Build order for this round of changes, per explicit user preference:** `api/` → `webapp/` → `android/` → `ios/`. `api/`, `webapp/`, and `android/` are done (`android/` as of 2026-08-04 — see its CLAUDE.md "Resolved" section) — this round is complete. See "Next Steps" below for the next round's order (which reprioritizes `ios/` behind further `api/`/`webapp/`/`android/` work). Each repo's own `CLAUDE.md` has a dated TODO section with the concrete work items and open decisions for that repo — that's where to start in each one, not here.

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

**Resolved 2026-08-03 (api/ reachability), superseded 2026-08-04 (Android), superseded 2026-08-05
(iOS):** `api/` is publicly reachable at `https://api.igbc.sheev.fr` (see "Deployment" above).
`android/` wired its mock-data screens to the real API and shipped the full SCREENS.md/THEME.md
redesign on 2026-08-04, then delete/close account + step-up MFA + real Profile/Consent wiring on
2026-08-05. `ios/` did the full redesign + that same feature set together on 2026-08-05. Neither
`android/CLAUDE.md` nor `ios/CLAUDE.md` has an open "mock data" TODO anymore.

The one prerequisite still genuinely open is **real Guardian push notifications** — split below
into what needs external setup (1.1) vs. what each app's own code needs (1.2/1.3), per the user's
2026-08-06 request. **iOS is a special case, but the decision is now made (2026-08-06):** its
on-device Guardian SDK was fully removed 2026-08-06 (personal-team code-signing wall + a `Result`
type name collision with Guardian.swift — see `ios/CLAUDE.md`'s 2026-08-06 "Resolved" section) and
temporarily replaced with browser-ticket-URL enrollment via `api/`'s Management API routes. **The
user has since confirmed the native SDK will be reintroduced** — so 1.1's Apple Developer Program
purchase and 1.3's iOS code changes are both in scope, not conditional. That purchase is what
actually fixes the signing blocker that caused the removal in the first place; skipping it would
just reproduce the same failure. Android was never blocked that way and can proceed on 1.1/1.2
independently of when the iOS purchase happens.

### 1.1 — External prerequisites: what to create/buy/configure

Nothing here can be done by editing code — these are console/account/purchase actions on Firebase,
Apple, AWS, and the Auth0 Dashboard. Do these before touching either app's source.

**Firebase (Android only):**
- Create a Firebase project (console.firebase.google.com) and add an Android app to it with package
  name `com.sheev.igbc` (must match exactly — see `CLAUDE.md`'s shared "App package / Bundle ID").
- Download the generated `google-services.json` and place it at `android/app/google-services.json`
  (gitignored, same treatment as `Auth0.plist`/other credential files — confirm it's covered by
  `android/.gitignore` before committing anything else in that repo).
- In Firebase Console → Project Settings → **Cloud Messaging**, confirm the Firebase Cloud
  Messaging API (V1) is enabled (the legacy HTTP/Server-Key API Google deprecated in June 2024 is
  no longer an option — Auth0's dashboard field for this expects the newer Service Account key, not
  the old Server Key string).
- In Firebase Console → Project Settings → **Service Accounts**, click "Generate New Private Key" —
  this downloads a JSON credential file. This file (not `google-services.json`) is what gets
  uploaded to Auth0's Dashboard in the Android App Configuration step below.

**Apple Developer Program (iOS — confirmed 2026-08-06, the native SDK is being reintroduced):**
- Buy/enroll in the paid **Apple Developer Program** ($99/year). This is the actual fix for the
  blocker that caused the 2026-08-06 removal — Push Notifications as a capability fails automatic
  code-signing on a free "Personal Team." Without this purchase, none of 1.3 below is buildable on
  a physical device (Simulator can't receive real APNs pushes either way).
- Once enrolled, in Xcode → Signing & Capabilities for the `IGBC` target, switch the team to the
  paid one and add the **Push Notifications** capability — this regenerates `IGBC.entitlements`
  with an `aps-environment` key (`development` for Xcode/ad-hoc builds, `production` for
  TestFlight/App Store).
- Generate APNs credentials from the Apple Developer portal: create a new APNs certificate (or the
  newer `.p8` auth key — confirm which format the current Auth0 Dashboard field accepts, since
  Auth0's docs describe the older P12-certificate flow below). For the P12 path: install the
  generated certificate locally, locate "Apple Push Services: {AppId}" (or "Apple Sandbox Push
  Services: {AppId}" for dev) in Keychain Access, and export certificate + private key together as
  a `Certificates.p12` with **no password**. Auth0's docs additionally recommend re-encoding it to
  Triple DES via OpenSSL (extract key and cert separately, re-combine, discard the original) — do
  this only if the plain export is rejected on upload.
- Register the app's **Team ID + Bundle ID** under Auth0 Dashboard → Applications → the iOS Native
  app → Advanced Settings → Device Settings (this is also required for the still-deferred Universal
  Links switch documented earlier in this file — one less thing to redo if that ever happens too).

**AWS (both platforms, since Auth0 routes Guardian push through Amazon SNS):**
- Create (or reuse) an IAM user/access key with SNS mobile-push permissions: at minimum
  `sns:CreatePlatformApplication`, `sns:SetPlatformApplicationAttributes`,
  `sns:GetPlatformApplicationAttributes`, `sns:DeletePlatformApplication`,
  `sns:CreatePlatformEndpoint`, `sns:GetEndpointAttributes`, `sns:SetEndpointAttributes`,
  `sns:DeleteEndpoint`, and `sns:Publish`. Auth0/Guardian creates the per-device Platform
  Application **endpoints** automatically at enrollment time using these credentials — you don't
  need to pre-create individual device endpoints yourself, just the IAM identity with permission to
  do so.
- Record the Access Key ID, Secret Access Key, and AWS Region you'll use — these three values go
  directly into the Auth0 Dashboard (next section), not into either app's code or config.
- Given [[feedback_demo_infra_simplicity]]'s existing rule (every env var goes into Secrets
  Manager, not just "secret" ones), plan to add these three SNS values there once real testing
  starts, matching how `api/`/`webapp/`'s other tenant config is already handled.

**Auth0 Dashboard (ties the above together — do this last):**
- Security → Multi-factor Auth → enable **Push Notifications** (Guardian), then switch it from the
  default Auth0-hosted dev service to **Custom** → **Amazon SNS**, and fill in the AWS Access Key
  ID / Secret Access Key / Region from above. Save.
- Still under Custom, an **Android App Configuration** section appears: toggle it enabled, provide
  a Play Store URL (a placeholder is fine for this demo tenant — it's just a link shown to
  end-users during enrollment), and upload the Firebase **Service Account** JSON from the Firebase
  step above (labeled "FCM Server Credentials" in the Dashboard).
- An **iOS App Configuration** section (only needed if 1.3 is in scope): toggle it enabled, provide
  an App Store URL placeholder, the APNs Bundle ID (`com.sheev.igbc`), upload the P12 certificate
  from the Apple step above, and set the iOS App Environment (sandbox vs. production) to match
  which `aps-environment` value the Xcode build actually uses.
- **Verify current tenant state before assuming a blank slate** — Android's Guardian factor may
  already be toggled on against Auth0's default (non-SNS) dev push service from earlier
  experimentation; check what's already configured rather than re-doing steps that are done.

### 1.2 — Android application changes required

Confirmed against the actual current source (not just the CLAUDE.md description) — the scaffolding
already exists and is deliberately stubbed pending 1.1 above:
- `app/build.gradle.kts` already depends on `com.auth0.android:guardian:0.7.0` (with the
  `okhttp-bom` exclusion workaround from "Build Environment Notes" above) — the SDK dependency
  itself needs no change.
- `AndroidManifest.xml` already has a **commented-out** `<service>` block for a
  `.push.IgbcMessagingService` FCM listener, with a comment saying to uncomment once
  `google-services.json` is added — that class doesn't exist yet and needs to be written.
- `GuardianRepositoryImpl.kt` (`data/repository/`) has real method signatures but every body is a
  `TODO`/`NotImplementedError` stub: `enroll()`, `removeEnrollment()` (only clears local
  `SharedPreferences` today, never tells the Auth0 server), `allowChallenge()`, `denyChallenge()`.
  `EnrollmentViewModel`/`GuardianViewModel` are thin real ViewModels already wired to call through
  to this repository — they don't need rework, just a working repository underneath.

What still needs writing:
1. Add the Google Services Gradle plugin (`com.google.gms.google-services`) to the top-level and
   app-level `build.gradle.kts`, plus the Firebase BoM + `firebase-messaging` dependency in
   `libs.versions.toml`.
2. Write `push/IgbcMessagingService.kt extends FirebaseMessagingService`: `onNewToken(token)` should
   refresh the stored Guardian device token if already enrolled; `onMessageReceived(message)` should
   call `Guardian.parseNotification(message.data)` — a null result means it wasn't a Guardian push
   and should fall through untouched, a non-null result should route to `MfaApprovalScreen`
   (already scaffolded per the file tree, currently unimplemented) via the same
   `MainActivity`-reads-the-intent pattern `SCREENS.md` already describes for this flow.
3. Uncomment the `<service>` block in `AndroidManifest.xml` once that class exists.
4. Implement `GuardianRepositoryImpl.enroll(fcmToken)`: build a `Guardian.Builder().domain("auth.sheev.fr").build()`
   instance, generate a 2048-bit RSA key pair (needs real Keystore-backed storage — today's
   plain-`SharedPreferences` persistence won't safely hold a private key; this is genuinely new
   design, not just wiring), get the enrollment ticket by reusing the **existing**
   `SecurityRepository` call to `api/`'s `/api/security/mfa/enroll` with the push/Guardian factor
   key (same endpoint the other 3 factors already use — no `api/` changes needed), and pass the
   response's `ticket_url` as the `enrollmentUri` into `Guardian.enroll(uri, currentDevice,
   keyPair)`. Persist the resulting `Enrollment` (id, token) alongside the key pair reference.
5. Implement `removeEnrollment()` to actually call `guardian.delete(enrollment)` against Auth0
   before clearing local prefs — today it only does the local half.
6. Implement `allowChallenge()`/`denyChallenge()` via
   `guardian.authentication(...).allow(notification)` / `.reject(notification, reason)`, matching
   the parsed notification's `enrollmentId` against the one stored enrollment.
7. Request the Android 13+ `POST_NOTIFICATIONS` runtime permission somewhere in the app-start/login
   flow — without it, a background/killed-app push won't surface a system notification at all, only
   `onMessageReceived` while the process is alive. Decide whether `IgbcMessagingService` needs to
   post its own visible `Notification` (tapping into `MfaApprovalScreen`) for the killed-app case —
   this is an open design question, not something already solved by the current stub.

### 1.3 — iOS application changes required

This is a **re-add**, not new design — Guardian.swift was fully wired once (2026-08-05) before
being removed the next day. The removal note in `ios/CLAUDE.md` names exactly what has to be done
differently this time to avoid repeating both failures:
1. Complete 1.1's Apple Developer Program purchase first — re-enabling the Push Notifications
   capability in Xcode will fail signing again on a free team, same as last time.
2. Re-add the Guardian.swift SPM package dependency (Package.swift / Xcode package list).
3. Re-enable **Push Notifications** in Xcode → Signing & Capabilities, regenerating
   `IGBC.entitlements` with `aps-environment` set appropriately for the build config.
4. Reintroduce an `AppDelegate`/`UIApplicationDelegate` (needed for push registration even in a
   SwiftUI-lifecycle app) implementing `didRegisterForRemoteNotificationsWithDeviceToken:` (capture
   the hex APNs token), `didFailToRegisterForRemoteNotificationsWithError:`, and a
   `UNUserNotificationCenterDelegate` to intercept incoming pushes via `Guardian.notification(from:)`.
   Call `UIApplication.shared.registerForRemoteNotifications()` plus a `UNUserNotificationCenter`
   authorization request (`.alert, .sound, .badge`) early in app launch.
5. Re-add the deleted pieces: `Guardian/GuardianRepository.swift`/`GuardianRepositoryImpl.swift`,
   `Models/GuardianChallenge.swift`, `Views/Guardian/`, `Views/Enrollment/`, `Views/MFAApproval/`,
   `PendingChallengeStore.swift`, `AppDependencies`' `guardianRepository`/`pendingChallengeStore`,
   `AppRouter`'s `.fullScreenCover` push-challenge presentation, and `OthersView`'s "Guardian" tile
   — check git history for the pre-2026-08-06 versions of these files as a starting point rather
   than rebuilding from scratch.
6. **Fix the actual root cause of the 2026-08-06 removal this time**, don't just re-add the same
   code: `import Guardian` shadows Swift's stdlib `Result<Success,Failure>` with Guardian.swift's
   own single-generic `Result<T>`. Disambiguate every affected `Result<Void, GuardianRepositoryError>`
   with the fully-qualified `Swift.Result<...>` (or a project-wide `typealias` for it) instead of
   the bare `Result` that broke the build last time.
7. Enrollment ticket flow mirrors Android exactly: reuse the existing `SecurityRepository` call to
   `api/`'s `/api/security/mfa/enroll` (no `api/` changes needed), pass the returned `ticket_url` as
   `usingUri:` into `Guardian.enroll(forDomain:usingUri:notificationToken:signingKey:verificationKey:)`.
   Use `KeychainRSAPrivateKey.new(with: "tag")` for the signing key — Keychain-backed, an
   improvement over Android's current raw-`SharedPreferences` approach for the equivalent secret.
8. Push-challenge resolution: `Guardian.authentication(forDomain:device:).allow(notification:)` /
   `.reject(notification:reason:)`, gated on matching `notification.enrollmentId` against the one
   stored enrollment (same single-enrollment assumption as Android, appropriate for this demo).
9. Testing requires a **physical device** provisioned under the paid Apple Developer team —
   Simulator cannot receive real APNs pushes, so this can't be verified end-to-end without one.

---

## Build Environment Notes (Android)

- Gradle must use Android Studio's bundled JDK (Java 21), not system Java 25 — pinned via `org.gradle.java.home` in `android/gradle.properties`
- Guardian SDK 0.7.0 has a broken `okhttp-bom` transitive dependency — excluded in `app/build.gradle.kts` with `okhttp:4.12.0` added directly
- `android.suppressUnsupportedCompileSdk=37.0` is set because AGP 8.10.1 was tested up to SDK 36

---

## Deployment (2026-08-01 groundwork, live 2026-08-03)

`api/` and `webapp/` are **live on AWS** as of 2026-08-03: `https://api.igbc.sheev.fr` (health
check returns 200) and `https://igbc.sheev.fr` (login tested end-to-end and works). The
2026-08-01 entry below describes the Docker/tooling groundwork that made this possible — treat
both services as deployed, not pending, when planning further work.

**Live:** `api/` → `https://api.igbc.sheev.fr`, `webapp/` → `https://igbc.sheev.fr`, both running
as **Amazon ECS Express Mode** services (Fargate), sharing one auto-provisioned ALB (host-header
routed, SNI-serving two separate ACM certs off one HTTPS listener). Express Mode was chosen because
**AWS App Runner stopped accepting new customers as of 2026-04-30** — it's AWS's recommended
replacement and needs a container image rather than building from source, hence the Dockerfiles.
Route 53 alias records in the `sheev.fr` hosted zone point both hostnames at the ALB. Redeploys use
`aws-redeploy.sh <api|webapp>` per each service's `DEPLOYMENT.md` step 5 — the ALB, certs, and DNS
records already exist and don't need recreating.

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

## Considered — SCA via PAR + RAR for step-up MFA (discussed 2026-08-03, not yet built)

`webapp`'s current step-up MFA (`silentLogin()` + `acr_values`, see `webapp/CLAUDE.md` "Resolved —
Silent login mechanism") proves "the user did MFA during this flow," but isn't bound to *what*
they approved — the transaction fields (amount, destination account) travel as a client-controlled
`returnTo` query string that `api/` never re-validates against the token. Closing that gap
(PSD2-style "dynamic linking", the actual substance of Strong Customer Authentication) would mean:

- **PAR** (`/oauth/par`): the BFF (a confidential client — already holds the client secret) would
  push the transaction server-to-server, get back a one-time `request_uri` (30s TTL, fixed), and
  redirect the browser with just `client_id`+`request_uri` — no transaction details ever touch the
  browser URL, history, or referrer headers. **Public clients (SPAs) are excluded from PAR** —
  irrelevant here since the BFF pattern already fits, but worth remembering if this pattern is ever
  proposed for a client-only flow.
- **RAR** (`authorization_details`): the transaction itself becomes a structured, pre-registered
  type (e.g. `money_transfer`) on the `api://sheev/v1` resource server (via Dashboard or a
  Management API `PATCH`) instead of loose query params. Auth0 caps this at 5KB total / 5 entries /
  10 properties per entry / 255 chars per value — comfortably enough for a transfer payload.
- **The actual dynamic-linking mechanism:** setting the resource server's `consent_policy` to
  `transactional-authorization-with-mfa` exposes a `linking_id` + `event.transaction.
  requested_authorization_details` to a Post-Login Action — that's what would drive the MFA
  challenge, and could render the real amount/destination on the Guardian push notification itself
  ("Approve sending 100 cred to IGBC-00000002?"), since Guardian/SNS push is already wired for
  Android/iOS.
- **The piece Auth0 config alone doesn't solve:** `api/`'s `POST /api/transfers` (and similarly
  `/api/payments`) would still need new code to verify the presented token's approved
  `authorization_details` actually matches the transfer being created. Without that check, all the
  PAR/RAR ceremony proves "a transaction was shown to the user," not "*this* transaction was
  approved" — the enforcement point is genuinely new work, not a side effect of Auth0 config.

**Blocker to verify before scoping real work:** PAR sits behind Auth0's **Highly Regulated
Identity** add-on (Enterprise plan) — confirm the `sheev.fr` tenant actually has it first.

**Scope:** spans all three repos — `webapp/` (BFF), `Auth0/` (Post-Login Actions + resource server
config), and `api/` (new authorization_details enforcement) — real implementation needs to be
scoped per-repo, not done in one session, per the cross-repo boundary the user prefers (see
`webapp/`'s memory `feedback_cross_repo_session_boundary`).

---

## Next Steps (planned 2026-08-04 — picking up next session)

Ordered roadmap for the next round of work, agreed after the Android real-API migration landed.
Supersedes the "Build order" note above for anything beyond that already-completed round.

1. ~~`api/` — remove the public `/api/test` debug-dump route~~ — done 2026-08-05, see
   `api/CLAUDE.md`.
2. ~~`api/` — GDPR account-deletion endpoint~~ — done 2026-08-05: soft-block (not hard-delete) +
   cascade-delete owned Accounts/Payments/Transfers, `User` doc left alone — see `api/CLAUDE.md`
   "Resolved — GDPR account deletion".
3. ~~`webapp/` — revisit its account-delete flow~~ — done 2026-08-05: the empty-balance guard
   moved server-side into `api/`'s `DELETE /api/accounts/:id` (see `api/CLAUDE.md` "Resolved —
   Balance guard on account deletion"), `webapp/`'s BFF proxy simplified to a plain passthrough
   (see `webapp/CLAUDE.md` "Resolved — Account-delete flow simplified..."), and the GDPR
   "Delete my account" flow wired up on the Profile Danger Zone against `api/`'s new
   `DELETE /api/profile` (see `webapp/CLAUDE.md` "Resolved — Wire up 'Delete my account'..."). This
   is now the reference implementation for #4/#5 below — mirror the enforcement location (`api/`
   only, no client-side pre-check) and the step-up MFA → confirm → delete → logout UI shape.
4. ~~`android/` — delete/close account, step-up MFA (SCA), real Profile/Consent update wiring~~ —
   done 2026-08-05, mirroring `webapp/`'s pattern from #3 — see `android/CLAUDE.md`'s "Resolved —
   Account deletion, step-up MFA, real Profile update" section.
5. ~~`ios/` — wire to the live `api/` with the full SCREENS.md/THEME.md redesign, built with
   step-up MFA, delete/close account, and real Profile/Consent wiring included from the start~~ —
   done 2026-08-05 (parity with Android's then-finished state, not a later retrofit). Then went
   further on 2026-08-06 by dropping the on-device Guardian SDK entirely in favor of
   Management-API-backed enroll/remove (see Platform table above and `ios/CLAUDE.md`'s two
   "Resolved" sections). **User explicitly declined (2026-08-06) to have `android/` follow this
   simplification** — Android stays on the native Guardian SDK path pending Firebase, by choice,
   not oversight.
6. Guardian push prerequisites — split 2026-08-06 into "Prerequisites Not Yet Completed" above:
   1.1 (Firebase/Apple/AWS/Auth0 Dashboard setup — none of it code), 1.2 (`android/` code changes,
   required — Android was never blocked and stays on the native SDK path), and 1.3 (`ios/` code
   changes). **User confirmed 2026-08-06 that iOS will reintroduce the native Guardian SDK it
   dropped that same day** — so the Apple Developer Program purchase and 1.3's re-add work are both
   in scope, not conditional; the temporary Management-API-ticket-URL enrollment is a stopgap until
   this lands, not the permanent iOS approach.
7. Cross-repo SCA via PAR + RAR for step-up MFA dynamic-linking — see "Considered" above; confirm
   the Highly Regulated Identity add-on on the tenant first.
8. `mcp/` — resolve its open pending decisions and start building.
9. `architecture.html` — finish the diagram update.

---

## How to Work in This Repo

**Cross-platform session** (theme, Auth0 config, shared decisions):
Start Claude Code from the `IGBC/` parent folder. This file is loaded automatically.

**Platform-specific session** (write code for one platform):
Start Claude Code from `IGBC/android/`, `IGBC/ios/`, `IGBC/webapp/`, or `IGBC/api/`.
Both this file and the platform's own `CLAUDE.md` are loaded automatically.
