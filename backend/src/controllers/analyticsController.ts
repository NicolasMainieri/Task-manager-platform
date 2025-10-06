import { Response } from "express";
import prisma from "../config/database";
import { AuthRequest } from "../middleware/auth";

class AnalyticsController {
  async getAnalytics(req: AuthRequest, res: Response) {
    try {
      const isAdmin = req.user!.ruolo === 'admin';
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

  async exportReport(req: AuthRequest, res: Response) {
    try {
      const { formato = "json" } = req.query;
      const isAdmin = req.user!.ruolo === 'admin';
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
}

export default new AnalyticsController();