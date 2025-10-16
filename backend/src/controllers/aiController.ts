import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import {
  aiTaskService,
  aiTicketService,
  aiProductivityService,
  aiNotesService,
  aiEmailCalendarService,
  aiChatbotService
} from '../services/openai.service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * AI Task Assistant
 */
export const suggestTaskMetadata = async (req: AuthRequest, res: Response) => {
  try {
    const { titolo, descrizione } = req.body;

    if (!titolo) {
      return res.status(400).json({ error: 'Titolo del task richiesto' });
    }

    const suggestions = await aiTaskService.suggestTaskMetadata(titolo, descrizione);
    res.json(suggestions);
  } catch (error: any) {
    console.error('Errore suggerimento metadata task:', error);
    res.status(500).json({ error: error.message || 'Errore nel suggerimento metadata task' });
  }
};

export const generateSubtasks = async (req: AuthRequest, res: Response) => {
  try {
    const { titolo, descrizione, numSubtasks } = req.body;

    if (!titolo) {
      return res.status(400).json({ error: 'Titolo del task richiesto' });
    }

    const subtasks = await aiTaskService.generateSubtasks(titolo, descrizione, numSubtasks);
    res.json(subtasks);
  } catch (error: any) {
    console.error('Errore generazione subtask:', error);
    res.status(500).json({ error: error.message || 'Errore nella generazione subtask' });
  }
};

export const estimateTaskTime = async (req: AuthRequest, res: Response) => {
  try {
    const { titolo, descrizione, difficolta } = req.body;

    if (!titolo || difficolta === undefined) {
      return res.status(400).json({ error: 'Titolo e difficoltà richiesti' });
    }

    // Trova task simili completati per migliorare la stima
    const userId = req.user!.id;
    const similarTasks = await prisma.task.findMany({
      where: {
        OR: [{ ownerId: userId }, { assignees: { some: { id: userId } } }],
        stato: 'completato',
        titolo: { contains: titolo.split(' ')[0] } // Cerca task con parole simili nel titolo
      },
      select: {
        titolo: true,
        createdAt: true,
        updatedAt: true
      },
      take: 5
    });

    const similarTasksData = similarTasks.map(t => ({
      titolo: t.titolo,
      tempoImpiegato: Math.round(
        (new Date(t.updatedAt).getTime() - new Date(t.createdAt).getTime()) / (1000 * 60 * 60)
      )
    }));

    const estimate = await aiTaskService.estimateCompletionTime(
      titolo,
      descrizione,
      difficolta,
      similarTasksData.length > 0 ? similarTasksData : undefined
    );

    res.json(estimate);
  } catch (error: any) {
    console.error('Errore stima tempo task:', error);
    res.status(500).json({ error: error.message || 'Errore nella stima tempo task' });
  }
};

export const analyzeAllTasks = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    // Ottieni tutti i task dell'utente
    const allTasks = await prisma.task.findMany({
      where: {
        OR: [
          { ownerId: userId },
          { assignees: { some: { id: userId } } }
        ]
      },
      select: {
        id: true,
        titolo: true,
        priorita: true,
        difficolta: true,
        stato: true,
        scadenza: true,
        createdAt: true,
        updatedAt: true
      }
    });

    const now = new Date();

    // Raggruppa i task
    const completati = allTasks
      .filter(t => t.stato === 'completato')
      .map(t => ({
        titolo: t.titolo,
        priorita: t.priorita,
        difficolta: t.difficolta || 3,
        tempoImpiegato: t.updatedAt && t.createdAt
          ? Math.round((t.updatedAt.getTime() - t.createdAt.getTime()) / (1000 * 60 * 60))
          : undefined
      }));

    const inCorso = allTasks
      .filter(t => t.stato === 'in_corso' || t.stato === 'da_fare')
      .map(t => ({
        titolo: t.titolo,
        priorita: t.priorita,
        difficolta: t.difficolta || 3,
        scadenza: t.scadenza?.toISOString()
      }));

    const scaduti = allTasks
      .filter(t => t.stato !== 'completato' && t.scadenza && t.scadenza < now)
      .map(t => ({
        titolo: t.titolo,
        priorita: t.priorita,
        difficolta: t.difficolta || 3,
        giorniScaduti: Math.ceil((now.getTime() - t.scadenza!.getTime()) / (1000 * 60 * 60 * 24))
      }));

    const analysis = await aiTaskService.analyzeAllTasks({
      completati,
      inCorso,
      scaduti,
      totali: allTasks.length
    });

    res.json(analysis);
  } catch (error: any) {
    console.error('Errore analisi task:', error);
    res.status(500).json({ error: error.message || 'Errore nell\'analisi task' });
  }
};

export const analyzeCompanyPerformance = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    // Verifica che l'utente sia admin
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { role: true }
    });

    if (!user?.role || user.role.nome !== 'Admin') {
      return res.status(403).json({ error: 'Solo gli admin possono accedere a questa analisi' });
    }

    const companyId = user.companyId;

    if (!companyId) {
      return res.status(400).json({ error: 'Admin non associato a una company' });
    }

    // Ottieni tutti gli utenti dell'azienda
    const employees = await prisma.user.findMany({
      where: { companyId },
      select: {
        id: true,
        nome: true,
        cognome: true,
        role: { select: { nome: true } }
      }
    });

    // Ottieni tutti i task dell'azienda (filtra per owner.companyId)
    const allTasks = await prisma.task.findMany({
      where: {
        owner: { companyId }
      },
      select: {
        stato: true,
        priorita: true,
        ownerId: true,
        scadenza: true,
        createdAt: true,
        updatedAt: true
      }
    });

    const now = new Date();

    // Calcola metriche per dipendente
    const employeesData = employees.map(emp => {
      const empTasks = allTasks.filter(t => t.ownerId === emp.id);
      const completati = empTasks.filter(t => t.stato === 'completato');
      const inCorso = empTasks.filter(t => t.stato === 'in_corso' || t.stato === 'da_fare');
      const scaduti = empTasks.filter(t => t.stato !== 'completato' && t.scadenza && t.scadenza < now);

      const tempoMedio = completati.length > 0
        ? completati.reduce((acc, t) => {
            const tempo = (t.updatedAt.getTime() - t.createdAt.getTime()) / (1000 * 60 * 60);
            return acc + tempo;
          }, 0) / completati.length
        : undefined;

      return {
        nome: emp.nome,
        cognome: emp.cognome,
        ruolo: emp.role?.nome || 'N/A',
        tasksCompletati: completati.length,
        tasksInCorso: inCorso.length,
        tasksScaduti: scaduti.length,
        tempoMedioCompletamento: tempoMedio
      };
    });

    // Calcola metriche globali
    const tasksByPriority = {
      alta: allTasks.filter(t => t.priorita === 'alta').length,
      media: allTasks.filter(t => t.priorita === 'media').length,
      bassa: allTasks.filter(t => t.priorita === 'bassa').length
    };

    const completedTasks = allTasks.filter(t => t.stato === 'completato').length;
    const completionRate = allTasks.length > 0 ? (completedTasks / allTasks.length) * 100 : 0;

    const analysis = await aiTaskService.analyzeCompanyPerformance({
      totalEmployees: employees.length,
      totalTasks: allTasks.length,
      employeesData,
      tasksByPriority,
      completionRate
    });

    res.json(analysis);
  } catch (error: any) {
    console.error('Errore analisi performance aziendale:', error);
    res.status(500).json({ error: error.message || 'Errore nell\'analisi performance aziendale' });
  }
};

/**
 * AI Ticket Routing
 */
export const analyzeTicket = async (req: AuthRequest, res: Response) => {
  try {
    const { titolo, descrizione } = req.body;
    const userId = req.user!.id;

    if (!titolo || !descrizione) {
      return res.status(400).json({ error: 'Titolo e descrizione richiesti' });
    }

    // Ottieni company dell'utente
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { companyId: true }
    });

    if (!user?.companyId) {
      return res.status(400).json({ error: 'Utente non associato a una company' });
    }

    // Ottieni ruoli e categorie disponibili
    const roles = await prisma.role.findMany({
      where: {
        OR: [{ isSystem: true }, { companyId: user.companyId }]
      },
      select: { id: true, nome: true, descrizione: true }
    });

    const categories = await prisma.ticketCategory.findMany({
      where: { companyId: user.companyId },
      include: { targetRole: { select: { nome: true } } }
    });

    const analysis = await aiTicketService.analyzeTicketContent(
      titolo,
      descrizione,
      roles.map(r => ({ ...r, descrizione: r.descrizione || undefined })),
      categories
    );

    res.json(analysis);
  } catch (error: any) {
    console.error('Errore analisi ticket:', error);
    res.status(500).json({ error: error.message || 'Errore nell\'analisi ticket' });
  }
};

export const suggestTicketSolutions = async (req: AuthRequest, res: Response) => {
  try {
    const { ticketId } = req.params;
    const userId = req.user!.id;

    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      select: { titolo: true, descrizione: true, companyId: true }
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket non trovato' });
    }

    // Trova ticket simili risolti
    const resolvedTickets = await prisma.ticket.findMany({
      where: {
        companyId: ticket.companyId,
        stato: 'risolto',
        titolo: { contains: ticket.titolo.split(' ')[0] }
      },
      include: {
        risposte: {
          where: { isAdmin: true },
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      },
      take: 5
    });

    const similarTicketsData = resolvedTickets
      .filter(t => t.risposte.length > 0)
      .map(t => ({
        titolo: t.titolo,
        descrizione: t.descrizione || '',
        soluzione: t.risposte[0]?.contenuto || ''
      }));

    const suggestions = await aiTicketService.suggestSolutions(
      `${ticket.titolo}\n${ticket.descrizione}`,
      similarTicketsData
    );

    res.json(suggestions);
  } catch (error: any) {
    console.error('Errore suggerimento soluzioni ticket:', error);
    res.status(500).json({ error: error.message || 'Errore nel suggerimento soluzioni' });
  }
};

export const analyzeSentiment = async (req: AuthRequest, res: Response) => {
  try {
    const { contenuto } = req.body;

    if (!contenuto) {
      return res.status(400).json({ error: 'Contenuto richiesto' });
    }

    const sentiment = await aiTicketService.analyzeSentiment(contenuto);
    res.json(sentiment);
  } catch (error: any) {
    console.error('Errore analisi sentiment:', error);
    res.status(500).json({ error: error.message || 'Errore nell\'analisi sentiment' });
  }
};

export const suggestTicketRouting = async (req: AuthRequest, res: Response) => {
  try {
    const { titolo, descrizione, priorita } = req.body;
    const userId = req.user!.id;

    if (!titolo || !descrizione) {
      return res.status(400).json({ error: 'Titolo e descrizione richiesti' });
    }

    // Ottieni company dell'utente
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { companyId: true }
    });

    if (!user?.companyId) {
      return res.status(400).json({ error: 'Utente non associato a una company' });
    }

    // Ottieni ruoli e team disponibili
    const roles = await prisma.role.findMany({
      where: {
        OR: [{ isSystem: true }, { companyId: user.companyId }]
      },
      select: { id: true, nome: true, descrizione: true }
    });

    const teams = await prisma.team.findMany({
      where: { users: { some: { companyId: user.companyId } } },
      select: { nome: true }
    });

    const routing = await aiTicketService.suggestRouting(
      titolo,
      descrizione,
      priorita || 'media',
      roles.map(r => ({ nome: r.nome, descrizione: r.descrizione || '' })),
      teams.map(t => t.nome)
    );

    res.json(routing);
  } catch (error: any) {
    console.error('Errore suggerimento routing:', error);
    res.status(500).json({ error: error.message || 'Errore nel suggerimento routing' });
  }
};

export const findSimilarTickets = async (req: AuthRequest, res: Response) => {
  try {
    const { titolo, descrizione } = req.body;
    const userId = req.user!.id;

    if (!titolo) {
      return res.status(400).json({ error: 'Titolo richiesto' });
    }

    // Ottieni company dell'utente
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { companyId: true }
    });

    if (!user?.companyId) {
      return res.status(400).json({ error: 'Utente non associato a una company' });
    }

    // Trova tutti i ticket della company
    const allTickets = await prisma.ticket.findMany({
      where: { companyId: user.companyId },
      select: {
        id: true,
        titolo: true,
        descrizione: true,
        stato: true,
        priorita: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    const similar = await aiTicketService.findSimilarTickets(
      titolo,
      descrizione || '',
      allTickets
    );

    res.json(similar);
  } catch (error: any) {
    console.error('Errore ricerca ticket simili:', error);
    res.status(500).json({ error: error.message || 'Errore nella ricerca ticket simili' });
  }
};

/**
 * AI Productivity Analysis
 */
export const analyzeProductivity = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    // Raccolta dati produttività utente
    const completedTasks = await prisma.task.count({
      where: {
        OR: [{ ownerId: userId }, { assignees: { some: { id: userId } } }],
        stato: 'completato'
      }
    });

    const tasks = await prisma.task.findMany({
      where: {
        OR: [{ ownerId: userId }, { assignees: { some: { id: userId } } }],
        stato: 'completato'
      },
      select: {
        createdAt: true,
        updatedAt: true,
        scadenza: true
      }
    });

    const avgCompletionTime =
      tasks.length > 0
        ? tasks.reduce(
            (sum, t) =>
              sum +
              (new Date(t.updatedAt).getTime() - new Date(t.createdAt).getTime()) /
                (1000 * 60 * 60),
            0
          ) / tasks.length
        : 0;

    const missedDeadlines = tasks.filter(
      t => t.scadenza && new Date(t.updatedAt) > new Date(t.scadenza)
    ).length;

    // Distribuzione ore di lavoro (semplificata)
    const workingHoursDistribution = tasks.reduce((acc: Record<string, number>, t) => {
      const hour = new Date(t.createdAt).getHours();
      const period =
        hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
      acc[period] = (acc[period] || 0) + 1;
      return acc;
    }, {});

    const analysis = await aiProductivityService.analyzeProductivityPatterns({
      completedTasks,
      averageCompletionTime: avgCompletionTime,
      missedDeadlines,
      workingHoursDistribution
    });

    res.json(analysis);
  } catch (error: any) {
    console.error('Errore analisi produttività:', error);
    res.status(500).json({ error: error.message || 'Errore nell\'analisi produttività' });
  }
};

/**
 * AI Notes Assistant
 */
export const summarizeNote = async (req: AuthRequest, res: Response) => {
  try {
    const { titolo, contenuto, maxWords } = req.body;
    const userId = req.user!.id;

    if (!contenuto) {
      return res.status(400).json({ error: 'Contenuto nota richiesto' });
    }

    const summary = await aiNotesService.summarizeNote(contenuto, maxWords);
    res.json(summary);
  } catch (error: any) {
    console.error('Errore riassunto nota:', error);
    res.status(500).json({ error: error.message || 'Errore nel riassunto nota' });
  }
};

export const extractActionItems = async (req: AuthRequest, res: Response) => {
  try {
    const { titolo, contenuto } = req.body;
    const userId = req.user!.id;

    if (!contenuto) {
      return res.status(400).json({ error: 'Contenuto nota richiesto' });
    }

    const actionItems = await aiNotesService.extractActionItems(contenuto);
    res.json(actionItems);
  } catch (error: any) {
    console.error('Errore estrazione action items:', error);
    res.status(500).json({ error: error.message || 'Errore nell\'estrazione action items' });
  }
};

export const findRelatedNotes = async (req: AuthRequest, res: Response) => {
  try {
    const { titolo, contenuto } = req.body;
    const userId = req.user!.id;

    if (!contenuto) {
      return res.status(400).json({ error: 'Contenuto nota richiesto' });
    }

    const allNotes = await prisma.note.findMany({
      where: {
        autoreId: userId
      },
      select: { id: true, titolo: true, contenuto: true, tipo: true }
    });

    const relatedNotes = await aiNotesService.findRelatedNotes(
      contenuto,
      allNotes
    );

    res.json(relatedNotes);
  } catch (error: any) {
    console.error('Errore ricerca note correlate:', error);
    res.status(500).json({ error: error.message || 'Errore nella ricerca note correlate' });
  }
};

/**
 * AI Email & Calendar Assistant
 */
export const suggestEmailResponse = async (req: AuthRequest, res: Response) => {
  try {
    const { emailContent, context, tone } = req.body;

    if (!emailContent) {
      return res.status(400).json({ error: 'Contenuto email richiesto' });
    }

    const suggestion = await aiEmailCalendarService.suggestEmailResponse(
      emailContent,
      context,
      tone || 'formal'
    );

    res.json(suggestion);
  } catch (error: any) {
    console.error('Errore suggerimento risposta email:', error);
    res.status(500).json({
      error: error.message || 'Errore nel suggerimento risposta email'
    });
  }
};

export const extractMeetingsAndDeadlines = async (req: AuthRequest, res: Response) => {
  try {
    const { emailContent } = req.body;

    if (!emailContent) {
      return res.status(400).json({ error: 'Contenuto email richiesto' });
    }

    const extracted = await aiEmailCalendarService.extractMeetingsAndDeadlines(emailContent);
    res.json(extracted);
  } catch (error: any) {
    console.error('Errore estrazione meeting/deadline:', error);
    res.status(500).json({
      error: error.message || 'Errore nell\'estrazione meeting/deadline'
    });
  }
};

export const suggestMeetingSlots = async (req: AuthRequest, res: Response) => {
  try {
    const { participants, duration, existingMeetings, workingHours } = req.body;

    if (!participants || !duration) {
      return res.status(400).json({ error: 'Partecipanti e durata richiesti' });
    }

    const suggestions = await aiEmailCalendarService.suggestMeetingSlots(
      participants,
      duration,
      existingMeetings || [],
      workingHours || { start: '09:00', end: '18:00' }
    );

    res.json(suggestions);
  } catch (error: any) {
    console.error('Errore suggerimento slot meeting:', error);
    res.status(500).json({
      error: error.message || 'Errore nel suggerimento slot meeting'
    });
  }
};

export const analyzeCalendar = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    // Ottieni eventi futuri dal calendario
    const upcomingEvents = await prisma.calendarEvent.findMany({
      where: {
        OR: [
          { organizerId: userId },
          { partecipanti: { some: { id: userId } } }
        ],
        dataInizio: {
          gte: new Date(),
          lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // prossimi 30 giorni
        }
      },
      include: {
        organizer: { select: { nome: true, cognome: true } },
        partecipanti: { select: { nome: true, cognome: true } }
      },
      orderBy: { dataInizio: 'asc' }
    });

    // Ottieni task con scadenze imminenti
    const upcomingDeadlines = await prisma.task.findMany({
      where: {
        OR: [{ ownerId: userId }, { assignees: { some: { id: userId } } }],
        stato: { not: 'completato' },
        scadenza: {
          gte: new Date(),
          lte: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // prossimi 14 giorni
        }
      },
      select: {
        titolo: true,
        descrizione: true,
        scadenza: true,
        priorita: true
      },
      orderBy: { scadenza: 'asc' }
    });

    // Formatta dati per AI
    const eventsFormatted = upcomingEvents.map(e => ({
      titolo: e.titolo,
      data: e.dataInizio.toISOString(),
      durata: Math.round((e.dataFine.getTime() - e.dataInizio.getTime()) / (1000 * 60)),
      partecipanti: e.partecipanti.map(p => `${p.nome} ${p.cognome}`)
    }));

    const deadlinesFormatted = upcomingDeadlines.map(d => ({
      descrizione: d.titolo,
      data: d.scadenza!.toISOString(),
      priorita: d.priorita
    }));

    const analysis = await aiEmailCalendarService.analyzeCalendar(
      eventsFormatted,
      deadlinesFormatted
    );

    res.json(analysis);
  } catch (error: any) {
    console.error('Errore analisi calendario:', error);
    res.status(500).json({
      error: error.message || 'Errore nell\'analisi calendario'
    });
  }
};

/**
 * AI Chatbot
 */
export const chatbotAsk = async (req: AuthRequest, res: Response) => {
  try {
    const { question } = req.body;
    const userId = req.user!.id;

    if (!question) {
      return res.status(400).json({ error: 'Domanda richiesta' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { companyId: true }
    });

    // Cerca task rilevanti dell'utente
    const relevantTasks = await prisma.task.findMany({
      where: {
        OR: [
          { ownerId: userId },
          { assignees: { some: { id: userId } } }
        ]
      },
      select: {
        id: true,
        titolo: true,
        descrizione: true,
        stato: true,
        priorita: true,
        scadenza: true
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    // Cerca note rilevanti
    const relevantNotes = await prisma.note.findMany({
      where: {
        autoreId: userId,
        isArchived: false
      },
      select: {
        id: true,
        titolo: true,
        contenuto: true,
        tipo: true
      },
      orderBy: { updatedAt: 'desc' },
      take: 5
    });

    // Cerca ticket rilevanti
    const relevantTickets = await prisma.ticket.findMany({
      where: {
        OR: [
          { autoreId: userId },
          { assignedToId: userId },
          { takenByUserId: userId }
        ]
      },
      select: {
        id: true,
        titolo: true,
        descrizione: true,
        stato: true
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    // Cerca eventi calendario
    const relevantEvents = await prisma.calendarEvent.findMany({
      where: {
        OR: [
          { organizerId: userId },
          { partecipanti: { some: { id: userId } } }
        ],
        dataInizio: {
          gte: new Date() // Solo eventi futuri
        }
      },
      select: {
        titolo: true,
        dataInizio: true,
        dataFine: true,
        descrizione: true
      },
      orderBy: { dataInizio: 'asc' },
      take: 5
    });

    // Costruisci context dettagliato
    let companyKnowledge = '';

    if (relevantTasks.length > 0) {
      companyKnowledge += `\n\nTASK DELL'UTENTE:\n`;
      relevantTasks.forEach(t => {
        companyKnowledge += `- "${t.titolo}" (${t.stato}, priorità: ${t.priorita})`;
        if (t.scadenza) {
          const scadenzaDate = new Date(t.scadenza);
          companyKnowledge += ` - Scadenza: ${scadenzaDate.toLocaleDateString('it-IT')}`;
        }
        companyKnowledge += `\n`;
      });
    }

    if (relevantTickets.length > 0) {
      companyKnowledge += `\n\nTICKET:\n`;
      relevantTickets.forEach(t => {
        companyKnowledge += `- "${t.titolo}" (${t.stato}): ${t.descrizione.substring(0, 100)}\n`;
      });
    }

    if (relevantEvents.length > 0) {
      companyKnowledge += `\n\nEVENTI CALENDARIO:\n`;
      relevantEvents.forEach(e => {
        const dataInizio = new Date(e.dataInizio);
        companyKnowledge += `- "${e.titolo}" - ${dataInizio.toLocaleString('it-IT')}\n`;
      });
    }

    const answer = await aiChatbotService.answerQuestion(question, {
      companyKnowledge,
      relevantTasks: relevantTasks.map(t => ({
        titolo: t.titolo,
        descrizione: t.descrizione || ''
      })),
      relevantDocuments: relevantNotes.map(n => ({
        titolo: n.titolo,
        contenuto: n.contenuto.substring(0, 500) // Limita contenuto note
      }))
    });

    res.json(answer);
  } catch (error: any) {
    console.error('Errore chatbot:', error);
    res.status(500).json({ error: error.message || 'Errore nel chatbot' });
  }
};

export const generateOnboarding = async (req: AuthRequest, res: Response) => {
  try {
    const { employeeId } = req.params;
    const requestingUserId = req.user!.id;

    // Verifica che l'utente richiedente sia un admin
    const requestingUser = await prisma.user.findUnique({
      where: { id: requestingUserId },
      include: { role: true }
    });

    if (requestingUser?.role?.nome !== 'Admin') {
      return res.status(403).json({ error: 'Solo gli admin possono generare onboarding' });
    }

    const employee = await prisma.user.findUnique({
      where: { id: employeeId },
      include: {
        role: true,
        company: true
      }
    });

    if (!employee) {
      return res.status(404).json({ error: 'Dipendente non trovato' });
    }

    // Ottieni informazioni sulla company
    const teams = await prisma.team.findMany({
      where: { users: { some: { companyId: employee.companyId! } } },
      select: { nome: true },
      take: 5
    });

    const projects = await prisma.task.findMany({
      where: {
        OR: [
          { ownerId: employee.id },
          { assignees: { some: { companyId: employee.companyId! } } }
        ]
      },
      select: { titolo: true },
      take: 5
    });

    const onboarding = await aiChatbotService.generateOnboardingContent(
      employee.role?.nome || 'Dipendente',
      {
        name: employee.company?.nome || 'Azienda',
        industry: 'Technology', // TODO: aggiungere al modello Company
        teamStructure: teams.map(t => t.nome).join(', '),
        mainProjects: projects.map(p => p.titolo)
      }
    );

    res.json(onboarding);
  } catch (error: any) {
    console.error('Errore generazione onboarding:', error);
    res.status(500).json({ error: error.message || 'Errore nella generazione onboarding' });
  }
};

