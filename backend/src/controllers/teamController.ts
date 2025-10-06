import { Response } from "express";
import prisma from "../config/database";
import { AuthRequest } from "../middleware/auth";

class TeamController {
  async getAllTeams(req: AuthRequest, res: Response) {
    try {
      const teams = await prisma.team.findMany({
        include: {
          _count: {
            select: { users: true, tasks: true }
          }
        },
        orderBy: { nome: 'asc' }
      });

      res.json(teams);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async createTeam(req: AuthRequest, res: Response) {
    try {
      const { nome, descrizione, colore } = req.body;

      const team = await prisma.team.create({
        data: {
          nome,
          descrizione,
          colore: colore || '#6366f1'
        }
      });

      res.status(201).json(team);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async updateTeam(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { nome, descrizione, colore } = req.body;

      const team = await prisma.team.update({
        where: { id },
        data: { nome, descrizione, colore }
      });

      res.json(team);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async deleteTeam(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      await prisma.team.delete({ where: { id } });

      res.json({ message: "Team eliminato con successo" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}

export default new TeamController();