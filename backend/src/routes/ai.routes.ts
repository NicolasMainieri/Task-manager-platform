import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import * as aiController from '../controllers/aiController';

const router = Router();

// Tutte le route AI richiedono autenticazione
router.use(authenticate);

/**
 * Task AI Assistant
 * POST /api/ai/tasks/suggest-metadata - Suggerisce priorità e difficoltà
 * POST /api/ai/tasks/generate-subtasks - Genera subtask automaticamente
 * POST /api/ai/tasks/estimate-time - Stima tempo di completamento
 * POST /api/ai/tasks/analyze-all - Analizza tutti i task (completati, in corso, scaduti)
 */
router.post('/tasks/suggest-metadata', aiController.suggestTaskMetadata);
router.post('/tasks/generate-subtasks', aiController.generateSubtasks);
router.post('/tasks/estimate-time', aiController.estimateTaskTime);
router.post('/tasks/analyze-all', aiController.analyzeAllTasks);

/**
 * Ticket AI Routing & Analysis
 * POST /api/ai/tickets/analyze - Analizza contenuto ticket e suggerisce routing
 * POST /api/ai/tickets/suggest-routing - Suggerisce routing ottimale per il ticket
 * POST /api/ai/tickets/find-similar - Trova ticket simili risolti
 * GET /api/ai/tickets/:ticketId/suggest-solutions - Suggerisce soluzioni basate su ticket simili
 * POST /api/ai/tickets/analyze-sentiment - Analizza sentiment di un messaggio
 */
router.post('/tickets/analyze', aiController.analyzeTicket);
router.post('/tickets/suggest-routing', aiController.suggestTicketRouting);
router.post('/tickets/find-similar', aiController.findSimilarTickets);
router.get('/tickets/:ticketId/suggest-solutions', aiController.suggestTicketSolutions);
router.post('/tickets/analyze-sentiment', aiController.analyzeSentiment);

/**
 * Productivity Analysis
 * POST /api/ai/productivity/analyze - Analizza produttività e suggerisce miglioramenti
 */
router.post('/productivity/analyze', aiController.analyzeProductivity);

/**
 * Notes AI Assistant
 * POST /api/ai/notes/summarize - Riassume una nota
 * POST /api/ai/notes/extract-actions - Estrae action items da una nota
 * POST /api/ai/notes/find-related - Trova note correlate
 */
router.post('/notes/summarize', aiController.summarizeNote);
router.post('/notes/extract-actions', aiController.extractActionItems);
router.post('/notes/find-related', aiController.findRelatedNotes);

/**
 * Email & Calendar AI Assistant
 * POST /api/ai/email/suggest-response - Suggerisce risposta per una email
 * POST /api/ai/email/extract-meetings - Estrae meeting e deadline da email
 * POST /api/ai/calendar/suggest-slots - Suggerisce slot per meeting
 * POST /api/ai/calendar/analyze - Analizza calendario ed estrae insights
 */
router.post('/email/suggest-response', aiController.suggestEmailResponse);
router.post('/email/extract-meetings', aiController.extractMeetingsAndDeadlines);
router.post('/calendar/suggest-slots', aiController.suggestMeetingSlots);
router.post('/calendar/analyze', aiController.analyzeCalendar);

/**
 * Company Chatbot
 * POST /api/ai/chatbot/ask - Fa una domanda al chatbot aziendale
 * GET /api/ai/chatbot/onboarding/:employeeId - Genera contenuto onboarding (solo Admin)
 */
router.post('/chatbot/ask', aiController.chatbotAsk);
router.get('/chatbot/onboarding/:employeeId', aiController.generateOnboarding);

/**
 * Admin Analytics
 * POST /api/ai/admin/analyze-company - Analizza performance aziendale completa (solo Admin)
 */
router.post('/admin/analyze-company', aiController.analyzeCompanyPerformance);

export default router;
