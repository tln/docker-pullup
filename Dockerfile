FROM node:12.2-slim

# install docker
RUN apt-get update && apt-get install -y docker

EXPOSE 1995
WORKDIR /usr/src/app
COPY package.json /usr/src/app/
RUN npm install
COPY . /usr/src/app
CMD [ "/usr/src/app/trigger.sh" ]
