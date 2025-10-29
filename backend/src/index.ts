import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import routes from "./routes/index";
import { Server, Socket } from "socket.io";
import { createServer } from "http";
import { setupVideoCallSocket } from "./socket/videoCallSocket";

dotenv.config();

const app = express();
const httpServer = createServer(app);

const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
  "http://localhost:5176",
  "http://localhost:5177",
  "http://localhost:5178",
  process.env.FRONTEND_URL,
  process.env.FRONTEND_ORIGIN
].filter(Boolean) as string[];

const io = new Server(httpServer, {
  cors: {
    origin: ALLOWED_ORIGINS,
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  },
});

// Middleware CORS
app.use(cors({
  origin: ALLOWED_ORIGINS,
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servire i file uploads come risorse statiche
app.use('/uploads', express.static('uploads'));

// Health check - must be before routes
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Routes
app.use("/api", routes);

// Socket.io per notifiche real-time
io.on("connection", (socket: Socket) => {
  console.log("Client connesso:", socket.id);

  socket.on("join", (userId: string) => {
    socket.join(`user:${userId}`);
    console.log(`User ${userId} joined room`);
  });

  socket.on("disconnect", () => {
    console.log("Client disconnesso:", socket.id);
  });
});

// Rendi io disponibile globalmente per inviare notifiche
(global as any).io = io;

// Setup Video Call Socket.IO namespace
setupVideoCallSocket(io);

// Error handler
app.use(
  (err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err.stack);
    res.status(500).json({
      error: "Errore interno del server",
      message: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
);

const PORT = parseInt(process.env.PORT || '4000', 10);
const HOST = process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost';

httpServer.listen(PORT, HOST, () => {
  console.log(`🚀 Server avviato su ${HOST}:${PORT}`);
  console.log(`📊 Ambiente: ${process.env.NODE_ENV}`);
  console.log(`🔗 API: http://localhost:${PORT}/api`);
  console.log(`✅ CORS abilitato per: ${ALLOWED_ORIGINS.join(', ')}`);
});
 

