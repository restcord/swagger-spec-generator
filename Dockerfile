FROM node:16-alpine

#Dependencies
RUN apk add --virtual .build-deps python3 make g++ gcc git

WORKDIR /usr/src/app

COPY / /usr/src/app/

RUN npm install -g npm

RUN npm install

CMD [ "npm", "start" ]