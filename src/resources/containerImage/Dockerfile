FROM --platform=linux/arm64 node:20
WORKDIR /usr/src/app
COPY . .
RUN yarn && yarn build
EXPOSE 8080
CMD [ "node", "dist/server.js" ]

