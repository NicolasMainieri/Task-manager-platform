import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Gift,
  Trophy,
  TrendingUp,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Package,
  Sparkles
} from 'lucide-react';
import MyRedeemedRewards from './MyRedeemedRewards';

const API_URL = 'http://localhost:4000/api';

interface Reward {
  id: string;
  nome: string;
  descrizione?: string;
  immagine?: string;
  costoScore: number;
  costoMensile: number;
  quantita: number;
  quantitaRimanente: number;
  userHasRedeemed: boolean;
  redemptions: RewardRedemption[];
}

interface RewardRedemption {
  id: string;
  stato: string;
  createdAt: string;
}

interface UserRedemption {
  id: string;
  stato: string;
  adminNote?: string;
  createdAt: string;
  reward: {
    id: string;
    nome: string;
    descrizione?: string;
    immagine?: string;
    costoScore: number;
    costoMensile: number;
  };
}

interface UserStats {
  totalScore: number;
  monthlyScore: number;
  currentPeriod: string;
}

const EmployeeRewards: React.FC = () => {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [myRedemptions, setMyRedemptions] = useState<UserRedemption[]>([]);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'available' | 'myRedemptions' | 'approved'>(
    'available'
  );

  const token = localStorage.getItem('token');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [rewardsRes, redemptionsRes, statsRes] = await Promise.all([
        axios.get(`${API_URL}/rewards`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_URL}/rewards/redemptions/my`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_URL}/rewards/stats`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      setRewards(rewardsRes.data);
      setMyRedemptions(redemptionsRes.data);
      setUserStats(statsRes.data);
    } catch (error) {
      console.error('Errore nel caricamento dei dati:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRedeemReward = async (rewardId: string) => {
    if (!confirm('Sei sicuro di voler riscattare questo premio?')) return;

    try {
      await axios.post(
        `${API_URL}/rewards/${rewardId}/redeem`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert('Richiesta premio inviata con successo!');
      loadData();
    } catch (error: any) {
      console.error('Errore nel riscatto del premio:', error);
      alert(error.response?.data?.error || 'Errore nel riscatto del premio');
    }
  };

  const canRedeemReward = (reward: Reward): { can: boolean; reason?: string } => {
    if (!userStats) return { can: false, reason: 'Dati utente non disponibili' };

    if (reward.userHasRedeemed) {
      return { can: false, reason: 'Hai già richiesto questo premio' };
    }

    if (reward.quantitaRimanente === 0) {
      return { can: false, reason: 'Premio esaurito' };
    }

    if (userStats.totalScore < reward.costoScore) {
      return {
        can: false,
        reason: `Ti servono ${reward.costoScore - userStats.totalScore} punti in più (totale)`
      };
    }

    if (userStats.monthlyScore < reward.costoMensile) {
      return {
        can: false,
        reason: `Ti servono ${reward.costoMensile - userStats.monthlyScore} punti in più questo mese`
      };
    }

    return { can: true };
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
      delivered: 'Consegnato',
      rejected: 'Rifiutato'
    };
    return labels[stato] || stato;
  };

  const getStatusIcon = (stato: string) => {
    switch (stato) {
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'approved':
        return <CheckCircle className="w-4 h-4" />;
      case 'delivered':
        return <Package className="w-4 h-4" />;
      case 'rejected':
        return <XCircle className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
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
            Premi e Ricompense
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Completa le task e riscatta fantastici premi!
          </p>
        </div>
      </div>

      {/* User Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl p-6 text-white">
          <div className="flex items-center gap-3 mb-2">
            <Trophy className="w-6 h-6" />
            <p className="text-sm opacity-90">Punteggio Totale</p>
          </div>
          <p className="text-4xl font-bold">{userStats?.totalScore || 0}</p>
          <p className="text-sm opacity-75 mt-1">punti accumulati</p>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-6 text-white">
          <div className="flex items-center gap-3 mb-2">
            <Calendar className="w-6 h-6" />
            <p className="text-sm opacity-90">Punteggio Mensile</p>
          </div>
          <p className="text-4xl font-bold">{userStats?.monthlyScore || 0}</p>
          <p className="text-sm opacity-75 mt-1">
            questo mese ({userStats?.currentPeriod})
          </p>
        </div>

        <div className="bg-gradient-to-br from-yellow-500 to-orange-600 rounded-xl p-6 text-white">
          <div className="flex items-center gap-3 mb-2">
            <Sparkles className="w-6 h-6" />
            <p className="text-sm opacity-90">Premi Riscattati</p>
          </div>
          <p className="text-4xl font-bold">
            {myRedemptions.filter((r) => r.stato === 'delivered').length}
          </p>
          <p className="text-sm opacity-75 mt-1">
            {myRedemptions.filter((r) => r.stato === 'pending').length} in attesa
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-4 border-b border-gray-200 dark:border-slate-700">
        <button
          onClick={() => setActiveTab('available')}
          className={`px-4 py-3 font-semibold transition-colors relative ${
            activeTab === 'available'
              ? 'text-indigo-600 dark:text-indigo-400'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
        >
          Premi Disponibili
          {activeTab === 'available' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 dark:bg-indigo-400"></div>
          )}
        </button>
        <button
          onClick={() => setActiveTab('myRedemptions')}
          className={`px-4 py-3 font-semibold transition-colors relative ${
            activeTab === 'myRedemptions'
              ? 'text-indigo-600 dark:text-indigo-400'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
        >
          I Miei Riscatti
          {myRedemptions.filter((r) => r.stato === 'pending').length > 0 && (
            <span className="ml-2 px-2 py-0.5 bg-yellow-500 text-white text-xs rounded-full">
              {myRedemptions.filter((r) => r.stato === 'pending').length}
            </span>
          )}
          {activeTab === 'myRedemptions' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 dark:bg-indigo-400"></div>
          )}
        </button>
        <button
          onClick={() => setActiveTab('approved')}
          className={`px-4 py-3 font-semibold transition-colors relative ${
            activeTab === 'approved'
              ? 'text-indigo-600 dark:text-indigo-400'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
        >
          Da Ritirare
          {myRedemptions.filter((r) => ['approved', 'awaiting_pickup'].includes(r.stato)).length > 0 && (
            <span className="ml-2 px-2 py-0.5 bg-green-500 text-white text-xs rounded-full">
              {myRedemptions.filter((r) => ['approved', 'awaiting_pickup'].includes(r.stato)).length}
            </span>
          )}
          {activeTab === 'approved' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 dark:bg-indigo-400"></div>
          )}
        </button>
      </div>

      {/* Content */}
      {activeTab === 'approved' ? (
        <MyRedeemedRewards />
      ) : activeTab === 'available' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rewards.map((reward) => {
            const redemptionCheck = canRedeemReward(reward);

            return (
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
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                    {reward.nome}
                  </h3>

                  {reward.descrizione && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-3">
                      {reward.descrizione}
                    </p>
                  )}

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">
                        Costo Totale:
                      </span>
                      <span
                        className={`font-semibold ${
                          userStats && userStats.totalScore >= reward.costoScore
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}
                      >
                        {reward.costoScore} punti
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">
                        Costo Mensile:
                      </span>
                      <span
                        className={`font-semibold ${
                          userStats && userStats.monthlyScore >= reward.costoMensile
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}
                      >
                        {reward.costoMensile} punti
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">
                        Disponibili:
                      </span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {reward.quantitaRimanente === -1
                          ? 'Illimitati'
                          : reward.quantitaRimanente}
                      </span>
                    </div>
                  </div>

                  {redemptionCheck.can ? (
                    <button
                      onClick={() => handleRedeemReward(reward.id)}
                      className="w-full px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-semibold flex items-center justify-center gap-2"
                    >
                      <Gift className="w-5 h-5" />
                      Riscatta Premio
                    </button>
                  ) : (
                    <div className="w-full px-4 py-3 bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400 rounded-lg text-center text-sm">
                      <div className="flex items-center justify-center gap-2 mb-1">
                        <AlertCircle className="w-4 h-4" />
                        <span className="font-semibold">Non disponibile</span>
                      </div>
                      {redemptionCheck.reason && (
                        <p className="text-xs">{redemptionCheck.reason}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {rewards.length === 0 && (
            <div className="col-span-full text-center py-12">
              <Gift className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">
                Nessun premio disponibile al momento
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {myRedemptions.map((redemption) => (
            <div
              key={redemption.id}
              className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start gap-4">
                {redemption.reward.immagine ? (
                  <img
                    src={redemption.reward.immagine}
                    alt={redemption.reward.nome}
                    className="w-24 h-24 object-cover rounded-lg"
                  />
                ) : (
                  <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                    <Gift className="w-12 h-12 text-white opacity-50" />
                  </div>
                )}

                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                        {redemption.reward.nome}
                      </h3>
                      {redemption.reward.descrizione && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {redemption.reward.descrizione}
                        </p>
                      )}
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 ${getStatusColor(
                        redemption.stato
                      )}`}
                    >
                      {getStatusIcon(redemption.stato)}
                      {getStatusLabel(redemption.stato)}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-3">
                    <span>
                      Costo: {redemption.reward.costoScore} punti totali,{' '}
                      {redemption.reward.costoMensile} punti mensili
                    </span>
                    <span>•</span>
                    <span>Richiesto il: {formatDate(redemption.createdAt)}</span>
                  </div>

                  {redemption.adminNote && (
                    <div className="mt-3 p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg border border-gray-200 dark:border-slate-600">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                        Nota dall'amministratore:
                      </p>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        {redemption.adminNote}
                      </p>
                    </div>
                  )}

                  {redemption.stato === 'pending' && (
                    <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800/30">
                      <p className="text-sm text-yellow-800 dark:text-yellow-400 flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        La tua richiesta è in attesa di approvazione da parte
                        dell'amministratore
                      </p>
                    </div>
                  )}

                  {redemption.stato === 'approved' && (
                    <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800/30">
                      <p className="text-sm text-blue-800 dark:text-blue-400 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" />
                        La tua richiesta è stata approvata! Il premio sarà
                        consegnato a breve
                      </p>
                    </div>
                  )}

                  {redemption.stato === 'delivered' && (
                    <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800/30">
                      <p className="text-sm text-green-800 dark:text-green-400 flex items-center gap-2">
                        <Package className="w-4 h-4" />
                        Premio consegnato! Complimenti!
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {myRedemptions.length === 0 && (
            <div className="text-center py-12">
              <Trophy className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400 mb-2">
                Non hai ancora riscattato nessun premio
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mb-6">
                Completa le task per accumulare punti e riscattare premi fantastici!
              </p>
              <button
                onClick={() => setActiveTab('available')}
                className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Vedi Premi Disponibili
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EmployeeRewards;
