import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  DollarSign,
  Plus,
  Trash2,
  Loader,
  Calendar,
  CheckCircle,
  FileText,
  X,
  Search,
  CreditCard,
  Banknote
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL;

interface Pagamento {
  id: string;
  fatturaId: string;
  importo: number;
  dataPagamento: string;
  metodoPagamento: string;
  riferimento?: string;
  note?: string;
  fattura?: {
    id: string;
    numero: string;
    clienteNome: string;
    totale: number;
    statoPagamento: string;
  };
}

const PagamentiPage: React.FC = () => {
  const [pagamenti, setPagamenti] = useState<Pagamento[]>([]);
  const [fatture, setFatture] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Form state
  const [fatturaId, setFatturaId] = useState('');
  const [importo, setImporto] = useState('');
  const [metodoPagamento, setMetodoPagamento] = useState('bonifico');
  const [dataPagamento, setDataPagamento] = useState(new Date().toISOString().split('T')[0]);
  const [riferimento, setRiferimento] = useState('');
  const [note, setNote] = useState('');

  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchPagamenti();
    fetchFatture();
  }, []);

  const fetchPagamenti = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/pagamenti`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPagamenti(response.data || []);
    } catch (error) {
      console.error('Errore caricamento pagamenti:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFatture = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/fatture`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { statoPagamento: 'non_pagata,parzialmente_pagata' }
      });
      setFatture(response.data || []);
    } catch (error) {
      console.error('Errore caricamento fatture:', error);
    }
  };

  const handleCreatePagamento = async () => {
    if (!fatturaId || !importo || parseFloat(importo) <= 0) {
      alert('Seleziona una fattura e inserisci un importo valido');
      return;
    }

    try {
      await axios.post(`${API_URL}/api/pagamenti`, {
        fatturaId,
        importo: parseFloat(importo),
        metodoPagamento,
        dataPagamento,
        riferimento,
        note
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      alert('Pagamento registrato con successo!');
      setShowCreateModal(false);
      resetForm();
      fetchPagamenti();
      fetchFatture();
    } catch (error: any) {
      console.error('Errore registrazione pagamento:', error);
      alert(error.response?.data?.error || 'Errore nella registrazione del pagamento');
    }
  };

  const handleDeletePagamento = async (id: string) => {
    if (!confirm('Sei sicuro di voler eliminare questo pagamento?')) return;

    try {
      await axios.delete(`${API_URL}/api/pagamenti/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Pagamento eliminato con successo!');
      fetchPagamenti();
      fetchFatture();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Errore nell\'eliminazione del pagamento');
    }
  };

  const resetForm = () => {
    setFatturaId('');
    setImporto('');
    setMetodoPagamento('bonifico');
    setDataPagamento(new Date().toISOString().split('T')[0]);
    setRiferimento('');
    setNote('');
  };

  const pagamentiFiltrati = pagamenti.filter(p =>
    p.fattura?.clienteNome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.fattura?.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.metodoPagamento.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getMetodoPagamentoIcon = (metodo: string) => {
    switch (metodo) {
      case 'bonifico':
        return <Banknote size={16} />;
      case 'carta':
        return <CreditCard size={16} />;
      case 'contanti':
        return <DollarSign size={16} />;
      default:
        return <DollarSign size={16} />;
    }
  };

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
              <DollarSign className="text-green-600" />
            Gestione Pagamenti
          </h1>
          <p className="text-gray-600 mt-1">Tracciamento pagamenti e incassi</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2"
        >
          <Plus size={20} />
          Registra Pagamento
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Totale Incassato</p>
              <p className="text-2xl font-bold text-green-600">
                €{pagamenti.reduce((sum, p) => sum + p.importo, 0).toLocaleString('it-IT', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="bg-green-100 p-3 rounded-full">
              <CheckCircle className="text-green-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Pagamenti Totali</p>
              <p className="text-2xl font-bold text-gray-900">{pagamenti.length}</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-full">
              <FileText className="text-blue-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Questo Mese</p>
              <p className="text-2xl font-bold text-gray-900">
                €{pagamenti
                  .filter(p => new Date(p.dataPagamento).getMonth() === new Date().getMonth())
                  .reduce((sum, p) => sum + p.importo, 0)
                  .toLocaleString('it-IT', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="bg-purple-100 p-3 rounded-full">
              <Calendar className="text-purple-600" size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-3 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Cerca per cliente, numero fattura o metodo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Pagamenti Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fattura</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Metodo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Importo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Riferimento</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Azioni</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {pagamentiFiltrati.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    <DollarSign className="mx-auto mb-4 text-gray-300" size={48} />
                    <p>Nessun pagamento trovato</p>
                  </td>
                </tr>
              ) : (
                pagamentiFiltrati.map((pagamento) => (
                  <tr key={pagamento.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(pagamento.dataPagamento).toLocaleDateString('it-IT')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{pagamento.fattura?.numero}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{pagamento.fattura?.clienteNome}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                        {getMetodoPagamentoIcon(pagamento.metodoPagamento)}
                        {pagamento.metodoPagamento}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-green-600">
                        €{pagamento.importo.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {pagamento.riferimento || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleDeletePagamento(pagamento.id)}
                        className="text-red-600 hover:text-red-900"
                        title="Elimina"
                      >
                        <Trash2 size={18} />
                      </button>
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">Registra Pagamento</h2>
              <button onClick={() => { setShowCreateModal(false); resetForm(); }} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>

            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fattura *</label>
                  <select
                    value={fatturaId}
                    onChange={(e) => {
                      setFatturaId(e.target.value);
                      const fattura = fatture.find(f => f.id === e.target.value);
                      if (fattura) {
                        setImporto(fattura.importoDaPagare.toString());
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    required
                  >
                    <option value="">Seleziona fattura</option>
                    {fatture.map(fattura => (
                      <option key={fattura.id} value={fattura.id}>
                        {fattura.numero} - {fattura.clienteNome} - Da pagare: €{fattura.importoDaPagare.toFixed(2)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Importo * (€)</label>
                    <input
                      type="number"
                      value={importo}
                      onChange={(e) => setImporto(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                      step="0.01"
                      min="0.01"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Data Pagamento *</label>
                    <input
                      type="date"
                      value={dataPagamento}
                      onChange={(e) => setDataPagamento(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Metodo Pagamento *</label>
                  <select
                    value={metodoPagamento}
                    onChange={(e) => setMetodoPagamento(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  >
                    <option value="bonifico">Bonifico Bancario</option>
                    <option value="contanti">Contanti</option>
                    <option value="carta">Carta di Credito</option>
                    <option value="assegno">Assegno</option>
                    <option value="paypal">PayPal</option>
                    <option value="stripe">Stripe</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Riferimento Pagamento</label>
                  <input
                    type="text"
                    value={riferimento}
                    onChange={(e) => setRiferimento(e.target.value)}
                    placeholder="Es: numero bonifico, ID transazione..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                </div>
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
                onClick={handleCreatePagamento}
                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700"
              >
                Registra Pagamento
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default PagamentiPage;
