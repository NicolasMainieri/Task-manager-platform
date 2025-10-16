import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

// Crea una nuova room
export const createRoom = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Utente non autenticato" });
    }
    const { nome, descrizione, tipo, teamId, maxPartecipanti, password, scheduledAt, invitedUserIds, meetingProvider, zoomMeetingId, zoomJoinUrl, googleMeetUrl } = req.body;

    if (!nome) {
      return res.status(400).json({ error: "Il nome è obbligatorio" });
    }

    // Ottieni il companyId dell'utente corrente per isolamento dati
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { companyId: true },
    });

    if (!user?.companyId) {
      return res.status(403).json({ error: "Utente non associato a nessuna azienda" });
    }

    const room = await db.videoRoom.create({
      data: {
        nome,
        descrizione,
        tipo: tipo || "meeting",
        creatoreId: userId,
        companyId: user.companyId, // ISOLAMENTO AZIENDALE
        teamId: teamId || null,
        maxPartecipanti: maxPartecipanti || 50,
        password: password || null,
        isActive: true,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        invitedUserIds: invitedUserIds || "[]",
        meetingProvider: meetingProvider || null,
        zoomMeetingId: zoomMeetingId || null,
        zoomJoinUrl: zoomJoinUrl || null,
        googleMeetUrl: googleMeetUrl || null,
      },
      include: {
        creatore: {
          select: {
            id: true,
            nome: true,
            cognome: true,
            email: true,
            avatar: true,
          },
        },
      },
    });

    // Se la riunione è programmata, crea eventi nel calendario per tutti gli utenti invitati
    if (scheduledAt && invitedUserIds) {
      try {
        const userIdsArray = JSON.parse(invitedUserIds);
        const scheduledDate = new Date(scheduledAt);
        const endDate = new Date(scheduledDate.getTime() + 60 * 60 * 1000); // +1 ora

        const meetingUrl = zoomJoinUrl || googleMeetUrl || `${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard?view=videocall&room=${room.id}`;

        // Crea evento per il creatore + tutti gli invitati
        const allUserIds = [userId, ...userIdsArray];

        await Promise.all(
          allUserIds.map((targetUserId) =>
            db.calendarEvent.create({
              data: {
                organizerId: userId,
                titolo: nome,
                descrizione: descrizione || '',
                tipo: 'meeting',
                dataInizio: scheduledDate,
                dataFine: endDate,
                linkMeeting: meetingUrl,
                colore: '#6366F1',
                reminderMinutes: 15,
                partecipanti: {
                  connect: { id: targetUserId },
                },
              },
            })
          )
        );
      } catch (error) {
        console.error('Errore creazione eventi calendario:', error);
      }
    }

    // Crea notifica per gli utenti del team (se specificato)
    if (teamId) {
      const teamUsers = await db.user.findMany({
        where: { teamId: teamId, id: { not: userId } },
        select: { id: true },
      });

      await Promise.all(
        teamUsers.map((user) =>
          db.notification.create({
            data: {
              userId: user.id,
              tipo: "info",
              titolo: "Nuova stanza videochiamata",
              messaggio: `È stata creata una nuova stanza: ${nome}`,
              link: `/video/${room.id}`,
              letta: false,
            },
          })
        )
      );
    }

    res.status(201).json(room);
  } catch (error: any) {
    console.error("Errore creazione room:", error);
    res.status(500).json({ error: "Errore durante la creazione della room" });
  }
};

// Ottieni tutte le room
export const getAllRooms = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { tipo, teamId } = req.query;

    // Ottieni il companyId dell'utente per isolamento dati
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { companyId: true },
    });

    if (!user?.companyId) {
      return res.status(403).json({ error: "Utente non associato a nessuna azienda" });
    }

    const where: any = {
      isActive: true,
      companyId: user.companyId, // ISOLAMENTO AZIENDALE - mostra solo room della propria azienda
    };

    if (tipo) {
      where.tipo = tipo;
    }

    if (teamId) {
      where.teamId = teamId;
    }

    const rooms = await db.videoRoom.findMany({
      where,
      include: {
        creatore: {
          select: {
            id: true,
            nome: true,
            cognome: true,
            avatar: true,
          },
        },
        partecipanti: {
          where: {
            isConnected: true,
          },
          select: {
            userId: true,
            isMuted: true,
            isVideoOff: true,
          },
        },
        _count: {
          select: {
            partecipanti: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json(rooms);
  } catch (error: any) {
    console.error("Errore recupero rooms:", error);
    res.status(500).json({ error: "Errore durante il recupero delle room" });
  }
};

// Ottieni una singola room
export const getRoom = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { roomId } = req.params;

    // Ottieni il companyId dell'utente per isolamento dati
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { companyId: true },
    });

    if (!user?.companyId) {
      return res.status(403).json({ error: "Utente non associato a nessuna azienda" });
    }

    const room = await db.videoRoom.findUnique({
      where: { id: roomId },
      include: {
        creatore: {
          select: {
            id: true,
            nome: true,
            cognome: true,
            email: true,
            avatar: true,
          },
        },
        partecipanti: {
          orderBy: {
            joinedAt: "asc",
          },
        },
        chiamate: {
          where: {
            stato: "active",
          },
          orderBy: {
            startedAt: "desc",
          },
          take: 1,
        },
      },
    });

    if (!room) {
      return res.status(404).json({ error: "Room non trovata" });
    }

    // ISOLAMENTO AZIENDALE - verifica che la room appartenga alla stessa azienda dell'utente
    if (room.companyId !== user.companyId) {
      return res.status(403).json({ error: "Non hai accesso a questa room" });
    }

    res.json(room);
  } catch (error: any) {
    console.error("Errore recupero room:", error);
    res.status(500).json({ error: "Errore durante il recupero della room" });
  }
};

// Aggiorna room
export const updateRoom = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { roomId } = req.params;
    const { nome, descrizione, maxPartecipanti, password, isActive, scheduledAt, invitedUserIds, meetingProvider, zoomJoinUrl, googleMeetUrl } = req.body;

    // Verifica che l'utente sia il creatore
    const room = await db.videoRoom.findUnique({
      where: { id: roomId },
    });

    if (!room) {
      return res.status(404).json({ error: "Room non trovata" });
    }

    if (room.creatoreId !== userId) {
      return res.status(403).json({ error: "Non autorizzato" });
    }

    const updatedRoom = await db.videoRoom.update({
      where: { id: roomId },
      data: {
        ...(nome && { nome }),
        ...(descrizione !== undefined && { descrizione }),
        ...(maxPartecipanti && { maxPartecipanti }),
        ...(password !== undefined && { password }),
        ...(isActive !== undefined && { isActive }),
        ...(scheduledAt !== undefined && { scheduledAt: scheduledAt ? new Date(scheduledAt) : null }),
        ...(invitedUserIds !== undefined && { invitedUserIds }),
        ...(meetingProvider !== undefined && { meetingProvider }),
        ...(zoomJoinUrl !== undefined && { zoomJoinUrl }),
        ...(googleMeetUrl !== undefined && { googleMeetUrl }),
      },
      include: {
        creatore: {
          select: {
            id: true,
            nome: true,
            cognome: true,
            avatar: true,
          },
        },
      },
    });

    // Se modificata data/ora o utenti invitati, aggiorna eventi calendario
    if (scheduledAt !== undefined || invitedUserIds !== undefined) {
      try {
        // Elimina vecchi eventi collegati a questa room
        await db.calendarEvent.deleteMany({
          where: {
            linkMeeting: {
              contains: `room=${roomId}`,
            },
          },
        });

        // Crea nuovi eventi se la riunione è ancora programmata
        if (updatedRoom.scheduledAt && updatedRoom.invitedUserIds) {
          const userIdsArray = JSON.parse(updatedRoom.invitedUserIds);
          const scheduledDate = new Date(updatedRoom.scheduledAt);
          const endDate = new Date(scheduledDate.getTime() + 60 * 60 * 1000);
          const meetingUrl = updatedRoom.zoomJoinUrl || updatedRoom.googleMeetUrl || `${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard?view=videocall&room=${roomId}`;

          const allUserIds = [userId, ...userIdsArray];

          await Promise.all(
            allUserIds.map((targetUserId) =>
              db.calendarEvent.create({
                data: {
                  organizerId: userId,
                  titolo: updatedRoom.nome,
                  descrizione: updatedRoom.descrizione || '',
                  tipo: 'meeting',
                  dataInizio: scheduledDate,
                  dataFine: endDate,
                  linkMeeting: meetingUrl,
                  colore: '#6366F1',
                  reminderMinutes: 15,
                  partecipanti: {
                    connect: { id: targetUserId },
                  },
                },
              })
            )
          );
        }
      } catch (error) {
        console.error('Errore aggiornamento eventi calendario:', error);
      }
    }

    res.json(updatedRoom);
  } catch (error: any) {
    console.error("Errore aggiornamento room:", error);
    res.status(500).json({ error: "Errore durante l'aggiornamento della room" });
  }
};

// Elimina room
export const deleteRoom = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { roomId } = req.params;

    // Verifica che l'utente sia il creatore
    const room = await db.videoRoom.findUnique({
      where: { id: roomId },
    });

    if (!room) {
      return res.status(404).json({ error: "Room non trovata" });
    }

    if (room.creatoreId !== userId) {
      return res.status(403).json({ error: "Non autorizzato" });
    }

    await db.videoRoom.delete({
      where: { id: roomId },
    });

    res.json({ message: "Room eliminata con successo" });
  } catch (error: any) {
    console.error("Errore eliminazione room:", error);
    res.status(500).json({ error: "Errore durante l'eliminazione della room" });
  }
};

// Ottieni storico messaggi
export const getRoomMessages = async (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const messages = await db.videoRoomMessage.findMany({
      where: { roomId },
      orderBy: {
        createdAt: "desc",
      },
      take: Number(limit),
      skip: Number(offset),
    });

    res.json(messages.reverse());
  } catch (error: any) {
    console.error("Errore recupero messaggi:", error);
    res.status(500).json({ error: "Errore durante il recupero dei messaggi" });
  }
};

// Inizia una chiamata
export const startCall = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { roomId } = req.params;
    const { titolo, descrizione } = req.body;

    // Verifica che la room esista
    const room = await db.videoRoom.findUnique({
      where: { id: roomId },
    });

    if (!room) {
      return res.status(404).json({ error: "Room non trovata" });
    }

    // Crea la chiamata
    const call = await db.videoCall.create({
      data: {
        roomId,
        titolo: titolo || room.nome,
        descrizione,
        startedAt: new Date(),
        stato: "active",
      },
    });

    res.status(201).json(call);
  } catch (error: any) {
    console.error("Errore avvio chiamata:", error);
    res.status(500).json({ error: "Errore durante l'avvio della chiamata" });
  }
};

// Termina chiamata
export const endCall = async (req: Request, res: Response) => {
  try {
    const { callId } = req.params;

    const call = await db.videoCall.update({
      where: { id: callId },
      data: {
        endedAt: new Date(),
        stato: "ended",
      },
    });

    res.json(call);
  } catch (error: any) {
    console.error("Errore termine chiamata:", error);
    res.status(500).json({ error: "Errore durante il termine della chiamata" });
  }
};

// Ottieni partecipanti attivi
export const getActiveParticipants = async (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;

    const participants = await db.videoRoomParticipant.findMany({
      where: {
        roomId,
        isConnected: true,
      },
    });

    res.json(participants);
  } catch (error: any) {
    console.error("Errore recupero partecipanti:", error);
    res.status(500).json({ error: "Errore durante il recupero dei partecipanti" });
  }
};

// Notifica utenti invitati
export const notifyUsers = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { roomId } = req.params;
    const { userIds } = req.body;

    if (!userIds || !Array.isArray(userIds)) {
      return res.status(400).json({ error: "userIds deve essere un array" });
    }

    // Ottieni info room
    const room = await db.videoRoom.findUnique({
      where: { id: roomId },
      include: {
        creatore: {
          select: {
            nome: true,
            cognome: true,
          },
        },
      },
    });

    if (!room) {
      return res.status(404).json({ error: "Room non trovata" });
    }

    // Verifica autorizzazione
    if (room.creatoreId !== userId) {
      return res.status(403).json({ error: "Non autorizzato" });
    }

    // Crea notifiche per ogni utente
    await Promise.all(
      userIds.map((targetUserId) =>
        db.notification.create({
          data: {
            userId: targetUserId,
            tipo: "meeting",
            titolo: room.scheduledAt ? "Nuova riunione programmata" : "Invito a riunione",
            messaggio: room.scheduledAt
              ? `${room.creatore.nome} ${room.creatore.cognome} ti ha invitato a "${room.nome}" il ${new Date(room.scheduledAt).toLocaleDateString('it-IT')} alle ${new Date(room.scheduledAt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}`
              : `${room.creatore.nome} ${room.creatore.cognome} ti ha invitato a "${room.nome}"`,
            link: `/videocall?room=${room.id}`,
            letta: false,
          },
        })
      )
    );

    res.json({ message: "Notifiche inviate con successo", count: userIds.length });
  } catch (error: any) {
    console.error("Errore invio notifiche:", error);
    res.status(500).json({ error: "Errore durante l'invio delle notifiche" });
  }
};

// Ottieni le prossime call dell'utente
export const getMyUpcomingCalls = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Utente non autenticato" });
    }

    const { limit = 3 } = req.query;
    const now = new Date();

    // Cerca room programmate dove l'utente è invitato o creatore
    const rooms = await db.videoRoom.findMany({
      where: {
        AND: [
          {
            scheduledAt: {
              gte: now // Solo riunioni future
            }
          },
          {
            OR: [
              { creatoreId: userId },
              {
                invitedUserIds: {
                  contains: userId // Cerca l'ID dell'utente negli inviti
                }
              }
            ]
          }
        ]
      },
      orderBy: {
        scheduledAt: 'asc'
      },
      take: Number(limit),
      select: {
        id: true,
        nome: true,
        scheduledAt: true,
        descrizione: true,
        meetingProvider: true,
        zoomJoinUrl: true,
        googleMeetUrl: true,
        creatore: {
          select: {
            nome: true,
            cognome: true
          }
        }
      }
    });

    res.json(rooms);
  } catch (error: any) {
    console.error("Errore recupero prossime call:", error);
    res.status(500).json({ error: "Errore durante il recupero delle prossime call" });
  }
};

export const videoCallController = {
  createRoom,
  getAllRooms,
  getRoom,
  updateRoom,
  deleteRoom,
  getRoomMessages,
  startCall,
  endCall,
  getActiveParticipants,
  notifyUsers,
  getMyUpcomingCalls,
};
