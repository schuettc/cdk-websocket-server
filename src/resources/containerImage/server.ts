/* eslint-disable import/no-extraneous-dependencies */
'use strict';

import * as http from 'http';
import express, { Response } from 'express';
import { Server as WebSocketServer, WebSocket } from 'ws';

const serverPort: number = 8080;
const app = express();
const server = http.createServer(app);
const websocketServer = new WebSocketServer({ server, path: '/wss' });

websocketServer.on('connection', (webSocketClient: WebSocket) => {
  console.log('New connection');
  webSocketClient.send('{ "connection" : "ok"}');

  webSocketClient.on('message', (message: string) => {
    console.log('New message');
    websocketServer.clients.forEach((client: WebSocket) => {
      client.send(`{ "message" : ${message} }`);
    });
  });
});

app.get('/health', (_, res: Response) => {
  console.log('Container Health check');
  res.status(200).send('Ok');
});

app.get('/', (_, res: Response) => {
  console.log('Target Group Health check');
  res.status(200).send('Ok');
});

server.listen(serverPort, () => {
  console.log('Websocket server started on port ' + serverPort);
});
