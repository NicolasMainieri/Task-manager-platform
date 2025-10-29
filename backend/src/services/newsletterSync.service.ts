import prisma from '../config/database';
import { stringifyJsonField } from '../utils/jsonHelper';

/**
 * Crea automaticamente un evento calendario per una newsletter programmata
 */
export async function syncNewsletterToCalendar(newsletterId: string, userId: string) {
  try {
    const newsletter = await prisma.newsletter.findUnique({
      where: { id: newsletterId }
    });

    if (!newsletter) {
      throw new Error('Newsletter non trovata');
    }

    // Solo per newsletter programmate
    if (!newsletter.dataProgrammata || newsletter.tipoProgrammazione === 'manuale') {
      return { success: false, message: 'Newsletter non programmata' };
    }

    // Verifica se esiste già un evento calendario
    const existingEvents = await prisma.calendarEvent.findMany({
      where: {
        titolo: { contains: newsletter.nome },
        dataInizio: newsletter.dataProgrammata
      }
    });

    if (existingEvents.length > 0) {
      console.log('[newsletterSync] Evento calendario già esistente');
      return { success: false, message: 'Evento già esistente' };
    }

    // Crea evento calendario
    const dataFine = new Date(newsletter.dataProgrammata);
    dataFine.setHours(dataFine.getHours() + 1); // Durata 1 ora

    const calendarEvent = await prisma.calendarEvent.create({
      data: {
        titolo: `📧 Newsletter: ${newsletter.nome}`,
        descrizione: `Invio newsletter programmato\n\nOggetto: ${newsletter.oggetto}\nDestinatari: ${newsletter.totaleDestinatari}\n\nNewsletter ID: ${newsletter.id}`,
        tipo: 'reminder',
        dataInizio: newsletter.dataProgrammata,
        dataFine: dataFine,
        allDay: false,
        colore: '#8B5CF6', // Viola per newsletter
        organizerId: userId,
        reminderMinutes: 30, // Reminder 30 minuti prima
        contactIds: stringifyJsonField([])
      }
    });

    console.log('[newsletterSync] Evento calendario creato:', calendarEvent.id);

    return {
      success: true,
      calendarEventId: calendarEvent.id,
      message: 'Evento calendario creato'
    };

  } catch (error: any) {
    console.error('[newsletterSync] Errore sincronizzazione calendario:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Eventi promozionali con date esatte per 2025
 */
const PROMOTIONAL_EVENTS_2025 = [
  {
    name: 'San Valentino',
    key: 'san_valentino',
    date: new Date(2025, 1, 14), // 14 febbraio
    taskDate: new Date(2025, 1, 7), // 7 febbraio (1 settimana prima)
    description: 'Crea newsletter per San Valentino - regali, promozioni romantiche'
  },
  {
    name: 'Festa del Papà',
    key: 'festa_papa',
    date: new Date(2025, 2, 19), // 19 marzo
    taskDate: new Date(2025, 2, 12), // 12 marzo
    description: 'Crea newsletter per Festa del Papà - idee regalo per papà'
  },
  {
    name: 'Pasqua',
    key: 'pasqua',
    date: new Date(2025, 3, 20), // 20 aprile 2025
    taskDate: new Date(2025, 3, 13), // 13 aprile
    description: 'Crea newsletter pasquale - tema primaverile, offerte'
  },
  {
    name: 'Festa della Mamma',
    key: 'festa_mamma',
    date: new Date(2025, 4, 11), // 11 maggio 2025 (seconda domenica)
    taskDate: new Date(2025, 4, 4), // 4 maggio
    description: 'Crea newsletter per Festa della Mamma - regali speciali'
  },
  {
    name: 'Saldi Estivi',
    key: 'estate',
    date: new Date(2025, 6, 1), // 1 luglio
    taskDate: new Date(2025, 5, 24), // 24 giugno
    description: 'Crea newsletter saldi estivi - liquidazione, vacanze'
  },
  {
    name: 'Black Friday',
    key: 'black_friday',
    date: new Date(2025, 10, 28), // 28 novembre 2025
    taskDate: new Date(2025, 10, 21), // 21 novembre
    description: 'Crea newsletter Black Friday - super offerte, urgenza'
  },
  {
    name: 'Cyber Monday',
    key: 'cyber_monday',
    date: new Date(2025, 11, 1), // 1 dicembre 2025
    taskDate: new Date(2025, 10, 24), // 24 novembre
    description: 'Crea newsletter Cyber Monday - tech deals, online'
  },
  {
    name: 'Natale',
    key: 'natale',
    date: new Date(2025, 11, 25), // 25 dicembre
    taskDate: new Date(2025, 11, 10), // 10 dicembre
    description: 'Crea newsletter natalizia - regali, auguri, promozioni festive'
  },
  {
    name: 'Capodanno',
    key: 'capodanno',
    date: new Date(2026, 0, 1), // 1 gennaio 2026
    taskDate: new Date(2025, 11, 26), // 26 dicembre 2025
    description: 'Crea newsletter Capodanno - nuovi inizi, propositi, offerte'
  },
  {
    name: 'Halloween',
    key: 'halloween',
    date: new Date(2025, 9, 31), // 31 ottobre
    taskDate: new Date(2025, 9, 24), // 24 ottobre
    description: 'Crea newsletter Halloween - tema spettrale, offerte spaventose'
  }
];

/**
 * Crea task automatici per tutti gli eventi promozionali dell'anno
 */
export async function createPromotionalTasks(companyId: string, userId: string) {
  try {
    const today = new Date();
    const taskCreatedCount = { total: 0, skipped: 0 };

    for (const event of PROMOTIONAL_EVENTS_2025) {
      // Salta eventi già passati
      if (event.taskDate < today) {
        taskCreatedCount.skipped++;
        continue;
      }

      // Verifica se il task esiste già
      const existingTask = await prisma.task.findFirst({
        where: {
          companyId,
          titolo: { contains: `Newsletter ${event.name}` },
          dataScadenza: {
            gte: new Date(event.taskDate.getFullYear(), event.taskDate.getMonth(), event.taskDate.getDate()),
            lt: new Date(event.taskDate.getFullYear(), event.taskDate.getMonth(), event.taskDate.getDate() + 1)
          }
        }
      });

      if (existingTask) {
        console.log(`[newsletterSync] Task già esistente per ${event.name}`);
        taskCreatedCount.skipped++;
        continue;
      }

      // Crea task
      const task = await prisma.task.create({
        data: {
          titolo: `📧 Newsletter ${event.name}`,
          descrizione: `${event.description}\n\nEvento: ${event.date.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}\n\nRicorda di:\n- Creare design accattivante\n- Preparare offerte speciali\n- Testare su diversi client email\n- Inviare 7-10 giorni prima dell'evento`,
          stato: 'da_fare',
          priorita: 'alta',
          dataScadenza: event.taskDate,
          dataInizio: new Date(event.taskDate.getFullYear(), event.taskDate.getMonth(), event.taskDate.getDate() - 3), // 3 giorni prima
          companyId,
          creatorId: userId,
          tags: stringifyJsonField(['newsletter', 'marketing', event.key])
        }
      });

      // Crea anche evento calendario
      await prisma.calendarEvent.create({
        data: {
          titolo: `🎉 ${event.name}`,
          descrizione: `Evento promozionale: ${event.name}\n\nData evento: ${event.date.toLocaleDateString('it-IT')}\nTask newsletter scadenza: ${event.taskDate.toLocaleDateString('it-IT')}`,
          tipo: 'holiday',
          dataInizio: event.date,
          dataFine: new Date(event.date.getTime() + 24 * 60 * 60 * 1000), // +1 giorno
          allDay: true,
          colore: '#F59E0B', // Arancione per eventi
          organizerId: userId,
          reminderMinutes: 10080, // 7 giorni prima
          contactIds: stringifyJsonField([])
        }
      });

      taskCreatedCount.total++;
      console.log(`[newsletterSync] Task creato per ${event.name}`);
    }

    return {
      success: true,
      message: `Creati ${taskCreatedCount.total} task, saltati ${taskCreatedCount.skipped}`,
      created: taskCreatedCount.total,
      skipped: taskCreatedCount.skipped
    };

  } catch (error: any) {
    console.error('[newsletterSync] Errore creazione task promozionali:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Inizializza task promozionali per una nuova azienda
 */
export async function initializePromotionalTasksForCompany(companyId: string, adminUserId: string) {
  try {
    console.log('[newsletterSync] Inizializzazione task promozionali per company:', companyId);

    const result = await createPromotionalTasks(companyId, adminUserId);

    await prisma.auditLog.create({
      data: {
        entita: 'Task',
        entitaId: companyId,
        azione: 'init_promotional_tasks',
        autoreId: adminUserId,
        payload: stringifyJsonField(result)
      }
    });

    return result;
  } catch (error: any) {
    console.error('[newsletterSync] Errore inizializzazione:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Job scheduler - Da chiamare giornalmente per verificare newsletter da inviare
 */
export async function checkScheduledNewsletters() {
  try {
    const now = new Date();

    // Trova newsletter programmate per oggi che non sono ancora state inviate
    const newslettersToSend = await prisma.newsletter.findMany({
      where: {
        stato: 'programmata',
        dataProgrammata: {
          lte: now // Data programmata <= ora attuale
        }
      }
    });

    console.log(`[newsletterSync] Trovate ${newslettersToSend.length} newsletter da inviare`);

    for (const newsletter of newslettersToSend) {
      // Aggiorna stato a "in_invio"
      await prisma.newsletter.update({
        where: { id: newsletter.id },
        data: { stato: 'in_invio' }
      });

      console.log(`[newsletterSync] Newsletter ${newsletter.id} pronta per invio`);
      // L'invio effettivo verrà gestito da processNewsletterSending
    }

    return {
      success: true,
      newslettersReady: newslettersToSend.length
    };

  } catch (error: any) {
    console.error('[newsletterSync] Errore check newsletter:', error);
    return { success: false, error: error.message };
  }
}
