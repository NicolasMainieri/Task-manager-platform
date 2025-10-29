import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  FileText,
  Plus,
  Download,
  Eye,
  Edit2,
  Trash2,
  Loader,
  Link as LinkIcon,
  User,
  Building2,
  Tag,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  Sparkles,
  FileSpreadsheet,
  Send,
  X,
  Image as ImageIcon,
  Package
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL;

interface Prodotto {
  codiceArticolo: string;
  nome: string;
  descrizione?: string;
  prezzo: number;
  quantita: number;
}

interface Preventivo {
  id: string;
  nomeCliente: string;
  emailCliente?: string;
  telefonoCliente?: string;
  aziendaEmittente: string;
  nomeProdotto: string;
  descrizioneProdotto: string;
  prezzoOriginale: number;
  percentualeSconto: number;
  prezzoFinale: number;
  stato: 'bozza' | 'inviato' | 'approvato' | 'rifiutato';
  urlPdf?: string;
  urlExcel?: string;
  dataEmissione: string;
  dataScadenza?: string;
  linkProdotti: string[];
  caratteristiche: string[];
  funzionalita: string[];
  vantaggi: string[];
  prodotti?: Prodotto[];
}

interface Contact {
  id: string;
  nome: string;
  cognome?: string;
  email?: string;
  telefono?: string;
  azienda?: string;
}

const PreventiviPage: React.FC = () => {
  const [preventivi, setPreventivi] = useState<Preventivo[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [selectedPreventivo, setSelectedPreventivo] = useState<Preventivo | null>(null);

  // Form state - array di prodotti
  const [prodotti, setProdotti] = useState<Prodotto[]>([]);
  const [currentProdotto, setCurrentProdotto] = useState<Prodotto>({
    codiceArticolo: '',
    nome: '',
    descrizione: '',
    prezzo: 0,
    quantita: 1
  });

  const [linkProdotti, setLinkProdotti] = useState<string[]>([]);
  const [currentLink, setCurrentLink] = useState('');
  const [linkImmagini, setLinkImmagini] = useState<string[]>([]);
  const [currentImageLink, setCurrentImageLink] = useState('');
  const [nomeCliente, setNomeCliente] = useState('');
  const [emailCliente, setEmailCliente] = useState('');
  const [telefonoCliente, setTelefonoCliente] = useState('');
  const [selectedContactId, setSelectedContactId] = useState('');
  const [percentualeSconto, setPercentualeSconto] = useState(0);
  const [dataScadenza, setDataScadenza] = useState('');
  const [noteAggiuntive, setNoteAggiuntive] = useState('');

  // Dati estratti dall'AI
  const [productData, setProductData] = useState<any>(null);

  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchPreventivi();
    fetchContacts();
  }, []);

  const fetchPreventivi = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/preventivi`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPreventivi(response.data.preventivi || []);
    } catch (error) {
      console.error('Errore caricamento preventivi:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchContacts = async () => {
    try {
      console.log('[PreventiviPage] Caricamento contatti da:', `${API_URL}/api/contacts`);
      const response = await axios.get(`${API_URL}/api/contacts`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('[PreventiviPage] Risposta contatti:', response.data);
      console.log('[PreventiviPage] Numero contatti trovati:', response.data.contacts?.length || 0);
      setContacts(response.data.contacts || []);
    } catch (error: any) {
      console.error('[PreventiviPage] Errore caricamento contatti:', error);
      console.error('[PreventiviPage] Dettagli errore:', error.response?.data);
    }
  };

  const handleContactSelect = (contactId: string) => {
    setSelectedContactId(contactId);
    const contact = contacts.find(c => c.id === contactId);
    if (contact) {
      setNomeCliente(contact.azienda || `${contact.nome} ${contact.cognome || ''}`);
      setEmailCliente(contact.email || '');
      setTelefonoCliente(contact.telefono || '');
    }
  };

  const handleAddProdotto = () => {
    if (!currentProdotto.codiceArticolo || !currentProdotto.nome || currentProdotto.prezzo <= 0) {
      alert('Compila tutti i campi del prodotto (codice, nome e prezzo)');
      return;
    }

    setProdotti([...prodotti, { ...currentProdotto }]);
    setCurrentProdotto({
      codiceArticolo: '',
      nome: '',
      descrizione: '',
      prezzo: 0,
      quantita: 1
    });
  };

  const handleRemoveProdotto = (index: number) => {
    setProdotti(prodotti.filter((_, i) => i !== index));
  };

  const handleAddLink = () => {
    if (currentLink.trim()) {
      setLinkProdotti([...linkProdotti, currentLink.trim()]);
      setCurrentLink('');
    }
  };

  const handleRemoveLink = (index: number) => {
    setLinkProdotti(linkProdotti.filter((_, i) => i !== index));
  };

  const handleAddImageLink = () => {
    if (currentImageLink.trim()) {
      setLinkImmagini([...linkImmagini, currentImageLink.trim()]);
      setCurrentImageLink('');
    }
  };

  const handleRemoveImageLink = (index: number) => {
    setLinkImmagini(linkImmagini.filter((_, i) => i !== index));
  };

  const handleAnalyzeProduct = async () => {
    if (linkProdotti.length === 0) {
      alert('Aggiungi almeno un link prodotto');
      return;
    }

    setAnalyzing(true);
    try {
      const response = await axios.post(
        `${API_URL}/api/preventivi/analyze`,
        { linkProdotti },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setProductData(response.data.productData);
      alert('Prodotto analizzato con successo! Controlla i dati estratti e procedi.');
    } catch (error: any) {
      console.error('Errore analisi prodotto:', error);
      alert(error.response?.data?.error || 'Errore durante l\'analisi del prodotto');
    } finally {
      setAnalyzing(false);
    }
  };

  const calculatePrezzoTotale = () => {
    return prodotti.reduce((acc, p) => acc + (p.prezzo * p.quantita), 0);
  };

  const calculatePrezzoFinale = () => {
    const totale = calculatePrezzoTotale();
    return totale * (1 - percentualeSconto / 100);
  };

  const handleCreatePreventivo = async () => {
    if (!nomeCliente) {
      alert('Nome cliente obbligatorio');
      return;
    }

    if (prodotti.length === 0) {
      alert('Aggiungi almeno un prodotto');
      return;
    }

    setGenerating(true);
    try {
      const response = await axios.post(
        `${API_URL}/api/preventivi`,
        {
          nomeCliente,
          emailCliente: emailCliente || undefined,
          telefonoCliente: telefonoCliente || undefined,
          contactId: selectedContactId || undefined,
          linkProdotti,
          linkImmagini,
          prodotti,
          prezzoOriginale: calculatePrezzoTotale(),
          percentualeSconto,
          dataScadenza: dataScadenza || undefined,
          noteAggiuntive: noteAggiuntive || undefined,
          productData
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert('Preventivo creato con successo!');
      setShowCreateModal(false);
      resetForm();
      fetchPreventivi();
    } catch (error: any) {
      console.error('Errore creazione preventivo:', error);
      alert(error.response?.data?.error || 'Errore durante la creazione del preventivo');
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateFiles = async (preventivoId: string) => {
    setGenerating(true);
    try {
      const response = await axios.post(
        `${API_URL}/api/preventivi/${preventivoId}/generate`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert('File generati con successo!');
      fetchPreventivi();
    } catch (error: any) {
      console.error('Errore generazione file:', error);
      alert(error.response?.data?.error || 'Errore durante la generazione dei file');
    } finally {
      setGenerating(false);
    }
  };

  const handleUpdateStato = async (preventivoId: string, stato: string) => {
    try {
      await axios.put(
        `${API_URL}/api/preventivi/${preventivoId}/stato`,
        { stato },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert('Stato aggiornato con successo!');
      fetchPreventivi();
    } catch (error) {
      console.error('Errore aggiornamento stato:', error);
      alert('Errore durante l\'aggiornamento dello stato');
    }
  };

  const handleDelete = async (preventivoId: string) => {
    if (!confirm('Sei sicuro di voler eliminare questo preventivo?')) return;

    try {
      await axios.delete(`${API_URL}/api/preventivi/${preventivoId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Preventivo eliminato con successo!');
      fetchPreventivi();
    } catch (error) {
      console.error('Errore eliminazione preventivo:', error);
      alert('Errore durante l\'eliminazione del preventivo');
    }
  };

  const resetForm = () => {
    setProdotti([]);
    setCurrentProdotto({
      codiceArticolo: '',
      nome: '',
      descrizione: '',
      prezzo: 0,
      quantita: 1
    });
    setLinkProdotti([]);
    setCurrentLink('');
    setLinkImmagini([]);
    setCurrentImageLink('');
    setNomeCliente('');
    setEmailCliente('');
    setTelefonoCliente('');
    setSelectedContactId('');
    setPercentualeSconto(0);
    setDataScadenza('');
    setNoteAggiuntive('');
    setProductData(null);
  };

  const getStatoBadge = (stato: string) => {
    const config = {
      bozza: { icon: Clock, color: 'bg-gray-500', text: 'Bozza' },
      inviato: { icon: Send, color: 'bg-blue-500', text: 'Inviato' },
      approvato: { icon: CheckCircle, color: 'bg-green-500', text: 'Approvato' },
      rifiutato: { icon: XCircle, color: 'bg-red-500', text: 'Rifiutato' }
    };
    const { icon: Icon, color, text } = config[stato as keyof typeof config] || config.bozza;
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold text-white ${color}`}>
        <Icon className="w-3 h-3 mr-1" />
        {text}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <FileText className="w-8 h-8 mr-3 text-indigo-600" />
            Preventivi con AI
          </h1>
          <p className="text-gray-600 mt-1">
            Crea preventivi professionali automaticamente da link prodotti online
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg flex items-center space-x-2 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>Nuovo Preventivo</span>
        </button>
      </div>

      {/* Lista Preventivi */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {preventivi.length === 0 ? (
          <div className="col-span-full text-center py-12 bg-gray-50 rounded-lg">
            <FileText className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 text-lg">Nessun preventivo creato</p>
            <p className="text-gray-500 text-sm mt-2">
              Inizia creando il tuo primo preventivo con AI
            </p>
          </div>
        ) : (
          preventivi.map((prev) => (
            <div key={prev.id} className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg text-gray-900 mb-1">
                    {prev.nomeProdotto}
                  </h3>
                  <p className="text-sm text-gray-600 flex items-center">
                    <User className="w-4 h-4 mr-1" />
                    {prev.nomeCliente}
                  </p>
                </div>
                {getStatoBadge(prev.stato)}
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center text-sm text-gray-600">
                  <Building2 className="w-4 h-4 mr-2" />
                  {prev.aziendaEmittente}
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <Calendar className="w-4 h-4 mr-2" />
                  {new Date(prev.dataEmissione).toLocaleDateString('it-IT')}
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t">
                  <div>
                    {prev.percentualeSconto > 0 && (
                      <div className="text-xs text-gray-500 line-through">
                        €{prev.prezzoOriginale.toFixed(2)}
                      </div>
                    )}
                    <div className="text-2xl font-bold text-indigo-600">
                      €{prev.prezzoFinale.toFixed(2)}
                    </div>
                  </div>
                  {prev.percentualeSconto > 0 && (
                    <span className="bg-orange-500 text-white text-xs px-2 py-1 rounded-full">
                      -{prev.percentualeSconto}%
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-2 mt-4">
                {!prev.urlPdf && (
                  <button
                    onClick={() => handleGenerateFiles(prev.id)}
                    disabled={generating}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded text-sm flex items-center justify-center space-x-1 disabled:opacity-50"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Genera File</span>
                  </button>
                )}
                {prev.urlPdf && (
                  <>
                    <a
                      href={`${API_URL}${prev.urlPdf}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-sm flex items-center justify-center space-x-1"
                    >
                      <FileText className="w-4 h-4" />
                      <span>PDF</span>
                    </a>
                    <a
                      href={`${API_URL}${prev.urlExcel}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded text-sm flex items-center justify-center space-x-1"
                    >
                      <FileSpreadsheet className="w-4 h-4" />
                      <span>Excel</span>
                    </a>
                  </>
                )}
              </div>

              {/* Stato Actions */}
              {prev.stato === 'bozza' && (
                <button
                  onClick={() => handleUpdateStato(prev.id, 'inviato')}
                  className="w-full mt-2 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded text-sm flex items-center justify-center space-x-1"
                >
                  <Send className="w-4 h-4" />
                  <span>Segna come Inviato</span>
                </button>
              )}

              <button
                onClick={() => handleDelete(prev.id)}
                className="w-full mt-2 bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded text-sm flex items-center justify-center space-x-1"
              >
                <Trash2 className="w-4 h-4" />
                <span>Elimina</span>
              </button>
            </div>
          ))
        )}
      </div>

      {/* Modal Creazione Preventivo */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b sticky top-0 bg-white z-10">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                <Sparkles className="w-6 h-6 mr-2 text-indigo-600" />
                Nuovo Preventivo con AI
              </h2>
            </div>

            <div className="p-6 space-y-6">
              {/* Step 1: Prodotti */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-3 flex items-center">
                  <Package className="w-5 h-5 mr-2" />
                  1. Aggiungi Prodotti
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">
                      Codice Articolo *
                    </label>
                    <input
                      type="text"
                      value={currentProdotto.codiceArticolo}
                      onChange={(e) => setCurrentProdotto({...currentProdotto, codiceArticolo: e.target.value})}
                      placeholder="ART-001"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 text-gray-900 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">
                      Nome Prodotto *
                    </label>
                    <input
                      type="text"
                      value={currentProdotto.nome}
                      onChange={(e) => setCurrentProdotto({...currentProdotto, nome: e.target.value})}
                      placeholder="Nome prodotto"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 text-gray-900 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">
                      Prezzo Unitario (€) *
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={currentProdotto.prezzo}
                      onChange={(e) => setCurrentProdotto({...currentProdotto, prezzo: Number(e.target.value)})}
                      placeholder="0.00"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 text-gray-900 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">
                      Quantità
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={currentProdotto.quantita}
                      onChange={(e) => setCurrentProdotto({...currentProdotto, quantita: Number(e.target.value)})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 text-gray-900 bg-white"
                    />
                  </div>
                </div>

                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    Descrizione (opzionale)
                  </label>
                  <textarea
                    value={currentProdotto.descrizione}
                    onChange={(e) => setCurrentProdotto({...currentProdotto, descrizione: e.target.value})}
                    placeholder="Descrizione dettagliata del prodotto"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 text-gray-900 bg-white h-20"
                  />
                </div>

                <button
                  onClick={handleAddProdotto}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center justify-center space-x-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Aggiungi Prodotto</span>
                </button>
              </div>

              {/* Lista Prodotti Aggiunti */}
              {prodotti.length > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-semibold text-green-900 mb-3">Prodotti nel preventivo ({prodotti.length})</h4>
                  <div className="space-y-2">
                    {prodotti.map((prod, index) => (
                      <div key={index} className="bg-white px-3 py-2 rounded-lg flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm text-gray-600">{prod.codiceArticolo}</span>
                            <span className="font-medium text-gray-900">{prod.nome}</span>
                          </div>
                          <div className="text-sm text-gray-600">
                            €{prod.prezzo.toFixed(2)} x {prod.quantita} = €{(prod.prezzo * prod.quantita).toFixed(2)}
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveProdotto(index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 pt-3 border-t border-green-300">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-gray-900">Totale:</span>
                      <span className="text-2xl font-bold text-indigo-600">€{calculatePrezzoTotale().toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Link Prodotti (opzionale per AI) */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  2. Link Prodotti (opzionale per AI)
                </label>
                <div className="flex gap-2 mb-3">
                  <input
                    type="url"
                    value={currentLink}
                    onChange={(e) => setCurrentLink(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddLink()}
                    placeholder="https://example.com/product"
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 text-gray-900 bg-white"
                  />
                  <button
                    onClick={handleAddLink}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>

                {linkProdotti.length > 0 && (
                  <div className="space-y-2 mb-3">
                    {linkProdotti.map((link, index) => (
                      <div key={index} className="flex items-center gap-2 bg-indigo-50 px-3 py-2 rounded-lg">
                        <LinkIcon className="w-4 h-4 text-indigo-600" />
                        <span className="flex-1 text-sm text-gray-900 truncate">{link}</span>
                        <button
                          onClick={() => handleRemoveLink(index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {linkProdotti.length > 0 && (
                  <button
                    onClick={handleAnalyzeProduct}
                    disabled={analyzing}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center justify-center space-x-2 disabled:opacity-50"
                  >
                    {analyzing ? (
                      <>
                        <Loader className="w-4 h-4 animate-spin" />
                        <span>Analisi in corso...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Analizza con AI</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Step 3: Link Immagini */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  3. Link Immagini (opzionale)
                </label>
                <div className="flex gap-2 mb-3">
                  <input
                    type="url"
                    value={currentImageLink}
                    onChange={(e) => setCurrentImageLink(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddImageLink()}
                    placeholder="https://example.com/image.jpg"
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 text-gray-900 bg-white"
                  />
                  <button
                    onClick={handleAddImageLink}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>

                {linkImmagini.length > 0 && (
                  <div className="grid grid-cols-2 gap-2">
                    {linkImmagini.map((link, index) => (
                      <div key={index} className="flex items-center gap-2 bg-green-50 px-3 py-2 rounded-lg">
                        <ImageIcon className="w-4 h-4 text-green-600" />
                        <span className="flex-1 text-sm text-gray-900 truncate">{link}</span>
                        <button
                          onClick={() => handleRemoveImageLink(index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Risultati Analisi AI */}
              {productData && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="font-semibold text-green-900 mb-2 flex items-center">
                    <CheckCircle className="w-5 h-5 mr-2" />
                    Prodotto Analizzato dall'AI
                  </h3>
                  <div className="text-sm text-green-800 space-y-1">
                    <p><strong>Nome:</strong> {productData.nomeProdotto}</p>
                    <p><strong>Caratteristiche:</strong> {productData.caratteristiche?.length || 0}</p>
                    <p><strong>Funzionalità:</strong> {productData.funzionalita?.length || 0}</p>
                  </div>
                </div>
              )}

              {/* Step 4: Sconto */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  4. Percentuale Sconto (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={percentualeSconto}
                  onChange={(e) => setPercentualeSconto(Number(e.target.value))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 text-gray-900 bg-white"
                />
                {percentualeSconto > 0 && prodotti.length > 0 && (
                  <div className="mt-2 text-sm text-gray-700">
                    <span className="font-semibold">Prezzo finale: </span>
                    <span className="text-indigo-600 font-bold">€{calculatePrezzoFinale().toFixed(2)}</span>
                    <span className="ml-2 text-gray-500 line-through">€{calculatePrezzoTotale().toFixed(2)}</span>
                  </div>
                )}
              </div>

              {/* Step 5: Cliente */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  5. Seleziona Cliente
                </label>
                <select
                  value={selectedContactId}
                  onChange={(e) => handleContactSelect(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 mb-3 text-gray-900 bg-white"
                >
                  <option value="">-- Nuovo Cliente --</option>
                  {contacts.map((contact) => (
                    <option key={contact.id} value={contact.id}>
                      {contact.azienda || `${contact.nome} ${contact.cognome || ''}`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Dati Cliente */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Nome Cliente / Azienda *
                  </label>
                  <input
                    type="text"
                    value={nomeCliente}
                    onChange={(e) => setNomeCliente(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 text-gray-900 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Email Cliente
                  </label>
                  <input
                    type="email"
                    value={emailCliente}
                    onChange={(e) => setEmailCliente(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 text-gray-900 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Telefono Cliente
                  </label>
                  <input
                    type="tel"
                    value={telefonoCliente}
                    onChange={(e) => setTelefonoCliente(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 text-gray-900 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Data Scadenza Offerta
                  </label>
                  <input
                    type="date"
                    value={dataScadenza}
                    onChange={(e) => setDataScadenza(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 text-gray-900 bg-white"
                  />
                </div>
              </div>

              {/* Note aggiuntive */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Note Aggiuntive
                </label>
                <textarea
                  value={noteAggiuntive}
                  onChange={(e) => setNoteAggiuntive(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 h-24 text-gray-900 bg-white"
                />
              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-6 border-t bg-gray-50 flex justify-end space-x-3 sticky bottom-0">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
                className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors bg-white"
              >
                Annulla
              </button>
              <button
                onClick={handleCreatePreventivo}
                disabled={generating || !nomeCliente || prodotti.length === 0}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {generating ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    <span>Creazione in corso...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    <span>Crea Preventivo</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PreventiviPage;
