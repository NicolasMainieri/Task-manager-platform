import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import TaskList from '../components/TaskList';
import TeamManagement from '../components/TeamManagement';
import UserManagement from '../components/UserManagement';
import RequestsManagement from '../components/RequestsManagement';
import ScoringSystem from '../components/ScoringSystem';
import ReportsAnalytics from '../components/ReportsAnalytics';

const Dashboard = () => {
  const { user, logout, token } = useAuth();
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState('home');

  // \u279c Manteniamo la tua struttura esistente e aggiungiamo solo i campi che servono a ReportsAnalytics
  const [stats, setStats] = useState({
    totali: 0,
    daFare: 0,
    inCorso: 0,
    completati: 0,
    // nuovi campi NON sostituiscono i precedenti; servono ai report
    overdue: 0,
    onTime: 0,
  });

  // \u279c Conserviamo anche l'elenco tasks per passarlo ai report
  const [tasks, setTasks] = useState([]);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('http://localhost:4000/api/tasks', {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();

        // \u2705 Normalizzazione robusta del payload: accetta sia array diretto che oggetto con chiave tasks
        const taskArray = Array.isArray(data)
          ? data
          : Array.isArray(data?.tasks)
          ? data.tasks
          : [];

        setTasks(taskArray);

        // \u2705 Calcoli esistenti + derivati per ReportsAnalytics
        const now = new Date();
        const totali = taskArray.length;
        const daFare = taskArray.filter((t) => t?.stato === 'da_fare').length;
        const inCorso = taskArray.filter((t) => t?.stato === 'in_corso').length;
        const completati = taskArray.filter((t) => t?.stato === 'completato').length;

        // overdue: scadenza passata e non completati
        const overdue = taskArray.filter((t) => {
          if (!t) return false;
          const hasDeadline = !!t.scadenza;
          const deadlinePassed = hasDeadline && new Date(t.scadenza) < now;
          const notCompleted = t.stato !== 'completato';
          return deadlinePassed && notCompleted;
        }).length;

        // onTime: completati entro la scadenza (se esiste) oppure senza scadenza => considerati puntuali
        const onTime = taskArray.filter((t) => {
          if (!t) return false;
          if (t.stato !== 'completato') return false;
          if (!t.scadenza) return true; // senza scadenza li consideriamo puntuali
          if (!t.updatedAt) return false; // se manca updatedAt non possiamo verificarlo
          return new Date(t.updatedAt) <= new Date(t.scadenza);
        }).length;

        setStats({ totali, daFare, inCorso, completati, overdue, onTime });
      } catch (error) {
        console.error('Errore nel caricamento delle statistiche:', error);
        // fallback coerente
        setTasks([]);
        setStats({ totali: 0, daFare: 0, inCorso: 0, completati: 0, overdue: 0, onTime: 0 });
      } finally {
        setLoading(false);
      }
    };

    if (token) fetchStats();
  }, [token]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-indigo-600">Task Management Platform</h1>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              Logout
            </button>
          </div>

          {activeView !== 'home' && (
            <div className="mt-4 flex gap-2 border-t pt-4">
              <button
                onClick={() => setActiveView('home')}
                className="px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
              >
                Torna alla Home
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeView === 'home' && (
          <>
            <div className="bg-white rounded-lg shadow p-6 mb-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                Benvenuto, {user?.nome} {user?.cognome}!
              </h2>
              <p className="text-gray-600">
                Ruolo: <span className="font-semibold capitalize">{user?.ruolo}</span>
              </p>
              <p className="text-gray-600">
                Email: <span className="font-semibold">{user?.email}</span>
              </p>
            </div>

            <div className="mb-8">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Statistiche Task</h3>

              {loading ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                  <p className="mt-2 text-gray-600">Caricamento...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-blue-100 text-sm font-medium">Task Totali</p>
                        <p className="text-3xl font-bold mt-2">{stats.totali}</p>
                      </div>
                      <div className="text-4xl opacity-80">📋</div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-lg shadow-lg p-6 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-yellow-100 text-sm font-medium">Da Fare</p>
                        <p className="text-3xl font-bold mt-2">{stats.daFare}</p>
                      </div>
                      <div className="text-4xl opacity-80">⏳</div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg shadow-lg p-6 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-orange-100 text-sm font-medium">In Corso</p>
                        <p className="text-3xl font-bold mt-2">{stats.inCorso}</p>
                      </div>
                      <div className="text-4xl opacity-80">🔄</div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg p-6 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-green-100 text-sm font-medium">Completati</p>
                        <p className="text-3xl font-bold mt-2">{stats.completati}</p>
                      </div>
                      <div className="text-4xl opacity-80">✅</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white rounded-lg shadow p-6 mb-8">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Azioni Rapide</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                <button onClick={() => setActiveView('tasks')} className="p-4 border-2 border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors text-left">
                  <div className="text-2xl mb-2">📋</div>
                  <h4 className="font-semibold text-gray-800">Task</h4>
                  <p className="text-sm text-gray-600">Gestisci task</p>
                </button>

                <button onClick={() => setActiveView('teams')} className="p-4 border-2 border-purple-200 rounded-lg hover:bg-purple-50 transition-colors text-left">
                  <div className="text-2xl mb-2">👥</div>
                  <h4 className="font-semibold text-gray-800">Team</h4>
                  <p className="text-sm text-gray-600">Organizza team</p>
                </button>

                <button onClick={() => setActiveView('users')} className="p-4 border-2 border-green-200 rounded-lg hover:bg-green-50 transition-colors text-left">
                  <div className="text-2xl mb-2">👤</div>
                  <h4 className="font-semibold text-gray-800">Dipendenti</h4>
                  <p className="text-sm text-gray-600">Gestisci utenti</p>
                </button>

                <button onClick={() => setActiveView('requests')} className="p-4 border-2 border-orange-200 rounded-lg hover:bg-orange-50 transition-colors text-left">
                  <div className="text-2xl mb-2">📬</div>
                  <h4 className="font-semibold text-gray-800">Richieste</h4>
                  <p className="text-sm text-gray-600">Gestisci richieste</p>
                </button>

                <button onClick={() => setActiveView('scoring')} className="p-4 border-2 border-yellow-200 rounded-lg hover:bg-yellow-50 transition-colors text-left">
                  <div className="text-2xl mb-2">🏆</div>
                  <h4 className="font-semibold text-gray-800">Punteggi</h4>
                  <p className="text-sm text-gray-600">Classifica</p>
                </button>

                <button onClick={() => setActiveView('reports')} className="p-4 border-2 border-blue-200 rounded-lg hover:bg-blue-50 transition-colors text-left">
                  <div className="text-2xl mb-2">📊</div>
                  <h4 className="font-semibold text-gray-800">Report</h4>
                  <p className="text-sm text-gray-600">Analytics</p>
                </button>
              </div>
            </div>
          </>
        )}

        {activeView === 'tasks' && <TaskList />}
        {activeView === 'teams' && <TeamManagement />}
        {activeView === 'users' && <UserManagement />}
        {activeView === 'requests' && <RequestsManagement />}
        {activeView === 'scoring' && <ScoringSystem />}

        {/* \u2705 Passiamo props sicure a ReportsAnalytics senza togliere nulla del tuo layout */}
        {activeView === 'reports' && (
          <ReportsAnalytics
            stats={{
              totalTasks: stats.totali,
              completed: stats.completati,
              overdue: stats.overdue,
              onTime: stats.onTime,
            }}
            tasks={tasks}
          />
        )}
      </main>
    </div>
  );
};

export default Dashboard;
