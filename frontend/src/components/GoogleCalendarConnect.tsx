import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Calendar, Check, X, RefreshCw, Trash2, Power } from 'lucide-react';

interface CalendarConnection {
  id: string;
  provider: string;
  accountEmail: string;
  accountName?: string;
  syncEnabled: boolean;
  lastSync?: string;
  createdAt: string;
}

const GoogleCalendarConnect = () => {
  const { token } = useAuth();
  const [connections, setConnections] = useState<CalendarConnection[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState<string | null>(null);

  useEffect(() => {
    fetchConnections();
  }, []);

  const fetchConnections = async () => {
    try {
      const response = await fetch('http://localhost:4000/api/integrations/google/calendar/connections', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setConnections(data);
      }
    } catch (error) {
      console.error('Error fetching connections:', error);
    }
  };

  const handleConnect = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:4000/api/integrations/google/calendar/auth', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();

      // Open OAuth popup
      const width = 600;
      const height = 700;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;

      const popup = window.open(
        data.authUrl,
        'Google Calendar Authorization',
        `width=${width},height=${height},left=${left},top=${top}`
      );

      // Listen for postMessage from popup
      const handleMessage = (event: MessageEvent) => {
        // Verifica origine per sicurezza
        if (event.origin !== window.location.origin) return;

        if (event.data.type === 'oauth-callback' && event.data.provider === 'google' && event.data.integrationType === 'calendar') {
          window.removeEventListener('message', handleMessage);

          if (event.data.success) {
            fetchConnections();
          }

          setLoading(false);
        }
      };

      window.addEventListener('message', handleMessage);

      // Cleanup dopo 5 minuti
      setTimeout(() => {
        window.removeEventListener('message', handleMessage);
        setLoading(false);
      }, 300000);

    } catch (error) {
      console.error('Error connecting calendar:', error);
      setLoading(false);
    }
  };

  const handleSync = async (connectionId: string) => {
    setSyncing(connectionId);
    try {
      const response = await fetch(`http://localhost:4000/api/integrations/google/calendar/${connectionId}/sync`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        await fetchConnections();
      }
    } catch (error) {
      console.error('Error syncing calendar:', error);
    } finally {
      setSyncing(null);
    }
  };

  const handleToggleSync = async (connectionId: string, syncEnabled: boolean) => {
    try {
      await fetch(`http://localhost:4000/api/integrations/google/calendar/${connectionId}/toggle`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ syncEnabled: !syncEnabled })
      });
      await fetchConnections();
    } catch (error) {
      console.error('Error toggling sync:', error);
    }
  };

  const handleDisconnect = async (connectionId: string) => {
    if (!confirm('Sei sicuro di voler scollegare questo calendario?')) return;

    try {
      await fetch(`http://localhost:4000/api/integrations/google/calendar/${connectionId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      await fetchConnections();
    } catch (error) {
      console.error('Error disconnecting calendar:', error);
    }
  };

  return (
    <div className="space-y-4">
      {/* Connect Button */}
      {connections.length === 0 && (
        <div className="bg-slate-800/50 backdrop-blur-sm border border-indigo-500/20 rounded-xl p-6 text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Calendar className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Collega Google Calendar</h3>
          <p className="text-gray-400 mb-4">
            Sincronizza i tuoi eventi Google Calendar con la piattaforma
          </p>
          <button
            onClick={handleConnect}
            disabled={loading}
            className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-6 py-3 rounded-lg font-semibold flex items-center gap-2 mx-auto transition disabled:opacity-50"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {loading ? 'Connessione...' : 'Accedi con Google'}
          </button>
        </div>
      )}

      {/* Connected Calendars */}
      {connections.map((connection) => (
        <div key={connection.id} className="bg-slate-800/50 backdrop-blur-sm border border-indigo-500/20 rounded-xl p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <div>
                <h4 className="text-white font-bold">{connection.accountName || connection.accountEmail}</h4>
                <p className="text-gray-400 text-sm">{connection.accountEmail}</p>
                {connection.lastSync && (
                  <p className="text-gray-500 text-xs mt-1">
                    Ultima sincronizzazione: {new Date(connection.lastSync).toLocaleString('it-IT')}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                connection.syncEnabled
                  ? 'bg-green-500/20 text-green-400'
                  : 'bg-gray-500/20 text-gray-400'
              }`}>
                {connection.syncEnabled ? 'Attivo' : 'Disattivato'}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={() => handleSync(connection.id)}
              disabled={syncing === connection.id}
              className="flex-1 flex items-center justify-center gap-2 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400 px-4 py-2 rounded-lg transition disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${syncing === connection.id ? 'animate-spin' : ''}`} />
              {syncing === connection.id ? 'Sincronizzazione...' : 'Sincronizza Ora'}
            </button>
            <button
              onClick={() => handleToggleSync(connection.id, connection.syncEnabled)}
              className="flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg transition"
              title={connection.syncEnabled ? 'Disattiva sincronizzazione' : 'Attiva sincronizzazione'}
            >
              <Power className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleDisconnect(connection.id)}
              className="flex items-center justify-center gap-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 px-4 py-2 rounded-lg transition"
              title="Scollega calendario"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}

      {/* Add Another */}
      {connections.length > 0 && (
        <button
          onClick={handleConnect}
          disabled={loading}
          className="w-full bg-slate-800/30 hover:bg-slate-800/50 border border-indigo-500/20 hover:border-indigo-500/40 text-indigo-400 px-6 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition disabled:opacity-50"
        >
          <Calendar className="w-5 h-5" />
          Aggiungi Altro Calendario Google
        </button>
      )}
    </div>
  );
};

export default GoogleCalendarConnect;
