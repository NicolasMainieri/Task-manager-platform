import { Router } from "express";
import { authenticate } from "../middleware/auth";
import prisma from "../config/database";
import { AuthRequest } from "../middleware/auth";
import { Response } from "express";

const router = Router();

// Debug: Verifica score utente
router.get("/score/:userId", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;

    const scores = await prisma.score.findMany({
      where: { userId },
      include: {
        task: {
          select: { titolo: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const totalScore = scores.reduce((sum, s) => sum + s.puntiTotali, 0);

    res.json({
      userId,
      totalScore,
      scoresCount: scores.length,
      scores: scores.map(s => ({
        id: s.id,
        puntiTotali: s.puntiTotali,
        tipo: s.tipo,
        taskTitolo: s.task?.titolo || 'N/A',
        createdAt: s.createdAt,
        breakdown: s.breakdown
      }))
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Debug: Verifica tutte le tabelle
router.get("/db-status", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const [users, tasks, scores, dailyPenalties, dailyBonuses] = await Promise.all([
      prisma.user.count(),
      prisma.task.count(),
      prisma.score.count(),
      prisma.dailyPenalty.count(),
      prisma.dailyBonus.count()
    ]);

    res.json({
      tables: {
        users,
        tasks,
        scores,
        dailyPenalties,
        dailyBonuses
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
