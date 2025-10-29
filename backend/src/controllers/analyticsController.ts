import { Response } from "express";
import prisma from "../config/database";
import { AuthRequest } from "../middleware/auth";
import scoreService from "../services/score.service";

class AnalyticsController {
  async getAnalytics(req: AuthRequest, res: Response) {
    try {
      const isAdmin = (req.user!.role?.permessi as any)?.isAdmin === true;
      const where: any = {};
      
      if (!isAdmin) {
        where.OR = [
          { ownerId: req.user!.id },
          { assignees: { some: { id: req.user!.id } } }
        ];
      }

      const [totalTasks, completedTasks, inProgressTasks, blockedTasks] = await Promise.all([
        prisma.task.count({ where }),
        prisma.task.count({ where: { ...where, stato: "completato" } }),
        prisma.task.count({ where: { ...where, stato: "in_corso" } }),
        prisma.task.count({ where: { ...where, stato: "bloccato" } }),
      ]);

      const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

      res.json({
        totalTasks,
        completedTasks,
        inProgressTasks,
        blockedTasks,
        completionRate: completionRate.toFixed(2)
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // (other methods defined below)

  async getTasksByStatus(req: AuthRequest, res: Response) {
    try {
      const isAdmin = (req.user!.role?.permessi as any)?.isAdmin === true;
      const where: any = {};
      
      if (!isAdmin) {
        where.OR = [
          { ownerId: req.user!.id },
          { assignees: { some: { id: req.user!.id } } }
        ];
      }

      const tasksByStatus = await prisma.task.groupBy({
        by: ["stato"],
        where,
        _count: { _all: true }
      });

      res.json(tasksByStatus);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getTasksByPriority(req: AuthRequest, res: Response) {
    try {
      const isAdmin = (req.user!.role?.permessi as any)?.isAdmin === true;
      const where: any = {};
      
      if (!isAdmin) {
        where.OR = [
          { ownerId: req.user!.id },
          { assignees: { some: { id: req.user!.id } } }
        ];
      }

      const tasksByPriority = await prisma.task.groupBy({
        by: ["priorita"],
        where,
        _count: { _all: true }
      });

      res.json(tasksByPriority);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getTeamPerformance(req: AuthRequest, res: Response) {
    try {
      const teams = await prisma.team.findMany({
        include: {
          users: {
            select: { id: true, nome: true, cognome: true }
          }
        }
      });

      const performance = await Promise.all(teams.map(async (team: any) => {
        const tasks = await prisma.task.count({ where: { teamId: team.id } });
        const completedTasks = await prisma.task.count({
          where: { teamId: team.id, stato: "completato" }
        });

        return {
          team: {
            id: team.id,
            nome: team.nome,
            colore: team.colore,
            membersCount: team.users.length
          },
          tasks,
          completedTasks,
          completionRate: tasks > 0 ? ((completedTasks / tasks) * 100).toFixed(2) : 0
        };
      }));

      res.json(performance);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getUserPerformance(req: AuthRequest, res: Response) {
    try {
      const { userId } = req.params;
      const targetUserId = userId || req.user!.id;
      const isAdmin = (req.user!.role?.permessi as any)?.isAdmin === true;

      if (!isAdmin && targetUserId !== req.user!.id) {
        return res.status(403).json({ error: "Non hai accesso a questi dati" });
      }

      const [totalTasks, completedTasks] = await Promise.all([
        prisma.task.count({
          where: {
            assignees: { some: { id: targetUserId } }
          }
        }),
        prisma.task.count({
          where: {
            assignees: { some: { id: targetUserId } },
            stato: "completato"
          }
        })
      ]);

      res.json({
        totalTasks,
        completedTasks,
        completionRate: totalTasks > 0 ? ((completedTasks / totalTasks) * 100).toFixed(2) : 0
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getTasksTimeline(req: AuthRequest, res: Response) {
    try {
      const { days = 30 } = req.query;
      const isAdmin = (req.user!.role?.permessi as any)?.isAdmin === true;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - Number(days));

      const where: any = { createdAt: { gte: startDate } };
      
      if (!isAdmin) {
        where.OR = [
          { ownerId: req.user!.id },
          { assignees: { some: { id: req.user!.id } } }
        ];
      }

      const tasks = await prisma.task.findMany({
        where,
        select: { id: true, stato: true, createdAt: true, updatedAt: true }
      });

      const timeline: Record<string, { date: string; created: number; completed: number }> = {};

      for (const task of tasks) {
        const dateKey = task.createdAt.toISOString().split("T")[0];
        if (!timeline[dateKey]) {
          timeline[dateKey] = { date: dateKey, created: 0, completed: 0 };
        }
        timeline[dateKey].created++;

        if (task.stato === "completato") {
          const completedDateKey = task.updatedAt.toISOString().split("T")[0];
          if (!timeline[completedDateKey]) {
            timeline[completedDateKey] = { date: completedDateKey, created: 0, completed: 0 };
          }
          timeline[completedDateKey].completed++;
        }
      }

      res.json(Object.values(timeline).sort((a, b) => a.date.localeCompare(b.date)));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async exportReport(req: AuthRequest, res: Response) {
    try {
      const { formato = "json" } = req.query;
      const isAdmin = (req.user!.role?.permessi as any)?.isAdmin === true;
      const where: any = {};

      if (!isAdmin) {
        where.OR = [
          { ownerId: req.user!.id },
          { assignees: { some: { id: req.user!.id } } }
        ];
      }

      const tasks = await prisma.task.findMany({
        where,
        include: {
          owner: {
            select: { nome: true, cognome: true, email: true }
          },
          assignees: {
            select: { nome: true, cognome: true, email: true }
          },
          team: true
        }
      });

      if (formato === "json") {
        return res.json(tasks);
      }

      if (formato === "csv") {
        const csv = this.convertToCSV(tasks);
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", "attachment; filename=report.csv");
        return res.send(csv);
      }

      res.status(400).json({ error: "Formato non supportato" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  private convertToCSV(data: any[]): string {
    if (data.length === 0) return "";

    const headers = ["ID", "Titolo", "Stato", "Priorità", "Owner", "Team", "Scadenza", "Creata il"];
    const rows = data.map((task) => [
      task.id,
      task.titolo,
      task.stato,
      task.priorita,
      `${task.owner.nome} ${task.owner.cognome}`,
      task.team?.nome || "",
      task.scadenza || "",
      task.createdAt
    ]);

    return [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");
  }

  async getDashboardStats(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const isAdmin = (req.user!.role?.permessi as any)?.isAdmin === true;

      const where: any = {};
      if (!isAdmin) {
        where.OR = [
          { ownerId: userId },
          { assignees: { some: { id: userId } } }
        ];
      }

      const [totalTasks, completedTasks, inProgressTasks, myScore, recentActivities] = await Promise.all([
        prisma.task.count({ where }),
        prisma.task.count({ where: { ...where, stato: "completato" } }),
        prisma.task.count({ where: { ...where, stato: "in_corso" } }),
        scoreService.getUserScore(userId, this.getCurrentPeriod()),
        prisma.task.findMany({
          where,
          orderBy: { updatedAt: 'desc' },
          take: 5,
          select: {
            id: true,
            titolo: true,
            stato: true,
            priorita: true,
            updatedAt: true
          }
        })
      ]);

      res.json({
        totalTasks,
        completedTasks,
        inProgressTasks,
        myScore,
        completionRate: totalTasks > 0 ? ((completedTasks / totalTasks) * 100).toFixed(2) : 0,
        recentActivities
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getLeaderboard(req: AuthRequest, res: Response) {
    try {
      const { type = 'user', limit = 10 } = req.query as any;
      const leaderboard = await scoreService.getLeaderboard(
        (type as string) === 'team' ? 'team' : 'user',
        undefined,
        Number(limit)
      );
      res.json(leaderboard);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getMyScore(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const score = await scoreService.getUserScore(userId);

      const scores = await prisma.score.findMany({
        where: {
          userId,
          // no periodo field in schema; returning last 10 by createdAt
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          task: {
            select: {
              titolo: true,
              stato: true
            }
          }
        }
      });

      res.json({
        totalScore: score,
        recentScores: scores
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  private getCurrentPeriod(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }

  // Endpoint per EmployeeDashboardHome
  async getMyStats(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Task da completare oggi
      const tasksToday = await prisma.task.count({
        where: {
          assignees: { some: { id: userId } },
          stato: { in: ['da_fare', 'in_corso'] },
          scadenza: { gte: today }
        }
      });

      // Task completati oggi
      const completedToday = await prisma.task.count({
        where: {
          assignees: { some: { id: userId } },
          stato: 'completato',
          updatedAt: { gte: today }
        }
      });

      // Score totale dell'utente
      const scoreData = await prisma.score.aggregate({
        where: { userId },
        _sum: { puntiTotali: true }
      });
      const score = scoreData._sum.puntiTotali || 0;

      console.log(`[Analytics] User ${userId} - Score query result:`, scoreData);
      console.log(`[Analytics] User ${userId} - Total score: ${score}`);

      // Ranking dell'utente
      const allUsers = await prisma.user.findMany({
        where: { companyId: req.user!.companyId },
        select: { id: true }
      });

      const userScores = await Promise.all(
        allUsers.map(async (user) => {
          const userScore = await prisma.score.aggregate({
            where: { userId: user.id },
            _sum: { puntiTotali: true }
          });
          return {
            userId: user.id,
            score: userScore._sum.puntiTotali || 0
          };
        })
      );

      userScores.sort((a, b) => b.score - a.score);
      const ranking = userScores.findIndex(u => u.userId === userId) + 1;

      console.log(`[Analytics] Sending response:`, {
        tasksToday,
        score,
        ranking,
        completedToday
      });

      res.json({
        tasksToday,
        score,
        ranking,
        completedToday
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getWeeklyProgress(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const today = new Date();
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - 6);
      weekStart.setHours(0, 0, 0, 0);

      const progress: number[] = [];

      for (let i = 0; i < 7; i++) {
        const dayStart = new Date(weekStart);
        dayStart.setDate(weekStart.getDate() + i);
        const dayEnd = new Date(dayStart);
        dayEnd.setDate(dayStart.getDate() + 1);

        const completedCount = await prisma.task.count({
          where: {
            assignees: { some: { id: userId } },
            stato: 'completato',
            updatedAt: {
              gte: dayStart,
              lt: dayEnd
            }
          }
        });

        progress.push(completedCount);
      }

      res.json(progress);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // 🆕 ADMIN ONLY: Cronologia task completate per dipendente
  async getTaskHistory(req: AuthRequest, res: Response) {
    try {
      const { userId, startDate, endDate } = req.query;

      const user = await prisma.user.findUnique({
        where: { id: req.user!.id },
        select: { companyId: true }
      });

      const whereClause: any = {
        owner: { companyId: user?.companyId },
        stato: { in: ['completed', 'completato', 'completata'] }
      };

      if (userId) {
        whereClause.OR = [
          { ownerId: userId as string },
          { assignees: { some: { id: userId as string } } }
        ];
      }

      if (startDate || endDate) {
        whereClause.dataFine = {};
        if (startDate) whereClause.dataFine.gte = new Date(startDate as string);
        if (endDate) whereClause.dataFine.lte = new Date(endDate as string);
      }

      const tasks = await prisma.task.findMany({
        where: whereClause,
        include: {
          owner: { select: { id: true, nome: true, cognome: true, email: true, avatar: true } },
          assignees: { select: { id: true, nome: true, cognome: true, email: true, avatar: true } },
          subtasks: { select: { id: true, titolo: true, completata: true } },
          progetto: { select: { id: true, nome: true, colore: true } },
          team: { select: { id: true, nome: true, colore: true } },
          scores: {
            where: userId ? { userId: userId as string } : undefined,
            select: { id: true, userId: true, puntiTotali: true, periodo: true, createdAt: true, breakdown: true }
          }
        },
        orderBy: { dataFine: 'desc' }
      });

      const tasksWithStats = tasks.map(task => ({
        ...task,
        totalSubtasks: task.subtasks.length,
        completedSubtasks: task.subtasks.filter(st => st.completata).length,
        completionPercentage: task.subtasks.length > 0 ? Math.round((task.subtasks.filter(st => st.completata).length / task.subtasks.length) * 100) : 100,
        totalPointsAwarded: task.scores.reduce((sum, s) => sum + s.puntiTotali, 0)
      }));

      res.json(tasksWithStats);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // 🆕 ADMIN ONLY: Assegna punti manualmente
  async assignManualPoints(req: AuthRequest, res: Response) {
    try {
      const { userId, punti, motivo, taskId } = req.body;

      if (!userId || !punti || !motivo) {
        return res.status(400).json({ error: 'userId, punti e motivo sono obbligatori' });
      }

      const user = await prisma.user.findUnique({
        where: { id: req.user!.id },
        select: { companyId: true }
      });

      const targetUser = await prisma.user.findFirst({
        where: { id: userId, companyId: user?.companyId }
      });

      if (!targetUser) {
        return res.status(404).json({ error: 'Utente non trovato' });
      }

      const currentPeriod = this.getCurrentPeriod();

      const score = await prisma.score.create({
        data: {
          userId: userId,
          taskId: taskId || userId,
          puntiBase: parseInt(punti),
          punti: parseInt(punti),
          puntiTotali: parseInt(punti),
          periodo: currentPeriod,
          breakdown: JSON.stringify({
            tipo: 'assegnazione_manuale_admin',
            motivo: motivo,
            assignedBy: req.user!.id,
            assignedAt: new Date().toISOString()
          })
        }
      });

      await prisma.notification.create({
        data: {
          userId: userId,
          tipo: 'punti_assegnati',
          titolo: 'Punti assegnati dall\'Admin',
          messaggio: `Hai ricevuto ${punti} punti dall'amministratore. Motivo: ${motivo}`,
          link: '/progress'
        }
      });

      res.status(201).json({
        success: true,
        score,
        message: `${punti} punti assegnati con successo a ${targetUser.nome} ${targetUser.cognome}`
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // 🆕 ADMIN ONLY: Statistiche dettagliate dipendente
  async getEmployeeStats(req: AuthRequest, res: Response) {
    try {
      const { userId } = req.params;

      const user = await prisma.user.findUnique({
        where: { id: req.user!.id },
        select: { companyId: true }
      });

      const targetUser = await prisma.user.findFirst({
        where: { id: userId, companyId: user?.companyId },
        include: { role: true, team: true }
      });

      if (!targetUser) {
        return res.status(404).json({ error: 'Utente non trovato' });
      }

      const [ownedTasks, assignedTasks, completedOwnedTasks, completedAssignedTasks] = await Promise.all([
        prisma.task.count({ where: { ownerId: userId } }),
        prisma.task.count({ where: { assignees: { some: { id: userId } } } }),
        prisma.task.count({ where: { ownerId: userId, stato: { in: ['completed', 'completato'] } } }),
        prisma.task.count({ where: { assignees: { some: { id: userId } }, stato: { in: ['completed', 'completato'] } } })
      ]);

      const currentPeriod = this.getCurrentPeriod();

      const [totalPoints, monthlyPoints] = await Promise.all([
        prisma.score.aggregate({ where: { userId }, _sum: { puntiTotali: true } }),
        prisma.score.aggregate({ where: { userId, periodo: currentPeriod }, _sum: { puntiTotali: true } })
      ]);

      res.json({
        user: {
          id: targetUser.id,
          nome: targetUser.nome,
          cognome: targetUser.cognome,
          email: targetUser.email,
          avatar: targetUser.avatar,
          role: targetUser.role,
          team: targetUser.team
        },
        stats: {
          totalOwnedTasks: ownedTasks,
          totalAssignedTasks: assignedTasks,
          completedOwnedTasks,
          completedAssignedTasks,
          totalTasksCompleted: completedOwnedTasks + completedAssignedTasks,
          completionRate: Math.round(((completedOwnedTasks + completedAssignedTasks) / (ownedTasks + assignedTasks)) * 100) || 0,
          totalPoints: totalPoints._sum.puntiTotali || 0,
          monthlyPoints: monthlyPoints._sum.puntiTotali || 0
        }
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // 🆕 ADMIN ONLY: Azzera tutti gli score dei dipendenti
  async resetAllScores(req: AuthRequest, res: Response) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user!.id },
        select: { companyId: true }
      });

      // Trova tutti gli utenti della company
      const companyUsers = await prisma.user.findMany({
        where: { companyId: user?.companyId },
        select: { id: true, nome: true, cognome: true }
      });

      const userIds = companyUsers.map(u => u.id);

      // Elimina tutti gli score degli utenti della company
      const result = await prisma.score.deleteMany({
        where: { userId: { in: userIds } }
      });

      // Crea notifica per ogni utente
      await Promise.all(
        userIds.map(userId =>
          prisma.notification.create({
            data: {
              userId,
              tipo: 'sistema',
              titolo: 'Score Azzerato',
              messaggio: 'I punteggi di tutti i dipendenti sono stati azzerati dall\'amministratore.',
              link: '/rewards'
            }
          })
        )
      );

      res.json({
        success: true,
        message: `Azzerati ${result.count} punteggi per ${companyUsers.length} dipendenti`,
        deletedCount: result.count
      });
    } catch (error: any) {
      console.error('Errore resetAllScores:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // 🆕 ADMIN ONLY: Dati reali grafici progressi
  async getRealProgressData(req: AuthRequest, res: Response) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user!.id },
        select: { companyId: true }
      });

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      sevenDaysAgo.setHours(0, 0, 0, 0);

      // Recupera tutte le task completate negli ultimi 7 giorni
      const completedTasks = await prisma.task.findMany({
        where: {
          owner: { companyId: user?.companyId },
          stato: { in: ['completed', 'completato', 'completata'] },
          updatedAt: { gte: sevenDaysAgo }
        },
        select: {
          id: true,
          updatedAt: true
        }
      });

      // Raggruppa per giorno
      const dayGroups: Record<string, number> = {};
      for (let i = 0; i < 7; i++) {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i));
        date.setHours(0, 0, 0, 0);
        const dateStr = date.toISOString().split('T')[0];
        dayGroups[dateStr] = 0;
      }

      completedTasks.forEach(task => {
        const dateStr = task.updatedAt.toISOString().split('T')[0];
        if (dayGroups[dateStr] !== undefined) {
          dayGroups[dateStr]++;
        }
      });

      const tasksLast7Days = Object.entries(dayGroups).map(([date, count]) => ({ date, count }));

      // Performance team - recupera tutti i team con le loro task
      const teams = await prisma.team.findMany({
        include: {
          tasks: true
        }
      });

      const teamPerformance = teams.map(team => {
        const totalTasks = team.tasks.length;
        const completedTasks = team.tasks.filter(t => ['completed', 'completato', 'completata'].includes(t.stato)).length;
        const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

        return {
          id: team.id,
          nome: team.nome,
          colore: team.colore || '#6366f1',
          totalTasks,
          completedTasks,
          completionRate
        };
      });

      res.json({
        tasksLast7Days,
        teamPerformance
      });
    } catch (error: any) {
      console.error('Errore getRealProgressData:', error);
      res.status(500).json({ error: error.message });
    }
  }
}

export default new AnalyticsController();
