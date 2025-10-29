import React, { useState, useEffect } from 'react';
import axios from 'axios';
import API_URL from '../config/api';
import {
  Mail, Plus, Send, Eye, Code, Wand2, Calendar, Users, FileText,
  Trash2, Copy, Edit, Save, X, AlertCircle, CheckCircle, Clock,
  Sparkles, TrendingUp, Target, Zap, Palette, ExternalLink, Upload,
  Image as ImageIcon
} from 'lucide-react';

interface Newsletter {
  id: string;
  nome: string;
  oggetto: string;
  contenutoHTML: string;
  anteprimaTesto?: string;
  stato: string;
  tipoProgrammazione: string;
  dataProgrammata?: string;
  isRicorrente: boolean;
  eventoPromozionale?: string;
  tipoDestinatari: string;
  contattiInterni: string;
  listaEsterna: string;
  totaleDestinatari: number;
  totaleInviati: number;
  aiGenerato: boolean;
  createdAt: string;
  updatedAt: string;
}

interface EventoPromozionale {
  evento: string;
  nome: string;
  descrizione: string;
  dataEvento: string;
  dataNewsletterSuggerita: string;
  giorniMancanti: number;
  suggerimenti: string[];
  urgenza: 'alta' | 'media' | 'bassa';
}

interface CanvaTemplate {
  id: string;
  nome: string;
  descrizione: string;
  thumbnail: string;
  categoria: string;
  canvaUrl: string;
}

const NewsletterPage: React.FC = () => {
  const [newsletters, setNewsletters] = useState<Newsletter[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  const [showCanvaModal, setShowCanvaModal] = useState(false);
  const [viewMode, setViewMode] = useState<'code' | 'preview' | 'canva'>('code');
  const [selectedNewsletter, setSelectedNewsletter] = useState<Newsletter | null>(null);
  const [eventiPromozionali, setEventiPromozionali] = useState<EventoPromozionale[]>([]);
  const [canvaTemplates, setCanvaTemplates] = useState<CanvaTemplate[]>([]);
  const [selectedCanvaTemplate, setSelectedCanvaTemplate] = useState<CanvaTemplate | null>(null);
  const [canvaEmbedUrl, setCanvaEmbedUrl] = useState<string>('');

  // Form state
  const [formData, setFormData] = useState({
    nome: '',
    oggetto: '',
    contenutoHTML: '',
    anteprimaTesto: '',
    tipoProgrammazione: 'manuale',
    dataProgrammata: '',
    tipoDestinatari: 'contatti_interni',
    eventoPromozionale: ''
  });

  // AI form state
  const [aiFormData, setAiFormData] = useState({
    tipo: 'promozionale',
    tema: '',
    contenuto: '',
    eventoPromozionale: '',
    includeCTA: true,
    ctaText: '',
    ctaUrl: ''
  });

  const token = localStorage.getItem('token');

  useEffect(() => {
    loadNewsletters();
    loadEventiPromozionali();
    loadCanvaTemplates();
  }, []);

  const loadNewsletters = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/newsletters`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNewsletters(response.data);
    } catch (error) {
      console.error('Errore caricamento newsletter:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadEventiPromozionali = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/newsletters/ai/analyze-periods`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEventiPromozionali(response.data.eventiRilevanti || []);
    } catch (error) {
      console.error('Errore caricamento eventi:', error);
    }
  };

  const loadCanvaTemplates = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/newsletters/canva/templates`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCanvaTemplates(response.data.templates || []);
    } catch (error) {
      console.error('Errore caricamento template Canva:', error);
    }
  };

  const handleInitializePromotionalTasks = async () => {
    if (!confirm('Vuoi creare task automatici per tutti gli eventi promozionali dell\'anno (Black Friday, Natale, etc.)?')) {
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(
        `${API_URL}/api/newsletters/sync/init-promotional-tasks`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert(`✅ ${response.data.message}\n\nCreati ${response.data.created} task per eventi promozionali.\nControlla la sezione Task e Calendario!`);
    } catch (error: any) {
      console.error('Errore inizializzazione task:', error);
      alert('Errore durante la creazione dei task promozionali');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (selectedNewsletter) {
        await axios.put(
          `${API_URL}/api/newsletters/${selectedNewsletter.id}`,
          formData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } else {
        await axios.post(
          `${API_URL}/api/newsletters`,
          formData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
      setShowModal(false);
      resetForm();
      loadNewsletters();
    } catch (error) {
      console.error('Errore salvataggio newsletter:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Sei sicuro di voler eliminare questa newsletter?')) return;

    try {
      await axios.delete(`${API_URL}/api/newsletters/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      loadNewsletters();
    } catch (error) {
      console.error('Errore eliminazione newsletter:', error);
    }
  };

  const handleSend = async (id: string) => {
    if (!confirm('Sei sicuro di voler inviare questa newsletter a tutti i destinatari?')) return;

    try {
      const response = await axios.post(
        `${API_URL}/api/newsletters/${id}/send`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert(`Newsletter in invio a ${response.data.destinatari} destinatari`);
      loadNewsletters();
    } catch (error: any) {
      console.error('Errore invio newsletter:', error);
      alert(error.response?.data?.error || 'Errore durante l\'invio');
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      await axios.post(
        `${API_URL}/api/newsletters/${id}/duplicate`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      loadNewsletters();
    } catch (error) {
      console.error('Errore duplicazione newsletter:', error);
    }
  };

  const handleGenerateWithAI = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post(
        `${API_URL}/api/newsletters/ai/generate`,
        aiFormData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setFormData({
        ...formData,
        nome: `Newsletter AI - ${aiFormData.tema}`,
        oggetto: aiFormData.tema,
        contenutoHTML: response.data.html,
        eventoPromozionale: aiFormData.eventoPromozionale
      });

      setShowAIModal(false);
      setShowModal(true);
    } catch (error) {
      console.error('Errore generazione AI:', error);
      alert('Errore durante la generazione con AI');
    } finally {
      setLoading(false);
    }
  };

  const openNewsletterModal = (newsletter?: Newsletter) => {
    if (newsletter) {
      setSelectedNewsletter(newsletter);
      setFormData({
        nome: newsletter.nome,
        oggetto: newsletter.oggetto,
        contenutoHTML: newsletter.contenutoHTML,
        anteprimaTesto: newsletter.anteprimaTesto || '',
        tipoProgrammazione: newsletter.tipoProgrammazione,
        dataProgrammata: newsletter.dataProgrammata
          ? new Date(newsletter.dataProgrammata).toISOString().slice(0, 16)
          : '',
        tipoDestinatari: newsletter.tipoDestinatari,
        eventoPromozionale: newsletter.eventoPromozionale || ''
      });
    } else {
      resetForm();
    }
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      nome: '',
      oggetto: '',
      contenutoHTML: '',
      anteprimaTesto: '',
      tipoProgrammazione: 'manuale',
      dataProgrammata: '',
      tipoDestinatari: 'contatti_interni',
      eventoPromozionale: ''
    });
    setSelectedNewsletter(null);
  };

  const getStatoBadge = (stato: string) => {
    const badges = {
      bozza: 'bg-gray-500',
      programmata: 'bg-blue-500',
      inviata: 'bg-green-500',
      in_invio: 'bg-yellow-500',
      errore: 'bg-red-500'
    };
    return badges[stato as keyof typeof badges] || 'bg-gray-500';
  };

  const getUrgenzaBadge = (urgenza: string) => {
    const badges = {
      alta: { bg: 'bg-red-500', icon: AlertCircle },
      media: { bg: 'bg-yellow-500', icon: Clock },
      bassa: { bg: 'bg-green-500', icon: CheckCircle }
    };
    return badges[urgenza as keyof typeof badges] || badges.bassa;
  };

  const handleOpenCanvaTemplate = (template: CanvaTemplate) => {
    // Imposta il template selezionato
    setSelectedCanvaTemplate(template);

    // Genera URL embed di Canva con il template
    // Nota: URL reale Canva richiede API key e autenticazione
    // Qui uso l'URL pubblico che si apre in iframe
    const embedUrl = `${template.canvaUrl}?embed`;
    setCanvaEmbedUrl(embedUrl);

    // Chiudi il modal dei template e apri il modal editor
    setShowCanvaModal(false);
    setViewMode('canva');

    // Se non c'è una newsletter aperta, aprila
    if (!showModal) {
      openNewsletterModal();
    }
  };

  const handleOpenCanvaEditor = () => {
    // Apri editor Canva generico embeddato
    const embedUrl = 'https://www.canva.com/create/newsletters/?embed';
    setCanvaEmbedUrl(embedUrl);
    setSelectedCanvaTemplate(null);

    // Chiudi modal template
    setShowCanvaModal(false);
    setViewMode('canva');

    // Apri modal newsletter se non aperto
    if (!showModal) {
      openNewsletterModal();
    }
  };

  const handleImportFromCanva = () => {
    // Funzione placeholder per importare da Canva
    // In produzione, useresti Canva SDK per ottenere il contenuto
    const htmlPlaceholder = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Newsletter</title>
  <style>
    body { margin: 0; padding: 0; font-family: Arial, sans-serif; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center; color: white; }
    .content { padding: 30px 20px; background: #ffffff; }
    .cta { display: inline-block; padding: 15px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Newsletter Title</h1>
      <p>Design importato da Canva</p>
    </div>
    <div class="content">
      <h2>Contenuto Principale</h2>
      <p>Sostituisci questo testo con il contenuto esportato da Canva.</p>
      <a href="#" class="cta">Call to Action</a>
    </div>
    <div class="footer">
      <p>© 2025 Your Company. All rights reserved.</p>
      <p><a href="#">Unsubscribe</a></p>
    </div>
  </div>
</body>
</html>`;

    setFormData({ ...formData, contenutoHTML: htmlPlaceholder });
    alert('Template importato! Modifica l\'HTML nell\'editor per personalizzare il design.');
    setViewMode('code');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Newsletter</h2>
          <p className="text-gray-400">Crea e gestisci newsletter HTML con AI</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowCanvaModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700"
          >
            <Palette className="w-5 h-5" />
            Design con Canva
          </button>
          <button
            onClick={() => setShowAIModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            <Wand2 className="w-5 h-5" />
            Genera con AI
          </button>
          <button
            onClick={() => openNewsletterModal()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-5 h-5" />
            Nuova Newsletter
          </button>
        </div>
      </div>

      {/* Eventi Promozionali Alert */}
      {eventiPromozionali.length > 0 && (
        <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Sparkles className="w-6 h-6 text-purple-400 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-white font-semibold">Eventi Promozionali in Arrivo</h3>
                <button
                  onClick={handleInitializePromotionalTasks}
                  className="flex items-center gap-2 px-3 py-1.5 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700"
                  disabled={loading}
                >
                  <Calendar className="w-4 h-4" />
                  Crea Task Automatici
                </button>
              </div>
              <div className="space-y-2">
                {eventiPromozionali.slice(0, 3).map((evento) => {
                  const Badge = getUrgenzaBadge(evento.urgenza);
                  return (
                    <div key={evento.evento} className="flex items-center gap-2 text-sm">
                      <Badge.icon className={`w-4 h-4 ${Badge.bg.replace('bg-', 'text-')}`} />
                      <span className="text-gray-300">
                        <strong className="text-white">{evento.nome}</strong> tra {evento.giorniMancanti} giorni
                        {' - '}Invia newsletter il {new Date(evento.dataNewsletterSuggerita).toLocaleDateString('it-IT')}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Newsletter List */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Caricamento...</div>
      ) : newsletters.length === 0 ? (
        <div className="bg-slate-800/50 backdrop-blur-sm border border-indigo-500/20 rounded-lg p-12 text-center">
          <Mail className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">Nessuna Newsletter</h3>
          <p className="text-gray-400 mb-6">Inizia creando la tua prima newsletter</p>
          <button
            onClick={() => setShowAIModal(true)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            <Wand2 className="w-5 h-5" />
            Genera con AI
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {newsletters.map((newsletter) => (
            <div
              key={newsletter.id}
              className="bg-slate-800/50 backdrop-blur-sm border border-indigo-500/20 rounded-lg p-4 hover:border-indigo-500/40 transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-white font-semibold text-lg truncate">
                      {newsletter.nome}
                    </h3>
                    {newsletter.aiGenerato && (
                      <Sparkles className="w-4 h-4 text-purple-400 flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-gray-400 text-sm truncate">{newsletter.oggetto}</p>
                </div>
                <span className={`px-2 py-1 ${getStatoBadge(newsletter.stato)} text-white text-xs rounded-full capitalize`}>
                  {newsletter.stato}
                </span>
              </div>

              <div className="space-y-2 mb-4 text-sm text-gray-400">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  <span>{newsletter.totaleDestinatari || 0} destinatari</span>
                </div>
                {newsletter.dataProgrammata && (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>
                      {new Date(newsletter.dataProgrammata).toLocaleDateString('it-IT', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>
                    {new Date(newsletter.createdAt).toLocaleDateString('it-IT')}
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => openNewsletterModal(newsletter)}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                >
                  <Edit className="w-4 h-4" />
                  Modifica
                </button>
                {newsletter.stato === 'bozza' && (
                  <button
                    onClick={() => handleSend(newsletter.id)}
                    className="flex items-center justify-center gap-1 px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => handleDuplicate(newsletter.id)}
                  className="flex items-center justify-center gap-1 px-3 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(newsletter.id)}
                  className="flex items-center justify-center gap-1 px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Newsletter Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-indigo-500/20 rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-indigo-500/20">
              <h2 className="text-xl font-bold text-white">
                {selectedNewsletter ? 'Modifica Newsletter' : 'Nuova Newsletter'}
              </h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
                className="p-2 hover:bg-slate-700 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <form onSubmit={handleSave} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Nome Interno *
                    </label>
                    <input
                      type="text"
                      value={formData.nome}
                      onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                      required
                      className="w-full px-3 py-2 bg-slate-700 text-white rounded-lg border border-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Oggetto Email *
                    </label>
                    <input
                      type="text"
                      value={formData.oggetto}
                      onChange={(e) => setFormData({ ...formData, oggetto: e.target.value })}
                      required
                      className="w-full px-3 py-2 bg-slate-700 text-white rounded-lg border border-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-300">
                      Contenuto HTML *
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setViewMode('canva')}
                        className={`flex items-center gap-1 px-3 py-1 rounded ${viewMode === 'canva' ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white' : 'bg-slate-700 text-gray-300'}`}
                      >
                        <Palette className="w-4 h-4" />
                        <span className="text-xs">Canva</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setViewMode('code')}
                        className={`px-3 py-1 rounded ${viewMode === 'code' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-gray-300'}`}
                      >
                        <Code className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setViewMode('preview')}
                        className={`px-3 py-1 rounded ${viewMode === 'preview' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-gray-300'}`}
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {viewMode === 'canva' ? (
                    <div className="space-y-3">
                      {canvaEmbedUrl ? (
                        <>
                          <div className="w-full h-[600px] bg-slate-900 rounded-lg border border-purple-500/20 overflow-hidden">
                            <iframe
                              src={canvaEmbedUrl}
                              className="w-full h-full"
                              title="Canva Editor"
                              allow="camera; microphone"
                            />
                          </div>
                          <div className="flex gap-2 justify-between items-center bg-purple-500/10 border border-purple-500/20 rounded-lg p-3">
                            <div className="flex items-center gap-2 text-sm text-gray-300">
                              <AlertCircle className="w-4 h-4 text-purple-400" />
                              <span>Modifica il design in Canva, poi clicca "Importa Design"</span>
                            </div>
                            <button
                              type="button"
                              onClick={handleImportFromCanva}
                              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700"
                            >
                              <Upload className="w-4 h-4" />
                              Importa Design
                            </button>
                          </div>
                        </>
                      ) : (
                        <div className="w-full h-[500px] bg-slate-900/50 rounded-lg border border-purple-500/20 flex items-center justify-center">
                          <div className="text-center">
                            <Palette className="w-16 h-16 text-purple-400 mx-auto mb-4" />
                            <h3 className="text-white font-semibold mb-2">Nessun Template Selezionato</h3>
                            <p className="text-gray-400 mb-4">
                              Clicca su "Design con Canva" per scegliere un template
                            </p>
                            <button
                              type="button"
                              onClick={() => setShowCanvaModal(true)}
                              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700"
                            >
                              <Palette className="w-4 h-4" />
                              Scegli Template
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : viewMode === 'code' ? (
                    <textarea
                      value={formData.contenutoHTML}
                      onChange={(e) => setFormData({ ...formData, contenutoHTML: e.target.value })}
                      required
                      rows={15}
                      className="w-full px-3 py-2 bg-slate-900 text-gray-100 rounded-lg border border-indigo-500/20 focus:border-indigo-500 font-mono text-sm"
                      placeholder="<html>...</html>"
                    />
                  ) : (
                    <div className="w-full h-[400px] bg-white rounded-lg border border-indigo-500/20 overflow-auto">
                      <iframe
                        srcDoc={formData.contenutoHTML}
                        className="w-full h-full"
                        title="Preview"
                        sandbox="allow-same-origin"
                      />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Tipo Programmazione
                    </label>
                    <select
                      value={formData.tipoProgrammazione}
                      onChange={(e) => setFormData({ ...formData, tipoProgrammazione: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-700 text-white rounded-lg border border-indigo-500/20"
                    >
                      <option value="manuale">Invio Manuale</option>
                      <option value="programmata">Programmata</option>
                      <option value="ricorrente">Ricorrente</option>
                      <option value="evento_promozionale">Evento Promozionale</option>
                    </select>
                  </div>

                  {formData.tipoProgrammazione === 'programmata' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Data Programmata
                      </label>
                      <input
                        type="datetime-local"
                        value={formData.dataProgrammata}
                        onChange={(e) => setFormData({ ...formData, dataProgrammata: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-700 text-white rounded-lg border border-indigo-500/20"
                      />
                    </div>
                  )}

                  {formData.tipoProgrammazione === 'evento_promozionale' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Evento Promozionale
                      </label>
                      <select
                        value={formData.eventoPromozionale}
                        onChange={(e) => setFormData({ ...formData, eventoPromozionale: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-700 text-white rounded-lg border border-indigo-500/20"
                      >
                        <option value="">Seleziona evento</option>
                        <option value="black_friday">Black Friday</option>
                        <option value="cyber_monday">Cyber Monday</option>
                        <option value="natale">Natale</option>
                        <option value="capodanno">Capodanno</option>
                        <option value="san_valentino">San Valentino</option>
                        <option value="pasqua">Pasqua</option>
                        <option value="festa_mamma">Festa della Mamma</option>
                        <option value="festa_papa">Festa del Papà</option>
                        <option value="estate">Estate / Saldi Estivi</option>
                        <option value="halloween">Halloween</option>
                      </select>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-indigo-500/20">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      resetForm();
                    }}
                    className="px-6 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600"
                  >
                    Annulla
                  </button>
                  <button
                    type="submit"
                    className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    <Save className="w-4 h-4" />
                    {selectedNewsletter ? 'Salva' : 'Crea'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* AI Generation Modal */}
      {showAIModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-purple-500/20 rounded-lg w-full max-w-2xl">
            <div className="flex items-center justify-between p-6 border-b border-purple-500/20">
              <div className="flex items-center gap-3">
                <Wand2 className="w-6 h-6 text-purple-400" />
                <h2 className="text-xl font-bold text-white">Genera Newsletter con AI</h2>
              </div>
              <button
                onClick={() => setShowAIModal(false)}
                className="p-2 hover:bg-slate-700 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <form onSubmit={handleGenerateWithAI} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Tipo Newsletter
                  </label>
                  <select
                    value={aiFormData.tipo}
                    onChange={(e) => setAiFormData({ ...aiFormData, tipo: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700 text-white rounded-lg border border-purple-500/20"
                  >
                    <option value="promozionale">Promozionale</option>
                    <option value="informativa">Informativa</option>
                    <option value="evento">Evento</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Evento Promozionale
                  </label>
                  <select
                    value={aiFormData.eventoPromozionale}
                    onChange={(e) => setAiFormData({ ...aiFormData, eventoPromozionale: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700 text-white rounded-lg border border-purple-500/20"
                  >
                    <option value="">Nessuno</option>
                    <option value="black_friday">Black Friday</option>
                    <option value="cyber_monday">Cyber Monday</option>
                    <option value="natale">Natale</option>
                    <option value="capodanno">Capodanno</option>
                    <option value="san_valentino">San Valentino</option>
                    <option value="estate">Estate</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Tema / Titolo *
                </label>
                <input
                  type="text"
                  value={aiFormData.tema}
                  onChange={(e) => setAiFormData({ ...aiFormData, tema: e.target.value })}
                  required
                  placeholder="Es: Nuova collezione autunno 2025"
                  className="w-full px-3 py-2 bg-slate-700 text-white rounded-lg border border-purple-500/20 focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Contenuto da includere
                </label>
                <textarea
                  value={aiFormData.contenuto}
                  onChange={(e) => setAiFormData({ ...aiFormData, contenuto: e.target.value })}
                  rows={4}
                  placeholder="Descrivi cosa vuoi includere nella newsletter..."
                  className="w-full px-3 py-2 bg-slate-700 text-white rounded-lg border border-purple-500/20 focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Testo CTA
                  </label>
                  <input
                    type="text"
                    value={aiFormData.ctaText}
                    onChange={(e) => setAiFormData({ ...aiFormData, ctaText: e.target.value })}
                    placeholder="Es: Scopri di più"
                    className="w-full px-3 py-2 bg-slate-700 text-white rounded-lg border border-purple-500/20"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    URL CTA
                  </label>
                  <input
                    type="url"
                    value={aiFormData.ctaUrl}
                    onChange={(e) => setAiFormData({ ...aiFormData, ctaUrl: e.target.value })}
                    placeholder="https://..."
                    className="w-full px-3 py-2 bg-slate-700 text-white rounded-lg border border-purple-500/20"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAIModal(false)}
                  className="px-6 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4" />
                  {loading ? 'Generazione...' : 'Genera'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Canva Templates Modal */}
      {showCanvaModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-purple-500/20 rounded-lg w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-purple-500/20">
              <div className="flex items-center gap-3">
                <Palette className="w-6 h-6 text-purple-400" />
                <div>
                  <h2 className="text-xl font-bold text-white">Design con Canva</h2>
                  <p className="text-sm text-gray-400">Scegli un template o crea da zero</p>
                </div>
              </div>
              <button
                onClick={() => setShowCanvaModal(false)}
                className="p-2 hover:bg-slate-700 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {/* Canva Editor Button */}
              <div className="mb-6">
                <button
                  onClick={handleOpenCanvaEditor}
                  className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all"
                >
                  <ExternalLink className="w-5 h-5" />
                  <div className="text-left">
                    <div className="font-semibold">Apri Editor Canva</div>
                    <div className="text-sm opacity-90">Crea una newsletter completamente personalizzata</div>
                  </div>
                </button>
              </div>

              {/* Template Gallery */}
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-white mb-2">Template Pronti</h3>
                <p className="text-sm text-gray-400 mb-4">
                  Clicca su un template per modificarlo in Canva
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {canvaTemplates.map((template) => (
                  <div
                    key={template.id}
                    className="bg-slate-700/50 border border-indigo-500/20 rounded-lg overflow-hidden hover:border-indigo-500/40 transition-all cursor-pointer group"
                    onClick={() => handleOpenCanvaTemplate(template)}
                  >
                    {/* Placeholder for thumbnail */}
                    <div className="aspect-[3/4] bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center relative">
                      <ImageIcon className="w-16 h-16 text-purple-400 opacity-50" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center">
                        <div className="opacity-0 group-hover:opacity-100 transition-all">
                          <div className="bg-white text-purple-600 px-4 py-2 rounded-lg font-semibold flex items-center gap-2">
                            <ExternalLink className="w-4 h-4" />
                            Modifica in Canva
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="p-4">
                      <h4 className="text-white font-semibold mb-1">{template.nome}</h4>
                      <p className="text-sm text-gray-400 mb-2">{template.descrizione}</p>
                      <span className="inline-block px-2 py-1 bg-purple-500/20 text-purple-300 text-xs rounded-full capitalize">
                        {template.categoria}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Instructions */}
              <div className="mt-6 bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                <h4 className="text-white font-semibold mb-2 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-blue-400" />
                  Come funziona
                </h4>
                <ol className="text-sm text-gray-300 space-y-2 ml-6 list-decimal">
                  <li>Clicca su un template o su "Apri Editor Canva"</li>
                  <li>Modifica il design in Canva secondo le tue esigenze</li>
                  <li>Quando hai finito, clicca su "Condividi" o "Download"</li>
                  <li>Seleziona "HTML" come formato (se disponibile)</li>
                  <li>Copia l'HTML generato da Canva</li>
                  <li>Incollalo nell'editor HTML della newsletter</li>
                </ol>
                <p className="text-xs text-gray-400 mt-3">
                  💡 Suggerimento: Se Canva non offre export HTML, scarica il design come immagine e inseriscila nell'HTML manualmente.
                </p>
              </div>
            </div>

            <div className="p-6 border-t border-purple-500/20 flex justify-end">
              <button
                onClick={() => setShowCanvaModal(false)}
                className="px-6 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600"
              >
                Chiudi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NewsletterPage;
