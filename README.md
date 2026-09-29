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



