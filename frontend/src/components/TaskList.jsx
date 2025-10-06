import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import CreateTaskModal from '../components/CreateTaskModal';
import TaskDetailModal from '../components/TaskDetailModal';

const TaskList = () => {
  const { token, user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('table');
  const [showModal, setShowModal] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [filters, setFilters] = useState({
    stato: '',
    priorita: '',
    search: ''
  });

  const stati = ['da_fare', 'in_corso', 'in_attesa', 'bloccata', 'completato'];
  const priorita = ['bassa', 'media', 'alta', 'critica'];

  useEffect(() => {
    fetchTasks();
  }, [token]);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:4000/api/tasks', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        // FIX: Accedi all'array tasks dentro l'oggetto data
        const taskArray = data.tasks || [];
        setTasks(taskArray);
        console.log('✅ Task caricati:', data);
      }
    } catch (error) {
      console.error('❌ Errore caricamento task:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filtra i task - ora tasks è garantito essere un array
  const filteredTasks = tasks.filter(task => {
    if (filters.stato && task.stato !== filters.stato) return false;
    if (filters.priorita && task.priorita !== filters.priorita) return false;
    if (filters.search && !task.titolo.toLowerCase().includes(filters.search.toLowerCase())) return false;
    return true;
  });

  const tasksByStatus = stati.reduce((acc, stato) => {
    acc[stato] = filteredTasks.filter(task => task.stato === stato);
    return acc;
  }, {});

  const statoLabels = {
    'da_fare': 'Da Fare',
    'in_corso': 'In Corso',
    'in_attesa': 'In Attesa',
    'bloccata': 'Bloccata',
    'completato': 'Completato'
  };

  const statoColors = {
    'da_fare': 'bg-gray-100 text-gray-800',
    'in_corso': 'bg-blue-100 text-blue-800',
    'in_attesa': 'bg-yellow-100 text-yellow-800',
    'bloccata': 'bg-red-100 text-red-800',
    'completato': 'bg-green-100 text-green-800'
  };

  const prioritaColors = {
    'bassa': 'bg-gray-200 text-gray-700',
    'media': 'bg-yellow-200 text-yellow-800',
    'alta': 'bg-orange-200 text-orange-800',
    'critica': 'bg-red-200 text-red-800'
  };

  const handleChangeStatus = async (taskId, newStatus) => {
    try {
      const response = await fetch(`http://localhost:4000/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ stato: newStatus })
      });

      if (response.ok) {
        fetchTasks();
        console.log('✅ Stato aggiornato');
      }
    } catch (error) {
      console.error('❌ Errore aggiornamento stato:', error);
    }
  };

  const handleDelete = async (taskId) => {
    if (!window.confirm('Sei sicuro di voler eliminare questo task?')) return;

    try {
      const response = await fetch(`http://localhost:4000/api/tasks/${taskId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        fetchTasks();
        console.log('✅ Task eliminato');
      }
    } catch (error) {
      console.error('❌ Errore eliminazione task:', error);
    }
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
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h2 className="text-2xl font-bold text-gray-800">Gestione Task</h2>
          
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('table')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                viewMode === 'table'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Tabella
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                viewMode === 'kanban'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Kanban
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
            >
              Nuovo Task
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <input
            type="text"
            placeholder="Cerca task..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          
          <select
            value={filters.stato}
            onChange={(e) => setFilters({ ...filters, stato: e.target.value })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            <option value="">Tutti gli stati</option>
            {stati.map(stato => (
              <option key={stato} value={stato}>{statoLabels[stato]}</option>
            ))}
          </select>

          <select
            value={filters.priorita}
            onChange={(e) => setFilters({ ...filters, priorita: e.target.value })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            <option value="">Tutte le priorità</option>
            {priorita.map(p => (
              <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
            ))}
          </select>
        </div>
      </div>

      {viewMode === 'table' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Titolo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stato
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Priorità
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Scadenza
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Azioni
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTasks.map(task => (
                  <tr key={task.id} className="hover:bg-gray-50 cursor-pointer">
                    <td 
                      className="px-6 py-4 whitespace-nowrap"
                      onClick={() => setSelectedTaskId(task.id)}
                    >
                      <div className="text-sm font-medium text-gray-900">{task.titolo}</div>
                      {task.descrizione && (
                        <div className="text-sm text-gray-500 truncate max-w-xs">{task.descrizione}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={task.stato}
                        onChange={(e) => handleChangeStatus(task.id, e.target.value)}
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${statoColors[task.stato]}`}
                      >
                        {stati.map(stato => (
                          <option key={stato} value={stato}>{statoLabels[stato]}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${prioritaColors[task.priorita]}`}>
                        {task.priorita.charAt(0).toUpperCase() + task.priorita.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {task.scadenza ? new Date(task.scadenza).toLocaleDateString('it-IT') : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(task.id);
                        }}
                        className="text-red-600 hover:text-red-900"
                      >
                        Elimina
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {viewMode === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {stati.map(stato => (
            <div key={stato} className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-bold text-gray-700 mb-4 flex items-center justify-between">
                <span>{statoLabels[stato]}</span>
                <span className="bg-white rounded-full w-6 h-6 flex items-center justify-center text-xs">
                  {tasksByStatus[stato].length}
                </span>
              </h3>
              
              <div className="space-y-3">
                {tasksByStatus[stato].map(task => (
                  <div 
                    key={task.id} 
                    className="bg-white rounded-lg p-4 shadow hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => setSelectedTaskId(task.id)}
                  >
                    <h4 className="font-semibold text-gray-800 mb-2">{task.titolo}</h4>
                    {task.descrizione && (
                      <p className="text-sm text-gray-600 mb-2 line-clamp-2">{task.descrizione}</p>
                    )}
                    <div className="flex items-center justify-between">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${prioritaColors[task.priorita]}`}>
                        {task.priorita}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(task.id);
                        }}
                        className="text-red-600 hover:text-red-900"
                      >
                        Elimina
                      </button>
                    </div>
                    {task.scadenza && (
                      <div className="text-xs text-gray-500 mt-2">
                        {new Date(task.scadenza).toLocaleDateString('it-IT')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {filteredTasks.length === 0 && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="text-6xl mb-4">📭</div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">Nessun task trovato</h3>
          <p className="text-gray-500">Crea il tuo primo task per iniziare!</p>
        </div>
      )}

      <CreateTaskModal 
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onTaskCreated={fetchTasks}
      />

      <TaskDetailModal
        taskId={selectedTaskId}
        isOpen={!!selectedTaskId}
        onClose={() => setSelectedTaskId(null)}
        onTaskUpdated={fetchTasks}
      />
    </div>
  );
};

export default TaskList;