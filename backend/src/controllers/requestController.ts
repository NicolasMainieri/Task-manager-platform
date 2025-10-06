import { Response } from "express";
import prisma from "../config/database";
import { AuthRequest } from "../middleware/auth";

// WORKAROUND: Forza TypeScript a riconoscere Request
const prismaClient = prisma as any;

class RequestController {
  async getAllRequests(req: AuthRequest, res: Response) {
    try {
      const requests = await prismaClient.request.findMany({
        include: {
          autore: {
            select: { id: true, nome: true, cognome: true, email: true }
          },
          task: {
            select: { id: true, titolo: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      res.json(requests);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async createRequest(req: AuthRequest, res: Response) {
    try {
      const { tipo, urgenza, descrizione, taskId } = req.body;

      const request = await prismaClient.request.create({
        data: {
          tipo,
          urgenza: urgenza || 'media',
          descrizione,
          autoreId: req.user!.id,
          taskId: taskId || undefined
        },
        include: {
          autore: {
            select: { id: true, nome: true, cognome: true }
          },
          task: {
            select: { id: true, titolo: true }
          }
        }
      });

      res.status(201).json(request);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async updateRequest(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { stato } = req.body;

      const request = await prismaClient.request.update({
        where: { id },
        data: { stato },
        include: {
          autore: {
            select: { id: true, nome: true, cognome: true }
          }
        }
      });

      res.json(request);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async deleteRequest(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const request = await prismaClient.request.findUnique({ where: { id } });
      if (!request) {
        return res.status(404).json({ error: "Richiesta non trovata" });
      }

      if (request.autoreId !== req.user!.id) {
        return res.status(403).json({ error: "Non autorizzato" });
      }

      await prismaClient.request.delete({ where: { id } });

      res.json({ message: "Richiesta eliminata con successo" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}

export default new RequestController();