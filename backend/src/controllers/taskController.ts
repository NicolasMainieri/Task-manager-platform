import { Response } from "express";
import prisma from "../config/database";
import { AuthRequest } from "../middleware/auth";
import { stringifyJsonField } from "../utils/jsonHelper";

class TaskController {
  async createTask(req: AuthRequest, res: Response) {
    try {
      const { titolo, descrizione, priorita, difficolta, scadenza, assigneeIds, teamId, progettoId, tags, checklist } = req.body;

      const task = await prisma.task.create({
        data: {
          titolo, 
          descrizione,
          priorita: priorita || "medium",
          difficolta: difficolta || 3,
          scadenza: scadenza ? new Date(scadenza) : null,
          ownerId: req.user!.id,
          teamId, 
          progettoId,
          tags: stringifyJsonField(tags || []),
          checklist: stringifyJsonField(checklist || []),
          assignees: { connect: (assigneeIds?.map((id: string) => ({ id })) || [{ id: req.user!.id }]) },
        },
        include: {
          owner: { select: { id: true, nome: true, cognome: true, email: true } },
          assignees: { select: { id: true, nome: true, cognome: true, email: true } },
          team: true, 
          progetto: true,
        },
      });

      await prisma.auditLog.create({
        data: { 
          entita: "Task", 
          entitaId: task.id, 
          azione: "create", 
          autoreId: req.user!.id, 
          payload: stringifyJsonField({ titolo: task.titolo })
        },
      });

      const assignees = assigneeIds || [req.user!.id];
      for (const userId of assignees) {
        if (userId !== req.user!.id) {
          await prisma.notification.create({
            data: { 
              userId, 
              tipo: "task_assigned", 
              titolo: "Nuova task assegnata", 
              messaggio: `Ti è stata assegnata la task: ${titolo}`, 
              link: `/tasks/${task.id}` 
            },
          });
        }
      }

      res.status(201).json(task);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getTasks(req: AuthRequest, res: Response) {
    try {
      const { stato, priorita, search, teamId, progettoId, ownerId, assigneeId, page = 1, limit = 50 } = req.query as any;
      const isAdmin = (req.user!.role.permessi as any).isAdmin;
      const where: any = {};

      if (!isAdmin) {
        where.OR = [{ ownerId: req.user!.id }, { assignees: { some: { id: req.user!.id } } }];
      }
      if (stato) where.stato = stato;
      if (priorita) where.priorita = priorita;
      if (teamId) where.teamId = teamId;
      if (progettoId) where.progettoId = progettoId;
      if (ownerId && isAdmin) where.ownerId = ownerId;
      if (assigneeId && isAdmin) where.assignees = { some: { id: assigneeId } };
      if (search) where.OR = [
        { titolo: { contains: search, mode: "insensitive" } }, 
        { descrizione: { contains: search, mode: "insensitive" } }
      ];

      const skip = (Number(page) - 1) * Number(limit);

      const [tasks, total] = await Promise.all([
        prisma.task.findMany({
          where,
          include: {
            owner: { select: { id: true, nome: true, cognome: true } },
            assignees: { select: { id: true, nome: true, cognome: true } },
            team: true, 
            progetto: true,
            _count: { select: { comments: true } },
          },
          orderBy: [{ scadenza: "asc" }, { createdAt: "desc" }],
          skip,
          take: Number(limit),
        }),
        prisma.task.count({ where }),
      ]);

      res.json({ 
        tasks, 
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

  async getTaskById(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const task = await prisma.task.findUnique({
        where: { id },
        include: {
          owner: { select: { id: true, nome: true, cognome: true, email: true } },
          assignees: { select: { id: true, nome: true, cognome: true, email: true } },
          team: true, 
          progetto: true,
          comments: { 
            include: { 
              autore: { select: { id: true, nome: true, cognome: true } } 
            }, 
            orderBy: { createdAt: "desc" } 
          },
          worklogs: { 
            include: { 
              user: { select: { id: true, nome: true, cognome: true } } 
            }, 
            orderBy: { createdAt: "desc" } 
          },
        },
      });
      
      if (!task) return res.status(404).json({ error: "Task non trovata" });

      const isAdmin = (req.user!.role.permessi as any).isAdmin;
      const isOwner = task.ownerId === req.user!.id;
      const isAssignee = task.assignees.some((a: any) => a.id === req.user!.id);
      
      if (!isAdmin && !isOwner && !isAssignee) {
        return res.status(403).json({ error: "Non hai accesso a questa task" });
      }

      res.json(task);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async updateTask(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { titolo, descrizione, stato, priorita, difficolta, scadenza, assigneeIds, tags, checklist } = req.body;

      const existingTask = await prisma.task.findUnique({ 
        where: { id }, 
        include: { assignees: true } 
      });
      
      if (!existingTask) return res.status(404).json({ error: "Task non trovata" });

      const isAdmin = (req.user!.role.permessi as any).isAdmin;
      const isOwner = existingTask.ownerId === req.user!.id;
      const isAssignee = existingTask.assignees.some((a: any) => a.id === req.user!.id);
      
      if (!isAdmin && !isOwner && !isAssignee) {
        return res.status(403).json({ error: "Non hai permessi per modificare questa task" });
      }

      const updateData: any = { 
        titolo, 
        descrizione, 
        stato, 
        priorita, 
        difficolta, 
        scadenza: scadenza ? new Date(scadenza) : null, 
        tags: stringifyJsonField(tags), 
        checklist: stringifyJsonField(checklist)
      };

      if (assigneeIds && (isAdmin || isOwner)) {
        updateData.assignees = { set: assigneeIds.map((x: string) => ({ id: x })) };
      }

      if (stato === "completata" && existingTask.stato !== "completata") {
        updateData.dataFine = new Date();
      }

      const task = await prisma.task.update({
        where: { id }, 
        data: updateData,
        include: {
          owner: { select: { id: true, nome: true, cognome: true } },
          assignees: { select: { id: true, nome: true, cognome: true } },
          team: true, 
          progetto: true,
        },
      });

      await prisma.auditLog.create({ 
        data: { 
          entita: "Task", 
          entitaId: task.id, 
          azione: "update", 
          autoreId: req.user!.id, 
          payload: stringifyJsonField(req.body)
        } 
      });
      
      res.json(task);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async deleteTask(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const task = await prisma.task.findUnique({ where: { id } });
      if (!task) return res.status(404).json({ error: "Task non trovata" });

      const isAdmin = (req.user!.role.permessi as any).isAdmin;
      if (!isAdmin && task.ownerId !== req.user!.id) {
        return res.status(403).json({ error: "Non hai permessi per eliminare questa task" });
      }

      await prisma.task.delete({ where: { id } });
      await prisma.auditLog.create({ 
        data: { 
          entita: "Task", 
          entitaId: id, 
          azione: "delete", 
          autoreId: req.user!.id, 
          payload: stringifyJsonField({ titolo: task.titolo })
        } 
      });
      
      res.json({ message: "Task eliminata con successo" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async bulkUpdate(req: AuthRequest, res: Response) {
    try {
      const { taskIds, updates } = req.body;
      const isAdmin = (req.user!.role.permessi as any).isAdmin;
      if (!isAdmin) return res.status(403).json({ error: "Solo gli admin possono fare bulk updates" });

      await prisma.task.updateMany({ 
        where: { id: { in: taskIds } }, 
        data: updates 
      });
      
      await prisma.auditLog.create({ 
        data: { 
          entita: "Task", 
          entitaId: "bulk", 
          azione: "bulk_update", 
          autoreId: req.user!.id, 
          payload: stringifyJsonField({ taskIds, updates })
        } 
      });
      
      res.json({ message: `${taskIds.length} task aggiornate` });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async addComment(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { contenuto, menzioni } = req.body;
      
      const comment = await prisma.comment.create({
        data: { 
          taskId: id, 
          autoreId: req.user!.id, 
          contenuto, 
          menzioni: stringifyJsonField(menzioni || [])
        },
        include: { 
          autore: { select: { id: true, nome: true, cognome: true } } 
        },
      });

      if (menzioni && menzioni.length > 0) {
        for (const userId of menzioni) {
          await prisma.notification.create({
            data: { 
              userId, 
              tipo: "mention", 
              titolo: "Sei stato menzionato", 
              messaggio: `${req.user!.nome} ti ha menzionato in un commento`, 
              link: `/tasks/${id}` 
            },
          });
        }
      }
      
      res.status(201).json(comment);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async addWorklog(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { minuti, checklistDone, note } = req.body;
      
      const worklog = await prisma.taskWorklog.create({
        data: { 
          taskId: id, 
          userId: req.user!.id, 
          minuti, 
          checklistDone: stringifyJsonField(checklistDone || []), 
          note 
        },
        include: { 
          user: { select: { id: true, nome: true, cognome: true } } 
        },
      });
      
      res.status(201).json(worklog);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getMyTasks(req: AuthRequest, res: Response) {
    try {
      const tasks = await prisma.task.findMany({
        where: { 
          OR: [
            { ownerId: req.user!.id }, 
            { assignees: { some: { id: req.user!.id } } }
          ] 
        },
        include: {
          owner: { select: { id: true, nome: true, cognome: true } },
          assignees: { select: { id: true, nome: true, cognome: true } },
          team: true, 
          progetto: true,
        },
        orderBy: [{ scadenza: "asc" }, { priorita: "desc" }],
      });

      const today = new Date(); 
      today.setHours(0,0,0,0);
      const weekFromNow = new Date(Date.now() + 7*24*60*60*1000);

      const categorized = {
        oggi: tasks.filter((t: any) => t.scadenza && new Date(new Date(t.scadenza).setHours(0,0,0,0)).getTime() === today.getTime()),
        settimana: tasks.filter((t: any) => t.scadenza && new Date(t.scadenza) > today && new Date(t.scadenza) <= weekFromNow),
        ritardo: tasks.filter((t: any) => t.scadenza && t.stato !== "completata" && new Date(t.scadenza) < new Date()),
        tutte: tasks,
      };
      
      res.json(categorized);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}

export default new TaskController();