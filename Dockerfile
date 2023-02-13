##### WEB BUILDER #####
FROM node:alpine AS builderWeb
RUN apk add --no-cache libc6-compat
RUN apk update

WORKDIR /app
RUN npm install -g turbo
COPY . .
RUN turbo prune --scope=web --docker


##### APP BUILDER #####
FROM node:alpine AS builderApp
RUN apk add --no-cache libc6-compat
RUN apk update

WORKDIR /app
RUN npm install -g turbo
COPY . .
RUN turbo prune --scope=gs-analysis --docker



##### WEB INSTALLER #####
FROM node:alpine AS installerWeb
RUN apk add --no-cache libc6-compat
RUN apk update
WORKDIR /app
RUN npm install -g turbo

COPY --from=builderWeb /app/out/json/ .
COPY --from=builderWeb /app/out/package-lock.json ./package-lock.json
RUN npm install

COPY --from=builderWeb /app/out/full/ .
RUN turbo run build --filter=web...



##### APP RUNNER #####
FROM node:alpine
RUN apk add --no-cache libc6-compat
RUN apk update
WORKDIR /app

COPY --from=builderApp /app/out/json/ .
COPY --from=builderApp /app/out/package-lock.json ./package-lock.json
RUN npm install

COPY --from=builderApp /app/out/full/ .
COPY --from=builderApp /app/turbo.json turbo.json

RUN npx turbo run build --filter=gs-analysis...

COPY --from=installerWeb /app/apps/web/dist/ /app/apps/gs-analysis/dist/public/
COPY --from=builderApp /app/apps/gs-analysis/src/public /app/apps/gs-analysis/dist/public/

USER root
EXPOSE 3000
CMD npm run deployCommands -w=gs-analysis && npm run start -w=gs-analysis
