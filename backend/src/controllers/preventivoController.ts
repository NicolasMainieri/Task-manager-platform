import { Response } from "express";
import prisma from "../config/database";
import { AuthRequest } from "../middleware/auth";
import { analyzeProductLinks, generatePreventivoDescription } from "../services/preventivoAI.service";
import { generatePreventivoPDF } from "../services/preventivoPDF.service";
import { generatePreventivoExcel } from "../services/preventivoExcel.service";

class PreventivoController {
  constructor() {
    this.createPreventivo = this.createPreventivo.bind(this);
    this.getPreventiviList = this.getPreventiviList.bind(this);
    this.getPreventivoById = this.getPreventivoById.bind(this);
    this.updatePreventivo = this.updatePreventivo.bind(this);
    this.deletePreventivo = this.deletePreventivo.bind(this);
    this.analyzeProduct = this.analyzeProduct.bind(this);
    this.generateFiles = this.generateFiles.bind(this);
    this.updateStatoPreventivo = this.updateStatoPreventivo.bind(this);
  }

  /**
   * Analizza link prodotti e restituisce dati estratti (senza salvare)
   */
  async analyzeProduct(req: AuthRequest, res: Response) {
    try {
      const { linkProdotti } = req.body;

      if (!linkProdotti || !Array.isArray(linkProdotti) || linkProdotti.length === 0) {
        return res.status(400).json({ error: "Fornire almeno un link prodotto" });
      }

      console.log('[preventivoController] Analisi prodotti da link:', linkProdotti);

      // Analizza i link con AI
      const productData = await analyzeProductLinks(linkProdotti);

      // Genera descrizione migliorata con AI
      const descrizioneMigliorata = await generatePreventivoDescription(productData);
      productData.descrizioneProdotto = descrizioneMigliorata;

      res.json({
        success: true,
        productData
      });
    } catch (error: any) {
      console.error('[preventivoController] Errore analisi prodotto:', error);
      res.status(500).json({ error: error.message || "Errore durante l'analisi del prodotto" });
    }
  }

  /**
   * Crea nuovo preventivo con dati estratti dall'AI
   */
  async createPreventivo(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { company: true }
      });

      if (!user || !user.company) {
        return res.status(403).json({ error: "Utente non autorizzato o azienda non trovata" });
      }

      const {
        nomeCliente,
        emailCliente,
        telefonoCliente,
        contactId,
        linkProdotti,
        linkImmagini,
        prezzoOriginale,
        percentualeSconto = 0,
        dataScadenza,
        noteAggiuntive,
        // Dati opzionali già estratti dall'AI (se frontend ha già chiamato /analyze)
        productData
      } = req.body;

      // Validazione
      if (!nomeCliente || !linkProdotti || linkProdotti.length === 0) {
        return res.status(400).json({ error: "Nome cliente e link prodotti sono obbligatori" });
      }

      if (!prezzoOriginale || prezzoOriginale <= 0) {
        return res.status(400).json({ error: "Prezzo prodotto obbligatorio" });
      }

      console.log('[preventivoController] Creazione preventivo per:', nomeCliente);
      console.log('[preventivoController] Prezzo da usare:', prezzoOriginale);

      let extractedData;

      // Se productData non è fornito, analizza i link
      if (!productData) {
        console.log('[preventivoController] Analisi link prodotti...');
        extractedData = await analyzeProductLinks(linkProdotti);
        const descrizioneMigliorata = await generatePreventivoDescription(extractedData);
        extractedData.descrizioneProdotto = descrizioneMigliorata;
      } else {
        extractedData = productData;
      }

      // USA IL PREZZO DAL FRONTEND, non quello dell'AI
      const prezzoFinale = prezzoOriginale - (prezzoOriginale * (percentualeSconto / 100));

      // Crea preventivo nel database
      const preventivo = await prisma.preventivo.create({
        data: {
          nomeCliente,
          emailCliente,
          telefonoCliente,
          contactId,
          aziendaEmittente: user.company.nome,
          logoAzienda: user.company.logo || undefined,
          linkProdotti: JSON.stringify(linkProdotti),
          nomeProdotto: extractedData.nomeProdotto,
          descrizioneProdotto: extractedData.descrizioneProdotto,
          caratteristiche: JSON.stringify(extractedData.caratteristiche),
          funzionalita: JSON.stringify(extractedData.funzionalita),
          compatibilita: JSON.stringify(extractedData.compatibilita),
          vantaggi: JSON.stringify(extractedData.vantaggi),
          riconoscimenti: JSON.stringify(extractedData.riconoscimenti),
          prezzoOriginale,
          percentualeSconto,
          prezzoFinale,
          cosaRicevi: JSON.stringify(extractedData.cosaRicevi),
          passaggiAcquisto: JSON.stringify(extractedData.passaggiAcquisto),
          garanzie: JSON.stringify(extractedData.garanzie),
          dataScadenza: dataScadenza ? new Date(dataScadenza) : undefined,
          noteAggiuntive,
          createdById: userId,
          companyId: user.companyId!,
          aiProcessedAt: new Date(),
          stato: 'bozza'
        }
      });

      console.log('[preventivoController] Preventivo creato:', preventivo.id);

      res.status(201).json({
        success: true,
        preventivo: {
          ...preventivo,
          linkProdotti: JSON.parse(preventivo.linkProdotti),
          caratteristiche: JSON.parse(preventivo.caratteristiche),
          funzionalita: JSON.parse(preventivo.funzionalita),
          compatibilita: JSON.parse(preventivo.compatibilita),
          vantaggi: JSON.parse(preventivo.vantaggi),
          riconoscimenti: JSON.parse(preventivo.riconoscimenti),
          cosaRicevi: JSON.parse(preventivo.cosaRicevi),
          passaggiAcquisto: JSON.parse(preventivo.passaggiAcquisto),
          garanzie: JSON.parse(preventivo.garanzie)
        }
      });
    } catch (error: any) {
      console.error('[preventivoController] Errore creazione preventivo:', error);
      res.status(500).json({ error: error.message || "Errore durante la creazione del preventivo" });
    }
  }

  /**
   * Genera PDF ed Excel per un preventivo esistente
   */
  async generateFiles(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      const preventivo = await prisma.preventivo.findUnique({
        where: { id }
      });

      if (!preventivo) {
        return res.status(404).json({ error: "Preventivo non trovato" });
      }

      // Verifica permessi (stessa azienda)
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (user?.companyId !== preventivo.companyId) {
        return res.status(403).json({ error: "Non hai accesso a questo preventivo" });
      }

      console.log('[preventivoController] Generazione file per preventivo:', id);

      // Prepara dati per generazione
      const preventivoData = {
        ...preventivo,
        linkProdotti: JSON.parse(preventivo.linkProdotti),
        caratteristiche: JSON.parse(preventivo.caratteristiche),
        funzionalita: JSON.parse(preventivo.funzionalita),
        compatibilita: JSON.parse(preventivo.compatibilita),
        vantaggi: JSON.parse(preventivo.vantaggi),
        riconoscimenti: JSON.parse(preventivo.riconoscimenti),
        cosaRicevi: JSON.parse(preventivo.cosaRicevi),
        passaggiAcquisto: JSON.parse(preventivo.passaggiAcquisto),
        garanzie: JSON.parse(preventivo.garanzie)
      };

      // Genera PDF
      const pdfUrl = await generatePreventivoPDF(preventivoData);

      // Genera Excel
      const excelUrl = await generatePreventivoExcel(preventivoData);

      // Aggiorna preventivo con URL file generati
      const updatedPreventivo = await prisma.preventivo.update({
        where: { id },
        data: {
          urlPdf: pdfUrl,
          urlExcel: excelUrl
        }
      });

      console.log('[preventivoController] File generati con successo');

      res.json({
        success: true,
        pdfUrl,
        excelUrl,
        preventivo: {
          ...updatedPreventivo,
          linkProdotti: JSON.parse(updatedPreventivo.linkProdotti),
          caratteristiche: JSON.parse(updatedPreventivo.caratteristiche),
          funzionalita: JSON.parse(updatedPreventivo.funzionalita),
          compatibilita: JSON.parse(updatedPreventivo.compatibilita),
          vantaggi: JSON.parse(updatedPreventivo.vantaggi),
          riconoscimenti: JSON.parse(updatedPreventivo.riconoscimenti),
          cosaRicevi: JSON.parse(updatedPreventivo.cosaRicevi),
          passaggiAcquisto: JSON.parse(updatedPreventivo.passaggiAcquisto),
          garanzie: JSON.parse(updatedPreventivo.garanzie)
        }
      });
    } catch (error: any) {
      console.error('[preventivoController] Errore generazione file:', error);
      res.status(500).json({ error: error.message || "Errore durante la generazione dei file" });
    }
  }

  /**
   * Lista preventivi dell'azienda
   */
  async getPreventiviList(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user || !user.companyId) {
        return res.status(403).json({ error: "Utente non autorizzato" });
      }

      const { stato } = req.query;

      const where: any = {
        companyId: user.companyId
      };

      if (stato) {
        where.stato = stato;
      }

      const preventivi = await prisma.preventivo.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 100
      });

      const preventiviParsed = preventivi.map(p => ({
        ...p,
        linkProdotti: JSON.parse(p.linkProdotti),
        caratteristiche: JSON.parse(p.caratteristiche),
        funzionalita: JSON.parse(p.funzionalita),
        compatibilita: JSON.parse(p.compatibilita),
        vantaggi: JSON.parse(p.vantaggi),
        riconoscimenti: JSON.parse(p.riconoscimenti),
        cosaRicevi: JSON.parse(p.cosaRicevi),
        passaggiAcquisto: JSON.parse(p.passaggiAcquisto),
        garanzie: JSON.parse(p.garanzie)
      }));

      res.json({
        success: true,
        preventivi: preventiviParsed
      });
    } catch (error: any) {
      console.error('[preventivoController] Errore recupero preventivi:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Ottieni singolo preventivo
   */
  async getPreventivoById(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      const preventivo = await prisma.preventivo.findUnique({
        where: { id }
      });

      if (!preventivo) {
        return res.status(404).json({ error: "Preventivo non trovato" });
      }

      // Verifica permessi
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (user?.companyId !== preventivo.companyId) {
        return res.status(403).json({ error: "Non hai accesso a questo preventivo" });
      }

      const preventivoParsed = {
        ...preventivo,
        linkProdotti: JSON.parse(preventivo.linkProdotti),
        caratteristiche: JSON.parse(preventivo.caratteristiche),
        funzionalita: JSON.parse(preventivo.funzionalita),
        compatibilita: JSON.parse(preventivo.compatibilita),
        vantaggi: JSON.parse(preventivo.vantaggi),
        riconoscimenti: JSON.parse(preventivo.riconoscimenti),
        cosaRicevi: JSON.parse(preventivo.cosaRicevi),
        passaggiAcquisto: JSON.parse(preventivo.passaggiAcquisto),
        garanzie: JSON.parse(preventivo.garanzie)
      };

      res.json({
        success: true,
        preventivo: preventivoParsed
      });
    } catch (error: any) {
      console.error('[preventivoController] Errore recupero preventivo:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Aggiorna preventivo
   */
  async updatePreventivo(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      const preventivo = await prisma.preventivo.findUnique({
        where: { id }
      });

      if (!preventivo) {
        return res.status(404).json({ error: "Preventivo non trovato" });
      }

      // Verifica permessi
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (user?.companyId !== preventivo.companyId) {
        return res.status(403).json({ error: "Non hai accesso a questo preventivo" });
      }

      const {
        nomeCliente,
        emailCliente,
        telefonoCliente,
        percentualeSconto,
        dataScadenza,
        noteAggiuntive
      } = req.body;

      // Ricalcola prezzo se sconto cambiato
      let prezzoFinale = preventivo.prezzoFinale;
      if (percentualeSconto !== undefined && percentualeSconto !== preventivo.percentualeSconto) {
        prezzoFinale = preventivo.prezzoOriginale - (preventivo.prezzoOriginale * (percentualeSconto / 100));
      }

      const updated = await prisma.preventivo.update({
        where: { id },
        data: {
          nomeCliente: nomeCliente || preventivo.nomeCliente,
          emailCliente: emailCliente !== undefined ? emailCliente : preventivo.emailCliente,
          telefonoCliente: telefonoCliente !== undefined ? telefonoCliente : preventivo.telefonoCliente,
          percentualeSconto: percentualeSconto !== undefined ? percentualeSconto : preventivo.percentualeSconto,
          prezzoFinale,
          dataScadenza: dataScadenza ? new Date(dataScadenza) : preventivo.dataScadenza,
          noteAggiuntive: noteAggiuntive !== undefined ? noteAggiuntive : preventivo.noteAggiuntive
        }
      });

      res.json({
        success: true,
        preventivo: {
          ...updated,
          linkProdotti: JSON.parse(updated.linkProdotti),
          caratteristiche: JSON.parse(updated.caratteristiche),
          funzionalita: JSON.parse(updated.funzionalita),
          compatibilita: JSON.parse(updated.compatibilita),
          vantaggi: JSON.parse(updated.vantaggi),
          riconoscimenti: JSON.parse(updated.riconoscimenti),
          cosaRicevi: JSON.parse(updated.cosaRicevi),
          passaggiAcquisto: JSON.parse(updated.passaggiAcquisto),
          garanzie: JSON.parse(updated.garanzie)
        }
      });
    } catch (error: any) {
      console.error('[preventivoController] Errore aggiornamento preventivo:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Cambia stato preventivo
   */
  async updateStatoPreventivo(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { stato } = req.body; // 'bozza', 'inviato', 'approvato', 'rifiutato'

      if (!['bozza', 'inviato', 'approvato', 'rifiutato'].includes(stato)) {
        return res.status(400).json({ error: "Stato non valido" });
      }

      const preventivo = await prisma.preventivo.findUnique({
        where: { id }
      });

      if (!preventivo) {
        return res.status(404).json({ error: "Preventivo non trovato" });
      }

      // Verifica permessi
      const user = await prisma.user.findUnique({
        where: { id: req.user!.id }
      });

      if (user?.companyId !== preventivo.companyId) {
        return res.status(403).json({ error: "Non hai accesso a questo preventivo" });
      }

      const updated = await prisma.preventivo.update({
        where: { id },
        data: { stato }
      });

      res.json({
        success: true,
        preventivo: {
          ...updated,
          linkProdotti: JSON.parse(updated.linkProdotti),
          caratteristiche: JSON.parse(updated.caratteristiche),
          funzionalita: JSON.parse(updated.funzionalita),
          compatibilita: JSON.parse(updated.compatibilita),
          vantaggi: JSON.parse(updated.vantaggi),
          riconoscimenti: JSON.parse(updated.riconoscimenti),
          cosaRicevi: JSON.parse(updated.cosaRicevi),
          passaggiAcquisto: JSON.parse(updated.passaggiAcquisto),
          garanzie: JSON.parse(updated.garanzie)
        }
      });
    } catch (error: any) {
      console.error('[preventivoController] Errore cambio stato:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Elimina preventivo
   */
  async deletePreventivo(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      const preventivo = await prisma.preventivo.findUnique({
        where: { id }
      });

      if (!preventivo) {
        return res.status(404).json({ error: "Preventivo non trovato" });
      }

      // Verifica permessi
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (user?.companyId !== preventivo.companyId) {
        return res.status(403).json({ error: "Non hai accesso a questo preventivo" });
      }

      await prisma.preventivo.delete({
        where: { id }
      });

      res.json({
        success: true,
        message: "Preventivo eliminato con successo"
      });
    } catch (error: any) {
      console.error('[preventivoController] Errore eliminazione preventivo:', error);
      res.status(500).json({ error: error.message });
    }
  }
}

export default new PreventivoController();
