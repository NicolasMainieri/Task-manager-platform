import nodemailer from 'nodemailer';
import prisma from '../config/database';
import { stringifyJsonField } from '../utils/jsonHelper';

// Configurazione transporter nodemailer
// Usa le variabili d'ambiente per configurazione SMTP
const createTransporter = () => {
  // Supporta Gmail, SendGrid, SMTP custom, etc.
  const emailService = process.env.EMAIL_SERVICE || 'gmail';

  if (emailService === 'gmail') {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD // App Password per Gmail
      }
    });
  } else if (emailService === 'sendgrid') {
    return nodemailer.createTransport({
      host: 'smtp.sendgrid.net',
      port: 587,
      auth: {
        user: 'apikey',
        pass: process.env.SENDGRID_API_KEY
      }
    });
  } else {
    // SMTP generico
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });
  }
};

/**
 * Invia una singola email newsletter
 */
export async function sendNewsletterEmail(params: {
  to: string;
  toName?: string;
  subject: string;
  htmlContent: string;
  fromName?: string;
  fromEmail?: string;
}) {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `${params.fromName || 'Newsletter'} <${params.fromEmail || process.env.EMAIL_USER}>`,
      to: params.to,
      subject: params.subject,
      html: params.htmlContent,
      // Headers per tracking (opzionale)
      headers: {
        'X-Newsletter-ID': Date.now().toString()
      }
    };

    const info = await transporter.sendMail(mailOptions);

    console.log('[emailSender] Email inviata a:', params.to, 'ID:', info.messageId);

    return {
      success: true,
      messageId: info.messageId,
      accepted: info.accepted,
      rejected: info.rejected
    };

  } catch (error: any) {
    console.error('[emailSender] Errore invio email:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Processa invio newsletter massivo (batch processing)
 */
export async function processNewsletterSending(newsletterId: string) {
  try {
    console.log('[emailSender] Inizio processamento newsletter:', newsletterId);

    const newsletter = await prisma.newsletter.findUnique({
      where: { id: newsletterId }
    });

    if (!newsletter) {
      throw new Error('Newsletter non trovata');
    }

    // Ottieni tutti gli invii in coda
    const inviiInCoda = await prisma.newsletterInvio.findMany({
      where: {
        newsletterId,
        stato: 'in_coda'
      },
      take: 100 // Processa 100 alla volta per non sovraccaricare
    });

    console.log(`[emailSender] Trovati ${inviiInCoda.length} invii in coda`);

    let inviiRiusciti = 0;
    let inviiFalliti = 0;

    // Invia email in batch con delay per evitare rate limiting
    for (const invio of inviiInCoda) {
      try {
        // Delay di 100ms tra un invio e l'altro
        await new Promise(resolve => setTimeout(resolve, 100));

        const result = await sendNewsletterEmail({
          to: invio.emailDestinatario,
          toName: invio.nomeDestinatario || undefined,
          subject: newsletter.oggetto,
          htmlContent: newsletter.contenutoHTML,
          fromName: 'Planora Newsletter'
        });

        if (result.success) {
          // Aggiorna stato invio
          await prisma.newsletterInvio.update({
            where: { id: invio.id },
            data: {
              stato: 'inviato',
              dataInvio: new Date()
            }
          });
          inviiRiusciti++;
        } else {
          // Segna come fallito
          await prisma.newsletterInvio.update({
            where: { id: invio.id },
            data: {
              stato: 'fallito',
              errore: result.error
            }
          });
          inviiFalliti++;
        }

      } catch (error: any) {
        console.error('[emailSender] Errore invio a:', invio.emailDestinatario, error);
        await prisma.newsletterInvio.update({
          where: { id: invio.id },
          data: {
            stato: 'fallito',
            errore: error.message
          }
        });
        inviiFalliti++;
      }
    }

    // Aggiorna statistiche newsletter
    await prisma.newsletter.update({
      where: { id: newsletterId },
      data: {
        totaleInviati: { increment: inviiRiusciti },
        stato: inviiInCoda.length === inviiRiusciti + inviiFalliti ? 'inviata' : 'in_invio'
      }
    });

    console.log(`[emailSender] Completato: ${inviiRiusciti} riusciti, ${inviiFalliti} falliti`);

    return {
      success: true,
      inviiRiusciti,
      inviiFalliti,
      totale: inviiInCoda.length
    };

  } catch (error: any) {
    console.error('[emailSender] Errore processamento newsletter:', error);

    // Aggiorna stato newsletter a errore
    await prisma.newsletter.update({
      where: { id: newsletterId },
      data: { stato: 'errore' }
    });

    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Verifica configurazione email
 */
export async function verifyEmailConfiguration() {
  try {
    const transporter = createTransporter();
    await transporter.verify();
    console.log('[emailSender] Configurazione email verificata con successo');
    return { success: true, message: 'Configurazione email valida' };
  } catch (error: any) {
    console.error('[emailSender] Errore verifica configurazione:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Invia email di test
 */
export async function sendTestEmail(to: string) {
  try {
    const result = await sendNewsletterEmail({
      to,
      subject: 'Test Email - Planora Newsletter System',
      htmlContent: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #667eea;">Test Email Successful!</h1>
          <p>Se ricevi questa email, la configurazione del sistema newsletter è corretta.</p>
          <p style="color: #666; font-size: 12px;">Inviato da Planora Newsletter System</p>
        </div>
      `
    });

    return result;
  } catch (error: any) {
    console.error('[emailSender] Errore invio email test:', error);
    return { success: false, error: error.message };
  }
}
