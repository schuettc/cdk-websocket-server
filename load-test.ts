import WebSocket from 'ws';

const args = process.argv.slice(2);
const url = args[0];

if (!url) {
  console.error('Error: Please provide a WebSocket URL as the first argument.');
  console.error('Usage: npm run load-test wss://<domain>.cloudfront.net/wss');
  process.exit(1);
}

const TOTAL_CONNECTIONS = 50;
const connections: WebSocket[] = [];

console.log(`Starting load test with ${TOTAL_CONNECTIONS} connections to ${url}...`);
console.log(`Our Auto Scaling target should be set to 5 connections per task.`);
console.log(`This should force AWS to spin up multiple new Fargate containers!`);

function connect() {
  const ws = new WebSocket(url);
  
  ws.on('open', () => {
    connections.push(ws);
    // Drop the connection soon after opening to clear it out and make a new one
    setTimeout(() => {
      ws.close();
    }, 500);
  });
  
  ws.on('error', () => {});
  
  ws.on('close', () => {
    // Remove from active list
    const idx = connections.indexOf(ws);
    if(idx > -1) connections.splice(idx, 1);
    
    // Immediately trigger a new request to artificially skyrocket RequestCount
    setTimeout(() => connect(), 10); 
  });
}

for (let i = 0; i < TOTAL_CONNECTIONS; i++) {
  setTimeout(() => connect(), i * 20);
}

// Keep the connections open and periodically log status
setInterval(() => {
  const activeCount = connections.filter((ws: WebSocket | undefined) => ws && ws.readyState === WebSocket.OPEN).length;
  console.log(`Active WebSocket Connections: ${activeCount}`);
}, 5000);
