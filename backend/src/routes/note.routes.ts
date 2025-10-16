import { Router } from "express";
import noteController from "../controllers/noteController";
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

export default router;
