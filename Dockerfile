FROM node:26-alpine

# docker CLI for `docker service update`
RUN apk add --no-cache docker-cli

EXPOSE 1995
WORKDIR /usr/src/app
COPY package.json package-lock.json /usr/src/app/
RUN npm ci --omit=dev
COPY . /usr/src/app

# Set by CI (see .github/workflows/image.yml); reported by GET / and at startup.
ARG VERSION=dev
ARG REVISION=unknown
ENV PULLUP_VERSION=$VERSION PULLUP_REVISION=$REVISION

CMD [ "/usr/src/app/trigger.sh" ]
