import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

const UserManagement = () => {
  const { token, user } = useAuth();
  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [formData, setFormData] = useState({
    nome: '',
    cognome: '',
    email: '',
    password: '',
    ruolo: 'user',
    team_id: ''
  });
  const [filters, setFilters] = useState({
    search: '',
    ruolo: '',
    team: ''
  });

  useEffect(() => {
    fetchUsers();
    fetchTeams();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch('http://localhost:4000/api/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error('❌ Errore caricamento utenti:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeams = async () => {
    try {
      const response = await fetch('http://localhost:4000/api/teams', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setTeams(data);
      }
    } catch (error) {
      console.error('❌ Errore caricamento team:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const url = selectedUser
        ? `http://localhost:4000/api/users/${selectedUser.id}`
        : 'http://localhost:4000/api/auth/register';

      const body = { ...formData };
      if (selectedUser && !body.password) {
        delete body.password;
      }

      const response = await fetch(url, {
        method: selectedUser ? 'PUT' : 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      if (response.ok) {
        fetchUsers();
        setShowModal(false);
        setSelectedUser(null);
        setFormData({
          nome: '',
          cognome: '',
          email: '',
          password: '',
          ruolo: 'user',
          team_id: ''
        });
      }
    } catch (error) {
      console.error('❌ Errore salvataggio utente:', error);
    }
  };

  const handleEdit = (usr) => {
    setSelectedUser(usr);
    setFormData({
      nome: usr.nome,
      cognome: usr.cognome,
      email: usr.email,
      password: '',
      ruolo: usr.ruolo,
      team_id: usr.team_id || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (userId) => {
    if (!window.confirm('Sei sicuro di voler eliminare questo utente?')) return;

    try {
      const response = await fetch(`http://localhost:4000/api/users/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        fetchUsers();
      }
    } catch (error) {
      console.error('❌ Errore eliminazione utente:', error);
    }
  };

  const filteredUsers = users.filter(usr => {
    if (filters.search && !`${usr.nome} ${usr.cognome} ${usr.email}`.toLowerCase().includes(filters.search.toLowerCase())) {
      return false;
    }
    if (filters.ruolo && usr.ruolo !== filters.ruolo) return false;
    if (filters.team && usr.team_id !== filters.team) return false;
    return true;
  });

  const getTeamName = (teamId) => {
    const team = teams.find(t => t.id === teamId);
    return team ? team.nome : '-';
  };

  const getTeamColor = (teamId) => {
    const team = teams.find(t => t.id === teamId);
    return team?.colore || '#6366f1';
  };

  const ruoloLabels = {
    admin: 'Admin',
    manager: 'Manager',
    user: 'Utente'
  };

  const ruoloColors = {
    admin: 'bg-red-100 text-red-800',
    manager: 'bg-purple-100 text-purple-800',
    user: 'bg-blue-100 text-blue-800'
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
      {/* Header con filtri */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">👤 Gestione Dipendenti</h2>
            <p className="text-gray-600 mt-1">{users.length} dipendenti totali</p>
          </div>
          <button
            onClick={() => {
              setSelectedUser(null);
              setFormData({
                nome: '',
                cognome: '',
                email: '',
                password: '',
                ruolo: 'user',
                team_id: ''
              });
              setShowModal(true);
            }}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
          >
            ➕ Nuovo Dipendente
          </button>
        </div>

        {/* Filtri */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input
            type="text"
            placeholder="🔍 Cerca per nome o email..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />

          <select
            value={filters.ruolo}
            onChange={(e) => setFilters({ ...filters, ruolo: e.target.value })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            <option value="">Tutti i ruoli</option>
            <option value="admin">Admin</option>
            <option value="manager">Manager</option>
            <option value="user">Utente</option>
          </select>

          <select
            value={filters.team}
            onChange={(e) => setFilters({ ...filters, team: e.target.value })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            <option value="">Tutti i team</option>
            {teams.map(team => (
              <option key={team.id} value={team.id}>{team.nome}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabella Utenti */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Dipendente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ruolo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Team
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Azioni
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.map(usr => (
                <tr key={usr.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div 
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold"
                        style={{ backgroundColor: getTeamColor(usr.team_id) }}
                      >
                        {usr.nome[0]}{usr.cognome[0]}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {usr.nome} {usr.cognome}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {usr.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${ruoloColors[usr.ruolo]}`}>
                      {ruoloLabels[usr.ruolo]}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {getTeamName(usr.team_id)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleEdit(usr)}
                      className="text-blue-600 hover:text-blue-900 mr-4"
                    >
                      ✏️
                    </button>
                    {usr.id !== user.id && (
                      <button
                        onClick={() => handleDelete(usr.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        🗑️
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {filteredUsers.length === 0 && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="text-6xl mb-4">👤</div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">Nessun dipendente trovato</h3>
          <p className="text-gray-500">Modifica i filtri o aggiungi un nuovo dipendente</p>
        </div>
      )}

      {/* Modal Crea/Modifica Utente */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="bg-indigo-600 text-white px-6 py-4 rounded-t-xl flex justify-between items-center">
              <h2 className="text-xl font-bold">
                {selectedUser ? '✏️ Modifica Dipendente' : '➕ Nuovo Dipendente'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-white hover:text-gray-200 text-2xl"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nome *
                  </label>
                  <input
                    type="text"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cognome *
                  </label>
                  <input
                    type="text"
                    value={formData.cognome}
                    onChange={(e) => setFormData({ ...formData, cognome: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password {selectedUser ? '(lascia vuoto per non cambiare)' : '*'}
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required={!selectedUser}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ruolo *
                  </label>
                  <select
                    value={formData.ruolo}
                    onChange={(e) => setFormData({ ...formData, ruolo: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="user">Utente</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Team
                  </label>
                  <select
                    value={formData.team_id}
                    onChange={(e) => setFormData({ ...formData, team_id: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="">Nessun team</option>
                    {teams.map(team => (
                      <option key={team.id} value={team.id}>{team.nome}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
                >
                  {selectedUser ? '💾 Salva' : '✓ Crea Dipendente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;