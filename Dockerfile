FROM node:24-alpine

# docker CLI for `docker service update`
RUN apk add --no-cache docker-cli

EXPOSE 1995
WORKDIR /usr/src/app
COPY package.json /usr/src/app/
RUN npm install
COPY . /usr/src/app
CMD [ "/usr/src/app/trigger.sh" ]
