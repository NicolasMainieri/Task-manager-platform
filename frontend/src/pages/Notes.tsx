import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  FileText,
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  Save,
  Pin,
  Star,
  Archive,
  Tag,
  Filter,
  Grid,
  List,
  Share2
} from 'lucide-react';

const API_URL = 'http://localhost:4000/api';

interface Note {
  id: string;
  titolo: string;
  contenuto: string;
  categoria?: string;
  colore?: string;
  tags: string;
  isPublic: boolean;
  sharedWith: string;
  isPinned: boolean;
  isFavorite: boolean;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  autore: {
    id: string;
    nome: string;
    cognome: string;
  };
}

const Notes: React.FC = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showArchived, setShowArchived] = useState(false);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    titolo: '',
    contenuto: '',
    categoria: '',
    colore: '#3B82F6',
    tags: [] as string[],
    isPublic: false,
  });

  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchNotes();
    fetchCategories();
  }, [showArchived]);

  const fetchNotes = async () => {
    try {
      const response = await axios.get(`${API_URL}/notes`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { isArchived: showArchived }
      });
      setNotes(response.data);
    } catch (error) {
      console.error('Error fetching notes:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API_URL}/notes/categories`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleCreateNote = async () => {
    try {
      const response = await axios.post(
        `${API_URL}/notes`,
        {
          ...formData,
          tags: JSON.stringify(formData.tags)
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNotes([response.data, ...notes]);
      resetForm();
      setShowEditor(false);
    } catch (error) {
      console.error('Error creating note:', error);
    }
  };

  const handleUpdateNote = async () => {
    if (!selectedNote) return;

    try {
      const response = await axios.put(
        `${API_URL}/notes/${selectedNote.id}`,
        {
          ...formData,
          tags: JSON.stringify(formData.tags)
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNotes(notes.map(n => (n.id === selectedNote.id ? response.data : n)));
      resetForm();
      setShowEditor(false);
      setSelectedNote(null);
    } catch (error) {
      console.error('Error updating note:', error);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm('Sei sicuro di voler eliminare questa nota?')) return;

    try {
      await axios.delete(`${API_URL}/notes/${noteId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotes(notes.filter(n => n.id !== noteId));
    } catch (error) {
      console.error('Error deleting note:', error);
    }
  };

  const handleTogglePin = async (note: Note) => {
    try {
      const response = await axios.put(
        `${API_URL}/notes/${note.id}`,
        { isPinned: !note.isPinned },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNotes(notes.map(n => (n.id === note.id ? response.data : n)));
    } catch (error) {
      console.error('Error toggling pin:', error);
    }
  };

  const handleToggleFavorite = async (note: Note) => {
    try {
      const response = await axios.put(
        `${API_URL}/notes/${note.id}`,
        { isFavorite: !note.isFavorite },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNotes(notes.map(n => (n.id === note.id ? response.data : n)));
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  const handleToggleArchive = async (note: Note) => {
    try {
      const response = await axios.put(
        `${API_URL}/notes/${note.id}`,
        { isArchived: !note.isArchived },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNotes(notes.filter(n => n.id !== note.id));
    } catch (error) {
      console.error('Error toggling archive:', error);
    }
  };

  const editNote = (note: Note) => {
    setSelectedNote(note);
    setFormData({
      titolo: note.titolo,
      contenuto: note.contenuto,
      categoria: note.categoria || '',
      colore: note.colore || '#3B82F6',
      tags: JSON.parse(note.tags || '[]'),
      isPublic: note.isPublic
    });
    setShowEditor(true);
  };

  const resetForm = () => {
    setFormData({
      titolo: '',
      contenuto: '',
      categoria: '',
      colore: '#3B82F6',
      tags: [],
      isPublic: false
    });
    setSelectedNote(null);
  };

  const filteredNotes = notes.filter(note => {
    const matchesSearch = note.titolo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.contenuto.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || note.categoria === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const colors = [
    { name: 'Blu', value: '#3B82F6' },
    { name: 'Verde', value: '#10B981' },
    { name: 'Giallo', value: '#F59E0B' },
    { name: 'Rosso', value: '#EF4444' },
    { name: 'Viola', value: '#8B5CF6' },
    { name: 'Rosa', value: '#EC4899' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <FileText className="w-8 h-8 text-indigo-400" />
              Note
            </h1>
            <p className="text-gray-400 mt-1">Organizza i tuoi pensieri e idee</p>
          </div>

          <button
            onClick={() => {
              resetForm();
              setShowEditor(true);
            }}
            className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white px-6 py-3 rounded-lg flex items-center gap-2 transition shadow-lg shadow-indigo-500/50"
          >
            <Plus className="w-5 h-5" />
            Nuova Nota
          </button>
        </div>

        {/* Filters */}
        <div className="bg-slate-800/50 border border-indigo-500/20 rounded-2xl p-6 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            {/* Search */}
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cerca note..."
                  className="w-full bg-slate-900/50 border border-indigo-500/20 rounded-lg pl-10 pr-4 py-2 text-white focus:outline-none focus:border-indigo-500/50"
                />
              </div>
            </div>

            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-slate-900/50 border border-indigo-500/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500/50"
            >
              <option value="all">Tutte le categorie</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

            {/* Archive Toggle */}
            <button
              onClick={() => setShowArchived(!showArchived)}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 transition ${
                showArchived
                  ? 'bg-indigo-500 text-white'
                  : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
              }`}
            >
              <Archive className="w-4 h-4" />
              {showArchived ? 'Archiviate' : 'Attive'}
            </button>

            {/* View Mode */}
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition ${
                  viewMode === 'grid'
                    ? 'bg-indigo-500 text-white'
                    : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                }`}
              >
                <Grid className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition ${
                  viewMode === 'list'
                    ? 'bg-indigo-500 text-white'
                    : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                }`}
              >
                <List className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Notes Grid/List */}
        {loading ? (
          <div className="text-center text-gray-400 py-12">Caricamento...</div>
        ) : filteredNotes.length === 0 ? (
          <div className="text-center text-gray-400 py-12">
            <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p>Nessuna nota trovata</p>
          </div>
        ) : (
          <div
            className={
              viewMode === 'grid'
                ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
                : 'space-y-4'
            }
          >
            {filteredNotes.map(note => (
              <div
                key={note.id}
                className="bg-slate-800/50 border border-indigo-500/20 rounded-xl p-4 hover:border-indigo-500/40 transition"
                style={{ borderLeftColor: note.colore, borderLeftWidth: '4px' }}
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-lg font-semibold text-white flex-1">{note.titolo}</h3>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleTogglePin(note)}
                      className={`p-1 rounded transition ${
                        note.isPinned ? 'text-yellow-400' : 'text-gray-400 hover:text-yellow-400'
                      }`}
                    >
                      <Pin className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleToggleFavorite(note)}
                      className={`p-1 rounded transition ${
                        note.isFavorite ? 'text-red-400' : 'text-gray-400 hover:text-red-400'
                      }`}
                    >
                      <Star className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <p className="text-gray-300 text-sm mb-3 line-clamp-3">{note.contenuto}</p>

                {note.categoria && (
                  <span className="inline-block bg-indigo-500/20 text-indigo-300 text-xs px-2 py-1 rounded mb-3">
                    {note.categoria}
                  </span>
                )}

                <div className="flex items-center justify-between pt-3 border-t border-slate-700">
                  <span className="text-xs text-gray-500">
                    {new Date(note.updatedAt).toLocaleDateString('it-IT')}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => editNote(note)}
                      className="text-indigo-400 hover:text-indigo-300 transition"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleToggleArchive(note)}
                      className="text-gray-400 hover:text-gray-300 transition"
                    >
                      <Archive className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteNote(note.id)}
                      className="text-red-400 hover:text-red-300 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Editor Modal */}
      {showEditor && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-indigo-500/20 rounded-2xl p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-6">
              <h3 className="text-2xl font-bold text-white">
                {selectedNote ? 'Modifica Nota' : 'Nuova Nota'}
              </h3>
              <button
                onClick={() => {
                  setShowEditor(false);
                  resetForm();
                }}
                className="p-2 hover:bg-white/10 rounded-lg transition"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="text-gray-400 text-sm font-semibold mb-2 block">Titolo *</label>
                <input
                  type="text"
                  value={formData.titolo}
                  onChange={(e) => setFormData({ ...formData, titolo: e.target.value })}
                  className="w-full bg-slate-900/50 border border-indigo-500/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-indigo-500/50 transition"
                  placeholder="Titolo della nota..."
                />
              </div>

              <div>
                <label className="text-gray-400 text-sm font-semibold mb-2 block">Contenuto</label>
                <textarea
                  value={formData.contenuto}
                  onChange={(e) => setFormData({ ...formData, contenuto: e.target.value })}
                  className="w-full bg-slate-900/50 border border-indigo-500/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-indigo-500/50 transition resize-none"
                  placeholder="Scrivi qui il contenuto della nota..."
                  rows={12}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-gray-400 text-sm font-semibold mb-2 block">Categoria</label>
                  <input
                    type="text"
                    value={formData.categoria}
                    onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                    className="w-full bg-slate-900/50 border border-indigo-500/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-indigo-500/50 transition"
                    placeholder="Es: Lavoro, Personale..."
                  />
                </div>

                <div>
                  <label className="text-gray-400 text-sm font-semibold mb-2 block">Colore</label>
                  <div className="flex gap-2">
                    {colors.map(color => (
                      <button
                        key={color.value}
                        onClick={() => setFormData({ ...formData, colore: color.value })}
                        className={`w-10 h-10 rounded-lg transition ${
                          formData.colore === color.value ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-800' : ''
                        }`}
                        style={{ backgroundColor: color.value }}
                        title={color.name}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isPublic"
                  checked={formData.isPublic}
                  onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })}
                  className="w-4 h-4 rounded"
                />
                <label htmlFor="isPublic" className="text-gray-300 text-sm">
                  Rendi questa nota pubblica (visibile a tutti nella company)
                </label>
              </div>

              <div className="flex gap-3 pt-4 border-t border-indigo-500/20">
                <button
                  onClick={() => {
                    setShowEditor(false);
                    resetForm();
                  }}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-white px-4 py-3 rounded-lg transition"
                >
                  Annulla
                </button>
                <button
                  onClick={selectedNote ? handleUpdateNote : handleCreateNote}
                  disabled={!formData.titolo}
                  className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white px-4 py-3 rounded-lg transition shadow-lg shadow-indigo-500/50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Save className="w-5 h-5" />
                  {selectedNote ? 'Salva Modifiche' : 'Crea Nota'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Notes;
