import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Middleware per verificare se un modulo è attivo per l'azienda dell'utente
 * @param moduleName - Nome del modulo da verificare (es: 'preventivi', 'newsletter', 'studi_legali')
 */
export const checkModule = (moduleName: string) => {
  return async (req: any, res: Response, next: NextFunction) => {
    try {
      const userId = req.userId;

      if (!userId) {
        return res.status(401).json({ error: 'Non autenticato' });
      }

      // SuperAdmin ha sempre accesso a tutto
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          isSuperAdmin: true,
          companyId: true
        }
      });

      if (user?.isSuperAdmin) {
        return next();
      }

      if (!user?.companyId) {
        return res.status(403).json({ error: 'Utente non associato ad alcuna azienda' });
      }

      // Verifica se il modulo è attivo per l'azienda
      const company = await prisma.company.findUnique({
        where: { id: user.companyId },
        select: {
          moduliAttivi: true,
          categoria: true
        }
      });

      if (!company) {
        return res.status(404).json({ error: 'Azienda non trovata' });
      }

      const moduliAttivi: string[] = JSON.parse(company.moduliAttivi || '[]');

      // Task management è sempre abilitato
      if (moduleName === 'tasks') {
        return next();
      }

      // Verifica se il modulo è attivo
      if (!moduliAttivi.includes(moduleName)) {
        return res.status(403).json({
          error: `Modulo "${moduleName}" non attivo per questa azienda`,
          moduleName,
          moduliAttivi
        });
      }

      next();
    } catch (error) {
      console.error('Errore verifica modulo:', error);
      return res.status(500).json({ error: 'Errore durante la verifica del modulo' });
    }
  };
};

/**
 * Middleware per verificare la categoria azienda
 * @param requiredCategoria - Categoria richiesta (es: 'studio_legale')
 */
export const checkCompanyCategory = (requiredCategoria: string) => {
  return async (req: any, res: Response, next: NextFunction) => {
    try {
      const userId = req.userId;

      if (!userId) {
        return res.status(401).json({ error: 'Non autenticato' });
      }

      // SuperAdmin ha sempre accesso
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          isSuperAdmin: true,
          companyId: true
        }
      });

      if (user?.isSuperAdmin) {
        return next();
      }

      if (!user?.companyId) {
        return res.status(403).json({ error: 'Utente non associato ad alcuna azienda' });
      }

      const company = await prisma.company.findUnique({
        where: { id: user.companyId },
        select: { categoria: true }
      });

      if (!company) {
        return res.status(404).json({ error: 'Azienda non trovata' });
      }

      if (company.categoria !== requiredCategoria) {
        return res.status(403).json({
          error: `Questa funzionalità è disponibile solo per aziende di tipo "${requiredCategoria}"`,
          requiredCategoria,
          currentCategoria: company.categoria
        });
      }

      next();
    } catch (error) {
      console.error('Errore verifica categoria:', error);
      return res.status(500).json({ error: 'Errore durante la verifica della categoria' });
    }
  };
};

/**
 * Helper per ottenere i moduli attivi dell'azienda dell'utente corrente
 */
export const getUserModules = async (userId: string): Promise<string[]> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        isSuperAdmin: true,
        company: {
          select: {
            moduliAttivi: true
          }
        }
      }
    });

    // SuperAdmin ha tutti i moduli
    if (user?.isSuperAdmin) {
      return ['tasks', 'preventivi', 'newsletter', 'presenze', 'inventario', 'fatture', 'pagamenti', 'meeting', 'brain_ai', 'studi_legali', 'crm', 'contacts'];
    }

    if (!user?.company) {
      return ['tasks']; // Solo task management di default
    }

    const moduliAttivi: string[] = JSON.parse(user.company.moduliAttivi || '[]');

    // Task management è sempre incluso
    if (!moduliAttivi.includes('tasks')) {
      moduliAttivi.unshift('tasks');
    }

    return moduliAttivi;
  } catch (error) {
    console.error('Errore recupero moduli utente:', error);
    return ['tasks'];
  }
};
