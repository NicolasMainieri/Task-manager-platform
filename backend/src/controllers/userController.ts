import { Response } from "express";
import prisma from "../config/database";
import { AuthRequest } from "../middleware/auth";
import bcrypt from "bcryptjs";
import { stringifyJsonField } from "../utils/jsonHelper";
import scoreService from "../services/score.service";

class UserController {
  async getAllUsers(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const { search, teamId, roleId } = req.query as any;

      // Ottieni la company dell'utente autenticato
      const currentUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { companyId: true }
      });

      if (!currentUser?.companyId) {
        return res.status(400).json({ error: "Utente non associato a un'azienda" });
      }

      // Filtra SEMPRE per companyId
      const where: any = {
        companyId: currentUser.companyId
      };

      if (search) where.OR = [
        { nome: { contains: search, mode: "insensitive" } },
        { cognome: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
      if (teamId) where.teamId = teamId;
      if (roleId) where.roleId = roleId;

      const users = await prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          nome: true,
          cognome: true,
          role: true,
          team: true,
          companyId: true,
          status: true,
          createdAt: true
        },
        orderBy: { nome: "asc" },
      });

      // 🆕 Aggiungi score e task completati per ogni utente
      const usersWithStats = await Promise.all(users.map(async (user) => {
        const score = await scoreService.getUserScore(user.id);
        const completedTasks = await prisma.task.count({
          where: {
            OR: [
              { ownerId: user.id },
              { assignees: { some: { id: user.id } } }
            ],
            stato: { in: ['completato', 'completata'] }
          }
        });

        return {
          ...user,
          score,
          completedTasks
        };
      }));

      res.json(usersWithStats);
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

    // Validazione
    if (!email || !nome || !cognome) {
      return res.status(400).json({ error: "Email, nome e cognome sono obbligatori" });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(400).json({ error: "Email già registrata" });

    const hashed = await bcrypt.hash(password || "TempPassword123!", 10);

    // 🆕 Ottieni la company dell'admin che sta creando l'utente
    const admin = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { companyId: true }
    });

    // Prepara i dati filtrando i campi vuoti
    const userData: any = {
      email,
      password: hashed,
      nome,
      cognome,
      status: 'approved' // 🆕 Approva automaticamente i dipendenti creati dall'admin
    };

    // 🆕 Assegna la company dell'admin
    if (admin?.companyId) {
      userData.companyId = admin.companyId;
    }

    // Aggiungi roleId solo se non è vuoto
    if (roleId && roleId !== '') {
      userData.roleId = roleId;
    }

    // Aggiungi teamId solo se non è vuoto
    if (teamId && teamId !== '') {
      userData.teamId = teamId;
    }

    const user = await prisma.user.create({
      data: userData,
      include: { role: true, team: true, company: true },
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
  } catch (e: any) { 
    console.error('Errore creazione utente:', e);
    res.status(500).json({ error: e.message }); 
  }
}

async updateUser(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const { nome, cognome, roleId, teamId } = req.body;
    
    // Prepara i dati da aggiornare
    const updateData: any = {};
    if (nome !== undefined) updateData.nome = nome;
    if (cognome !== undefined) updateData.cognome = cognome;
    if (roleId !== undefined) updateData.roleId = roleId;
    // Gestisci esplicitamente teamId null per rimuovere dal team
    if (teamId !== undefined) updateData.teamId = teamId;
    
    const user = await prisma.user.update({ 
      where: { id }, 
      data: updateData, 
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
  } catch (e: any) { 
    console.error('Errore aggiornamento utente:', e);
    res.status(500).json({ error: e.message }); 
  }
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

  // Get current user profile
  async getMyProfile(req: AuthRequest, res: Response) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user!.id },
        select: {
          id: true,
          email: true,
          nome: true,
          cognome: true,
          avatar: true,
          telefono: true,
          indirizzo: true,
          citta: true,
          cap: true,
          paese: true,
          role: true,
          team: true,
          company: {
            select: {
              id: true,
              nome: true,
              plan: true,
              logo: true,
              planStatus: true,
              trialEndsAt: true,
              subscriptionEndsAt: true,
              nextRenewalDate: true,
              partitaIva: true,
              codiceFiscale: true,
              indirizzo: true,
              citta: true,
              cap: true,
              paese: true,
              telefono: true,
              emailFatturazione: true,
              pec: true,
              codiceSdi: true,
            },
          },
          createdAt: true,
        },
      });

      if (!user) return res.status(404).json({ error: "Utente non trovato" });
      res.json(user);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  }

  // Update current user profile
  async updateMyProfile(req: AuthRequest, res: Response) {
    try {
      const { nome, cognome, email, avatar, telefono, indirizzo, citta, cap, paese } = req.body;

      const updateData: any = {};
      if (nome !== undefined) updateData.nome = nome;
      if (cognome !== undefined) updateData.cognome = cognome;
      if (email !== undefined) updateData.email = email;
      if (avatar !== undefined) updateData.avatar = avatar;
      if (telefono !== undefined) updateData.telefono = telefono;
      if (indirizzo !== undefined) updateData.indirizzo = indirizzo;
      if (citta !== undefined) updateData.citta = citta;
      if (cap !== undefined) updateData.cap = cap;
      if (paese !== undefined) updateData.paese = paese;

      const user = await prisma.user.update({
        where: { id: req.user!.id },
        data: updateData,
        select: {
          id: true,
          email: true,
          nome: true,
          cognome: true,
          avatar: true,
          telefono: true,
          indirizzo: true,
          citta: true,
          cap: true,
          paese: true,
          role: true,
          team: true,
          company: true,
        },
      });

      await prisma.auditLog.create({
        data: {
          entita: "User",
          entitaId: req.user!.id,
          azione: "update_profile",
          autoreId: req.user!.id,
          payload: stringifyJsonField({ updated: Object.keys(updateData) }),
        },
      });

      res.json(user);
    } catch (e: any) {
      console.error('Errore aggiornamento profilo:', e);
      res.status(500).json({ error: e.message });
    }
  }

  // Change password
  async changePassword(req: AuthRequest, res: Response) {
    try {
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: "Password attuale e nuova password sono obbligatorie" });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ error: "La nuova password deve essere di almeno 6 caratteri" });
      }

      const user = await prisma.user.findUnique({
        where: { id: req.user!.id },
        select: { id: true, password: true },
      });

      if (!user) return res.status(404).json({ error: "Utente non trovato" });

      const isValid = await bcrypt.compare(currentPassword, user.password);
      if (!isValid) {
        return res.status(401).json({ error: "Password attuale non corretta" });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await prisma.user.update({
        where: { id: req.user!.id },
        data: { password: hashedPassword },
      });

      await prisma.auditLog.create({
        data: {
          entita: "User",
          entitaId: req.user!.id,
          azione: "change_password",
          autoreId: req.user!.id,
          payload: stringifyJsonField({}),
        },
      });

      res.json({ message: "Password cambiata con successo" });
    } catch (e: any) {
      console.error('Errore cambio password:', e);
      res.status(500).json({ error: e.message });
    }
  }
}

export default new UserController();