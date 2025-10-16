import { Response } from "express";
import prisma from "../config/database";
import { AuthRequest } from "../middleware/auth";
import { stringifyJsonField } from "../utils/jsonHelper";

class TicketController {
  constructor() {
    this.getAllTickets = this.getAllTickets.bind(this);
    this.getTicketById = this.getTicketById.bind(this);
    this.createTicket = this.createTicket.bind(this);
    this.updateTicket = this.updateTicket.bind(this);
    this.deleteTicket = this.deleteTicket.bind(this);
    this.addRisposta = this.addRisposta.bind(this);
    this.getMyTickets = this.getMyTickets.bind(this);
    this.getTicketsForMyRole = this.getTicketsForMyRole.bind(this);
    this.takeTicket = this.takeTicket.bind(this);
  }

  // Ottieni tutti i ticket (per admin)
  async getAllTickets(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const { stato, priorita, categoria } = req.query as any;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { companyId: true }
      });

      if (!user?.companyId) {
        return res.status(400).json({ error: "Utente non associato a un'azienda" });
      }

      const where: any = { companyId: user.companyId };

      if (stato) where.stato = stato;
      if (priorita) where.priorita = priorita;
      if (categoria) where.categoria = categoria;

      const tickets = await prisma.ticket.findMany({
        where,
        include: {
          autore: {
            select: { id: true, nome: true, cognome: true, email: true }
          },
          task: {
            select: { id: true, titolo: true }
          },
          assignedTo: {
            select: { id: true, nome: true, cognome: true }
          },
          category: {
            select: { id: true, nome: true, icona: true, colore: true, targetRole: true }
          },
          takenBy: {
            select: { id: true, nome: true, cognome: true }
          },
          risposte: {
            include: {
              autore: {
                select: { id: true, nome: true, cognome: true, email: true }
              }
            },
            orderBy: { createdAt: 'asc' }
          }
        },
        orderBy: [
          { stato: 'asc' },
          { priorita: 'desc' },
          { createdAt: 'desc' }
        ]
      });

      res.json(tickets);
    } catch (e: any) {
      console.error('Errore recupero tickets:', e);
      res.status(500).json({ error: e.message });
    }
  }

  // Ottieni i ticket creati dall'utente corrente
  async getMyTickets(req: AuthRequest, res: Response) {
    try {
      const tickets = await prisma.ticket.findMany({
        where: {
          OR: [
            { autoreId: req.user!.id },
            { assignedToId: req.user!.id },
            { takenByUserId: req.user!.id }
          ]
        },
        include: {
          autore: {
            select: { id: true, nome: true, cognome: true, email: true }
          },
          task: {
            select: { id: true, titolo: true }
          },
          assignedTo: {
            select: { id: true, nome: true, cognome: true }
          },
          category: {
            select: { id: true, nome: true, icona: true, colore: true, targetRole: true }
          },
          takenBy: {
            select: { id: true, nome: true, cognome: true }
          },
          risposte: {
            include: {
              autore: {
                select: { id: true, nome: true, cognome: true, email: true }
              }
            },
            orderBy: { createdAt: 'asc' }
          }
        },
        orderBy: [
          { stato: 'asc' },
          { createdAt: 'desc' }
        ]
      });

      res.json(tickets);
    } catch (e: any) {
      console.error('Errore recupero miei tickets:', e);
      res.status(500).json({ error: e.message });
    }
  }

  // Ottieni i ticket per il ruolo dell'utente corrente (routing automatico)
  async getTicketsForMyRole(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { role: true }
      });

      if (!user?.roleId) {
        return res.status(400).json({ error: "Utente senza ruolo assegnato" });
      }

      // Ticket indirizzati al mio ruolo e non ancora presi in carico
      const tickets = await prisma.ticket.findMany({
        where: {
          targetRoleId: user.roleId,
          takenByUserId: null,
          stato: { not: 'risolto' }
        },
        include: {
          autore: {
            select: { id: true, nome: true, cognome: true, email: true }
          },
          task: {
            select: { id: true, titolo: true }
          },
          category: {
            select: { id: true, nome: true, icona: true, colore: true, targetRole: true }
          },
          risposte: {
            include: {
              autore: {
                select: { id: true, nome: true, cognome: true, email: true }
              }
            },
            orderBy: { createdAt: 'asc' }
          }
        },
        orderBy: [
          { priorita: 'desc' },
          { createdAt: 'desc' }
        ]
      });

      res.json(tickets);
    } catch (e: any) {
      console.error('Errore recupero tickets per ruolo:', e);
      res.status(500).json({ error: e.message });
    }
  }

  // Ottieni singolo ticket
  async getTicketById(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const ticket = await prisma.ticket.findUnique({
        where: { id },
        include: {
          autore: {
            select: { id: true, nome: true, cognome: true, email: true, role: true }
          },
          task: {
            select: { id: true, titolo: true, descrizione: true }
          },
          assignedTo: {
            select: { id: true, nome: true, cognome: true }
          },
          category: {
            select: { id: true, nome: true, icona: true, colore: true, targetRole: true }
          },
          takenBy: {
            select: { id: true, nome: true, cognome: true }
          },
          risposte: {
            include: {
              autore: {
                select: { id: true, nome: true, cognome: true, email: true }
              }
            },
            orderBy: { createdAt: 'asc' }
          }
        }
      });

      if (!ticket) {
        return res.status(404).json({ error: "Ticket non trovato" });
      }

      res.json(ticket);
    } catch (e: any) {
      console.error('Errore recupero ticket:', e);
      res.status(500).json({ error: e.message });
    }
  }

  // Crea nuovo ticket con routing automatico o manuale
  async createTicket(req: AuthRequest, res: Response) {
    try {
      const { titolo, descrizione, priorita, categoria, taskId, categoryId, assignedToId } = req.body;
      const userId = req.user!.id;

      // Validazione
      if (!titolo || !descrizione) {
        return res.status(400).json({ error: "Titolo e descrizione sono obbligatori" });
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { companyId: true, nome: true, cognome: true }
      });

      if (!user?.companyId) {
        return res.status(400).json({ error: "Utente non associato a un'azienda" });
      }

      const ticketData: any = {
        titolo,
        descrizione,
        priorita: priorita || 'media',
        categoria: categoria || 'altro',
        autoreId: userId,
        companyId: user.companyId
      };

      // ROUTING AUTOMATICO: Se specificata una categoria, imposta targetRoleId dalla categoria
      if (categoryId) {
        const category = await prisma.ticketCategory.findUnique({
          where: { id: categoryId },
          select: { targetRoleId: true, companyId: true }
        });

        if (!category) {
          return res.status(404).json({ error: "Categoria non trovata" });
        }

        if (category.companyId !== user.companyId) {
          return res.status(403).json({ error: "Categoria non valida per la tua azienda" });
        }

        ticketData.categoryId = categoryId;
        ticketData.targetRoleId = category.targetRoleId;
      }

      // ROUTING MANUALE: Se specificato un assignedToId, imposta direttamente
      if (assignedToId) {
        const assignedUser = await prisma.user.findUnique({
          where: { id: assignedToId },
          select: { companyId: true }
        });

        if (!assignedUser) {
          return res.status(404).json({ error: "Utente assegnato non trovato" });
        }

        if (assignedUser.companyId !== user.companyId) {
          return res.status(403).json({ error: "Non puoi assegnare ticket a utenti di altre aziende" });
        }

        ticketData.assignedToId = assignedToId;
      }

      // Aggiungi task collegato se specificato
      if (taskId) {
        const task = await prisma.task.findFirst({
          where: {
            id: taskId,
            OR: [
              { ownerId: userId },
              { assignees: { some: { id: userId } } }
            ]
          }
        });

        if (task) {
          ticketData.taskId = taskId;
        }
      }

      const ticket = await prisma.ticket.create({
        data: ticketData,
        include: {
          autore: {
            select: { id: true, nome: true, cognome: true, email: true }
          },
          task: {
            select: { id: true, titolo: true }
          },
          category: {
            select: { id: true, nome: true, icona: true, colore: true, targetRole: true }
          },
          assignedTo: {
            select: { id: true, nome: true, cognome: true }
          }
        }
      });

      // Notifiche basate sul tipo di routing
      if (assignedToId) {
        // Routing manuale: notifica solo l'utente assegnato
        await prisma.notification.create({
          data: {
            userId: assignedToId,
            tipo: 'ticket',
            titolo: 'Nuovo Ticket Assegnato',
            messaggio: `${user.nome} ${user.cognome} ti ha assegnato un ticket: ${titolo}`,
            link: `/tickets/${ticket.id}`
          }
        });
      } else if (ticketData.targetRoleId) {
        // Routing automatico: notifica tutti gli utenti con quel ruolo
        const usersWithRole = await prisma.user.findMany({
          where: {
            roleId: ticketData.targetRoleId,
            companyId: user.companyId
          },
          select: { id: true }
        });

        for (const roleUser of usersWithRole) {
          await prisma.notification.create({
            data: {
              userId: roleUser.id,
              tipo: 'ticket',
              titolo: 'Nuovo Ticket per il tuo Ruolo',
              messaggio: `Nuovo ticket disponibile: ${titolo}`,
              link: `/tickets/${ticket.id}`
            }
          });
        }
      } else {
        // Fallback: notifica gli admin
        const admins = await prisma.user.findMany({
          where: {
            companyId: user.companyId,
            adminCompany: { isNot: null }
          },
          select: { id: true }
        });

        for (const admin of admins) {
          await prisma.notification.create({
            data: {
              userId: admin.id,
              tipo: 'ticket',
              titolo: 'Nuovo Ticket',
              messaggio: `${user.nome} ${user.cognome} ha aperto un ticket: ${titolo}`,
              link: `/tickets/${ticket.id}`
            }
          });
        }
      }

      await prisma.auditLog.create({
        data: {
          entita: "Ticket",
          entitaId: ticket.id,
          azione: "create",
          autoreId: userId,
          payload: stringifyJsonField({ titolo, descrizione, priorita, categoria, categoryId, assignedToId })
        }
      });

      res.status(201).json(ticket);
    } catch (e: any) {
      console.error('Errore creazione ticket:', e);
      res.status(500).json({ error: e.message });
    }
  }

  // Aggiorna ticket (per admin: assegnazione, cambio stato)
  async updateTicket(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { stato, priorita, assignedToId } = req.body;

      const updateData: any = {};
      if (stato) updateData.stato = stato;
      if (priorita) updateData.priorita = priorita;
      if (assignedToId !== undefined) updateData.assignedToId = assignedToId;

      const ticket = await prisma.ticket.update({
        where: { id },
        data: updateData,
        include: {
          autore: {
            select: { id: true, nome: true, cognome: true, email: true }
          },
          task: {
            select: { id: true, titolo: true }
          },
          assignedTo: {
            select: { id: true, nome: true, cognome: true }
          }
        }
      });

      // Notifica l'autore del ticket
      await prisma.notification.create({
        data: {
          userId: ticket.autoreId,
          tipo: 'ticket',
          titolo: 'Aggiornamento Ticket',
          messaggio: `Il tuo ticket "${ticket.titolo}" è stato aggiornato`,
          link: `/tickets/${ticket.id}`
        }
      });

      await prisma.auditLog.create({
        data: {
          entita: "Ticket",
          entitaId: id,
          azione: "update",
          autoreId: req.user!.id,
          payload: stringifyJsonField(req.body)
        }
      });

      res.json(ticket);
    } catch (e: any) {
      console.error('Errore aggiornamento ticket:', e);
      res.status(500).json({ error: e.message });
    }
  }

  // Elimina ticket
  async deleteTicket(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      // Verifica che l'utente sia l'autore o un admin
      const ticket = await prisma.ticket.findUnique({
        where: { id },
        include: {
          autore: true
        }
      });

      if (!ticket) {
        return res.status(404).json({ error: "Ticket non trovato" });
      }

      const userRole = await prisma.user.findUnique({
        where: { id: req.user!.id },
        include: { role: true }
      });

      if (ticket.autoreId !== req.user!.id && userRole?.role.nome !== 'Admin') {
        return res.status(403).json({ error: "Non hai i permessi per eliminare questo ticket" });
      }

      await prisma.ticket.delete({ where: { id } });

      await prisma.auditLog.create({
        data: {
          entita: "Ticket",
          entitaId: id,
          azione: "delete",
          autoreId: req.user!.id,
          payload: stringifyJsonField({})
        }
      });

      res.json({ message: "Ticket eliminato con successo" });
    } catch (e: any) {
      console.error('Errore eliminazione ticket:', e);
      res.status(500).json({ error: e.message });
    }
  }

  // Aggiungi risposta a un ticket
  async addRisposta(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { contenuto } = req.body;

      if (!contenuto || contenuto.trim() === '') {
        return res.status(400).json({ error: "Il contenuto della risposta è obbligatorio" });
      }

      // Verifica che il ticket esista
      const ticket = await prisma.ticket.findUnique({
        where: { id }
      });

      if (!ticket) {
        return res.status(404).json({ error: "Ticket non trovato" });
      }

      // Verifica se l'utente è admin
      const user = await prisma.user.findUnique({
        where: { id: req.user!.id },
        include: { role: true }
      });

      const isAdmin = user?.role.nome === 'Admin';

      const risposta = await prisma.ticketRisposta.create({
        data: {
          ticketId: id,
          autoreId: req.user!.id,
          contenuto,
          isAdmin
        },
        include: {
          autore: {
            select: { id: true, nome: true, cognome: true, email: true }
          }
        }
      });

      // Notifica l'autore del ticket (se la risposta non è sua)
      if (ticket.autoreId !== req.user!.id) {
        await prisma.notification.create({
          data: {
            userId: ticket.autoreId,
            tipo: 'ticket',
            titolo: 'Nuova Risposta al Ticket',
            messaggio: `${user!.nome} ${user!.cognome} ha risposto al tuo ticket "${ticket.titolo}"`,
            link: `/tickets/${ticket.id}`
          }
        });
      }

      // Se la risposta è di un dipendente, notifica gli admin
      if (!isAdmin) {
        const admins = await prisma.user.findMany({
          where: {
            role: {
              nome: 'Admin'
            }
          },
          select: { id: true }
        });

        for (const admin of admins) {
          await prisma.notification.create({
            data: {
              userId: admin.id,
              tipo: 'ticket',
              titolo: 'Nuova Risposta al Ticket',
              messaggio: `${user!.nome} ${user!.cognome} ha risposto al ticket "${ticket.titolo}"`,
              link: `/tickets/${ticket.id}`
            }
          });
        }
      }

      res.status(201).json(risposta);
    } catch (e: any) {
      console.error('Errore aggiunta risposta:', e);
      res.status(500).json({ error: e.message });
    }
  }

  // Prendi in carico un ticket (quando routing è per ruolo)
  async takeTicket(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      const ticket = await prisma.ticket.findUnique({
        where: { id },
        include: {
          autore: {
            select: { nome: true, cognome: true }
          }
        }
      });

      if (!ticket) {
        return res.status(404).json({ error: "Ticket non trovato" });
      }

      // Verifica che il ticket non sia già preso
      if (ticket.takenByUserId) {
        return res.status(400).json({ error: "Questo ticket è già stato preso in carico" });
      }

      // Verifica che l'utente abbia il ruolo target
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { roleId: true, nome: true, cognome: true }
      });

      if (ticket.targetRoleId && user?.roleId !== ticket.targetRoleId) {
        return res.status(403).json({ error: "Non hai il ruolo richiesto per questo ticket" });
      }

      // Prendi in carico il ticket
      const updatedTicket = await prisma.ticket.update({
        where: { id },
        data: {
          takenByUserId: userId,
          takenAt: new Date(),
          stato: 'in_lavorazione'
        },
        include: {
          autore: {
            select: { id: true, nome: true, cognome: true, email: true }
          },
          task: {
            select: { id: true, titolo: true }
          },
          category: {
            select: { id: true, nome: true, icona: true, colore: true, targetRole: true }
          },
          takenBy: {
            select: { id: true, nome: true, cognome: true }
          },
          assignedTo: {
            select: { id: true, nome: true, cognome: true }
          }
        }
      });

      // Notifica l'autore del ticket
      await prisma.notification.create({
        data: {
          userId: ticket.autoreId,
          tipo: 'ticket',
          titolo: 'Ticket Preso in Carico',
          messaggio: `${user?.nome} ${user?.cognome} ha preso in carico il tuo ticket "${ticket.titolo}"`,
          link: `/tickets/${ticket.id}`
        }
      });

      await prisma.auditLog.create({
        data: {
          entita: "Ticket",
          entitaId: id,
          azione: "take",
          autoreId: userId,
          payload: stringifyJsonField({ takenBy: userId })
        }
      });

      res.json(updatedTicket);
    } catch (e: any) {
      console.error('Errore presa in carico ticket:', e);
      res.status(500).json({ error: e.message });
    }
  }
}

export default new TicketController();
