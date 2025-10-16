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
      scopes: ["Calendars.ReadWrite", "offline_access"],
      redirectUri: redirectUri,
      state: userId, // Pass userId in state
    };

    const authUrl = await pca.getAuthCodeUrl(authCodeUrlParameters);
    res.json({ authUrl });
  } catch (error: any) {
    console.error("Error generating Outlook auth URL:", error);
    res.status(500).json({ error: "Failed to generate auth URL" });
  }
};

// Handle OAuth2 callback
export const handleCallback = async (req: Request, res: Response) => {
  try {
    const { code, state } = req.query;
    const userId = state as string;

    if (!code || !userId) {
      return res.status(400).send("Missing authorization code or user ID");
    }

    // Exchange code for tokens
    const tokenRequest: AuthorizationCodeRequest = {
      code: code as string,
      scopes: ["Calendars.ReadWrite", "offline_access"],
      redirectUri: redirectUri,
    };

    const response = await pca.acquireTokenByCode(tokenRequest);

    if (!response) {
      return res.status(500).send("Failed to acquire tokens");
    }

    // Get user's calendar info from Microsoft Graph
    const client = Client.init({
      authProvider: (done) => {
        done(null, response.accessToken);
      },
    });

    const calendarData = await client.api("/me/calendar").get();

    // Save connection to database
    // Note: MSAL handles refresh tokens internally via the token cache
    await db.calendarConnection.upsert({
      where: {
        userId_provider_accountEmail: {
          userId: userId,
          provider: "outlook",
          accountEmail: response.account?.username || "unknown@outlook.com",
        },
      },
      update: {
        accessToken: response.accessToken,
        refreshToken: JSON.stringify(response.account), // Store account info for token refresh
        tokenExpiry: response.expiresOn || undefined,
        syncEnabled: true,
        accountName: response.account?.name || "Outlook Calendar",
        calendarId: calendarData.id,
      },
      create: {
        userId: userId,
        provider: "outlook",
        accountEmail: response.account?.username || "unknown@outlook.com",
        accountName: response.account?.name || "Outlook Calendar",
        accessToken: response.accessToken,
        refreshToken: JSON.stringify(response.account), // Store account info for token refresh
        tokenExpiry: response.expiresOn || undefined,
        syncEnabled: true,
        calendarId: calendarData.id,
      },
    });

    // Create notification
    await db.notification.create({
      data: {
        userId: userId,
        tipo: "success",
        titolo: "Outlook Calendar collegato",
        messaggio: `Il tuo Outlook Calendar (${response.account?.username}) è stato collegato con successo.`,
        letta: false,
      },
    });

    res.send(`
      <html>
        <body>
          <h1>Outlook Calendar collegato con successo!</h1>
          <p>Puoi chiudere questa finestra e tornare all'applicazione.</p>
          <script>window.close();</script>
        </body>
      </html>
    `);
  } catch (error: any) {
    console.error("Error in Outlook callback:", error);
    res.status(500).send("Authentication failed: " + error.message);
  }
};

// Get user's connections
export const getConnections = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    const connections = await db.calendarConnection.findMany({
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

    res.json(connections);
  } catch (error: any) {
    console.error("Error fetching Outlook connections:", error);
    res.status(500).json({ error: "Failed to fetch connections" });
  }
};

// Sync calendar events
export const syncCalendar = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { connectionId } = req.params;

    const connection = await db.calendarConnection.findFirst({
      where: { id: connectionId, userId: userId, provider: "outlook" },
    });

    if (!connection) {
      return res.status(404).json({ error: "Connection not found" });
    }

    // Refresh token if expired
    let accessToken = connection.accessToken;
    if (connection.tokenExpiry && new Date(connection.tokenExpiry) < new Date()) {
      // Token expired, try to refresh it using MSAL's token cache
      if (!connection.refreshToken) {
        return res.status(401).json({ error: "Account info not available. Please reconnect." });
      }

      try {
        const accountInfo = JSON.parse(connection.refreshToken);
        const silentRequest = {
          account: accountInfo,
          scopes: ["Calendars.ReadWrite"],
        };

        const tokenResponse = await pca.acquireTokenSilent(silentRequest);
        accessToken = tokenResponse.accessToken;

        await db.calendarConnection.update({
          where: { id: connectionId },
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

    // Fetch events from Microsoft Graph
    const client = Client.init({
      authProvider: (done) => {
        done(null, accessToken);
      },
    });

    const events = await client
      .api("/me/calendar/events")
      .select("subject,start,end,location,bodyPreview,isAllDay,webLink")
      .top(50)
      .get();

    // Update last sync time
    await db.calendarConnection.update({
      where: { id: connectionId },
      data: { lastSync: new Date() },
    });

    res.json({
      message: "Calendar synced successfully",
      eventsCount: events.value.length,
      events: events.value,
    });
  } catch (error: any) {
    console.error("Error syncing Outlook calendar:", error);
    res.status(500).json({ error: "Failed to sync calendar: " + error.message });
  }
};

// Toggle sync on/off
export const toggleSync = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { connectionId } = req.params;
    const { syncEnabled } = req.body;

    const connection = await db.calendarConnection.findFirst({
      where: { id: connectionId, userId: userId, provider: "outlook" },
    });

    if (!connection) {
      return res.status(404).json({ error: "Connection not found" });
    }

    await db.calendarConnection.update({
      where: { id: connectionId },
      data: { syncEnabled: syncEnabled },
    });

    res.json({ message: `Sync ${syncEnabled ? "enabled" : "disabled"}`, syncEnabled });
  } catch (error: any) {
    console.error("Error toggling sync:", error);
    res.status(500).json({ error: "Failed to toggle sync" });
  }
};

// Disconnect calendar
export const disconnect = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { connectionId } = req.params;

    const connection = await db.calendarConnection.findFirst({
      where: { id: connectionId, userId: userId, provider: "outlook" },
    });

    if (!connection) {
      return res.status(404).json({ error: "Connection not found" });
    }

    await db.calendarConnection.delete({
      where: { id: connectionId },
    });

    // Create notification
    await db.notification.create({
      data: {
        userId: userId,
        tipo: "info",
        titolo: "Outlook Calendar disconnesso",
        messaggio: `Il tuo Outlook Calendar (${connection.accountEmail}) è stato disconnesso.`,
        letta: false,
      },
    });

    res.json({ message: "Calendar disconnected successfully" });
  } catch (error: any) {
    console.error("Error disconnecting calendar:", error);
    res.status(500).json({ error: "Failed to disconnect calendar" });
  }
};

export const outlookCalendarController = {
  getAuthUrl,
  handleCallback,
  getConnections,
  syncCalendar,
  toggleSync,
  disconnect,
};
