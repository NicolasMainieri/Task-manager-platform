import express from "express";
import { authenticate } from "../middleware/auth";
import newsletterController from "../controllers/newsletterController";

const router = express.Router();

// CRUD Newsletter
router.post("/", authenticate, newsletterController.createNewsletter);
router.get("/", authenticate, newsletterController.getNewsletters);
router.get("/:id", authenticate, newsletterController.getNewsletterById);
router.put("/:id", authenticate, newsletterController.updateNewsletter);
router.delete("/:id", authenticate, newsletterController.deleteNewsletter);

// Azioni
router.post("/:id/send", authenticate, newsletterController.sendNewsletter);
router.post("/:id/duplicate", authenticate, newsletterController.duplicateNewsletter);

// AI Features
router.get("/ai/analyze-periods", authenticate, newsletterController.analyzePromotionalPeriods);
router.post("/ai/generate", authenticate, newsletterController.generateWithAI);
router.post("/ai/improve", authenticate, newsletterController.improveContent);
router.post("/ai/suggest-subjects", authenticate, newsletterController.suggestSubjects);

// Canva Integration
router.get("/canva/templates", authenticate, newsletterController.getCanvaTemplates);
router.post("/canva/save-design", authenticate, newsletterController.saveCanvaDesign);
router.post("/canva/generate-link", authenticate, newsletterController.generateCanvaEditLink);

// Sync & Automation
router.post("/sync/init-promotional-tasks", authenticate, newsletterController.initializePromotionalTasks);
router.post("/sync/test-email", authenticate, newsletterController.testEmailConfiguration);
router.get("/sync/check-scheduled", authenticate, newsletterController.checkScheduledNewsletters);

export default router;
