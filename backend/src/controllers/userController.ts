import { Response } from "express";
import prisma from "../config/database";
import { AuthRequest } from "../middleware/auth";
import bcrypt from "bcryptjs";
import { stringifyJsonField } from "../utils/jsonHelper";

class UserController {
  async getAllUsers(req: AuthRequest, res: Response) {
    try {
      const { search, teamId, roleId } = req.query as any;
      const where: any = {};
      if (search) where.OR = [
        { nome: { contains: search, mode: "insensitive" } },
        { cognome: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
      if (teamId) where.teamId = teamId;
      if (roleId) where.roleId = roleId;

      const users = await prisma.user.findMany({
        where,
        select: { id: true, email: true, nome: true, cognome: true, role: true, team: true, createdAt: true },
        orderBy: { nome: "asc" },
      });
      res.json(users);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  }

  async getUserById(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const user = await prisma.user.findUnique({
        where: { id },
        select: { id: true, email: true, nome: true, cognome: true, role: true, team: true, createdAt: true },
      });
      if (!user) return res.status(404).json({ error: "Utente non trovato" });
      res.json(user);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  }

  async createUser(req: AuthRequest, res: Response) {
    try {
      const { email, password, nome, cognome, roleId, teamId } = req.body;
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) return res.status(400).json({ error: "Email già registrata" });

      const hashed = await bcrypt.hash(password || "TempPassword123!", 10);
      const user = await prisma.user.create({
        data: { email, password: hashed, nome, cognome, roleId, teamId },
        include: { role: true, team: true },
      });

      await prisma.auditLog.create({ 
        data: { 
          entita: "User", 
          entitaId: user.id, 
          azione: "create", 
          autoreId: req.user!.id, 
          payload: stringifyJsonField({ email, nome, cognome })
        } 
      });
      
      const { password: _, ...safe } = user;
      res.status(201).json(safe);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  }

  async updateUser(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { nome, cognome, roleId, teamId } = req.body;
      const user = await prisma.user.update({ 
        where: { id }, 
        data: { nome, cognome, roleId, teamId }, 
        include: { role: true, team: true } 
      });
      
      await prisma.auditLog.create({ 
        data: { 
          entita: "User", 
          entitaId: id, 
          azione: "update", 
          autoreId: req.user!.id, 
          payload: stringifyJsonField(req.body)
        } 
      });
      
      const { password: _, ...safe } = user;
      res.json(safe);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  }

  async deleteUser(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      if (id === req.user!.id) return res.status(400).json({ error: "Non puoi eliminare te stesso" });
      
      await prisma.user.delete({ where: { id } });
      await prisma.auditLog.create({ 
        data: { 
          entita: "User", 
          entitaId: id, 
          azione: "delete", 
          autoreId: req.user!.id, 
          payload: stringifyJsonField({})
        } 
      });
      
      res.json({ message: "Utente eliminato con successo" });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  }
}

export default new UserController();