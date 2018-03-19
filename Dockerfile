FROM node:8.10-alpine
EXPOSE 1995
WORKDIR /usr/src/app
COPY package.json /usr/src/app/
RUN npm install
COPY . /usr/src/app
CMD [ "/usr/src/app/trigger.sh" ]
