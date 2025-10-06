import express from "express";
import authController from "../controllers/authController";
import taskController from "../controllers/taskController";
import userController from "../controllers/userController";
import roleController from "../controllers/roleController";
import analyticsController from "../controllers/analyticsController";
import teamController from "../controllers/teamController";
import requestController from "../controllers/requestController";
import commentController from "../controllers/commentController";
import scoreController from "../controllers/scoreController";
import { authenticate, isAdmin } from "../middleware/auth";

const router = express.Router();

// Auth
router.post("/auth/register", authController.register);
router.post("/auth/login", authController.login);
router.get("/auth/profile", authenticate, authController.getProfile);
router.put("/auth/profile", authenticate, authController.updateProfile);
router.put("/auth/password", authenticate, authController.changePassword);

// Tasks
router.post("/tasks", authenticate, taskController.createTask);
router.get("/tasks", authenticate, taskController.getTasks);
router.get("/tasks/my", authenticate, taskController.getMyTasks);
router.get("/tasks/:id", authenticate, taskController.getTaskById);
router.put("/tasks/:id", authenticate, taskController.updateTask);
router.delete("/tasks/:id", authenticate, taskController.deleteTask);
router.post("/tasks/bulk-update", authenticate, isAdmin, taskController.bulkUpdate);
router.post("/tasks/:id/comments", authenticate, taskController.addComment);
router.get("/tasks/:id/comments", authenticate, commentController.getTaskComments);
router.post("/tasks/:id/worklogs", authenticate, taskController.addWorklog);

// Teams
router.get("/teams", authenticate, teamController.getAllTeams);
router.post("/teams", authenticate, isAdmin, teamController.createTeam);
router.put("/teams/:id", authenticate, isAdmin, teamController.updateTeam);
router.delete("/teams/:id", authenticate, isAdmin, teamController.deleteTeam);

// Users (admin)
router.get("/users", authenticate, userController.getAllUsers);
router.get("/users/:id", authenticate, userController.getUserById);
router.post("/users", authenticate, isAdmin, userController.createUser);
router.put("/users/:id", authenticate, isAdmin, userController.updateUser);
router.delete("/users/:id", authenticate, isAdmin, userController.deleteUser);

// Roles (admin)
router.get("/roles", authenticate, roleController.getAllRoles);
router.post("/roles", authenticate, isAdmin, roleController.createRole);
router.put("/roles/:id", authenticate, isAdmin, roleController.updateRole);
router.delete("/roles/:id", authenticate, isAdmin, roleController.deleteRole);

// Requests
router.get("/requests", authenticate, requestController.getAllRequests);
router.post("/requests", authenticate, requestController.createRequest);
router.put("/requests/:id", authenticate, requestController.updateRequest);
router.delete("/requests/:id", authenticate, requestController.deleteRequest);

// Scores & Leaderboard
router.get("/scores/leaderboard", authenticate, scoreController.getLeaderboard);
router.get("/scores/user/:userId", authenticate, scoreController.getUserScore);

// Analytics
router.get("/analytics", authenticate, analyticsController.getAnalytics);
router.get("/analytics/export", authenticate, analyticsController.exportReport);


export default router;