import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  History,
  Filter,
  Award,
  CheckCircle,
  Clock,
  Users,
  Calendar,
  TrendingUp,
  Plus,
  X,
  Search,
  Download
} from 'lucide-react';

const API_URL = 'http://localhost:4000/api';

interface Task {
  id: string;
  titolo: string;
  descrizione?: string;
  stato: string;
  priorita: string;
  difficolta: number;
  scadenza?: string;
  dataInizio?: string;
  dataFine?: string;
  rewardPoints: number;
  rewardPerSubtask: number;
  owner: {
    id: string;
    nome: string;
    cognome: string;
    email: string;
    avatar?: string;
  };
  assignees: Array<{
    id: string;
    nome: string;
    cognome: string;
    email: string;
    avatar?: string;
  }>;
  subtasks: Array<{
    id: string;
    titolo: string;
    completata: boolean;
  }>;
  progetto?: {
    id: string;
    nome: string;
    colore?: string;
  };
  team?: {
    id: string;
    nome: string;
    colore?: string;
  };
  scores: Array<{
    id: string;
    userId: string;
    puntiTotali: number;
    periodo: string;
    createdAt: string;
    breakdown: string;
  }>;
  totalSubtasks: number;
  completedSubtasks: number;
  completionPercentage: number;
  totalPointsAwarded: number;
}

interface Employee {
  id: string;
  nome: string;
  cognome: string;
  email: string;
  avatar?: string;
}

const TaskHistoryAdmin: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtri
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modal assegnazione punti
  const [showPointsModal, setShowPointsModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [pointsToAssign, setPointsToAssign] = useState<number>(0);
  const [pointsReason, setPointsReason] = useState<string>('');
  const [assigningPoints, setAssigningPoints] = useState(false);

  const token = localStorage.getItem('token');

  useEffect(() => {
    loadEmployees();
    loadTaskHistory();
  }, []);

  useEffect(() => {
    loadTaskHistory();
  }, [selectedEmployee, startDate, endDate]);

  const loadEmployees = async () => {
    try {
      const response = await axios.get(`${API_URL}/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEmployees(response.data);
    } catch (error) {
      console.error('Errore nel caricamento dipendenti:', error);
    }
  };

  const loadTaskHistory = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedEmployee) params.append('userId', selectedEmployee);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const response = await axios.get(`${API_URL}/analytics/task-history?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTasks(response.data);
    } catch (error) {
      console.error('Errore nel caricamento cronologia:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignPoints = async () => {
    if (!selectedUserId || !pointsToAssign || !pointsReason.trim()) {
      alert('Compila tutti i campi');
      return;
    }

    setAssigningPoints(true);
    try {
      await axios.post(
        `${API_URL}/analytics/assign-manual-points`,
        {
          userId: selectedUserId,
          punti: pointsToAssign,
          motivo: pointsReason,
          taskId: selectedTask?.id
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      alert('Punti assegnati con successo!');
      setShowPointsModal(false);
      resetPointsModal();
      loadTaskHistory();
    } catch (error: any) {
      console.error('Errore nell\'assegnazione punti:', error);
      alert(error.response?.data?.error || 'Errore nell\'assegnazione dei punti');
    } finally {
      setAssigningPoints(false);
    }
  };

  const resetPointsModal = () => {
    setSelectedTask(null);
    setSelectedUserId('');
    setPointsToAssign(0);
    setPointsReason('');
  };

  const openPointsModal = (task: Task, userId?: string) => {
    setSelectedTask(task);
    setSelectedUserId(userId || '');
    setPointsToAssign(task.rewardPerSubtask || 10);
    setPointsReason(`Lavoro eccellente su: ${task.titolo}`);
    setShowPointsModal(true);
  };

  const getPriorityColor = (priorita: string) => {
    switch (priorita) {
      case 'urgent':
      case 'alta':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'high':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'medium':
      case 'media':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'low':
      case 'bassa':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const filteredTasks = tasks.filter(task =>
    task.titolo.toLowerCase().includes(searchQuery.toLowerCase()) ||
    task.owner.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
    task.owner.cognome.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalTasksCompleted = filteredTasks.length;
  const totalPointsAwarded = filteredTasks.reduce((sum, t) => sum + t.totalPointsAwarded, 0);
  const totalSubtasksCompleted = filteredTasks.reduce((sum, t) => sum + t.completedSubtasks, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-600 rounded-xl">
            <History className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Cronologia Task Completate</h2>
            <p className="text-gray-400 text-sm">
              Visualizza e gestisci le task completate dai dipendenti
            </p>
          </div>
        </div>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
        >
          <Download className="w-4 h-4" />
          Esporta
        </button>
      </div>

      {/* Statistiche Riepilogative */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-800/50 backdrop-blur-sm border border-indigo-500/20 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <p className="text-gray-400 text-sm font-semibold">Task Completate</p>
          </div>
          <p className="text-3xl font-bold text-white">{totalTasksCompleted}</p>
        </div>
        <div className="bg-slate-800/50 backdrop-blur-sm border border-amber-500/20 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <Award className="w-5 h-5 text-amber-400" />
            <p className="text-gray-400 text-sm font-semibold">Punti Totali Distribuiti</p>
          </div>
          <p className="text-3xl font-bold text-amber-400">{totalPointsAwarded}</p>
        </div>
        <div className="bg-slate-800/50 backdrop-blur-sm border border-purple-500/20 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="w-5 h-5 text-purple-400" />
            <p className="text-gray-400 text-sm font-semibold">Subtask Completate</p>
          </div>
          <p className="text-3xl font-bold text-white">{totalSubtasksCompleted}</p>
        </div>
      </div>

      {/* Filtri */}
      <div className="bg-slate-800/50 backdrop-blur-sm border border-indigo-500/20 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-indigo-400" />
          <h3 className="text-lg font-semibold text-white">Filtri</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Filtro Dipendente */}
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              Dipendente
            </label>
            <select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="">Tutti i dipendenti</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>
                  {emp.nome} {emp.cognome}
                </option>
              ))}
            </select>
          </div>

          {/* Data Inizio */}
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              Data Inizio
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Data Fine */}
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              Data Fine
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Ricerca */}
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              Cerca
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Task o dipendente..."
                className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Reset Filtri */}
        {(selectedEmployee || startDate || endDate || searchQuery) && (
          <button
            onClick={() => {
              setSelectedEmployee('');
              setStartDate('');
              setEndDate('');
              setSearchQuery('');
            }}
            className="mt-4 text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            Reset filtri
          </button>
        )}
      </div>

      {/* Lista Task */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="bg-slate-800/50 backdrop-blur-sm border border-indigo-500/20 rounded-xl p-12 text-center">
          <History className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">Nessuna task trovata</h3>
          <p className="text-gray-400">
            Prova a modificare i filtri di ricerca
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTasks.map((task) => (
            <div
              key={task.id}
              className="bg-slate-800/50 backdrop-blur-sm border border-indigo-500/20 rounded-xl p-6 hover:border-indigo-500/40 transition-all"
            >
              {/* Header Task */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-white">{task.titolo}</h3>
                    <span className={`px-2 py-1 text-xs font-semibold rounded border ${getPriorityColor(task.priorita)}`}>
                      {task.priorita}
                    </span>
                    {task.progetto && (
                      <span
                        className="px-2 py-1 text-xs font-semibold rounded"
                        style={{
                          backgroundColor: task.progetto.colore ? `${task.progetto.colore}20` : '#4B5563',
                          color: task.progetto.colore || '#9CA3AF'
                        }}
                      >
                        {task.progetto.nome}
                      </span>
                    )}
                  </div>
                  {task.descrizione && (
                    <p className="text-sm text-gray-400 mb-3">{task.descrizione}</p>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-amber-400 font-bold text-lg mb-1">
                    {task.totalPointsAwarded} pts
                  </div>
                  <div className="text-gray-500 text-xs">assegnati</div>
                </div>
              </div>

              {/* Statistiche Task */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="bg-slate-900/50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span className="text-xs text-gray-400">Completamento</span>
                  </div>
                  <p className="text-lg font-bold text-white">{task.completionPercentage}%</p>
                </div>
                <div className="bg-slate-900/50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="w-4 h-4 text-purple-400" />
                    <span className="text-xs text-gray-400">Subtask</span>
                  </div>
                  <p className="text-lg font-bold text-white">
                    {task.completedSubtasks}/{task.totalSubtasks}
                  </p>
                </div>
                <div className="bg-slate-900/50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="w-4 h-4 text-blue-400" />
                    <span className="text-xs text-gray-400">Completata</span>
                  </div>
                  <p className="text-sm font-bold text-white">
                    {task.dataFine ? new Date(task.dataFine).toLocaleDateString('it-IT') : 'N/A'}
                  </p>
                </div>
                <div className="bg-slate-900/50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs text-gray-400">Durata</span>
                  </div>
                  <p className="text-sm font-bold text-white">
                    {task.dataInizio && task.dataFine
                      ? `${Math.ceil((new Date(task.dataFine).getTime() - new Date(task.dataInizio).getTime()) / (1000 * 60 * 60 * 24))} giorni`
                      : 'N/A'}
                  </p>
                </div>
              </div>

              {/* Owner & Assignees */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-700">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-xs">
                      {task.owner.nome.charAt(0)}{task.owner.cognome.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">
                        {task.owner.nome} {task.owner.cognome}
                      </p>
                      <p className="text-xs text-gray-500">Owner</p>
                    </div>
                  </div>

                  {task.assignees.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-gray-400" />
                      <div className="flex -space-x-2">
                        {task.assignees.slice(0, 3).map((assignee) => (
                          <div
                            key={assignee.id}
                            className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-xs border-2 border-slate-800"
                            title={`${assignee.nome} ${assignee.cognome}`}
                          >
                            {assignee.nome.charAt(0)}{assignee.cognome.charAt(0)}
                          </div>
                        ))}
                        {task.assignees.length > 3 && (
                          <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center text-white font-bold text-xs border-2 border-slate-800">
                            +{task.assignees.length - 3}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Azioni */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openPointsModal(task, task.owner.id)}
                    className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg transition-colors text-sm"
                  >
                    <Award className="w-4 h-4" />
                    Assegna Punti
                  </button>
                </div>
              </div>

              {/* Scores assegnati */}
              {task.scores.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-700">
                  <p className="text-sm font-semibold text-gray-400 mb-2">Punti già assegnati:</p>
                  <div className="flex flex-wrap gap-2">
                    {task.scores.map((score) => {
                      const employee = [...task.assignees, task.owner].find(e => e.id === score.userId);
                      return (
                        <div
                          key={score.id}
                          className="px-3 py-1 bg-amber-500/20 border border-amber-500/30 rounded-full text-xs text-amber-400 font-semibold"
                        >
                          {employee ? `${employee.nome} ${employee.cognome}` : 'Unknown'}: {score.puntiTotali} pts
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal Assegnazione Punti */}
      {showPointsModal && selectedTask && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 border border-indigo-500/20 rounded-xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Award className="w-6 h-6 text-amber-400" />
                Assegna Punti Manualmente
              </h3>
              <button
                onClick={() => {
                  setShowPointsModal(false);
                  resetPointsModal();
                }}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-400 mb-2">Task: <span className="text-white font-semibold">{selectedTask.titolo}</span></p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  Dipendente *
                </label>
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="">Seleziona dipendente</option>
                  <option value={selectedTask.owner.id}>
                    {selectedTask.owner.nome} {selectedTask.owner.cognome} (Owner)
                  </option>
                  {selectedTask.assignees.map(assignee => (
                    <option key={assignee.id} value={assignee.id}>
                      {assignee.nome} {assignee.cognome}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  Punti *
                </label>
                <input
                  type="number"
                  value={pointsToAssign}
                  onChange={(e) => setPointsToAssign(parseInt(e.target.value))}
                  min="1"
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  Motivo *
                </label>
                <textarea
                  value={pointsReason}
                  onChange={(e) => setPointsReason(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                  placeholder="Es: Lavoro eccellente, risolto bug critico, ecc..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowPointsModal(false);
                    resetPointsModal();
                  }}
                  className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors"
                >
                  Annulla
                </button>
                <button
                  onClick={handleAssignPoints}
                  disabled={assigningPoints || !selectedUserId || !pointsToAssign || !pointsReason.trim()}
                  className="px-6 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
                >
                  {assigningPoints ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Assegnando...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Assegna {pointsToAssign} Punti
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskHistoryAdmin;
