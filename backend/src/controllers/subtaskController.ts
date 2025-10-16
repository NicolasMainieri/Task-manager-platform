import { Response } from "express";
import prisma from "../config/database";
import { AuthRequest } from "../middleware/auth";
import { stringifyJsonField } from "../utils/jsonHelper";

class SubtaskController {
  // Crea una subtask per un task
  async createSubtask(req: AuthRequest, res: Response) {
    try {
      const { taskId } = req.params;
      const { titolo, descrizione, ordine } = req.body;

      if (!titolo) {
        return res.status(400).json({ error: "Il titolo è obbligatorio" });
      }

      // Verifica che il task esista e che l'utente abbia accesso
      const task = await prisma.task.findUnique({
        where: { id: taskId },
        include: {
          owner: { select: { companyId: true } },
          assignees: { select: { id: true } }
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

      const isAdmin = (req.user!.role.permessi as any).isAdmin;
      const isOwner = task.ownerId === req.user!.id;
      const isAssignee = task.assignees.some(a => a.id === req.user!.id);

      if (!isAdmin && !isOwner && !isAssignee) {
        return res.status(403).json({ error: "Non hai permessi per aggiungere subtask a questo task" });
      }

      // Se l'ordine non è specificato, mettilo alla fine
      let finalOrdine = ordine;
      if (finalOrdine === undefined || finalOrdine === null) {
        const lastSubtask = await prisma.subtask.findFirst({
          where: { taskId },
          orderBy: { ordine: "desc" }
        });
        finalOrdine = lastSubtask ? lastSubtask.ordine + 1 : 0;
      }

      const subtask = await prisma.subtask.create({
        data: {
          titolo,
          descrizione,
          ordine: finalOrdine,
          taskId
        }
      });

      await prisma.auditLog.create({
        data: {
          entita: "Subtask",
          entitaId: subtask.id,
          azione: "create",
          autoreId: req.user!.id,
          payload: stringifyJsonField({ taskId, titolo })
        }
      });

      res.status(201).json(subtask);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // Ottieni tutte le subtask di un task
  async getSubtasks(req: AuthRequest, res: Response) {
    try {
      const { taskId } = req.params;

      // Verifica che il task esista e che l'utente abbia accesso
      const task = await prisma.task.findUnique({
        where: { id: taskId },
        include: {
          owner: { select: { companyId: true } },
          assignees: { select: { id: true } }
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

      const isAdmin = (req.user!.role.permessi as any).isAdmin;
      const isOwner = task.ownerId === req.user!.id;
      const isAssignee = task.assignees.some(a => a.id === req.user!.id);

      if (!isAdmin && !isOwner && !isAssignee) {
        return res.status(403).json({ error: "Non hai accesso a questo task" });
      }

      const subtasks = await prisma.subtask.findMany({
        where: { taskId },
        orderBy: { ordine: "asc" }
      });

      res.json(subtasks);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // Aggiorna una subtask
  async updateSubtask(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { titolo, descrizione, completata, ordine } = req.body;

      const subtask = await prisma.subtask.findUnique({
        where: { id },
        include: {
          task: {
            include: {
              owner: { select: { companyId: true } },
              assignees: { select: { id: true } }
            }
          }
        }
      });

      if (!subtask) {
        return res.status(404).json({ error: "Subtask non trovata" });
      }

      const currentUser = await prisma.user.findUnique({
        where: { id: req.user!.id },
        select: { companyId: true }
      });

      // Verifica che l'utente appartenga alla stessa azienda
      if (subtask.task.owner.companyId !== currentUser?.companyId) {
        return res.status(403).json({ error: "Non hai accesso a questa subtask" });
      }

      const isAdmin = (req.user!.role.permessi as any).isAdmin;
      const isOwner = subtask.task.ownerId === req.user!.id;
      const isAssignee = subtask.task.assignees.some(a => a.id === req.user!.id);

      if (!isAdmin && !isOwner && !isAssignee) {
        return res.status(403).json({ error: "Non hai permessi per modificare questa subtask" });
      }

      const updatedSubtask = await prisma.subtask.update({
        where: { id },
        data: {
          ...(titolo !== undefined && { titolo }),
          ...(descrizione !== undefined && { descrizione }),
          ...(completata !== undefined && { completata }),
          ...(ordine !== undefined && { ordine })
        }
      });

      await prisma.auditLog.create({
        data: {
          entita: "Subtask",
          entitaId: updatedSubtask.id,
          azione: "update",
          autoreId: req.user!.id,
          payload: stringifyJsonField(req.body)
        }
      });

      // Controlla se tutte le subtask sono completate
      const allSubtasks = await prisma.subtask.findMany({
        where: { taskId: subtask.taskId }
      });
      const totalSubtasks = allSubtasks.length;
      const completedSubtasks = allSubtasks.filter(st => st.completata).length;
      const allCompleted = allSubtasks.every(st => st.completata);

      // Calcola percentuale di completamento
      const completionPercentage = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;

      // Se tutte le subtask sono completate, completa automaticamente il task
      if (allCompleted && subtask.task.stato !== 'completed') {
        await prisma.task.update({
          where: { id: subtask.taskId },
          data: {
            stato: 'completed',
            dataFine: new Date()
          }
        });

        // Notifica il proprietario del task
        await prisma.notification.create({
          data: {
            userId: subtask.task.ownerId,
            tipo: "task_auto_completed",
            titolo: "Task completato automaticamente",
            messaggio: `Il task "${subtask.task.titolo}" è stato completato automaticamente perché tutte le subtask sono state completate!`,
            link: `/tasks/${subtask.taskId}`
          }
        });
      } else if (!allCompleted && subtask.task.stato === 'completed') {
        // Se era completato ma ora non più, riportalo in progress
        await prisma.task.update({
          where: { id: subtask.taskId },
          data: {
            stato: 'in_progress',
            dataFine: null
          }
        });
      }

      res.json(updatedSubtask);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // Aggiorna solo lo stato completamento di una subtask
  async toggleSubtaskCompletion(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const subtask = await prisma.subtask.findUnique({
        where: { id },
        include: {
          task: {
            include: {
              owner: { select: { companyId: true } },
              assignees: { select: { id: true } }
            }
          }
        }
      });

      if (!subtask) {
        return res.status(404).json({ error: "Subtask non trovata" });
      }

      const currentUser = await prisma.user.findUnique({
        where: { id: req.user!.id },
        select: { companyId: true }
      });

      // Verifica che l'utente appartenga alla stessa azienda
      if (subtask.task.owner.companyId !== currentUser?.companyId) {
        return res.status(403).json({ error: "Non hai accesso a questa subtask" });
      }

      const isAdmin = (req.user!.role.permessi as any).isAdmin;
      const isOwner = subtask.task.ownerId === req.user!.id;
      const isAssignee = subtask.task.assignees.some(a => a.id === req.user!.id);

      if (!isAdmin && !isOwner && !isAssignee) {
        return res.status(403).json({ error: "Non hai permessi per modificare questa subtask" });
      }

      const updatedSubtask = await prisma.subtask.update({
        where: { id },
        data: {
          completata: !subtask.completata
        }
      });

      await prisma.auditLog.create({
        data: {
          entita: "Subtask",
          entitaId: updatedSubtask.id,
          azione: "toggle_completion",
          autoreId: req.user!.id,
          payload: stringifyJsonField({ completata: updatedSubtask.completata })
        }
      });

      // Controlla se tutte le subtask sono completate per auto-completare il task
      const allSubtasks = await prisma.subtask.findMany({
        where: { taskId: subtask.taskId }
      });
      const allCompleted = allSubtasks.every(st => st.completata);

      // Se tutte le subtask sono completate, completa automaticamente il task
      if (allCompleted && !['completed', 'completato', 'completata'].includes(subtask.task.stato)) {
        await prisma.task.update({
          where: { id: subtask.taskId },
          data: {
            stato: 'completato',
            dataFine: new Date()
          }
        });

        // Notifica il proprietario del task
        await prisma.notification.create({
          data: {
            userId: subtask.task.ownerId,
            tipo: "task_auto_completed",
            titolo: "Task completato automaticamente",
            messaggio: `Il task "${subtask.task.titolo}" è stato completato automaticamente perché tutte le subtask sono state completate!`,
            link: `/tasks/${subtask.taskId}`
          }
        });
      } else if (!allCompleted && ['completed', 'completato', 'completata'].includes(subtask.task.stato)) {
        // Se era completato ma ora non più, riportalo in corso
        await prisma.task.update({
          where: { id: subtask.taskId },
          data: {
            stato: 'in_corso',
            dataFine: null
          }
        });
      }

      res.json(updatedSubtask);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // Elimina una subtask
  async deleteSubtask(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const subtask = await prisma.subtask.findUnique({
        where: { id },
        include: {
          task: {
            include: {
              owner: { select: { companyId: true } },
              assignees: { select: { id: true } }
            }
          }
        }
      });

      if (!subtask) {
        return res.status(404).json({ error: "Subtask non trovata" });
      }

      const currentUser = await prisma.user.findUnique({
        where: { id: req.user!.id },
        select: { companyId: true }
      });

      // Verifica che l'utente appartenga alla stessa azienda
      if (subtask.task.owner.companyId !== currentUser?.companyId) {
        return res.status(403).json({ error: "Non hai accesso a questa subtask" });
      }

      const isAdmin = (req.user!.role.permessi as any).isAdmin;
      const isOwner = subtask.task.ownerId === req.user!.id;

      if (!isAdmin && !isOwner) {
        return res.status(403).json({ error: "Non hai permessi per eliminare questa subtask" });
      }

      await prisma.subtask.delete({ where: { id } });

      await prisma.auditLog.create({
        data: {
          entita: "Subtask",
          entitaId: id,
          azione: "delete",
          autoreId: req.user!.id,
          payload: stringifyJsonField({ titolo: subtask.titolo })
        }
      });

      res.json({ message: "Subtask eliminata con successo" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // Riordina le subtask
  async reorderSubtasks(req: AuthRequest, res: Response) {
    try {
      const { taskId } = req.params;
      const { subtaskIds } = req.body; // Array di ID nell'ordine desiderato

      if (!Array.isArray(subtaskIds)) {
        return res.status(400).json({ error: "subtaskIds deve essere un array" });
      }

      // Verifica che il task esista e che l'utente abbia accesso
      const task = await prisma.task.findUnique({
        where: { id: taskId },
        include: {
          owner: { select: { companyId: true } },
          assignees: { select: { id: true } }
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

      const isAdmin = (req.user!.role.permessi as any).isAdmin;
      const isOwner = task.ownerId === req.user!.id;
      const isAssignee = task.assignees.some(a => a.id === req.user!.id);

      if (!isAdmin && !isOwner && !isAssignee) {
        return res.status(403).json({ error: "Non hai permessi per riordinare le subtask" });
      }

      // Aggiorna l'ordine di ogni subtask
      const updatePromises = subtaskIds.map((id, index) =>
        prisma.subtask.update({
          where: { id },
          data: { ordine: index }
        })
      );

      await Promise.all(updatePromises);

      const updatedSubtasks = await prisma.subtask.findMany({
        where: { taskId },
        orderBy: { ordine: "asc" }
      });

      await prisma.auditLog.create({
        data: {
          entita: "Subtask",
          entitaId: taskId,
          azione: "reorder",
          autoreId: req.user!.id,
          payload: stringifyJsonField({ subtaskIds })
        }
      });

      res.json(updatedSubtasks);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}

export default new SubtaskController();
