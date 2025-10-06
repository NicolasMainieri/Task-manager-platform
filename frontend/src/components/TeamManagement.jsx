import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

const TeamManagement = () => {
  const { token, user } = useAuth();
  const [teams, setTeams] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [formData, setFormData] = useState({
    nome: '',
    descrizione: '',
    colore: '#6366f1'
  });

  useEffect(() => {
    fetchTeams();
    fetchUsers();
  }, []);

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
    } finally {
      setLoading(false);
    }
  };

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
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const url = selectedTeam 
        ? `http://localhost:4000/api/teams/${selectedTeam.id}`
        : 'http://localhost:4000/api/teams';
      
      const response = await fetch(url, {
        method: selectedTeam ? 'PUT' : 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        fetchTeams();
        setShowModal(false);
        setSelectedTeam(null);
        setFormData({ nome: '', descrizione: '', colore: '#6366f1' });
      }
    } catch (error) {
      console.error('❌ Errore salvataggio team:', error);
    }
  };

  const handleEdit = (team) => {
    setSelectedTeam(team);
    setFormData({
      nome: team.nome,
      descrizione: team.descrizione || '',
      colore: team.colore || '#6366f1'
    });
    setShowModal(true);
  };

  const handleDelete = async (teamId) => {
    if (!window.confirm('Sei sicuro di voler eliminare questo team?')) return;

    try {
      const response = await fetch(`http://localhost:4000/api/teams/${teamId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        fetchTeams();
      }
    } catch (error) {
      console.error('❌ Errore eliminazione team:', error);
    }
  };

  const getTeamMembers = (teamId) => {
    return users.filter(u => u.team_id === teamId);
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
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">👥 Gestione Team</h2>
            <p className="text-gray-600 mt-1">Organizza i tuoi dipendenti in team</p>
          </div>
          <button
            onClick={() => {
              setSelectedTeam(null);
              setFormData({ nome: '', descrizione: '', colore: '#6366f1' });
              setShowModal(true);
            }}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
          >
            ➕ Nuovo Team
          </button>
        </div>
      </div>

      {/* Teams Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {teams.map(team => {
          const members = getTeamMembers(team.id);
          return (
            <div
              key={team.id}
              className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow"
              style={{ borderTop: `4px solid ${team.colore || '#6366f1'}` }}
            >
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-800 mb-1">
                      {team.nome}
                    </h3>
                    {team.descrizione && (
                      <p className="text-sm text-gray-600">{team.descrizione}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(team)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDelete(team.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                {/* Members */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm font-medium text-gray-700">
                    <span>Membri</span>
                    <span className="bg-gray-100 px-2 py-1 rounded-full text-xs">
                      {members.length}
                    </span>
                  </div>
                  
                  {members.length > 0 ? (
                    <div className="space-y-1">
                      {members.slice(0, 3).map(member => (
                        <div key={member.id} className="flex items-center gap-2 text-sm">
                          <div 
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-xs"
                            style={{ backgroundColor: team.colore || '#6366f1' }}
                          >
                            {member.nome[0]}{member.cognome[0]}
                          </div>
                          <span className="text-gray-700">
                            {member.nome} {member.cognome}
                          </span>
                        </div>
                      ))}
                      {members.length > 3 && (
                        <p className="text-xs text-gray-500 pl-10">
                          +{members.length - 3} altri membri
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 italic">Nessun membro</p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {teams.length === 0 && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="text-6xl mb-4">👥</div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">Nessun team creato</h3>
          <p className="text-gray-500">Crea il tuo primo team per iniziare!</p>
        </div>
      )}

      {/* Modal Crea/Modifica Team */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="bg-indigo-600 text-white px-6 py-4 rounded-t-xl flex justify-between items-center">
              <h2 className="text-xl font-bold">
                {selectedTeam ? '✏️ Modifica Team' : '➕ Nuovo Team'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-white hover:text-gray-200 text-2xl"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome Team *
                </label>
                <input
                  type="text"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Es: Sviluppo Frontend"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descrizione
                </label>
                <textarea
                  value={formData.descrizione}
                  onChange={(e) => setFormData({ ...formData, descrizione: e.target.value })}
                  rows="3"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Descrivi il team..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Colore Team
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={formData.colore}
                    onChange={(e) => setFormData({ ...formData, colore: e.target.value })}
                    className="w-16 h-10 rounded cursor-pointer"
                  />
                  <span className="text-gray-600 font-mono">{formData.colore}</span>
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
                  {selectedTeam ? '💾 Salva' : '✓ Crea Team'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamManagement;