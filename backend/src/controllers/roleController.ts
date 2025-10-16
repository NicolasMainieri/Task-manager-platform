import { Response } from "express";
import prisma from "../config/database";
import { AuthRequest } from "../middleware/auth";
import { stringifyJsonField } from "../utils/jsonHelper";

class RoleController {
  // Ottieni tutti i ruoli (filtrati per azienda se non admin di sistema)
  async getAllRoles(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { role: true, company: true }
      });

      if (!user) {
        return res.status(404).json({ error: "Utente non trovato" });
      }

      // Se l'utente è admin della sua azienda, mostra ruoli system + custom della sua azienda
      const where: any = {
        OR: [
          { isSystem: true },
          { companyId: user.companyId }
        ]
      };

      const roles = await prisma.role.findMany({
        where,
        include: {
          _count: {
            select: { users: true }
          }
        },
        orderBy: [
          { isSystem: 'desc' },
          { createdAt: 'desc' }
        ]
      });

      res.json(roles);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // Ottieni un singolo ruolo
  async getRole(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { companyId: true }
      });

      const role = await prisma.role.findUnique({
        where: { id },
        include: {
          _count: {
            select: { users: true }
          }
        }
      });

      if (!role) {
        return res.status(404).json({ error: "Ruolo non trovato" });
      }

      // Verifica che l'utente possa vedere questo ruolo
      if (!role.isSystem && role.companyId !== user?.companyId) {
        return res.status(403).json({ error: "Non hai accesso a questo ruolo" });
      }

      res.json(role);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // Crea un nuovo ruolo (solo admin)
  async createRole(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const { nome, descrizione, colore, icona, permessi } = req.body;

      // Verifica che l'utente sia admin
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          role: true,
          adminCompany: true
        }
      });

      if (!user?.adminCompany) {
        return res.status(403).json({ error: "Solo gli admin possono creare ruoli" });
      }

      // Verifica che non esista già un ruolo con lo stesso nome nell'azienda
      const existingRole = await prisma.role.findFirst({
        where: {
          nome,
          companyId: user.companyId
        }
      });

      if (existingRole) {
        return res.status(400).json({ error: "Esiste già un ruolo con questo nome" });
      }

      const role = await prisma.role.create({
        data: {
          nome,
          descrizione,
          colore: colore || "#6366f1",
          icona,
          permessi: stringifyJsonField(permessi || {}),
          isCustom: true,
          isSystem: false,
          companyId: user.companyId
        }
      });

      await prisma.auditLog.create({
        data: {
          entita: "Role",
          entitaId: role.id,
          azione: "create",
          autoreId: userId,
          payload: stringifyJsonField({ nome, descrizione })
        }
      });

      res.status(201).json(role);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // Aggiorna un ruolo (solo admin, solo ruoli custom)
  async updateRole(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      const { nome, descrizione, colore, icona, permessi } = req.body;

      // Verifica che l'utente sia admin
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          role: true,
          adminCompany: true
        }
      });

      if (!user?.adminCompany) {
        return res.status(403).json({ error: "Solo gli admin possono modificare ruoli" });
      }

      const existingRole = await prisma.role.findUnique({
        where: { id }
      });

      if (!existingRole) {
        return res.status(404).json({ error: "Ruolo non trovato" });
      }

      // Non si possono modificare ruoli di sistema
      if (existingRole.isSystem) {
        return res.status(403).json({ error: "Non puoi modificare ruoli di sistema" });
      }

      // Verifica che il ruolo appartenga all'azienda dell'admin
      if (existingRole.companyId !== user.companyId) {
        return res.status(403).json({ error: "Non hai accesso a questo ruolo" });
      }

      const updateData: any = {};
      if (nome !== undefined) updateData.nome = nome;
      if (descrizione !== undefined) updateData.descrizione = descrizione;
      if (colore !== undefined) updateData.colore = colore;
      if (icona !== undefined) updateData.icona = icona;
      if (permessi !== undefined) updateData.permessi = stringifyJsonField(permessi);

      const role = await prisma.role.update({
        where: { id },
        data: updateData
      });

      await prisma.auditLog.create({
        data: {
          entita: "Role",
          entitaId: id,
          azione: "update",
          autoreId: userId,
          payload: stringifyJsonField(req.body)
        }
      });

      res.json(role);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // Elimina un ruolo (solo admin, solo se non ci sono utenti assegnati)
  async deleteRole(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      // Verifica che l'utente sia admin
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          role: true,
          adminCompany: true
        }
      });

      if (!user?.adminCompany) {
        return res.status(403).json({ error: "Solo gli admin possono eliminare ruoli" });
      }

      const existingRole = await prisma.role.findUnique({
        where: { id },
        include: {
          _count: {
            select: { users: true }
          }
        }
      });

      if (!existingRole) {
        return res.status(404).json({ error: "Ruolo non trovato" });
      }

      // Non si possono eliminare ruoli di sistema
      if (existingRole.isSystem) {
        return res.status(403).json({ error: "Non puoi eliminare ruoli di sistema" });
      }

      // Verifica che il ruolo appartenga all'azienda dell'admin
      if (existingRole.companyId !== user.companyId) {
        return res.status(403).json({ error: "Non hai accesso a questo ruolo" });
      }

      // Non si può eliminare se ci sono utenti assegnati
      if (existingRole._count.users > 0) {
        return res.status(400).json({
          error: `Non puoi eliminare questo ruolo perché ci sono ${existingRole._count.users} utenti assegnati`
        });
      }

      await prisma.role.delete({
        where: { id }
      });

      await prisma.auditLog.create({
        data: {
          entita: "Role",
          entitaId: id,
          azione: "delete",
          autoreId: userId,
          payload: stringifyJsonField({})
        }
      });

      res.json({ message: "Ruolo eliminato con successo" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // Ottieni statistiche ruoli per l'azienda
  async getRoleStats(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { adminCompany: true }
      });

      if (!user?.adminCompany) {
        return res.status(403).json({ error: "Solo gli admin possono vedere le statistiche" });
      }

      const roles = await prisma.role.findMany({
        where: {
          OR: [
            { isSystem: true },
            { companyId: user.companyId }
          ]
        },
        include: {
          _count: {
            select: { users: true }
          }
        }
      });

      const stats = roles.map(role => ({
        id: role.id,
        nome: role.nome,
        colore: role.colore,
        icona: role.icona,
        isSystem: role.isSystem,
        userCount: role._count.users
      }));

      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}

export default new RoleController();
