import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { ConfidentialClientApplication, AuthorizationUrlRequest, AuthorizationCodeRequest } from "@azure/msal-node";
import { Client } from "@microsoft/microsoft-graph-client";

const db = new PrismaClient();

// MSAL Configuration
const msalConfig = {
  auth: {
    clientId: process.env.MICROSOFT_CLIENT_ID || "",
    authority: `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT_ID || "common"}`,
    clientSecret: process.env.MICROSOFT_CLIENT_SECRET || "",
  },
};

const pca = new ConfidentialClientApplication(msalConfig);
const redirectUri = process.env.MICROSOFT_REDIRECT_URI || "http://localhost:4000/api/integrations/microsoft/callback";

// Get Auth URL for OAuth2 flow
export const getAuthUrl = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    const authCodeUrlParameters: AuthorizationUrlRequest = {
      scopes: ["Mail.ReadWrite", "Mail.Send", "offline_access"],
      redirectUri: redirectUri,
      state: `outlook-email:${userId}`, // Distinguish from calendar auth
    };

    const authUrl = await pca.getAuthCodeUrl(authCodeUrlParameters);
    res.json({ authUrl });
  } catch (error: any) {
    console.error("Error generating Outlook Email auth URL:", error);
    res.status(500).json({ error: "Failed to generate auth URL" });
  }
};

// Handle OAuth2 callback
export const handleCallback = async (req: Request, res: Response) => {
  try {
    const { code, state } = req.query;

    if (!code || !state) {
      return res.status(400).send("Missing authorization code or state");
    }

    const stateStr = state as string;
    if (!stateStr.startsWith("outlook-email:")) {
      return res.status(400).send("Invalid state parameter");
    }

    const userId = stateStr.replace("outlook-email:", "");

    // Exchange code for tokens
    const tokenRequest: AuthorizationCodeRequest = {
      code: code as string,
      scopes: ["Mail.ReadWrite", "Mail.Send", "offline_access"],
      redirectUri: redirectUri,
    };

    const response = await pca.acquireTokenByCode(tokenRequest);

    if (!response) {
      return res.status(500).send("Failed to acquire tokens");
    }

    // Get user's email info from Microsoft Graph
    const client = Client.init({
      authProvider: (done) => {
        done(null, response.accessToken);
      },
    });

    const userData = await client.api("/me").select("mail,displayName").get();

    // Save account to database
    await db.emailAccount.upsert({
      where: {
        userId_accountEmail: {
          userId: userId,
          accountEmail: userData.mail || response.account?.username || "unknown@outlook.com",
        },
      },
      update: {
        accessToken: response.accessToken,
        refreshToken: JSON.stringify(response.account), // Store account info for token refresh
        tokenExpiry: response.expiresOn || undefined,
        syncEnabled: true,
        accountName: userData.displayName || "Outlook Email",
      },
      create: {
        userId: userId,
        provider: "outlook",
        accountEmail: userData.mail || response.account?.username || "unknown@outlook.com",
        accountName: userData.displayName || "Outlook Email",
        accessToken: response.accessToken,
        refreshToken: JSON.stringify(response.account), // Store account info for token refresh
        tokenExpiry: response.expiresOn || undefined,
        syncEnabled: true,
      },
    });

    // Create notification
    await db.notification.create({
      data: {
        userId: userId,
        tipo: "success",
        titolo: "Outlook Email collegato",
        messaggio: `Il tuo account Outlook Email (${userData.mail}) è stato collegato con successo.`,
        letta: false,
      },
    });

    res.send(`
      <html>
        <body>
          <h1>Outlook Email collegato con successo!</h1>
          <p>Puoi chiudere questa finestra e tornare all'applicazione.</p>
          <script>window.close();</script>
        </body>
      </html>
    `);
  } catch (error: any) {
    console.error("Error in Outlook Email callback:", error);
    res.status(500).send("Authentication failed: " + error.message);
  }
};

// Get user's email accounts
export const getConnections = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    const accounts = await db.emailAccount.findMany({
      where: {
        userId: userId,
        provider: "outlook",
      },
      select: {
        id: true,
        accountEmail: true,
        accountName: true,
        syncEnabled: true,
        lastSync: true,
        createdAt: true,
      },
    });

    res.json(accounts);
  } catch (error: any) {
    console.error("Error fetching Outlook email accounts:", error);
    res.status(500).json({ error: "Failed to fetch accounts" });
  }
};

// Sync emails
export const syncEmails = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { accountId } = req.params;

    const account = await db.emailAccount.findFirst({
      where: { id: accountId, userId: userId, provider: "outlook" },
    });

    if (!account) {
      return res.status(404).json({ error: "Account not found" });
    }

    // Refresh token if expired
    let accessToken = account.accessToken || "";
    if (account.tokenExpiry && new Date(account.tokenExpiry) < new Date()) {
      if (!account.refreshToken) {
        return res.status(401).json({ error: "Account info not available. Please reconnect." });
      }

      try {
        const accountInfo = JSON.parse(account.refreshToken);
        const silentRequest = {
          account: accountInfo,
          scopes: ["Mail.ReadWrite"],
        };

        const tokenResponse = await pca.acquireTokenSilent(silentRequest);
        accessToken = tokenResponse.accessToken;

        await db.emailAccount.update({
          where: { id: accountId },
          data: {
            accessToken: tokenResponse.accessToken,
            refreshToken: JSON.stringify(tokenResponse.account),
            tokenExpiry: tokenResponse.expiresOn || undefined,
          },
        });
      } catch (error) {
        return res.status(401).json({ error: "Token refresh failed. Please reconnect." });
      }
    }

    // Fetch emails from Microsoft Graph
    const client = Client.init({
      authProvider: (done) => {
        done(null, accessToken);
      },
    });

    const messages = await client
      .api("/me/messages")
      .select("subject,from,receivedDateTime,bodyPreview,isRead,hasAttachments")
      .top(50)
      .orderby("receivedDateTime DESC")
      .get();

    // Update last sync time
    await db.emailAccount.update({
      where: { id: accountId },
      data: { lastSync: new Date() },
    });

    res.json({
      message: "Emails synced successfully",
      emailsCount: messages.value.length,
      emails: messages.value,
    });
  } catch (error: any) {
    console.error("Error syncing Outlook emails:", error);
    res.status(500).json({ error: "Failed to sync emails: " + error.message });
  }
};

// Send email
export const sendEmail = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { accountId } = req.params;
    const { to, subject, body } = req.body;

    const account = await db.emailAccount.findFirst({
      where: { id: accountId, userId: userId, provider: "outlook" },
    });

    if (!account) {
      return res.status(404).json({ error: "Account not found" });
    }

    // Refresh token if expired
    let accessToken = account.accessToken || "";
    if (account.tokenExpiry && new Date(account.tokenExpiry) < new Date()) {
      if (!account.refreshToken) {
        return res.status(401).json({ error: "Account info not available. Please reconnect." });
      }

      try {
        const accountInfo = JSON.parse(account.refreshToken);
        const silentRequest = {
          account: accountInfo,
          scopes: ["Mail.Send"],
        };

        const tokenResponse = await pca.acquireTokenSilent(silentRequest);
        accessToken = tokenResponse.accessToken;

        await db.emailAccount.update({
          where: { id: accountId },
          data: {
            accessToken: tokenResponse.accessToken,
            refreshToken: JSON.stringify(tokenResponse.account),
            tokenExpiry: tokenResponse.expiresOn || undefined,
          },
        });
      } catch (error) {
        return res.status(401).json({ error: "Token refresh failed. Please reconnect." });
      }
    }

    // Send email via Microsoft Graph
    const client = Client.init({
      authProvider: (done) => {
        done(null, accessToken);
      },
    });

    const message = {
      subject: subject,
      body: {
        contentType: "HTML",
        content: body,
      },
      toRecipients: to.split(",").map((email: string) => ({
        emailAddress: {
          address: email.trim(),
        },
      })),
    };

    await client.api("/me/sendMail").post({ message });

    res.json({ message: "Email sent successfully" });
  } catch (error: any) {
    console.error("Error sending Outlook email:", error);
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
      where: { id: accountId, userId: userId, provider: "outlook" },
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

// Disconnect account
export const disconnect = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { accountId } = req.params;

    const account = await db.emailAccount.findFirst({
      where: { id: accountId, userId: userId, provider: "outlook" },
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
        titolo: "Outlook Email disconnesso",
        messaggio: `Il tuo account Outlook Email (${account.accountEmail}) è stato disconnesso.`,
        letta: false,
      },
    });

    res.json({ message: "Account disconnected successfully" });
  } catch (error: any) {
    console.error("Error disconnecting account:", error);
    res.status(500).json({ error: "Failed to disconnect account" });
  }
};

export const outlookEmailController = {
  getAuthUrl,
  handleCallback,
  getConnections,
  syncEmails,
  sendEmail,
  toggleSync,
  disconnect,
};
