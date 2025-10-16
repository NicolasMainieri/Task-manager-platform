import { Response } from "express";
import prisma from "../config/database";
import { AuthRequest } from "../middleware/auth";

class TicketCategoryController {
  // Ottieni tutte le categorie dell'azienda
  async getCategories(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { companyId: true }
      });

      if (!user?.companyId) {
        return res.status(400).json({ error: "Utente non associato a un'azienda" });
      }

      const categories = await prisma.ticketCategory.findMany({
        where: { companyId: user.companyId },
        include: {
          targetRole: {
            select: { id: true, nome: true, colore: true, icona: true }
          },
          _count: {
            select: { tickets: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      res.json(categories);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // Crea una nuova categoria (solo admin)
  async createCategory(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const { nome, descrizione, icona, colore, targetRoleId } = req.body;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { adminCompany: true }
      });

      if (!user?.adminCompany) {
        return res.status(403).json({ error: "Solo gli admin possono creare categorie" });
      }

      // Verifica che il ruolo target esista
      const targetRole = await prisma.role.findUnique({
        where: { id: targetRoleId }
      });

      if (!targetRole) {
        return res.status(404).json({ error: "Ruolo target non trovato" });
      }

      const category = await prisma.ticketCategory.create({
        data: {
          nome,
          descrizione,
          icona,
          colore: colore || "#6366f1",
          targetRoleId,
          companyId: user.companyId!
        },
        include: {
          targetRole: {
            select: { id: true, nome: true, colore: true, icona: true }
          }
        }
      });

      res.status(201).json(category);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // Aggiorna una categoria (solo admin)
  async updateCategory(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      const { nome, descrizione, icona, colore, targetRoleId } = req.body;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { adminCompany: true }
      });

      if (!user?.adminCompany) {
        return res.status(403).json({ error: "Solo gli admin possono modificare categorie" });
      }

      const existingCategory = await prisma.ticketCategory.findUnique({
        where: { id }
      });

      if (!existingCategory) {
        return res.status(404).json({ error: "Categoria non trovata" });
      }

      if (existingCategory.companyId !== user.companyId) {
        return res.status(403).json({ error: "Non hai accesso a questa categoria" });
      }

      const updateData: any = {};
      if (nome !== undefined) updateData.nome = nome;
      if (descrizione !== undefined) updateData.descrizione = descrizione;
      if (icona !== undefined) updateData.icona = icona;
      if (colore !== undefined) updateData.colore = colore;
      if (targetRoleId !== undefined) updateData.targetRoleId = targetRoleId;

      const category = await prisma.ticketCategory.update({
        where: { id },
        data: updateData,
        include: {
          targetRole: {
            select: { id: true, nome: true, colore: true, icona: true }
          }
        }
      });

      res.json(category);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // Elimina una categoria (solo admin)
  async deleteCategory(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { adminCompany: true }
      });

      if (!user?.adminCompany) {
        return res.status(403).json({ error: "Solo gli admin possono eliminare categorie" });
      }

      const existingCategory = await prisma.ticketCategory.findUnique({
        where: { id },
        include: {
          _count: { select: { tickets: true } }
        }
      });

      if (!existingCategory) {
        return res.status(404).json({ error: "Categoria non trovata" });
      }

      if (existingCategory.companyId !== user.companyId) {
        return res.status(403).json({ error: "Non hai accesso a questa categoria" });
      }

      // Avviso se ci sono ticket associati
      if (existingCategory._count.tickets > 0) {
        return res.status(400).json({
          error: `Ci sono ${existingCategory._count.tickets} ticket associati a questa categoria. Riassegnali prima di eliminarla.`
        });
      }

      await prisma.ticketCategory.delete({ where: { id } });

      res.json({ message: "Categoria eliminata con successo" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}

export default new TicketCategoryController();
