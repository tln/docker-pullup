# Pullup 

Pullup exposes an endpoint that receives webhooks (i.e. from Docker Hub 
or a private Docker registry). 

Upon receiving the hook, Pullup will pull the new image, deploy a new 
container from the updated image and then remove the original container.

Pullup can also update services deployed onto docker swarm.

Pullup can be configured with a whitelist of acceptable repository names.
Pullup will also search your running docker containers for envars matching 
PULLUP, or services with the "docker-pullup" label.

## Project Status

Experimental! Please open an issue to let me know what you are doing with 
the software.

## Compare to

https://getcarina.com/docs/tutorials/push-based-cd/

https://github.com/CenturyLinkLabs/watchtower

https://github.com/ehazlett/conduit

## Images

Multi-arch (amd64, arm64) images are published to
`ghcr.io/tln/docker-pullup`:

- `:X.Y.Z`, `:X.Y`, `:latest` for each release tag `vX.Y.Z`
- `:edge` for the tip of `master`

`GET /` reports the running version and git revision. Versions before 0.2.0
were published by hand as `tlntln/docker-pullup` on Docker Hub.

## Usage

compose.yml
```
services:
    pullup:
        image: ghcr.io/tln/docker-pullup:0.2
        ports:
        - 1995:1995
        environment:
            # Scan for PULLUP vars?
            PULLUP_SCAN: 'yes'
            # Repos (image names) to hardcode
            PULLUP_TAGS: redis registry.example.com/myapp:v1
        volumes:
        - /var/run/docker.sock:/var/run/docker.sock
```

## Deploy events (OpenTelemetry)

When `OTEL_EXPORTER_OTLP_ENDPOINT` (or `OTEL_EXPORTER_OTLP_LOGS_ENDPOINT`) is
set, each finished swarm service update sends one OTLP/HTTP JSON log record
with `event.name=deploy` and these attributes:

| attribute | example |
| --- | --- |
| `deploy.service` | `myapp_web` (the swarm service updated) |
| `image.old` / `image.new` | `registry.example.com/myapp:1@sha256:...` |
| `deploy.result` | `ok`, `rolled_back` or `failed` |
| `deploy.duration_ms` | `41200` (image pull + service update) |
| `error.message` | only when not `ok` |

Resource attributes come from `OTEL_RESOURCE_ATTRIBUTES` (e.g.
`host.name=prod`), with `service.name=pullup` (or `OTEL_SERVICE_NAME`) and
`service.version` set to the pullup version. `OTEL_EXPORTER_OTLP_HEADERS` is
honored. Sends time out after 5s and never fail or delay a deploy.



