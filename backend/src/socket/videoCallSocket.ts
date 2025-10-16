import { Server, Socket } from "socket.io";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

interface UserSocket extends Socket {
  userId?: string;
  roomId?: string;
  userName?: string;
}

// Mappa per tracciare gli utenti connessi in ogni room
const roomUsers = new Map<string, Map<string, { socketId: string; userId: string; userName: string; isMuted: boolean; isVideoOff: boolean }>>();

export const setupVideoCallSocket = (io: Server) => {
  // Namespace dedicato alle videochiamate
  const videoNamespace = io.of("/video");

  videoNamespace.on("connection", (socket: UserSocket) => {
    console.log(`📹 Utente connesso al namespace video: ${socket.id}`);

    // Join room
    socket.on("join-room", async (data: { roomId: string; userId: string; userName: string }) => {
      try {
        const { roomId, userId, userName } = data;

        // Verifica che la room esista
        const room = await db.videoRoom.findUnique({
          where: { id: roomId },
        });

        if (!room || !room.isActive) {
          socket.emit("error", { message: "Room non trovata o non attiva" });
          return;
        }

        // Salva info utente nel socket
        socket.userId = userId;
        socket.roomId = roomId;
        socket.userName = userName;

        // Join della room
        socket.join(roomId);

        // Inizializza mappa per la room se non esiste
        if (!roomUsers.has(roomId)) {
          roomUsers.set(roomId, new Map());
        }

        const usersInRoom = roomUsers.get(roomId)!;

        // Aggiungi utente alla mappa
        usersInRoom.set(userId, {
          socketId: socket.id,
          userId,
          userName,
          isMuted: false,
          isVideoOff: false,
        });

        // Aggiorna database
        await db.videoRoomParticipant.upsert({
          where: {
            roomId_userId: {
              roomId: roomId,
              userId: userId,
            },
          },
          create: {
            roomId: roomId,
            userId: userId,
            isConnected: true,
            isMuted: false,
            isVideoOff: false,
          },
          update: {
            isConnected: true,
            leftAt: null,
          },
        });

        // Invia messaggio di sistema
        await db.videoRoomMessage.create({
          data: {
            roomId: roomId,
            userId: userId,
            messaggio: `${userName} è entrato nella stanza`,
            tipo: "system",
          },
        });

        // Notifica gli altri utenti
        const otherUsers = Array.from(usersInRoom.entries())
          .filter(([id]) => id !== userId)
          .map(([id, user]) => ({
            userId: id,
            socketId: user.socketId,
            userName: user.userName,
            isMuted: user.isMuted,
            isVideoOff: user.isVideoOff,
          }));

        // Invia lista utenti al nuovo utente
        socket.emit("room-users", otherUsers);

        // Notifica tutti gli altri che un nuovo utente è entrato
        socket.to(roomId).emit("user-joined", {
          userId,
          socketId: socket.id,
          userName,
          isMuted: false,
          isVideoOff: false,
        });

        console.log(`👤 ${userName} (${userId}) entrato nella room ${roomId}`);
      } catch (error) {
        console.error("Errore join-room:", error);
        socket.emit("error", { message: "Errore durante l'accesso alla room" });
      }
    });

    // WebRTC Signaling: Offer
    socket.on("offer", (data: { to: string; offer: any }) => {
      console.log(`📤 Offer da ${socket.id} a ${data.to}`);
      videoNamespace.to(data.to).emit("offer", {
        from: socket.id,
        offer: data.offer,
      });
    });

    // WebRTC Signaling: Answer
    socket.on("answer", (data: { to: string; answer: any }) => {
      console.log(`📥 Answer da ${socket.id} a ${data.to}`);
      videoNamespace.to(data.to).emit("answer", {
        from: socket.id,
        answer: data.answer,
      });
    });

    // WebRTC Signaling: ICE Candidate
    socket.on("ice-candidate", (data: { to: string; candidate: any }) => {
      videoNamespace.to(data.to).emit("ice-candidate", {
        from: socket.id,
        candidate: data.candidate,
      });
    });

    // Toggle mute
    socket.on("toggle-mute", async (isMuted: boolean) => {
      if (!socket.roomId || !socket.userId) return;

      const usersInRoom = roomUsers.get(socket.roomId);
      if (usersInRoom) {
        const user = usersInRoom.get(socket.userId);
        if (user) {
          user.isMuted = isMuted;
        }
      }

      // Aggiorna database
      await db.videoRoomParticipant.updateMany({
        where: {
          roomId: socket.roomId,
          userId: socket.userId,
        },
        data: {
          isMuted: isMuted,
        },
      });

      // Notifica tutti
      socket.to(socket.roomId).emit("user-toggled-mute", {
        userId: socket.userId,
        isMuted,
      });
    });

    // Toggle video
    socket.on("toggle-video", async (isVideoOff: boolean) => {
      if (!socket.roomId || !socket.userId) return;

      const usersInRoom = roomUsers.get(socket.roomId);
      if (usersInRoom) {
        const user = usersInRoom.get(socket.userId);
        if (user) {
          user.isVideoOff = isVideoOff;
        }
      }

      // Aggiorna database
      await db.videoRoomParticipant.updateMany({
        where: {
          roomId: socket.roomId,
          userId: socket.userId,
        },
        data: {
          isVideoOff: isVideoOff,
        },
      });

      // Notifica tutti
      socket.to(socket.roomId).emit("user-toggled-video", {
        userId: socket.userId,
        isVideoOff,
      });
    });

    // Chat message
    socket.on("chat-message", async (messaggio: string) => {
      if (!socket.roomId || !socket.userId) return;

      try {
        // Salva messaggio nel database
        const msg = await db.videoRoomMessage.create({
          data: {
            roomId: socket.roomId,
            userId: socket.userId,
            messaggio: messaggio,
            tipo: "text",
          },
        });

        // Invia a tutti nella room
        videoNamespace.to(socket.roomId).emit("chat-message", {
          id: msg.id,
          userId: socket.userId,
          userName: socket.userName,
          messaggio: messaggio,
          createdAt: msg.createdAt,
        });
      } catch (error) {
        console.error("Errore invio messaggio:", error);
      }
    });

    // Leave room
    socket.on("leave-room", async () => {
      await handleUserDisconnect(socket);
    });

    // Disconnessione
    socket.on("disconnect", async () => {
      console.log(`📹 Utente disconnesso: ${socket.id}`);
      await handleUserDisconnect(socket);
    });
  });

  // Funzione helper per gestire la disconnessione
  async function handleUserDisconnect(socket: UserSocket) {
    if (!socket.roomId || !socket.userId) return;

    const { roomId, userId, userName } = socket;

    try {
      // Rimuovi utente dalla mappa
      const usersInRoom = roomUsers.get(roomId);
      if (usersInRoom) {
        usersInRoom.delete(userId);
        if (usersInRoom.size === 0) {
          roomUsers.delete(roomId);
        }
      }

      // Aggiorna database
      await db.videoRoomParticipant.updateMany({
        where: {
          roomId: roomId,
          userId: userId,
        },
        data: {
          isConnected: false,
          leftAt: new Date(),
        },
      });

      // Messaggio di sistema
      await db.videoRoomMessage.create({
        data: {
          roomId: roomId,
          userId: userId,
          messaggio: `${userName} ha lasciato la stanza`,
          tipo: "system",
        },
      });

      // Notifica gli altri utenti
      socket.to(roomId).emit("user-left", {
        userId: userId,
        socketId: socket.id,
      });

      console.log(`👋 ${userName} (${userId}) ha lasciato la room ${roomId}`);
    } catch (error) {
      console.error("Errore durante la disconnessione:", error);
    }
  }

  return videoNamespace;
};
