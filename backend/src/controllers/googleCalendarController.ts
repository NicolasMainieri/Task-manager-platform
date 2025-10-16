import { Response } from "express";
import { google } from "googleapis";
import prisma from "../config/database";
import { AuthRequest } from "../middleware/auth";

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

class GoogleCalendarController {
  // Step 1: Generate authorization URL
  async getAuthUrl(req: AuthRequest, res: Response) {
    try {
      const scopes = [
        'https://www.googleapis.com/auth/calendar.readonly',
        'https://www.googleapis.com/auth/calendar.events',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile'
      ];

      const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes,
        prompt: 'consent',
        state: req.user!.id // Pass user ID in state
      });

      res.json({ authUrl });
    } catch (error: any) {
      console.error('Error generating auth URL:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Step 2: Handle OAuth callback
  async handleCallback(req: AuthRequest, res: Response) {
    try {
      const { code, state } = req.query;
      const userId = state as string;

      if (!code || !userId) {
        return res.status(400).json({ error: 'Missing code or state' });
      }

      // Exchange code for tokens
      const { tokens } = await oauth2Client.getToken(code as string);
      oauth2Client.setCredentials(tokens);

      // Get user info
      const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
      const userInfo = await oauth2.userinfo.get();

      // Save connection to database
      const connection = await prisma.calendarConnection.upsert({
        where: {
          userId_provider_accountEmail: {
            userId,
            provider: 'google',
            accountEmail: userInfo.data.email!
          }
        },
        update: {
          accessToken: tokens.access_token!,
          refreshToken: tokens.refresh_token || undefined,
          tokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
          accountName: userInfo.data.name || undefined,
          lastSync: new Date()
        },
        create: {
          userId,
          provider: 'google',
          accountEmail: userInfo.data.email!,
          accountName: userInfo.data.name || undefined,
          accessToken: tokens.access_token!,
          refreshToken: tokens.refresh_token || undefined,
          tokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
          syncEnabled: true
        }
      });

      // Create notification
      await prisma.notification.create({
        data: {
          userId,
          tipo: 'calendar_connected',
          titolo: 'Google Calendar connesso',
          messaggio: `Il tuo account Google Calendar (${userInfo.data.email}) è stato collegato con successo.`,
          link: '/calendar'
        }
      });

      // Redirect to OAuth callback page
      res.redirect(`${process.env.FRONTEND_URL}/oauth-callback.html?success=true&provider=google&type=calendar`);
    } catch (error: any) {
      console.error('Error handling OAuth callback:', error);
      res.redirect(`${process.env.FRONTEND_URL}/oauth-callback.html?success=false&provider=google&type=calendar&error=${encodeURIComponent(error.message)}`);
    }
  }

  // Get all connected calendars for user
  async getConnections(req: AuthRequest, res: Response) {
    try {
      const connections = await prisma.calendarConnection.findMany({
        where: {
          userId: req.user!.id,
          provider: 'google'
        },
        select: {
          id: true,
          provider: true,
          accountEmail: true,
          accountName: true,
          syncEnabled: true,
          lastSync: true,
          createdAt: true
        }
      });

      res.json(connections);
    } catch (error: any) {
      console.error('Error fetching connections:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Sync calendar events from Google
  async syncCalendar(req: AuthRequest, res: Response) {
    try {
      const { connectionId } = req.params;

      const connection = await prisma.calendarConnection.findUnique({
        where: { id: connectionId }
      });

      if (!connection || connection.userId !== req.user!.id) {
        return res.status(404).json({ error: 'Connection not found' });
      }

      // Set credentials
      oauth2Client.setCredentials({
        access_token: connection.accessToken,
        refresh_token: connection.refreshToken || undefined,
        expiry_date: connection.tokenExpiry?.getTime()
      });

      // Refresh token if expired
      if (connection.tokenExpiry && new Date() > connection.tokenExpiry) {
        const { credentials } = await oauth2Client.refreshAccessToken();
        await prisma.calendarConnection.update({
          where: { id: connectionId },
          data: {
            accessToken: credentials.access_token!,
            tokenExpiry: credentials.expiry_date ? new Date(credentials.expiry_date) : null
          }
        });
        oauth2Client.setCredentials(credentials);
      }

      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

      // Get events from the last 30 days and next 90 days
      const timeMin = new Date();
      timeMin.setDate(timeMin.getDate() - 30);
      const timeMax = new Date();
      timeMax.setDate(timeMax.getDate() + 90);

      const response = await calendar.events.list({
        calendarId: 'primary',
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        maxResults: 100,
        singleEvents: true,
        orderBy: 'startTime'
      });

      const events = response.data.items || [];

      // Save events to our database
      for (const event of events) {
        if (!event.start?.dateTime && !event.start?.date) continue;

        const startDate = new Date(event.start.dateTime || event.start.date!);
        const endDate = new Date(event.end?.dateTime || event.end?.date || startDate);

        await prisma.calendarEvent.upsert({
          where: {
            id: event.id || `google-${connection.id}-${Math.random()}`
          },
          update: {
            titolo: event.summary || 'Senza titolo',
            descrizione: event.description || undefined,
            dataInizio: startDate,
            dataFine: endDate,
            luogo: event.location || undefined,
            linkMeeting: event.hangoutLink || undefined,
            allDay: !event.start.dateTime,
            tipo: 'meeting'
          },
          create: {
            id: event.id || `google-${connection.id}-${Math.random()}`,
            titolo: event.summary || 'Senza titolo',
            descrizione: event.description || undefined,
            dataInizio: startDate,
            dataFine: endDate,
            luogo: event.location || undefined,
            linkMeeting: event.hangoutLink || undefined,
            allDay: !event.start.dateTime,
            tipo: 'meeting',
            organizerId: req.user!.id,
            colore: '#4285F4' // Google blue
          }
        });
      }

      // Update last sync time
      await prisma.calendarConnection.update({
        where: { id: connectionId },
        data: { lastSync: new Date() }
      });

      res.json({
        success: true,
        eventsSynced: events.length,
        lastSync: new Date()
      });
    } catch (error: any) {
      console.error('Error syncing calendar:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Disconnect calendar
  async disconnect(req: AuthRequest, res: Response) {
    try {
      const { connectionId } = req.params;

      const connection = await prisma.calendarConnection.findUnique({
        where: { id: connectionId }
      });

      if (!connection || connection.userId !== req.user!.id) {
        return res.status(404).json({ error: 'Connection not found' });
      }

      await prisma.calendarConnection.delete({
        where: { id: connectionId }
      });

      await prisma.notification.create({
        data: {
          userId: req.user!.id,
          tipo: 'calendar_disconnected',
          titolo: 'Google Calendar disconnesso',
          messaggio: `Il tuo account Google Calendar (${connection.accountEmail}) è stato scollegato.`
        }
      });

      res.json({ success: true });
    } catch (error: any) {
      console.error('Error disconnecting calendar:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Toggle sync
  async toggleSync(req: AuthRequest, res: Response) {
    try {
      const { connectionId } = req.params;
      const { syncEnabled } = req.body;

      const connection = await prisma.calendarConnection.findUnique({
        where: { id: connectionId }
      });

      if (!connection || connection.userId !== req.user!.id) {
        return res.status(404).json({ error: 'Connection not found' });
      }

      await prisma.calendarConnection.update({
        where: { id: connectionId },
        data: { syncEnabled }
      });

      res.json({ success: true });
    } catch (error: any) {
      console.error('Error toggling sync:', error);
      res.status(500).json({ error: error.message });
    }
  }
}

export default new GoogleCalendarController();
