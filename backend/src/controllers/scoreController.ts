import { Response } from "express";
import prisma from "../config/database";
import { AuthRequest } from "../middleware/auth";
import { Task } from "@prisma/client";
import scoreService from "../services/score.service";

type Period = 'week' | 'month' | 'quarter';

class ScoreController {
  constructor() {
    this.getLeaderboard = this.getLeaderboard.bind(this);
    this.getUserScore = this.getUserScore.bind(this);
  }

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

      // Ottieni score dal database (usano il sistema ottimizzato)
      const scores = await prisma.score.groupBy({
        by: ["userId"],
        where: {
          createdAt: { gte: startDate }
        },
        _sum: {
          puntiTotali: true
        },
        _count: {
          taskId: true
        }
      });

      // Ottieni info utenti
      const users = await prisma.user.findMany({
        where: {
          id: { in: scores.map(s => s.userId) }
        },
        include: {
          team: { select: { nome: true } },
          tasksAssigned: {
            where: {
              stato: { in: ['completato', 'completata'] },
              updatedAt: { gte: startDate }
            }
          }
        }
      });

      // Leaderboard personale
      const personal = scores
        .map((scoreData) => {
          const user = users.find(u => u.id === scoreData.userId);
          if (!user) return null;

          const completedTasks = user.tasksAssigned.filter((t: Task) =>
            ['completato', 'completata'].includes(t.stato)
          );
          const punctuality = this.calculatePunctuality(completedTasks);

          return {
            userId: user.id,
            nome: user.nome,
            cognome: user.cognome,
            teamName: user.team?.nome ?? 'Nessun team',
            totalPoints: scoreData._sum.puntiTotali || 0,
            completedTasks: scoreData._count.taskId,
            punctuality
          };
        })
        .filter(x => x !== null)
        .sort((a, b) => b.totalPoints - a.totalPoints);

      // Team leaderboard
      const teams = await prisma.team.findMany({
        include: {
          users: {
            select: { id: true }
          }
        }
      });

      const teamLeaderboard = await Promise.all(
        teams.map(async (team) => {
          const teamUserIds = team.users.map(u => u.id);

          const teamScores = await prisma.score.aggregate({
            where: {
              userId: { in: teamUserIds },
              createdAt: { gte: startDate }
            },
            _sum: {
              puntiTotali: true
            },
            _count: {
              taskId: true
            }
          });

          const teamTasks = await prisma.task.findMany({
            where: {
              ownerId: { in: teamUserIds },
              stato: { in: ['completato', 'completata'] },
              updatedAt: { gte: startDate }
            }
          });

          return {
            teamId: team.id,
            teamName: team.nome,
            totalPoints: teamScores._sum.puntiTotali || 0,
            completedTasks: teamScores._count.taskId || 0,
            memberCount: team.users.length,
            punctuality: this.calculatePunctuality(teamTasks)
          };
        })
      );

      const sortedTeamLeaderboard = teamLeaderboard
        .sort((a, b) => b.totalPoints - a.totalPoints);

      res.json({ personal, team: sortedTeamLeaderboard });
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
          team: { select: { nome: true } }
        }
      });

      if (!user) {
        return res.status(404).json({ error: "Utente non trovato" });
      }

      // Ottieni score dal database
      const userScores = await prisma.score.aggregate({
        where: {
          userId: userId,
          createdAt: { gte: startDate }
        },
        _sum: {
          puntiTotali: true
        },
        _count: {
          taskId: true
        }
      });

      const totalPoints = userScores._sum.puntiTotali || 0;
      const completedTasksCount = userScores._count.taskId || 0;

      // Calcola puntualità dalle task completate
      const completedTasks = await prisma.task.findMany({
        where: {
          ownerId: userId,
          stato: { in: ['completato', 'completata'] },
          updatedAt: { gte: startDate }
        }
      });

      const punctuality = this.calculatePunctuality(completedTasks);

      // Posizione in classifica
      const allScores = await prisma.score.groupBy({
        by: ["userId"],
        where: {
          createdAt: { gte: startDate }
        },
        _sum: {
          puntiTotali: true
        }
      });

      const rankedUsers = allScores
        .map((s) => ({
          id: s.userId,
          points: s._sum.puntiTotali || 0
        }))
        .sort((a, b) => b.points - a.points);

      const rank = rankedUsers.findIndex((u) => u.id === userId) + 1;

      res.json({
        totalPoints,
        completedTasks: completedTasksCount,
        punctuality,
        rank,
        recentAchievements: this.getAchievements(completedTasksCount, punctuality),
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
