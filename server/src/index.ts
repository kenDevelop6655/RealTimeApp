import http from 'node:http';
import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import { env } from './env';
import { authRouter } from './routes/auth';
import { historyRouter } from './routes/history';
import { hocuspocusServer } from './hocuspocus/server';

const app = express();
app.use(cors({ origin: env.clientOrigin }));
app.use(express.json());

app.get('/health', (_req, res) => res.json({ ok: true }));
app.use(authRouter);
app.use('/history', historyRouter);

const httpServer = http.createServer(app);

// Hocuspocus(Yjs同期)とREST APIを同一Node.jsプロセスで待ち受ける。
// WebSocketのアップグレードは /collaboration パスのみ受け付ける。
const wss = new WebSocketServer({ noServer: true });

httpServer.on('upgrade', (request, socket, head) => {
  const { pathname } = new URL(request.url ?? '', 'http://localhost');

  if (pathname !== '/collaboration') {
    socket.destroy();
    return;
  }

  wss.handleUpgrade(request, socket, head, (ws) => {
    hocuspocusServer.handleConnection(ws, request);
  });
});

httpServer.listen(env.port, () => {
  console.log(`server listening on http://localhost:${env.port} (REST + /collaboration)`);
});
