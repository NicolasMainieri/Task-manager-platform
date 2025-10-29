import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import preventivoController from '../controllers/preventivoController';

const router = Router();

/**
 * @route   POST /api/preventivi/analyze
 * @desc    Analizza link prodotti e restituisce dati estratti con AI (senza salvare)
 * @access  Private
 */
router.post('/analyze', authenticate, preventivoController.analyzeProduct);

/**
 * @route   POST /api/preventivi
 * @desc    Crea nuovo preventivo con dati estratti dall'AI
 * @access  Private
 */
router.post('/', authenticate, preventivoController.createPreventivo);

/**
 * @route   GET /api/preventivi
 * @desc    Lista preventivi dell'azienda
 * @query   stato (opzionale): 'bozza' | 'inviato' | 'approvato' | 'rifiutato'
 * @access  Private
 */
router.get('/', authenticate, preventivoController.getPreventiviList);

/**
 * @route   GET /api/preventivi/:id
 * @desc    Ottieni singolo preventivo
 * @access  Private
 */
router.get('/:id', authenticate, preventivoController.getPreventivoById);

/**
 * @route   PUT /api/preventivi/:id
 * @desc    Aggiorna preventivo
 * @access  Private
 */
router.put('/:id', authenticate, preventivoController.updatePreventivo);

/**
 * @route   PUT /api/preventivi/:id/stato
 * @desc    Cambia stato preventivo
 * @body    { stato: 'bozza' | 'inviato' | 'approvato' | 'rifiutato' }
 * @access  Private
 */
router.put('/:id/stato', authenticate, preventivoController.updateStatoPreventivo);

/**
 * @route   POST /api/preventivi/:id/generate
 * @desc    Genera PDF ed Excel per preventivo esistente
 * @access  Private
 */
router.post('/:id/generate', authenticate, preventivoController.generateFiles);

/**
 * @route   DELETE /api/preventivi/:id
 * @desc    Elimina preventivo
 * @access  Private
 */
router.delete('/:id', authenticate, preventivoController.deletePreventivo);

export default router;
