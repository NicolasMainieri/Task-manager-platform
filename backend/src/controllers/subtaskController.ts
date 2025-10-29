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

      // 🆕 Se la subtask viene completata, chiudi automaticamente i timer attivi
      const wasCompleted = completata === true && !subtask.completata;

      if (wasCompleted) {
        console.log(`⏱️  Subtask completata - Chiusura automatica timer per subtask ${id}`);

        // Trova tutte le sessioni attive o in pausa per questa subtask
        const activeSessions = await prisma.workSession.findMany({
          where: {
            subtaskId: id,
            stato: { in: ['active', 'paused'] }
          },
          include: {
            user: true
          }
        });

        console.log(`   Trovate ${activeSessions.length} sessioni attive da chiudere`);

        // Chiudi ogni sessione e crea il worklog corrispondente
        for (const session of activeSessions) {
          const endTime = new Date();
          let tempoTotale = session.tempoAccumulato;

          // Se la sessione è active, aggiungi il tempo dall'ultimo start
          if (session.stato === 'active' && session.startedAt) {
            const lastSessionTime = Math.floor((endTime.getTime() - new Date(session.startedAt).getTime()) / 60000);
            tempoTotale += lastSessionTime;
          }

          // Aggiorna la sessione a completed
          await prisma.workSession.update({
            where: { id: session.id },
            data: {
              stato: 'completed',
              tempoAccumulato: tempoTotale,
              completedAt: endTime
            }
          });

          // Crea il worklog
          await prisma.taskWorklog.create({
            data: {
              taskId: subtask.taskId,
              userId: session.userId,
              minuti: tempoTotale,
              note: `Timer chiuso automaticamente al completamento della subtask "${subtask.titolo}"`,
              checklistDone: '[]'
            }
          });

          console.log(`   ✅ Chiusa sessione ${session.id} - ${tempoTotale} minuti`);
        }
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

      // 🆕 Distribuisci punti se la subtask è stata completata
      if (wasCompleted && subtask.task.rewardPerSubtask > 0) {
        const currentPeriod = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;

        // Dai i punti all'utente che ha completato la subtask
        await prisma.score.create({
          data: {
            userId: req.user!.id,
            taskId: subtask.taskId,
            puntiBase: subtask.task.rewardPerSubtask,
            punti: subtask.task.rewardPerSubtask,
            puntiTotali: subtask.task.rewardPerSubtask,
            periodo: currentPeriod,
            breakdown: JSON.stringify({
              tipo: 'subtask_completata',
              subtaskId: id,
              subtaskTitolo: subtask.titolo,
              taskId: subtask.taskId,
              taskTitolo: subtask.task.titolo
            })
          }
        });

        // Notifica l'utente
        await prisma.notification.create({
          data: {
            userId: req.user!.id,
            tipo: 'punti_guadagnati',
            titolo: 'Punti guadagnati!',
            messaggio: `Hai guadagnato ${subtask.task.rewardPerSubtask} punti completando la subtask "${subtask.titolo}"`,
            link: `/tasks/${subtask.taskId}`
          }
        });

        console.log(`💰 Distribuiti ${subtask.task.rewardPerSubtask} punti per subtask completata`);
      }

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

        // 🆕 Aggiorna progresso progetto (se collegato)
        if (subtask.task.progettoId) {
          const progetto = await prisma.progetto.findUnique({
            where: { id: subtask.task.progettoId },
            include: {
              tasks: {
                include: {
                  subtasks: true
                }
              }
            }
          });

          if (progetto && !progetto.isFolder) {
            // Calcola progresso del progetto
            const totalTasks = progetto.tasks.length;
            const completedTasks = progetto.tasks.filter(t => t.stato === 'completed').length;
            const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

            await prisma.progetto.update({
              where: { id: subtask.task.progettoId },
              data: {
                progresso: progress
              }
            });

            console.log(`📊 Aggiornato progresso progetto "${progetto.nome}": ${progress}%`);
          }
        }
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

      // 🆕 Se la subtask viene completata, chiudi automaticamente i timer attivi
      const wasCompleted = !subtask.completata; // Sta per essere completata (toggle)

      if (wasCompleted) {
        console.log(`⏱️  Subtask completata (toggle) - Chiusura automatica timer per subtask ${id}`);

        // Trova tutte le sessioni attive o in pausa per questa subtask
        const activeSessions = await prisma.workSession.findMany({
          where: {
            subtaskId: id,
            stato: { in: ['active', 'paused'] }
          },
          include: {
            user: true
          }
        });

        console.log(`   Trovate ${activeSessions.length} sessioni attive da chiudere`);

        // Chiudi ogni sessione e crea il worklog corrispondente
        for (const session of activeSessions) {
          const endTime = new Date();
          let tempoTotale = session.tempoAccumulato;

          // Se la sessione è active, aggiungi il tempo dall'ultimo start
          if (session.stato === 'active' && session.startedAt) {
            const lastSessionTime = Math.floor((endTime.getTime() - new Date(session.startedAt).getTime()) / 60000);
            tempoTotale += lastSessionTime;
          }

          // Aggiorna la sessione a completed
          await prisma.workSession.update({
            where: { id: session.id },
            data: {
              stato: 'completed',
              tempoAccumulato: tempoTotale,
              completedAt: endTime
            }
          });

          // Crea il worklog
          await prisma.taskWorklog.create({
            data: {
              taskId: subtask.taskId,
              userId: session.userId,
              minuti: tempoTotale,
              note: `Timer chiuso automaticamente al completamento della subtask "${subtask.titolo}"`,
              checklistDone: '[]'
            }
          });

          console.log(`   ✅ Chiusa sessione ${session.id} - ${tempoTotale} minuti`);
        }
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

      // 🆕 Distribuisci punti se la subtask è completata
      if (wasCompleted && subtask.task.rewardPerSubtask > 0) {
        const currentPeriod = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;

        // Dai i punti all'utente che ha completato la subtask
        await prisma.score.create({
          data: {
            userId: req.user!.id,
            taskId: subtask.taskId,
            puntiBase: subtask.task.rewardPerSubtask,
            punti: subtask.task.rewardPerSubtask,
            puntiTotali: subtask.task.rewardPerSubtask,
            periodo: currentPeriod,
            breakdown: JSON.stringify({
              tipo: 'subtask_completata',
              subtaskId: id,
              subtaskTitolo: subtask.titolo,
              taskId: subtask.taskId,
              taskTitolo: subtask.task.titolo
            })
          }
        });

        // Notifica l'utente
        await prisma.notification.create({
          data: {
            userId: req.user!.id,
            tipo: 'punti_guadagnati',
            titolo: 'Punti guadagnati!',
            messaggio: `Hai guadagnato ${subtask.task.rewardPerSubtask} punti completando la subtask "${subtask.titolo}"`,
            link: `/tasks/${subtask.taskId}`
          }
        });

        console.log(`💰 Distribuiti ${subtask.task.rewardPerSubtask} punti per subtask completata`);
      }

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

        // 🆕 Distribuisci punti base per completamento task (se ci sono subtask, i punti vengono distribuiti tramite subtask)
        // Solo se rewardPoints > 0 e nessuna subtask
        if (subtask.task.rewardPoints > 0 && allSubtasks.length === 0) {
          const currentPeriod = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;

          // Distribuisci i punti agli assignee del task
          const assigneeIds = subtask.task.assignees.map(a => a.id);
          const pointsPerAssignee = Math.floor(subtask.task.rewardPoints / Math.max(assigneeIds.length, 1));

          for (const assigneeId of assigneeIds) {
            await prisma.score.create({
              data: {
                userId: assigneeId,
                taskId: subtask.taskId,
                puntiBase: pointsPerAssignee,
                punti: pointsPerAssignee,
                puntiTotali: pointsPerAssignee,
                periodo: currentPeriod,
                breakdown: JSON.stringify({
                  tipo: 'task_completata',
                  taskId: subtask.taskId,
                  taskTitolo: subtask.task.titolo
                })
              }
            });

            await prisma.notification.create({
              data: {
                userId: assigneeId,
                tipo: 'punti_guadagnati',
                titolo: 'Task completata!',
                messaggio: `Hai guadagnato ${pointsPerAssignee} punti completando il task "${subtask.task.titolo}"`,
                link: `/tasks/${subtask.taskId}`
              }
            });
          }

          console.log(`💰 Distribuiti ${subtask.task.rewardPoints} punti per task completata (${assigneeIds.length} assignees)`);
        }

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

        // 🆕 Aggiorna progresso progetto (se collegato)
        if (subtask.task.progettoId) {
          const progetto = await prisma.progetto.findUnique({
            where: { id: subtask.task.progettoId },
            include: {
              tasks: {
                include: {
                  subtasks: true
                }
              }
            }
          });

          if (progetto && !progetto.isFolder) {
            // Calcola progresso del progetto
            const totalTasks = progetto.tasks.length;
            const completedTasks = progetto.tasks.filter(t => ['completed', 'completato', 'completata'].includes(t.stato)).length;
            const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

            await prisma.progetto.update({
              where: { id: subtask.task.progettoId },
              data: {
                progresso: progress
              }
            });

            console.log(`📊 Aggiornato progresso progetto "${progetto.nome}": ${progress}%`);
          }
        }
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
