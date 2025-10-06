import { Response } from "express";
import prisma from "../config/database";
import { AuthRequest } from "../middleware/auth";
import { Task } from "@prisma/client";

type Period = 'week' | 'month' | 'quarter';

class ScoreController {
  async getLeaderboard(req: AuthRequest, res: Response) {
    try {
      const periodParam = (req.query.period as string | undefined) ?? 'month';
      const period: Period = (['week', 'month', 'quarter'] as const).includes(periodParam as Period)
        ? (periodParam as Period)
        : 'month';

      const now = new Date();
      const startDate = new Date(now);

      if (period === 'week') {
        startDate.setDate(now.getDate() - 7);
      } else if (period === 'month') {
        startDate.setMonth(now.getMonth() - 1);
      } else if (period === 'quarter') {
        startDate.setMonth(now.getMonth() - 3);
      }

      // Utenti con team e tasksAssigned filtrate a completate nel periodo
      const users = await prisma.user.findMany({
        include: {
          team: { select: { nome: true } },
          tasksAssigned: {
            where: {
              stato: 'completato',
              updatedAt: { gte: startDate }
            }
          }
        }
      });

      // Leaderboard personale
      const personal = users
        .map((user) => {
          const completedTasks: Task[] = user.tasksAssigned.filter((t: Task) => t.stato === 'completato');
          const totalPoints = completedTasks.length * 10; // 10 punti per task
          const punctuality = this.calculatePunctuality(completedTasks);

          return {
            userId: user.id,
            nome: user.nome,
            cognome: user.cognome,
            teamName: user.team?.nome ?? 'Nessun team',
            totalPoints,
            completedTasks: completedTasks.length,
            punctuality
          };
        })
        .sort((a, b) => b.totalPoints - a.totalPoints);

      // Team con utenti e relative tasksAssigned filtrate
      const teams = await prisma.team.findMany({
        include: {
          users: {
            include: {
              tasksAssigned: {
                where: {
                  stato: 'completato',
                  updatedAt: { gte: startDate }
                }
              }
            }
          }
        }
      });

      const teamLeaderboard = teams
        .map((team) => {
          const allCompletedTasks: Task[] = team.users.flatMap((u) =>
            u.tasksAssigned.filter((t: Task) => t.stato === 'completato')
          );

          const totalPoints = allCompletedTasks.length * 10;
          const completedTasks = allCompletedTasks.length;
          const punctuality = this.calculatePunctuality(allCompletedTasks);

          return {
            teamId: team.id,
            teamName: team.nome,
            totalPoints,
            completedTasks,
            memberCount: team.users.length,
            punctuality
          };
        })
        .sort((a, b) => b.totalPoints - a.totalPoints);

      res.json({ personal, team: teamLeaderboard });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getUserScore(req: AuthRequest, res: Response) {
    try {
      const { userId } = req.params;
      const periodParam = (req.query.period as string | undefined) ?? 'month';
      const period: Period = (['week', 'month', 'quarter'] as const).includes(periodParam as Period)
        ? (periodParam as Period)
        : 'month';

      const now = new Date();
      const startDate = new Date(now);

      if (period === 'week') {
        startDate.setDate(now.getDate() - 7);
      } else if (period === 'month') {
        startDate.setMonth(now.getMonth() - 1);
      } else if (period === 'quarter') {
        startDate.setMonth(now.getMonth() - 3);
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          tasksAssigned: {
            where: {
              stato: 'completato',
              updatedAt: { gte: startDate }
            }
          },
          team: { select: { nome: true } }
        }
      });

      if (!user) {
        return res.status(404).json({ error: "Utente non trovato" });
      }

      const completedTasks: Task[] = user.tasksAssigned.filter((t: Task) => t.stato === 'completato');
      const totalPoints = completedTasks.length * 10;
      const punctuality = this.calculatePunctuality(completedTasks);

      // Posizione in classifica (ricalcolo punteggi di tutti gli utenti)
      const allUsers = await prisma.user.findMany({
        include: {
          tasksAssigned: {
            where: {
              stato: 'completato',
              updatedAt: { gte: startDate }
            }
          }
        }
      });

      const rankedUsers = allUsers
        .map((u) => ({
          id: u.id,
          points: u.tasksAssigned.filter((t: Task) => t.stato === 'completato').length * 10
        }))
        .sort((a, b) => b.points - a.points);

      const rank = rankedUsers.findIndex((u) => u.id === userId) + 1;

      res.json({
        totalPoints,
        completedTasks: completedTasks.length,
        punctuality,
        rank,
        recentAchievements: this.getAchievements(completedTasks.length, punctuality),
        teamName: user.team?.nome ?? 'Nessun team'
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // Accetta direttamente Task[]
  private calculatePunctuality(tasks: Task[]): number {
    if (!tasks || tasks.length === 0) return 0;

    const onTime = tasks.filter((task: Task) => {
      if (!task.scadenza) return true; // se non ha scadenza lo consideriamo puntuale
      return new Date(task.updatedAt) <= new Date(task.scadenza);
    }).length;

    return Math.round((onTime / tasks.length) * 100);
    }

  private getAchievements(completedTasks: number, punctuality: number): string[] {
    const achievements: string[] = [];

    if (completedTasks >= 50) {
      achievements.push("50+ task completati");
    } else if (completedTasks >= 10) {
      achievements.push("10+ task completati");
    }
    if (punctuality === 100) {
      achievements.push("100% puntuale");
    } else if (punctuality >= 90) {
      achievements.push("90%+ puntualità");
    }

    return achievements;
  }
}

export default new ScoreController();
