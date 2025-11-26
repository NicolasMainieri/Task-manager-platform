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
  User,
  Building2,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  Search,
  Filter,
  TrendingUp,
  FileSpreadsheet,
  Send,
  X
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL;

interface RigaFattura {
  descrizione: string;
  quantita: number;
  prezzoUnitario: number;
  iva: number;
  totale: number;
}

interface Fattura {
  id: string;
  numero: string;
  anno: number;
  progressivo: number;
  clienteNome: string;
  clienteEmail?: string;
  clienteTelefono?: string;
  clientePIva?: string;
  clienteCF?: string;
  clienteIndirizzo?: string;
  clienteCitta?: string;
  clienteCAP?: string;
  clientePaese?: string;
  righe: RigaFattura[];
  imponibile: number;
  iva: number;
  totale: number;
  dataEmissione: string;
  dataScadenza: string;
  statoPagamento: 'non_pagata' | 'parzialmente_pagata' | 'pagata' | 'scaduta';
  importoPagato: number;
  importoDaPagare: number;
  metodoPagamento?: string;
  note?: string;
  urlPdf?: string;
  pagamenti?: any[];
}

interface Stats {
  anno: number;
  totaleEmesse: number;
  totaleImponibile: number;
  totaleIva: number;
  totaleFatturato: number;
  totalePagato: number;
  totaleDaPagare: number;
  totaleScadute: number;
  perStato: {
    nonPagata: number;
    parzialmentePagata: number;
    pagata: number;
    scaduta: number;
  };
  perMese: Array<{
    mese: number;
    totaleEmesse: number;
    totaleFatturato: number;
    totalePagato: number;
  }>;
}

interface Contact {
  id: string;
  nome: string;
  cognome?: string;
  email?: string;
  telefono?: string;
  azienda?: string;
  partitaIva?: string;
  codiceFiscale?: string;
  indirizzo?: string;
  citta?: string;
  cap?: string;
}

interface InventarioItem {
  id: string;
  codice: string;
  nome: string;
  descrizione?: string;
  prezzoVendita: number;
  iva: number;
}

const FatturePage: React.FC = () => {
  const [fatture, setFatture] = useState<Fattura[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [inventario, setInventario] = useState<InventarioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedFattura, setSelectedFattura] = useState<Fattura | null>(null);
  const [filtroStato, setFiltroStato] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  // Payment modal state
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('bonifico');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentNote, setPaymentNote] = useState('');
  const [paymentFile, setPaymentFile] = useState<File | null>(null);
  const [pendingStatusChange, setPendingStatusChange] = useState<{id: string, stato: string} | null>(null);

  // Form state
  const [righe, setRighe] = useState<RigaFattura[]>([{
    descrizione: '',
    quantita: 1,
    prezzoUnitario: 0,
    iva: 22,
    totale: 0
  }]);
  const [clienteNome, setClienteNome] = useState('');
  const [clienteEmail, setClienteEmail] = useState('');
  const [clienteTelefono, setClienteTelefono] = useState('');
  const [clientePIva, setClientePIva] = useState('');
  const [clienteCF, setClienteCF] = useState('');
  const [clienteIndirizzo, setClienteIndirizzo] = useState('');
  const [clienteCitta, setClienteCitta] = useState('');
  const [clienteCAP, setClienteCAP] = useState('');
  const [dataScadenza, setDataScadenza] = useState('');
  const [note, setNote] = useState('');
  const [metodoPagamento, setMetodoPagamento] = useState('bonifico');

  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchFatture();
    fetchStats();
    fetchContacts();
    fetchInventario();
  }, [filtroStato]);

  const fetchContacts = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/contacts`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setContacts(response.data || []);
    } catch (error) {
      console.error('Errore caricamento contatti:', error);
    }
  };

  const fetchInventario = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/inventario`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { attivo: 'true' }
      });
      setInventario(response.data || []);
    } catch (error) {
      console.error('Errore caricamento inventario:', error);
    }
  };

  const handleSelectContact = (contactId: string) => {
    const contact = contacts.find(c => c.id === contactId);
    if (contact) {
      setClienteNome(contact.azienda || `${contact.nome} ${contact.cognome || ''}`.trim());
      setClienteEmail(contact.email || '');
      setClienteTelefono(contact.telefono || '');
      setClientePIva(contact.partitaIva || '');
      setClienteCF(contact.codiceFiscale || '');
      setClienteIndirizzo(contact.indirizzo || '');
      setClienteCitta(contact.citta || '');
      setClienteCAP(contact.cap || '');
    }
  };

  const handleSelectInventarioItem = (index: number, itemId: string) => {
    const item = inventario.find(i => i.id === itemId);
    if (item) {
      const newRighe = [...righe];
      newRighe[index] = {
        descrizione: item.nome + (item.descrizione ? ` - ${item.descrizione}` : ''),
        quantita: 1,
        prezzoUnitario: item.prezzoVendita,
        iva: item.iva,
        totale: item.prezzoVendita
      };
      setRighe(newRighe);
    }
  };

  const fetchFatture = async () => {
    try {
      const params: any = {};
      if (filtroStato) params.statoPagamento = filtroStato;

      const response = await axios.get(`${API_URL}/api/fatture`, {
        headers: { Authorization: `Bearer ${token}` },
        params
      });
      setFatture(response.data || []);
    } catch (error) {
      console.error('Errore caricamento fatture:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/fatture/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(response.data);
    } catch (error) {
      console.error('Errore caricamento statistiche:', error);
    }
  };

  const calcolaTotaliRiga = (riga: RigaFattura): RigaFattura => {
    const imponibile = riga.quantita * riga.prezzoUnitario;
    const importoIva = (imponibile * riga.iva) / 100;
    const totale = imponibile + importoIva;
    return { ...riga, totale };
  };

  const calcolaTotali = () => {
    const righeAggiornate = righe.map(calcolaTotaliRiga);
    const imponibile = righeAggiornate.reduce((sum, r) => sum + (r.quantita * r.prezzoUnitario), 0);
    const iva = righeAggiornate.reduce((sum, r) => sum + ((r.quantita * r.prezzoUnitario * r.iva) / 100), 0);
    const totale = imponibile + iva;
    return { imponibile, iva, totale };
  };

  const handleRigaChange = (index: number, field: keyof RigaFattura, value: any) => {
    const newRighe = [...righe];
    newRighe[index] = { ...newRighe[index], [field]: value };
    setRighe(newRighe);
  };

  const addRiga = () => {
    setRighe([...righe, {
      descrizione: '',
      quantita: 1,
      prezzoUnitario: 0,
      iva: 22,
      totale: 0
    }]);
  };

  const removeRiga = (index: number) => {
    if (righe.length > 1) {
      setRighe(righe.filter((_, i) => i !== index));
    }
  };

  const handleCreateFattura = async () => {
    if (!clienteNome) {
      alert('Inserisci almeno il nome del cliente');
      return;
    }

    if (righe.some(r => !r.descrizione || r.prezzoUnitario <= 0)) {
      alert('Completa tutte le righe della fattura');
      return;
    }

    const totali = calcolaTotali();
    const dataScadenzaDate = dataScadenza || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    try {
      await axios.post(`${API_URL}/api/fatture`, {
        clienteNome,
        clienteEmail,
        clienteTelefono,
        clientePIva,
        clienteCF,
        clienteIndirizzo,
        clienteCitta,
        clienteCAP,
        clientePaese: 'Italia',
        righe,
        imponibile: totali.imponibile,
        iva: totali.iva,
        totale: totali.totale,
        dataScadenza: dataScadenzaDate,
        note,
        metodoPagamento
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      alert('Fattura creata con successo!');
      setShowCreateModal(false);
      resetForm();
      fetchFatture();
      fetchStats();
    } catch (error: any) {
      console.error('Errore creazione fattura:', error);
      alert(error.response?.data?.error || 'Errore nella creazione della fattura');
    }
  };

  const handleDeleteFattura = async (id: string) => {
    if (!confirm('Sei sicuro di voler eliminare questa fattura?')) return;

    try {
      await axios.delete(`${API_URL}/api/fatture/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Fattura eliminata con successo!');
      fetchFatture();
      fetchStats();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Errore nell\'eliminazione della fattura');
    }
  };

  const handleUpdateStatoPagamento = async (id: string, nuovoStato: string) => {
    // Se cambia lo stato a "pagata", mostra il modal per registrare il pagamento
    if (nuovoStato === 'pagata') {
      setPendingStatusChange({ id, stato: nuovoStato });
      if (selectedFattura) {
        setPaymentAmount(selectedFattura.totale - selectedFattura.importoPagato);
      }
      setShowPaymentModal(true);
      return;
    }

    // Altrimenti aggiorna solo lo stato
    try {
      await axios.put(`${API_URL}/api/fatture/${id}`, {
        statoPagamento: nuovoStato
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Stato fattura aggiornato!');
      fetchFatture();
      fetchStats();
      if (selectedFattura) {
        viewDetails(id);
      }
    } catch (error: any) {
      alert(error.response?.data?.error || 'Errore nell\'aggiornamento dello stato');
    }
  };

  const handleSubmitPayment = async () => {
    if (!pendingStatusChange || paymentAmount <= 0) {
      alert('Inserisci un importo valido per il pagamento');
      return;
    }

    try {
      // Crea FormData per inviare anche il file
      const formData = new FormData();
      formData.append('fatturaId', pendingStatusChange.id);
      formData.append('importo', paymentAmount.toString());
      formData.append('metodoPagamento', paymentMethod);
      formData.append('dataPagamento', paymentDate);
      formData.append('note', paymentNote);

      // Aggiungi il file se presente
      if (paymentFile) {
        formData.append('ricevuta', paymentFile);
      }

      // Prima registra il pagamento con il file
      await axios.post(`${API_URL}/api/pagamenti`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      // Poi aggiorna lo stato della fattura
      await axios.put(`${API_URL}/api/fatture/${pendingStatusChange.id}`, {
        statoPagamento: pendingStatusChange.stato
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      alert('Pagamento registrato e stato fattura aggiornato!');
      setShowPaymentModal(false);
      setPendingStatusChange(null);
      setPaymentAmount(0);
      setPaymentNote('');
      setPaymentFile(null);
      fetchFatture();
      fetchStats();
      if (selectedFattura) {
        viewDetails(pendingStatusChange.id);
      }
    } catch (error: any) {
      alert(error.response?.data?.error || 'Errore nella registrazione del pagamento');
    }
  };

  const handleExportPDF = async (id: string) => {
    try {
      const response = await axios.get(`${API_URL}/api/fatture/${id}/pdf`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `fattura-${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error: any) {
      alert('Errore nel download del PDF');
      console.error(error);
    }
  };

  const handleExportExcel = async (id: string) => {
    try {
      const response = await axios.get(`${API_URL}/api/fatture/${id}/excel`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `fattura-${id}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error: any) {
      alert('Errore nel download del file Excel');
      console.error(error);
    }
  };

  const viewDetails = async (id: string) => {
    try {
      const response = await axios.get(`${API_URL}/api/fatture/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSelectedFattura(response.data);
      setShowDetailModal(true);
    } catch (error) {
      console.error('Errore caricamento dettaglio fattura:', error);
    }
  };

  const resetForm = () => {
    setRighe([{
      descrizione: '',
      quantita: 1,
      prezzoUnitario: 0,
      iva: 22,
      totale: 0
    }]);
    setClienteNome('');
    setClienteEmail('');
    setClienteTelefono('');
    setClientePIva('');
    setClienteCF('');
    setClienteIndirizzo('');
    setClienteCitta('');
    setClienteCAP('');
    setDataScadenza('');
    setNote('');
    setMetodoPagamento('bonifico');
  };

  const getStatoBadge = (stato: string) => {
    const badges = {
      'non_pagata': { color: 'bg-red-100 text-red-800', icon: XCircle, label: 'Non Pagata' },
      'parzialmente_pagata': { color: 'bg-yellow-100 text-yellow-800', icon: Clock, label: 'Parzialmente Pagata' },
      'pagata': { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'Pagata' },
      'scaduta': { color: 'bg-gray-100 text-gray-800', icon: XCircle, label: 'Scaduta' }
    };
    const badge = badges[stato as keyof typeof badges] || badges['non_pagata'];
    const Icon = badge.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        <Icon size={12} />
        {badge.label}
      </span>
    );
  };

  const fattureFiltrate = fatture.filter(f =>
    f.clienteNome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.numero.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totali = calcolaTotali();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader className="animate-spin" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <FileText className="text-blue-600" />
              Gestione Fatture
            </h1>
            <p className="text-gray-600 mt-1">Sistema completo di fatturazione elettronica</p>
          </div>
          <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus size={20} />
          Nuova Fattura
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Fatturato Totale</p>
                <p className="text-2xl font-bold text-gray-900">€{stats.totaleFatturato.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-full">
                <TrendingUp className="text-blue-600" size={24} />
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Pagato</p>
                <p className="text-2xl font-bold text-green-600">€{stats.totalePagato.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="bg-green-100 p-3 rounded-full">
                <CheckCircle className="text-green-600" size={24} />
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Da Pagare</p>
                <p className="text-2xl font-bold text-yellow-600">€{stats.totaleDaPagare.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="bg-yellow-100 p-3 rounded-full">
                <Clock className="text-yellow-600" size={24} />
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Fatture Emesse</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totaleEmesse}</p>
              </div>
              <div className="bg-gray-100 p-3 rounded-full">
                <FileText className="text-gray-600" size={24} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Cerca per cliente o numero fattura..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-3 text-gray-400" size={20} />
            <select
              value={filtroStato}
              onChange={(e) => setFiltroStato(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Tutti gli stati</option>
              <option value="non_pagata">Non Pagata</option>
              <option value="parzialmente_pagata">Parzialmente Pagata</option>
              <option value="pagata">Pagata</option>
              <option value="scaduta">Scaduta</option>
            </select>
          </div>
        </div>
      </div>

      {/* Fatture Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Numero</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data Emissione</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Scadenza</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Totale</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stato</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Azioni</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {fattureFiltrate.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    <FileText className="mx-auto mb-4 text-gray-300" size={48} />
                    <p>Nessuna fattura trovata</p>
                  </td>
                </tr>
              ) : (
                fattureFiltrate.map((fattura) => (
                  <tr key={fattura.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{fattura.numero}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{fattura.clienteNome}</div>
                      {fattura.clienteEmail && (
                        <div className="text-sm text-gray-500">{fattura.clienteEmail}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(fattura.dataEmissione).toLocaleDateString('it-IT')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(fattura.dataScadenza).toLocaleDateString('it-IT')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">€{fattura.totale.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</div>
                      {fattura.importoPagato > 0 && (
                        <div className="text-xs text-green-600">Pagato: €{fattura.importoPagato.toFixed(2)}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatoBadge(fattura.statoPagamento)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => viewDetails(fattura.id)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Visualizza dettagli"
                        >
                          <Eye size={18} />
                        </button>
                        <button
                          onClick={() => handleExportPDF(fattura.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Scarica PDF"
                        >
                          <Download size={18} />
                        </button>
                        <button
                          onClick={() => handleExportExcel(fattura.id)}
                          className="text-green-600 hover:text-green-900"
                          title="Esporta Excel"
                        >
                          <FileSpreadsheet size={18} />
                        </button>
                        {fattura.statoPagamento === 'non_pagata' && (
                          <button
                            onClick={() => handleDeleteFattura(fattura.id)}
                            className="text-red-600 hover:text-red-900"
                            title="Elimina"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full my-8">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">Nuova Fattura</h2>
              <button onClick={() => { setShowCreateModal(false); resetForm(); }} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>

            <div className="p-6 max-h-[calc(100vh-200px)] overflow-y-auto">
              {/* Dati Cliente */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <User size={20} />
                  Dati Cliente
                </h3>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Seleziona da Contatti</label>
                  <select
                    onChange={(e) => handleSelectContact(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-blue-50"
                  >
                    <option value="">-- Oppure inserisci manualmente --</option>
                    {Array.isArray(contacts) && contacts.map(contact => (
                      <option key={contact.id} value={contact.id}>
                        {contact.azienda || `${contact.nome} ${contact.cognome || ''}`.trim()}
                        {contact.partitaIva && ` - P.IVA: ${contact.partitaIva}`}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome Cliente *</label>
                    <input
                      type="text"
                      value={clienteNome}
                      onChange={(e) => setClienteNome(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={clienteEmail}
                      onChange={(e) => setClienteEmail(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Telefono</label>
                    <input
                      type="tel"
                      value={clienteTelefono}
                      onChange={(e) => setClienteTelefono(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Partita IVA</label>
                    <input
                      type="text"
                      value={clientePIva}
                      onChange={(e) => setClientePIva(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Codice Fiscale</label>
                    <input
                      type="text"
                      value={clienteCF}
                      onChange={(e) => setClienteCF(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Indirizzo</label>
                    <input
                      type="text"
                      value={clienteIndirizzo}
                      onChange={(e) => setClienteIndirizzo(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Città</label>
                    <input
                      type="text"
                      value={clienteCitta}
                      onChange={(e) => setClienteCitta(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">CAP</label>
                    <input
                      type="text"
                      value={clienteCAP}
                      onChange={(e) => setClienteCAP(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Righe Fattura */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <FileSpreadsheet size={20} />
                    Righe Fattura
                  </h3>
                  <button
                    onClick={addRiga}
                    className="text-blue-600 hover:text-blue-700 flex items-center gap-1 text-sm"
                  >
                    <Plus size={16} />
                    Aggiungi Riga
                  </button>
                </div>

                <div className="space-y-3">
                  {righe.map((riga, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="mb-2">
                        <label className="block text-xs font-medium text-gray-700 mb-1">Seleziona da Inventario</label>
                        <select
                          onChange={(e) => handleSelectInventarioItem(index, e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm bg-purple-50"
                        >
                          <option value="">-- Oppure inserisci manualmente --</option>
                          {Array.isArray(inventario) && inventario.map(item => (
                            <option key={item.id} value={item.id}>
                              {item.codice} - {item.nome} (€{item.prezzoVendita.toFixed(2)})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                        <div className="md:col-span-2">
                          <label className="block text-xs font-medium text-gray-700 mb-1">Descrizione</label>
                          <input
                            type="text"
                            value={riga.descrizione}
                            onChange={(e) => handleRigaChange(index, 'descrizione', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Quantità</label>
                          <input
                            type="number"
                            value={riga.quantita}
                            onChange={(e) => handleRigaChange(index, 'quantita', parseFloat(e.target.value))}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                            min="1"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Prezzo €</label>
                          <input
                            type="number"
                            value={riga.prezzoUnitario}
                            onChange={(e) => handleRigaChange(index, 'prezzoUnitario', parseFloat(e.target.value))}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                            step="0.01"
                          />
                        </div>
                        <div className="flex items-end gap-2">
                          <div className="flex-1">
                            <label className="block text-xs font-medium text-gray-700 mb-1">IVA %</label>
                            <input
                              type="number"
                              value={riga.iva}
                              onChange={(e) => handleRigaChange(index, 'iva', parseFloat(e.target.value))}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                            />
                          </div>
                          {righe.length > 1 && (
                            <button
                              onClick={() => removeRiga(index)}
                              className="text-red-600 hover:text-red-700 p-1"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="mt-2 text-right text-sm font-medium text-gray-700">
                        Totale riga: €{calcolaTotaliRiga(riga).totale.toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totali */}
              <div className="mb-6 bg-gray-50 p-4 rounded-lg">
                <div className="space-y-2 text-right">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">Imponibile:</span>
                    <span>€{totali.imponibile.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">IVA:</span>
                    <span>€{totali.iva.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold border-t border-gray-300 pt-2">
                    <span>TOTALE:</span>
                    <span>€{totali.totale.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Dettagli Aggiuntivi */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data Scadenza</label>
                  <input
                    type="date"
                    value={dataScadenza}
                    onChange={(e) => setDataScadenza(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Metodo Pagamento</label>
                  <select
                    value={metodoPagamento}
                    onChange={(e) => setMetodoPagamento(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="bonifico">Bonifico Bancario</option>
                    <option value="contanti">Contanti</option>
                    <option value="carta">Carta di Credito</option>
                    <option value="assegno">Assegno</option>
                    <option value="paypal">PayPal</option>
                  </select>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
              <button
                onClick={() => { setShowCreateModal(false); resetForm(); }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Annulla
              </button>
              <button
                onClick={handleCreateFattura}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
              >
                Crea Fattura
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedFattura && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">Dettagli Fattura {selectedFattura.numero}</h2>
              <button onClick={() => setShowDetailModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>

            <div className="p-6">
              {/* Cliente Info */}
              <div className="mb-6">
                <h3 className="font-semibold text-lg mb-2 text-gray-900">Cliente</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="font-medium text-gray-900">{selectedFattura.clienteNome}</p>
                  {selectedFattura.clienteEmail && <p className="text-sm text-gray-700">{selectedFattura.clienteEmail}</p>}
                  {selectedFattura.clienteTelefono && <p className="text-sm text-gray-700">{selectedFattura.clienteTelefono}</p>}
                  {selectedFattura.clientePIva && <p className="text-sm text-gray-700">P.IVA: {selectedFattura.clientePIva}</p>}
                  {selectedFattura.clienteIndirizzo && (
                    <p className="text-sm text-gray-700 mt-2">
                      {selectedFattura.clienteIndirizzo}, {selectedFattura.clienteCAP} {selectedFattura.clienteCitta}
                    </p>
                  )}
                </div>
              </div>

              {/* Righe */}
              <div className="mb-6">
                <h3 className="font-semibold text-lg mb-2 text-gray-900">Dettaglio</h3>
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-gray-900">Descrizione</th>
                      <th className="px-3 py-2 text-right text-gray-900">Q.tà</th>
                      <th className="px-3 py-2 text-right text-gray-900">Prezzo</th>
                      <th className="px-3 py-2 text-right text-gray-900">IVA</th>
                      <th className="px-3 py-2 text-right text-gray-900">Totale</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {selectedFattura.righe.map((riga, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2 text-gray-900">{riga.descrizione}</td>
                        <td className="px-3 py-2 text-right text-gray-900">{riga.quantita}</td>
                        <td className="px-3 py-2 text-right text-gray-900">€{riga.prezzoUnitario.toFixed(2)}</td>
                        <td className="px-3 py-2 text-right text-gray-900">{riga.iva}%</td>
                        <td className="px-3 py-2 text-right font-medium text-gray-900">€{riga.totale.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totali */}
              <div className="bg-gray-50 p-4 rounded-lg mb-6">
                <div className="space-y-2 text-right text-gray-900">
                  <div className="flex justify-between">
                    <span className="text-gray-900">Imponibile:</span>
                    <span className="text-gray-900">€{selectedFattura.imponibile.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-900">IVA:</span>
                    <span className="text-gray-900">€{selectedFattura.iva.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold border-t border-gray-300 pt-2">
                    <span className="text-gray-900">TOTALE:</span>
                    <span className="text-gray-900">€{selectedFattura.totale.toFixed(2)}</span>
                  </div>
                  {selectedFattura.importoPagato > 0 && (
                    <>
                      <div className="flex justify-between text-green-700">
                        <span>Pagato:</span>
                        <span>€{selectedFattura.importoPagato.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-yellow-700">
                        <span>Da Pagare:</span>
                        <span>€{selectedFattura.importoDaPagare.toFixed(2)}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Info Aggiuntive */}
              <div className="grid grid-cols-2 gap-4 text-sm text-gray-900">
                <div>
                  <span className="font-medium text-gray-900">Data Emissione:</span>
                  <p className="text-gray-900">{new Date(selectedFattura.dataEmissione).toLocaleDateString('it-IT')}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-900">Scadenza:</span>
                  <p className="text-gray-900">{new Date(selectedFattura.dataScadenza).toLocaleDateString('it-IT')}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-900">Stato:</span>
                  <select
                    value={selectedFattura.statoPagamento}
                    onChange={(e) => handleUpdateStatoPagamento(selectedFattura.id, e.target.value)}
                    className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-gray-900"
                  >
                    <option value="non_pagata">Non Pagata</option>
                    <option value="parzialmente_pagata">Parzialmente Pagata</option>
                    <option value="pagata">Pagata</option>
                    <option value="scaduta">Scaduta</option>
                  </select>
                </div>
                {selectedFattura.metodoPagamento && (
                  <div>
                    <span className="font-medium text-gray-900">Metodo Pagamento:</span>
                    <p className="capitalize text-gray-900">{selectedFattura.metodoPagamento}</p>
                  </div>
                )}
              </div>

              {selectedFattura.note && (
                <div className="mt-4">
                  <span className="font-medium text-gray-900">Note:</span>
                  <p className="text-sm text-gray-700 mt-1">{selectedFattura.note}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">Registra Pagamento</h2>
              <button
                onClick={() => {
                  setShowPaymentModal(false);
                  setPendingStatusChange(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6">
              <p className="text-gray-700 mb-4">
                Stai per marcare questa fattura come "Pagata". Inserisci i dettagli del pagamento:
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Importo Pagato (€) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(parseFloat(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Metodo Pagamento *</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                  >
                    <option value="bonifico">Bonifico</option>
                    <option value="contanti">Contanti</option>
                    <option value="carta">Carta di Credito/Debito</option>
                    <option value="assegno">Assegno</option>
                    <option value="paypal">PayPal</option>
                    <option value="altro">Altro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data Pagamento *</label>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
                  <textarea
                    value={paymentNote}
                    onChange={(e) => setPaymentNote(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                    rows={3}
                    placeholder="Note aggiuntive sul pagamento..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ricevuta di Pagamento</label>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    onChange={(e) => setPaymentFile(e.target.files?.[0] || null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                  <p className="text-xs text-gray-500 mt-1">Carica la ricevuta di pagamento (PDF, immagine o documento)</p>
                </div>
              </div>

              <div className="mt-6 flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setShowPaymentModal(false);
                    setPendingStatusChange(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Annulla
                </button>
                <button
                  onClick={handleSubmitPayment}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Registra Pagamento
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default FatturePage;
