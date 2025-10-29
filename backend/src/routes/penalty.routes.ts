import { Router } from "express";
import { authenticate } from "../middleware/auth";
import PenaltyController from "../controllers/penaltyController";

const router = Router();

// Esegui manualmente penalità giornaliere (solo admin)
router.post("/run-daily", authenticate, PenaltyController.runDailyPenalties.bind(PenaltyController));

export default router;
