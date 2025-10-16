import { Response } from "express";
import prisma from "../config/database";
import { AuthRequest } from "../middleware/auth";
import { stringifyJsonField } from "../utils/jsonHelper";

class CompanyController {
  // Update company settings (admin only)
  async updateCompany(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const {
        logo,
        partitaIva,
        codiceFiscale,
        indirizzo,
        citta,
        cap,
        paese,
        telefono,
        emailFatturazione,
        pec,
        codiceSdi,
      } = req.body;

      // Verify user is admin of this company
      const user = await prisma.user.findUnique({
        where: { id: req.user!.id },
        select: {
          role: { select: { nome: true } },
          adminCompany: { select: { id: true } },
        },
      });

      if (user?.role?.nome !== 'Admin' || user?.adminCompany?.id !== id) {
        return res.status(403).json({ error: "Non autorizzato" });
      }

      const updateData: any = {};
      if (logo !== undefined) updateData.logo = logo;
      if (partitaIva !== undefined) updateData.partitaIva = partitaIva;
      if (codiceFiscale !== undefined) updateData.codiceFiscale = codiceFiscale;
      if (indirizzo !== undefined) updateData.indirizzo = indirizzo;
      if (citta !== undefined) updateData.citta = citta;
      if (cap !== undefined) updateData.cap = cap;
      if (paese !== undefined) updateData.paese = paese;
      if (telefono !== undefined) updateData.telefono = telefono;
      if (emailFatturazione !== undefined) updateData.emailFatturazione = emailFatturazione;
      if (pec !== undefined) updateData.pec = pec;
      if (codiceSdi !== undefined) updateData.codiceSdi = codiceSdi;

      const company = await prisma.company.update({
        where: { id },
        data: updateData,
      });

      await prisma.auditLog.create({
        data: {
          entita: "Company",
          entitaId: id,
          azione: "update",
          autoreId: req.user!.id,
          payload: stringifyJsonField({ updated: Object.keys(updateData) }),
        },
      });

      res.json(company);
    } catch (e: any) {
      console.error('Errore aggiornamento azienda:', e);
      res.status(500).json({ error: e.message });
    }
  }

  // Get company by ID
  async getCompany(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const company = await prisma.company.findUnique({
        where: { id },
        select: {
          id: true,
          nome: true,
          code: true,
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
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!company) {
        return res.status(404).json({ error: "Azienda non trovata" });
      }

      res.json(company);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  }
}

export default new CompanyController();
