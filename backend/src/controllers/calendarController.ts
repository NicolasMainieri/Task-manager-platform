import { Response } from "express";
import prisma from "../config/database";
import { AuthRequest } from "../middleware/auth";
import { stringifyJsonField } from "../utils/jsonHelper";

class CalendarController {
  // Crea un evento calendario
  async createEvent(req: AuthRequest, res: Response) {
    try {
      const { titolo, descrizione, tipo, dataInizio, dataFine, luogo, linkMeeting, allDay, colore, partecipantiIds, taskId, reminderMinutes } = req.body;

      if (!titolo || !dataInizio || !dataFine) {
        return res.status(400).json({ error: "Titolo, dataInizio e dataFine sono obbligatori" });
      }

      const currentUser = await prisma.user.findUnique({
        where: { id: req.user!.id },
        select: { companyId: true }
      });

      const event = await prisma.calendarEvent.create({
        data: {
          titolo,
          descrizione,
          tipo: tipo || "meeting",
          dataInizio: new Date(dataInizio),
          dataFine: new Date(dataFine),
          luogo,
          linkMeeting,
          allDay: allDay || false,
          colore: colore || "#3B82F6",
          organizerId: req.user!.id,
          taskId,
          reminderMinutes: reminderMinutes || 15,
          partecipanti: partecipantiIds ? { connect: partecipantiIds.map((id: string) => ({ id })) } : undefined
        },
        include: {
          organizer: { select: { id: true, nome: true, cognome: true, email: true } },
          partecipanti: { select: { id: true, nome: true, cognome: true, email: true } },
          task: { select: { id: true, titolo: true } }
        }
      });

      // Invia notifiche ai partecipanti
      if (partecipantiIds && partecipantiIds.length > 0) {
        for (const userId of partecipantiIds) {
          if (userId !== req.user!.id) {
            await prisma.notification.create({
              data: {
                userId,
                tipo: "calendar_invite",
                titolo: "Nuovo evento calendario",
                messaggio: `${req.user!.nome} ${req.user!.cognome} ti ha invitato a: ${titolo}`,
                link: `/calendar/${event.id}`
              }
            });
          }
        }
      }

      await prisma.auditLog.create({
        data: {
          entita: "CalendarEvent",
          entitaId: event.id,
          azione: "create",
          autoreId: req.user!.id,
          payload: stringifyJsonField({ titolo, dataInizio, dataFine })
        }
      });

      res.status(201).json(event);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // Ottieni tutti gli eventi (filtrati per utente e azienda)
  async getEvents(req: AuthRequest, res: Response) {
    try {
      const { startDate, endDate, tipo } = req.query as any;

      const currentUser = await prisma.user.findUnique({
        where: { id: req.user!.id },
        select: { companyId: true }
      });

      const where: any = {
        OR: [
          { organizerId: req.user!.id },
          { partecipanti: { some: { id: req.user!.id } } }
        ]
      };

      // Filtro per azienda tramite organizer
      where.organizer = { companyId: currentUser?.companyId };

      if (startDate && endDate) {
        where.dataInizio = {
          gte: new Date(startDate as string),
          lte: new Date(endDate as string)
        };
      }

      if (tipo) where.tipo = tipo;

      const events = await prisma.calendarEvent.findMany({
        where,
        include: {
          organizer: { select: { id: true, nome: true, cognome: true, email: true } },
          partecipanti: { select: { id: true, nome: true, cognome: true, email: true } },
          task: { select: { id: true, titolo: true } }
        },
        orderBy: { dataInizio: "asc" }
      });

      res.json(events);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // Ottieni un singolo evento
  async getEventById(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const event = await prisma.calendarEvent.findUnique({
        where: { id },
        include: {
          organizer: { select: { id: true, nome: true, cognome: true, email: true, companyId: true } },
          partecipanti: { select: { id: true, nome: true, cognome: true, email: true } },
          task: { select: { id: true, titolo: true, descrizione: true } }
        }
      });

      if (!event) {
        return res.status(404).json({ error: "Evento non trovato" });
      }

      const currentUser = await prisma.user.findUnique({
        where: { id: req.user!.id },
        select: { companyId: true }
      });

      // Verifica accesso
      if (event.organizer.companyId !== currentUser?.companyId) {
        return res.status(403).json({ error: "Non hai accesso a questo evento" });
      }

      const isOrganizer = event.organizerId === req.user!.id;
      const isParticipant = event.partecipanti.some(p => p.id === req.user!.id);

      if (!isOrganizer && !isParticipant) {
        return res.status(403).json({ error: "Non hai accesso a questo evento" });
      }

      res.json(event);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // Aggiorna un evento
  async updateEvent(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { titolo, descrizione, tipo, dataInizio, dataFine, luogo, linkMeeting, allDay, colore, partecipantiIds, reminderMinutes } = req.body;

      const existingEvent = await prisma.calendarEvent.findUnique({
        where: { id },
        include: { organizer: { select: { companyId: true } } }
      });

      if (!existingEvent) {
        return res.status(404).json({ error: "Evento non trovato" });
      }

      const currentUser = await prisma.user.findUnique({
        where: { id: req.user!.id },
        select: { companyId: true }
      });

      if (existingEvent.organizer.companyId !== currentUser?.companyId) {
        return res.status(403).json({ error: "Non hai accesso a questo evento" });
      }

      // Solo l'organizer può modificare
      if (existingEvent.organizerId !== req.user!.id) {
        return res.status(403).json({ error: "Solo l'organizzatore può modificare questo evento" });
      }

      const updateData: any = {
        titolo,
        descrizione,
        tipo,
        luogo,
        linkMeeting,
        allDay,
        colore,
        reminderMinutes
      };

      if (dataInizio) updateData.dataInizio = new Date(dataInizio);
      if (dataFine) updateData.dataFine = new Date(dataFine);

      if (partecipantiIds) {
        updateData.partecipanti = { set: partecipantiIds.map((id: string) => ({ id })) };
      }

      const event = await prisma.calendarEvent.update({
        where: { id },
        data: updateData,
        include: {
          organizer: { select: { id: true, nome: true, cognome: true, email: true } },
          partecipanti: { select: { id: true, nome: true, cognome: true, email: true } },
          task: { select: { id: true, titolo: true } }
        }
      });

      await prisma.auditLog.create({
        data: {
          entita: "CalendarEvent",
          entitaId: event.id,
          azione: "update",
          autoreId: req.user!.id,
          payload: stringifyJsonField(req.body)
        }
      });

      res.json(event);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // Elimina un evento
  async deleteEvent(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const event = await prisma.calendarEvent.findUnique({
        where: { id },
        include: { organizer: { select: { companyId: true } } }
      });

      if (!event) {
        return res.status(404).json({ error: "Evento non trovato" });
      }

      const currentUser = await prisma.user.findUnique({
        where: { id: req.user!.id },
        select: { companyId: true }
      });

      if (event.organizer.companyId !== currentUser?.companyId) {
        return res.status(403).json({ error: "Non hai accesso a questo evento" });
      }

      if (event.organizerId !== req.user!.id) {
        return res.status(403).json({ error: "Solo l'organizzatore può eliminare questo evento" });
      }

      await prisma.calendarEvent.delete({ where: { id } });

      await prisma.auditLog.create({
        data: {
          entita: "CalendarEvent",
          entitaId: id,
          azione: "delete",
          autoreId: req.user!.id,
          payload: stringifyJsonField({ titolo: event.titolo })
        }
      });

      res.json({ message: "Evento eliminato con successo" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}

export default new CalendarController();
