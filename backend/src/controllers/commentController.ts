import { Response } from "express";
import prisma from "../config/database";
import { AuthRequest } from "../middleware/auth";

class CommentController {
  async getTaskComments(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const comments = await prisma.comment.findMany({
        where: { taskId: id },
        include: {
          autore: {
            select: { id: true, nome: true, cognome: true, email: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      res.json(comments);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}

export default new CommentController();