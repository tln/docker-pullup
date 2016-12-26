# Pullup 

Pullup exposes an endpoint that receives webhooks (i.e. from Docker Hub 
or a private Docker registry). 

Upon receiving the hook, Pullup will pull the new image, deploy a new 
container from the updated image and then remove the original container.

Pullup can dynamically distribute Docker Registry webhooks to pullup instances on
other machines, so you only have to configure your registry once.

Pullup can be configured with a whitelist of acceptable repository names.
Pullup will also search your running docker containers for envars matching PULLUP.

## Compare to

https://getcarina.com/docs/tutorials/push-based-cd/

## Usage

docker-compose.yml
```
version: '2'
services: 
    pullup:
        image: tln/pullup
        ports:
        - 1995:1995
        environment:
            # Pullup server
            PULLUP_MASTER=http://www.foo.com
            # Scan for PULLUP vars?
            PULLUP_SCAN=yes
            # Repos (image names) to hardcode
            PULLUP_TAGS=redis docker.mycorp.com/myapp:v1
        volumes:
        - /var/run/docker.sock:/var/run/docker.sock
```




