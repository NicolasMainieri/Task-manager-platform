import React, { useState, useEffect } from "react";
import axios from "axios";

interface EmailAccount {
  id: string;
  provider: string;
  accountEmail: string;
  accountName: string | null;
  syncEnabled: boolean;
  lastSync: string | null;
  createdAt: string;
}

const OutlookEmailConnect: React.FC = () => {
  const [accounts, setAccounts] = useState<EmailAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState<string | null>(null);

  useEffect(() => {
    fetchAccounts();

    // Check for callback success
    const params = new URLSearchParams(window.location.search);
    if (params.get("outlook_email_connected") === "true") {
      fetchAccounts();
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const fetchAccounts = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get("http://localhost:4000/api/integrations/outlook/email/accounts", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAccounts(response.data);
    } catch (error) {
      console.error("Error fetching Outlook Email accounts:", error);
    }
  };

  const handleConnect = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get("http://localhost:4000/api/integrations/outlook/email/auth", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const authUrl = response.data.authUrl;
      const width = 600;
      const height = 700;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;

      const popup = window.open(
        authUrl,
        "Outlook Email Authorization",
        `width=${width},height=${height},left=${left},top=${top}`
      );

      // Poll for popup close and check for success
      const pollTimer = setInterval(() => {
        if (popup?.closed) {
          clearInterval(pollTimer);
          setLoading(false);
          setTimeout(fetchAccounts, 1000);
        }
      }, 500);
    } catch (error) {
      console.error("Error connecting Outlook Email:", error);
      setLoading(false);
    }
  };

  const handleSync = async (accountId: string) => {
    setSyncing(accountId);
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `http://localhost:4000/api/integrations/outlook/email/${accountId}/sync`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchAccounts();
    } catch (error) {
      console.error("Error syncing Outlook Email:", error);
    } finally {
      setSyncing(null);
    }
  };

  const handleToggleSync = async (accountId: string) => {
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `http://localhost:4000/api/integrations/outlook/email/${accountId}/toggle`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchAccounts();
    } catch (error) {
      console.error("Error toggling sync:", error);
    }
  };

  const handleDisconnect = async (accountId: string) => {
    if (!confirm("Vuoi davvero disconnettere questo account?")) return;

    try {
      const token = localStorage.getItem("token");
      await axios.delete(`http://localhost:4000/api/integrations/outlook/email/${accountId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchAccounts();
    } catch (error) {
      console.error("Error disconnecting Outlook Email:", error);
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
          <path d="M7 6v12h14V6H7zM5 4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2H5z" />
          <path d="M3 8l9 5 9-5" />
        </svg>
        {loading ? "Connessione..." : "Accedi con Outlook"}
      </button>

      {accounts.length > 0 && (
        <div className="space-y-3">
          {accounts.map((account) => (
            <div
              key={account.id}
              className="bg-slate-700/50 border border-blue-500/20 rounded-lg p-4 flex items-center justify-between"
            >
              <div>
                <div className="font-semibold text-white">{account.accountEmail}</div>
                {account.accountName && <div className="text-sm text-gray-400">{account.accountName}</div>}
                {account.lastSync && (
                  <div className="text-xs text-gray-500 mt-1">
                    Ultima sincronizzazione: {new Date(account.lastSync).toLocaleString("it-IT")}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleSync(account.id)}
                  disabled={syncing === account.id}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors disabled:opacity-50"
                >
                  {syncing === account.id ? "Sincronizzazione..." : "Sincronizza"}
                </button>
                <button
                  onClick={() => handleToggleSync(account.id)}
                  className={`px-3 py-1 text-sm rounded transition-colors ${
                    account.syncEnabled
                      ? "bg-green-600 hover:bg-green-700 text-white"
                      : "bg-gray-600 hover:bg-gray-700 text-white"
                  }`}
                >
                  {account.syncEnabled ? "Attivo" : "Disattivo"}
                </button>
                <button
                  onClick={() => handleDisconnect(account.id)}
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

export default OutlookEmailConnect;
