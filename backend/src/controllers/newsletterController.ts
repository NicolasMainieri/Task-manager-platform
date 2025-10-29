import { Response } from "express";
import prisma from "../config/database";
import { AuthRequest } from "../middleware/auth";
import { stringifyJsonField } from "../utils/jsonHelper";
import * as newsletterAI from "../services/newsletterAI.service";
import * as emailSender from "../services/emailSender.service";
import * as newsletterSync from "../services/newsletterSync.service";

class NewsletterController {
  // Crea una newsletter
  async createNewsletter(req: AuthRequest, res: Response) {
    try {
      const {
        nome,
        oggetto,
        contenutoHTML,
        anteprimaTesto,
        tipoProgrammazione,
        dataProgrammata,
        ricorrenza,
        isRicorrente,
        eventoPromozionale,
        dataEventoInizio,
        dataEventoFine,
        tipoDestinatari,
        contattiInterni,
        listaEsterna,
        filtriDestinatari,
        aiGenerato,
        aiPromptUsato,
        aiAnalisiEvento,
        aiSuggerimenti
      } = req.body;

      if (!nome || !oggetto || !contenutoHTML) {
        return res.status(400).json({ error: "Nome, oggetto e contenuto HTML sono obbligatori" });
      }

      const currentUser = await prisma.user.findUnique({
        where: { id: req.user!.id },
        select: { companyId: true }
      });

      if (!currentUser?.companyId) {
        return res.status(403).json({ error: "Utente non associato a un'azienda" });
      }

      const newsletter = await prisma.newsletter.create({
        data: {
          nome,
          oggetto,
          contenutoHTML,
          anteprimaTesto,
          tipoProgrammazione: tipoProgrammazione || "manuale",
          dataProgrammata: dataProgrammata ? new Date(dataProgrammata) : null,
          ricorrenza: stringifyJsonField(ricorrenza || {}),
          isRicorrente: isRicorrente || false,
          eventoPromozionale,
          dataEventoInizio: dataEventoInizio ? new Date(dataEventoInizio) : null,
          dataEventoFine: dataEventoFine ? new Date(dataEventoFine) : null,
          tipoDestinatari: tipoDestinatari || "contatti_interni",
          contattiInterni: stringifyJsonField(contattiInterni || []),
          listaEsterna: stringifyJsonField(listaEsterna || []),
          filtriDestinatari: stringifyJsonField(filtriDestinatari || {}),
          aiGenerato: aiGenerato || false,
          aiPromptUsato,
          aiAnalisiEvento: stringifyJsonField(aiAnalisiEvento || {}),
          aiSuggerimenti: stringifyJsonField(aiSuggerimenti || []),
          createdById: req.user!.id,
          companyId: currentUser.companyId
        }
      });

      await prisma.auditLog.create({
        data: {
          entita: "Newsletter",
          entitaId: newsletter.id,
          azione: "create",
          autoreId: req.user!.id,
          payload: stringifyJsonField({ nome, oggetto })
        }
      });

      // Sincronizza con calendario se programmata
      if (newsletter.dataProgrammata) {
        await newsletterSync.syncNewsletterToCalendar(newsletter.id, req.user!.id);
      }

      res.status(201).json(newsletter);
    } catch (error: any) {
      console.error('[newsletterController] Errore creazione newsletter:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Ottieni tutte le newsletter
  async getNewsletters(req: AuthRequest, res: Response) {
    try {
      const { stato, tipoProgrammazione } = req.query;

      const currentUser = await prisma.user.findUnique({
        where: { id: req.user!.id },
        select: { companyId: true }
      });

      if (!currentUser?.companyId) {
        return res.status(403).json({ error: "Utente non associato a un'azienda" });
      }

      const where: any = {
        companyId: currentUser.companyId
      };

      if (stato) where.stato = stato;
      if (tipoProgrammazione) where.tipoProgrammazione = tipoProgrammazione;

      const newsletters = await prisma.newsletter.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: {
          _count: {
            select: { invii: true }
          }
        }
      });

      res.json(newsletters);
    } catch (error: any) {
      console.error('[newsletterController] Errore recupero newsletter:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Ottieni singola newsletter
  async getNewsletterById(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const newsletter = await prisma.newsletter.findUnique({
        where: { id },
        include: {
          invii: {
            orderBy: { dataInvio: "desc" },
            take: 100
          }
        }
      });

      if (!newsletter) {
        return res.status(404).json({ error: "Newsletter non trovata" });
      }

      const currentUser = await prisma.user.findUnique({
        where: { id: req.user!.id },
        select: { companyId: true }
      });

      if (newsletter.companyId !== currentUser?.companyId) {
        return res.status(403).json({ error: "Non hai accesso a questa newsletter" });
      }

      res.json(newsletter);
    } catch (error: any) {
      console.error('[newsletterController] Errore recupero newsletter:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Aggiorna newsletter
  async updateNewsletter(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const existing = await prisma.newsletter.findUnique({
        where: { id }
      });

      if (!existing) {
        return res.status(404).json({ error: "Newsletter non trovata" });
      }

      const currentUser = await prisma.user.findUnique({
        where: { id: req.user!.id },
        select: { companyId: true }
      });

      if (existing.companyId !== currentUser?.companyId) {
        return res.status(403).json({ error: "Non hai accesso a questa newsletter" });
      }

      // Prepara dati aggiornamento
      const data: any = {};
      if (updateData.nome !== undefined) data.nome = updateData.nome;
      if (updateData.oggetto !== undefined) data.oggetto = updateData.oggetto;
      if (updateData.contenutoHTML !== undefined) data.contenutoHTML = updateData.contenutoHTML;
      if (updateData.anteprimaTesto !== undefined) data.anteprimaTesto = updateData.anteprimaTesto;
      if (updateData.stato !== undefined) data.stato = updateData.stato;
      if (updateData.tipoProgrammazione !== undefined) data.tipoProgrammazione = updateData.tipoProgrammazione;
      if (updateData.dataProgrammata !== undefined) data.dataProgrammata = updateData.dataProgrammata ? new Date(updateData.dataProgrammata) : null;
      if (updateData.ricorrenza !== undefined) data.ricorrenza = stringifyJsonField(updateData.ricorrenza);
      if (updateData.isRicorrente !== undefined) data.isRicorrente = updateData.isRicorrente;
      if (updateData.eventoPromozionale !== undefined) data.eventoPromozionale = updateData.eventoPromozionale;
      if (updateData.dataEventoInizio !== undefined) data.dataEventoInizio = updateData.dataEventoInizio ? new Date(updateData.dataEventoInizio) : null;
      if (updateData.dataEventoFine !== undefined) data.dataEventoFine = updateData.dataEventoFine ? new Date(updateData.dataEventoFine) : null;
      if (updateData.tipoDestinatari !== undefined) data.tipoDestinatari = updateData.tipoDestinatari;
      if (updateData.contattiInterni !== undefined) data.contattiInterni = stringifyJsonField(updateData.contattiInterni);
      if (updateData.listaEsterna !== undefined) data.listaEsterna = stringifyJsonField(updateData.listaEsterna);
      if (updateData.filtriDestinatari !== undefined) data.filtriDestinatari = stringifyJsonField(updateData.filtriDestinatari);

      const newsletter = await prisma.newsletter.update({
        where: { id },
        data
      });

      await prisma.auditLog.create({
        data: {
          entita: "Newsletter",
          entitaId: newsletter.id,
          azione: "update",
          autoreId: req.user!.id,
          payload: stringifyJsonField(updateData)
        }
      });

      res.json(newsletter);
    } catch (error: any) {
      console.error('[newsletterController] Errore aggiornamento newsletter:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Elimina newsletter
  async deleteNewsletter(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const newsletter = await prisma.newsletter.findUnique({
        where: { id }
      });

      if (!newsletter) {
        return res.status(404).json({ error: "Newsletter non trovata" });
      }

      const currentUser = await prisma.user.findUnique({
        where: { id: req.user!.id },
        select: { companyId: true }
      });

      if (newsletter.companyId !== currentUser?.companyId) {
        return res.status(403).json({ error: "Non hai accesso a questa newsletter" });
      }

      await prisma.newsletter.delete({ where: { id } });

      await prisma.auditLog.create({
        data: {
          entita: "Newsletter",
          entitaId: id,
          azione: "delete",
          autoreId: req.user!.id,
          payload: stringifyJsonField({ nome: newsletter.nome })
        }
      });

      res.json({ message: "Newsletter eliminata con successo" });
    } catch (error: any) {
      console.error('[newsletterController] Errore eliminazione newsletter:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Invia newsletter manualmente
  async sendNewsletter(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const newsletter = await prisma.newsletter.findUnique({
        where: { id }
      });

      if (!newsletter) {
        return res.status(404).json({ error: "Newsletter non trovata" });
      }

      const currentUser = await prisma.user.findUnique({
        where: { id: req.user!.id },
        select: { companyId: true }
      });

      if (newsletter.companyId !== currentUser?.companyId) {
        return res.status(403).json({ error: "Non hai accesso a questa newsletter" });
      }

      // Recupera destinatari
      const destinatari: { email: string; nome?: string }[] = [];

      // Contatti interni
      if (newsletter.tipoDestinatari === "contatti_interni" || newsletter.tipoDestinatari === "entrambi") {
        const contattiIds = JSON.parse(newsletter.contattiInterni || "[]");
        if (contattiIds.length > 0) {
          const contatti = await prisma.contact.findMany({
            where: {
              id: { in: contattiIds },
              companyId: currentUser.companyId
            }
          });
          contatti.forEach(c => {
            if (c.email) {
              destinatari.push({ email: c.email, nome: `${c.nome} ${c.cognome || ''}`.trim() });
            }
          });
        }
      }

      // Lista esterna
      if (newsletter.tipoDestinatari === "lista_esterna" || newsletter.tipoDestinatari === "entrambi") {
        const listaEsterna = JSON.parse(newsletter.listaEsterna || "[]");
        listaEsterna.forEach((email: string) => {
          destinatari.push({ email });
        });
      }

      if (destinatari.length === 0) {
        return res.status(400).json({ error: "Nessun destinatario trovato" });
      }

      // Crea log invii (in coda per processamento asincrono)
      const inviiPromises = destinatari.map(dest =>
        prisma.newsletterInvio.create({
          data: {
            newsletterId: newsletter.id,
            emailDestinatario: dest.email,
            nomeDestinatario: dest.nome,
            stato: "in_coda"
          }
        })
      );

      await Promise.all(inviiPromises);

      // Aggiorna stato newsletter
      await prisma.newsletter.update({
        where: { id },
        data: {
          stato: "in_invio",
          dataUltimoInvio: new Date(),
          totaleDestinatari: destinatari.length
        }
      });

      // Processa invio email effettivo in background
      setTimeout(async () => {
        try {
          const result = await emailSender.processNewsletterSending(id);
          console.log('[newsletterController] Risultato invio:', result);
        } catch (error) {
          console.error('[newsletterController] Errore invio asincrono:', error);
        }
      }, 1000);

      await prisma.auditLog.create({
        data: {
          entita: "Newsletter",
          entitaId: id,
          azione: "send",
          autoreId: req.user!.id,
          payload: stringifyJsonField({ destinatari: destinatari.length })
        }
      });

      res.json({
        message: "Newsletter in invio",
        destinatari: destinatari.length,
        info: "Le email verranno inviate gradualmente. Controlla lo stato nella lista newsletter."
      });
    } catch (error: any) {
      console.error('[newsletterController] Errore invio newsletter:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Duplica newsletter
  async duplicateNewsletter(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const original = await prisma.newsletter.findUnique({
        where: { id }
      });

      if (!original) {
        return res.status(404).json({ error: "Newsletter non trovata" });
      }

      const currentUser = await prisma.user.findUnique({
        where: { id: req.user!.id },
        select: { companyId: true }
      });

      if (original.companyId !== currentUser?.companyId) {
        return res.status(403).json({ error: "Non hai accesso a questa newsletter" });
      }

      const duplicate = await prisma.newsletter.create({
        data: {
          nome: `${original.nome} (Copia)`,
          oggetto: original.oggetto,
          contenutoHTML: original.contenutoHTML,
          anteprimaTesto: original.anteprimaTesto,
          stato: "bozza",
          tipoProgrammazione: original.tipoProgrammazione,
          ricorrenza: original.ricorrenza,
          isRicorrente: original.isRicorrente,
          eventoPromozionale: original.eventoPromozionale,
          tipoDestinatari: original.tipoDestinatari,
          contattiInterni: original.contattiInterni,
          listaEsterna: original.listaEsterna,
          filtriDestinatari: original.filtriDestinatari,
          aiGenerato: original.aiGenerato,
          aiPromptUsato: original.aiPromptUsato,
          aiAnalisiEvento: original.aiAnalisiEvento,
          aiSuggerimenti: original.aiSuggerimenti,
          createdById: req.user!.id,
          companyId: currentUser.companyId
        }
      });

      res.status(201).json(duplicate);
    } catch (error: any) {
      console.error('[newsletterController] Errore duplicazione newsletter:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // === AI ENDPOINTS ===

  // Analizza periodi promozionali
  async analyzePromotionalPeriods(req: AuthRequest, res: Response) {
    try {
      const { dataInizio, dataFine } = req.query;

      const analisi = await newsletterAI.analyzePromotionalPeriods(
        dataInizio ? new Date(dataInizio as string) : undefined,
        dataFine ? new Date(dataFine as string) : undefined
      );

      res.json(analisi);
    } catch (error: any) {
      console.error('[newsletterController] Errore analisi periodi:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Genera newsletter con AI
  async generateWithAI(req: AuthRequest, res: Response) {
    try {
      const {
        tipo,
        tema,
        contenuto,
        eventoPromozionale,
        aziendaNome,
        coloriAziendali,
        includeCTA,
        ctaText,
        ctaUrl
      } = req.body;

      if (!tipo || !tema) {
        return res.status(400).json({ error: "Tipo e tema sono obbligatori" });
      }

      const result = await newsletterAI.generateNewsletterHTML({
        tipo,
        tema,
        contenuto,
        eventoPromozionale,
        aziendaNome,
        coloriAziendali,
        includeCTA,
        ctaText,
        ctaUrl
      });

      res.json(result);
    } catch (error: any) {
      console.error('[newsletterController] Errore generazione AI:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Migliora contenuto esistente
  async improveContent(req: AuthRequest, res: Response) {
    try {
      const { contenutoAttuale, obiettivo } = req.body;

      if (!contenutoAttuale || !obiettivo) {
        return res.status(400).json({ error: "Contenuto attuale e obiettivo sono obbligatori" });
      }

      const contenutoMigliorato = await newsletterAI.improveNewsletterContent(
        contenutoAttuale,
        obiettivo
      );

      res.json({ contenutoMigliorato });
    } catch (error: any) {
      console.error('[newsletterController] Errore miglioramento contenuto:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Suggerisci oggetti email
  async suggestSubjects(req: AuthRequest, res: Response) {
    try {
      const { tema, contenuto } = req.body;

      if (!tema || !contenuto) {
        return res.status(400).json({ error: "Tema e contenuto sono obbligatori" });
      }

      const oggetti = await newsletterAI.suggestSubjectLines(tema, contenuto);

      res.json({ oggetti });
    } catch (error: any) {
      console.error('[newsletterController] Errore suggerimento oggetti:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // === CANVA INTEGRATION ===

  // Ottieni template Canva per newsletter
  async getCanvaTemplates(req: AuthRequest, res: Response) {
    try {
      // Template Canva predefiniti per newsletter
      const templates = [
        {
          id: 'canva-newsletter-1',
          nome: 'Modern Business Newsletter',
          descrizione: 'Template professionale per business newsletter',
          thumbnail: 'https://marketplace.canva.com/templates/newsletter/modern-business',
          categoria: 'business',
          canvaUrl: 'https://www.canva.com/design/newsletter/business-modern/edit'
        },
        {
          id: 'canva-newsletter-2',
          nome: 'E-commerce Promotional',
          descrizione: 'Perfetto per promozioni e offerte e-commerce',
          thumbnail: 'https://marketplace.canva.com/templates/newsletter/ecommerce',
          categoria: 'promozionale',
          canvaUrl: 'https://www.canva.com/design/newsletter/ecommerce-promo/edit'
        },
        {
          id: 'canva-newsletter-3',
          nome: 'Minimalist Newsletter',
          descrizione: 'Design minimalista ed elegante',
          thumbnail: 'https://marketplace.canva.com/templates/newsletter/minimalist',
          categoria: 'informativa',
          canvaUrl: 'https://www.canva.com/design/newsletter/minimalist/edit'
        },
        {
          id: 'canva-newsletter-4',
          nome: 'Event Invitation',
          descrizione: 'Ideale per inviti ed eventi',
          thumbnail: 'https://marketplace.canva.com/templates/newsletter/event',
          categoria: 'evento',
          canvaUrl: 'https://www.canva.com/design/newsletter/event-invitation/edit'
        },
        {
          id: 'canva-newsletter-5',
          nome: 'Black Friday Special',
          descrizione: 'Template ottimizzato per Black Friday',
          thumbnail: 'https://marketplace.canva.com/templates/newsletter/black-friday',
          categoria: 'promozionale',
          canvaUrl: 'https://www.canva.com/design/newsletter/black-friday/edit'
        },
        {
          id: 'canva-newsletter-6',
          nome: 'Christmas Newsletter',
          descrizione: 'Design festivo per il periodo natalizio',
          thumbnail: 'https://marketplace.canva.com/templates/newsletter/christmas',
          categoria: 'promozionale',
          canvaUrl: 'https://www.canva.com/design/newsletter/christmas/edit'
        }
      ];

      const { categoria } = req.query;
      const filtered = categoria
        ? templates.filter(t => t.categoria === categoria)
        : templates;

      res.json({ templates: filtered });
    } catch (error: any) {
      console.error('[newsletterController] Errore recupero template Canva:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Salva design da Canva
  async saveCanvaDesign(req: AuthRequest, res: Response) {
    try {
      const {
        newsletterId,
        canvaDesignId,
        canvaExportUrl,
        htmlContent
      } = req.body;

      if (!newsletterId) {
        return res.status(400).json({ error: "Newsletter ID obbligatorio" });
      }

      const newsletter = await prisma.newsletter.findUnique({
        where: { id: newsletterId }
      });

      if (!newsletter) {
        return res.status(404).json({ error: "Newsletter non trovata" });
      }

      const currentUser = await prisma.user.findUnique({
        where: { id: req.user!.id },
        select: { companyId: true }
      });

      if (newsletter.companyId !== currentUser?.companyId) {
        return res.status(403).json({ error: "Non hai accesso a questa newsletter" });
      }

      // Aggiorna newsletter con contenuto da Canva
      const updated = await prisma.newsletter.update({
        where: { id: newsletterId },
        data: {
          contenutoHTML: htmlContent,
          // Salva metadata Canva in un campo JSON custom se necessario
          aiAnalisiEvento: stringifyJsonField({
            ...JSON.parse(newsletter.aiAnalisiEvento || '{}'),
            canvaDesignId,
            canvaExportUrl,
            canvaImportedAt: new Date().toISOString()
          })
        }
      });

      await prisma.auditLog.create({
        data: {
          entita: "Newsletter",
          entitaId: newsletterId,
          azione: "canva_import",
          autoreId: req.user!.id,
          payload: stringifyJsonField({ canvaDesignId })
        }
      });

      res.json(updated);
    } catch (error: any) {
      console.error('[newsletterController] Errore salvataggio design Canva:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Genera link Canva con autofill
  async generateCanvaEditLink(req: AuthRequest, res: Response) {
    try {
      const { templateId, companyName, brandColors } = req.body;

      // Crea URL Canva con parametri pre-compilati (se supportato dall'API Canva)
      // Nota: Questa è una simulazione, l'API reale Canva richiede autenticazione
      const canvaBaseUrl = 'https://www.canva.com/design/create';
      const params = new URLSearchParams({
        type: 'newsletter',
        template: templateId || '',
        // Parametri personalizzati se supportati da Canva
        ...(companyName && { company: companyName }),
        ...(brandColors && { colors: JSON.stringify(brandColors) })
      });

      const editLink = `${canvaBaseUrl}?${params.toString()}`;

      res.json({
        editLink,
        message: "Apri questo link per modificare il design in Canva",
        instructions: [
          "1. Modifica il design in Canva",
          "2. Esporta come HTML o scarica",
          "3. Incolla l'HTML nell'editor della newsletter"
        ]
      });
    } catch (error: any) {
      console.error('[newsletterController] Errore generazione link Canva:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // === SYNC & AUTOMATION ===

  // Crea task automatici per eventi promozionali
  async initializePromotionalTasks(req: AuthRequest, res: Response) {
    try {
      const currentUser = await prisma.user.findUnique({
        where: { id: req.user!.id },
        select: { companyId: true }
      });

      if (!currentUser?.companyId) {
        return res.status(403).json({ error: "Utente non associato a un'azienda" });
      }

      const result = await newsletterSync.createPromotionalTasks(
        currentUser.companyId,
        req.user!.id
      );

      res.json(result);
    } catch (error: any) {
      console.error('[newsletterController] Errore inizializzazione task:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Test configurazione email
  async testEmailConfiguration(req: AuthRequest, res: Response) {
    try {
      const { testEmail } = req.body;

      if (!testEmail) {
        return res.status(400).json({ error: "Email di test richiesta" });
      }

      const verifyResult = await emailSender.verifyEmailConfiguration();

      if (!verifyResult.success) {
        return res.status(500).json({
          error: "Configurazione email non valida",
          details: verifyResult.error
        });
      }

      const testResult = await emailSender.sendTestEmail(testEmail);

      if (testResult.success) {
        res.json({
          success: true,
          message: `Email di test inviata a ${testEmail}`,
          messageId: testResult.messageId
        });
      } else {
        res.status(500).json({
          success: false,
          error: testResult.error
        });
      }
    } catch (error: any) {
      console.error('[newsletterController] Errore test email:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Verifica newsletter programmate da inviare
  async checkScheduledNewsletters(req: AuthRequest, res: Response) {
    try {
      const result = await newsletterSync.checkScheduledNewsletters();
      res.json(result);
    } catch (error: any) {
      console.error('[newsletterController] Errore check newsletter:', error);
      res.status(500).json({ error: error.message });
    }
  }
}

export default new NewsletterController();
