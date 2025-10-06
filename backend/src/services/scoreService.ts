import prisma from "../config/database";

interface ScoreBreakdown {
  baseScore: number;
  difficultyMultiplier: number;
  priorityMultiplier: number;
  punctualityBonus: number;
  latenessPenalty: number;
  qualityMultiplier: number;
  finalScore: number;
}

class ScoreService {
  private readonly BASE_SCORE = parseFloat(process.env.SCORE_BASE || "100");
  private readonly TEAM_FACTOR = parseFloat(process.env.SCORE_TEAM_FACTOR || "1.2");
  private readonly MAX_DAILY_SCORE = parseFloat(process.env.SCORE_MAX_DAILY || "2000");

  private getDifficultyMultiplier(difficulty: number): number {
    const multipliers: Record<number, number> = { 1: 0.5, 2: 0.75, 3: 1.0, 4: 1.5, 5: 2.0 };
    return multipliers[difficulty] ?? 1.0;
  }
  private getPriorityMultiplier(priority: string): number {
    const multipliers: Record<string, number> = { low: 0.8, medium: 1.0, high: 1.3, critical: 1.6 };
    return multipliers[priority?.toLowerCase()] ?? 1.0;
  }
  private calculatePunctuality(completedAt: Date, deadline?: Date) {
    if (!deadline) return { bonus: 0, penalty: 0 };
    const diffDays = (completedAt.getTime() - deadline.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays < -7) return { bonus: 0.2, penalty: 0 };
    if (diffDays < 0)  return { bonus: 0.1, penalty: 0 };
    if (diffDays <= 1) return { bonus: 0, penalty: 0 };
    if (diffDays <= 3) return { bonus: 0, penalty: 0.1 };
    if (diffDays <= 7) return { bonus: 0, penalty: 0.2 };
    return { bonus: 0, penalty: 0.3 };
  }
  private getQualityMultiplier(quality?: number): number {
    if (!quality) return 1.0;
    const multipliers: Record<number, number> = { 1: 0.6, 2: 0.8, 3: 1.0, 4: 1.2, 5: 1.4 };
    return multipliers[quality] ?? 1.0;
  }

  async calculateTaskScore(taskId: string, completedAt: Date = new Date()): Promise<number> {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { owner: true, assignees: true, worklogs: true },
    });
    if (!task) throw new Error("Task non trovata");

    const diffMultiplier = this.getDifficultyMultiplier(task.difficolta);
    const prioMultiplier = this.getPriorityMultiplier(task.priorita);
    const { bonus, penalty } = this.calculatePunctuality(completedAt, task.scadenza || undefined);
    const qualMultiplier = this.getQualityMultiplier(task.qualitaFinale || undefined);

    const finalScore = this.BASE_SCORE * diffMultiplier * prioMultiplier * (1 + bonus - penalty) * qualMultiplier;

    const breakdown: ScoreBreakdown = {
      baseScore: this.BASE_SCORE,
      difficultyMultiplier: diffMultiplier,
      priorityMultiplier: prioMultiplier,
      punctualityBonus: bonus,
      latenessPenalty: penalty,
      qualityMultiplier: qualMultiplier,
      finalScore: Math.max(0, finalScore),
    };

    await prisma.score.create({
      data: {
        userId: task.ownerId,
        taskId: task.id,
        punti: breakdown.finalScore,
        breakdown: (breakdown as unknown) as any,
        periodo: this.getCurrentPeriod(),
      },
    });

    if (task.assignees.length > 1) {
      await this.calculateTeamScore(task as any, breakdown.finalScore);
    }
    return breakdown.finalScore;
  }

  private async calculateTeamScore(task: any, baseScore: number) {
    const teamScore = baseScore * this.TEAM_FACTOR;
    const worklogs = task.worklogs || [];
    const totalMinutes = worklogs.reduce((sum: number, log: any) => sum + (log.minuti || 0), 0);

    const distribution: Record<string, number> = {};
    distribution[task.ownerId] = teamScore * 0.4; // Owner 40% minimo
    const remainingScore = teamScore * 0.6;

    for (const log of worklogs) {
      if (log.userId === task.ownerId) continue;
      const userShare = totalMinutes > 0 ? log.minuti / totalMinutes : 1 / Math.max(1, worklogs.length);
      distribution[log.userId] = (distribution[log.userId] || 0) + remainingScore * userShare;
    }

    if (task.teamId) {
      await prisma.teamScore.create({
        data: {
          teamId: task.teamId,
          taskId: task.id,
          punti: teamScore,
          ripartizione: (distribution as unknown) as any,
          periodo: this.getCurrentPeriod(),
        },
      });
    }

    for (const [userId, points] of Object.entries(distribution)) {
      if (userId !== task.ownerId) {
        await prisma.score.create({
          data: {
            userId,
            taskId: task.id,
            punti: points,
            breakdown: ({ teamScore: true, share: points / teamScore } as unknown) as any,
            periodo: this.getCurrentPeriod(),
          },
        });
      }
    }
  }

  async getUserScore(userId: string, periodo?: string) {
    const where: any = { userId };
    if (periodo) where.periodo = periodo;
    const scores = await prisma.score.findMany({ where });
    return scores.reduce((sum, s) => sum + s.punti, 0);
  }

  async getTeamScore(teamId: string, periodo?: string) {
    const where: any = { teamId };
    if (periodo) where.periodo = periodo;
    const scores = await prisma.teamScore.findMany({ where });
    return scores.reduce((sum, s) => sum + s.punti, 0);
  }

  async getLeaderboard(type: "user" | "team", periodo?: string, limit = 10) {
    if (type === "user") {
      const scores = await prisma.score.groupBy({
        by: ["userId"],
        where: periodo ? { periodo } : undefined,
        _sum: { punti: true },
        orderBy: { _sum: { punti: "desc" } },
        take: limit,
      });
      const users = await prisma.user.findMany({
        where: { id: { in: scores.map((s) => s.userId) } },
        select: { id: true, nome: true, cognome: true, avatar: true, teamId: true },
      });
      return scores.map((s) => ({ user: users.find((u) => u.id === s.userId), punti: s._sum.punti || 0 }));
    } else {
      const scores = await prisma.teamScore.groupBy({
        by: ["teamId"],
        where: periodo ? { periodo } : undefined,
        _sum: { punti: true },
        orderBy: { _sum: { punti: "desc" } },
        take: limit,
      });
      const teams = await prisma.team.findMany({
        where: { id: { in: scores.map((s) => s.teamId) } },
        select: { id: true, nome: true, colore: true },
      });
      return scores.map((s) => ({ team: teams.find((t) => t.id === s.teamId), punti: s._sum.punti || 0 }));
    }
  }

  private getCurrentPeriod(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }

  async checkDailyLimit(userId: string) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const scores = await prisma.score.findMany({ where: { userId, createdAt: { gte: today } } });
    const totalToday = scores.reduce((sum, s) => sum + s.punti, 0);
    return totalToday < this.MAX_DAILY_SCORE;
  }
}

export default new ScoreService();
