import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ListTodo, Calendar, AlertCircle, ChevronDown, ChevronUp, Plus } from 'lucide-react';
import SubtaskItemWithTimer from './SubtaskItemWithTimer';

const API_URL = 'http://localhost:4000/api';

interface Task {
  id: string;
  titolo: string;
  descrizione?: string;
  priorita: string;
  scadenza?: string;
  completionPercentage: number;
  totalSubtasks: number;
  completedSubtasks: number;
  subtasks: any[];
  progetto?: { nome: string; colore?: string };
  team?: { nome: string; colore?: string };
  activeSession?: any;
}

const TodayTasksList: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const token = localStorage.getItem('token');

  useEffect(() => {
    loadTodayTasks();
  }, []);

  const loadTodayTasks = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/tasks/today`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setTasks(response.data);

      // Espandi automaticamente le task con sessioni attive
      const tasksWithActiveSessions = new Set(
        response.data
          .filter((task: Task) => task.activeSession)
          .map((task: Task) => task.id)
      );
      setExpandedTasks(tasksWithActiveSessions);
    } catch (error) {
      console.error('Errore caricamento task del giorno:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleTaskExpansion = (taskId: string) => {
    setExpandedTasks((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };

  const getPriorityColor = (priorita: string) => {
    switch (priorita) {
      case 'urgent':
        return 'text-red-400 bg-red-500/20';
      case 'high':
        return 'text-orange-400 bg-orange-500/20';
      case 'medium':
        return 'text-yellow-400 bg-yellow-500/20';
      case 'low':
        return 'text-green-400 bg-green-500/20';
      default:
        return 'text-gray-400 bg-gray-500/20';
    }
  };

  const getPriorityLabel = (priorita: string) => {
    switch (priorita) {
      case 'urgent':
        return 'Urgente';
      case 'high':
        return 'Alta';
      case 'medium':
        return 'Media';
      case 'low':
        return 'Bassa';
      default:
        return priorita;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-400">Caricamento task del giorno...</div>
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <ListTodo className="w-16 h-16 text-gray-600 mb-4" />
        <h3 className="text-xl font-semibold text-white mb-2">
          Nessuna task per oggi
        </h3>
        <p className="text-gray-400 mb-6">
          Non hai task in scadenza oggi o task in progress senza scadenza
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-600 rounded-xl">
            <Calendar className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Task di Oggi</h2>
            <p className="text-gray-400 text-sm">
              {tasks.length} {tasks.length === 1 ? 'task' : 'task'} da completare
            </p>
          </div>
        </div>
      </div>

      {/* Statistiche */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-slate-800/50 backdrop-blur-sm border border-indigo-500/20 rounded-xl p-4">
          <p className="text-gray-400 text-sm mb-1">Totale Task</p>
          <p className="text-2xl font-bold text-white">{tasks.length}</p>
        </div>
        <div className="bg-slate-800/50 backdrop-blur-sm border border-indigo-500/20 rounded-xl p-4">
          <p className="text-gray-400 text-sm mb-1">Totale Subtask</p>
          <p className="text-2xl font-bold text-white">
            {tasks.reduce((sum, task) => sum + task.totalSubtasks, 0)}
          </p>
        </div>
        <div className="bg-slate-800/50 backdrop-blur-sm border border-indigo-500/20 rounded-xl p-4">
          <p className="text-gray-400 text-sm mb-1">Completamento Medio</p>
          <p className="text-2xl font-bold text-indigo-400">
            {tasks.length > 0
              ? Math.round(
                  tasks.reduce((sum, task) => sum + task.completionPercentage, 0) /
                    tasks.length
                )
              : 0}
            %
          </p>
        </div>
      </div>

      {/* Lista Task */}
      <div className="space-y-3">
        {tasks.map((task) => {
          const isExpanded = expandedTasks.has(task.id);
          const hasSubtasks = task.subtasks && task.subtasks.length > 0;

          return (
            <div
              key={task.id}
              className="bg-slate-800/50 backdrop-blur-sm border border-indigo-500/20 rounded-xl overflow-hidden transition-all hover:border-indigo-500/40"
            >
              {/* Task Header */}
              <div
                className="p-4 cursor-pointer"
                onClick={() => hasSubtasks && toggleTaskExpansion(task.id)}
              >
                <div className="flex items-start justify-between gap-4">
                  {/* Info Task */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold text-white truncate">
                        {task.titolo}
                      </h3>
                      {task.activeSession && (
                        <span className="flex items-center gap-1 px-2 py-1 bg-green-500/20 text-green-400 text-xs font-semibold rounded-full">
                          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                          In corso
                        </span>
                      )}
                    </div>

                    {task.descrizione && (
                      <p className="text-sm text-gray-400 mb-2 line-clamp-2">
                        {task.descrizione}
                      </p>
                    )}

                    <div className="flex items-center gap-3 flex-wrap">
                      {/* Priorità */}
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded ${getPriorityColor(
                          task.priorita
                        )}`}
                      >
                        {getPriorityLabel(task.priorita)}
                      </span>

                      {/* Scadenza */}
                      {task.scadenza && (
                        <span className="text-xs text-gray-400">
                          Scadenza: {new Date(task.scadenza).toLocaleDateString('it-IT')}
                        </span>
                      )}

                      {/* Progetto */}
                      {task.progetto && (
                        <span
                          className="px-2 py-1 text-xs rounded"
                          style={{
                            backgroundColor: task.progetto.colore
                              ? `${task.progetto.colore}20`
                              : '#4B5563',
                            color: task.progetto.colore || '#9CA3AF',
                          }}
                        >
                          {task.progetto.nome}
                        </span>
                      )}

                      {/* Team */}
                      {task.team && (
                        <span
                          className="px-2 py-1 text-xs rounded"
                          style={{
                            backgroundColor: task.team.colore
                              ? `${task.team.colore}20`
                              : '#4B5563',
                            color: task.team.colore || '#9CA3AF',
                          }}
                        >
                          {task.team.nome}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Progress & Expand */}
                  <div className="flex flex-col items-end gap-2">
                    {/* Progress Bar */}
                    {hasSubtasks && (
                      <div className="flex items-center gap-2">
                        <div className="w-32 h-2 bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-indigo-600 to-purple-600 transition-all duration-300"
                            style={{ width: `${task.completionPercentage}%` }}
                          />
                        </div>
                        <span className="text-sm font-semibold text-indigo-400">
                          {task.completionPercentage}%
                        </span>
                      </div>
                    )}

                    {/* Subtasks count */}
                    {hasSubtasks && (
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        <span>
                          {task.completedSubtasks}/{task.totalSubtasks} subtask
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </div>
                    )}

                    {!hasSubtasks && (
                      <div className="flex items-center gap-2 text-sm text-amber-400">
                        <AlertCircle className="w-4 h-4" />
                        <span>Nessuna subtask</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Subtasks List */}
              {isExpanded && hasSubtasks && (
                <div className="px-4 pb-4 space-y-2 border-t border-indigo-500/20">
                  <div className="pt-4 space-y-2">
                    {task.subtasks.map((subtask) => (
                      <SubtaskItemWithTimer
                        key={subtask.id}
                        subtask={subtask}
                        onUpdate={loadTodayTasks}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TodayTasksList;
