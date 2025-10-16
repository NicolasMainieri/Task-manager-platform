import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

const UserManagement = () => {
  const { token } = useAuth();
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editingRole, setEditingRole] = useState(null);
  const [viewMode, setViewMode] = useState('byRole'); // 'byRole' o 'list'
  
  const [formData, setFormData] = useState({
    nome: '',
    cognome: '',
    email: '',
    password: '',
    roleId: '',
    teamId: ''
  });

  const [roleFormData, setRoleFormData] = useState({
    nome: '',
    descrizione: '',
    colore: '#6366f1',
    icona: 'User'
  });

  // Carica utenti, ruoli e team
  useEffect(() => {
    fetchData();
  }, [token]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch users
      const usersRes = await fetch('http://localhost:4000/api/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const usersData = await usersRes.json();
      setUsers(usersData);

      // Fetch roles
      const rolesRes = await fetch('http://localhost:4000/api/roles', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const rolesData = await rolesRes.json();
      setRoles(rolesData);

      // Fetch teams
      const teamsRes = await fetch('http://localhost:4000/api/teams', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const teamsData = await teamsRes.json();
      setTeams(teamsData);

    } catch (error) {
      console.error('Errore nel caricamento:', error);
      alert('Errore nel caricamento dei dati');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const url = editingUser 
        ? `http://localhost:4000/api/users/${editingUser.id}`
        : 'http://localhost:4000/api/users';
      
      const method = editingUser ? 'PUT' : 'POST';
      
      // Prepara i dati, gestendo campi vuoti
      const dataToSend = {
        nome: formData.nome,
        cognome: formData.cognome,
        email: formData.email,
        // Invia password solo se presente e non è un update senza cambio password
        ...(formData.password && { password: formData.password }),
        // Invia roleId solo se selezionato
        ...(formData.roleId && { roleId: formData.roleId }),
        // Invia teamId solo se selezionato
        ...(formData.teamId && { teamId: formData.teamId })
      };

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(dataToSend)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Errore nella richiesta');
      }

      alert(editingUser ? 'Dipendente aggiornato!' : 'Dipendente creato!');
      setShowModal(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Errore:', error);
      alert(error.message);
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({
      nome: user.nome,
      cognome: user.cognome,
      email: user.email,
      password: '', // Non mostrare la password
      roleId: user.role?.id || '',
      teamId: user.team?.id || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (userId) => {
    if (!confirm('Sei sicuro di voler eliminare questo dipendente?')) return;

    try {
      const response = await fetch(`http://localhost:4000/api/users/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Errore nell\'eliminazione');

      alert('Dipendente eliminato!');
      fetchData();
    } catch (error) {
      console.error('Errore:', error);
      alert('Errore nell\'eliminazione del dipendente');
    }
  };

  const resetForm = () => {
    setFormData({
      nome: '',
      cognome: '',
      email: '',
      password: '',
      roleId: '',
      teamId: ''
    });
    setEditingUser(null);
  };

  const closeModal = () => {
    setShowModal(false);
    resetForm();
  };

  const handleRoleSubmit = async (e) => {
    e.preventDefault();

    try {
      const url = editingRole
        ? `http://localhost:4000/api/roles/${editingRole.id}`
        : 'http://localhost:4000/api/roles';

      const method = editingRole ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(roleFormData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Errore nella richiesta');
      }

      alert(editingRole ? 'Ruolo aggiornato!' : 'Ruolo creato!');
      setShowRoleModal(false);
      resetRoleForm();
      fetchData();
    } catch (error) {
      console.error('Errore:', error);
      alert(error.message);
    }
  };

  const handleEditRole = (role) => {
    setEditingRole(role);
    setRoleFormData({
      nome: role.nome,
      descrizione: role.descrizione || '',
      colore: role.colore || '#6366f1',
      icona: role.icona || 'User'
    });
    setShowRoleModal(true);
  };

  const handleDeleteRole = async (roleId) => {
    if (!confirm('Sei sicuro di voler eliminare questo ruolo?')) return;

    try {
      const response = await fetch(`http://localhost:4000/api/roles/${roleId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Errore nell\'eliminazione');
      }

      alert('Ruolo eliminato!');
      fetchData();
    } catch (error) {
      console.error('Errore:', error);
      alert(error.message);
    }
  };

  const resetRoleForm = () => {
    setRoleFormData({
      nome: '',
      descrizione: '',
      colore: '#6366f1',
      icona: 'User'
    });
    setEditingRole(null);
  };

  const closeRoleModal = () => {
    setShowRoleModal(false);
    resetRoleForm();
  };

  // Raggruppa utenti per ruolo
  const usersByRole = users.reduce((acc, user) => {
    const roleName = user.role?.nome || 'Senza Ruolo';
    if (!acc[roleName]) {
      acc[roleName] = {
        role: user.role,
        users: []
      };
    }
    acc[roleName].users.push(user);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        <p className="mt-4 text-gray-600">Caricamento...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-white">Gestione Dipendenti</h2>
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => setViewMode('byRole')}
              className={`px-4 py-2 text-sm rounded-xl transition-all ${
                viewMode === 'byRole'
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-medium shadow-lg'
                  : 'bg-slate-800/50 text-gray-400 hover:bg-slate-700/50 border border-indigo-500/20'
              }`}
            >
              Per Ruolo
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-4 py-2 text-sm rounded-xl transition-all ${
                viewMode === 'list'
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-medium shadow-lg'
                  : 'bg-slate-800/50 text-gray-400 hover:bg-slate-700/50 border border-indigo-500/20'
              }`}
            >
              Lista Completa
            </button>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowRoleModal(true)}
            className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:shadow-lg transition-all font-medium"
          >
            + Crea Ruolo
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl hover:shadow-lg transition-all font-medium"
          >
            + Crea Dipendente
          </button>
        </div>
      </div>

      {/* Vista per ruolo */}
      {viewMode === 'byRole' && (
        <div className="space-y-4">
          {Object.entries(usersByRole).map(([roleName, { role, users: roleUsers }]) => (
            <div key={roleName} className="bg-slate-800/50 backdrop-blur-sm border border-indigo-500/20 rounded-2xl overflow-hidden">
              <div
                className="px-6 py-4 flex items-center justify-between"
                style={{
                  backgroundColor: role?.colore ? `${role.colore}20` : 'rgba(99, 102, 241, 0.1)',
                  borderLeft: `4px solid ${role?.colore || '#6366f1'}`
                }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold shadow-lg"
                    style={{ backgroundColor: role?.colore || '#6366f1' }}
                  >
                    {role?.icona?.charAt(0) || 'R'}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">{roleName}</h3>
                    <p className="text-sm text-gray-400">{roleUsers.length} dipendenti</p>
                  </div>
                </div>
                {role && !role.isSystem && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditRole(role)}
                      className="px-3 py-1 text-sm text-purple-400 hover:bg-purple-500/20 rounded-lg transition-colors border border-purple-500/30"
                    >
                      Modifica Ruolo
                    </button>
                    <button
                      onClick={() => handleDeleteRole(role.id)}
                      className="px-3 py-1 text-sm text-red-400 hover:bg-red-500/20 rounded-lg transition-colors border border-red-500/30"
                    >
                      Elimina Ruolo
                    </button>
                  </div>
                )}
              </div>
              <div className="divide-y divide-indigo-500/10">
                {roleUsers.map((user) => (
                  <div key={user.id} className="px-6 py-4 hover:bg-slate-700/30 flex items-center justify-between transition-all">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-lg">
                        {user.nome.charAt(0)}{user.cognome.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-white">{user.nome} {user.cognome}</div>
                        <div className="text-sm text-gray-400">{user.email}</div>
                      </div>
                      <div className="text-sm text-gray-400 px-3 py-1 bg-slate-700/50 rounded-lg">
                        {user.team?.nome || 'Nessun team'}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(user)}
                        className="px-3 py-1 text-sm text-indigo-400 hover:bg-indigo-500/20 rounded-lg transition-colors"
                      >
                        Modifica
                      </button>
                      <button
                        onClick={() => handleDelete(user.id)}
                        className="px-3 py-1 text-sm text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                      >
                        Elimina
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {users.length === 0 && (
            <div className="bg-slate-800/50 backdrop-blur-sm border border-indigo-500/20 rounded-2xl p-12 text-center">
              <p className="text-gray-400">Nessun dipendente trovato. Creane uno!</p>
            </div>
          )}
        </div>
      )}

      {/* Vista lista completa */}
      {viewMode === 'list' && (
        <div className="bg-slate-800/50 backdrop-blur-sm border border-indigo-500/20 rounded-2xl overflow-hidden">
          <table className="min-w-full divide-y divide-indigo-500/20">
            <thead className="bg-slate-900/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Nome</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Ruolo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Team</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-indigo-500/10">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-slate-700/30 transition-all">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-white">{user.nome} {user.cognome}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-400">{user.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-3 py-1 text-xs font-medium bg-indigo-500/20 text-indigo-400 rounded-full border border-indigo-500/30">
                      {user.role?.nome || 'N/A'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-400">
                    {user.team?.nome || 'Nessun team'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() => handleEdit(user)}
                      className="text-indigo-400 hover:text-indigo-300 mr-4 font-medium"
                    >
                      Modifica
                    </button>
                    <button
                      onClick={() => handleDelete(user.id)}
                      className="text-red-400 hover:text-red-300 font-medium"
                    >
                      Elimina
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {users.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              Nessun dipendente trovato. Creane uno!
            </div>
          )}
        </div>
      )}

      {/* Modal per creare/modificare dipendente */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-800">
                {editingUser ? 'Modifica Dipendente' : 'Nuovo Dipendente'}
              </h3>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome *
                </label>
                <input
                  type="text"
                  required
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cognome *
                </label>
                <input
                  type="text"
                  required
                  value={formData.cognome}
                  onChange={(e) => setFormData({ ...formData, cognome: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  E-mail *
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password {editingUser ? '(lascia vuoto per non modificare)' : '*'}
                </label>
                <input
                  type="password"
                  required={!editingUser}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ruolo *
                </label>
                <select
                  required
                  value={formData.roleId}
                  onChange={(e) => setFormData({ ...formData, roleId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="">Seleziona un ruolo</option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Squadra
                </label>
                <select
                  value={formData.teamId}
                  onChange={(e) => setFormData({ ...formData, teamId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="">Nessun team</option>
                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
                >
                  {editingUser ? 'Aggiorna' : 'Crea'} Dipendente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal per creare/modificare ruolo */}
      {showRoleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-800">
                {editingRole ? 'Modifica Ruolo' : 'Nuovo Ruolo'}
              </h3>
              <button
                onClick={closeRoleModal}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleRoleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome Ruolo *
                </label>
                <input
                  type="text"
                  required
                  value={roleFormData.nome}
                  onChange={(e) => setRoleFormData({ ...roleFormData, nome: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="es. Programmatore, Designer, Marketing"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descrizione
                </label>
                <textarea
                  value={roleFormData.descrizione}
                  onChange={(e) => setRoleFormData({ ...roleFormData, descrizione: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  rows="3"
                  placeholder="Descrivi le responsabilità di questo ruolo"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Colore
                  </label>
                  <input
                    type="color"
                    value={roleFormData.colore}
                    onChange={(e) => setRoleFormData({ ...roleFormData, colore: e.target.value })}
                    className="w-full h-10 border border-gray-300 rounded-lg cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Icona
                  </label>
                  <select
                    value={roleFormData.icona}
                    onChange={(e) => setRoleFormData({ ...roleFormData, icona: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="User">👤 User</option>
                    <option value="Code">💻 Code</option>
                    <option value="Palette">🎨 Design</option>
                    <option value="Megaphone">📢 Marketing</option>
                    <option value="Users">👥 HR</option>
                    <option value="Headphones">🎧 Support</option>
                    <option value="BarChart">📊 Analytics</option>
                    <option value="Settings">⚙️ Settings</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeRoleModal}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium"
                >
                  {editingRole ? 'Aggiorna' : 'Crea'} Ruolo
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