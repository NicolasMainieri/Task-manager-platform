import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  FileText,
  Plus,
  Search,
  Edit2,
  Trash2,
  Pin,
  Star,
  Archive,
  Table,
  Palette,
  Home,
  ChevronRight,
  Clock,
  Sparkles,
  Loader2,
  ListChecks,
  Link2
} from 'lucide-react';
import SpreadsheetNote from '../components/SpreadsheetNote';
import RichTextNote from '../components/RichTextNote';
import WhiteboardNote from '../components/WhiteboardNote';

const API_URL = 'http://localhost:4000/api';

interface Note {
  id: string;
  titolo: string;
  tipo: string;
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

export type ViewType = 'home' | 'text' | 'spreadsheet' | 'whiteboard' | 'favorites' | 'archived';

export interface NotesCounts {
  total: number;
  text: number;
  spreadsheet: number;
  whiteboard: number;
  favorites: number;
  archived: number;
}

export { ViewType, NotesCounts };

interface NotesCompleteProps {
  view?: ViewType;
  onViewChange?: (view: ViewType) => void;
  onCountsChange?: (counts: NotesCounts) => void;
}

const NotesComplete: React.FC<NotesCompleteProps> = ({ view = 'home', onViewChange, onCountsChange }) => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeView, setActiveView] = useState<ViewType>(view);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingNote, setEditingNote] = useState<Note | null>(null);

  // AI states
  const [aiSummarizing, setAiSummarizing] = useState(false);
  const [aiExtractingActions, setAiExtractingActions] = useState(false);
  const [aiFindingRelated, setAiFindingRelated] = useState(false);

  useEffect(() => {
    setActiveView(view);

    // Create default note when switching to a specific type view
    if (view !== 'home' && view !== activeView) {
      const typeNotes = notes.filter(n => n.tipo === view);
      if (typeNotes.length === 0) {
        // Auto-create first note of this type
        createNote(view as 'text' | 'spreadsheet' | 'whiteboard');
      } else if (!selectedNote || selectedNote.tipo !== view) {
        // Select the first note of this type
        setSelectedNote(typeNotes[0]);
      }
    }
  }, [view]);

  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchNotes();
  }, [showArchived]);

  // Update counts when notes change
  useEffect(() => {
    if (onCountsChange) {
      onCountsChange({
        total: notes.filter(n => !n.isArchived).length,
        text: notes.filter(n => n.tipo === 'text' && !n.isArchived).length,
        spreadsheet: notes.filter(n => n.tipo === 'spreadsheet' && !n.isArchived).length,
        whiteboard: notes.filter(n => n.tipo === 'whiteboard' && !n.isArchived).length,
        favorites: notes.filter(n => n.isFavorite && !n.isArchived).length,
        archived: notes.filter(n => n.isArchived).length
      });
    }
  }, [notes, onCountsChange]);

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

  const createNote = async (tipo: 'text' | 'spreadsheet' | 'whiteboard') => {
    try {
      const response = await axios.post(
        `${API_URL}/notes`,
        {
          titolo: `Nuova ${tipo === 'text' ? 'Nota' : tipo === 'spreadsheet' ? 'Foglio di Calcolo' : 'Lavagna'}`,
          tipo,
          contenuto: '',
          tags: '[]'
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNotes([response.data, ...notes]);
      setSelectedNote(response.data);
    } catch (error) {
      console.error('Error creating note:', error);
    }
  };

  const updateNote = async (noteId: string, updates: Partial<Note>) => {
    try {
      const response = await axios.put(
        `${API_URL}/notes/${noteId}`,
        updates,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNotes(notes.map(n => (n.id === noteId ? response.data : n)));
      if (selectedNote?.id === noteId) {
        setSelectedNote(response.data);
      }
    } catch (error) {
      console.error('Error updating note:', error);
    }
  };

  const deleteNote = async (noteId: string) => {
    if (!confirm('Eliminare questa nota?')) return;
    try {
      await axios.delete(`${API_URL}/notes/${noteId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotes(notes.filter(n => n.id !== noteId));
      if (selectedNote?.id === noteId) setSelectedNote(null);
    } catch (error) {
      console.error('Error deleting note:', error);
    }
  };

  const getFilteredNotes = (tipo?: string) => {
    let filtered = notes.filter(n =>
      n.titolo.toLowerCase().includes(searchQuery.toLowerCase())
    );
    if (tipo) filtered = filtered.filter(n => n.tipo === tipo);
    return filtered.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  };

  // AI: Summarize Note
  const handleAISummarize = async () => {
    if (!selectedNote || !selectedNote.contenuto) {
      alert('Nessun contenuto da riassumere');
      return;
    }

    setAiSummarizing(true);
    try {
      const response = await axios.post(
        `${API_URL}/ai/notes/summarize`,
        {
          titolo: selectedNote.titolo,
          contenuto: selectedNote.contenuto
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data) {
        alert(`📝 Riassunto AI:\n\n${response.data.riassunto}\n\nPunti Chiave:\n${response.data.punti_chiave.map((p: string, i: number) => `${i + 1}. ${p}`).join('\n')}`);
      }
    } catch (error) {
      console.error('Errore riassunto AI:', error);
      alert('Errore nel creare il riassunto AI');
    } finally {
      setAiSummarizing(false);
    }
  };

  // AI: Extract Action Items
  const handleAIExtractActions = async () => {
    if (!selectedNote || !selectedNote.contenuto) {
      alert('Nessun contenuto da analizzare');
      return;
    }

    setAiExtractingActions(true);
    try {
      const response = await axios.post(
        `${API_URL}/ai/notes/extract-actions`,
        {
          titolo: selectedNote.titolo,
          contenuto: selectedNote.contenuto
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data && response.data.azioni) {
        if (response.data.azioni.length === 0) {
          alert('Nessuna azione trovata nella nota');
        } else {
          let message = '✅ Action Items Trovati:\n\n';
          response.data.azioni.forEach((azione: any, index: number) => {
            message += `${index + 1}. ${azione.descrizione}\n`;
            if (azione.priorita) message += `   Priorità: ${azione.priorita}\n`;
            if (azione.scadenza) message += `   Scadenza: ${azione.scadenza}\n`;
            message += '\n';
          });
          alert(message);
        }
      }
    } catch (error) {
      console.error('Errore estrazione azioni AI:', error);
      alert('Errore nell\'estrazione delle azioni AI');
    } finally {
      setAiExtractingActions(false);
    }
  };

  // AI: Find Related Notes
  const handleAIFindRelated = async () => {
    if (!selectedNote) {
      alert('Seleziona una nota prima');
      return;
    }

    setAiFindingRelated(true);
    try {
      const response = await axios.post(
        `${API_URL}/ai/notes/find-related`,
        {
          titolo: selectedNote.titolo,
          contenuto: selectedNote.contenuto
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data && response.data.note_correlate) {
        if (response.data.note_correlate.length === 0) {
          alert('Nessuna nota correlata trovata');
        } else {
          let message = '🔗 Note Correlate Trovate:\n\n';
          response.data.note_correlate.forEach((nota: any, index: number) => {
            message += `${index + 1}. ${nota.titolo}\n`;
            message += `   Similarità: ${nota.similarity_score}%\n`;
            message += `   Tipo: ${nota.tipo}\n\n`;
          });
          message += `\n${response.data.suggerimento}`;
          alert(message);
        }
      }
    } catch (error) {
      console.error('Errore ricerca note correlate AI:', error);
      alert('Errore nella ricerca di note correlate AI');
    } finally {
      setAiFindingRelated(false);
    }
  };

  const NotePreview: React.FC<{ note: Note; onClick: () => void }> = ({ note, onClick }) => (
    <div
      onClick={onClick}
      className={`p-3 rounded-lg border cursor-pointer transition group ${
        selectedNote?.id === note.id
          ? 'bg-indigo-500/20 border-indigo-500'
          : 'bg-slate-800/50 border-slate-700 hover:border-indigo-500/50'
      }`}
      style={{ borderLeftWidth: '3px', borderLeftColor: note.colore }}
    >
      <div className="flex items-start justify-between mb-2">
        <h4 className="font-semibold text-white text-sm line-clamp-1 flex-1">{note.titolo}</h4>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
          {note.isPinned && <Pin className="w-3 h-3 text-yellow-400" />}
          {note.isFavorite && <Star className="w-3 h-3 text-red-400" />}
        </div>
      </div>
      <p className="text-xs text-gray-400">{new Date(note.updatedAt).toLocaleDateString('it-IT')}</p>
    </div>
  );

  const renderContent = () => {
    switch (activeView) {
      case 'home':
        return (
          <div className="space-y-6">
            {/* Overview */}
            <div>
              <h2 className="text-2xl font-bold text-white mb-4">Dashboard Note</h2>
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 border border-blue-500/30 rounded-xl p-4">
                  <FileText className="w-8 h-8 text-blue-400 mb-2" />
                  <div className="text-2xl font-bold text-white">{getFilteredNotes('text').length}</div>
                  <div className="text-sm text-gray-400">Fogli di Testo</div>
                </div>
                <div className="bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 border border-emerald-500/30 rounded-xl p-4">
                  <Table className="w-8 h-8 text-emerald-400 mb-2" />
                  <div className="text-2xl font-bold text-white">{getFilteredNotes('spreadsheet').length}</div>
                  <div className="text-sm text-gray-400">Fogli di Calcolo</div>
                </div>
                <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 border border-purple-500/30 rounded-xl p-4">
                  <Palette className="w-8 h-8 text-purple-400 mb-2" />
                  <div className="text-2xl font-bold text-white">{getFilteredNotes('whiteboard').length}</div>
                  <div className="text-sm text-gray-400">Lavagne</div>
                </div>
              </div>
            </div>

            {/* Recent Notes */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                <Clock className="w-5 h-5 text-indigo-400" />
                Note Recenti
              </h3>
              <div className="grid grid-cols-3 gap-4">
                {getFilteredNotes().slice(0, 6).map(note => (
                  <div
                    key={note.id}
                    onClick={() => {
                      setSelectedNote(note);
                      setActiveView(note.tipo as ViewType);
                    }}
                    className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 hover:border-indigo-500/50 cursor-pointer transition group"
                    style={{ borderLeftWidth: '4px', borderLeftColor: note.colore }}
                  >
                    <div className="flex items-start gap-3 mb-2">
                      {note.tipo === 'text' && <FileText className="w-5 h-5 text-blue-400" />}
                      {note.tipo === 'spreadsheet' && <Table className="w-5 h-5 text-emerald-400" />}
                      {note.tipo === 'whiteboard' && <Palette className="w-5 h-5 text-purple-400" />}
                      <div className="flex-1">
                        <h4 className="font-semibold text-white text-sm line-clamp-1">{note.titolo}</h4>
                        <p className="text-xs text-gray-500">
                          {new Date(note.updatedAt).toLocaleDateString('it-IT')}
                        </p>
                      </div>
                    </div>
                    {note.tipo === 'text' && (
                      <p className="text-xs text-gray-400 line-clamp-2">
                        {note.contenuto.replace(/<[^>]*>/g, '').substring(0, 100)}...
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'favorites':
        const favoriteNotes = notes.filter(n => n.isFavorite && !n.isArchived &&
          n.titolo.toLowerCase().includes(searchQuery.toLowerCase())
        ).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <Star className="w-6 h-6 text-yellow-400" />
              Note Preferite
            </h2>
            {favoriteNotes.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Star className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p>Nessuna nota preferita</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-4">
                {favoriteNotes.map(note => (
                  <NotePreview
                    key={note.id}
                    note={note}
                    onClick={() => {
                      setSelectedNote(note);
                      setActiveView(note.tipo as ViewType);
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        );

      case 'archived':
        const archivedNotes = notes.filter(n => n.isArchived &&
          n.titolo.toLowerCase().includes(searchQuery.toLowerCase())
        ).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <Archive className="w-6 h-6 text-gray-400" />
                Note Archiviate
              </h2>
              {archivedNotes.length > 0 && (
                <button
                  onClick={() => {
                    if (confirm('Vuoi eliminare definitivamente tutte le note archiviate?')) {
                      archivedNotes.forEach(note => deleteNote(note.id));
                    }
                  }}
                  className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-sm flex items-center gap-1 transition"
                >
                  <Trash2 className="w-4 h-4" />
                  Svuota Archivio
                </button>
              )}
            </div>
            {archivedNotes.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Archive className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p>Nessuna nota archiviata</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-4">
                {archivedNotes.map(note => (
                  <div
                    key={note.id}
                    className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 group relative"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold text-white text-sm line-clamp-1 flex-1">{note.titolo}</h4>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                        <button
                          onClick={() => updateNote(note.id, { isArchived: false })}
                          className="p-1 hover:bg-green-600 rounded text-green-400 hover:text-white"
                          title="Ripristina"
                        >
                          <ChevronRight className="w-3 h-3 rotate-180" />
                        </button>
                        <button
                          onClick={() => deleteNote(note.id)}
                          className="p-1 hover:bg-red-600 rounded text-red-400 hover:text-white"
                          title="Elimina definitivamente"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500">
                      {new Date(note.updatedAt).toLocaleDateString('it-IT')}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'text':
      case 'spreadsheet':
      case 'whiteboard':
        const typeNotes = getFilteredNotes(activeView);
        return (
          <div className="h-full flex flex-col">
            {/* Recent previews */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-400 uppercase">
                  {activeView === 'text' ? 'Ultimi Fogli di Testo' :
                   activeView === 'spreadsheet' ? 'Ultimi Fogli di Calcolo' :
                   'Ultime Lavagne'}
                </h3>
                <button
                  onClick={() => createNote(activeView as any)}
                  className="px-3 py-1 bg-indigo-500 hover:bg-indigo-600 text-white rounded text-xs flex items-center gap-1 transition"
                >
                  <Plus className="w-3 h-3" />
                  Nuovo
                </button>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {typeNotes.slice(0, 5).map(note => (
                  <div
                    key={note.id}
                    className={`min-w-[200px] p-3 rounded-lg border cursor-pointer transition group relative ${
                      selectedNote?.id === note.id
                        ? 'bg-indigo-500/20 border-indigo-500'
                        : 'bg-slate-800/50 border-slate-700 hover:border-indigo-500/50'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4
                        onClick={() => setSelectedNote(note)}
                        className="font-semibold text-white text-sm line-clamp-1 flex-1"
                      >
                        {note.titolo}
                      </h4>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            updateNote(note.id, { isArchived: true });
                          }}
                          className="p-1 hover:bg-slate-700 rounded text-gray-400 hover:text-gray-300"
                          title="Archivia"
                        >
                          <Archive className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNote(note.id);
                          }}
                          className="p-1 hover:bg-red-600 rounded text-red-400 hover:text-white"
                          title="Elimina"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500">
                      {new Date(note.updatedAt).toLocaleDateString('it-IT')}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Full editor */}
            <div className="flex-1 bg-slate-800/30 border border-slate-700 rounded-lg overflow-hidden">
              {selectedNote ? (
                <div className="h-full flex flex-col">
                  {/* Title bar */}
                  <div className="flex items-center justify-between p-4 border-b border-slate-700">
                    {editingNote?.id === selectedNote.id ? (
                      <input
                        type="text"
                        value={editingNote.titolo}
                        onChange={(e) => setEditingNote({ ...editingNote, titolo: e.target.value })}
                        onBlur={() => {
                          updateNote(editingNote.id, { titolo: editingNote.titolo });
                          setEditingNote(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            updateNote(editingNote.id, { titolo: editingNote.titolo });
                            setEditingNote(null);
                          }
                        }}
                        autoFocus
                        className="flex-1 bg-slate-900 border border-indigo-500 rounded px-3 py-2 text-white text-lg font-semibold outline-none"
                      />
                    ) : (
                      <h2
                        onClick={() => setEditingNote(selectedNote)}
                        className="flex-1 text-lg font-semibold text-white cursor-pointer hover:text-indigo-400 transition"
                      >
                        {selectedNote.titolo}
                      </h2>
                    )}
                    <div className="flex items-center gap-2">
                      {/* AI Buttons */}
                      <div className="flex items-center gap-1 mr-2 border-r border-slate-600 pr-2">
                        <button
                          onClick={handleAISummarize}
                          disabled={aiSummarizing || !selectedNote.contenuto}
                          className="p-2 rounded transition text-indigo-400 hover:bg-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Riassumi nota con AI"
                        >
                          {aiSummarizing ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Sparkles className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={handleAIExtractActions}
                          disabled={aiExtractingActions || !selectedNote.contenuto}
                          className="p-2 rounded transition text-cyan-400 hover:bg-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Estrai action items con AI"
                        >
                          {aiExtractingActions ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <ListChecks className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={handleAIFindRelated}
                          disabled={aiFindingRelated}
                          className="p-2 rounded transition text-purple-400 hover:bg-purple-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Trova note correlate con AI"
                        >
                          {aiFindingRelated ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Link2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>

                      {/* Regular buttons */}
                      <button
                        onClick={() => updateNote(selectedNote.id, { isPinned: !selectedNote.isPinned })}
                        className={`p-2 rounded transition ${
                          selectedNote.isPinned ? 'text-yellow-400' : 'text-gray-400 hover:text-yellow-400'
                        }`}
                      >
                        <Pin className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => updateNote(selectedNote.id, { isFavorite: !selectedNote.isFavorite })}
                        className={`p-2 rounded transition ${
                          selectedNote.isFavorite ? 'text-red-400' : 'text-gray-400 hover:text-red-400'
                        }`}
                      >
                        <Star className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => updateNote(selectedNote.id, { isArchived: !selectedNote.isArchived })}
                        className="p-2 text-gray-400 hover:text-gray-300 rounded transition"
                      >
                        <Archive className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteNote(selectedNote.id)}
                        className="p-2 text-red-400 hover:text-red-300 rounded transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Editor */}
                  <div className="flex-1 overflow-auto p-4">
                    {selectedNote.tipo === 'text' && (
                      <RichTextNote
                        initialData={selectedNote.contenuto}
                        onChange={(data) => updateNote(selectedNote.id, { contenuto: data })}
                      />
                    )}
                    {selectedNote.tipo === 'spreadsheet' && (
                      <SpreadsheetNote
                        initialData={selectedNote.contenuto}
                        onChange={(data) => updateNote(selectedNote.id, { contenuto: data })}
                      />
                    )}
                    {selectedNote.tipo === 'whiteboard' && (
                      <WhiteboardNote
                        initialData={selectedNote.contenuto}
                        onChange={(data) => updateNote(selectedNote.id, { contenuto: data })}
                      />
                    )}
                  </div>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    {activeView === 'text' && <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />}
                    {activeView === 'spreadsheet' && <Table className="w-16 h-16 mx-auto mb-4 opacity-50" />}
                    {activeView === 'whiteboard' && <Palette className="w-16 h-16 mx-auto mb-4 opacity-50" />}
                    <p>Seleziona una nota o creane una nuova</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="h-full w-full">
      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cerca note..."
            className="w-full bg-slate-800/50 border border-slate-700 rounded-lg pl-10 pr-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition"
          />
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="h-96 flex items-center justify-center text-gray-400">
          Caricamento...
        </div>
      ) : (
        renderContent()
      )}
    </div>
  );
};

export default NotesComplete;
