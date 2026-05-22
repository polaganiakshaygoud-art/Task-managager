require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const path = require('path');

const { JWT_SECRET } = require('./middleware/auth');
const { getDb } = require('./db');
const authRoutes = require('./routes/auth');
const tasksRouter = require('./routes/tasks');

const app = express();
const server = http.createServer(app);

app.use(cors({
  origin: ['http://localhost:3000','http://127.0.0.1:3000','http://localhost:5500','http://127.0.0.1:5500','null'],
  credentials: true
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// --- WebSocket ---
const wss = new WebSocket.Server({ server });
const userSockets = new Map();

wss.on('connection', (ws, req) => {
  const url = new URL(req.url, 'http://localhost');
  const token = url.searchParams.get('token');
  if (!token) { ws.close(4001, 'No token'); return; }

  let user;
  try { user = jwt.verify(token, JWT_SECRET); }
  catch { ws.close(4001, 'Invalid token'); return; }

  ws.userId = user.id;
  if (!userSockets.has(user.id)) userSockets.set(user.id, new Set());
  userSockets.get(user.id).add(ws);
  console.log(`🔌 WS: ${user.username} connected (${wss.clients.size} total)`);
  ws.send(JSON.stringify({ event: 'connected', data: { message: 'Real-time sync active' } }));

  ws.on('close', () => {
    const s = userSockets.get(user.id);
    if (s) { s.delete(ws); if (!s.size) userSockets.delete(user.id); }
  });
  ws.on('error', console.error);
});

function broadcastToUser(userId, message) {
  const sockets = userSockets.get(userId);
  if (!sockets) return;
  const payload = JSON.stringify(message);
  for (const ws of sockets) {
    if (ws.readyState === WebSocket.OPEN) ws.send(payload);
  }
}

tasksRouter.broadcast = broadcastToUser;

// --- Routes ---
app.use('/api/auth', authRoutes);
app.use('/api/tasks', tasksRouter);
app.get('/api/health', (_, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));
app.get('/api/config', (_, res) => res.json({ 
  googleClientId: process.env.GOOGLE_CLIENT_ID 
}));
app.get('*', (_, res) => res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html')));

// --- Boot: init DB then listen ---
const PORT = process.env.PORT || 3000;

(async () => {
  try {
    await getDb();
    console.log('✅ Database initialized');
    server.listen(PORT, () => {
      console.log(`\n🚀 TaskFlow running at http://localhost:${PORT}`);
      console.log(`🔌 WebSocket ready`);
      console.log(`📂 DB: taskmanager.db\n`);
    });
  } catch (err) {
    console.error('❌ Failed to initialize database:', err);
    process.exit(1);
  }
})();
