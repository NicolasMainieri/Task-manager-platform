import { Response } from "express";
import prisma from "../config/database";
import { AuthRequest } from "../middleware/auth";

class RoleChangeRequestController {
  // Ottieni tutte le richieste (admin vede tutte, dipendente vede solo le sue)
  async getRequests(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { adminCompany: true, role: true }
      });

      if (!user?.companyId) {
        return res.status(400).json({ error: "Utente non associato a un'azienda" });
      }

      const where: any = { companyId: user.companyId };

      // Se non è admin, vede solo le sue richieste
      if (!user.adminCompany) {
        where.userId = userId;
      }

      const requests = await prisma.roleChangeRequest.findMany({
        where,
        include: {
          user: {
            select: { id: true, nome: true, cognome: true, email: true, avatar: true }
          },
          requestedRole: {
            select: { id: true, nome: true, colore: true, icona: true }
          },
          reviewer: {
            select: { id: true, nome: true, cognome: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      res.json(requests);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // Crea una nuova richiesta di cambio ruolo
  async createRequest(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const { requestedRoleId, motivazione } = req.body;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { role: true, company: true }
      });

      if (!user?.companyId) {
        return res.status(400).json({ error: "Utente non associato a un'azienda" });
      }

      // Verifica che il ruolo richiesto esista
      const requestedRole = await prisma.role.findUnique({
        where: { id: requestedRoleId }
      });

      if (!requestedRole) {
        return res.status(404).json({ error: "Ruolo non trovato" });
      }

      // Non si può richiedere il proprio ruolo attuale
      if (user.roleId === requestedRoleId) {
        return res.status(400).json({ error: "Hai già questo ruolo" });
      }

      // Verifica che non ci sia già una richiesta pending
      const existingRequest = await prisma.roleChangeRequest.findFirst({
        where: {
          userId,
          stato: 'pending'
        }
      });

      if (existingRequest) {
        return res.status(400).json({ error: "Hai già una richiesta di cambio ruolo in attesa" });
      }

      const request = await prisma.roleChangeRequest.create({
        data: {
          userId,
          currentRoleName: user.role.nome,
          requestedRoleId,
          motivazione,
          companyId: user.companyId,
          stato: 'pending'
        },
        include: {
          requestedRole: {
            select: { id: true, nome: true, colore: true, icona: true }
          }
        }
      });

      // Crea notifica per l'admin
      const admin = await prisma.company.findUnique({
        where: { id: user.companyId },
        select: { adminUserId: true }
      });

      if (admin?.adminUserId) {
        await prisma.notification.create({
          data: {
            userId: admin.adminUserId,
            tipo: 'role_change_request',
            titolo: 'Nuova richiesta cambio ruolo',
            messaggio: `${user.nome} ${user.cognome} ha richiesto di cambiare ruolo da ${user.role.nome} a ${requestedRole.nome}`,
            link: `/admin/role-requests/${request.id}`
          }
        });
      }

      res.status(201).json(request);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // Approva o rifiuta una richiesta (solo admin)
  async reviewRequest(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      const { azione, reviewNote } = req.body; // azione: 'approve' | 'reject'

      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { adminCompany: true }
      });

      if (!user?.adminCompany) {
        return res.status(403).json({ error: "Solo gli admin possono gestire le richieste" });
      }

      const request = await prisma.roleChangeRequest.findUnique({
        where: { id },
        include: { user: true, requestedRole: true }
      });

      if (!request) {
        return res.status(404).json({ error: "Richiesta non trovata" });
      }

      if (request.companyId !== user.companyId) {
        return res.status(403).json({ error: "Non hai accesso a questa richiesta" });
      }

      if (request.stato !== 'pending') {
        return res.status(400).json({ error: "Questa richiesta è già stata processata" });
      }

      const newStato = azione === 'approve' ? 'approved' : 'rejected';

      // Se approvata, aggiorna il ruolo dell'utente
      if (azione === 'approve') {
        await prisma.user.update({
          where: { id: request.userId },
          data: { roleId: request.requestedRoleId }
        });
      }

      // Aggiorna la richiesta
      const updatedRequest = await prisma.roleChangeRequest.update({
        where: { id },
        data: {
          stato: newStato,
          reviewedBy: userId,
          reviewedAt: new Date(),
          reviewNote
        },
        include: {
          user: {
            select: { id: true, nome: true, cognome: true }
          },
          requestedRole: {
            select: { id: true, nome: true, colore: true }
          },
          reviewer: {
            select: { id: true, nome: true, cognome: true }
          }
        }
      });

      // Notifica l'utente
      await prisma.notification.create({
        data: {
          userId: request.userId,
          tipo: 'role_change_response',
          titolo: azione === 'approve' ? 'Richiesta approvata!' : 'Richiesta rifiutata',
          messaggio: azione === 'approve'
            ? `La tua richiesta di cambio ruolo a ${request.requestedRole.nome} è stata approvata!`
            : `La tua richiesta di cambio ruolo a ${request.requestedRole.nome} è stata rifiutata. ${reviewNote || ''}`,
          link: '/profile'
        }
      });

      res.json(updatedRequest);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // Cancella una richiesta (solo se pending e propria)
  async deleteRequest(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      const request = await prisma.roleChangeRequest.findUnique({
        where: { id }
      });

      if (!request) {
        return res.status(404).json({ error: "Richiesta non trovata" });
      }

      if (request.userId !== userId) {
        return res.status(403).json({ error: "Non puoi eliminare questa richiesta" });
      }

      if (request.stato !== 'pending') {
        return res.status(400).json({ error: "Non puoi eliminare una richiesta già processata" });
      }

      await prisma.roleChangeRequest.delete({ where: { id } });

      res.json({ message: "Richiesta eliminata con successo" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}

export default new RoleChangeRequestController();
