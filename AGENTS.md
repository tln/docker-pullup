# Agent notes

Pullup is a personal open-source project: a small Node service that redeploys
Docker containers and swarm services when a registry webhook or Cloud Build
Pub/Sub message says a new image was pushed.

## Rules

- Do not mention companies when developing: not in code, comments, tests,
  fixtures, commit messages, docs or image contents. Use generic names
  (`myapp`, `web`, `registry.example.com`).
- Keep the image lean: `.dockerignore` is an allowlist. Anything new the
  runtime needs must be added there explicitly.

## Layout

- `index.js` wires modules together. Each module is `function ({state, docker,
  emitter, app})`, reads its own `PULLUP_*` env vars and registers its own
  routes/listeners.
- `emitter` events: `start`, `stop`, `push` ({tag, digest}), `updating`,
  `update`, `updateErr`, `serviceFound`, `build_<status>`.
  `emitter-listen-all.js` re-emits everything as `*` (used by `slack.js`).
- `hook.js` (registry webhook) and `pubsub.js` (Cloud Build) produce `push`;
  `pullup.js` consumes it: swarm services via `docker service update`, plain
  containers via `pullup-container.js`.
- `docker-scanner.js` discovers services labelled `docker-pullup` and
  containers with `PULLUP*` env vars.
- `trigger.sh` / `incoming.sh`: lazy-start mode (an `nc` listener on 1995
  starts node on 1996 on demand; `idler.js` exits it when idle).

## Versions and releases

- SemVer git tags `vX.Y.Z`, always created with `npm version <x.y.z|patch|minor|major>`
  (bumps `package.json`/lockfile, commits, tags). Never hand-edit the version
  or hand-create release tags. (`v0.1.0` predates this; it marks the 2019 release.)
- `.github/workflows/image.yml` builds multi-arch images: tag -> `:X.Y.Z`,
  `:X.Y`, `:latest`; master -> `:edge`; PRs build only. Published to
  `ghcr.io/tln/docker-pullup`, and to Docker Hub when `DOCKERHUB_IMAGE` is set.
- The build passes `VERSION`/`REVISION`; they surface as `PULLUP_VERSION` /
  `PULLUP_REVISION`, in the startup log and in `GET /`.

## Tests

- `npm test` runs jest. Current specs are docker integration tests (need a
  local docker, registry on `localhost:5000`, and swarm for `swarm.spec.js`).
