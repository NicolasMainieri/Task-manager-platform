import { Router } from "express";
import noteController, { audioUpload } from "../controllers/noteController";
import { authenticate } from "../middleware/auth";

const router = Router();

// Tutte le routes richiedono autenticazione
router.use(authenticate);

// GET /api/notes - Ottieni tutte le note
router.get("/", noteController.getNotes);

// GET /api/notes/categories - Ottieni categorie
router.get("/categories", noteController.getCategories);

// GET /api/notes/:id - Ottieni una nota specifica
router.get("/:id", noteController.getNote);

// POST /api/notes - Crea una nuova nota
router.post("/", noteController.createNote);

// PUT /api/notes/:id - Aggiorna una nota
router.put("/:id", noteController.updateNote);

// DELETE /api/notes/:id - Elimina una nota
router.delete("/:id", noteController.deleteNote);

// AI Features
// POST /api/notes/:id/ai/summary - Genera riassunto
router.post("/:id/ai/summary", noteController.generateSummary);

// POST /api/notes/:id/ai/bullets - Converti in bullet points
router.post("/:id/ai/bullets", noteController.generateBullets);

// POST /api/notes/:id/ai/correct - Correggi grammatica
router.post("/:id/ai/correct", noteController.correctGrammar);

// POST /api/notes/:id/ai/translate - Traduci
router.post("/:id/ai/translate", noteController.translateNote);

// POST /api/notes/:id/ai/expand - Espandi nota
router.post("/:id/ai/expand", noteController.expandNote);

// POST /api/notes/ai/generate - Genera nota da prompt
router.post("/ai/generate", noteController.generateFromPrompt);

// POST /api/notes/transcribe - Trascrivi audio (con upload file)
router.post("/transcribe", audioUpload.single('audio'), noteController.transcribeAudio);

// Meeting AI features
// GET /api/notes/meeting/:roomId/summary - Genera riassunto meeting
router.get("/meeting/:roomId/summary", noteController.generateMeetingSummary);

// POST /api/notes/meeting/:roomId/notes - Genera e salva note complete meeting
router.post("/meeting/:roomId/notes", noteController.generateAndSaveMeetingNotes);

export default router;
