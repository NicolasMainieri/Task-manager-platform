import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

const CreateTaskModal = ({ isOpen, onClose, onTaskCreated }) => {
  const { token, user } = useAuth();
  const [formData, setFormData] = useState({
    titolo: '',
    descrizione: '',
    stato: 'da_fare',
    priorita: 'media',
    scadenza: '',
    difficolta: 3
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:4000/api/tasks', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          creato_da: user.id,
          assegnato_a: user.id // Per ora assegna a se stesso
        })
      });

      if (response.ok) {
        const newTask = await response.json();
        console.log('✅ Task creato:', newTask);
        
        // Reset form
        setFormData({
          titolo: '',
          descrizione: '',
          stato: 'da_fare',
          priorita: 'media',
          scadenza: '',
          difficolta: 3
        });
        
        onTaskCreated(); // Callback per ricaricare la lista
        onClose();
      } else {
        const data = await response.json();
        setError(data.message || 'Errore nella creazione del task');
      }
    } catch (err) {
      console.error('❌ Errore creazione task:', err);
      setError('Errore di connessione al server');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-indigo-600 text-white px-6 py-4 rounded-t-xl flex justify-between items-center">
          <h2 className="text-2xl font-bold">➕ Nuovo Task</h2>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 text-2xl"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Titolo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Titolo *
            </label>
            <input
              type="text"
              name="titolo"
              value={formData.titolo}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Es: Implementare login utente"
            />
          </div>

          {/* Descrizione */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descrizione
            </label>
            <textarea
              name="descrizione"
              value={formData.descrizione}
              onChange={handleChange}
              rows="4"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Descrivi il task in dettaglio..."
            />
          </div>

          {/* Riga 1: Stato e Priorità */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Stato
              </label>
              <select
                name="stato"
                value={formData.stato}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="da_fare">Da Fare</option>
                <option value="in_corso">In Corso</option>
                <option value="in_attesa">In Attesa</option>
                <option value="bloccata">Bloccata</option>
                <option value="completato">Completato</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Priorità
              </label>
              <select
                name="priorita"
                value={formData.priorita}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="bassa">Bassa</option>
                <option value="media">Media</option>
                <option value="alta">Alta</option>
                <option value="critica">Critica</option>
              </select>
            </div>
          </div>

          {/* Riga 2: Scadenza e Difficoltà */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Scadenza
              </label>
              <input
                type="date"
                name="scadenza"
                value={formData.scadenza}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Difficoltà (1-5)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  name="difficolta"
                  min="1"
                  max="5"
                  value={formData.difficolta}
                  onChange={handleChange}
                  className="w-full"
                />
                <span className="text-lg font-bold text-indigo-600 min-w-[2rem] text-center">
                  {formData.difficolta}
                </span>
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Facile</span>
                <span>Difficile</span>
              </div>
            </div>
          </div>

          {/* Bottoni */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium transition-colors"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creazione...' : '✓ Crea Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateTaskModal;