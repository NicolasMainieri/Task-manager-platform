import { Response } from "express";
import prisma from "../config/database";
import { AuthRequest } from "../middleware/auth";

class NotificationController {
  constructor() {
    this.getUserNotifications = this.getUserNotifications.bind(this);
    this.getRecentNotifications = this.getRecentNotifications.bind(this);
    this.markAsRead = this.markAsRead.bind(this);
    this.markAllAsRead = this.markAllAsRead.bind(this);
    this.deleteNotification = this.deleteNotification.bind(this);
  }

  async getUserNotifications(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const { unreadOnly } = req.query;

      const where: any = { userId };
      if (unreadOnly === 'true') {
        where.letta = false;
      }

      const notifications = await prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 50 // Limita a ultime 50 notifiche
      });

      const unreadCount = await prisma.notification.count({
        where: { userId, letta: false }
      });

      res.json({
        notifications,
        unreadCount
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getRecentNotifications(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const { limit = 5 } = req.query;

      const notifications = await prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: Number(limit)
      });

      res.json(notifications);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async markAsRead(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      // Verifica che la notifica appartenga all'utente
      const notification = await prisma.notification.findUnique({
        where: { id }
      });

      if (!notification) {
        return res.status(404).json({ error: "Notifica non trovata" });
      }

      if (notification.userId !== userId) {
        return res.status(403).json({ error: "Non hai accesso a questa notifica" });
      }

      const updated = await prisma.notification.update({
        where: { id },
        data: { letta: true }
      });

      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async markAllAsRead(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;

      await prisma.notification.updateMany({
        where: { userId, letta: false },
        data: { letta: true }
      });

      res.json({ message: "Tutte le notifiche sono state segnate come lette" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async deleteNotification(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      // Verifica che la notifica appartenga all'utente
      const notification = await prisma.notification.findUnique({
        where: { id }
      });

      if (!notification) {
        return res.status(404).json({ error: "Notifica non trovata" });
      }

      if (notification.userId !== userId) {
        return res.status(403).json({ error: "Non hai accesso a questa notifica" });
      }

      await prisma.notification.delete({
        where: { id }
      });

      res.json({ message: "Notifica eliminata con successo" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}

export default new NotificationController();
