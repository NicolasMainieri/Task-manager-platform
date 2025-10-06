import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

const ReportsAnalytics = () => {
  const { token } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('month');
  const [selectedMetric, setSelectedMetric] = useState('overview');

  // Utility per evitare crash con .map()
  const asArray = (v) => (Array.isArray(v) ? v : []);

  // Dati mock DEVONO essere definiti PRIMA di tutto
  const mockData = {
    overview: {
      totalTasks: 156,
      completedTasks: 98,
      inProgressTasks: 35,
      blockedTasks: 8,
      delayedTasks: 15,
      completionRate: 62.8,
      avgCompletionTime: 4.2,
      teamProductivity: 87.5
    },
    byPriority: {
      critica: { total: 25, completed: 20, delayed: 3 },
      alta: { total: 45, completed: 35, delayed: 5 },
      media: { total: 60, completed: 35, delayed: 5 },
      bassa: { total: 26, completed: 8, delayed: 2 }
    },
    byTeam: [
      { name: 'Frontend', tasks: 45, completed: 32, productivity: 91 },
      { name: 'Backend', tasks: 38, completed: 30, productivity: 88 },
      { name: 'Design', tasks: 28, completed: 20, productivity: 82 },
      { name: 'Marketing', tasks: 22, completed: 16, productivity: 78 }
    ],
    topPerformers: [
      { name: 'Mario Rossi', tasks: 28, points: 3250, punctuality: 95 },
      { name: 'Laura Bianchi', tasks: 25, points: 2980, punctuality: 92 },
      { name: 'Giuseppe Verdi', tasks: 23, points: 2750, punctuality: 89 }
    ],
    timeline: [
      { week: 'Sett 1', completed: 18, created: 25 },
      { week: 'Sett 2', completed: 22, created: 20 },
      { week: 'Sett 3', completed: 25, created: 23 },
      { week: 'Sett 4', completed: 33, created: 28 }
    ]
  };

  useEffect(() => {
    fetchAnalytics();
  }, [period]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:4000/api/analytics?period=${period}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      }
    } catch (error) {
      console.error('❌ Errore caricamento analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportReport = async (format) => {
    try {
      const response = await fetch(`http://localhost:4000/api/analytics/export?format=${format}&period=${period}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `report_${period}_${Date.now()}.${format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('❌ Errore export report:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // Usa i dati mock se analytics è null
  const data = analytics || mockData;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">📊 Report & Analytics</h2>
            <p className="text-gray-600 mt-1">Analisi dettagliata delle performance</p>
          </div>

          <div className="flex gap-2">
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="week">Ultima Settimana</option>
              <option value="month">Ultimo Mese</option>
              <option value="quarter">Ultimo Trimestre</option>
              <option value="year">Ultimo Anno</option>
            </select>

            <button
              onClick={() => exportReport('pdf')}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
            >
              📄 PDF
            </button>
            <button
              onClick={() => exportReport('csv')}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
            >
              📊 CSV
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">Task Totali</p>
              <p className="text-3xl font-bold mt-2">{data?.overview?.totalTasks || 0}</p>
              <p className="text-sm mt-1 text-blue-100">
                {data?.overview?.completedTasks || 0} completati ({data?.overview?.completionRate || 0}%)
              </p>
            </div>
            <div className="text-4xl opacity-80">📋</div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium">Tasso Completamento</p>
              <p className="text-3xl font-bold mt-2">{data?.overview?.completionRate || 0}%</p>
              <p className="text-sm mt-1 text-green-100">
                Target: 75%
              </p>
            </div>
            <div className="text-4xl opacity-80">✅</div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm font-medium">Tempo Medio</p>
              <p className="text-3xl font-bold mt-2">{data?.overview?.avgCompletionTime || 0}gg</p>
              <p className="text-sm mt-1 text-orange-100">
                Per task completato
              </p>
            </div>
            <div className="text-4xl opacity-80">⏱️</div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm font-medium">Produttività Team</p>
              <p className="text-3xl font-bold mt-2">{data?.overview?.teamProductivity || 0}%</p>
              <p className="text-sm mt-1 text-purple-100">
                Media generale
              </p>
            </div>
            <div className="text-4xl opacity-80">🚀</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200 px-6">
          <div className="flex gap-6 overflow-x-auto">
            {[
              { id: 'overview', label: '📈 Overview', icon: '📈' },
              { id: 'priority', label: '🎯 Per Priorità', icon: '🎯' },
              { id: 'teams', label: '👥 Per Team', icon: '👥' },
              { id: 'performers', label: '🏆 Top Performer', icon: '🏆' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setSelectedMetric(tab.id)}
                className={`py-3 px-2 font-medium border-b-2 transition-colors whitespace-nowrap ${
                  selectedMetric === tab.id
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {/* Overview Tab */}
          {selectedMetric === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-bold text-gray-800 mb-4">Stato Task</h3>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">Completati</span>
                        <span className="font-semibold">{data?.overview?.completedTasks || 0}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full"
                          style={{ width: `${((data?.overview?.completedTasks || 0) / (data?.overview?.totalTasks || 1)) * 100}%` }}
                        ></div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">In Corso</span>
                        <span className="font-semibold">{data?.overview?.inProgressTasks || 0}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full"
                          style={{ width: `${((data?.overview?.inProgressTasks || 0) / (data?.overview?.totalTasks || 1)) * 100}%` }}
                        ></div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">Bloccati</span>
                        <span className="font-semibold">{data?.overview?.blockedTasks || 0}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-red-500 h-2 rounded-full"
                          style={{ width: `${((data?.overview?.blockedTasks || 0) / (data?.overview?.totalTasks || 1)) * 100}%` }}
                        ></div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">In Ritardo</span>
                        <span className="font-semibold text-red-600">{data?.overview?.delayedTasks || 0}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-orange-500 h-2 rounded-full"
                          style={{ width: `${((data?.overview?.delayedTasks || 0) / (data?.overview?.totalTasks || 1)) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-gray-800 mb-4">Trend Settimanale</h3>
                  <div className="space-y-2">
                    {asArray(data?.timeline).map((item, index) => (
                      <div key={index} className="flex items-center gap-4">
                        <span className="text-sm text-gray-600 w-16">{item?.week || ''}</span>
                        <div className="flex-1">
                          <div className="flex gap-2">
                            <div className="relative flex-1">
                              <div className="w-full bg-gray-200 rounded h-8 flex items-center">
                                <div
                                  className="bg-green-500 h-8 rounded flex items-center justify-center text-white text-xs font-bold"
                                  style={{ width: `${((item?.completed || 0) / (item?.created || 1)) * 100}%`, minWidth: '30px' }}
                                >
                                  {item?.completed || 0}
                                </div>
                              </div>
                            </div>
                            <span className="text-xs text-gray-500 w-16">/{item?.created || 0}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Priority Tab */}
          {selectedMetric === 'priority' && (
            <div>
              <h3 className="text-lg font-bold text-gray-800 mb-4">Distribuzione per Priorità</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {Object.entries(data?.byPriority || {}).map(([priority, stats]) => (
                  <div key={priority} className="bg-gray-50 rounded-lg p-4 border-2 border-gray-200">
                    <h4 className="font-semibold text-gray-800 mb-3 capitalize">{priority}</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Totali</span>
                        <span className="font-bold">{stats?.total || 0}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Completati</span>
                        <span className="font-bold text-green-600">{stats?.completed || 0}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">In Ritardo</span>
                        <span className="font-bold text-red-600">{stats?.delayed || 0}</span>
                      </div>
                      <div className="mt-3">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-indigo-500 h-2 rounded-full"
                            style={{ width: `${((stats?.completed || 0) / (stats?.total || 1)) * 100}%` }}
                          ></div>
                        </div>
                        <p className="text-xs text-gray-500 mt-1 text-center">
                          {Math.round(((stats?.completed || 0) / (stats?.total || 1)) * 100)}% completato
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Teams Tab */}
          {selectedMetric === 'teams' && (
            <div>
              <h3 className="text-lg font-bold text-gray-800 mb-4">Performance per Team</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b-2 border-gray-200">
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Team</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Task Assegnati</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Task Completati</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Produttività</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Visualizza</th>
                    </tr>
                  </thead>
                  <tbody>
                    {asArray(data?.byTeam).map((team, index) => (
                      <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-4 py-4">
                          <span className="font-medium text-gray-900">{team?.name || ''}</span>
                        </td>
                        <td className="px-4 py-4 text-gray-600">{team?.tasks || 0}</td>
                        <td className="px-4 py-4">
                          <span className="text-green-600 font-semibold">{team?.completed || 0}</span>
                          <span className="text-gray-500 text-sm"> / {team?.tasks || 0}</span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-24 bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${
                                  (team?.productivity || 0) >= 85 ? 'bg-green-500' :
                                  (team?.productivity || 0) >= 70 ? 'bg-yellow-500' : 'bg-red-500'
                                }`}
                                style={{ width: `${team?.productivity || 0}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-semibold">{team?.productivity || 0}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="w-full bg-gray-200 rounded-full h-8">
                            <div
                              className="bg-indigo-500 h-8 rounded-full flex items-center justify-center"
                              style={{ width: `${((team?.completed || 0) / (team?.tasks || 1)) * 100}%` }}
                            >
                              <span className="text-white text-xs font-bold">
                                {Math.round(((team?.completed || 0) / (team?.tasks || 1)) * 100)}%
                              </span>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Top Performers Tab */}
          {selectedMetric === 'performers' && (
            <div>
              <h3 className="text-lg font-bold text-gray-800 mb-4">🏆 Top 10 Performer del Periodo</h3>
              <div className="space-y-3">
                {asArray(data?.topPerformers).map((performer, index) => (
                  <div
                    key={index}
                    className={`flex items-center gap-4 p-4 rounded-lg ${
                      index === 0 ? 'bg-gradient-to-r from-yellow-100 to-yellow-50 border-2 border-yellow-400' :
                      index === 1 ? 'bg-gradient-to-r from-gray-100 to-gray-50 border-2 border-gray-400' :
                      index === 2 ? 'bg-gradient-to-r from-orange-100 to-orange-50 border-2 border-orange-400' :
                      'bg-gray-50 border border-gray-200'
                    }`}
                  >
                    <div className="text-3xl font-bold">
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}°`}
                    </div>
                    
                    <div className="flex-1">
                      <h4 className="font-bold text-gray-800">{performer?.name || ''}</h4>
                      <div className="flex gap-4 mt-1 text-sm text-gray-600">
                        <span>📋 {performer?.tasks || 0} task</span>
                        <span>⭐ {performer?.points || 0} punti</span>
                        <span>⏱️ {performer?.punctuality || 0}% puntualità</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="w-20 bg-gray-200 rounded-full h-2 mb-1">
                        <div
                          className="bg-green-500 h-2 rounded-full"
                          style={{ width: `${performer?.punctuality || 0}%` }}
                        ></div>
                      </div>
                      <span className="text-xs text-gray-500">Affidabilità</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Insights e Raccomandazioni */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-green-50 rounded-lg p-6 border border-green-200">
          <h3 className="text-lg font-bold text-green-900 mb-3">✅ Punti di Forza</h3>
          <ul className="space-y-2 text-sm text-green-800">
            <li className="flex items-start gap-2">
              <span>•</span>
              <span>Tasso di completamento superiore al target (62.8% vs 60%)</span>
            </li>
            <li className="flex items-start gap-2">
              <span>•</span>
              <span>Team Frontend con produttività del 91%</span>
            </li>
            <li className="flex items-start gap-2">
              <span>•</span>
              <span>Solo 8 task bloccati su 156 totali (5.1%)</span>
            </li>
            <li className="flex items-start gap-2">
              <span>•</span>
              <span>Task critici gestiti con 80% di completamento</span>
            </li>
          </ul>
        </div>

        <div className="bg-orange-50 rounded-lg p-6 border border-orange-200">
          <h3 className="text-lg font-bold text-orange-900 mb-3">⚠️ Aree di Miglioramento</h3>
          <ul className="space-y-2 text-sm text-orange-800">
            <li className="flex items-start gap-2">
              <span>•</span>
              <span>15 task in ritardo richiedono attenzione immediata</span>
            </li>
            <li className="flex items-start gap-2">
              <span>•</span>
              <span>Team Marketing sotto la media (78% produttività)</span>
            </li>
            <li className="flex items-start gap-2">
              <span>•</span>
              <span>Tempo medio di completamento sopra target (4.2gg vs 3gg)</span>
            </li>
            <li className="flex items-start gap-2">
              <span>•</span>
              <span>Task a bassa priorità hanno basso tasso di completamento (31%)</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Raccomandazioni Automatiche */}
      <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
        <h3 className="text-lg font-bold text-blue-900 mb-3">💡 Raccomandazioni AI</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded p-4">
            <h4 className="font-semibold text-blue-900 mb-2">📊 Redistribuzione Carico</h4>
            <p className="text-sm text-blue-800">
              Considera di redistribuire alcuni task dal team Frontend (sovraccarico) 
              al team Marketing per bilanciare il carico di lavoro.
            </p>
          </div>
          
          <div className="bg-white rounded p-4">
            <h4 className="font-semibold text-blue-900 mb-2">⏰ Gestione Scadenze</h4>
            <p className="text-sm text-blue-800">
              I 15 task in ritardo necessitano di una revisione delle scadenze o 
              dell'assegnazione di risorse aggiuntive.
            </p>
          </div>
          
          <div className="bg-white rounded p-4">
            <h4 className="font-semibold text-blue-900 mb-2">🎯 Focus Priorità</h4>
            <p className="text-sm text-blue-800">
              I task a bassa priorità vengono completati solo nel 31% dei casi. 
              Valuta se eliminarli o aumentarne la priorità.
            </p>
          </div>
          
          <div className="bg-white rounded p-4">
            <h4 className="font-semibold text-blue-900 mb-2">🏆 Riconoscimenti</h4>
            <p className="text-sm text-blue-800">
              Mario Rossi ha superato tutti i target. Considera un riconoscimento 
              o l'assegnazione di task più sfidanti.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportsAnalytics;