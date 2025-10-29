import { useState, useEffect } from 'react';
import axios from 'axios';
import { Package, Truck, MapPin, Phone, Home, User, Check } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL;

interface RewardRedemption {
  id: string;
  reward: {
    id: string;
    nome: string;
    descrizione: string;
    immagine: string;
    costoScore: number;
    costoMensile: number;
  };
  stato: string;
  metodoRitiro: string | null;
  indirizzoConsegna: string | null;
  cittaConsegna: string | null;
  capConsegna: string | null;
  telefonoConsegna: string | null;
  noteConsegna: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function MyRedeemedRewards() {
  const [redemptions, setRedemptions] = useState<RewardRedemption[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRedemption, setSelectedRedemption] = useState<RewardRedemption | null>(null);
  const [showPickupModal, setShowPickupModal] = useState(false);
  const [pickupMethod, setPickupMethod] = useState<'consegna_casa' | 'ritiro_persona' | null>(null);
  const [deliveryData, setDeliveryData] = useState({
    indirizzo: '',
    citta: '',
    cap: '',
    telefono: '',
    note: ''
  });

  const loadRedemptions = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/rewards/redemptions/approved`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRedemptions(response.data);
    } catch (error) {
      console.error('Errore nel caricamento dei premi riscattati:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRedemptions();
  }, []);

  const handleChoosePickup = async () => {
    if (!selectedRedemption || !pickupMethod) return;

    if (pickupMethod === 'consegna_casa') {
      if (!deliveryData.indirizzo || !deliveryData.citta || !deliveryData.cap || !deliveryData.telefono) {
        alert('Compila tutti i campi obbligatori per la consegna');
        return;
      }
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/rewards/redemptions/${selectedRedemption.id}/choose-pickup`,
        {
          metodoRitiro: pickupMethod,
          ...(pickupMethod === 'consegna_casa' && {
            indirizzoConsegna: deliveryData.indirizzo,
            cittaConsegna: deliveryData.citta,
            capConsegna: deliveryData.cap,
            telefonoConsegna: deliveryData.telefono,
            noteConsegna: deliveryData.note
          })
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      alert('Metodo di ritiro selezionato con successo!');
      setShowPickupModal(false);
      setSelectedRedemption(null);
      setPickupMethod(null);
      setDeliveryData({ indirizzo: '', citta: '', cap: '', telefono: '', note: '' });
      loadRedemptions();
    } catch (error: any) {
      alert('Errore: ' + (error.response?.data?.error || 'Errore nella selezione del metodo di ritiro'));
    }
  };

  const getStatusBadge = (stato: string) => {
    const badges: Record<string, { text: string; color: string }> = {
      approved: { text: 'Approvato - Scegli ritiro', color: 'bg-green-500' },
      awaiting_pickup: { text: 'In attesa di ritiro', color: 'bg-yellow-500' },
      delivered: { text: 'Consegnato', color: 'bg-blue-500' }
    };

    const badge = badges[stato] || { text: stato, color: 'bg-gray-500' };
    return <span className={`px-3 py-1 rounded-full text-xs font-semibold text-white ${badge.color}`}>{badge.text}</span>;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">I Miei Premi Riscattati</h2>
        <Package className="w-8 h-8 text-indigo-400" />
      </div>

      {redemptions.length === 0 ? (
        <div className="text-center py-12 bg-slate-800 rounded-lg">
          <Package className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400">Nessun premio riscattato approvato</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {redemptions.map(redemption => (
            <div key={redemption.id} className="bg-slate-800 rounded-lg p-6 border border-slate-700">
              <div className="flex gap-6">
                {/* Immagine premio */}
                <div className="flex-shrink-0">
                  {redemption.reward.immagine ? (
                    <img
                      src={redemption.reward.immagine}
                      alt={redemption.reward.nome}
                      className="w-32 h-32 object-cover rounded-lg"
                    />
                  ) : (
                    <div className="w-32 h-32 bg-slate-700 rounded-lg flex items-center justify-center">
                      <Package className="w-16 h-16 text-slate-500" />
                    </div>
                  )}
                </div>

                {/* Dettagli premio */}
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-white mb-2">{redemption.reward.nome}</h3>
                      <p className="text-slate-400 text-sm">{redemption.reward.descrizione}</p>
                    </div>
                    {getStatusBadge(redemption.stato)}
                  </div>

                  {/* Metodo di ritiro se selezionato */}
                  {redemption.metodoRitiro && (
                    <div className="mt-4 p-4 bg-slate-700/50 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        {redemption.metodoRitiro === 'consegna_casa' ? (
                          <>
                            <Truck className="w-5 h-5 text-indigo-400" />
                            <span className="font-semibold text-white">Consegna a domicilio</span>
                          </>
                        ) : (
                          <>
                            <Home className="w-5 h-5 text-indigo-400" />
                            <span className="font-semibold text-white">Ritiro di persona</span>
                          </>
                        )}
                      </div>

                      {redemption.metodoRitiro === 'consegna_casa' && (
                        <div className="text-sm text-slate-300 space-y-1 ml-7">
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4" />
                            <span>{redemption.indirizzoConsegna}, {redemption.cittaConsegna} {redemption.capConsegna}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4" />
                            <span>{redemption.telefonoConsegna}</span>
                          </div>
                          {redemption.noteConsegna && (
                            <div className="text-slate-400 italic">Note: {redemption.noteConsegna}</div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Pulsante per scegliere metodo di ritiro */}
                  {redemption.stato === 'approved' && !redemption.metodoRitiro && (
                    <button
                      onClick={() => {
                        setSelectedRedemption(redemption);
                        setShowPickupModal(true);
                      }}
                      className="mt-4 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors flex items-center gap-2"
                    >
                      <Truck className="w-5 h-5" />
                      Scegli Metodo di Ritiro
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal scelta metodo ritiro */}
      {showPickupModal && selectedRedemption && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-bold text-white mb-6">Scegli Metodo di Ritiro</h3>

            <div className="space-y-4 mb-6">
              {/* Opzione Consegna a Casa */}
              <div
                onClick={() => setPickupMethod('consegna_casa')}
                className={`p-6 rounded-lg border-2 cursor-pointer transition-all ${
                  pickupMethod === 'consegna_casa'
                    ? 'border-indigo-500 bg-indigo-500/10'
                    : 'border-slate-700 hover:border-slate-600'
                }`}
              >
                <div className="flex items-center gap-4">
                  <Truck className="w-8 h-8 text-indigo-400" />
                  <div className="flex-1">
                    <h4 className="text-lg font-semibold text-white">Consegna a Domicilio</h4>
                    <p className="text-sm text-slate-400">Il premio verrà consegnato al tuo indirizzo</p>
                  </div>
                  {pickupMethod === 'consegna_casa' && <Check className="w-6 h-6 text-indigo-400" />}
                </div>
              </div>

              {/* Opzione Ritiro di Persona */}
              <div
                onClick={() => setPickupMethod('ritiro_persona')}
                className={`p-6 rounded-lg border-2 cursor-pointer transition-all ${
                  pickupMethod === 'ritiro_persona'
                    ? 'border-indigo-500 bg-indigo-500/10'
                    : 'border-slate-700 hover:border-slate-600'
                }`}
              >
                <div className="flex items-center gap-4">
                  <Home className="w-8 h-8 text-indigo-400" />
                  <div className="flex-1">
                    <h4 className="text-lg font-semibold text-white">Ritiro di Persona</h4>
                    <p className="text-sm text-slate-400">Ritirerai il premio direttamente in sede</p>
                  </div>
                  {pickupMethod === 'ritiro_persona' && <Check className="w-6 h-6 text-indigo-400" />}
                </div>
              </div>
            </div>

            {/* Form dati consegna */}
            {pickupMethod === 'consegna_casa' && (
              <div className="space-y-4 mb-6 p-4 bg-slate-700/30 rounded-lg">
                <h4 className="font-semibold text-white mb-3">Dati per la Consegna</h4>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Indirizzo *</label>
                  <input
                    type="text"
                    value={deliveryData.indirizzo}
                    onChange={(e) => setDeliveryData({ ...deliveryData, indirizzo: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                    placeholder="Via, Piazza, numero civico"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Città *</label>
                    <input
                      type="text"
                      value={deliveryData.citta}
                      onChange={(e) => setDeliveryData({ ...deliveryData, citta: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">CAP *</label>
                    <input
                      type="text"
                      value={deliveryData.cap}
                      onChange={(e) => setDeliveryData({ ...deliveryData, cap: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Telefono *</label>
                  <input
                    type="tel"
                    value={deliveryData.telefono}
                    onChange={(e) => setDeliveryData({ ...deliveryData, telefono: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Note (opzionale)</label>
                  <textarea
                    value={deliveryData.note}
                    onChange={(e) => setDeliveryData({ ...deliveryData, note: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                    rows={3}
                    placeholder="Eventuali istruzioni per la consegna"
                  />
                </div>
              </div>
            )}

            {/* Bottoni */}
            <div className="flex gap-4">
              <button
                onClick={() => {
                  setShowPickupModal(false);
                  setSelectedRedemption(null);
                  setPickupMethod(null);
                  setDeliveryData({ indirizzo: '', citta: '', cap: '', telefono: '', note: '' });
                }}
                className="flex-1 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={handleChoosePickup}
                disabled={!pickupMethod}
                className="flex-1 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Conferma
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
