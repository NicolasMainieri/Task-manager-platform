import React, { useState, useEffect } from "react";
import axios from "axios";

interface CalendarConnection {
  id: string;
  provider: string;
  accountEmail: string;
  accountName: string | null;
  syncEnabled: boolean;
  lastSync: string | null;
  createdAt: string;
}

const OutlookCalendarConnect: React.FC = () => {
  const [connections, setConnections] = useState<CalendarConnection[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState<string | null>(null);

  useEffect(() => {
    fetchConnections();

    // Check for callback success
    const params = new URLSearchParams(window.location.search);
    if (params.get("outlook_calendar_connected") === "true") {
      fetchConnections();
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const fetchConnections = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get("http://localhost:4000/api/integrations/outlook/calendar/connections", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setConnections(response.data);
    } catch (error) {
      console.error("Error fetching Outlook Calendar connections:", error);
    }
  };

  const handleConnect = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get("http://localhost:4000/api/integrations/outlook/calendar/auth", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const authUrl = response.data.authUrl;
      const width = 600;
      const height = 700;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;

      const popup = window.open(
        authUrl,
        "Outlook Calendar Authorization",
        `width=${width},height=${height},left=${left},top=${top}`
      );

      // Poll for popup close and check for success
      const pollTimer = setInterval(() => {
        if (popup?.closed) {
          clearInterval(pollTimer);
          setLoading(false);
          setTimeout(fetchConnections, 1000);
        }
      }, 500);
    } catch (error) {
      console.error("Error connecting Outlook Calendar:", error);
      setLoading(false);
    }
  };

  const handleSync = async (connectionId: string) => {
    setSyncing(connectionId);
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `http://localhost:4000/api/integrations/outlook/calendar/${connectionId}/sync`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchConnections();
    } catch (error) {
      console.error("Error syncing Outlook Calendar:", error);
    } finally {
      setSyncing(null);
    }
  };

  const handleToggleSync = async (connectionId: string) => {
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `http://localhost:4000/api/integrations/outlook/calendar/${connectionId}/toggle`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchConnections();
    } catch (error) {
      console.error("Error toggling sync:", error);
    }
  };

  const handleDisconnect = async (connectionId: string) => {
    if (!confirm("Vuoi davvero disconnettere questo calendario?")) return;

    try {
      const token = localStorage.getItem("token");
      await axios.delete(`http://localhost:4000/api/integrations/outlook/calendar/${connectionId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchConnections();
    } catch (error) {
      console.error("Error disconnecting Outlook Calendar:", error);
    }
  };

  return (
    <div className="space-y-4">
      <button
        onClick={handleConnect}
        disabled={loading}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M23.5 12.3c0-.8-.1-1.5-.2-2.3H12v4.4h6.5c-.3 1.5-1.1 2.7-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.7z" />
          <path d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.2 0-5.9-2.1-6.9-5H1.2v3.1C3.2 21.3 7.3 24 12 24z" />
        </svg>
        {loading ? "Connessione..." : "Accedi con Outlook"}
      </button>

      {connections.length > 0 && (
        <div className="space-y-3">
          {connections.map((conn) => (
            <div
              key={conn.id}
              className="bg-slate-700/50 border border-blue-500/20 rounded-lg p-4 flex items-center justify-between"
            >
              <div>
                <div className="font-semibold text-white">{conn.accountEmail}</div>
                {conn.accountName && <div className="text-sm text-gray-400">{conn.accountName}</div>}
                {conn.lastSync && (
                  <div className="text-xs text-gray-500 mt-1">
                    Ultima sincronizzazione: {new Date(conn.lastSync).toLocaleString("it-IT")}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleSync(conn.id)}
                  disabled={syncing === conn.id}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors disabled:opacity-50"
                >
                  {syncing === conn.id ? "Sincronizzazione..." : "Sincronizza"}
                </button>
                <button
                  onClick={() => handleToggleSync(conn.id)}
                  className={`px-3 py-1 text-sm rounded transition-colors ${
                    conn.syncEnabled
                      ? "bg-green-600 hover:bg-green-700 text-white"
                      : "bg-gray-600 hover:bg-gray-700 text-white"
                  }`}
                >
                  {conn.syncEnabled ? "Attivo" : "Disattivo"}
                </button>
                <button
                  onClick={() => handleDisconnect(conn.id)}
                  className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors"
                >
                  Disconnetti
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default OutlookCalendarConnect;
