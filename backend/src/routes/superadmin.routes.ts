import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Middleware per verificare che l'utente sia SuperAdmin
const requireSuperAdmin = async (req: any, res: any, next: any) => {
  try {
    const userId = req.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isSuperAdmin: true }
    });

    if (!user?.isSuperAdmin) {
      return res.status(403).json({ error: 'Accesso negato. Solo SuperAdmin' });
    }

    next();
  } catch (error) {
    return res.status(500).json({ error: 'Errore durante la verifica dei permessi' });
  }
};

// Applica il middleware a tutte le route di questo router
router.use(requireSuperAdmin);

// ===================================
// GESTIONE AZIENDE
// ===================================

// GET /api/superadmin/companies - Lista tutte le aziende
router.get('/companies', async (req, res) => {
  try {
    const companies = await prisma.company.findMany({
      include: {
        admin: {
          select: {
            id: true,
            nome: true,
            cognome: true,
            email: true
          }
        },
        _count: {
          select: {
            users: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const companiesWithModules = companies.map(company => ({
      ...company,
      moduliAttivi: JSON.parse(company.moduliAttivi || '[]'),
      totalUsers: company._count.users
    }));

    res.json(companiesWithModules);
  } catch (error) {
    console.error('Errore recupero aziende:', error);
    res.status(500).json({ error: 'Errore durante il recupero delle aziende' });
  }
});

// GET /api/superadmin/companies/:id - Dettagli azienda
router.get('/companies/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const company = await prisma.company.findUnique({
      where: { id },
      include: {
        admin: {
          select: {
            id: true,
            nome: true,
            cognome: true,
            email: true,
            telefono: true
          }
        },
        users: {
          select: {
            id: true,
            nome: true,
            cognome: true,
            email: true,
            role: {
              select: {
                nome: true
              }
            },
            status: true,
            createdAt: true
          }
        }
      }
    });

    if (!company) {
      return res.status(404).json({ error: 'Azienda non trovata' });
    }

    const companyWithModules = {
      ...company,
      moduliAttivi: JSON.parse(company.moduliAttivi || '[]')
    };

    res.json(companyWithModules);
  } catch (error) {
    console.error('Errore recupero azienda:', error);
    res.status(500).json({ error: 'Errore durante il recupero dell\'azienda' });
  }
});

// PUT /api/superadmin/companies/:id - Aggiorna piano azienda
router.put('/companies/:id/plan', async (req, res) => {
  try {
    const { id } = req.params;
    const { plan, planStatus, subscriptionEndsAt } = req.body;

    const company = await prisma.company.update({
      where: { id },
      data: {
        plan,
        planStatus,
        subscriptionEndsAt: subscriptionEndsAt ? new Date(subscriptionEndsAt) : undefined
      }
    });

    res.json({
      ...company,
      moduliAttivi: JSON.parse(company.moduliAttivi || '[]')
    });
  } catch (error) {
    console.error('Errore aggiornamento piano:', error);
    res.status(500).json({ error: 'Errore durante l\'aggiornamento del piano' });
  }
});

// PUT /api/superadmin/companies/:id/modules - Aggiorna moduli attivi
router.put('/companies/:id/modules', async (req, res) => {
  try {
    const { id } = req.params;
    const { moduliAttivi } = req.body;

    if (!Array.isArray(moduliAttivi)) {
      return res.status(400).json({ error: 'moduliAttivi deve essere un array' });
    }

    const company = await prisma.company.update({
      where: { id },
      data: {
        moduliAttivi: JSON.stringify(moduliAttivi)
      }
    });

    res.json({
      ...company,
      moduliAttivi: JSON.parse(company.moduliAttivi)
    });
  } catch (error) {
    console.error('Errore aggiornamento moduli:', error);
    res.status(500).json({ error: 'Errore durante l\'aggiornamento dei moduli' });
  }
});

// PUT /api/superadmin/companies/:id/categoria - Aggiorna categoria azienda
router.put('/companies/:id/categoria', async (req, res) => {
  try {
    const { id } = req.params;
    const { categoria } = req.body;

    const validCategories = ['generale', 'ecommerce', 'studio_legale', 'agenzia', 'software_house', 'manifatturiero'];

    if (!validCategories.includes(categoria)) {
      return res.status(400).json({ error: 'Categoria non valida' });
    }

    const company = await prisma.company.update({
      where: { id },
      data: { categoria }
    });

    res.json({
      ...company,
      moduliAttivi: JSON.parse(company.moduliAttivi || '[]')
    });
  } catch (error) {
    console.error('Errore aggiornamento categoria:', error);
    res.status(500).json({ error: 'Errore durante l\'aggiornamento della categoria' });
  }
});

// ===================================
// STATISTICHE GLOBALI
// ===================================

// GET /api/superadmin/stats - Statistiche globali
router.get('/stats', async (req, res) => {
  try {
    const totalCompanies = await prisma.company.count();
    const totalUsers = await prisma.user.count();
    const totalTasks = await prisma.task.count();

    const companiesByPlan = await prisma.company.groupBy({
      by: ['plan'],
      _count: true
    });

    const companiesByCategory = await prisma.company.groupBy({
      by: ['categoria'],
      _count: true
    });

    const recentCompanies = await prisma.company.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        nome: true,
        plan: true,
        categoria: true,
        createdAt: true
      }
    });

    res.json({
      totalCompanies,
      totalUsers,
      totalTasks,
      companiesByPlan: companiesByPlan.map(item => ({
        plan: item.plan,
        count: item._count
      })),
      companiesByCategory: companiesByCategory.map(item => ({
        categoria: item.categoria,
        count: item._count
      })),
      recentCompanies
    });
  } catch (error) {
    console.error('Errore recupero statistiche:', error);
    res.status(500).json({ error: 'Errore durante il recupero delle statistiche' });
  }
});

// ===================================
// MODULI DISPONIBILI
// ===================================

// GET /api/superadmin/modules - Lista moduli disponibili
router.get('/modules', (req, res) => {
  const modules = [
    {
      id: 'tasks',
      nome: 'Task Management',
      descrizione: 'Gestione task e progetti',
      categoria: 'core',
      alwaysEnabled: true,
      icon: 'CheckSquare'
    },
    {
      id: 'preventivi',
      nome: 'Preventivi AI',
      descrizione: 'Generazione preventivi con AI',
      categoria: 'business',
      alwaysEnabled: false,
      icon: 'FileText'
    },
    {
      id: 'newsletter',
      nome: 'Newsletter',
      descrizione: 'Gestione e invio newsletter',
      categoria: 'marketing',
      alwaysEnabled: false,
      icon: 'Mail'
    },
    {
      id: 'presenze',
      nome: 'Presenze e Assenze',
      descrizione: 'Timbrature e gestione ferie',
      categoria: 'hr',
      alwaysEnabled: false,
      icon: 'Clock'
    },
    {
      id: 'inventario',
      nome: 'Inventario',
      descrizione: 'Gestione inventario prodotti',
      categoria: 'business',
      alwaysEnabled: false,
      icon: 'Package'
    },
    {
      id: 'fatture',
      nome: 'Fatture',
      descrizione: 'Fatturazione e gestione pagamenti',
      categoria: 'business',
      alwaysEnabled: false,
      icon: 'Receipt'
    },
    {
      id: 'pagamenti',
      nome: 'Pagamenti',
      descrizione: 'Tracciamento pagamenti ricevuti',
      categoria: 'business',
      alwaysEnabled: false,
      icon: 'CreditCard'
    },
    {
      id: 'meeting',
      nome: 'Meeting e Videochiamate',
      descrizione: 'Videochiamate e meeting room',
      categoria: 'communication',
      alwaysEnabled: false,
      icon: 'Video'
    },
    {
      id: 'brain_ai',
      nome: 'Brain AI',
      descrizione: 'Assistente AI avanzato',
      categoria: 'ai',
      alwaysEnabled: false,
      icon: 'Brain'
    },
    {
      id: 'studi_legali',
      nome: 'Studi Legali',
      descrizione: 'Ricerca giurisprudenza e gestione casi',
      categoria: 'specializzato',
      alwaysEnabled: false,
      icon: 'Scale'
    },
    {
      id: 'crm',
      nome: 'CRM Personalizzabile',
      descrizione: 'Sistema CRM con campi custom',
      categoria: 'business',
      alwaysEnabled: false,
      icon: 'Users'
    },
    {
      id: 'contacts',
      nome: 'Contatti',
      descrizione: 'Gestione contatti e clienti',
      categoria: 'business',
      alwaysEnabled: false,
      icon: 'UserCheck'
    }
  ];

  res.json(modules);
});

export default router;
