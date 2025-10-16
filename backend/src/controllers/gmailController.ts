import { Response } from "express";
import { google } from "googleapis";
import prisma from "../config/database";
import { AuthRequest } from "../middleware/auth";

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

class GmailController {
  // Step 1: Generate authorization URL
  async getAuthUrl(req: AuthRequest, res: Response) {
    try {
      const scopes = [
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.send',
        'https://www.googleapis.com/auth/gmail.modify',
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

      // Save email account to database
      const emailAccount = await prisma.emailAccount.upsert({
        where: {
          userId_accountEmail: {
            userId,
            accountEmail: userInfo.data.email!
          }
        },
        update: {
          accessToken: tokens.access_token || undefined,
          refreshToken: tokens.refresh_token || undefined,
          tokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
          accountName: userInfo.data.name || undefined,
          lastSync: new Date()
        },
        create: {
          userId,
          provider: 'gmail',
          accountEmail: userInfo.data.email!,
          accountName: userInfo.data.name || undefined,
          accessToken: tokens.access_token || undefined,
          refreshToken: tokens.refresh_token || undefined,
          tokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
          syncEnabled: true
        }
      });

      // Create notification
      await prisma.notification.create({
        data: {
          userId,
          tipo: 'email_connected',
          titolo: 'Gmail connesso',
          messaggio: `Il tuo account Gmail (${userInfo.data.email}) è stato collegato con successo.`,
          link: '/email'
        }
      });

      // Redirect to OAuth callback page
      res.redirect(`${process.env.FRONTEND_URL}/oauth-callback.html?success=true&provider=google&type=gmail`);
    } catch (error: any) {
      console.error('Error handling OAuth callback:', error);
      res.redirect(`${process.env.FRONTEND_URL}/oauth-callback.html?success=false&provider=google&type=gmail&error=${encodeURIComponent(error.message)}`);
    }
  }

  // Get all connected Gmail accounts for user
  async getConnections(req: AuthRequest, res: Response) {
    try {
      const connections = await prisma.emailAccount.findMany({
        where: {
          userId: req.user!.id,
          provider: 'gmail'
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

  // Sync emails from Gmail
  async syncEmails(req: AuthRequest, res: Response) {
    try {
      const { accountId } = req.params;

      const emailAccount = await prisma.emailAccount.findUnique({
        where: { id: accountId }
      });

      if (!emailAccount || emailAccount.userId !== req.user!.id) {
        return res.status(404).json({ error: 'Email account not found' });
      }

      // Set credentials
      oauth2Client.setCredentials({
        access_token: emailAccount.accessToken || undefined,
        refresh_token: emailAccount.refreshToken || undefined,
        expiry_date: emailAccount.tokenExpiry?.getTime()
      });

      // Refresh token if expired
      if (emailAccount.tokenExpiry && new Date() > emailAccount.tokenExpiry) {
        const { credentials } = await oauth2Client.refreshAccessToken();
        await prisma.emailAccount.update({
          where: { id: accountId },
          data: {
            accessToken: credentials.access_token || undefined,
            tokenExpiry: credentials.expiry_date ? new Date(credentials.expiry_date) : null
          }
        });
        oauth2Client.setCredentials(credentials);
      }

      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

      // Get recent emails (last 50)
      const response = await gmail.users.messages.list({
        userId: 'me',
        maxResults: 50,
        q: 'in:inbox OR in:sent' // Get both inbox and sent
      });

      const messages = response.data.messages || [];
      let syncedCount = 0;

      // Fetch details for each message
      for (const message of messages) {
        try {
          const details = await gmail.users.messages.get({
            userId: 'me',
            id: message.id!,
            format: 'full'
          });

          const headers = details.data.payload?.headers || [];
          const getHeader = (name: string) => headers.find(h => h.name?.toLowerCase() === name.toLowerCase())?.value || '';

          const subject = getHeader('Subject');
          const from = getHeader('From');
          const to = getHeader('To');
          const date = getHeader('Date');
          const inReplyTo = getHeader('In-Reply-To');

          // Extract body
          let body = '';
          if (details.data.payload?.body?.data) {
            body = Buffer.from(details.data.payload.body.data, 'base64').toString('utf-8');
          } else if (details.data.payload?.parts) {
            const textPart = details.data.payload.parts.find(p => p.mimeType === 'text/plain');
            if (textPart?.body?.data) {
              body = Buffer.from(textPart.body.data, 'base64').toString('utf-8');
            }
          }

          // Determine if it's sent or received
          const isFromMe = from.toLowerCase().includes(emailAccount.accountEmail.toLowerCase());
          const stato = isFromMe ? 'inviata' : 'ricevuta';

          // Save to database
          await prisma.email.upsert({
            where: {
              id: `gmail-${accountId}-${message.id}`
            },
            update: {
              oggetto: subject || 'Senza oggetto',
              corpo: body.substring(0, 10000), // Limit to 10k chars
              mittente: from,
              destinatari: JSON.stringify([to]),
              stato,
              dataInvio: date ? new Date(date) : new Date(),
              inReplyTo: inReplyTo || undefined
            },
            create: {
              id: `gmail-${accountId}-${message.id}`,
              oggetto: subject || 'Senza oggetto',
              corpo: body.substring(0, 10000),
              mittente: from,
              destinatari: JSON.stringify([to]),
              stato,
              userId: req.user!.id,
              dataInvio: date ? new Date(date) : new Date(),
              inReplyTo: inReplyTo || undefined
            }
          });

          syncedCount++;
        } catch (err) {
          console.error('Error syncing message:', err);
        }
      }

      // Update last sync time
      await prisma.emailAccount.update({
        where: { id: accountId },
        data: { lastSync: new Date() }
      });

      res.json({
        success: true,
        emailsSynced: syncedCount,
        lastSync: new Date()
      });
    } catch (error: any) {
      console.error('Error syncing emails:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Send email via Gmail
  async sendEmail(req: AuthRequest, res: Response) {
    try {
      const { accountId } = req.params;
      const { to, subject, body, cc, bcc } = req.body;

      const emailAccount = await prisma.emailAccount.findUnique({
        where: { id: accountId }
      });

      if (!emailAccount || emailAccount.userId !== req.user!.id) {
        return res.status(404).json({ error: 'Email account not found' });
      }

      // Set credentials
      oauth2Client.setCredentials({
        access_token: emailAccount.accessToken || undefined,
        refresh_token: emailAccount.refreshToken || undefined,
        expiry_date: emailAccount.tokenExpiry?.getTime()
      });

      // Refresh token if expired
      if (emailAccount.tokenExpiry && new Date() > emailAccount.tokenExpiry) {
        const { credentials } = await oauth2Client.refreshAccessToken();
        await prisma.emailAccount.update({
          where: { id: accountId },
          data: {
            accessToken: credentials.access_token || undefined,
            tokenExpiry: credentials.expiry_date ? new Date(credentials.expiry_date) : null
          }
        });
        oauth2Client.setCredentials(credentials);
      }

      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

      // Create email message
      const message = [
        `To: ${to}`,
        cc ? `Cc: ${cc}` : '',
        bcc ? `Bcc: ${bcc}` : '',
        `Subject: ${subject}`,
        '',
        body
      ].filter(line => line !== '').join('\n');

      const encodedMessage = Buffer.from(message)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      // Send email
      const result = await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: encodedMessage
        }
      });

      // Save to our database
      await prisma.email.create({
        data: {
          id: `gmail-${accountId}-${result.data.id}`,
          oggetto: subject,
          corpo: body,
          mittente: emailAccount.accountEmail,
          destinatari: JSON.stringify([to]),
          cc: cc ? JSON.stringify([cc]) : undefined,
          bcc: bcc ? JSON.stringify([bcc]) : undefined,
          stato: 'inviata',
          userId: req.user!.id,
          dataInvio: new Date()
        }
      });

      res.json({
        success: true,
        messageId: result.data.id
      });
    } catch (error: any) {
      console.error('Error sending email:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Disconnect Gmail account
  async disconnect(req: AuthRequest, res: Response) {
    try {
      const { accountId } = req.params;

      const emailAccount = await prisma.emailAccount.findUnique({
        where: { id: accountId }
      });

      if (!emailAccount || emailAccount.userId !== req.user!.id) {
        return res.status(404).json({ error: 'Email account not found' });
      }

      await prisma.emailAccount.delete({
        where: { id: accountId }
      });

      await prisma.notification.create({
        data: {
          userId: req.user!.id,
          tipo: 'email_disconnected',
          titolo: 'Gmail disconnesso',
          messaggio: `Il tuo account Gmail (${emailAccount.accountEmail}) è stato scollegato.`
        }
      });

      res.json({ success: true });
    } catch (error: any) {
      console.error('Error disconnecting email:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Toggle sync
  async toggleSync(req: AuthRequest, res: Response) {
    try {
      const { accountId } = req.params;
      const { syncEnabled } = req.body;

      const emailAccount = await prisma.emailAccount.findUnique({
        where: { id: accountId }
      });

      if (!emailAccount || emailAccount.userId !== req.user!.id) {
        return res.status(404).json({ error: 'Email account not found' });
      }

      await prisma.emailAccount.update({
        where: { id: accountId },
        data: { syncEnabled }
      });

      res.json({ success: true });
    } catch (error: any) {
      console.error('Error toggling sync:', error);
      res.status(500).json({ error: error.message });
    }
  }
}

export default new GmailController();
