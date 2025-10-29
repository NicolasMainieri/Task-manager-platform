import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest, authenticate } from '../middleware/auth';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();
const prisma = new PrismaClient();

// Configurazione upload directory (usa percorso relativo dalla root del progetto)
const uploadsDir = path.join(process.cwd(), 'uploads', 'documents');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configurazione Multer per upload file
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB max
  },
  fileFilter: (req, file, cb) => {
    // Accetta tutti i tipi di file
    cb(null, true);
  }
});

// GET /api/documents/contact/:contactId - Ottieni tutti i documenti di un contatto
router.get('/contact/:contactId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { contactId } = req.params;
    const companyId = req.user!.companyId;

    const documents = await prisma.document.findMany({
      where: {
        contactId,
        companyId
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json(documents);
  } catch (error) {
    console.error('Errore nel recupero documenti:', error);
    res.status(500).json({ error: 'Errore nel recupero documenti' });
  }
});

// GET /api/documents/task/:taskId - Ottieni tutti i documenti di una task
router.get('/task/:taskId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { taskId } = req.params;
    const companyId = req.user!.companyId;

    const documents = await prisma.document.findMany({
      where: {
        taskId,
        companyId
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json(documents);
  } catch (error) {
    console.error('Errore nel recupero documenti:', error);
    res.status(500).json({ error: 'Errore nel recupero documenti' });
  }
});

// GET /api/documents/project/:projectId - Ottieni tutti i documenti di un progetto
router.get('/project/:projectId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { projectId } = req.params;
    const userId = req.user!.id;
    const companyId = req.user!.companyId;

    // Verifica che l'utente abbia accesso al progetto
    const project = await prisma.progetto.findFirst({
      where: {
        id: projectId,
        companyId
      }
    });

    if (!project) {
      return res.status(404).json({ error: 'Progetto non trovato' });
    }

    const documents = await prisma.document.findMany({
      where: {
        progettoId: projectId,
        companyId
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json(documents);
  } catch (error) {
    console.error('Errore nel recupero documenti:', error);
    res.status(500).json({ error: 'Errore nel recupero documenti' });
  }
});

// POST /api/documents/contact/:contactId/upload - Upload documento per contatto
router.post('/contact/:contactId/upload', authenticate, upload.single('file'), async (req: AuthRequest, res: Response) => {
  try {
    const { contactId } = req.params;
    const userId = req.user!.id;
    const companyId = req.user!.companyId;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'Nessun file caricato' });
    }

    const { descrizione, categoria, tags } = req.body;

    // Determina il tipo di file
    const ext = path.extname(file.originalname).toLowerCase();
    let tipo = 'other';
    if (['.pdf'].includes(ext)) tipo = 'pdf';
    else if (['.doc', '.docx'].includes(ext)) tipo = 'doc';
    else if (['.xls', '.xlsx', '.csv'].includes(ext)) tipo = 'xls';
    else if (['.ppt', '.pptx'].includes(ext)) tipo = 'ppt';
    else if (['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.webp'].includes(ext)) tipo = 'img';
    else if (['.mp3', '.wav', '.ogg', '.m4a', '.flac'].includes(ext)) tipo = 'audio';
    else if (['.mp4', '.avi', '.mov', '.wmv', '.flv', '.mkv'].includes(ext)) tipo = 'video';
    else if (['.zip', '.rar', '.7z', '.tar', '.gz'].includes(ext)) tipo = 'archive';

    // Crea il documento nel database
    const document = await prisma.document.create({
      data: {
        nome: file.originalname,
        descrizione: descrizione || null,
        tipo,
        dimensione: file.size,
        url: `/uploads/documents/${file.filename}`,
        mimeType: file.mimetype,
        contactId,
        uploadedById: userId,
        companyId,
        tags: tags ? JSON.stringify(tags) : '[]',
        categoria: categoria || null
      }
    });

    res.json(document);
  } catch (error) {
    console.error('Errore nel caricamento documento:', error);
    res.status(500).json({ error: 'Errore nel caricamento documento' });
  }
});

// POST /api/documents/project/:projectId/upload - Upload documento
router.post('/project/:projectId/upload', authenticate, upload.single('file'), async (req: AuthRequest, res: Response) => {
  try {
    const { projectId } = req.params;
    const userId = req.user!.id;
    const companyId = req.user!.companyId;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'Nessun file caricato' });
    }

    // Verifica che l'utente abbia accesso al progetto
    const project = await prisma.progetto.findFirst({
      where: {
        id: projectId,
        companyId
      }
    });

    if (!project) {
      // Elimina il file caricato
      fs.unlinkSync(file.path);
      return res.status(404).json({ error: 'Progetto non trovato' });
    }

    const { descrizione, categoria, tags } = req.body;

    // Determina il tipo di file
    const ext = path.extname(file.originalname).toLowerCase();
    let tipo = 'other';
    if (['.pdf'].includes(ext)) tipo = 'pdf';
    else if (['.doc', '.docx'].includes(ext)) tipo = 'doc';
    else if (['.xls', '.xlsx', '.csv'].includes(ext)) tipo = 'xls';
    else if (['.ppt', '.pptx'].includes(ext)) tipo = 'ppt';
    else if (['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.webp'].includes(ext)) tipo = 'img';
    else if (['.mp3', '.wav', '.ogg', '.m4a', '.flac'].includes(ext)) tipo = 'audio';
    else if (['.mp4', '.avi', '.mov', '.wmv', '.flv', '.mkv'].includes(ext)) tipo = 'video';
    else if (['.zip', '.rar', '.7z', '.tar', '.gz'].includes(ext)) tipo = 'archive';

    // Crea il documento nel database
    const document = await prisma.document.create({
      data: {
        nome: file.originalname,
        descrizione: descrizione || null,
        tipo,
        dimensione: file.size,
        url: `/uploads/documents/${file.filename}`,
        mimeType: file.mimetype,
        progettoId: projectId,
        uploadedById: userId,
        companyId,
        tags: tags ? JSON.stringify(tags) : '[]',
        categoria: categoria || null
      }
    });

    res.json(document);
  } catch (error) {
    console.error('Errore nel caricamento documento:', error);
    res.status(500).json({ error: 'Errore nel caricamento documento' });
  }
});

// POST /api/documents/drive/upload - Upload documento generico nel Drive (opzionalmente in una cartella)
router.post('/drive/upload', authenticate, upload.single('file'), async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const companyId = req.user!.companyId;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'Nessun file caricato' });
    }

    const { folderId, descrizione, categoria, tags } = req.body;

    // Determina il tipo di file
    const ext = path.extname(file.originalname).toLowerCase();
    let tipo = 'other';
    if (['.pdf'].includes(ext)) tipo = 'pdf';
    else if (['.doc', '.docx'].includes(ext)) tipo = 'doc';
    else if (['.xls', '.xlsx', '.csv'].includes(ext)) tipo = 'xls';
    else if (['.ppt', '.pptx'].includes(ext)) tipo = 'ppt';
    else if (['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.webp'].includes(ext)) tipo = 'img';
    else if (['.mp3', '.wav', '.ogg', '.m4a', '.flac'].includes(ext)) tipo = 'audio';
    else if (['.mp4', '.avi', '.mov', '.wmv', '.flv', '.mkv'].includes(ext)) tipo = 'video';
    else if (['.zip', '.rar', '.7z', '.tar', '.gz'].includes(ext)) tipo = 'archive';

    // Crea il documento nel database
    const document = await prisma.document.create({
      data: {
        nome: file.originalname,
        descrizione: descrizione || null,
        tipo,
        dimensione: file.size,
        url: `/uploads/documents/${file.filename}`,
        mimeType: file.mimetype,
        folderId: folderId || null,
        uploadedById: userId,
        companyId,
        tags: tags ? JSON.stringify(tags) : '[]',
        categoria: categoria || null
      }
    });

    res.json(document);
  } catch (error) {
    console.error('Errore nel caricamento documento:', error);
    res.status(500).json({ error: 'Errore nel caricamento documento' });
  }
});

// POST /api/documents/task/:taskId/upload - Upload documento per task
router.post('/task/:taskId/upload', authenticate, upload.single('file'), async (req: AuthRequest, res: Response) => {
  try {
    const { taskId } = req.params;
    const userId = req.user!.id;
    const companyId = req.user!.companyId;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'Nessun file caricato' });
    }

    const { descrizione, categoria, tags } = req.body;

    // Determina il tipo di file
    const ext = path.extname(file.originalname).toLowerCase();
    let tipo = 'other';
    if (['.pdf'].includes(ext)) tipo = 'pdf';
    else if (['.doc', '.docx'].includes(ext)) tipo = 'doc';
    else if (['.xls', '.xlsx', '.csv'].includes(ext)) tipo = 'xls';
    else if (['.ppt', '.pptx'].includes(ext)) tipo = 'ppt';
    else if (['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.webp'].includes(ext)) tipo = 'img';
    else if (['.mp3', '.wav', '.ogg', '.m4a', '.flac'].includes(ext)) tipo = 'audio';
    else if (['.mp4', '.avi', '.mov', '.wmv', '.flv', '.mkv'].includes(ext)) tipo = 'video';
    else if (['.zip', '.rar', '.7z', '.tar', '.gz'].includes(ext)) tipo = 'archive';

    // Crea il documento nel database
    const document = await prisma.document.create({
      data: {
        nome: file.originalname,
        descrizione: descrizione || null,
        tipo,
        dimensione: file.size,
        url: `/uploads/documents/${file.filename}`,
        mimeType: file.mimetype,
        taskId,
        uploadedById: userId,
        companyId,
        tags: tags ? JSON.stringify(tags) : '[]',
        categoria: categoria || null
      }
    });

    res.json(document);
  } catch (error) {
    console.error('Errore nel caricamento documento:', error);
    res.status(500).json({ error: 'Errore nel caricamento documento' });
  }
});

// POST /api/documents/:documentId/link - Collega un documento esistente a progetto/task/contatto
router.post('/:documentId/link', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { documentId } = req.params;
    const { targetType, targetId } = req.body; // targetType: 'project' | 'task' | 'contact'
    const companyId = req.user!.companyId;

    if (!targetType || !targetId) {
      return res.status(400).json({ error: 'targetType e targetId sono obbligatori' });
    }

    // Verifica che il documento esista e appartenga alla stessa company
    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        companyId
      }
    });

    if (!document) {
      return res.status(404).json({ error: 'Documento non trovato' });
    }

    // Aggiorna il collegamento del documento
    const updateData: any = {};
    if (targetType === 'project') {
      updateData.progettoId = targetId;
    } else if (targetType === 'task') {
      updateData.taskId = targetId;
    } else if (targetType === 'contact') {
      updateData.contactId = targetId;
    } else {
      return res.status(400).json({ error: 'targetType non valido' });
    }

    const updatedDocument = await prisma.document.update({
      where: { id: documentId },
      data: updateData
    });

    res.json(updatedDocument);
  } catch (error) {
    console.error('Errore nel collegamento documento:', error);
    res.status(500).json({ error: 'Errore nel collegamento documento' });
  }
});

// DELETE /api/documents/:id - Elimina documento
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const companyId = req.user!.companyId;

    const document = await prisma.document.findFirst({
      where: {
        id,
        companyId
      }
    });

    if (!document) {
      return res.status(404).json({ error: 'Documento non trovato' });
    }

    // Elimina il file dal filesystem
    const filePath = path.join(process.cwd(), document.url);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Elimina il documento dal database
    await prisma.document.delete({
      where: { id }
    });

    res.json({ message: 'Documento eliminato' });
  } catch (error) {
    console.error('Errore nell\'eliminazione documento:', error);
    res.status(500).json({ error: 'Errore nell\'eliminazione documento' });
  }
});

// GET /api/documents/:id/download - Download documento
router.get('/:id/download', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const companyId = req.user!.companyId;

    const document = await prisma.document.findFirst({
      where: {
        id,
        companyId
      }
    });

    if (!document) {
      return res.status(404).json({ error: 'Documento non trovato' });
    }

    const filePath = path.join(process.cwd(), document.url);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File non trovato' });
    }

    res.download(filePath, document.nome);
  } catch (error) {
    console.error('Errore nel download documento:', error);
    res.status(500).json({ error: 'Errore nel download documento' });
  }
});

export default router;
