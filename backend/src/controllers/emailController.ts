import { Response } from "express";
import prisma from "../config/database";
import { AuthRequest } from "../middleware/auth";
import { stringifyJsonField } from "../utils/jsonHelper";

class EmailController {
  // Crea/Invia una email
  async createEmail(req: AuthRequest, res: Response) {
    try {
      const { oggetto, corpo, destinatari, cc, bcc, stato, importante, taskId } = req.body;

      if (!oggetto || !corpo) {
        return res.status(400).json({ error: "Oggetto e corpo sono obbligatori" });
      }

      if (!destinatari || destinatari.length === 0) {
        return res.status(400).json({ error: "Almeno un destinatario è obbligatorio" });
      }

      const email = await prisma.email.create({
        data: {
          oggetto,
          corpo,
          mittente: req.user!.email,
          destinatari: stringifyJsonField(destinatari),
          cc: cc ? stringifyJsonField(cc) : "[]",
          bcc: bcc ? stringifyJsonField(bcc) : "[]",
          stato: stato || "inviata",
          importante: importante || false,
          userId: req.user!.id,
          taskId
        },
        include: {
          user: { select: { id: true, nome: true, cognome: true, email: true } },
          task: { select: { id: true, titolo: true } }
        }
      });

      // Crea notifiche per i destinatari interni
      const internalUsers = await prisma.user.findMany({
        where: {
          email: { in: destinatari },
          companyId: req.user!.companyId
        }
      });

      for (const user of internalUsers) {
        await prisma.notification.create({
          data: {
            userId: user.id,
            tipo: "email_received",
            titolo: "Nuova email",
            messaggio: `${req.user!.nome} ${req.user!.cognome}: ${oggetto}`,
            link: `/email/${email.id}`
          }
        });
      }

      await prisma.auditLog.create({
        data: {
          entita: "Email",
          entitaId: email.id,
          azione: "send",
          autoreId: req.user!.id,
          payload: stringifyJsonField({ oggetto, destinatari })
        }
      });

      res.status(201).json(email);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // Ottieni tutte le email dell'utente
  async getEmails(req: AuthRequest, res: Response) {
    try {
      const { stato, importante, taskId, page = 1, limit = 50 } = req.query as any;

      const where: any = {
        userId: req.user!.id
      };

      if (stato) where.stato = stato;
      if (importante !== undefined) where.importante = importante === 'true';
      if (taskId) where.taskId = taskId;

      const skip = (Number(page) - 1) * Number(limit);

      const [emails, total] = await Promise.all([
        prisma.email.findMany({
          where,
          include: {
            user: { select: { id: true, nome: true, cognome: true, email: true } },
            task: { select: { id: true, titolo: true } }
          },
          orderBy: { dataInvio: "desc" },
          skip,
          take: Number(limit)
        }),
        prisma.email.count({ where })
      ]);

      res.json({
        emails,
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

  // Ottieni email ricevute
  async getReceivedEmails(req: AuthRequest, res: Response) {
    try {
      const { page = 1, limit = 50 } = req.query as any;

      const skip = (Number(page) - 1) * Number(limit);

      // Email dove l'utente è tra i destinatari
      const [emails, total] = await Promise.all([
        prisma.email.findMany({
          where: {
            OR: [
              { destinatari: { contains: req.user!.email } },
              { cc: { contains: req.user!.email } }
            ],
            NOT: {
              mittente: req.user!.email
            }
          },
          include: {
            user: { select: { id: true, nome: true, cognome: true, email: true } },
            task: { select: { id: true, titolo: true } }
          },
          orderBy: { dataInvio: "desc" },
          skip,
          take: Number(limit)
        }),
        prisma.email.count({
          where: {
            OR: [
              { destinatari: { contains: req.user!.email } },
              { cc: { contains: req.user!.email } }
            ],
            NOT: {
              mittente: req.user!.email
            }
          }
        })
      ]);

      res.json({
        emails,
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

  // Ottieni email inviate
  async getSentEmails(req: AuthRequest, res: Response) {
    try {
      const { page = 1, limit = 50 } = req.query as any;

      const skip = (Number(page) - 1) * Number(limit);

      const [emails, total] = await Promise.all([
        prisma.email.findMany({
          where: {
            userId: req.user!.id,
            stato: { in: ["inviata", "letta"] }
          },
          include: {
            user: { select: { id: true, nome: true, cognome: true, email: true } },
            task: { select: { id: true, titolo: true } }
          },
          orderBy: { dataInvio: "desc" },
          skip,
          take: Number(limit)
        }),
        prisma.email.count({
          where: {
            userId: req.user!.id,
            stato: { in: ["inviata", "letta"] }
          }
        })
      ]);

      res.json({
        emails,
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

  // Ottieni una singola email
  async getEmailById(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const email = await prisma.email.findUnique({
        where: { id },
        include: {
          user: { select: { id: true, nome: true, cognome: true, email: true } },
          task: { select: { id: true, titolo: true, descrizione: true } }
        }
      });

      if (!email) {
        return res.status(404).json({ error: "Email non trovata" });
      }

      // Verifica accesso
      const destinatariList = JSON.parse(email.destinatari);
      const ccList = email.cc ? JSON.parse(email.cc) : [];
      const isRecipient = destinatariList.includes(req.user!.email) || ccList.includes(req.user!.email);
      const isSender = email.mittente === req.user!.email;

      if (!isRecipient && !isSender) {
        return res.status(403).json({ error: "Non hai accesso a questa email" });
      }

      // Marca come letta se è ricevuta
      if (isRecipient && email.stato === "ricevuta" && !email.dataLettura) {
        await prisma.email.update({
          where: { id },
          data: {
            stato: "letta",
            dataLettura: new Date()
          }
        });
      }

      res.json(email);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // Aggiorna una email (stato, importante, etc.)
  async updateEmail(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { stato, importante } = req.body;

      const email = await prisma.email.findUnique({ where: { id } });

      if (!email) {
        return res.status(404).json({ error: "Email non trovata" });
      }

      // Solo il proprietario può modificare
      if (email.userId !== req.user!.id) {
        return res.status(403).json({ error: "Non hai permessi per modificare questa email" });
      }

      const updatedEmail = await prisma.email.update({
        where: { id },
        data: {
          ...(stato !== undefined && { stato }),
          ...(importante !== undefined && { importante })
        },
        include: {
          user: { select: { id: true, nome: true, cognome: true, email: true } },
          task: { select: { id: true, titolo: true } }
        }
      });

      res.json(updatedEmail);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // Elimina una email
  async deleteEmail(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const email = await prisma.email.findUnique({ where: { id } });

      if (!email) {
        return res.status(404).json({ error: "Email non trovata" });
      }

      if (email.userId !== req.user!.id) {
        return res.status(403).json({ error: "Non hai permessi per eliminare questa email" });
      }

      await prisma.email.delete({ where: { id } });

      await prisma.auditLog.create({
        data: {
          entita: "Email",
          entitaId: id,
          azione: "delete",
          autoreId: req.user!.id,
          payload: stringifyJsonField({ oggetto: email.oggetto })
        }
      });

      res.json({ message: "Email eliminata con successo" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // Conta email non lette
  async getUnreadCount(req: AuthRequest, res: Response) {
    try {
      const count = await prisma.email.count({
        where: {
          destinatari: { contains: req.user!.email },
          stato: "ricevuta",
          dataLettura: null
        }
      });

      res.json({ unreadCount: count });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}

export default new EmailController();
