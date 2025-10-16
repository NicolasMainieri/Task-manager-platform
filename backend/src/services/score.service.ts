import prisma from "../config/database";

interface ScoreBreakdown {
  baseScore: number;
  difficultyMultiplier: number;
  priorityMultiplier: number;
  punctualityBonus: number;
  latenessPenalty: number;
  qualityMultiplier: number;
  subtaskCompletionBonus: number;
  workTimeBonus: number;
  efficiencyBonus: number;
  consistencyBonus: number;
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

  private calculatePunctuality(completedAt: Date, deadline?: Date): { bonus: number; penalty: number } {
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

  /**
   * Calcola bonus per completamento subtask
   * 100% subtask completate = +20% punti
   */
  private calculateSubtaskBonus(subtasks: any[]): number {
    if (!subtasks || subtasks.length === 0) return 0;
    const completedCount = subtasks.filter(st => st.completata).length;
    const completionRate = completedCount / subtasks.length;

    // Bonus progressivo: 100% = 0.2, 80% = 0.1, 50% = 0.05
    if (completionRate === 1) return 0.2;
    if (completionRate >= 0.8) return 0.1;
    if (completionRate >= 0.5) return 0.05;
    return 0;
  }

  /**
   * Calcola bonus per tempo lavorato
   * Basato sulle work sessions registrate
   */
  private async calculateWorkTimeBonus(taskId: string): Promise<number> {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        subtasks: {
          include: {
            workSessions: {
              where: { stato: 'completed' }
            }
          }
        }
      }
    });

    if (!task) return 0;

    // Calcola tempo totale lavorato in ore
    let totalSeconds = 0;
    for (const subtask of task.subtasks) {
      for (const session of subtask.workSessions) {
        totalSeconds += session.tempoAccumulato;
      }
    }

    const totalHours = totalSeconds / 3600;

    // Bonus basato su ore lavorate (massimo +15% per 8+ ore)
    if (totalHours >= 8) return 0.15;
    if (totalHours >= 4) return 0.10;
    if (totalHours >= 2) return 0.05;
    return 0;
  }

  /**
   * Calcola bonus efficienza
   * Premia chi completa task velocemente ma con qualità
   */
  private calculateEfficiencyBonus(
    dataInizio?: Date,
    dataFine?: Date,
    difficulty?: number,
    quality?: number
  ): number {
    if (!dataInizio || !dataFine || !quality || quality < 4) return 0;

    const daysTaken = (dataFine.getTime() - dataInizio.getTime()) / (1000 * 60 * 60 * 24);
    const expectedDays = (difficulty || 3) * 2; // 2 giorni per livello difficoltà

    // Se completa velocemente E con alta qualità
    if (daysTaken < expectedDays * 0.5 && quality >= 4) return 0.15;
    if (daysTaken < expectedDays * 0.75 && quality >= 4) return 0.1;

    return 0;
  }

  /**
   * Calcola bonus consistenza
   * Premia chi lavora in modo costante senza troppe pause
   */
  private async calculateConsistencyBonus(taskId: string): Promise<number> {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        subtasks: {
          include: {
            workSessions: { where: { stato: 'completed' } }
          }
        }
      }
    });

    if (!task) return 0;

    let totalSessions = 0;
    let totalPauses = 0;
    let totalWorkTime = 0;

    for (const subtask of task.subtasks) {
      for (const session of subtask.workSessions) {
        totalSessions++;
        totalPauses += session.pauseCount;
        totalWorkTime += session.tempoAccumulato;
      }
    }

    if (totalSessions === 0) return 0;

    const avgPausesPerSession = totalPauses / totalSessions;
    const avgSessionLength = totalWorkTime / totalSessions / 3600; // ore

    // Bonus per poche pause e sessioni lunghe (lavoro focalizzato)
    if (avgPausesPerSession <= 1 && avgSessionLength >= 1) return 0.1;
    if (avgPausesPerSession <= 2 && avgSessionLength >= 0.5) return 0.05;

    return 0;
  }

  async calculateTaskScore(taskId: string, completedAt: Date = new Date()): Promise<number> {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        owner: true,
        assignees: true,
        worklogs: true,
        subtasks: {
          include: {
            workSessions: {
              where: { stato: 'completed' }
            }
          }
        }
      },
    });
    if (!task) throw new Error("Task non trovata");

    // Moltiplicatori base
    const diffMultiplier = this.getDifficultyMultiplier(task.difficolta);
    const prioMultiplier = this.getPriorityMultiplier(task.priorita);
    const { bonus, penalty } = this.calculatePunctuality(completedAt, task.scadenza || undefined);
    const qualMultiplier = this.getQualityMultiplier((task as any).qualitaFinale || undefined);

    // Nuovi bonus
    const subtaskBonus = this.calculateSubtaskBonus(task.subtasks);
    const workTimeBonus = await this.calculateWorkTimeBonus(taskId);
    const efficiencyBonus = this.calculateEfficiencyBonus(
      task.dataInizio || undefined,
      task.dataFine || completedAt,
      task.difficolta,
      (task as any).qualitaFinale || undefined
    );
    const consistencyBonus = await this.calculateConsistencyBonus(taskId);

    // Calcolo finale con tutti i bonus
    const finalScore =
      this.BASE_SCORE *
      diffMultiplier *
      prioMultiplier *
      qualMultiplier *
      (1 + bonus - penalty + subtaskBonus + workTimeBonus + efficiencyBonus + consistencyBonus);

    const breakdown: ScoreBreakdown = {
      baseScore: this.BASE_SCORE,
      difficultyMultiplier: diffMultiplier,
      priorityMultiplier: prioMultiplier,
      punctualityBonus: bonus,
      latenessPenalty: penalty,
      qualityMultiplier: qualMultiplier,
      subtaskCompletionBonus: subtaskBonus,
      workTimeBonus: workTimeBonus,
      efficiencyBonus: efficiencyBonus,
      consistencyBonus: consistencyBonus,
      finalScore: Math.max(0, finalScore),
    };

    await prisma.score.create({
      data: {
        userId: task.ownerId,
        taskId: task.id,
        puntiBase: Math.round(this.BASE_SCORE),
        moltiplicatore: Number((diffMultiplier * prioMultiplier * qualMultiplier).toFixed(2)),
        bonusPuntualita: bonus,
        malusPuntualita: penalty,
        punti: Math.round(breakdown.finalScore),
        puntiTotali: Math.round(breakdown.finalScore),
        breakdown: JSON.stringify(breakdown),
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
    distribution[task.ownerId] = teamScore * 0.4; // owner minimo 40%
    const remainingScore = teamScore * 0.6;

    for (const log of worklogs) {
      if (log.userId === task.ownerId) continue;
      const userShare = totalMinutes > 0 ? log.minuti / totalMinutes : 1 / Math.max(1, worklogs.length);
      distribution[log.userId] = (distribution[log.userId] || 0) + remainingScore * userShare;
    }

    // Note: schema does not define a TeamScore model; persist only user scores

    for (const [userId, points] of Object.entries(distribution)) {
      if (userId !== task.ownerId) {
        await prisma.score.create({
          data: {
            userId,
            taskId: task.id,
            puntiBase: 0,
            moltiplicatore: 1,
            bonusPuntualita: 0,
            malusPuntualita: 0,
            punti: Math.round(points),
            puntiTotali: Math.round(points),
            breakdown: JSON.stringify({ teamScore: true, share: points / teamScore }),
          },
        });
      }
    }
  }

  async getUserScore(userId: string, _periodo?: string): Promise<number> {
    const scores = await prisma.score.findMany({ where: { userId } });
    return scores.reduce((sum, s) => sum + s.puntiTotali, 0);
  }

  async getTeamScore(teamId: string): Promise<number> {
    const members = await prisma.user.findMany({ where: { teamId }, select: { id: true } });
    const scores = await prisma.score.findMany({ where: { userId: { in: members.map(m => m.id) } } });
    return scores.reduce((sum, s) => sum + s.puntiTotali, 0);
  }

  async getLeaderboard(type: "user" | "team", periodo?: string, limit = 10) {
    if (type === "user") {
      const scores = await prisma.score.groupBy({
        by: ["userId"],
        _sum: { puntiTotali: true },
        orderBy: { _sum: { puntiTotali: "desc" } },
        take: limit,
      });
      const users = await prisma.user.findMany({
        where: { id: { in: scores.map((s) => s.userId) } },
        select: { id: true, nome: true, cognome: true, teamId: true },
      });
      return scores.map((s) => ({ user: users.find((u) => u.id === s.userId), punti: s._sum.puntiTotali || 0 }));
    } else {
      const userSums = await prisma.score.groupBy({ by: ["userId"], _sum: { puntiTotali: true } });
      const users = await prisma.user.findMany({ select: { id: true, teamId: true } });
      const byTeam: Record<string, number> = {};
      for (const us of userSums) {
        const u = users.find(x => x.id === us.userId);
        if (!u?.teamId) continue;
        byTeam[u.teamId] = (byTeam[u.teamId] || 0) + (us._sum.puntiTotali || 0);
      }
      const entries = Object.entries(byTeam)
        .map(([teamId, punti]) => ({ teamId, punti }))
        .sort((a, b) => b.punti - a.punti)
        .slice(0, limit);
      const teams = await prisma.team.findMany({ where: { id: { in: entries.map(e => e.teamId) } }, select: { id: true, nome: true, colore: true } });
      return entries.map(e => ({ team: teams.find(t => t.id === e.teamId), punti: e.punti }));
    }
  }

  private getCurrentPeriod(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }

  async checkDailyLimit(userId: string): Promise<boolean> {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const scores = await prisma.score.findMany({ where: { userId, createdAt: { gte: today } } });
    const totalToday = scores.reduce((sum, s) => sum + s.puntiTotali, 0);
    return totalToday < this.MAX_DAILY_SCORE;
  }
}

export default new ScoreService();

