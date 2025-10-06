import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

const ScoringSystem = () => {
  const { token, user } = useAuth();
  const [leaderboard, setLeaderboard] = useState([]);
  const [teamLeaderboard, setTeamLeaderboard] = useState([]);
  const [userScore, setUserScore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('personal'); // 'personal' o 'team'
  const [period, setPeriod] = useState('month'); // 'week', 'month', 'quarter'

  useEffect(() => {
    fetchLeaderboard();
    fetchUserScore();
  }, [period]);

  const fetchLeaderboard = async () => {
    try {
      const response = await fetch(`http://localhost:4000/api/scores/leaderboard?period=${period}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setLeaderboard(data.personal || []);
        setTeamLeaderboard(data.team || []);
      }
    } catch (error) {
      console.error('❌ Errore caricamento leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserScore = async () => {
    try {
      const response = await fetch(`http://localhost:4000/api/scores/user/${user.id}?period=${period}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setUserScore(data);
      }
    } catch (error) {
      console.error('❌ Errore caricamento punteggio utente:', error);
    }
  };

  const periodLabels = {
    week: 'Settimana',
    month: 'Mese',
    quarter: 'Trimestre'
  };

  const getMedalEmoji = (position) => {
    if (position === 0) return '🥇';
    if (position === 1) return '🥈';
    if (position === 2) return '🥉';
    return `${position + 1}°`;
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
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">🏆 Sistema di Punteggio</h2>
            <p className="text-gray-600 mt-1">Classifica e performance</p>
          </div>

          <div className="flex gap-2">
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="week">Settimana</option>
              <option value="month">Mese</option>
              <option value="quarter">Trimestre</option>
            </select>

            <button
              onClick={() => setViewMode('personal')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                viewMode === 'personal'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              👤 Personale
            </button>
            <button
              onClick={() => setViewMode('team')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                viewMode === 'team'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              👥 Team
            </button>
          </div>
        </div>
      </div>

      {/* Il Mio Punteggio */}
      {userScore && (
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg shadow-lg p-6 text-white">
          <h3 className="text-xl font-bold mb-4">📊 Il Tuo Punteggio ({periodLabels[period]})</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white bg-opacity-20 rounded-lg p-4">
              <p className="text-sm opacity-80 mb-1">Punti Totali</p>
              <p className="text-3xl font-bold">{userScore.totalPoints || 0}</p>
            </div>

            <div className="bg-white bg-opacity-20 rounded-lg p-4">
              <p className="text-sm opacity-80 mb-1">Task Completati</p>
              <p className="text-3xl font-bold">{userScore.completedTasks || 0}</p>
            </div>

            <div className="bg-white bg-opacity-20 rounded-lg p-4">
              <p className="text-sm opacity-80 mb-1">Puntualità</p>
              <p className="text-3xl font-bold">{userScore.punctuality || 0}%</p>
            </div>

            <div className="bg-white bg-opacity-20 rounded-lg p-4">
              <p className="text-sm opacity-80 mb-1">Posizione</p>
              <p className="text-3xl font-bold">
                {getMedalEmoji(userScore.rank - 1)}
              </p>
            </div>
          </div>

          {userScore.recentAchievements && userScore.recentAchievements.length > 0 && (
            <div className="mt-4 pt-4 border-t border-white border-opacity-20">
              <p className="text-sm font-semibold mb-2">🎖️ Ultimi Achievement</p>
              <div className="flex gap-2 flex-wrap">
                {userScore.recentAchievements.map((achievement, idx) => (
                  <span key={idx} className="px-3 py-1 bg-white bg-opacity-20 rounded-full text-xs">
                    {achievement}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Leaderboard Personale */}
      {viewMode === 'personal' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b">
            <h3 className="text-lg font-bold text-gray-800">
              🏅 Classifica Personale - {periodLabels[period]}
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Posizione
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Dipendente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Team
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Punti
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Task Completati
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Puntualità
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {leaderboard.map((entry, index) => (
                  <tr 
                    key={entry.userId} 
                    className={`hover:bg-gray-50 ${entry.userId === user.id ? 'bg-indigo-50' : ''}`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-2xl">
                        {getMedalEmoji(index)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-indigo-600 text-white rounded-full flex items-center justify-center font-semibold">
                          {entry.nome?.[0]}{entry.cognome?.[0]}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {entry.nome} {entry.cognome}
                            {entry.userId === user.id && (
                              <span className="ml-2 text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded-full">
                                Tu
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {entry.teamName || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-lg font-bold text-indigo-600">
                        {entry.totalPoints}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {entry.completedTasks}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                          <div
                            className="bg-green-500 h-2 rounded-full"
                            style={{ width: `${entry.punctuality || 0}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-gray-600">
                          {entry.punctuality || 0}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {leaderboard.length === 0 && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🏆</div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">
                Nessun dato disponibile
              </h3>
              <p className="text-gray-500">
                Completa dei task per vedere la classifica!
              </p>
            </div>
          )}
        </div>
      )}

      {/* Leaderboard Team */}
      {viewMode === 'team' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b">
            <h3 className="text-lg font-bold text-gray-800">
              👥 Classifica Team - {periodLabels[period]}
            </h3>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {teamLeaderboard.map((team, index) => (
                <div
                  key={team.teamId}
                  className={`rounded-lg p-6 shadow-lg ${
                    index === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-500 text-white' :
                    index === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-400 text-white' :
                    index === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-500 text-white' :
                    'bg-white border-2 border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-3xl">
                      {getMedalEmoji(index)}
                    </div>
                    <div className="text-right">
                      <p className={`text-sm ${index <= 2 ? 'opacity-80' : 'text-gray-500'}`}>
                        Punti Totali
                      </p>
                      <p className="text-3xl font-bold">
                        {team.totalPoints}
                      </p>
                    </div>
                  </div>

                  <h4 className={`text-xl font-bold mb-2 ${index > 2 ? 'text-gray-800' : ''}`}>
                    {team.teamName}
                  </h4>

                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <p className={`text-xs ${index <= 2 ? 'opacity-80' : 'text-gray-500'}`}>
                        Task Completati
                      </p>
                      <p className={`text-lg font-semibold ${index > 2 ? 'text-gray-800' : ''}`}>
                        {team.completedTasks}
                      </p>
                    </div>
                    <div>
                      <p className={`text-xs ${index <= 2 ? 'opacity-80' : 'text-gray-500'}`}>
                        Membri
                      </p>
                      <p className={`text-lg font-semibold ${index > 2 ? 'text-gray-800' : ''}`}>
                        {team.memberCount}
                      </p>
                    </div>
                    <div>
                      <p className={`text-xs ${index <= 2 ? 'opacity-80' : 'text-gray-500'}`}>
                        Media/Membro
                      </p>
                      <p className={`text-lg font-semibold ${index > 2 ? 'text-gray-800' : ''}`}>
                        {Math.round(team.totalPoints / team.memberCount)}
                      </p>
                    </div>
                    <div>
                      <p className={`text-xs ${index <= 2 ? 'opacity-80' : 'text-gray-500'}`}>
                        Puntualità
                      </p>
                      <p className={`text-lg font-semibold ${index > 2 ? 'text-gray-800' : ''}`}>
                        {team.punctuality}%
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {teamLeaderboard.length === 0 && (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">👥</div>
                <h3 className="text-xl font-semibold text-gray-700 mb-2">
                  Nessun team disponibile
                </h3>
                <p className="text-gray-500">
                  Crea dei team per vedere la classifica!
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Spiegazione Sistema di Punteggio */}
      <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
        <h3 className="text-lg font-bold text-blue-900 mb-3">
          📘 Come Funziona il Sistema di Punteggio
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
          <div>
            <h4 className="font-semibold mb-2">Punti Base per Task</h4>
            <ul className="space-y-1 list-disc list-inside">
              <li>Task completato: 100 punti base</li>
              <li>Difficoltà (1-5): moltiplicatore x1 a x2</li>
              <li>Priorità: Bassa x1, Media x1.2, Alta x1.5, Critica x2</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-2">Bonus e Malus</h4>
            <ul className="space-y-1 list-disc list-inside">
              <li>Completato prima: +20% punti</li>
              <li>Completato in ritardo: -30% punti</li>
              <li>Task bloccato risolto: +50 punti bonus</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-2">Punteggio Team</h4>
            <ul className="space-y-1 list-disc list-inside">
              <li>Somma punti di tutti i membri</li>
              <li>Bonus collaborazione: +10% se task condivisi</li>
              <li>Penalità ritardi team: -5% per task in ritardo</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-2">Achievement</h4>
            <ul className="space-y-1 list-disc list-inside">
              <li>🏆 10 task completati in una settimana</li>
              <li>⚡ 5 task critici completati in tempo</li>
              <li>🎯 100% puntualità nel mese</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScoringSystem;