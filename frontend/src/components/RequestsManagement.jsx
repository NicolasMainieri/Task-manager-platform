import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

const RequestsManagement = () => {
  const { token, user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [formData, setFormData] = useState({
    tipo: 'chiarimento',
    urgenza: 'media',
    descrizione: '',
    task_id: ''
  });
  const [tasks, setTasks] = useState([]);

  const tipoRichieste = {
    chiarimento: 'Chiarimento',
    estensione: 'Estensione Scadenza',
    risorse: 'Richiesta Risorse',
    segnalazione: 'Segnalazione'
  };

  const urgenzaColors = {
    bassa: 'bg-gray-100 text-gray-800',
    media: 'bg-yellow-100 text-yellow-800',
    alta: 'bg-orange-100 text-orange-800',
    critica: 'bg-red-100 text-red-800'
  };

  const statoColors = {
    aperta: 'bg-blue-100 text-blue-800',
    in_lavorazione: 'bg-yellow-100 text-yellow-800',
    risolta: 'bg-green-100 text-green-800',
    rifiutata: 'bg-red-100 text-red-800'
  };

  useEffect(() => {
    fetchRequests();
    fetchTasks();
  }, []);

  const fetchRequests = async () => {
    try {
      const response = await fetch('http://localhost:4000/api/requests', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setRequests(data);
      }
    } catch (error) {
      console.error('❌ Errore caricamento richieste:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTasks = async () => {
    try {
      const response = await fetch('http://localhost:4000/api/tasks', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setTasks(data);
      }
    } catch (error) {
      console.error('❌ Errore caricamento task:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch('http://localhost:4000/api/requests', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          autore_id: user.id
        })
      });

      if (response.ok) {
        fetchRequests();
        setShowModal(false);
        setFormData({
          tipo: 'chiarimento',
          urgenza: 'media',
          descrizione: '',
          task_id: ''
        });
      }
    } catch (error) {
      console.error('❌ Errore creazione richiesta:', error);
    }
  };

  const handleUpdateStatus = async (requestId, newStatus) => {
    try {
      const response = await fetch(`http://localhost:4000/api/requests/${requestId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ stato: newStatus })
      });

      if (response.ok) {
        fetchRequests();
      }
    } catch (error) {
      console.error('❌ Errore aggiornamento stato:', error);
    }
  };

  const handleConvertToTask = async (request) => {
    if (!window.confirm('Convertire questa richiesta in un task?')) return;

    try {
      const response = await fetch('http://localhost:4000/api/tasks', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          titolo: `[Richiesta] ${tipoRichieste[request.tipo]}`,
          descrizione: request.descrizione,
          stato: 'da_fare',
          priorita: request.urgenza,
          creato_da: user.id,
          assegnato_a: request.autore_id
        })
      });

      if (response.ok) {
        await handleUpdateStatus(request.id, 'risolta');
        alert('✅ Richiesta convertita in task!');
      }
    } catch (error) {
      console.error('❌ Errore conversione in task:', error);
    }
  };

  const handleDelete = async (requestId) => {
    if (!window.confirm('Sei sicuro di voler eliminare questa richiesta?')) return;

    try {
      const response = await fetch(`http://localhost:4000/api/requests/${requestId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        fetchRequests();
      }
    } catch (error) {
      console.error('❌ Errore eliminazione richiesta:', error);
    }
  };

  const getTaskTitle = (taskId) => {
    const task = tasks.find(t => t.id === taskId);
    return task ? task.titolo : '-';
  };

  const isAdmin = user?.ruolo === 'admin' || user?.ruolo === 'manager';

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
            <h2 className="text-2xl font-bold text-gray-800">📬 Richieste Dipendenti</h2>
            <p className="text-gray-600 mt-1">
              {requests.filter(r => r.stato === 'aperta').length} richieste in attesa
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
          >
            ➕ Nuova Richiesta
          </button>
        </div>
      </div>

      {/* Tabella Richieste */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tipo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Descrizione
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Urgenza
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stato
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Data
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Azioni
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {requests.map(request => (
                <tr key={request.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-medium text-gray-900">
                      {tipoRichieste[request.tipo]}
                    </span>
                    {request.task_id && (
                      <div className="text-xs text-gray-500">
                        Task: {getTaskTitle(request.task_id)}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 max-w-md truncate">
                      {request.descrizione}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Da: {request.autore?.nome} {request.autore?.cognome}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${urgenzaColors[request.urgenza]}`}>
                      {request.urgenza}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {isAdmin ? (
                      <select
                        value={request.stato}
                        onChange={(e) => handleUpdateStatus(request.id, e.target.value)}
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${statoColors[request.stato]}`}
                      >
                        <option value="aperta">Aperta</option>
                        <option value="in_lavorazione">In Lavorazione</option>
                        <option value="risolta">Risolta</option>
                        <option value="rifiutata">Rifiutata</option>
                      </select>
                    ) : (
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statoColors[request.stato]}`}>
                        {request.stato.replace('_', ' ')}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(request.createdAt).toLocaleDateString('it-IT')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {isAdmin && request.stato === 'aperta' && (
                      <button
                        onClick={() => handleConvertToTask(request)}
                        className="text-green-600 hover:text-green-900 mr-4"
                        title="Converti in Task"
                      >
                        ✓
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setSelectedRequest(request);
                      }}
                      className="text-blue-600 hover:text-blue-900 mr-4"
                    >
                      👁️
                    </button>
                    <button
                      onClick={() => handleDelete(request.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {requests.length === 0 && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="text-6xl mb-4">📬</div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">Nessuna richiesta</h3>
          <p className="text-gray-500">Crea una nuova richiesta per iniziare!</p>
        </div>
      )}

      {/* Modal Nuova Richiesta */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full">
            <div className="bg-indigo-600 text-white px-6 py-4 rounded-t-xl flex justify-between items-center">
              <h2 className="text-xl font-bold">➕ Nuova Richiesta</h2>
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
                  Tipo di Richiesta *
                </label>
                <select
                  value={formData.tipo}
                  onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  {Object.entries(tipoRichieste).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Urgenza *
                </label>
                <select
                  value={formData.urgenza}
                  onChange={(e) => setFormData({ ...formData, urgenza: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="bassa">Bassa</option>
                  <option value="media">Media</option>
                  <option value="alta">Alta</option>
                  <option value="critica">Critica</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Task Correlato (opzionale)
                </label>
                <select
                  value={formData.task_id}
                  onChange={(e) => setFormData({ ...formData, task_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="">Nessun task</option>
                  {tasks.map(task => (
                    <option key={task.id} value={task.id}>{task.titolo}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descrizione *
                </label>
                <textarea
                  value={formData.descrizione}
                  onChange={(e) => setFormData({ ...formData, descrizione: e.target.value })}
                  required
                  rows="5"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Descrivi la tua richiesta in dettaglio..."
                />
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
                  ✓ Invia Richiesta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Dettaglio Richiesta */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full">
            <div className="bg-indigo-600 text-white px-6 py-4 rounded-t-xl flex justify-between items-center">
              <h2 className="text-xl font-bold">📬 Dettaglio Richiesta</h2>
              <button
                onClick={() => setSelectedRequest(null)}
                className="text-white hover:text-gray-200 text-2xl"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    Tipo
                  </label>
                  <p className="text-gray-900 font-semibold">
                    {tipoRichieste[selectedRequest.tipo]}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    Urgenza
                  </label>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${urgenzaColors[selectedRequest.urgenza]}`}>
                    {selectedRequest.urgenza}
                  </span>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    Stato
                  </label>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statoColors[selectedRequest.stato]}`}>
                    {selectedRequest.stato.replace('_', ' ')}
                  </span>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    Data Creazione
                  </label>
                  <p className="text-gray-900">
                    {new Date(selectedRequest.createdAt).toLocaleString('it-IT')}
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">
                  Richiesto da
                </label>
                <p className="text-gray-900 font-semibold">
                  {selectedRequest.autore?.nome} {selectedRequest.autore?.cognome}
                </p>
                <p className="text-sm text-gray-600">{selectedRequest.autore?.email}</p>
              </div>

              {selectedRequest.task_id && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    Task Correlato
                  </label>
                  <p className="text-gray-900">{getTaskTitle(selectedRequest.task_id)}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">
                  Descrizione
                </label>
                <div className="bg-gray-50 rounded-lg p-4 text-gray-900 whitespace-pre-wrap">
                  {selectedRequest.descrizione}
                </div>
              </div>

              {isAdmin && selectedRequest.stato === 'aperta' && (
                <div className="border-t pt-4">
                  <button
                    onClick={() => {
                      handleConvertToTask(selectedRequest);
                      setSelectedRequest(null);
                    }}
                    className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                  >
                    ✓ Converti in Task
                  </button>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setSelectedRequest(null)}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
                >
                  Chiudi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RequestsManagement;