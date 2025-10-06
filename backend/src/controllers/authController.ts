import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../config/database";
import { AuthRequest } from "../middleware/auth";
import { parseJsonField, stringifyJsonField } from "../utils/jsonHelper";

class AuthController {
  async register(req: Request, res: Response) {
    try {
      const { email, password, nome, cognome, roleId, teamId } = req.body;
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) return res.status(400).json({ error: "Email già registrata" });

      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await prisma.user.create({
        data: { email, password: hashedPassword, nome, cognome, roleId, teamId },
        include: { role: true, team: true },
      });

      await prisma.auditLog.create({
        data: { 
          entita: "User", 
          entitaId: user.id, 
          azione: "create", 
          autoreId: user.id, 
          payload: stringifyJsonField({ email: user.email, nome: user.nome })
        },
      });

      const secret = process.env.JWT_SECRET;
      if (!secret) throw new Error("JWT_SECRET non configurato");
      const expiresIn = process.env.JWT_EXPIRES_IN || "7d";
const token = jwt.sign({ userId: user.id }, secret);
      const { password: _, ...userWithoutPassword } = user;
      
      // Parse permessi
      const userWithParsedPermessi = {
        ...userWithoutPassword,
        role: {
          ...userWithoutPassword.role,
          permessi: parseJsonField(userWithoutPassword.role.permessi)
        }
      };
      
      res.status(201).json({ user: userWithParsedPermessi, token });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;
      const user = await prisma.user.findUnique({ where: { email }, include: { role: true, team: true } });
      if (!user) return res.status(401).json({ error: "Credenziali non valide" });

      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) return res.status(401).json({ error: "Credenziali non valide" });

      const secret = process.env.JWT_SECRET;
      if (!secret) throw new Error("JWT_SECRET non configurato");
const token = jwt.sign({ userId: user.id }, secret);
      const { password: _, ...userWithoutPassword } = user;
      
      // Parse permessi
      const userWithParsedPermessi = {
        ...userWithoutPassword,
        role: {
          ...userWithoutPassword.role,
          permessi: parseJsonField(userWithoutPassword.role.permessi)
        }
      };
      
      res.json({ user: userWithParsedPermessi, token });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getProfile(req: AuthRequest, res: Response) {
    try {
      const user = await prisma.user.findUnique({ 
        where: { id: req.user!.id }, 
        include: { role: true, team: true } 
      });
      if (!user) return res.status(404).json({ error: "Utente non trovato" });
      
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async updateProfile(req: AuthRequest, res: Response) {
    try {
      const { nome, cognome } = req.body;
      const user = await prisma.user.update({
        where: { id: req.user!.id },
        data: { nome, cognome },
        include: { role: true, team: true },
      });

      await prisma.auditLog.create({
        data: { 
          entita: "User", 
          entitaId: user.id, 
          azione: "update", 
          autoreId: req.user!.id, 
          payload: stringifyJsonField(req.body)
        },
      });

      const { password: _, ...userWithoutPassword } = user;
      const userWithParsedPermessi = {
        ...userWithoutPassword,
        role: {
          ...userWithoutPassword.role,
          permessi: parseJsonField(userWithoutPassword.role.permessi)
        }
      };
      
      res.json(userWithParsedPermessi);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async changePassword(req: AuthRequest, res: Response) {
    try {
      const { currentPassword, newPassword } = req.body;
      const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
      if (!user) return res.status(404).json({ error: "Utente non trovato" });

      const isValid = await bcrypt.compare(currentPassword, user.password);
      if (!isValid) return res.status(401).json({ error: "Password corrente non valida" });

      const hashed = await bcrypt.hash(newPassword, 10);
      await prisma.user.update({ where: { id: req.user!.id }, data: { password: hashed } });
      res.json({ message: "Password aggiornata con successo" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}

export default new AuthController();