import { Response } from "express";
import prisma from "../config/database";
import { AuthRequest } from "../middleware/auth";
import noteAIService from "../services/noteAI.service";
import multer from "multer";

// Configurazione multer per upload audio
export const audioUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB max (limite Whisper API)
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      "audio/mpeg",
      "audio/mp3",
      "audio/wav",
      "audio/webm",
      "audio/ogg",
      "video/mp4",
      "video/webm",
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Formato file non supportato"));
    }
  },
});

class NoteController {
  // Ottieni tutte le note dell'utente
  async getNotes(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const { categoria, isArchived, search } = req.query;

      const where: any = {
        OR: [
          { autoreId: userId }, // Note create dall'utente
          { isPublic: true }, // Note pubbliche
          { sharedWith: { contains: userId } }, // Note condivise direttamente
        ]
      };

      if (categoria) {
        where.categoria = categoria;
      }

      if (isArchived !== undefined) {
        where.isArchived = isArchived === 'true';
      }

      if (search) {
        where.AND = [
          {
            OR: [
              { titolo: { contains: search as string } },
              { contenuto: { contains: search as string } }
            ]
          }
        ];
      }

      const notes = await prisma.note.findMany({
        where,
        include: {
          autore: {
            select: {
              id: true,
              nome: true,
              cognome: true,
              avatar: true
            }
          }
        },
        orderBy: [
          { isPinned: 'desc' },
          { updatedAt: 'desc' }
        ]
      });

      res.json(notes);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // Ottieni una singola nota
  async getNote(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      const note = await prisma.note.findUnique({
        where: { id },
        include: {
          autore: {
            select: {
              id: true,
              nome: true,
              cognome: true,
              avatar: true
            }
          }
        }
      });

      if (!note) {
        return res.status(404).json({ error: "Nota non trovata" });
      }

      // Verifica permessi
      const sharedWith = JSON.parse(note.sharedWith || '[]');
      if (note.autoreId !== userId && !note.isPublic && !sharedWith.includes(userId)) {
        return res.status(403).json({ error: "Non hai accesso a questa nota" });
      }

      res.json(note);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // Crea una nuova nota
  async createNote(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const {
        titolo,
        tipo,
        contenuto,
        categoria,
        colore,
        tags,
        isPublic,
        sharedWith,
        teamShared,
        taskId,
        progettoId
      } = req.body;

      const note = await prisma.note.create({
        data: {
          titolo,
          tipo: tipo || 'text',
          contenuto: contenuto || '',
          categoria,
          colore: colore || '#3B82F6',
          tags: JSON.stringify(tags || []),
          isPublic: isPublic || false,
          sharedWith: JSON.stringify(sharedWith || []),
          teamShared: JSON.stringify(teamShared || []),
          taskId,
          progettoId,
          autoreId: userId
        },
        include: {
          autore: {
            select: {
              id: true,
              nome: true,
              cognome: true,
              avatar: true
            }
          }
        }
      });

      res.status(201).json(note);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // Aggiorna una nota
  async updateNote(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      const {
        titolo,
        tipo,
        contenuto,
        categoria,
        colore,
        tags,
        isPublic,
        sharedWith,
        teamShared,
        isPinned,
        isFavorite,
        isArchived,
        taskId,
        progettoId
      } = req.body;

      const existingNote = await prisma.note.findUnique({
        where: { id }
      });

      if (!existingNote) {
        return res.status(404).json({ error: "Nota non trovata" });
      }

      // Solo l'autore può modificare la nota
      if (existingNote.autoreId !== userId) {
        return res.status(403).json({ error: "Non hai permessi per modificare questa nota" });
      }

      const updateData: any = {};
      if (titolo !== undefined) updateData.titolo = titolo;
      if (tipo !== undefined) updateData.tipo = tipo;
      if (contenuto !== undefined) updateData.contenuto = contenuto;
      if (categoria !== undefined) updateData.categoria = categoria;
      if (colore !== undefined) updateData.colore = colore;
      if (tags !== undefined) updateData.tags = JSON.stringify(tags);
      if (isPublic !== undefined) updateData.isPublic = isPublic;
      if (sharedWith !== undefined) updateData.sharedWith = JSON.stringify(sharedWith);
      if (teamShared !== undefined) updateData.teamShared = JSON.stringify(teamShared);
      if (isPinned !== undefined) updateData.isPinned = isPinned;
      if (isFavorite !== undefined) updateData.isFavorite = isFavorite;
      if (isArchived !== undefined) updateData.isArchived = isArchived;
      if (taskId !== undefined) updateData.taskId = taskId;
      if (progettoId !== undefined) updateData.progettoId = progettoId;

      const note = await prisma.note.update({
        where: { id },
        data: updateData,
        include: {
          autore: {
            select: {
              id: true,
              nome: true,
              cognome: true,
              avatar: true
            }
          }
        }
      });

      res.json(note);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // Elimina una nota
  async deleteNote(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      const existingNote = await prisma.note.findUnique({
        where: { id }
      });

      if (!existingNote) {
        return res.status(404).json({ error: "Nota non trovata" });
      }

      // Solo l'autore può eliminare la nota
      if (existingNote.autoreId !== userId) {
        return res.status(403).json({ error: "Non hai permessi per eliminare questa nota" });
      }

      await prisma.note.delete({
        where: { id }
      });

      res.json({ message: "Nota eliminata con successo" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // Ottieni categorie disponibili
  async getCategories(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;

      const notes = await prisma.note.findMany({
        where: {
          OR: [
            { autoreId: userId },
            { isPublic: true },
            { sharedWith: { contains: userId } }
          ],
          categoria: { not: null }
        },
        select: {
          categoria: true
        },
        distinct: ['categoria']
      });

      const categories = notes
        .map(n => n.categoria)
        .filter(c => c !== null);

      res.json(categories);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // ==================== AI FEATURES ====================

  // Genera riassunto
  async generateSummary(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      const note = await prisma.note.findUnique({ where: { id } });
      if (!note) {
        return res.status(404).json({ error: "Nota non trovata" });
      }

      // Verifica permessi
      const sharedWith = JSON.parse(note.sharedWith || '[]');
      if (note.autoreId !== userId && !note.isPublic && !sharedWith.includes(userId)) {
        return res.status(403).json({ error: "Non hai accesso a questa nota" });
      }

      const summary = await noteAIService.generateSummary(note.contenuto);

      // Aggiorna la nota con il riassunto
      await prisma.note.update({
        where: { id },
        data: { aiSummary: summary }
      });

      res.json({ summary });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // Genera bullet points
  async generateBullets(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      const note = await prisma.note.findUnique({ where: { id } });
      if (!note) {
        return res.status(404).json({ error: "Nota non trovata" });
      }

      // Verifica permessi
      const sharedWith = JSON.parse(note.sharedWith || '[]');
      if (note.autoreId !== userId && !note.isPublic && !sharedWith.includes(userId)) {
        return res.status(403).json({ error: "Non hai accesso a questa nota" });
      }

      const bullets = await noteAIService.generateBulletPoints(note.contenuto);

      res.json({ bullets });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // Correggi grammatica
  async correctGrammar(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      const note = await prisma.note.findUnique({ where: { id } });
      if (!note) {
        return res.status(404).json({ error: "Nota non trovata" });
      }

      // Solo l'autore può modificare
      if (note.autoreId !== userId) {
        return res.status(403).json({ error: "Non hai permessi per modificare questa nota" });
      }

      const correctedText = await noteAIService.correctGrammar(note.contenuto);

      // Aggiorna la nota con il testo corretto
      const updatedNote = await prisma.note.update({
        where: { id },
        data: { contenuto: correctedText }
      });

      res.json({ contenuto: correctedText });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // Traduci nota
  async translateNote(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { targetLang = 'en' } = req.body;
      const userId = req.user!.id;

      const note = await prisma.note.findUnique({ where: { id } });
      if (!note) {
        return res.status(404).json({ error: "Nota non trovata" });
      }

      // Verifica permessi
      const sharedWith = JSON.parse(note.sharedWith || '[]');
      if (note.autoreId !== userId && !note.isPublic && !sharedWith.includes(userId)) {
        return res.status(403).json({ error: "Non hai accesso a questa nota" });
      }

      const translatedText = await noteAIService.translate(note.contenuto, targetLang);

      res.json({ translation: translatedText, targetLang });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // Espandi nota
  async expandNote(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      const note = await prisma.note.findUnique({ where: { id } });
      if (!note) {
        return res.status(404).json({ error: "Nota non trovata" });
      }

      // Solo l'autore può modificare
      if (note.autoreId !== userId) {
        return res.status(403).json({ error: "Non hai permessi per modificare questa nota" });
      }

      const expandedText = await noteAIService.expandNote(note.contenuto);

      // Aggiorna la nota con il testo espanso
      const updatedNote = await prisma.note.update({
        where: { id },
        data: { contenuto: expandedText }
      });

      res.json({ contenuto: expandedText });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // Genera nota da prompt
  async generateFromPrompt(req: AuthRequest, res: Response) {
    try {
      const { prompt, progettoId, taskId } = req.body;
      const userId = req.user!.id;

      if (!prompt) {
        return res.status(400).json({ error: "Prompt richiesto" });
      }

      const { titolo, contenuto } = await noteAIService.generateFromPrompt(prompt, userId);

      // Crea la nota generata dall'AI
      const note = await prisma.note.create({
        data: {
          titolo,
          contenuto,
          tipo: 'ai_generated',
          aiGenerated: true,
          aiPrompt: prompt,
          autoreId: userId,
          progettoId,
          taskId
        },
        include: {
          autore: {
            select: {
              id: true,
              nome: true,
              cognome: true,
              avatar: true
            }
          }
        }
      });

      res.status(201).json(note);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // Trascrivi audio
  async transcribeAudio(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const { videoCallId, language = 'it' } = req.body;

      // Multer processa il file
      const file = (req as any).file;
      if (!file) {
        return res.status(400).json({ error: "File audio richiesto" });
      }

      // Trascrivi con Whisper
      const { text, duration, language: detectedLang } = await noteAIService.transcribeAudio(
        file.buffer,
        file.originalname,
        language
      );

      // Genera analisi della trascrizione
      const analysis = await noteAIService.generateNotesFromTranscription(text);

      // Crea nota di trascrizione
      const note = await prisma.note.create({
        data: {
          titolo: `Trascrizione ${videoCallId ? `Videochiamata ${videoCallId.slice(0, 8)}` : new Date().toLocaleDateString('it-IT')}`,
          contenuto: text,
          tipo: 'transcription',
          isTranscription: true,
          videoCallId,
          transcriptionLang: detectedLang,
          transcriptionDuration: duration,
          aiSummary: analysis.summary,
          aiGenerated: true,
          autoreId: userId
        },
        include: {
          autore: {
            select: {
              id: true,
              nome: true,
              cognome: true,
              avatar: true
            }
          }
        }
      });

      res.status(201).json({
        note,
        analysis: {
          summary: analysis.summary,
          actionItems: analysis.actionItems,
          keyPoints: analysis.keyPoints
        }
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // Genera riassunto meeting
  async generateMeetingSummary(req: AuthRequest, res: Response) {
    try {
      const { roomId } = req.params;

      const summary = await noteAIService.generateMeetingSummary(roomId);

      res.json(summary);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // Genera e salva note complete del meeting
  async generateAndSaveMeetingNotes(req: AuthRequest, res: Response) {
    try {
      const { roomId } = req.params;
      const userId = req.user!.id;

      const noteContent = await noteAIService.generateMeetingNotes(roomId);
      const summary = await noteAIService.generateMeetingSummary(roomId);

      // Salva la nota
      const note = await prisma.note.create({
        data: {
          titolo: summary.titolo,
          contenuto: noteContent,
          tipo: 'ai_generated',
          aiGenerated: true,
          aiSummary: summary.summary,
          videoCallId: roomId,
          autoreId: userId
        },
        include: {
          autore: {
            select: {
              id: true,
              nome: true,
              cognome: true,
              avatar: true
            }
          }
        }
      });

      res.status(201).json({
        note,
        summary,
        actionItems: summary.actionItems,
        keyPoints: summary.keyPoints
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}

export default new NoteController();
