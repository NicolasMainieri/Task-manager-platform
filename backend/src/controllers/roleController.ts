import { Response } from "express";
import prisma from "../config/database";
import { AuthRequest } from "../middleware/auth";
import { stringifyJsonField } from "../utils/jsonHelper";

class RoleController {
  async getAllRoles(_req: AuthRequest, res: Response) {
    try { 
      const roles = await prisma.role.findMany({ orderBy: { nome: "asc" } }); 
      res.json(roles); 
    }
    catch (e: any) { res.status(500).json({ error: e.message }); }
  }

  async createRole(req: AuthRequest, res: Response) {
    try {
      const { nome, descrizione, permessi } = req.body;
      const role = await prisma.role.create({ 
        data: { 
          nome, 
          descrizione, 
          permessi: stringifyJsonField(permessi || {}), 
          isCustom: true 
        } 
      });
      
      await prisma.auditLog.create({ 
        data: { 
          entita: "Role", 
          entitaId: role.id, 
          azione: "create", 
          autoreId: req.user!.id, 
          payload: stringifyJsonField({ nome })
        } 
      });
      
      res.status(201).json(role);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  }

  async updateRole(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params; 
      const { nome, descrizione, permessi } = req.body;
      const role = await prisma.role.update({ 
        where: { id }, 
        data: { 
          nome, 
          descrizione, 
          permessi: stringifyJsonField(permessi)
        } 
      });
      
      await prisma.auditLog.create({ 
        data: { 
          entita: "Role", 
          entitaId: id, 
          azione: "update", 
          autoreId: req.user!.id, 
          payload: stringifyJsonField(req.body)
        } 
      });
      
      res.json(role);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  }

  async deleteRole(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const usersWithRole = await prisma.user.count({ where: { roleId: id } });
      if (usersWithRole > 0) {
        return res.status(400).json({ error: "Impossibile eliminare un ruolo assegnato a degli utenti" });
      }
      
      await prisma.role.delete({ where: { id } });
      await prisma.auditLog.create({ 
        data: { 
          entita: "Role", 
          entitaId: id, 
          azione: "delete", 
          autoreId: req.user!.id, 
          payload: stringifyJsonField({})
        } 
      });
      
      res.json({ message: "Ruolo eliminato con successo" });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  }
}

export default new RoleController();