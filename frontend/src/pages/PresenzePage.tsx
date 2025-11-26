import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Clock,
  LogIn,
  LogOut,
  Calendar,
  Loader,
  TrendingUp,
  Users,
  ChevronRight,
  Play,
  Pause
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL;

interface Timbratura {
  id: string;
  userId: string;
  tipo: 'entrata' | 'uscita' | 'pausa_inizio' | 'pausa_fine';
  timestamp: string;
  note?: string;
  latitudine?: number;
  longitudine?: number;
  modalita?: string;
}

interface TimbraturaOggi {
  timbrature: Timbratura[];
  oreLavorateOggi: number;
  alLavoro: boolean;
  ultimaTimbratura: Timbratura | null;
}

const PresenzePage: React.FC = () => {
  const [oggi, setOggi] = useState<TimbraturaOggi | null>(null);
  const [loading, setLoading] = useState(true);
  const [timbrandoLoading, setTimbrandoLoading] = useState(false);

  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchOggi();
    const interval = setInterval(fetchOggi, 60000); // Aggiorna ogni minuto
    return () => clearInterval(interval);
  }, []);

  const fetchOggi = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/timbrature/oggi`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOggi(response.data);
    } catch (error) {
      console.error('Errore caricamento timbrature oggi:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTimbratura = async (tipo: 'entrata' | 'uscita') => {
    setTimbrandoLoading(true);
    try {
      await axios.post(`${API_URL}/api/timbrature`, {
        tipo,
        modalita: 'web'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchOggi();
      alert(`${tipo === 'entrata' ? 'Entrata' : 'Uscita'} registrata con successo!`);
    } catch (error: any) {
      alert(error.response?.data?.error || 'Errore nella timbratura');
    } finally {
      setTimbrandoLoading(false);
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
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Clock className="text-blue-600" />
          Gestione Presenze
        </h1>
        <p className="text-gray-600 mt-1">Sistema di timbrature e rilevazione presenze</p>
      </div>

      {/* Status Card */}
      <div className="bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl shadow-lg p-8 text-white mb-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-blue-100 text-sm uppercase tracking-wide mb-2">Stato Attuale</p>
            <div className="flex items-center gap-3">
              <div className={`w-4 h-4 rounded-full ${oggi?.alLavoro ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`}></div>
              <h2 className="text-3xl font-bold">
                {oggi?.alLavoro ? 'Al Lavoro' : 'Non al Lavoro'}
              </h2>
            </div>
          </div>
          <div className="text-right">
            <p className="text-blue-100 text-sm mb-1">Ore Oggi</p>
            <p className="text-5xl font-bold">{oggi?.oreLavorateOggi.toFixed(1)}</p>
            <p className="text-blue-100 text-sm">ore</p>
          </div>
        </div>

        {oggi?.ultimaTimbratura && (
          <div className="bg-white/10 backdrop-blur rounded-lg p-4">
            <p className="text-blue-100 text-xs uppercase mb-2">Ultima Timbratura</p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {oggi.ultimaTimbratura.tipo === 'entrata' ? (
                  <LogIn className="text-green-300" size={24} />
                ) : (
                  <LogOut className="text-red-300" size={24} />
                )}
                <div>
                  <p className="font-semibold capitalize">{oggi.ultimaTimbratura.tipo}</p>
                  <p className="text-blue-100 text-sm">
                    {new Date(oggi.ultimaTimbratura.timestamp).toLocaleTimeString('it-IT')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <button
          onClick={() => handleTimbratura('entrata')}
          disabled={timbrandoLoading || oggi?.alLavoro}
          className="bg-green-600 text-white px-8 py-6 rounded-xl hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-3 text-xl font-semibold transition-all shadow-lg hover:shadow-xl"
        >
          <LogIn size={28} />
          Timbra Entrata
        </button>

        <button
          onClick={() => handleTimbratura('uscita')}
          disabled={timbrandoLoading || !oggi?.alLavoro}
          className="bg-red-600 text-white px-8 py-6 rounded-xl hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-3 text-xl font-semibold transition-all shadow-lg hover:shadow-xl"
        >
          <LogOut size={28} />
          Timbra Uscita
        </button>
      </div>

      {/* Today Timeline */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Calendar size={20} />
          Timbrature di Oggi
        </h3>

        {oggi && oggi.timbrature.length > 0 ? (
          <div className="space-y-3">
            {oggi.timbrature.map((t, index) => (
              <div key={t.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  t.tipo === 'entrata' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                }`}>
                  {t.tipo === 'entrata' ? <LogIn size={24} /> : <LogOut size={24} />}
                </div>
                <div className="flex-1">
                  <p className="font-medium capitalize">{t.tipo}</p>
                  <p className="text-sm text-gray-600">
                    {new Date(t.timestamp).toLocaleTimeString('it-IT')}
                  </p>
                </div>
                {index < oggi.timbrature.length - 1 && oggi.timbrature[index + 1] && (
                  <div className="text-sm text-gray-600">
                    Durata: {(() => {
                      const next = oggi.timbrature[index + 1];
                      const diff = (new Date(next.timestamp).getTime() - new Date(t.timestamp).getTime()) / (1000 * 60 * 60);
                      return `${diff.toFixed(2)} ore`;
                    })()}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Clock className="mx-auto mb-4 text-gray-300" size={48} />
            <p>Nessuna timbratura per oggi</p>
          </div>
        )}
      </div>
      </div>
    </div>
  );
};

export default PresenzePage;
