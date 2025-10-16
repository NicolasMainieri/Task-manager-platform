import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { encrypt, decrypt } from "../utils/encryption";
import nodemailer from "nodemailer";

const db = new PrismaClient();

// Add IMAP/POP3 account
export const addAccount = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const {
      accountEmail,
      accountName,
      password,
      provider, // 'imap' or 'pop3'
      imapHost,
      imapPort,
      imapSecure,
      pop3Host,
      pop3Port,
      pop3Secure,
      smtpHost,
      smtpPort,
      smtpSecure,
    } = req.body;

    if (!accountEmail || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    // Encrypt password before storing
    const encryptedPassword = encrypt(password);

    // Create email account
    const account = await db.emailAccount.create({
      data: {
        userId: userId,
        provider: provider || "imap",
        accountEmail: accountEmail,
        accountName: accountName || accountEmail,
        emailPassword: encryptedPassword,
        imapHost: imapHost || undefined,
        imapPort: imapPort || 993,
        imapSecure: imapSecure !== false, // Default true
        pop3Host: pop3Host || undefined,
        pop3Port: pop3Port || 995,
        pop3Secure: pop3Secure !== false, // Default true
        smtpHost: smtpHost || undefined,
        smtpPort: smtpPort || 587,
        smtpSecure: smtpSecure !== false, // Default true
        syncEnabled: false, // Disabled by default until user enables
      },
    });

    // Create notification
    await db.notification.create({
      data: {
        userId: userId,
        tipo: "success",
        titolo: "Account email configurato",
        messaggio: `L'account ${accountEmail} è stato configurato con successo.`,
        letta: false,
      },
    });

    res.json({
      message: "Account added successfully",
      account: {
        id: account.id,
        accountEmail: account.accountEmail,
        accountName: account.accountName,
        provider: account.provider,
      },
    });
  } catch (error: any) {
    console.error("Error adding IMAP/POP3 account:", error);
    res.status(500).json({ error: "Failed to add account: " + error.message });
  }
};

// Get user's IMAP/POP3 accounts
export const getAccounts = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    const accounts = await db.emailAccount.findMany({
      where: {
        userId: userId,
        provider: {
          in: ["imap", "pop3"],
        },
      },
      select: {
        id: true,
        accountEmail: true,
        accountName: true,
        provider: true,
        syncEnabled: true,
        lastSync: true,
        imapHost: true,
        imapPort: true,
        pop3Host: true,
        pop3Port: true,
        smtpHost: true,
        smtpPort: true,
        createdAt: true,
      },
    });

    res.json(accounts);
  } catch (error: any) {
    console.error("Error fetching IMAP/POP3 accounts:", error);
    res.status(500).json({ error: "Failed to fetch accounts" });
  }
};

// Sync emails (placeholder - full IMAP implementation would go here)
export const syncEmails = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { accountId } = req.params;

    const account = await db.emailAccount.findFirst({
      where: {
        id: accountId,
        userId: userId,
        provider: { in: ["imap", "pop3"] },
      },
    });

    if (!account) {
      return res.status(404).json({ error: "Account not found" });
    }

    // Update last sync time
    await db.emailAccount.update({
      where: { id: accountId },
      data: { lastSync: new Date() },
    });

    // Placeholder response - actual IMAP sync would require implementing
    // the full IMAP protocol client, which has TypeScript compatibility issues
    res.json({
      message: "Sync initiated (IMAP sync implementation in progress)",
      note: "Full IMAP synchronization requires additional configuration",
    });
  } catch (error: any) {
    console.error("Error syncing IMAP/POP3 emails:", error);
    res.status(500).json({ error: "Failed to sync emails: " + error.message });
  }
};

// Send email via SMTP
export const sendEmail = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { accountId } = req.params;
    const { to, subject, body, cc, bcc } = req.body;

    const account = await db.emailAccount.findFirst({
      where: {
        id: accountId,
        userId: userId,
        provider: { in: ["imap", "pop3"] },
      },
    });

    if (!account) {
      return res.status(404).json({ error: "Account not found" });
    }

    if (!account.smtpHost || !account.emailPassword) {
      return res.status(400).json({ error: "SMTP not configured for this account" });
    }

    // Decrypt password
    const password = decrypt(account.emailPassword);

    // Create SMTP transporter
    const transporter = nodemailer.createTransport({
      host: account.smtpHost,
      port: account.smtpPort || 587,
      secure: account.smtpSecure || false,
      auth: {
        user: account.accountEmail,
        pass: password,
      },
    });

    // Send email
    const info = await transporter.sendMail({
      from: account.accountEmail,
      to: to,
      cc: cc || undefined,
      bcc: bcc || undefined,
      subject: subject,
      html: body,
    });

    res.json({
      message: "Email sent successfully",
      messageId: info.messageId,
    });
  } catch (error: any) {
    console.error("Error sending email:", error);
    res.status(500).json({ error: "Failed to send email: " + error.message });
  }
};

// Toggle sync on/off
export const toggleSync = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { accountId } = req.params;
    const { syncEnabled } = req.body;

    const account = await db.emailAccount.findFirst({
      where: {
        id: accountId,
        userId: userId,
        provider: { in: ["imap", "pop3"] },
      },
    });

    if (!account) {
      return res.status(404).json({ error: "Account not found" });
    }

    await db.emailAccount.update({
      where: { id: accountId },
      data: { syncEnabled: syncEnabled },
    });

    res.json({ message: `Sync ${syncEnabled ? "enabled" : "disabled"}`, syncEnabled });
  } catch (error: any) {
    console.error("Error toggling sync:", error);
    res.status(500).json({ error: "Failed to toggle sync" });
  }
};

// Delete account
export const deleteAccount = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { accountId } = req.params;

    const account = await db.emailAccount.findFirst({
      where: {
        id: accountId,
        userId: userId,
        provider: { in: ["imap", "pop3"] },
      },
    });

    if (!account) {
      return res.status(404).json({ error: "Account not found" });
    }

    await db.emailAccount.delete({
      where: { id: accountId },
    });

    // Create notification
    await db.notification.create({
      data: {
        userId: userId,
        tipo: "info",
        titolo: "Account email rimosso",
        messaggio: `L'account ${account.accountEmail} è stato rimosso.`,
        letta: false,
      },
    });

    res.json({ message: "Account deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting account:", error);
    res.status(500).json({ error: "Failed to delete account" });
  }
};

export const imapEmailController = {
  addAccount,
  getAccounts,
  syncEmails,
  sendEmail,
  toggleSync,
  deleteAccount,
};
