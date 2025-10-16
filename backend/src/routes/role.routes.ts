import { Router } from "express";
import roleController from "../controllers/roleController";
import { authenticate } from "../middleware/auth";

const router = Router();

// Tutte le route richiedono autenticazione
router.use(authenticate);

// GET /api/roles - Ottieni tutti i ruoli
router.get("/", roleController.getAllRoles);

// GET /api/roles/stats - Ottieni statistiche ruoli
router.get("/stats", roleController.getRoleStats);

// GET /api/roles/:id - Ottieni un singolo ruolo
router.get("/:id", roleController.getRole);

// POST /api/roles - Crea un nuovo ruolo (solo admin)
router.post("/", roleController.createRole);

// PUT /api/roles/:id - Aggiorna un ruolo (solo admin)
router.put("/:id", roleController.updateRole);

// DELETE /api/roles/:id - Elimina un ruolo (solo admin)
router.delete("/:id", roleController.deleteRole);

export default router;
