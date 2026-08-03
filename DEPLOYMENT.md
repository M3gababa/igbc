# IGBC — Local Deployment & Testing

Cross-platform reference for running everything **locally**: `api/` and `webapp/` via Docker, and
`android/`/`ios/` via their native toolchains. This file is local-only — `api/DEPLOYMENT.md` and
`webapp/DEPLOYMENT.md` are AWS-only, with no local-run content of their own anymore.

---

## Quick start: `scripts/local-deploy.sh`

`scripts/local-deploy.sh` wraps the whole `api/` + `webapp/` local Docker flow below — create the
shared network, wait for `api/`'s health check, start `webapp/` pointed at it, wire in the
corporate CA cert automatically. Use it instead of typing out the `docker build`/`docker run`
commands in the sections below by hand; those sections still exist to show what the script is
actually doing, and for running just one side on its own. Run it from the `scripts/` folder.

```bash
cd scripts
./local-deploy.sh build    # rebuild both images and replace the running containers
./local-deploy.sh up       # (or bare ./local-deploy.sh) — (re)start from the existing images,
                            #   no rebuild; run 'build' first if igbc-api:local/igbc-webapp:local
                            #   don't exist yet
./local-deploy.sh status   # show whether the containers are up, and their ports
./local-deploy.sh logs     # tail both containers' logs (Ctrl-C to stop tailing)
./local-deploy.sh down     # stop both containers
```

Use `build` the first time, and again any time you change code in `api/` or `webapp/`. Use plain
`up` when you just want the containers running as they were last built — e.g. after `down`, or
after a reboot — without waiting on a rebuild. Both are idempotent — they replace any existing
`igbc-api`/`igbc-webapp` containers, so it's safe to run either again without manually tearing
down first. Either one exits early with a clear message if `api/.env`, `webapp/bff/.env`, or
`scripts/prisma_certificates.pem` is missing, and won't start `webapp/` until `api/`'s `/health`
responds.

---

## Corporate proxy / TLS interception note

If `docker run` for `api/` or `webapp/` fails with `self-signed certificate in certificate chain`
(seen hitting `/auth/login` or any outbound Auth0/Mongo/FGA call), it's a TLS-intercepting
corporate proxy sitting between the container and the internet — the host trusts its root CA (via
the OS keychain), the container's minimal CA bundle doesn't. `scripts/prisma_certificates.pem`
is that CA chain (Okta's decryption proxy). Mount it into the container and point Node at it
via `NODE_EXTRA_CA_CERTS` — both commands below already include this. Don't use
`NODE_TLS_REJECT_UNAUTHORIZED=0` instead; that disables TLS validation entirely rather than just
trusting this one extra CA.

---

## `api/` — local Docker run

```bash
cd api
docker build -t igbc-api:local .
docker run --rm -p 4000:4000 --env-file .env -e PORT=4000 \
  -e NODE_EXTRA_CA_CERTS=/certs/prisma_certificates.pem \
  -v "$(pwd)/../scripts/prisma_certificates.pem:/certs/prisma_certificates.pem:ro" \
  igbc-api:local
```

`.env` is the same file you use for `npm run dev` (Atlas/Auth0/FGA credentials) — see `api/CLAUDE.md`
for what each variable is.

```bash
curl http://localhost:4000/health          # expect {"status":"ok"}
curl http://localhost:4000/docs            # Swagger UI
```

If `/health` doesn't respond, check `docker logs` — the most common causes are a stale Mongo
connection string in `.env`, the TLS interception issue above, or the container not binding
`0.0.0.0` (already fixed in `src/index.js` — don't reintroduce a bare `fastify.listen({ port })`
without `host: '0.0.0.0'`, or ECS health checks in production will fail the exact same way).

---

## `webapp/` — local Docker run

`webapp/`'s image bundles the built Vue frontend and the BFF together — one container, one origin.
Run it alongside a locally-running `api/` container so it has something real to talk to:

```bash
cd webapp
docker build -t igbc-webapp:local .

docker network create igbc-net   # once

docker run -d --rm --name igbc-api --network igbc-net -p 4000:4000 \
  --env-file ../api/.env -e PORT=4000 \
  -e NODE_EXTRA_CA_CERTS=/certs/prisma_certificates.pem \
  -v "$(pwd)/../scripts/prisma_certificates.pem:/certs/prisma_certificates.pem:ro" \
  igbc-api:local

docker run --rm -p 3000:3000 --network igbc-net --env-file bff/.env \
  -e PORT=3000 \
  -e API_BASE_URL=http://igbc-api:4000 \
  -e APP_BASE_URL=http://localhost:3000 \
  -e NODE_EXTRA_CA_CERTS=/certs/prisma_certificates.pem \
  -v "$(pwd)/../scripts/prisma_certificates.pem:/certs/prisma_certificates.pem:ro" \
  igbc-webapp:local
```

```bash
curl -o /dev/null -w "%{http_code}\n" http://localhost:3000/            # expect 200, serves index.html
curl -o /dev/null -w "%{http_code}\n" http://localhost:3000/api/session  # expect 401 (no session cookie)
```

Then open `http://localhost:3000` in a browser and log in for real — `http://localhost:3000/auth/callback`
must be an Allowed Callback URL on the webapp's Auth0 application for this to complete.

---

## `android/` — local build & run

No Docker involved — build and run through Android Studio or Gradle directly against an
emulator/device.

```bash
cd android
./gradlew assembleDebug          # build debug APK
./gradlew testDebugUnitTest      # run unit tests
./gradlew lint
```

Then run via Android Studio's ▶ Run button (or `./gradlew installDebug` + launch manually) on an
emulator or physical device. Login + the original 7 screens work end-to-end against Auth0; the
newer redesigned screens (per `SCREENS.md`) currently run on **mock data** — `api/` isn't yet
reachable from mobile (not published anywhere Android can hit), so there's nothing to point at
`http://localhost:4000` yet even on an emulator. See `android/CLAUDE.md`'s TODO section.

---

## `ios/` — local build & run

No Docker involved — build and run through Xcode against the simulator (or a device, with a paid
Apple Developer account for a physical device's provisioning).

```bash
cd ios
xcodebuild -scheme IGBC -configuration Debug build
xcodebuild -scheme IGBC -destination 'platform=iOS Simulator,name=iPhone 16' test

open IGBC.xcodeproj   # then use Xcode's ▶ Run button
```

Same caveat as Android: login + the original 7 screens are real, the newer redesigned screens run
on mock data pending `api/` being reachable from mobile. See `ios/CLAUDE.md`'s TODO section.
