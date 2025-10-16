import React, { useState, useEffect } from "react";
import axios from "axios";
import { X, Plus } from "lucide-react";

interface EmailAccount {
  id: string;
  provider: string;
  accountEmail: string;
  accountName: string | null;
  imapHost: string | null;
  imapPort: number | null;
  imapSecure: boolean;
  pop3Host: string | null;
  pop3Port: number | null;
  pop3Secure: boolean;
  smtpHost: string | null;
  smtpPort: number | null;
  smtpSecure: boolean;
  syncEnabled: boolean;
  lastSync: string | null;
  createdAt: string;
}

const ImapPop3Config: React.FC = () => {
  const [accounts, setAccounts] = useState<EmailAccount[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    accountEmail: "",
    accountName: "",
    password: "",
    provider: "imap",
    imapHost: "",
    imapPort: 993,
    imapSecure: true,
    pop3Host: "",
    pop3Port: 995,
    pop3Secure: true,
    smtpHost: "",
    smtpPort: 587,
    smtpSecure: true,
  });

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get("http://localhost:4000/api/integrations/email/imap-pop3", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAccounts(response.data);
    } catch (error) {
      console.error("Error fetching IMAP/POP3 accounts:", error);
    }
  };

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      await axios.post("http://localhost:4000/api/integrations/email/imap", formData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setShowAddForm(false);
      setFormData({
        accountEmail: "",
        accountName: "",
        password: "",
        provider: "imap",
        imapHost: "",
        imapPort: 993,
        imapSecure: true,
        pop3Host: "",
        pop3Port: 995,
        pop3Secure: true,
        smtpHost: "",
        smtpPort: 587,
        smtpSecure: true,
      });
      fetchAccounts();
    } catch (error: any) {
      console.error("Error adding account:", error);
      alert(error.response?.data?.error || "Errore nell'aggiunta dell'account");
    }
  };

  const handleSync = async (accountId: string) => {
    setSyncing(accountId);
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `http://localhost:4000/api/integrations/email/imap/${accountId}/sync`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchAccounts();
    } catch (error) {
      console.error("Error syncing emails:", error);
    } finally {
      setSyncing(null);
    }
  };

  const handleToggleSync = async (accountId: string) => {
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `http://localhost:4000/api/integrations/email/imap-pop3/${accountId}/toggle`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchAccounts();
    } catch (error) {
      console.error("Error toggling sync:", error);
    }
  };

  const handleDelete = async (accountId: string) => {
    if (!confirm("Vuoi davvero eliminare questo account?")) return;

    try {
      const token = localStorage.getItem("token");
      await axios.delete(`http://localhost:4000/api/integrations/email/imap-pop3/${accountId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchAccounts();
    } catch (error) {
      console.error("Error deleting account:", error);
    }
  };

  return (
    <div className="space-y-4">
      <button
        onClick={() => setShowAddForm(!showAddForm)}
        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
      >
        <Plus className="w-5 h-5" />
        Aggiungi Account IMAP/POP3
      </button>

      {showAddForm && (
        <div className="bg-slate-700/50 border border-indigo-500/20 rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-white">Configura Account Email</h3>
            <button onClick={() => setShowAddForm(false)} className="text-gray-400 hover:text-white">
              <X className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleAddAccount} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
              <input
                type="email"
                required
                value={formData.accountEmail}
                onChange={(e) => setFormData({ ...formData, accountEmail: e.target.value })}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Nome Account (opzionale)</label>
              <input
                type="text"
                value={formData.accountName}
                onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Password</label>
              <input
                type="password"
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Protocollo</label>
              <select
                value={formData.provider}
                onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="imap">IMAP</option>
                <option value="pop3">POP3</option>
              </select>
            </div>

            {formData.provider === "imap" && (
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-1">Host IMAP</label>
                  <input
                    type="text"
                    required
                    placeholder="imap.gmail.com"
                    value={formData.imapHost}
                    onChange={(e) => setFormData({ ...formData, imapHost: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Porta</label>
                  <input
                    type="number"
                    required
                    value={formData.imapPort}
                    onChange={(e) => setFormData({ ...formData, imapPort: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            )}

            {formData.provider === "pop3" && (
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-1">Host POP3</label>
                  <input
                    type="text"
                    required
                    placeholder="pop.gmail.com"
                    value={formData.pop3Host}
                    onChange={(e) => setFormData({ ...formData, pop3Host: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Porta</label>
                  <input
                    type="number"
                    required
                    value={formData.pop3Port}
                    onChange={(e) => setFormData({ ...formData, pop3Port: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-1">Host SMTP</label>
                <input
                  type="text"
                  placeholder="smtp.gmail.com"
                  value={formData.smtpHost}
                  onChange={(e) => setFormData({ ...formData, smtpHost: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Porta</label>
                <input
                  type="number"
                  value={formData.smtpPort}
                  onChange={(e) => setFormData({ ...formData, smtpPort: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
            >
              Aggiungi Account
            </button>
          </form>
        </div>
      )}

      {accounts.length > 0 && (
        <div className="space-y-3">
          {accounts.map((account) => (
            <div
              key={account.id}
              className="bg-slate-700/50 border border-indigo-500/20 rounded-lg p-4 flex items-center justify-between"
            >
              <div>
                <div className="font-semibold text-white">
                  {account.accountEmail}
                  <span className="ml-2 text-xs bg-indigo-600 px-2 py-1 rounded">
                    {account.provider.toUpperCase()}
                  </span>
                </div>
                {account.accountName && <div className="text-sm text-gray-400">{account.accountName}</div>}
                <div className="text-xs text-gray-500 mt-1">
                  {account.provider === "imap"
                    ? `IMAP: ${account.imapHost}:${account.imapPort}`
                    : `POP3: ${account.pop3Host}:${account.pop3Port}`}
                  {account.smtpHost && ` | SMTP: ${account.smtpHost}:${account.smtpPort}`}
                </div>
                {account.lastSync && (
                  <div className="text-xs text-gray-500">
                    Ultima sincronizzazione: {new Date(account.lastSync).toLocaleString("it-IT")}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                {account.provider === "imap" && (
                  <button
                    onClick={() => handleSync(account.id)}
                    disabled={syncing === account.id}
                    className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded transition-colors disabled:opacity-50"
                  >
                    {syncing === account.id ? "Sincronizzazione..." : "Sincronizza"}
                  </button>
                )}
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
                  onClick={() => handleDelete(account.id)}
                  className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors"
                >
                  Elimina
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ImapPop3Config;
