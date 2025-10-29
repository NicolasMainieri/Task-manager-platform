import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../config/database";
import { AuthRequest } from "../middleware/auth";
import { parseJsonField, stringifyJsonField } from "../utils/jsonHelper";
import companyService from "../services/companyService";
import penaltyService from "../services/penalty.service";

class AuthController {
  // 🆕 Registrazione Azienda
  async registerCompany(req: Request, res: Response) {
    try {
      const { email, password, name, companyName, plan } = req.body;

      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        return res.status(400).json({ message: "Email già registrata" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      let adminRole = await prisma.role.findFirst({ where: { nome: "Admin" } });
      if (!adminRole) {
        adminRole = await prisma.role.create({
          data: {
            nome: "Admin",
            descrizione: "Amministratore azienda",
            permessi: JSON.stringify({ all: true, isAdmin: true })
          }
        });
      }

      const { company, user, companyCode } = await companyService.createCompany({
        name,
        companyName,
        email,
        hashedPassword,
        plan,
        roleId: adminRole.id
      });

      res.status(201).json({
        message: "Azienda creata con successo!",
        companyCode: companyCode,
        companyId: company.id
      });
    } catch (error: any) {
      console.error("Errore registrazione azienda:", error);
      res.status(500).json({ message: "Errore durante la registrazione" });
    }
  }

  // 🆕 Registrazione Dipendente
  async registerEmployee(req: Request, res: Response) {
    try {
      const { email, password, name, companyCode } = req.body;

      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        return res.status(400).json({ message: "Email già registrata" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      let employeeRole = await prisma.role.findFirst({ where: { nome: "Dipendente" } });
      if (!employeeRole) {
        employeeRole = await prisma.role.create({
          data: {
            nome: "Dipendente",
            descrizione: "Dipendente standard",
            permessi: JSON.stringify({ tasks: true, view: true })
          }
        });
      }

      const user = await companyService.registerEmployee({
        name,
        email,
        hashedPassword,
        companyCode,
        roleId: employeeRole.id
      });

      res.status(201).json({
        message: "Richiesta inviata! Attendi l'approvazione dell'amministratore.",
        userId: user.id
      });
    } catch (error: any) {
      if (error.message === "Codice azienda non valido") {
        return res.status(400).json({ message: error.message });
      }
      console.error("Errore registrazione dipendente:", error);
      res.status(500).json({ message: "Errore durante la registrazione" });
    }
  }

  // 🆕 Ottieni richieste pending
  async getPendingRequests(req: AuthRequest, res: Response) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user!.id },
        include: { company: true }
      });

      if (!user || !user.companyId) {
        return res.status(403).json({ error: "Non autorizzato" });
      }

      const pendingUsers = await companyService.getPendingRequests(user.companyId);
      res.json(pendingUsers);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // 🆕 Approva/Rifiuta dipendente
  async updateUserStatus(req: AuthRequest, res: Response) {
    try {
      const { userId, status } = req.body;

      if (!["approved", "rejected"].includes(status)) {
        return res.status(400).json({ error: "Status non valido" });
      }

      const user = await companyService.updateUserStatus(userId, status);
      res.json({ message: `Utente ${status === "approved" ? "approvato" : "rifiutato"}`, user });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // ✏️ MODIFICATO - Login con controllo status
  async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;
      const user = await prisma.user.findUnique({ 
        where: { email }, 
        include: { role: true, team: true, company: true }
      });
      
      if (!user) return res.status(401).json({ error: "Credenziali non valide" });

      // Controllo status
      if (user.status === "pending") {
        return res.status(403).json({
          error: "Account in attesa di approvazione dall'amministratore"
        });
      }

      if (user.status === "rejected") {
        return res.status(403).json({
          error: "Account rifiutato dall'amministratore"
        });
      }

      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) return res.status(401).json({ error: "Credenziali non valide" });

      // Assegna bonus login giornaliero
      try {
        await penaltyService.loginBonus(user.id);
      } catch (bonusError) {
        console.error('Errore assegnazione bonus login:', bonusError);
        // Non blocchiamo il login se il bonus fallisce
      }

      const secret = process.env.JWT_SECRET;
      if (!secret) throw new Error("JWT_SECRET non configurato");
      const token = jwt.sign({ userId: user.id }, secret);
      const { password: _, ...userWithoutPassword } = user;

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

  // Resto delle funzioni ORIGINALI (non modificate)
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
      const token = jwt.sign({ userId: user.id }, secret);
      const { password: _, ...userWithoutPassword } = user;
      
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

  async getProfile(req: AuthRequest, res: Response) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user!.id },
        include: { role: true, team: true, company: true, adminCompany: true }
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