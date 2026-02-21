# Stage 1: Build
FROM --platform=linux/arm64 node:20-alpine AS build
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Production Run
FROM --platform=linux/arm64 node:20-alpine
ENV NODE_ENV=production
RUN apk add --no-cache curl
# Run as unprivileged user
USER node
WORKDIR /usr/src/app
COPY --chown=node:node package*.json ./
COPY --from=build --chown=node:node /usr/src/app/node_modules ./node_modules
COPY --from=build --chown=node:node /usr/src/app/dist ./dist
EXPOSE 8080
CMD [ "node", "dist/server.js" ]
