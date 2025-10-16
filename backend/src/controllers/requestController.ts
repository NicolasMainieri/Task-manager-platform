import { Response } from "express";
import prisma from "../config/database";
import { AuthRequest } from "../middleware/auth";
import { stringifyJsonField } from "../utils/jsonHelper";

class RequestController {
  // Crea una richiesta per un task
  async createRequest(req: AuthRequest, res: Response) {
    try {
      const { taskId, tipo, urgenza, descrizione } = req.body;

      if (!taskId || !tipo || !descrizione) {
        return res.status(400).json({ error: "TaskId, tipo e descrizione sono obbligatori" });
      }

      // Verifica che il task esista e che l'utente sia assegnato
      const task = await prisma.task.findUnique({
        where: { id: taskId },
        include: {
          assignees: { select: { id: true } },
          owner: { select: { companyId: true } }
        }
      });

      if (!task) {
        return res.status(404).json({ error: "Task non trovato" });
      }

      const currentUser = await prisma.user.findUnique({
        where: { id: req.user!.id },
        select: { companyId: true }
      });

      // Verifica che l'utente appartenga alla stessa azienda
      if (task.owner.companyId !== currentUser?.companyId) {
        return res.status(403).json({ error: "Non hai accesso a questo task" });
      }

      // Verifica che l'utente sia assegnato al task o sia il proprietario
      const isAssignee = task.assignees.some(a => a.id === req.user!.id);
      const isOwner = task.ownerId === req.user!.id;

      if (!isAssignee && !isOwner) {
        return res.status(403).json({ error: "Non sei assegnato a questo task" });
      }

      // Crea la richiesta
      const request = await prisma.request.create({
        data: {
          tipo,
          urgenza: urgenza || "media",
          descrizione,
          stato: "aperta",
          autoreId: req.user!.id,
          taskId
        },
        include: {
          autore: { select: { id: true, nome: true, cognome: true, email: true } },
          task: { select: { id: true, titolo: true } }
        }
      });

      // Notifica gli admin della richiesta
      const admins = await prisma.user.findMany({
        where: {
          companyId: currentUser?.companyId,
          OR: [
            { role: { nome: 'Admin' } },
            { adminCompany: { isNot: null } }
          ]
        }
      });

      for (const admin of admins) {
        await prisma.notification.create({
          data: {
            userId: admin.id,
            tipo: "task_request",
            titolo: "Nuova richiesta su task",
            messaggio: `${req.user!.nome} ${req.user!.cognome} ha creato una richiesta "${tipo}" per il task: ${task.titolo}`,
            link: `/tasks/${taskId}`
          }
        });
      }

      await prisma.auditLog.create({
        data: {
          entita: "Request",
          entitaId: request.id,
          azione: "create",
          autoreId: req.user!.id,
          payload: stringifyJsonField({ taskId, tipo })
        }
      });

      res.status(201).json(request);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // Ottieni tutte le richieste (admin vede tutte, utente solo le proprie)
  async getRequests(req: AuthRequest, res: Response) {
    try {
      const { stato, taskId, page = 1, limit = 50 } = req.query as any;

      const currentUser = await prisma.user.findUnique({
        where: { id: req.user!.id },
        select: { companyId: true, role: true }
      });

      if (!currentUser?.companyId) {
        return res.status(403).json({ error: "Utente non associato a un'azienda" });
      }

      const isAdmin = (req.user!.role.permessi as any).isAdmin;

      const where: any = {
        autore: {
          companyId: currentUser.companyId
        }
      };

      // Se non è admin, vede solo le proprie richieste
      if (!isAdmin) {
        where.autoreId = req.user!.id;
      }

      if (stato) where.stato = stato;
      if (taskId) where.taskId = taskId;

      const skip = (Number(page) - 1) * Number(limit);

      const [requests, total] = await Promise.all([
        prisma.request.findMany({
          where,
          include: {
            autore: { select: { id: true, nome: true, cognome: true, email: true } },
            task: { select: { id: true, titolo: true } },
            risposte: {
              include: {
                autore: { select: { id: true, nome: true, cognome: true, email: true } }
              },
              orderBy: { createdAt: 'asc' }
            }
          },
          orderBy: { createdAt: "desc" },
          skip,
          take: Number(limit)
        }),
        prisma.request.count({ where })
      ]);

      res.json({
        requests,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          pages: Math.ceil(total / Number(limit))
        }
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // Ottieni una singola richiesta
  async getRequestById(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const request = await prisma.request.findUnique({
        where: { id },
        include: {
          autore: { select: { id: true, nome: true, cognome: true, email: true, companyId: true } },
          task: {
            include: {
              owner: { select: { id: true, nome: true, cognome: true } },
              assignees: { select: { id: true, nome: true, cognome: true } }
            }
          }
        }
      });

      if (!request) {
        return res.status(404).json({ error: "Richiesta non trovata" });
      }

      const currentUser = await prisma.user.findUnique({
        where: { id: req.user!.id },
        select: { companyId: true }
      });

      // Verifica che l'utente appartenga alla stessa azienda
      if (request.autore.companyId !== currentUser?.companyId) {
        return res.status(403).json({ error: "Non hai accesso a questa richiesta" });
      }

      const isAdmin = (req.user!.role.permessi as any).isAdmin;
      const isAuthor = request.autoreId === req.user!.id;

      if (!isAdmin && !isAuthor) {
        return res.status(403).json({ error: "Non hai accesso a questa richiesta" });
      }

      res.json(request);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // Aggiorna lo stato di una richiesta (solo admin)
  async updateRequestStatus(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { stato, risposta } = req.body;

      const isAdmin = (req.user!.role.permessi as any).isAdmin;
      if (!isAdmin) {
        return res.status(403).json({ error: "Solo gli admin possono modificare lo stato delle richieste" });
      }

      const request = await prisma.request.findUnique({
        where: { id },
        include: {
          autore: { select: { id: true, nome: true, cognome: true, companyId: true } },
          task: { select: { id: true, titolo: true } }
        }
      });

      if (!request) {
        return res.status(404).json({ error: "Richiesta non trovata" });
      }

      const currentUser = await prisma.user.findUnique({
        where: { id: req.user!.id },
        select: { companyId: true }
      });

      // Verifica che l'utente appartenga alla stessa azienda
      if (request.autore.companyId !== currentUser?.companyId) {
        return res.status(403).json({ error: "Non hai accesso a questa richiesta" });
      }

      const updatedRequest = await prisma.request.update({
        where: { id },
        data: {
          stato,
          descrizione: risposta ? `${request.descrizione}\n\n--- RISPOSTA ADMIN ---\n${risposta}` : request.descrizione
        },
        include: {
          autore: { select: { id: true, nome: true, cognome: true, email: true } },
          task: { select: { id: true, titolo: true } }
        }
      });

      // Notifica l'autore della richiesta
      await prisma.notification.create({
        data: {
          userId: request.autoreId,
          tipo: "request_updated",
          titolo: "Richiesta aggiornata",
          messaggio: `La tua richiesta per il task "${request.task?.titolo}" è stata ${stato}`,
          link: `/tasks/${request.taskId}`
        }
      });

      await prisma.auditLog.create({
        data: {
          entita: "Request",
          entitaId: updatedRequest.id,
          azione: "update",
          autoreId: req.user!.id,
          payload: stringifyJsonField({ stato, risposta })
        }
      });

      res.json(updatedRequest);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // Elimina una richiesta
  async deleteRequest(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const request = await prisma.request.findUnique({
        where: { id },
        include: {
          autore: { select: { companyId: true } }
        }
      });

      if (!request) {
        return res.status(404).json({ error: "Richiesta non trovata" });
      }

      const currentUser = await prisma.user.findUnique({
        where: { id: req.user!.id },
        select: { companyId: true }
      });

      // Verifica che l'utente appartenga alla stessa azienda
      if (request.autore.companyId !== currentUser?.companyId) {
        return res.status(403).json({ error: "Non hai accesso a questa richiesta" });
      }

      const isAdmin = (req.user!.role.permessi as any).isAdmin;
      const isAuthor = request.autoreId === req.user!.id;

      if (!isAdmin && !isAuthor) {
        return res.status(403).json({ error: "Non hai permessi per eliminare questa richiesta" });
      }

      await prisma.request.delete({ where: { id } });

      await prisma.auditLog.create({
        data: {
          entita: "Request",
          entitaId: id,
          azione: "delete",
          autoreId: req.user!.id,
          payload: stringifyJsonField({ tipo: request.tipo })
        }
      });

      res.json({ message: "Richiesta eliminata con successo" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // Aggiungi una risposta a un ticket/richiesta
  async addResponse(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params; // requestId
      const { contenuto } = req.body;

      if (!contenuto || contenuto.trim() === '') {
        return res.status(400).json({ error: "Il contenuto della risposta è obbligatorio" });
      }

      const request = await prisma.request.findUnique({
        where: { id },
        include: {
          autore: { select: { id: true, nome: true, cognome: true, companyId: true } },
          task: { select: { id: true, titolo: true } }
        }
      });

      if (!request) {
        return res.status(404).json({ error: "Richiesta non trovata" });
      }

      // Verifica che il ticket non sia chiuso
      if (request.chiuso) {
        return res.status(400).json({ error: "Il ticket è chiuso. Riaprilo per aggiungere risposte." });
      }

      const currentUser = await prisma.user.findUnique({
        where: { id: req.user!.id },
        select: { companyId: true }
      });

      // Verifica che l'utente appartenga alla stessa azienda
      if (request.autore.companyId !== currentUser?.companyId) {
        return res.status(403).json({ error: "Non hai accesso a questa richiesta" });
      }

      const isAdmin = (req.user!.role.permessi as any).isAdmin;
      const isAuthor = request.autoreId === req.user!.id;

      if (!isAdmin && !isAuthor) {
        return res.status(403).json({ error: "Non hai permessi per rispondere a questa richiesta" });
      }

      // Crea la risposta
      const risposta = await prisma.requestRisposta.create({
        data: {
          requestId: id,
          autoreId: req.user!.id,
          contenuto,
          isAdmin
        },
        include: {
          autore: { select: { id: true, nome: true, cognome: true, email: true } }
        }
      });

      // Aggiorna lo stato del ticket a "in_lavorazione" se è la prima risposta admin
      if (isAdmin && request.stato === 'aperta') {
        await prisma.request.update({
          where: { id },
          data: { stato: 'in_lavorazione' }
        });
      }

      // Notifica l'altra parte (se admin risponde, notifica autore, viceversa)
      const notifyUserId = isAdmin ? request.autoreId : null;

      if (notifyUserId) {
        await prisma.notification.create({
          data: {
            userId: notifyUserId,
            tipo: "ticket_response",
            titolo: "Nuova risposta al tuo ticket",
            messaggio: `${req.user!.nome} ${req.user!.cognome} ha risposto al ticket: ${request.tipo}`,
            link: `/tickets/${id}`
          }
        });
      } else if (!isAdmin) {
        // Notifica tutti gli admin
        const admins = await prisma.user.findMany({
          where: {
            companyId: currentUser?.companyId,
            OR: [
              { role: { nome: 'Admin' } },
              { adminCompany: { isNot: null } }
            ]
          }
        });

        for (const admin of admins) {
          await prisma.notification.create({
            data: {
              userId: admin.id,
              tipo: "ticket_response",
              titolo: "Nuova risposta su ticket",
              messaggio: `${req.user!.nome} ${req.user!.cognome} ha risposto al ticket: ${request.tipo}`,
              link: `/tickets/${id}`
            }
          });
        }
      }

      await prisma.auditLog.create({
        data: {
          entita: "RequestRisposta",
          entitaId: risposta.id,
          azione: "create",
          autoreId: req.user!.id,
          payload: stringifyJsonField({ requestId: id, contenuto })
        }
      });

      res.status(201).json(risposta);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // Ottieni tutte le risposte di un ticket
  async getResponses(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params; // requestId

      const request = await prisma.request.findUnique({
        where: { id },
        include: {
          autore: { select: { companyId: true } }
        }
      });

      if (!request) {
        return res.status(404).json({ error: "Richiesta non trovata" });
      }

      const currentUser = await prisma.user.findUnique({
        where: { id: req.user!.id },
        select: { companyId: true }
      });

      // Verifica che l'utente appartenga alla stessa azienda
      if (request.autore.companyId !== currentUser?.companyId) {
        return res.status(403).json({ error: "Non hai accesso a questa richiesta" });
      }

      const isAdmin = (req.user!.role.permessi as any).isAdmin;
      const isAuthor = request.autoreId === req.user!.id;

      if (!isAdmin && !isAuthor) {
        return res.status(403).json({ error: "Non hai permessi per vedere le risposte" });
      }

      const risposte = await prisma.requestRisposta.findMany({
        where: { requestId: id },
        include: {
          autore: { select: { id: true, nome: true, cognome: true, email: true } }
        },
        orderBy: { createdAt: 'asc' }
      });

      res.json(risposte);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // Chiudi un ticket
  async closeTicket(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const request = await prisma.request.findUnique({
        where: { id },
        include: {
          autore: { select: { id: true, companyId: true } }
        }
      });

      if (!request) {
        return res.status(404).json({ error: "Richiesta non trovata" });
      }

      const currentUser = await prisma.user.findUnique({
        where: { id: req.user!.id },
        select: { companyId: true }
      });

      // Verifica che l'utente appartenga alla stessa azienda
      if (request.autore.companyId !== currentUser?.companyId) {
        return res.status(403).json({ error: "Non hai accesso a questa richiesta" });
      }

      const isAdmin = (req.user!.role.permessi as any).isAdmin;
      const isAuthor = request.autoreId === req.user!.id;

      if (!isAdmin && !isAuthor) {
        return res.status(403).json({ error: "Solo l'autore o un admin possono chiudere il ticket" });
      }

      const updatedRequest = await prisma.request.update({
        where: { id },
        data: { chiuso: true },
        include: {
          autore: { select: { id: true, nome: true, cognome: true, email: true } },
          task: { select: { id: true, titolo: true } }
        }
      });

      // Notifica l'altra parte
      const notifyUserId = isAdmin ? request.autoreId : null;

      if (notifyUserId) {
        await prisma.notification.create({
          data: {
            userId: notifyUserId,
            tipo: "ticket_closed",
            titolo: "Ticket chiuso",
            messaggio: `Il ticket "${request.tipo}" è stato chiuso`,
            link: `/tickets/${id}`
          }
        });
      } else if (!isAdmin) {
        // Notifica admin
        const admins = await prisma.user.findMany({
          where: {
            companyId: currentUser?.companyId,
            OR: [
              { role: { nome: 'Admin' } },
              { adminCompany: { isNot: null } }
            ]
          }
        });

        for (const admin of admins) {
          await prisma.notification.create({
            data: {
              userId: admin.id,
              tipo: "ticket_closed",
              titolo: "Ticket chiuso",
              messaggio: `Il ticket "${request.tipo}" è stato chiuso da ${req.user!.nome} ${req.user!.cognome}`,
              link: `/tickets/${id}`
            }
          });
        }
      }

      await prisma.auditLog.create({
        data: {
          entita: "Request",
          entitaId: id,
          azione: "close",
          autoreId: req.user!.id,
          payload: stringifyJsonField({ chiuso: true })
        }
      });

      res.json(updatedRequest);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // Riapri un ticket
  async reopenTicket(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const request = await prisma.request.findUnique({
        where: { id },
        include: {
          autore: { select: { id: true, companyId: true } }
        }
      });

      if (!request) {
        return res.status(404).json({ error: "Richiesta non trovata" });
      }

      const currentUser = await prisma.user.findUnique({
        where: { id: req.user!.id },
        select: { companyId: true }
      });

      // Verifica che l'utente appartenga alla stessa azienda
      if (request.autore.companyId !== currentUser?.companyId) {
        return res.status(403).json({ error: "Non hai accesso a questa richiesta" });
      }

      const isAdmin = (req.user!.role.permessi as any).isAdmin;
      const isAuthor = request.autoreId === req.user!.id;

      if (!isAdmin && !isAuthor) {
        return res.status(403).json({ error: "Solo l'autore o un admin possono riaprire il ticket" });
      }

      const updatedRequest = await prisma.request.update({
        where: { id },
        data: {
          chiuso: false,
          stato: 'aperta' // Torna allo stato aperta quando viene riaperto
        },
        include: {
          autore: { select: { id: true, nome: true, cognome: true, email: true } },
          task: { select: { id: true, titolo: true } }
        }
      });

      // Notifica l'altra parte
      const notifyUserId = isAdmin ? request.autoreId : null;

      if (notifyUserId) {
        await prisma.notification.create({
          data: {
            userId: notifyUserId,
            tipo: "ticket_reopened",
            titolo: "Ticket riaperto",
            messaggio: `Il ticket "${request.tipo}" è stato riaperto`,
            link: `/tickets/${id}`
          }
        });
      } else if (!isAdmin) {
        // Notifica admin
        const admins = await prisma.user.findMany({
          where: {
            companyId: currentUser?.companyId,
            OR: [
              { role: { nome: 'Admin' } },
              { adminCompany: { isNot: null } }
            ]
          }
        });

        for (const admin of admins) {
          await prisma.notification.create({
            data: {
              userId: admin.id,
              tipo: "ticket_reopened",
              titolo: "Ticket riaperto",
              messaggio: `Il ticket "${request.tipo}" è stato riaperto da ${req.user!.nome} ${req.user!.cognome}`,
              link: `/tickets/${id}`
            }
          });
        }
      }

      await prisma.auditLog.create({
        data: {
          entita: "Request",
          entitaId: id,
          azione: "reopen",
          autoreId: req.user!.id,
          payload: stringifyJsonField({ chiuso: false })
        }
      });

      res.json(updatedRequest);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // Metodi legacy per compatibilità
  async getAllRequests(req: AuthRequest, res: Response) {
    return this.getRequests(req, res);
  }

  async updateRequest(req: AuthRequest, res: Response) {
    return this.updateRequestStatus(req, res);
  }
}

export default new RequestController();
