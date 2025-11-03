import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

const TaskDetailModal = ({ taskId, isOpen, onClose, onTaskUpdated }) => {
  const { token, user } = useAuth();
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('details'); // details, comments, checklist, history
  const [comment, setComment] = useState('');
  const [checklistItem, setChecklistItem] = useState('');
  const [checklist, setChecklist] = useState([]);
  const [comments, setComments] = useState([]);

  useEffect(() => {
    if (isOpen && taskId) {
      fetchTaskDetails();
      fetchComments();
    }
  }, [isOpen, taskId]);

  const fetchTaskDetails = async () => {
    try {
      const response = await api.get(`/tasks/${taskId}`);
      setTask(response.data);
      setChecklist(response.data.checklist || []);
    } catch (error) {
      console.error('❌ Errore caricamento task:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async () => {
    try {
      const response = await api.get(`/tasks/${taskId}/comments`);
      setComments(response.data);
    } catch (error) {
      console.error('❌ Errore caricamento commenti:', error);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;

    try {
      await api.post(`/tasks/${taskId}/comments`, { contenuto: comment });
      setComment('');
      fetchComments();
    } catch (error) {
      console.error('❌ Errore aggiunta commento:', error);
    }
  };

  const handleAddChecklistItem = () => {
    if (!checklistItem.trim()) return;
    
    const newChecklist = [...checklist, { text: checklistItem, completed: false, id: Date.now() }];
    setChecklist(newChecklist);
    setChecklistItem('');
    updateTaskChecklist(newChecklist);
  };

  const handleToggleChecklistItem = (itemId) => {
    const newChecklist = checklist.map(item => 
      item.id === itemId ? { ...item, completed: !item.completed } : item
    );
    setChecklist(newChecklist);
    updateTaskChecklist(newChecklist);
  };

  const handleDeleteChecklistItem = (itemId) => {
    const newChecklist = checklist.filter(item => item.id !== itemId);
    setChecklist(newChecklist);
    updateTaskChecklist(newChecklist);
  };

  const updateTaskChecklist = async (newChecklist) => {
    try {
      await api.put(`/tasks/${taskId}`, { checklist: newChecklist });
    } catch (error) {
      console.error('❌ Errore aggiornamento checklist:', error);
    }
  };

  const handleUpdateField = async (field, value) => {
    try {
      await api.put(`/tasks/${taskId}`, { [field]: value });
      fetchTaskDetails();
      onTaskUpdated?.();
    } catch (error) {
      console.error('❌ Errore aggiornamento task:', error);
    }
  };

  if (!isOpen) return null;

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Caricamento...</p>
        </div>
      </div>
    );
  }

  const completedItems = checklist.filter(item => item.completed).length;
  const progressPercentage = checklist.length > 0 ? (completedItems / checklist.length) * 100 : 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full my-8">
        {/* Header */}
        <div className="bg-indigo-600 text-white px-6 py-4 rounded-t-xl flex justify-between items-start">
          <div className="flex-1">
            <input
              type="text"
              value={task?.titolo || ''}
              onChange={(e) => setTask({ ...task, titolo: e.target.value })}
              onBlur={(e) => handleUpdateField('titolo', e.target.value)}
              className="text-2xl font-bold bg-transparent border-none outline-none w-full text-white placeholder-indigo-200"
              placeholder="Titolo task..."
            />
            <div className="flex gap-3 mt-2 flex-wrap">
              <select
                value={task?.stato || 'da_fare'}
                onChange={(e) => handleUpdateField('stato', e.target.value)}
                className="px-3 py-1 rounded-full text-sm font-semibold bg-white text-indigo-600"
              >
                <option value="da_fare">Da Fare</option>
                <option value="in_corso">In Corso</option>
                <option value="in_attesa">In Attesa</option>
                <option value="bloccata">Bloccata</option>
                <option value="completato">Completato</option>
              </select>
              
              <select
                value={task?.priorita || 'media'}
                onChange={(e) => handleUpdateField('priorita', e.target.value)}
                className="px-3 py-1 rounded-full text-sm font-semibold bg-white text-orange-600"
              >
                <option value="bassa">Bassa</option>
                <option value="media">Media</option>
                <option value="alta">Alta</option>
                <option value="critica">Critica</option>
              </select>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 text-2xl ml-4"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 px-6">
          <div className="flex gap-6">
            {[
              { id: 'details', label: '📝 Dettagli', icon: '📝' },
              { id: 'checklist', label: `✓ Checklist (${completedItems}/${checklist.length})`, icon: '✓' },
              { id: 'comments', label: `💬 Commenti (${comments.length})`, icon: '💬' },
              { id: 'history', label: '📜 Storia', icon: '📜' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-3 px-2 font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {/* Tab: Dettagli */}
          {activeTab === 'details' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descrizione
                </label>
                <textarea
                  value={task?.descrizione || ''}
                  onChange={(e) => setTask({ ...task, descrizione: e.target.value })}
                  onBlur={(e) => handleUpdateField('descrizione', e.target.value)}
                  rows="6"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Aggiungi una descrizione..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    📅 Scadenza
                  </label>
                  <input
                    type="date"
                    value={task?.scadenza?.split('T')[0] || ''}
                    onChange={(e) => handleUpdateField('scadenza', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    🎯 Difficoltà (1-5)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="1"
                      max="5"
                      value={task?.difficolta || 3}
                      onChange={(e) => handleUpdateField('difficolta', parseInt(e.target.value))}
                      className="flex-1"
                    />
                    <span className="text-lg font-bold text-indigo-600 min-w-[2rem] text-center">
                      {task?.difficolta || 3}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  📎 Allegati
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <p className="text-gray-500">Funzionalità allegati in arrivo...</p>
                </div>
              </div>
            </div>
          )}

          {/* Tab: Checklist */}
          {activeTab === 'checklist' && (
            <div className="space-y-4">
              {/* Progress Bar */}
              {checklist.length > 0 && (
                <div className="mb-6">
                  <div className="flex justify-between text-sm text-gray-600 mb-2">
                    <span>Progresso</span>
                    <span>{Math.round(progressPercentage)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-green-500 h-3 rounded-full transition-all duration-300"
                      style={{ width: `${progressPercentage}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {/* Add Checklist Item */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={checklistItem}
                  onChange={(e) => setChecklistItem(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddChecklistItem()}
                  placeholder="Aggiungi un elemento alla checklist..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                <button
                  onClick={handleAddChecklistItem}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  ➕ Aggiungi
                </button>
              </div>

              {/* Checklist Items */}
              <div className="space-y-2">
                {checklist.map(item => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={item.completed}
                      onChange={() => handleToggleChecklistItem(item.id)}
                      className="w-5 h-5 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500"
                    />
                    <span className={`flex-1 ${item.completed ? 'line-through text-gray-500' : 'text-gray-800'}`}>
                      {item.text}
                    </span>
                    <button
                      onClick={() => handleDeleteChecklistItem(item.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              </div>

              {checklist.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-4xl mb-2">✓</div>
                  <p>Nessun elemento nella checklist</p>
                </div>
              )}
            </div>
          )}

          {/* Tab: Commenti */}
          {activeTab === 'comments' && (
            <div className="space-y-4">
              {/* Add Comment */}
              <form onSubmit={handleAddComment} className="space-y-2">
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Scrivi un commento..."
                  rows="3"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                  >
                    💬 Aggiungi Commento
                  </button>
                </div>
              </form>

              {/* Comments List */}
              <div className="space-y-3">
                {comments.map(comm => (
                  <div key={comm.id} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center font-semibold">
                          {comm.autore?.nome?.[0]}{comm.autore?.cognome?.[0]}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800">
                            {comm.autore?.nome} {comm.autore?.cognome}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(comm.createdAt).toLocaleString('it-IT')}
                          </p>
                        </div>
                      </div>
                    </div>
                    <p className="text-gray-700 whitespace-pre-wrap">{comm.contenuto}</p>
                  </div>
                ))}
              </div>

              {comments.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-4xl mb-2">💬</div>
                  <p>Nessun commento ancora</p>
                </div>
              )}
            </div>
          )}

          {/* Tab: Storia */}
          {activeTab === 'history' && (
            <div className="space-y-3">
              <div className="text-center py-8 text-gray-500">
                <div className="text-4xl mb-2">📜</div>
                <p>Storia delle modifiche in arrivo...</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 flex justify-between items-center">
          <div className="text-sm text-gray-500">
            Creato: {task?.createdAt ? new Date(task.createdAt).toLocaleString('it-IT') : '-'}
          </div>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
};

export default TaskDetailModal;