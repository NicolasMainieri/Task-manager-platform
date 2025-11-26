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
import notificationController from "../controllers/notificationController";
import ticketController from "../controllers/ticketController";
import subtaskController from "../controllers/subtaskController";
import * as workSessionController from "../controllers/workSessionController";
import calendarController from "../controllers/calendarController";
import emailController from "../controllers/emailController";
import googleCalendarController from "../controllers/googleCalendarController";
import gmailController from "../controllers/gmailController";
// OUTLOOK: Requires Azure AD setup (temporarily disabled - needs credentials)
// import { outlookCalendarController } from "../controllers/outlookCalendarController";
// import { outlookEmailController } from "../controllers/outlookEmailController";
// IMAP/POP3: Manual email configuration
import { imapEmailController } from "../controllers/imapEmailController";
// Video Call
import { videoCallController } from "../controllers/videoCallController";
// Company
import companyController from "../controllers/companyController";
// Notes
import noteRoutes from "./note.routes";
// AI Routes
import aiRoutes from "./ai.routes";
// Rewards
import rewardRoutes from "./rewards.routes";
// Chat
import chatRoutes from "./chat.routes";
// Direct Messages
import directMessagesRoutes from "./directMessages.routes";
// Brain AI
import brainRoutes from "./brain.routes";
// Projects
import projectRoutes from "./project.routes";
// Analytics routes
import analyticsRoutes from "./analytics.routes";
// Contacts
import contactsRoutes from "./contacts.routes";
// Documents (File uploads for projects)
import documentRoutes from "./document.routes";
// Folders (Organize documents)
import folderRoutes from "./folder.routes";
// CRM (Custom CRM system)
import crmRoutes from "./crm.routes";
// Penalty & Bonus system
import penaltyRoutes from "./penalty.routes";
// Debug routes (development only)
import debugRoutes from "./debug.routes";
// Preventivi (Quote generation with AI)
import preventivoRoutes from "./preventivo.routes";
// Newsletter (Email newsletter system with AI)
import newsletterRoutes from "./newsletter.routes";
// Fatturazione (Invoicing & Payments)
import fatturaRoutes from "./fattura.routes";
import pagamentoRoutes from "./pagamento.routes";
// Timbrature e Presenze (Attendance & Time Clock)
import timbraturaRoutes from "./timbratura.routes";
import assenzaRoutes from "./assenza.routes";
// Inventario (Inventory Management)
import inventarioRoutes from "./inventario.routes";
// Ticket Categories & Role Change Requests
import ticketCategoryController from "../controllers/ticketCategoryController";
import roleChangeRequestController from "../controllers/roleChangeRequestController";
// SuperAdmin
import superadminRoutes from "./superadmin.routes";
// Legal (Studi Legali)
import legalRoutes from "./legal.routes";
import { authenticate, isAdmin } from "../middleware/auth";

const router = express.Router();

// Auth
router.post("/auth/register", authController.register);
router.post("/auth/login", authController.login);
router.get("/auth/profile", authenticate, authController.getProfile);
router.put("/auth/profile", authenticate, authController.updateProfile);
router.put("/auth/password", authenticate, authController.changePassword);

// 🆕 Multi-tenant routes
router.post("/auth/register-company", authController.registerCompany);
router.post("/auth/register-employee", authController.registerEmployee);
router.get("/auth/pending-requests", authenticate, authController.getPendingRequests);
router.post("/auth/update-user-status", authenticate, isAdmin, authController.updateUserStatus);

// Tasks
router.post("/tasks", authenticate, taskController.createTask);
router.get("/tasks", authenticate, taskController.getTasks);
router.get("/tasks/my-tasks", authenticate, taskController.getMyTasks);
router.get("/tasks/my", authenticate, taskController.getMyTasks);
router.get("/tasks/today", authenticate, taskController.getTodayTasks);
router.get("/tasks/:id", authenticate, taskController.getTaskById);
router.put("/tasks/:id", authenticate, taskController.updateTask);
router.delete("/tasks/:id", authenticate, taskController.deleteTask);
router.delete("/tasks", authenticate, isAdmin, taskController.deleteAllTasks);
router.post("/tasks/bulk-update", authenticate, isAdmin, taskController.bulkUpdate);
router.post("/tasks/:id/comments", authenticate, taskController.addComment);
router.get("/tasks/:id/comments", authenticate, commentController.getTaskComments);
router.post("/tasks/:id/worklogs", authenticate, taskController.addWorklog);

// Teams
router.get("/teams", authenticate, teamController.getAllTeams);
router.post("/teams", authenticate, isAdmin, teamController.createTeam);
router.put("/teams/:id", authenticate, isAdmin, teamController.updateTeam);
router.delete("/teams/:id", authenticate, isAdmin, teamController.deleteTeam);

// User Profile (current user) - MUST be before /users/:id
router.get("/users/me", authenticate, userController.getMyProfile);
router.put("/users/me", authenticate, userController.updateMyProfile);
router.put("/users/me/password", authenticate, userController.changePassword);

// Users (admin)
router.get("/users", authenticate, userController.getAllUsers);
router.get("/users/:id", authenticate, userController.getUserById);
router.post("/users", authenticate, isAdmin, userController.createUser);
router.put("/users/:id", authenticate, isAdmin, userController.updateUser);
router.delete("/users/:id", authenticate, isAdmin, userController.deleteUser);

// Company
router.get("/companies/:id", authenticate, companyController.getCompany);
router.put("/companies/:id", authenticate, isAdmin, companyController.updateCompany);

// Roles (admin)
router.get("/roles", authenticate, roleController.getAllRoles);
router.get("/roles/stats", authenticate, roleController.getRoleStats);
router.get("/roles/:id", authenticate, roleController.getRole);
router.post("/roles", authenticate, isAdmin, roleController.createRole);
router.put("/roles/:id", authenticate, isAdmin, roleController.updateRole);
router.delete("/roles/:id", authenticate, isAdmin, roleController.deleteRole);

// Ticket Categories (admin)
router.get("/ticket-categories", authenticate, ticketCategoryController.getCategories);
router.post("/ticket-categories", authenticate, isAdmin, ticketCategoryController.createCategory);
router.put("/ticket-categories/:id", authenticate, isAdmin, ticketCategoryController.updateCategory);
router.delete("/ticket-categories/:id", authenticate, isAdmin, ticketCategoryController.deleteCategory);

// Role Change Requests
router.get("/role-change-requests", authenticate, roleChangeRequestController.getRequests);
router.post("/role-change-requests", authenticate, roleChangeRequestController.createRequest);
router.put("/role-change-requests/:id/review", authenticate, isAdmin, roleChangeRequestController.reviewRequest);
router.delete("/role-change-requests/:id", authenticate, roleChangeRequestController.deleteRequest);

// Requests (Tickets)
router.get("/requests", authenticate, requestController.getRequests);
router.get("/requests/:id", authenticate, requestController.getRequestById);
router.post("/requests", authenticate, requestController.createRequest);
router.put("/requests/:id/status", authenticate, isAdmin, requestController.updateRequestStatus);
router.delete("/requests/:id", authenticate, requestController.deleteRequest);
router.post("/requests/:id/risposte", authenticate, requestController.addResponse);
router.get("/requests/:id/risposte", authenticate, requestController.getResponses);
router.put("/requests/:id/close", authenticate, requestController.closeTicket);
router.put("/requests/:id/reopen", authenticate, requestController.reopenTicket);

// Subtasks
router.get("/tasks/:taskId/subtasks", authenticate, subtaskController.getSubtasks);
router.post("/tasks/:taskId/subtasks", authenticate, subtaskController.createSubtask);
router.put("/subtasks/:id", authenticate, subtaskController.updateSubtask);
router.put("/subtasks/:id/toggle", authenticate, subtaskController.toggleSubtaskCompletion);
router.delete("/subtasks/:id", authenticate, subtaskController.deleteSubtask);
router.post("/tasks/:taskId/subtasks/:subtaskId/reorder", authenticate, subtaskController.reorderSubtasks);

// Work Sessions (Timer per subtasks)
router.get("/work-sessions/active", authenticate, workSessionController.getActiveSession);
router.get("/work-sessions", authenticate, workSessionController.getWorkSessions);
router.post("/work-sessions/force-stop-all", authenticate, workSessionController.forceStopAllSessions);
router.post("/subtasks/:subtaskId/work-sessions/start", authenticate, workSessionController.startWorkSession);
router.put("/work-sessions/:sessionId/pause", authenticate, workSessionController.pauseWorkSession);
router.put("/work-sessions/:sessionId/resume", authenticate, workSessionController.resumeWorkSession);
router.put("/work-sessions/:sessionId/stop", authenticate, workSessionController.stopWorkSession);
router.put("/work-sessions/:sessionId/update", authenticate, workSessionController.updateSessionTime);

// Scores & Leaderboard
router.get("/scores/leaderboard", authenticate, scoreController.getLeaderboard);
router.get("/scores/user/:userId", authenticate, scoreController.getUserScore);

// Notifications
router.get("/notifications/recent", authenticate, notificationController.getRecentNotifications);
router.get("/notifications", authenticate, notificationController.getUserNotifications);
router.put("/notifications/:id/read", authenticate, notificationController.markAsRead);
router.put("/notifications/read-all", authenticate, notificationController.markAllAsRead);
router.delete("/notifications/:id", authenticate, notificationController.deleteNotification);

// Tickets
router.get("/tickets", authenticate, ticketController.getAllTickets);
router.get("/tickets/my", authenticate, ticketController.getMyTickets);
router.get("/tickets/for-my-role", authenticate, ticketController.getTicketsForMyRole);
router.get("/tickets/:id", authenticate, ticketController.getTicketById);
router.post("/tickets", authenticate, ticketController.createTicket);
router.put("/tickets/:id", authenticate, ticketController.updateTicket);
router.put("/tickets/:id/take", authenticate, ticketController.takeTicket);
router.delete("/tickets/:id", authenticate, ticketController.deleteTicket);
router.post("/tickets/:id/risposte", authenticate, ticketController.addRisposta);

// Analytics - use dedicated router first
router.use("/analytics", analyticsRoutes);

// Calendar
router.get("/calendar/my-events", authenticate, calendarController.getEvents);
router.get("/calendar/events", authenticate, calendarController.getEvents);
router.get("/calendar/events/:id", authenticate, calendarController.getEventById);
router.post("/calendar/events", authenticate, calendarController.createEvent);
router.put("/calendar/events/:id", authenticate, calendarController.updateEvent);
router.delete("/calendar/events/:id", authenticate, calendarController.deleteEvent);

// Email
router.get("/emails/my", authenticate, emailController.getReceivedEmails);
router.get("/emails", authenticate, emailController.getEmails);
router.get("/emails/received", authenticate, emailController.getReceivedEmails);
router.get("/emails/sent", authenticate, emailController.getSentEmails);
router.get("/emails/unread-count", authenticate, emailController.getUnreadCount);
router.get("/emails/:id", authenticate, emailController.getEmailById);
router.post("/emails", authenticate, emailController.createEmail);
router.put("/emails/:id", authenticate, emailController.updateEmail);
router.delete("/emails/:id", authenticate, emailController.deleteEmail);

// Google Calendar Integration
router.get("/integrations/google/calendar/auth", authenticate, googleCalendarController.getAuthUrl);
router.get("/integrations/google/callback", googleCalendarController.handleCallback);
router.get("/integrations/google/calendar/connections", authenticate, googleCalendarController.getConnections);
router.post("/integrations/google/calendar/:connectionId/sync", authenticate, googleCalendarController.syncCalendar);
router.put("/integrations/google/calendar/:connectionId/toggle", authenticate, googleCalendarController.toggleSync);
router.delete("/integrations/google/calendar/:connectionId", authenticate, googleCalendarController.disconnect);

// Gmail Integration
router.get("/integrations/gmail/auth", authenticate, gmailController.getAuthUrl);
router.get("/integrations/gmail/callback", gmailController.handleCallback);
router.get("/integrations/gmail/accounts", authenticate, gmailController.getConnections);
router.post("/integrations/gmail/:accountId/sync", authenticate, gmailController.syncEmails);
router.post("/integrations/gmail/:accountId/send", authenticate, gmailController.sendEmail);
router.put("/integrations/gmail/:accountId/toggle", authenticate, gmailController.toggleSync);
router.delete("/integrations/gmail/:accountId", authenticate, gmailController.disconnect);

// Outlook Calendar Integration (DISABLED - requires Azure AD configuration)
// router.get("/integrations/outlook/calendar/auth", authenticate, outlookCalendarController.getAuthUrl);
// router.get("/integrations/microsoft/callback", outlookCalendarController.handleCallback);
// router.get("/integrations/outlook/calendar/connections", authenticate, outlookCalendarController.getConnections);
// router.post("/integrations/outlook/calendar/:connectionId/sync", authenticate, outlookCalendarController.syncCalendar);
// router.put("/integrations/outlook/calendar/:connectionId/toggle", authenticate, outlookCalendarController.toggleSync);
// router.delete("/integrations/outlook/calendar/:connectionId", authenticate, outlookCalendarController.disconnect);

// Outlook Email Integration (DISABLED - requires Azure AD configuration)
// router.get("/integrations/outlook/email/auth", authenticate, outlookEmailController.getAuthUrl);
// router.get("/integrations/outlook/email/accounts", authenticate, outlookEmailController.getConnections);
// router.post("/integrations/outlook/email/:accountId/sync", authenticate, outlookEmailController.syncEmails);
// router.post("/integrations/outlook/email/:accountId/send", authenticate, outlookEmailController.sendEmail);
// router.put("/integrations/outlook/email/:accountId/toggle", authenticate, outlookEmailController.toggleSync);
// router.delete("/integrations/outlook/email/:accountId", authenticate, outlookEmailController.disconnect);

// IMAP/POP3 Email Integration (manual configuration)
router.post("/integrations/email/imap", authenticate, imapEmailController.addAccount);
router.get("/integrations/email/imap-pop3", authenticate, imapEmailController.getAccounts);
router.post("/integrations/email/imap/:accountId/sync", authenticate, imapEmailController.syncEmails);
router.post("/integrations/email/imap-pop3/:accountId/send", authenticate, imapEmailController.sendEmail);
router.put("/integrations/email/imap-pop3/:accountId/toggle", authenticate, imapEmailController.toggleSync);
router.delete("/integrations/email/imap-pop3/:accountId", authenticate, imapEmailController.deleteAccount);

// Video Call Rooms
router.post("/video/rooms", authenticate, videoCallController.createRoom);
router.get("/video-rooms/my-upcoming", authenticate, videoCallController.getMyUpcomingCalls);
router.get("/video/rooms", authenticate, videoCallController.getAllRooms);
router.get("/video-rooms", authenticate, videoCallController.getAllRooms); // Alias for getAllRooms
router.get("/video/rooms/:roomId", authenticate, videoCallController.getRoom);
router.put("/video/rooms/:roomId", authenticate, videoCallController.updateRoom);
router.delete("/video/rooms/:roomId", authenticate, videoCallController.deleteRoom);
router.get("/video/rooms/:roomId/messages", authenticate, videoCallController.getRoomMessages);
router.get("/video/rooms/:roomId/participants", authenticate, videoCallController.getActiveParticipants);
router.post("/video/rooms/:roomId/start-call", authenticate, videoCallController.startCall);
router.post("/video/rooms/:roomId/notify", authenticate, videoCallController.notifyUsers);
router.post("/video/calls/:callId/end", authenticate, videoCallController.endCall);

// Notes (Free notes system)
router.use("/notes", noteRoutes);

// AI Features
router.use("/ai", aiRoutes);

// Rewards (Prize system)
router.use("/rewards", rewardRoutes);

// Chat (Company chat)
router.use("/chat", chatRoutes);

// Direct Messages (1-to-1 chat)
router.use("/direct-messages", directMessagesRoutes);

// Brain AI (Multi-model AI assistant)
router.use("/ai/brain", brainRoutes);

// Projects (Projects management system)
router.use("/projects", projectRoutes);

// Contacts (Global contacts system)
router.use("/contacts", contactsRoutes);

// Documents (File uploads for projects)
router.use("/documents", documentRoutes);

// Folders (Organize documents)
router.use("/folders", folderRoutes);

// CRM (Custom CRM system)
router.use("/crm", crmRoutes);

// Penalty & Bonus system
router.use("/penalties", penaltyRoutes);

// Debug routes (development only)
router.use("/debug", debugRoutes);

// Preventivi (Quote generation with AI)
router.use("/preventivi", preventivoRoutes);

// Newsletter (Email newsletter system with AI)
router.use("/newsletters", newsletterRoutes);

// Fatturazione (Invoicing & Payments)
router.use("/fatture", fatturaRoutes);
router.use("/pagamenti", pagamentoRoutes);

// Timbrature e Presenze (Attendance & Time Clock)
router.use("/timbrature", timbraturaRoutes);
router.use("/assenze", assenzaRoutes);

// Inventario (Inventory Management)
router.use("/inventario", inventarioRoutes);

// SuperAdmin (gestione aziende e moduli)
router.use("/superadmin", authenticate, superadminRoutes);

// Legal (Studi Legali - ricerca giurisprudenza e gestione casi)
router.use("/legal", authenticate, legalRoutes);

console.log('🔧 Router caricato con', router.stack.length, 'route'); // v2

export default router;