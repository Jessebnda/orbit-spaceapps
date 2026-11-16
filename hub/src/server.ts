import { createServer } from 'node:http';
import { WebSocketServer } from 'ws';
import { HUB_PORT } from '@orbit/shared';
import { handleHttp } from './routes/api';
import { onConnection } from './routes/ws';
import { broadcast } from './services/hub';

const server = createServer(handleHttp);
const wss = new WebSocketServer({ noServer: true, maxPayload: 1536 * 1024 });

// Only /ws is a WebSocket endpoint; other upgrades are refused.
server.on('upgrade', (req, socket, head) => {
  if (new URL(req.url ?? '/', 'http://hub').pathname !== '/ws') return socket.destroy();
  wss.handleUpgrade(req, socket, head, onConnection);
});

setInterval(() => broadcast(Date.now()), 3000);

const PORT = Number(process.env.HUB_PORT ?? HUB_PORT);
server.listen(PORT, '0.0.0.0', () => console.log(`[hub] http + ws /ws on :${PORT}`));
