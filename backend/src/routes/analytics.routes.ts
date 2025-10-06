import { Router } from "express";
import { authenticate } from "../middleware/auth";
import AnalyticsController from "../controllers/analyticsController";

const router = Router();

router.get("/dashboard", authenticate, AnalyticsController.getDashboardStats);
router.get("/tasks/status", authenticate, AnalyticsController.getTasksByStatus);
router.get("/tasks/priority", authenticate, AnalyticsController.getTasksByPriority);
router.get("/teams/performance", authenticate, AnalyticsController.getTeamPerformance);
router.get("/users/:userId?/performance", authenticate, AnalyticsController.getUserPerformance);
router.get("/leaderboard", authenticate, AnalyticsController.getLeaderboard);
router.get("/me/score", authenticate, AnalyticsController.getMyScore);
router.get("/timeline", authenticate, AnalyticsController.getTasksTimeline);
router.get("/export", authenticate, AnalyticsController.exportReport);

export default router;
