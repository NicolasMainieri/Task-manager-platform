import express from "express";
import teamController from "../controllers/teamController";
import { authenticate, isAdmin } from "../middleware/auth";

const router = express.Router();

// Tutte le route richiedono autenticazione
router.get("/", authenticate, teamController.getAllTeams);
router.post("/", authenticate, isAdmin, teamController.createTeam);
router.put("/:id", authenticate, isAdmin, teamController.updateTeam);
router.delete("/:id", authenticate, isAdmin, teamController.deleteTeam);

export default router;