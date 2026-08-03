# auth0/

Auth0 tenant-level flow customization shared across the IGBC tenant (`auth.sheev.fr`). Flat
folder, one file per Action/Form — filename is `<trigger-id>_<description>.js`, so same-trigger
Actions sort/group together (e.g. `ls auth0/post-login_*`). A Form's `.json` shares its base name
with the Action that renders it.

- **Actions** (`.js`) — custom serverless functions run at points in the authentication flow.
  - `pre-user-registration_dedupe-and-generate-rcu.js` — denies signup if the email already
    exists in MongoDB, otherwise generates the 8-digit RCU id and sets it as
    `app_metadata.id_rcu_france`.
  - `pre-user-registration_deny-registration.js` — denies signup if the email domain is on a
    blocklist (currently just `yopmail.com`, a disposable-email provider), or if the login
    geolocates to North Korea (localized deny message, en/es/fr).
  - `post-user-registration_create-mongo-user.js` — inserts the `users` doc (`authId`, `email`,
    `name`, `rcuId`) into MongoDB now that the Auth0 user (and its id) exists.
  - `post-login_add-claims.js` — adds custom ID/access token claims (roles, RCU, address,
    consents) from `app_metadata`/`user_metadata`, and records last-login geo on the user.
  - `post-login_progressive-profiling-newUser.js` — renders `post-login_progressive-profiling-newUser.json`
    if and only if the user does not (yet) have the `IGBC - Customer` role.
  - `post-login_stepup-mfa.js` — requires MFA (`api.multifactor.enable('any')`) when the client
    requests step-up via `acr_values`, or when the login geolocates to Antarctica.
- **Forms** (`.json`) — Auth0 Forms definitions used within those flows.
  - `post-login_progressive-profiling-newUser.json` ("IGBC - Sign Up", `ap_aNvo3mBfAwXULxC3sMSC18`)
    — two steps (personal info: firstname/lastname/phone/address; consents: CGU/GDPR/newsletter),
    then a Flow that writes `given_name`/`family_name`/`name` and
    `user_metadata.{address,consents,phonenumber}` back onto the Auth0 user via `UPDATE_USER` —
    same shape `post-login_add-claims.js` reads, `udpated` typo included on purpose (matches the
    existing stored-data convention documented in `../api/CLAUDE.md`). No `address.planet` field
    on this Form — that claim stays unset until set some other way (e.g. Management API).

These Actions/Forms are pasted into the Auth0 dashboard manually (no Deploy CLI/Terraform wired up
yet, same as FGA model and M2M app config) — this repo is the source of truth for the code, the
dashboard is the runtime. `post-login_add-claims.js`, `post-login_progressive-profiling-newUser.js`,
`post-login_stepup-mfa.js`, and `pre-user-registration_deny-registration.js` need no
dependencies/secrets; `pre-user-registration_dedupe-and-generate-rcu.js` and
`post-user-registration_create-mongo-user.js` each need the `mongodb` npm dependency and
`MONGODB_USERNAME`/`MONGODB_PASSWORD`/`MONGODB_DOMAIN`/`MONGODB_DATABASE` secrets added via the
Action editor (same values as `api/.env`'s `MONGODB_*` vars).

Application/platform-specific Auth0 config (client IDs, callback URLs, SDK usage) lives in each
platform's own folder and `CLAUDE.md` — see the root [`README.md`](../README.md).
