import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Calendar,
  Plus,
  Clock,
  CheckCircle,
  XCircle,
  Loader,
  Trash2,
  X,
  Search,
  Sun,
  Briefcase,
  Heart
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL;

interface RichiestaAssenza {
  id: string;
  tipo: string;
  dataInizio: string;
  dataFine: string;
  giorniRichiesti: number;
  motivazione?: string;
  stato: 'pending' | 'approvata' | 'rifiutata';
  dataApprovazione?: string;
  noteApprovazione?: string;
}

const AssenzePage: React.FC = () => {
  const [richieste, setRichieste] = useState<RichiestaAssenza[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filtroStato, setFiltroStato] = useState('');

  // Form state
  const [tipo, setTipo] = useState('ferie');
  const [dataInizio, setDataInizio] = useState('');
  const [dataFine, setDataFine] = useState('');
  const [motivazione, setMotivazione] = useState('');

  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchRichieste();
  }, [filtroStato]);

  const fetchRichieste = async () => {
    try {
      const params: any = {};
      if (filtroStato) params.stato = filtroStato;

      const response = await axios.get(`${API_URL}/api/assenze`, {
        headers: { Authorization: `Bearer ${token}` },
        params
      });
      setRichieste(response.data || []);
    } catch (error) {
      console.error('Errore caricamento richieste:', error);
    } finally {
      setLoading(false);
    }
  };

  const calcolaGiorni = () => {
    if (!dataInizio || !dataFine) return 0;
    const start = new Date(dataInizio);
    const end = new Date(dataFine);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  const handleCreateRichiesta = async () => {
    if (!dataInizio || !dataFine) {
      alert('Inserisci le date di inizio e fine');
      return;
    }

    if (new Date(dataInizio) > new Date(dataFine)) {
      alert('La data di fine deve essere successiva alla data di inizio');
      return;
    }

    try {
      await axios.post(`${API_URL}/api/assenze`, {
        tipo,
        dataInizio,
        dataFine,
        giorniRichiesti: calcolaGiorni(),
        motivazione
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      alert('Richiesta inviata con successo!');
      setShowCreateModal(false);
      resetForm();
      fetchRichieste();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Errore nell\'invio della richiesta');
    }
  };

  const handleDeleteRichiesta = async (id: string) => {
    if (!confirm('Sei sicuro di voler eliminare questa richiesta?')) return;

    try {
      await axios.delete(`${API_URL}/api/assenze/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Richiesta eliminata con successo!');
      fetchRichieste();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Errore nell\'eliminazione della richiesta');
    }
  };

  const resetForm = () => {
    setTipo('ferie');
    setDataInizio('');
    setDataFine('');
    setMotivazione('');
  };

  const getStatoBadge = (stato: string) => {
    const badges = {
      'pending': { color: 'bg-yellow-100 text-yellow-800', icon: Clock, label: 'In Attesa' },
      'approvata': { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'Approvata' },
      'rifiutata': { color: 'bg-red-100 text-red-800', icon: XCircle, label: 'Rifiutata' }
    };
    const badge = badges[stato as keyof typeof badges] || badges['pending'];
    const Icon = badge.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        <Icon size={12} />
        {badge.label}
      </span>
    );
  };

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case 'ferie': return <Sun size={16} className="text-orange-500" />;
      case 'permesso': return <Briefcase size={16} className="text-blue-500" />;
      case 'malattia': return <Heart size={16} className="text-red-500" />;
      default: return <Calendar size={16} className="text-gray-500" />;
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
            <Calendar className="text-purple-600" />
            Richieste Assenze
          </h1>
          <p className="text-gray-600 mt-1">Gestione ferie, permessi e malattie</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center gap-2"
        >
          <Plus size={20} />
          Nuova Richiesta
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <p className="text-gray-600 text-sm">Totali</p>
          <p className="text-2xl font-bold text-gray-900">{richieste.length}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-yellow-200 border-l-4">
          <p className="text-gray-600 text-sm">In Attesa</p>
          <p className="text-2xl font-bold text-yellow-600">
            {richieste.filter(r => r.stato === 'pending').length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-green-200 border-l-4">
          <p className="text-gray-600 text-sm">Approvate</p>
          <p className="text-2xl font-bold text-green-600">
            {richieste.filter(r => r.stato === 'approvata').length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-red-200 border-l-4">
          <p className="text-gray-600 text-sm">Rifiutate</p>
          <p className="text-2xl font-bold text-red-600">
            {richieste.filter(r => r.stato === 'rifiutata').length}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6">
        <select
          value={filtroStato}
          onChange={(e) => setFiltroStato(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
        >
          <option value="">Tutti gli stati</option>
          <option value="pending">In Attesa</option>
          <option value="approvata">Approvata</option>
          <option value="rifiutata">Rifiutata</option>
        </select>
      </div>

      {/* Richieste Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Periodo</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Giorni</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stato</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Azioni</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {richieste.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                  <Calendar className="mx-auto mb-4 text-gray-300" size={48} />
                  <p>Nessuna richiesta trovata</p>
                </td>
              </tr>
            ) : (
              richieste.map((richiesta) => (
                <tr key={richiesta.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {getTipoIcon(richiesta.tipo)}
                      <span className="capitalize font-medium">{richiesta.tipo}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {new Date(richiesta.dataInizio).toLocaleDateString('it-IT')} - {new Date(richiesta.dataFine).toLocaleDateString('it-IT')}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium">{richiesta.giorniRichiesti} giorni</td>
                  <td className="px-6 py-4">{getStatoBadge(richiesta.stato)}</td>
                  <td className="px-6 py-4">
                    {richiesta.stato === 'pending' && (
                      <button
                        onClick={() => handleDeleteRichiesta(richiesta.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-2xl font-bold">Nuova Richiesta</h2>
              <button onClick={() => { setShowCreateModal(false); resetForm(); }}>
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Tipo *</label>
                <select
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="ferie">Ferie</option>
                  <option value="permesso">Permesso</option>
                  <option value="malattia">Malattia</option>
                  <option value="congedo">Congedo</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Data Inizio *</label>
                <input
                  type="date"
                  value={dataInizio}
                  onChange={(e) => setDataInizio(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Data Fine *</label>
                <input
                  type="date"
                  value={dataFine}
                  onChange={(e) => setDataFine(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              {dataInizio && dataFine && (
                <div className="bg-purple-50 p-3 rounded-lg">
                  <p className="text-sm text-purple-900">
                    <strong>Giorni richiesti:</strong> {calcolaGiorni()}
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-1">Motivazione</label>
                <textarea
                  value={motivazione}
                  onChange={(e) => setMotivazione(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 p-6 border-t">
              <button
                onClick={() => { setShowCreateModal(false); resetForm(); }}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Annulla
              </button>
              <button
                onClick={handleCreateRichiesta}
                className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700"
              >
                Invia Richiesta
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default AssenzePage;
