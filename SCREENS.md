# IGBC — Screens & Navigation

Mobile (Android/iOS) and Web now have **different information architectures**, built from the same underlying screens/routes. This is intentional: mobile optimizes for one-handed, tab-based navigation; web has the width and header space for a persistent utility bar plus a banking menu. Where a concept has a different shape per platform (most notably "Dashboard" — see below), it's called out explicitly. Don't assume a route/screen name means the same thing on both platforms.

---

## Screen Inventory — Mobile (Android/iOS)

| Route | Screen | Tab? | Auth0 / FGA feature demonstrated |
|---|---|---|---|
| `login` | Login | — | Universal Login via `WebAuthProvider` |
| `home` | **Dashboard** — account switcher + operation display | ✅ Tab 1 | FGA `can_view` filtering (account list) + per-account ledger |
| `accounts/new` | Open New Account | pushed | FGA "no tuples yet" pattern — object created, then `owner` tuple written |
| `transfers` | **Transfers** — list + send | ✅ Tab 2 | FGA `can_view` scoped to `transfer` objects |
| `transfers/new` | Send Transfer | pushed | FGA `owner` check on `fromAccount` before allowing a write |
| `transfers/:transferId` | Transfer Detail | pushed | FGA `can_cancel` gating a specific action |
| `payments/:paymentId` | Payment Detail | pushed | FGA `can_contest` gating a specific action |
| `activity` | Full Activity | pushed | FGA `can_view` across a mixed feed (accounts + payments + transfers) |
| `profile` | **Profile** | ✅ Tab 3 | ID token claims — identity, contact, address |
| `others` | **Others** — tile grid | ✅ Tab 4 | — (navigation hub only) |
| `security` | Security | pushed (from Others) | Guardian enrollment status |
| `enrollment` | Enrollment | pushed (from Security) | Guardian SDK device registration |
| `debug` | Debug | pushed (from Others) | Raw + decoded tokens (access, ID, refresh) |
| `mfa_approval` | MFA Approval | full-screen, push-triggered only | Guardian push challenge (approve/deny) |

## Screen Inventory — Web

| Route | Screen | Nav location | Auth0 / FGA feature demonstrated |
|---|---|---|---|
| `/` | Landing / redirect | — | — |
| `/dashboard` | **Dashboard** — analytics/graphs on recent operations | Row 2 (banking menu) | Same underlying data as mobile's ledger, visualized instead of listed |
| `/accounts` | **Accounts** — account selection + operation display | Row 2 (banking menu) | FGA `can_view` filtering across a collection (owner + delegate accounts) |
| `/accounts/:accountId` | Account Detail | pushed from `/accounts` | FGA `can_view` on a single object; full per-account ledger |
| `/accounts/new` | Open New Account | pushed | FGA "no tuples yet" pattern |
| `/transfers` | **Transfers** — list + send | Row 2 (banking menu) | FGA `can_view` scoped to `transfer` objects |
| `/transfers/new` | Send Transfer | pushed | FGA `owner` check on `fromAccount` before allowing a write |
| `/transfers/:transferId` | Transfer Detail | pushed | FGA `can_cancel` gating a specific action |
| `/payments/:paymentId` | Payment Detail | pushed | FGA `can_contest` gating a specific action |
| `/admin/payments` | **Payments** — admin payment management | Row 2 (banking menu, admin-only) | RBAC via the `rights` claim on the access token, gating a route that deliberately bypasses FGA's per-account `can_view`/`owner` scoping — see below |
| `/activity` | Full Activity | pushed from `/accounts` | FGA `can_view` across a mixed feed |
| `/profile` | Profile | Row 1 (utility, icon+label) | ID token claims — identity, contact, address |
| `/security` | Security | Row 1 (utility, icon+label) | Guardian enrollment status |
| `/enrollment` | Enrollment | pushed from `/security` | Guardian SDK device registration |
| `/debug` | Debug | Row 1 (utility, icon+label) | Raw + decoded tokens (access, ID, refresh) |
| — | Logout | Row 1 (utility, icon+label) | `WebAuthProvider.logout()` equivalent — action, not a route |

**Why "Dashboard" differs by platform:** on mobile, screen space is scarce, so the account switcher and the ledger live together under one tab called Dashboard — it *is* the accounts experience. On web, there's room for a dedicated `/accounts` page to do that job, which frees "Dashboard" to be what the word usually means in a banking product: an at-a-glance analytics view (balance trend, spending by category) built from the same payments/transfers data. Don't port mobile's Dashboard content to web's `/dashboard` route, or vice versa.

**Payments have no dedicated tab/menu for regular users on either platform.** They surface inline wherever a ledger is shown (mobile Dashboard, web Accounts/Account Detail, Full Activity) — tapping a payment row goes to Payment Detail. Transfers get their own hub (list + send) because "send a transfer" is an action a user initiates; "contest a payment" only ever starts from a payment that already exists in a ledger. **Web is the one exception**: `/admin/payments` ("Payments" in Row 2) is a dedicated hub for creating/uploading payments platform-wide — but it's not a regular-user capability, it's gated to the `"IGBC - Admin"` right and answers a completely different question ("seed/manage payments across the platform" vs. "look at my payment").

---

## Mobile Navigation (Android/iOS)

### Tab Bar

Visible only when authenticated. Hidden on `login` and on every pushed screen (`accounts/new`, `transfers/new`, `transfers/:transferId`, `payments/:paymentId`, `activity`, `security`, `enrollment`, `debug`, `mfa_approval`).

| Tab | Icon | Route | Content |
|---|---|---|---|
| Dashboard | Home icon | `home` | Account switcher (horizontal cards, swipe or tap to select) + full ledger for the selected account, inline — this is what `AccountDetailScreen` used to be as a separate push, now embedded here |
| Transfers | Transfer-arrows icon | `transfers` | List of the user's transfers + "Send transfer" primary action |
| Profile | Person icon | `profile` | Identity — see Profile section below |
| Others | Grid/tile icon | `others` | Tile grid — Security, Debug |

**Others tile grid content:** two tiles today — **Security** (Guardian enrollment entry point, itself leading to Enrollment) and **Debug** (raw token dump). MFA Approval is **not** a tile — it's push-triggered only, same as before; there's no scenario where a user navigates to it manually.

### Mobile Navigation Flow

```
App start
    └── LoginScreen
            │  (login success)
            ▼
        ┌───────────────────────────────────────────┐
        │                  Tab Bar                    │
        │  [Dashboard] [Transfers] [Profile] [Others] │
        └───────────────────────────────────────────┘
              │             │            │        │
              ▼             ▼            ▼        ▼
        DashboardScreen  TransfersScreen  Profile  OthersScreen
        (switcher+ledger)      │          Screen     │      │
              │      │         │                     │      │
              │      │(tap "+" (tap "Send             ▼      ▼
              │      │on switcher) transfer")     SecurityScreen  DebugScreen
              │      ▼         ▼                        │
              │  OpenAccount SendTransferScreen          │ (tap "Enroll this device")
              │  Screen         │ (submit success)       ▼
              │                 ▼                  EnrollmentScreen
              │           back to TransfersScreen         │ (success/cancel)
              │                                           ▼
              │ (tap a ledger row)                  SecurityScreen
              ├──────────▶ TransferDetailScreen ── (Cancel, if pending) ──▶ back
              └──────────▶ PaymentDetailScreen  ── (Contest) ────────────▶ back

DashboardScreen ── (tap "View all activity") ──▶ FullActivityScreen
TransfersScreen ── (tap a row) ──▶ TransferDetailScreen

Push notification received (anywhere in app, foreground or background tap)
    └── MfaApprovalScreen  (full screen, no tab bar)
            │ (Approve or Deny)
            ▼
        Back to previous screen
```

### Deep Link / Notification Routing (mobile only)

When the app receives a Guardian push (via `FirebaseMessagingService`):

- **App in foreground** — navigate directly to `mfa_approval` with the challenge payload
- **App in background / killed** — notification tap triggers the app, which navigates to `mfa_approval` via the intent extras

The `MainActivity` is responsible for reading the Guardian push payload from the intent and routing to `mfa_approval` before the nav graph renders its start destination.

---

## Web Navigation

### Header (two rows, full-width — not constrained to a narrow centered column)

**Row 1 — 2/3 of header height. Identity/utility bar, present on every page.**
- Left: IGBC logo + wordmark ("InterGalactic Banking Clan")
- Right: four icon-over-label buttons — **Profile**, **Security**, **Debug**, **Logout**

**Row 2 — 1/3 of header height. Banking menu.**
- **Dashboard** (`/dashboard`) — analytics
- **Accounts** (`/accounts`) — account selection + operation display
- **Transfers** (`/transfers`) — transfer management
- **Payments** (`/admin/payments`) — admin-only payment management (create/bulk-upload). Rendered **only** when the caller's access token `rights` claim includes `"IGBC - Admin"` — absent entirely for every other user, not just disabled

Row 2 is the only place these items compete for a highlighted/active state (underline or gold text on the active item) — Row 1's buttons are utility actions, not a tab set, so none of them should render as "active."

### Web Navigation Flow

```
App start (unauthenticated) → LandingView → BFF /auth/login → Auth0 Universal Login
                                                                        │
                                                            (login success, redirect)
                                                                        ▼
        ┌──────────────────────────── Row 1 (utility) ───────────────────────────┐
        │  [Logo/wordmark]                    [Profile] [Security] [Debug] [Logout]│
        ├──────────────────────────── Row 2 (banking) ────────────────────────────┤
        │              [Dashboard]      [Accounts]      [Transfers]               │
        └──────────────────────────────────────────────────────────────────────────┘
                 │                 │                  │            │        │
                 ▼                 ▼                  ▼            ▼        ▼
          DashboardScreen   AccountsScreen      TransfersScreen  Profile  SecurityScreen
          (analytics)        │        │              │           Screen        │
                              │        │(tap "Send    │(tap "Send               ▼
                              │        │ transfer")   │ transfer")        EnrollmentScreen
                              │        ▼              ▼
                              │  SendTransferScreen (shared entry point either way)
                              │        │ (submit success)
                              │        ▼
                              │  back to AccountsScreen or TransfersScreen (wherever it was opened from)
                              │
                              │ (tap an account card)
                              ▼
                        AccountDetailScreen ── (tap "+" ) ──▶ OpenAccountScreen
                              │
                              │ (tap a ledger row)
                              ├──────────▶ TransferDetailScreen ── (Cancel, if pending) ──▶ back
                              └──────────▶ PaymentDetailScreen  ── (Contest) ────────────▶ back

AccountsScreen ── (tap "View all activity") ──▶ FullActivityScreen ── (tap a row) ──▶ TransferDetailScreen / PaymentDetailScreen

[Debug] (Row 1) → DebugScreen

[Payments] (Row 2, admin-only) → PaymentsAdminScreen ── ("New payment" or "Bulk upload") ──▶ back to PaymentsAdminScreen (table refreshed)
```

There's no equivalent of mobile's `mfa_approval` push flow on web — Guardian push enrollment/approval is a mobile-only capability (see `SecurityScreen`'s "Coming soon" note in `webapp/CLAUDE.md`).

Mobile has no equivalent of `/admin/payments` either — this is a web-only screen, since it's an internal ops/demo-seeding tool rather than a customer-facing capability any platform needs to mirror.

---

## Screens

### LoginScreen (`login`)

**Auth0 feature:** Universal Login — `WebAuthProvider`

**Content:**
- IGBC logo + tagline ("The Galaxy's Most Trusted Bank")
- "Sign in to IGBC" primary button → triggers `WebAuthProvider.login()`
- No manual username/password fields — everything goes through Universal Login

**States:**
- `Idle` — button enabled
- `Loading` — button disabled, spinner
- `Error` — error message below button

---

### DashboardScreen — mobile (`home`, Tab 1)

**Auth0 feature:** FGA `can_view` filtering (which accounts appear in the switcher) + per-object `can_view` (the selected account's ledger)

**Content:**
- Account switcher — horizontal cards (type, masked account number, balance, currency), each tagged "Owner" or "Delegate"; a trailing "+" card → `accounts/new`
- Below the switcher: full ledger for the **selected** account — every payment and transfer touching it, paginated, newest-first (this is the content that used to be a separate `AccountDetailScreen` push; now inline)
- "Send transfer" quick action (pre-fills `fromAccount`)
- "View all activity" link → `activity`
- Tap a ledger row → `transfers/:transferId` or `payments/:paymentId`
- Logout action in top bar → `WebAuthProvider.logout()` → back to `login`

**States:**
- `Loading` — skeleton switcher + skeleton ledger
- `Loaded`
- `Empty` — no accounts yet — prompt to open one via the "+" card
- `Error`

---

### DashboardScreen — web (`/dashboard`)

**Auth0 feature:** none directly — this screen visualizes the same `can_view`-filtered payments/transfers data other screens list; it doesn't add a new authorization check.

**Content:**
- Balance trend chart across the user's accounts (line chart, recent period)
- Spending-by-category chart (from `payments.category`) — pie or bar
- Income vs. outgoing summary (derived from transfer direction + payments) for the recent period
- No mutating actions on this screen — pure read/visualize; everything actionable lives under Accounts/Transfers

**States:**
- `Loading`
- `Loaded`
- `Empty` — not enough transaction history yet to chart anything meaningful
- `Error`

---

### AccountsScreen — web (`/accounts`)

**Auth0 feature:** FGA `can_view` filtering across a collection — the list only shows accounts the current user owns or has `delegate` access to, not a client-side filter over everything.

**Content:**
- Master-detail layout (width allows it): list of account cards on one side, selected account's full ledger on the other — same information as mobile's Dashboard tab, laid out for a wide viewport instead of stacked
- Each card tagged "Owner" or "Delegate"
- "Open new account" button → `/accounts/new`
- "View all activity" link → `/activity`
- Selecting a card updates the URL to `/accounts/:accountId` (deep-linkable, back/forward-safe)

**States:**
- `Loading` — skeleton cards
- `Loaded`
- `Empty` — no accounts yet — prompt to open one
- `Error`

---

### AccountDetailScreen (`accounts/:accountId` / `/accounts/:accountId`)

**Auth0 feature:** FGA `can_view` on a single object (re-checked server-side per request, not just inherited from the list)

On mobile, this is not a separate pushed screen — its content renders inline inside the Dashboard tab below the account switcher (see above). On web, it's the detail pane of the `/accounts` master-detail layout, and also directly linkable as its own URL.

**Content:**
- Account header: type, full account number, balance, currency, status
- "Send transfer" button (pre-fills `fromAccount` on `transfers/new`)
- Full transaction ledger for **this account only**, paginated, newest-first
- Tap a ledger row → `transfers/:transferId` or `payments/:paymentId`

**Distinction from Full Activity:** this is scoped to one account. Full Activity aggregates across every account the user can see, with search/filter — the two aren't redundant, they answer different questions.

**States:**
- `Loading`
- `Loaded`
- `Forbidden` — FGA denies `can_view` (e.g. stale link to an account no longer shared with this user) — show a generic "not found" rather than leaking that the account exists
- `Error`

---

### OpenAccountScreen (`accounts/new` / `/accounts/new`)

**Auth0 feature:** FGA "no tuples yet" creation pattern — unlike Send Transfer, there's no existing object to check a relation against, so any authenticated user may create an account for themselves; the `owner` tuple is written *after* the Mongo insert succeeds.

**Content:**
- Account type selector (e.g. Checking / Savings)
- Currency selector (defaults to the user's existing account currency, or Galactic Credits)
- "Open account" primary button
- "Cancel" → back to the account switcher/`accounts`

**States:**
- `Idle`
- `Submitting`
- `Success` → navigates to the new account's detail
- `Error` — Mongo insert failed or FGA tuple write failed after insert (surface as a retry, don't leave an orphaned account with no owner tuple)

---

### TransfersScreen (`transfers` / `/transfers`)

**Auth0 feature:** FGA `can_view` scoped specifically to `transfer` objects — same relation model as Full Activity, narrower scope.

**Content:**
- List of the user's transfers (from/to account, amount, status, date), across all accounts they can see
- Filter by account, by status (pending/settled/cancelled)
- "Send transfer" primary action / FAB → `transfers/new`
- Tap a row → `transfers/:transferId`

**States:**
- `Loading`
- `Loaded`
- `Empty` — no transfers yet — prompt to send one
- `Error`

---

### SendTransferScreen (`transfers/new` / `/transfers/new`)

**Auth0 feature:** FGA `owner` check on `fromAccount` performed *before* the write — proves authorization against an existing object, the inverse of Open Account's pattern.

**Content:**
- "From" account selector (pre-filled if entered from an account's ledger or from Transfers; otherwise any account the user owns)
- "To" field — destination account number
- Amount input (Galactic Credits)
- Optional note
- "Send transfer" primary button

**States:**
- `Idle`
- `Submitting`
- `Success` — confirmation, then back to wherever the flow was entered from (Transfers list or an account's ledger); the new transfer appears in both immediately, since they derive from the same merged data
- `Error` — insufficient balance, invalid destination, or FGA `owner` check failed (not actually the sender's account)

---

### TransferDetailScreen (`transfers/:transferId` / `/transfers/:transferId`)

**Auth0 feature:** FGA `can_cancel` gating a specific action — separate from `can_view`, which only gates whether the screen renders at all.

**Content:**
- Status (pending / settled / cancelled), amount, note, from/to account (masked for the account that isn't the current user's)
- Date created, date settled (if applicable)
- "Cancel transfer" button — only rendered if `can_cancel` is true **and** status is `pending`

**States:**
- `Loaded`
- `Cancelling`
- `Cancelled` — confirmation, ledger reflects removal/reversal
- `Forbidden` — `can_view` denied
- `Error`

---

### PaymentDetailScreen (`payments/:paymentId` / `/payments/:paymentId`)

**Auth0 feature:** FGA `can_contest` gating a specific action, same pattern as Transfer's `can_cancel`.

**Content:**
- Payee name, category, amount, status, date
- "Contest this payment" button — only rendered if `can_contest` is true
- Contest reason text field, shown once the button is tapped

**States:**
- `Loaded`
- `Contesting`
- `Contested` — confirmation, status updates to reflect dispute
- `Forbidden` — `can_view` denied
- `Error`

---

### PaymentsAdminScreen (`/admin/payments`) — web only

**Auth0 feature:** RBAC via the `rights` claim on the **access token** — the first screen in the app gated by something other than FGA object-level checks. Confirmed live shape (2026-07-31), an unnamespaced top-level array:

```json
"rights": ["Authfest Access", "IGBC - Admin"]
```

Gate is a membership check for `"IGBC - Admin"` specifically (`"Authfest Access"` is an unrelated right on the same tenant and is ignored here). This right is issued by a post-login Action already configured on the tenant — nothing to set up in Auth0 for this screen, only in `api/`/`webapp/bff`/`webapp/frontend`.

**Visibility:** Row 2 banking menu, after Transfers, labeled **"Payments"** — rendered only when admin. A direct hit on `/admin/payments` by a non-admin is rejected server-side (BFF and API both check `rights`, not just the frontend route guard) and reads as a generic `Forbidden`/not-found, same posture as `AccountDetailScreen`'s FGA denial — don't leak that the route exists.

**Content:**
- Payments table — every payment **platform-wide**, not scoped to the admin's own accounts: account number, payee name, amount, category, status, disputed flag, date. Filterable by account number / payee / category / date range. Paginated, newest-first.
- "New payment" — inline form: destination account number (free entry, no ownership check — this is the point of the screen), payee name, amount, category, date (defaults to now).
- "Bulk upload" — CSV file picker, columns `accountNumber,payeeName,amount,category,date`. Client-side parse + preview (row count, first few rows) before submit. Submits row-by-row; a per-row result list shows success/failure so one bad row (unknown account number, bad amount) doesn't fail the whole batch.
- No edit/void of existing payments from this screen — Contest (on `PaymentDetailScreen`) remains the only mutation path for a payment after creation.

**Why this needs new authorization, not just a new screen:** every existing payment route is scoped by FGA to the accounts the caller owns or has `delegate` on. Creating/listing payments on *any* account is a deliberate bypass of that scoping — the same category of exception as `GET /api/accounts/lookup` (see `api/CLAUDE.md`), but gated by the `rights` claim instead of being open to any authenticated user.

**States:**
- `Loading`
- `Loaded`
- `Empty` — no payments exist yet platform-wide
- `Uploading` — progress + per-row result list (success/failure per CSV row)
- `Forbidden` — non-admin hits the route directly → generic not-found
- `Error`

---

### FullActivityScreen (`activity` / `/activity`)

**Auth0 feature:** FGA `can_view` filtering across a mixed feed spanning multiple object types (accounts + payments + transfers) at once, not a single collection.

**Content:**
- Combined, searchable/filterable ledger across every account the user can see (owner or delegate)
- Filters: by account, by type (payment / transfer), by date range
- Search by payee name or note
- Tap a row → `transfers/:transferId` or `payments/:paymentId`

**States:**
- `Loading`
- `Loaded`
- `Empty` — no activity matches the current filters
- `Error`

---

### ProfileScreen (`profile` / `/profile`)

**Auth0 feature:** ID token claims — standard OIDC claims + custom namespaced claims (`api://sheev/v1/`)

**Purpose split from DebugScreen:** Profile renders claims as a human-facing banking identity page. DebugScreen keeps the raw/decoded token dump. Don't reintroduce a raw key-value claim list here — that's Debug's job.

**Claims used** (shape confirmed from a live ID token, 2026-07-27):

Standard OIDC:
- `given_name`, `family_name` — full name (fallback to `name` if either is missing)
- `nickname` — shown as secondary text (`@nickname`)
- `picture` — avatar (initials fallback if absent, using `given_name`+`family_name` initials)
- `email`, `email_verified` — verified shown as a badge, not raw boolean
- `updated_at` — "Last updated" as a relative/formatted date
- `amr` — rendered as friendly labels (e.g. "Password", "Guardian Push"), not the raw array

Custom namespace `api://sheev/v1/`:
- `created_at` — "Member since {formatted date}"
- `id_rcu_france` — "Customer ID" (RCU — French banking unique customer reference; demo flavor, real banking concept)
- `phonenumber` — phone number (note the claim key has no underscore/verified flag — no verification badge for this one, just display as-is)
- `address/street`, `address/city`, `address/zipcode`, `address/country` — formatted as a real postal address block
- `address/planet` — shown as a small "Homeworld" detail line under the address block (in-universe flavor for the Star Wars wrapper; usually `Earth` but themed for demo variety)

**Content / layout:**
- **Identity card** — avatar, full name, `@nickname`, "Member since" (`created_at`), Customer ID (`id_rcu_france`), an **Edit** button top-right
- **Contact card** — email (+ verified badge), phone (`phonenumber`)
- **Address card** — street/city/zipcode/country as a postal block, with "Homeworld" (`address/planet`) as a small themed footer line
- **Consent Management** — CGU (Terms of Service), GDPR Data Processing, Notifications: three rows with clickable toggle switches. Replaces the old "Security summary" block (moved/expanded into `SecurityScreen`, see below) — `amr`/`updated_at` no longer render here.
- **Danger Zone** — disabled "Delete my account" button + GDPR caption ("Account deletion will be available in a future update")

**Edit mode:** the Identity card's **Edit** button swaps the Contact + Address cards for an editable form (first/last name, nickname, phone, street/city/zipcode/country/planet), pre-filled from the current claims. **Save** applies the changes locally for the session (held in a client-side `overrides` ref, not persisted to any backend — lost on refresh); **Cancel** discards and returns to view mode. There is no profile-update API yet — this is UX-layout only.

**States:**
- `Loaded` — all cards render from claims present on the ID token
- **Missing claim** — any claim above may be absent for a given demo user (not every seed user has full custom-claim data). Render "Not provided" per field rather than hiding the card or leaving blank space — the gap should read as intentional in a live demo, not broken.
- `Editing` — Contact/Address replaced by the edit form; Consent Management and Danger Zone stay visible/unaffected.

---

### OthersScreen — mobile only (`others`, Tab 4)

**Auth0 feature:** none — navigation hub only.

**Content:**
- Tile grid, two tiles: **Security** and **Debug**
- Each tile: icon + label, tap navigates to the respective screen

There is no web equivalent — Security and Debug are Row 1 utility icons on web instead of being tucked behind a hub, since the header has room for them directly.

---

### SecurityScreen (`security` / `/security`)

**Auth0 feature:** Guardian enrollment entry point

**Mobile content:**
- Section header: "Two-Factor Authentication"
- Guardian enrollment status card:
  - **Not enrolled:** "This device is not registered as a Guardian factor" + "Enroll this device" button
  - **Enrolled:** "This device is registered" + device name + enrollment date + "Remove enrollment" button
- Brief explanation of what Guardian push authentication does (for demo audiences)

**Web content (block order, top to bottom — see `webapp/CLAUDE.md` "Resolved" for build details):**
1. **Multi-Factor Authentication** — intro line + one row per factor (Email, SMS, Security Key, Guardian Push): icon, label, description, disabled "Enroll" button, "Coming soon" tag. No enrollment backend exists yet on web (no push capability in a browser, and no email/SMS/WebAuthn enrollment endpoint) — this is UX-layout only.
2. **Active Sessions** — one real row for the current session (label "This device", truncated `sid`, "Current" badge, disabled "Revoke" button — you can't revoke your own current session), plus a "Coming soon" row for viewing/revoking sessions on other devices (no session-listing API yet).
3. **Session Security** — unchanged from the original single-block version: "Was MFA used for this login?" (derived from `amr`) and the raw `amr` value. This block is fully real/functional — it reflects the actual ID token, unlike the two blocks above it.

---

### EnrollmentScreen (`enrollment` / `/enrollment`) — mobile only

**Auth0 feature:** Guardian SDK — device enrollment

**Content:**
- Step indicator (1. Scan / 2. Confirm / 3. Done) — or a single confirmation if the Guardian SDK handles the flow natively
- Guardian SDK enrollment UI (the SDK provides an enrollment URI; the screen shows a confirmation + the enrollment token exchange)
- "Confirm enrollment" button
- "Cancel" button → back to SecurityScreen

**States:**
- `Loading` — fetching enrollment URI from Guardian SDK
- `Ready` — show enrollment confirmation
- `Enrolling` — confirming with Guardian SDK
- `Success` — "Device enrolled" confirmation → auto-navigate back to SecurityScreen
- `Error` — error message + retry

> **Note:** FCM token must be available before enrollment can complete. If `google-services.json` is not yet set up, enrollment will fail at the token step — surface a clear error for demo purposes.

---

### MfaApprovalScreen (`mfa_approval`) — mobile only

**Auth0 feature:** Guardian push challenge resolution

**Entry point:** Tapping an incoming FCM push notification (or foreground interception via `FirebaseMessagingService`)

**Content:**
- IGBC logo + "Authentication Request"
- Details of the login attempt (from the Guardian push payload):
  - Browser / OS
  - Location (if available)
  - Date & time
- Two large buttons: **Approve** (primary) and **Deny** (destructive)
- Countdown timer (Guardian challenges expire — show remaining seconds)

**States:**
- `Pending` — waiting for user action, countdown running
- `Approving` / `Denying` — loading after tap
- `Success` — "Authentication approved" confirmation
- `Denied` — "Authentication denied" confirmation
- `Expired` — challenge timed out before user acted

---

### DebugScreen (`debug` / `/debug`)

**Auth0 feature:** raw + decoded tokens (access, ID, refresh where available) — the technical counterpart to ProfileScreen's human-facing claims.

**Content:**
- Session status
- Raw ID token, access token (and refresh token where the platform exposes it)
- Decoded claims for each token, as a raw key-value dump — this is the one screen where that's the right format
