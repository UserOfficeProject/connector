FROM node:18-alpine AS build-stage

USER node

RUN mkdir -p /home/node/app

WORKDIR /home/node/app

COPY --chown=node:node package*.json ./

RUN HUSKY=0 npm ci --loglevel error --no-fund

COPY --chown=node:node . .

RUN npm run build

FROM node:18-alpine

USER node

RUN mkdir -p /home/node/app

WORKDIR /home/node/app

COPY --from=build-stage --chown=node:node /home/node/app/build ./build
COPY --from=build-stage --chown=node:node /home/node/app/package*.json ./

# Disable husky install in the build process as  it is running in package.json prepare script
RUN npm pkg delete scripts.prepare

RUN npm ci --only=production --loglevel error --no-fund

EXPOSE 4010

CMD [ "node", "./build/src/index.js" ]
