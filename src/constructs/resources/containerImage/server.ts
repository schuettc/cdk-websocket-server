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
  webSocketClient.send(JSON.stringify({ connection: 'ok' }));

  webSocketClient.on('message', (message: string) => {
    console.log('New message');
    try {
      const parsedMessage = JSON.parse(message.toString());
      websocketServer.clients.forEach((client: WebSocket) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ message: parsedMessage }));
        }
      });
    } catch (e) {
      console.error('Invalid JSON message format received');
    }
  });

  webSocketClient.on('error', (error) => {
    console.error('WebSocket client error:', error);
  });
});

app.get('/health', (_, res: Response) => {
  res.status(200).send('Ok');
});

app.get('/', (_, res: Response) => {
  res.status(200).send('Ok');
});

server.listen(serverPort, () => {
  console.log('Websocket server started on port ' + serverPort);
});

// Graceful shutdown
const shutdown = () => {
  console.log('Shutting down gracefully...');

  // Disconnect all active WebSocket clients so they don't hang
  websocketServer.clients.forEach((client: WebSocket) => {
    if (client.readyState === WebSocket.OPEN) {
      client.close(1001, 'Server shutting down');
    }
  });

  server.close(() => {
    console.log('Closed out remaining HTTP connections.');
    process.exit(0);
  });

  setTimeout(() => {
    console.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
