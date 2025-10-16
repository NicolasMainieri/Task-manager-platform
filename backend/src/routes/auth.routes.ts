import { Router } from "express";
import authController from "../controllers/authController";
import { authenticate } from "../middleware/auth";

const router = Router();

// Routes esistenti (probabilmente le hai già da qualche parte)
router.post("/register", authController.register);
router.post("/login", authController.login);
router.get("/profile", authenticate, authController.getProfile);
router.put("/profile", authenticate, authController.updateProfile);
router.post("/change-password", authenticate, authController.changePassword);

// 🆕 NUOVE ROUTES per multi-tenant
router.post("/register-company", authController.registerCompany);
router.post("/register-employee", authController.registerEmployee);
router.get("/pending-requests", authenticate, authController.getPendingRequests);
router.post("/update-user-status", authenticate, authController.updateUserStatus);

export default router;