import { Router } from "express";
import { authenticate, isAdmin } from "../middleware/auth";
import AnalyticsController from "../controllers/analyticsController";

const router = Router();

router.get("/dashboard-stats", authenticate, AnalyticsController.getDashboardStats.bind(AnalyticsController));
router.get("/my-stats", authenticate, AnalyticsController.getDashboardStats.bind(AnalyticsController)); // Employee dashboard stats
router.get("/weekly-progress", authenticate, AnalyticsController.getTasksTimeline.bind(AnalyticsController)); // Alias for weekly progress
router.get("/tasks/status", authenticate, AnalyticsController.getTasksByStatus.bind(AnalyticsController));
router.get("/tasks/priority", authenticate, AnalyticsController.getTasksByPriority.bind(AnalyticsController));
router.get("/teams/performance", authenticate, AnalyticsController.getTeamPerformance.bind(AnalyticsController));
router.get("/users/:userId?/performance", authenticate, AnalyticsController.getUserPerformance.bind(AnalyticsController));
router.get("/leaderboard", authenticate, AnalyticsController.getLeaderboard.bind(AnalyticsController));
router.get("/me/score", authenticate, AnalyticsController.getMyScore.bind(AnalyticsController));
router.get("/timeline", authenticate, AnalyticsController.getTasksTimeline.bind(AnalyticsController));
router.get("/export", authenticate, AnalyticsController.exportReport.bind(AnalyticsController));

// 🆕 Admin-only routes for detailed analytics
router.get("/task-history", authenticate, isAdmin, AnalyticsController.getTaskHistory.bind(AnalyticsController));
router.post("/assign-manual-points", authenticate, isAdmin, AnalyticsController.assignManualPoints.bind(AnalyticsController));
router.get("/employee-stats/:userId", authenticate, isAdmin, AnalyticsController.getEmployeeStats.bind(AnalyticsController));
router.get("/real-progress-data", authenticate, isAdmin, AnalyticsController.getRealProgressData.bind(AnalyticsController));
router.post("/reset-all-scores", authenticate, isAdmin, AnalyticsController.resetAllScores.bind(AnalyticsController));

export default router;
