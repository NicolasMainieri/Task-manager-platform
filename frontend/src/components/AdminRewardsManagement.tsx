import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Gift,
  Plus,
  Edit2,
  Trash2,
  Eye,
  Check,
  X,
  Package,
  TrendingUp,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';

const API_URL = 'http://localhost:4000/api';

interface Reward {
  id: string;
  nome: string;
  descrizione?: string;
  immagine?: string;
  costoScore: number;
  costoMensile: number;
  quantita: number;
  disponibile: boolean;
  quantitaRimanente: number;
  totalRedemptions: number;
  redemptions?: RewardRedemption[];
  createdAt: string;
}

interface RewardRedemption {
  id: string;
  userId: string;
  stato: string;
  adminNote?: string;
  createdAt: string;
  user: {
    id: string;
    nome: string;
    cognome: string;
    email: string;
  };
}

const AdminRewardsManagement: React.FC = () => {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showRedemptionsModal, setShowRedemptionsModal] = useState(false);
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null);
  const [formData, setFormData] = useState({
    nome: '',
    descrizione: '',
    immagine: '',
    costoScore: '',
    costoMensile: '',
    quantita: '1'
  });

  const token = localStorage.getItem('token');

  useEffect(() => {
    loadRewards();
  }, []);

  const loadRewards = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/rewards/admin`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRewards(response.data);
    } catch (error) {
      console.error('Errore nel caricamento dei premi:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateReward = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/rewards`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShowCreateModal(false);
      resetForm();
      loadRewards();
    } catch (error: any) {
      console.error('Errore nella creazione del premio:', error);
      alert(error.response?.data?.error || 'Errore nella creazione del premio');
    }
  };

  const handleUpdateReward = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReward) return;

    try {
      await axios.put(`${API_URL}/rewards/${selectedReward.id}`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShowEditModal(false);
      setSelectedReward(null);
      resetForm();
      loadRewards();
    } catch (error: any) {
      console.error('Errore nell\'aggiornamento del premio:', error);
      alert(error.response?.data?.error || 'Errore nell\'aggiornamento del premio');
    }
  };

  const handleDeleteReward = async (rewardId: string) => {
    if (!confirm('Sei sicuro di voler eliminare questo premio?')) return;

    try {
      await axios.delete(`${API_URL}/rewards/${rewardId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      loadRewards();
    } catch (error: any) {
      console.error('Errore nell\'eliminazione del premio:', error);
      alert(error.response?.data?.error || 'Errore nell\'eliminazione del premio');
    }
  };

  const handleToggleAvailability = async (reward: Reward) => {
    try {
      await axios.put(
        `${API_URL}/rewards/${reward.id}`,
        { disponibile: !reward.disponibile },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      loadRewards();
    } catch (error: any) {
      console.error('Errore nel cambio disponibilità:', error);
      alert(error.response?.data?.error || 'Errore nel cambio disponibilità');
    }
  };

  const handleUpdateRedemptionStatus = async (
    redemptionId: string,
    stato: string,
    adminNote?: string
  ) => {
    try {
      await axios.put(
        `${API_URL}/rewards/redemptions/${redemptionId}`,
        { stato, adminNote },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      loadRewards();
      setShowRedemptionsModal(false);
    } catch (error: any) {
      console.error('Errore nell\'aggiornamento del riscatto:', error);
      alert(error.response?.data?.error || 'Errore nell\'aggiornamento del riscatto');
    }
  };

  const openEditModal = (reward: Reward) => {
    setSelectedReward(reward);
    setFormData({
      nome: reward.nome,
      descrizione: reward.descrizione || '',
      immagine: reward.immagine || '',
      costoScore: reward.costoScore.toString(),
      costoMensile: reward.costoMensile.toString(),
      quantita: reward.quantita.toString()
    });
    setShowEditModal(true);
  };

  const openRedemptionsModal = (reward: Reward) => {
    setSelectedReward(reward);
    setShowRedemptionsModal(true);
  };

  const resetForm = () => {
    setFormData({
      nome: '',
      descrizione: '',
      immagine: '',
      costoScore: '',
      costoMensile: '',
      quantita: '1'
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (stato: string) => {
    switch (stato) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'approved':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'awaiting_pickup':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
      case 'delivered':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'rejected':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  const getStatusLabel = (stato: string) => {
    const labels: { [key: string]: string } = {
      pending: 'In attesa',
      approved: 'Approvato',
      awaiting_pickup: 'Attesa ritiro',
      delivered: 'Consegnato',
      rejected: 'Rifiutato'
    };
    return labels[stato] || stato;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-xl text-gray-400">Caricamento premi...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Gift className="w-8 h-8 text-indigo-600" />
            Gestione Premi
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Crea e gestisci i premi per i tuoi dipendenti
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Nuovo Premio
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
              <Package className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Premi Totali</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {rewards.length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Disponibili</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {rewards.filter((r) => r.disponibile).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
              <Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">In Attesa</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {rewards.reduce(
                  (acc, r) =>
                    acc +
                    (r.redemptions?.filter((red) => red.stato === 'pending').length || 0),
                  0
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <TrendingUp className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Riscatti Totali</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {rewards.reduce((acc, r) => acc + r.totalRedemptions, 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Rewards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {rewards.map((reward) => (
          <div
            key={reward.id}
            className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden hover:shadow-lg transition-shadow"
          >
            {reward.immagine ? (
              <img
                src={reward.immagine}
                alt={reward.nome}
                className="w-full h-48 object-cover"
              />
            ) : (
              <div className="w-full h-48 bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <Gift className="w-20 h-20 text-white opacity-50" />
              </div>
            )}

            <div className="p-6">
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  {reward.nome}
                </h3>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-semibold ${
                    reward.disponibile
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
                  }`}
                >
                  {reward.disponibile ? 'Attivo' : 'Disabilitato'}
                </span>
              </div>

              {reward.descrizione && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                  {reward.descrizione}
                </p>
              )}

              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Costo Totale:</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {reward.costoScore} punti
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Costo Mensile:</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {reward.costoMensile} punti
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Disponibili:</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {reward.quantitaRimanente === -1
                      ? 'Illimitati'
                      : `${reward.quantitaRimanente}/${reward.quantita}`}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Riscatti:</span>
                  <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                    {reward.totalRedemptions}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => openRedemptionsModal(reward)}
                  className="flex-1 px-3 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors flex items-center justify-center gap-2"
                >
                  <Eye className="w-4 h-4" />
                  Riscatti
                </button>
                <button
                  onClick={() => openEditModal(reward)}
                  className="px-3 py-2 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleToggleAvailability(reward)}
                  className="px-3 py-2 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
                >
                  {reward.disponibile ? (
                    <XCircle className="w-4 h-4" />
                  ) : (
                    <CheckCircle className="w-4 h-4" />
                  )}
                </button>
                <button
                  onClick={() => handleDeleteReward(reward.id)}
                  className="px-3 py-2 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {rewards.length === 0 && (
        <div className="text-center py-12">
          <Gift className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Nessun premio creato
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Crea il tuo primo premio
          </button>
        </div>
      )}

      {/* Create/Edit Modal */}
      {(showCreateModal || showEditModal) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl max-w-2xl w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              {showCreateModal ? 'Nuovo Premio' : 'Modifica Premio'}
            </h2>

            <form onSubmit={showCreateModal ? handleCreateReward : handleUpdateReward}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Nome Premio *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.nome}
                    onChange={(e) =>
                      setFormData({ ...formData, nome: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                    placeholder="es: iPhone 17 Pro Max"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Descrizione
                  </label>
                  <textarea
                    value={formData.descrizione}
                    onChange={(e) =>
                      setFormData({ ...formData, descrizione: e.target.value })
                    }
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                    placeholder="Descrizione del premio..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    URL Immagine
                  </label>
                  <input
                    type="url"
                    value={formData.immagine}
                    onChange={(e) =>
                      setFormData({ ...formData, immagine: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                    placeholder="https://..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Costo Totale (punti) *
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={formData.costoScore}
                      onChange={(e) =>
                        setFormData({ ...formData, costoScore: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                      placeholder="10"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Costo Mensile (punti) *
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={formData.costoMensile}
                      onChange={(e) =>
                        setFormData({ ...formData, costoMensile: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                      placeholder="5"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Quantità disponibili (-1 per illimitato)
                  </label>
                  <input
                    type="number"
                    min="-1"
                    value={formData.quantita}
                    onChange={(e) =>
                      setFormData({ ...formData, quantita: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                    placeholder="1"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 mt-6">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  {showCreateModal ? 'Crea Premio' : 'Salva Modifiche'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setShowEditModal(false);
                    setSelectedReward(null);
                    resetForm();
                  }}
                  className="px-4 py-2 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-slate-600 transition-colors"
                >
                  Annulla
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Redemptions Modal */}
      {showRedemptionsModal && selectedReward && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Riscatti - {selectedReward.nome}
              </h2>
              <button
                onClick={() => {
                  setShowRedemptionsModal(false);
                  setSelectedReward(null);
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {selectedReward.redemptions && selectedReward.redemptions.length > 0 ? (
              <div className="space-y-4">
                {selectedReward.redemptions.map((redemption) => (
                  <div
                    key={redemption.id}
                    className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4 border border-gray-200 dark:border-slate-600"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {redemption.user.nome} {redemption.user.cognome}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {redemption.user.email}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Richiesto il: {formatDate(redemption.createdAt)}
                        </p>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(
                          redemption.stato
                        )}`}
                      >
                        {getStatusLabel(redemption.stato)}
                      </span>
                    </div>

                    {redemption.adminNote && (
                      <div className="mb-3 p-3 bg-white dark:bg-slate-800 rounded border border-gray-200 dark:border-slate-600">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                          Nota admin:
                        </p>
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          {redemption.adminNote}
                        </p>
                      </div>
                    )}

                    {redemption.stato === 'pending' && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() =>
                            handleUpdateRedemptionStatus(
                              redemption.id,
                              'approved',
                              'Richiesta approvata'
                            )
                          }
                          className="flex-1 px-3 py-2 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors flex items-center justify-center gap-2"
                        >
                          <Check className="w-4 h-4" />
                          Approva
                        </button>
                        <button
                          onClick={() => {
                            const note = prompt(
                              'Motivo del rifiuto (opzionale):'
                            );
                            if (note !== null) {
                              handleUpdateRedemptionStatus(
                                redemption.id,
                                'rejected',
                                note || 'Richiesta rifiutata'
                              );
                            }
                          }}
                          className="flex-1 px-3 py-2 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors flex items-center justify-center gap-2"
                        >
                          <X className="w-4 h-4" />
                          Rifiuta
                        </button>
                      </div>
                    )}

                    {redemption.stato === 'approved' && (
                      <button
                        onClick={() =>
                          handleUpdateRedemptionStatus(
                            redemption.id,
                            'delivered',
                            'Premio consegnato'
                          )
                        }
                        className="w-full px-3 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors flex items-center justify-center gap-2"
                      >
                        <Package className="w-4 h-4" />
                        Segna come Consegnato
                      </button>
                    )}

                    {redemption.stato === 'awaiting_pickup' && (
                      <button
                        onClick={async () => {
                          try {
                            await axios.put(
                              `${API_URL}/rewards/redemptions/${redemption.id}/mark-delivered`,
                              {},
                              { headers: { Authorization: `Bearer ${token}` } }
                            );
                            alert('Premio segnato come consegnato!');
                            loadRewards();
                            setShowRedemptionsModal(false);
                          } catch (error: any) {
                            console.error('Errore:', error);
                            alert(error.response?.data?.error || 'Errore nell\'operazione');
                          }
                        }}
                        className="w-full px-3 py-2 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors flex items-center justify-center gap-2"
                      >
                        <Check className="w-4 h-4" />
                        Segna come Consegnato
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">
                  Nessun riscatto per questo premio
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminRewardsManagement;
