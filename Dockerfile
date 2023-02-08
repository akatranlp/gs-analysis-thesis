##### WEB BUILDER #####
FROM node:alpine AS builderWeb
RUN apk add --no-cache libc6-compat
RUN apk update
# Set working directory
WORKDIR /app
RUN npm install -g turbo
COPY . .
RUN turbo prune --scope=web --docker


##### APP BUILDER #####
FROM node:alpine AS builderApp
RUN apk add --no-cache libc6-compat
RUN apk update
# Set working directory
WORKDIR /app
RUN npm install -g turbo
COPY . .
RUN turbo prune --scope=gs-analysis --docker



##### WEB INSTALLER #####
# Add lockfile and package.json's of isolated subworkspace
FROM node:alpine AS installerWeb
RUN apk add --no-cache libc6-compat
RUN apk update
WORKDIR /app
RUN npm install -g turbo

# First install the dependencies (as they change less often)
COPY .gitignore .gitignore
COPY --from=builderWeb /app/out/json/ .
COPY --from=builderWeb /app/out/package-lock.json ./package-lock.json
RUN npm install

# Build the project
COPY --from=builderWeb /app/out/full/ .
RUN turbo run build --filter=web...



##### APP RUNNER #####
# Add lockfile and package.json's of isolated subworkspace
FROM node:alpine
RUN apk add --no-cache libc6-compat
RUN apk update
WORKDIR /app

COPY .gitignore .gitignore
COPY --from=builderApp /app/out/json/ .
COPY --from=builderApp /app/out/package-lock.json ./package-lock.json
RUN npm install

COPY --from=builderApp /app/out/full/ .
COPY turbo.json turbo.json

RUN npx turbo run build --filter=gs-analysis...
# RUN mkdir /app/apps/gs-analysis/dist/public

COPY --from=installerWeb /app/apps/web/dist/ /app/apps/gs-analysis/dist/public/

USER root
EXPOSE 3000
CMD npm run deployCommands -w=gs-analysis && npm run start -w=gs-analysis