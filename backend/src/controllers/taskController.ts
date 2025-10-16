import { Response } from "express";
import prisma from "../config/database";
import { AuthRequest } from "../middleware/auth";
import { stringifyJsonField } from "../utils/jsonHelper";
import scoreService from "../services/score.service";

class TaskController {
  async createTask(req: AuthRequest, res: Response) {
    try {
      const { titolo, descrizione, priorita, difficolta, scadenza, assignedTo, assignedTeam, teamId, progettoId, tags, checklist, subtasks } = req.body;

      // Se è stato selezionato un team, recupera tutti i membri del team
      let finalAssigneeIds = assignedTo || [];
      if (assignedTeam) {
        const team = await prisma.team.findUnique({
          where: { id: assignedTeam },
          include: { users: { select: { id: true } } }
        });
        if (team && team.users) {
          finalAssigneeIds = team.users.map((u: any) => u.id);
        }
      }

      // Se non ci sono assegnatari, assegna al creatore
      if (finalAssigneeIds.length === 0) {
        finalAssigneeIds = [req.user!.id];
      }

      // Prepara i dati per la creazione
      const taskData: any = {
        titolo,
        descrizione,
        priorita: priorita || "medium",
        difficolta: difficolta || 3,
        scadenza: scadenza ? new Date(scadenza) : null,
        ownerId: req.user!.id,
        teamId: assignedTeam || teamId,
        progettoId,
        tags: stringifyJsonField(tags || []),
        checklist: stringifyJsonField(checklist || []),
        assignees: { connect: finalAssigneeIds.map((id: string) => ({ id })) },
      };

      // Se ci sono subtasks, aggiungile
      if (subtasks && Array.isArray(subtasks) && subtasks.length > 0) {
        taskData.subtasks = {
          create: subtasks.map((subtask: any, index: number) => ({
            titolo: subtask.titolo,
            descrizione: subtask.descrizione || null,
            ordine: subtask.ordine !== undefined ? subtask.ordine : index,
            completata: false
          }))
        };
      }

      const task = await prisma.task.create({
        data: taskData,
        include: {
          owner: { select: { id: true, nome: true, cognome: true, email: true } },
          assignees: { select: { id: true, nome: true, cognome: true, email: true } },
          team: true,
          progetto: true,
          subtasks: { orderBy: { ordine: 'asc' } }
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

      // Invia notifiche a tutti gli assegnatari
      for (const userId of finalAssigneeIds) {
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
      
      // 🆕 Ottieni companyId dell'utente
      const currentUser = await prisma.user.findUnique({
        where: { id: req.user!.id },
        select: { companyId: true, role: true }
      });

      if (!currentUser?.companyId) {
        return res.status(403).json({ error: "Utente non associato a un'azienda" });
      }

      const isAdmin = (req.user!.role.permessi as any).isAdmin;
      const where: any = {
        // 🆕 FILTRO PER AZIENDA - Mostra solo task della propria azienda
        owner: {
          is: { companyId: currentUser.companyId }
        }
      };

      // Se non è admin, vede solo le sue task
      if (!isAdmin) {
        where.OR = [
          { ownerId: req.user!.id }, 
          { assignees: { some: { id: req.user!.id } } }
        ];
      }

      if (stato) where.stato = stato;
      if (priorita) where.priorita = priorita;
      if (teamId) where.teamId = teamId;
      if (progettoId) where.progettoId = progettoId;
      if (ownerId && isAdmin) where.ownerId = ownerId;
      if (assigneeId && isAdmin) where.assignees = { some: { id: assigneeId } };
      if (search) {
        where.AND = [
          where.AND || {},
          {
            OR: [
              { titolo: { contains: search, mode: "insensitive" } }, 
              { descrizione: { contains: search, mode: "insensitive" } }
            ]
          }
        ];
      }

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
      
      // 🆕 Ottieni companyId
      const currentUser = await prisma.user.findUnique({
        where: { id: req.user!.id },
        select: { companyId: true }
      });

      const task = await prisma.task.findUnique({
        where: { id },
        include: {
          owner: { select: { id: true, nome: true, cognome: true, email: true, companyId: true } },
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
          subtasks: {
            orderBy: [{ ordine: "asc" }, { createdAt: "asc" }]
          },
          requests: {
            include: {
              autore: { select: { id: true, nome: true, cognome: true, email: true } }
            },
            orderBy: { createdAt: "desc" }
          }
        },
      });
      
      if (!task) return res.status(404).json({ error: "Task non trovata" });

      // 🆕 Verifica che la task appartenga alla stessa azienda
      if (task.owner.companyId !== currentUser?.companyId) {
        return res.status(403).json({ error: "Non hai accesso a questa task" });
      }

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
        include: { 
          assignees: true,
          owner: { select: { companyId: true } }
        } 
      });
      
      if (!existingTask) return res.status(404).json({ error: "Task non trovata" });

      // 🆕 Verifica azienda
      const currentUser = await prisma.user.findUnique({
        where: { id: req.user!.id },
        select: { companyId: true }
      });

      if (existingTask.owner.companyId !== currentUser?.companyId) {
        return res.status(403).json({ error: "Non hai accesso a questa task" });
      }

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

      // 🆕 Calcola score quando il task viene completato
      const wasCompleted = (stato === "completato" || stato === "completata") &&
                           (existingTask.stato !== "completato" && existingTask.stato !== "completata");

      console.log(`📋 Task Update - ID: ${id}`);
      console.log(`   Stato nuovo: ${stato}`);
      console.log(`   Stato vecchio: ${existingTask.stato}`);
      console.log(`   wasCompleted: ${wasCompleted}`);

      if (wasCompleted) {
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

      // 🆕 Calcola e assegna lo score
      if (wasCompleted) {
        console.log(`🎯 Task completata! Calcolo score per task ${task.id}`);
        try {
          // Calcola lo score una sola volta (viene assegnato all'owner e distribuito al team se necessario)
          const score = await scoreService.calculateTaskScore(task.id, new Date());
          console.log(`✅ Score calcolato per task ${task.id}: ${score} punti`);

          // Notifica gli admin del completamento
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
            if (admin.id !== req.user!.id) {
              await prisma.notification.create({
                data: {
                  userId: admin.id,
                  tipo: "task_completed",
                  titolo: "Task completato",
                  messaggio: `${req.user!.nome} ${req.user!.cognome} ha completato: ${task.titolo}`,
                  link: `/tasks/${task.id}`
                }
              });
            }
          }
        } catch (scoreError) {
          console.error('Errore nel calcolo dello score:', scoreError);
          // Non blocchiamo la risposta se il calcolo dello score fallisce
        }
      }

      res.json(task);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async deleteTask(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const task = await prisma.task.findUnique({ 
        where: { id },
        include: { owner: { select: { companyId: true } } }
      });
      
      if (!task) return res.status(404).json({ error: "Task non trovata" });

      // 🆕 Verifica azienda
      const currentUser = await prisma.user.findUnique({
        where: { id: req.user!.id },
        select: { companyId: true }
      });

      if (task.owner.companyId !== currentUser?.companyId) {
        return res.status(403).json({ error: "Non hai accesso a questa task" });
      }

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

      // 🆕 Verifica che tutte le task appartengano alla stessa azienda
      const currentUser = await prisma.user.findUnique({
        where: { id: req.user!.id },
        select: { companyId: true }
      });

      await prisma.task.updateMany({ 
        where: { 
          id: { in: taskIds },
          owner: { is: { companyId: currentUser?.companyId } }
        }, 
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
      const { stato, priorita, limit, today: todayParam } = req.query;

      // Se ci sono parametri di query, restituisci array filtrato
      if (stato || priorita || limit || todayParam) {
        return this.getMyTasksFiltered(req, res);
      }

      // Altrimenti restituisci le categorie come prima
      const currentUser = await prisma.user.findUnique({
        where: { id: req.user!.id },
        select: { companyId: true }
      });

      const baseWhere: any = {
        OR: [
          { ownerId: req.user!.id },
          { assignees: { some: { id: req.user!.id } } }
        ]
      };

      if (currentUser?.companyId) {
        baseWhere.owner = {
          is: { companyId: currentUser.companyId }
        };
      }

      const tasks = await prisma.task.findMany({
        where: baseWhere,
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

  private async getMyTasksFiltered(req: AuthRequest, res: Response) {
    try {
      console.log('🔍 getMyTasksFiltered called with query:', req.query);
      console.log('🔍 User ID:', req.user!.id);

      const { stato, priorita, limit, today } = req.query;

      const currentUser = await prisma.user.findUnique({
        where: { id: req.user!.id },
        select: { companyId: true }
      });

      console.log('🔍 Current user:', currentUser);

      const where: any = {
        OR: [
          { ownerId: req.user!.id },
          { assignees: { some: { id: req.user!.id } } }
        ]
      };

      // Aggiungi filtro per azienda solo se l'utente ha un companyId
      if (currentUser?.companyId) {
        where.owner = {
          is: { companyId: currentUser.companyId }
        };
      }

      // Filtri per stato (può essere multiplo separato da virgola)
      if (stato) {
        const stati = (stato as string).split(',').map(s => s.trim());
        where.stato = { in: stati };
      }

      // Filtro per priorità
      if (priorita) {
        where.priorita = priorita;
      }

      // Filtro per today (solo task di oggi)
      if (today === 'true') {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);
        where.updatedAt = {
          gte: todayStart,
          lte: todayEnd
        };
      }

      const tasks = await prisma.task.findMany({
        where,
        include: {
          owner: { select: { id: true, nome: true, cognome: true } },
          assignees: { select: { id: true, nome: true, cognome: true } },
          team: true,
          progetto: true,
        },
        orderBy: [{ scadenza: "asc" }, { priorita: "desc" }],
        take: limit ? parseInt(limit as string) : undefined
      });

      console.log('✅ Tasks found:', tasks.length);
      res.json(tasks);
    } catch (error: any) {
      console.error('❌ Error in getMyTasksFiltered:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Ottiene le task del giorno con subtasks e info sul completamento
  async getTodayTasks(req: AuthRequest, res: Response) {
    try {
      const currentUser = await prisma.user.findUnique({
        where: { id: req.user!.id },
        select: { companyId: true }
      });

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      const where: any = {
        AND: [
          // User è owner o assignee
          {
            OR: [
              { ownerId: req.user!.id },
              { assignees: { some: { id: req.user!.id } } }
            ]
          },
          // Task non completate
          {
            stato: { notIn: ['completed', 'completata', 'completato'] }
          },
          // Task con scadenza oggi O in progress senza scadenza
          {
            OR: [
              {
                scadenza: {
                  gte: todayStart,
                  lte: todayEnd
                }
              },
              {
                scadenza: null,
                stato: { in: ['in_progress', 'in_corso'] }
              }
            ]
          }
        ]
      };

      if (currentUser?.companyId) {
        where.owner = {
          is: { companyId: currentUser.companyId }
        };
      }

      const tasks = await prisma.task.findMany({
        where,
        include: {
          owner: { select: { id: true, nome: true, cognome: true } },
          assignees: { select: { id: true, nome: true, cognome: true } },
          team: { select: { id: true, nome: true, colore: true } },
          progetto: { select: { id: true, nome: true, colore: true } },
          subtasks: {
            orderBy: [{ ordine: 'asc' }, { createdAt: 'asc' }],
            include: {
              workSessions: {
                where: {
                  userId: req.user!.id,
                  stato: { in: ['active', 'paused'] }
                },
                orderBy: { createdAt: 'desc' },
                take: 1
              }
            }
          },
          _count: {
            select: {
              subtasks: true,
              comments: true
            }
          }
        },
        orderBy: [
          { priorita: 'desc' },
          { scadenza: 'asc' }
        ],
      });

      // Calcola la percentuale di completamento per ogni task
      const tasksWithProgress = tasks.map((task: any) => {
        const totalSubtasks = task.subtasks.length;
        const completedSubtasks = task.subtasks.filter((st: any) => st.completata).length;
        const completionPercentage = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;

        // Trova la sessione attiva se presente
        const activeSubtask = task.subtasks.find((st: any) => st.workSessions.length > 0);
        const activeSession = activeSubtask?.workSessions[0];

        return {
          ...task,
          completionPercentage,
          totalSubtasks,
          completedSubtasks,
          activeSession: activeSession ? {
            id: activeSession.id,
            subtaskId: activeSubtask.id,
            subtaskTitolo: activeSubtask.titolo,
            stato: activeSession.stato,
            tempoAccumulato: activeSession.tempoAccumulato,
            startedAt: activeSession.startedAt,
            pausedAt: activeSession.pausedAt
          } : null
        };
      });

      res.json(tasksWithProgress);
    } catch (error: any) {
      console.error('❌ Error in getTodayTasks:', error);
      res.status(500).json({ error: error.message });
    }
  }
}

export default new TaskController();


