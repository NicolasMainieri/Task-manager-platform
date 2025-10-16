import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Ticket, Plus, X, MessageSquare, Send, AlertCircle, Users, Sparkles, Loader2, Lightbulb } from 'lucide-react';

type TicketType = {
  id: string;
  titolo: string;
  descrizione: string;
  priorita: string;
  stato: string;
  categoria: string;
  createdAt: string;
  autore: {
    id: string;
    nome: string;
    cognome: string;
    email: string;
  };
  category?: {
    id: string;
    nome: string;
    icona?: string;
    colore?: string;
    targetRole: {
      id: string;
      nome: string;
    };
  };
  assignedTo?: {
    id: string;
    nome: string;
    cognome: string;
  };
  takenBy?: {
    id: string;
    nome: string;
    cognome: string;
  };
  takenAt?: string;
  risposte?: Array<{
    id: string;
    contenuto: string;
    isAdmin: boolean;
    createdAt: string;
    autore: {
      id: string;
      nome: string;
      cognome: string;
      email: string;
    };
  }>;
};

type TicketCategory = {
  id: string;
  nome: string;
  descrizione?: string;
  icona?: string;
  colore?: string;
  targetRole: {
    id: string;
    nome: string;
  };
};

type User = {
  id: string;
  nome: string;
  cognome: string;
  email: string;
};

const TicketManagement = () => {
  const { token } = useAuth();
  const [tickets, setTickets] = useState<TicketType[]>([]);
  const [categories, setCategories] = useState<TicketCategory[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<TicketType | null>(null);
  const [newResponse, setNewResponse] = useState('');

  const [newTicket, setNewTicket] = useState({
    titolo: '',
    descrizione: '',
    priorita: 'media',
    categoria: 'altro',
    categoryId: '',
    assignedToId: ''
  });

  // AI states
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiSuggestingRouting, setAiSuggestingRouting] = useState(false);
  const [aiFindingSimilar, setAiFindingSimilar] = useState(false);
  const [similarTickets, setSimilarTickets] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, [token]);

  const fetchData = async () => {
    try {
      setLoading(true);

      const [ticketsRes, categoriesRes, usersRes] = await Promise.all([
        fetch('http://localhost:4000/api/tickets', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('http://localhost:4000/api/ticket-categories', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('http://localhost:4000/api/users', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (ticketsRes.ok) {
        const ticketsData = await ticketsRes.json();
        setTickets(ticketsData);
      }

      if (categoriesRes.ok) {
        const categoriesData = await categoriesRes.json();
        setCategories(categoriesData);
      }

      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsers(usersData);
      }
    } catch (error) {
      console.error('Errore nel caricamento:', error);
    } finally {
      setLoading(false);
    }
  };

  // AI: Suggest Category and Priority
  const handleAISuggestCategoryPriority = async () => {
    if (!newTicket.titolo || !newTicket.descrizione) {
      alert('Inserisci titolo e descrizione per ottenere suggerimenti AI');
      return;
    }

    setAiAnalyzing(true);
    try {
      const response = await fetch('http://localhost:4000/api/ai/tickets/analyze', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          titolo: newTicket.titolo,
          descrizione: newTicket.descrizione
        })
      });

      if (response.ok) {
        const result = await response.json();

        // Set priority
        const prioritaMap: Record<string, string> = {
          'bassa': 'bassa',
          'media': 'media',
          'alta': 'alta'
        };

        setNewTicket({
          ...newTicket,
          priorita: prioritaMap[result.priorita] || 'media'
        });

        // Try to match suggested category
        if (result.categoria_suggerita) {
          const matchingCategory = categories.find(cat =>
            cat.nome.toLowerCase().includes(result.categoria_suggerita.toLowerCase()) ||
            result.categoria_suggerita.toLowerCase().includes(cat.nome.toLowerCase())
          );

          if (matchingCategory) {
            setNewTicket(prev => ({
              ...prev,
              categoryId: matchingCategory.id
            }));
          }
        }

        alert(`✨ Analisi AI:\n\nPriorità: ${result.priorita}\nCategoria suggerita: ${result.categoria_suggerita}\nSentiment: ${result.sentiment}\n\n${result.reasoning}`);
      }
    } catch (error) {
      console.error('Errore analisi AI:', error);
      alert('Errore nell\'analisi AI. Verifica che l\'API OpenAI sia configurata.');
    } finally {
      setAiAnalyzing(false);
    }
  };

  // AI: Suggest Routing
  const handleAISuggestRouting = async () => {
    if (!newTicket.titolo || !newTicket.descrizione) {
      alert('Inserisci titolo e descrizione per suggerimenti di routing AI');
      return;
    }

    setAiSuggestingRouting(true);
    try {
      const response = await fetch('http://localhost:4000/api/ai/tickets/suggest-routing', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          titolo: newTicket.titolo,
          descrizione: newTicket.descrizione,
          priorita: newTicket.priorita
        })
      });

      if (response.ok) {
        const result = await response.json();
        alert(`🎯 Suggerimenti Routing AI:\n\nRuolo suggerito: ${result.ruolo_suggerito}\nCompetenze richieste: ${result.competenze_richieste.join(', ')}\n\n${result.reasoning}`);
      }
    } catch (error) {
      console.error('Errore routing AI:', error);
      alert('Errore nei suggerimenti di routing AI.');
    } finally {
      setAiSuggestingRouting(false);
    }
  };

  // AI: Find Similar Tickets
  const handleAIFindSimilar = async () => {
    if (!newTicket.titolo) {
      alert('Inserisci un titolo per cercare ticket simili');
      return;
    }

    setAiFindingSimilar(true);
    try {
      const response = await fetch('http://localhost:4000/api/ai/tickets/find-similar', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          titolo: newTicket.titolo,
          descrizione: newTicket.descrizione
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.tickets_simili && result.tickets_simili.length > 0) {
          setSimilarTickets(result.tickets_simili);

          let message = '💡 Ticket Simili Trovati:\n\n';
          result.tickets_simili.forEach((ticket: any, index: number) => {
            message += `${index + 1}. ${ticket.titolo}\n   Stato: ${ticket.stato}\n   Similarità: ${ticket.similarity_score}%\n\n`;
          });
          message += `\n${result.suggerimento}`;

          alert(message);
        } else {
          alert('Nessun ticket simile trovato.');
        }
      }
    } catch (error) {
      console.error('Errore ricerca ticket simili:', error);
      alert('Errore nella ricerca di ticket simili.');
    } finally {
      setAiFindingSimilar(false);
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch('http://localhost:4000/api/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newTicket)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Errore nella creazione del ticket');
      }

      alert('Ticket creato con successo!');
      setShowCreateModal(false);
      setNewTicket({
        titolo: '',
        descrizione: '',
        priorita: 'media',
        categoria: 'altro',
        categoryId: '',
        assignedToId: ''
      });
      setSimilarTickets([]);
      fetchData();
    } catch (error: any) {
      console.error('Errore:', error);
      alert(error.message);
    }
  };

  const handleAddResponse = async () => {
    if (!selectedTicket || !newResponse.trim()) return;

    try {
      const response = await fetch(`http://localhost:4000/api/tickets/${selectedTicket.id}/risposte`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ contenuto: newResponse })
      });

      if (!response.ok) {
        throw new Error('Errore nell\'aggiunta della risposta');
      }

      const risposta = await response.json();
      setSelectedTicket({
        ...selectedTicket,
        risposte: [...(selectedTicket.risposte || []), risposta]
      });
      setNewResponse('');
      fetchData();
    } catch (error) {
      console.error('Errore:', error);
      alert('Errore nell\'aggiunta della risposta');
    }
  };

  const handleTakeTicket = async (ticketId: string) => {
    try {
      const response = await fetch(`http://localhost:4000/api/tickets/${ticketId}/take`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Errore nella presa in carico del ticket');
      }

      alert('Ticket preso in carico!');
      fetchData();
      if (selectedTicket?.id === ticketId) {
        const updatedTicket = await response.json();
        setSelectedTicket(updatedTicket);
      }
    } catch (error: any) {
      console.error('Errore:', error);
      alert(error.message);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        <p className="mt-4 text-gray-600">Caricamento...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-white">Gestione Ticket</h2>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl hover:shadow-lg transition-all font-medium"
        >
          <Plus className="w-5 h-5" />
          Apri un nuovo Ticket
        </button>
      </div>

      {/* Lista ticket */}
      <div className="space-y-4">
        {tickets.length > 0 ? (
          tickets.map((ticket) => (
            <div
              key={ticket.id}
              onClick={() => {
                setSelectedTicket(ticket);
                setShowDetailModal(true);
              }}
              className="bg-slate-800/50 backdrop-blur-sm border border-indigo-500/20 rounded-2xl p-6 hover:border-indigo-500/40 transition-all cursor-pointer"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    {ticket.category && (
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold"
                        style={{ backgroundColor: ticket.category.colore || '#6366f1' }}
                      >
                        {ticket.category.icona?.charAt(0) || 'T'}
                      </div>
                    )}
                    <div>
                      <h3 className="text-lg font-bold text-white">{ticket.titolo}</h3>
                      <p className="text-sm text-gray-400">
                        {ticket.autore.nome} {ticket.autore.cognome}
                      </p>
                    </div>
                  </div>
                  <p className="text-gray-300 line-clamp-2 mb-3">{ticket.descrizione}</p>
                  {ticket.category && (
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <span>Categoria: {ticket.category.nome}</span>
                      <span>→</span>
                      <span className="text-indigo-400 font-semibold">{ticket.category.targetRole.nome}</span>
                    </div>
                  )}
                </div>
                <div className="text-right ml-4">
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold mb-2 ${
                    ticket.stato === 'risolto' ? 'bg-green-500/20 text-green-400' :
                    ticket.stato === 'in_lavorazione' ? 'bg-blue-500/20 text-blue-400' :
                    'bg-yellow-500/20 text-yellow-400'
                  }`}>
                    {ticket.stato === 'risolto' ? 'Risolto' :
                     ticket.stato === 'in_lavorazione' ? 'In Lavorazione' : 'Aperto'}
                  </span>
                  <span className={`block px-3 py-1 rounded-full text-xs font-semibold ${
                    ticket.priorita === 'alta' ? 'bg-red-500/20 text-red-400' :
                    ticket.priorita === 'media' ? 'bg-orange-500/20 text-orange-400' :
                    'bg-green-500/20 text-green-400'
                  }`}>
                    Priorità: {ticket.priorita}
                  </span>
                  {ticket.takenBy && (
                    <div className="mt-2 text-xs text-gray-400">
                      Preso da: {ticket.takenBy.nome} {ticket.takenBy.cognome}
                    </div>
                  )}
                  {ticket.risposte && ticket.risposte.length > 0 && (
                    <div className="flex items-center gap-1 mt-2 text-indigo-400">
                      <MessageSquare className="w-4 h-4" />
                      <span className="text-xs">{ticket.risposte.length} risposte</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-slate-800/50 backdrop-blur-sm border border-indigo-500/20 rounded-2xl p-12 text-center">
            <Ticket className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Nessun ticket</h3>
            <p className="text-gray-400">I ticket appariranno qui</p>
          </div>
        )}
      </div>

      {/* Modal creazione ticket */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-indigo-500/20 rounded-2xl shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-white">Apri un nuovo Ticket</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Titolo *
                </label>
                <input
                  type="text"
                  required
                  value={newTicket.titolo}
                  onChange={(e) => setNewTicket({ ...newTicket, titolo: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-900/50 border border-indigo-500/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500/50 transition"
                  placeholder="Descrivi il problema in breve"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Descrizione *
                </label>
                <textarea
                  required
                  value={newTicket.descrizione}
                  onChange={(e) => setNewTicket({ ...newTicket, descrizione: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-900/50 border border-indigo-500/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500/50 transition resize-none"
                  rows={4}
                  placeholder="Fornisci una descrizione dettagliata..."
                />
              </div>

              {/* AI Actions */}
              <div className="border-t border-indigo-500/20 pt-4 space-y-3">
                <p className="text-sm font-semibold text-gray-400 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Assistente AI
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={handleAISuggestCategoryPriority}
                    disabled={!newTicket.titolo || !newTicket.descrizione || aiAnalyzing}
                    className="flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 hover:from-indigo-500/30 hover:to-purple-500/30 border border-indigo-500/30 text-indigo-300 px-3 py-2 rounded-lg text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Analizza il ticket e suggerisci categoria e priorità"
                  >
                    {aiAnalyzing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                    <span>{aiAnalyzing ? 'Analizzando...' : 'Analizza & Suggerisci'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleAISuggestRouting}
                    disabled={!newTicket.titolo || !newTicket.descrizione || aiSuggestingRouting}
                    className="flex items-center justify-center gap-2 bg-gradient-to-r from-purple-500/20 to-pink-500/20 hover:from-purple-500/30 hover:to-pink-500/30 border border-purple-500/30 text-purple-300 px-3 py-2 rounded-lg text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Suggerisci il routing ottimale per questo ticket"
                  >
                    {aiSuggestingRouting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <span className="text-base">🎯</span>
                    )}
                    <span>{aiSuggestingRouting ? 'Analizzando...' : 'Suggerisci Routing'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleAIFindSimilar}
                    disabled={!newTicket.titolo || aiFindingSimilar}
                    className="flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 hover:from-cyan-500/30 hover:to-blue-500/30 border border-cyan-500/30 text-cyan-300 px-3 py-2 rounded-lg text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Cerca ticket simili risolti in passato"
                  >
                    {aiFindingSimilar ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Lightbulb className="w-4 h-4" />
                    )}
                    <span>{aiFindingSimilar ? 'Cercando...' : 'Trova Simili'}</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Priorità
                  </label>
                  <select
                    value={newTicket.priorita}
                    onChange={(e) => setNewTicket({ ...newTicket, priorita: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-900/50 border border-indigo-500/20 rounded-lg text-white focus:outline-none focus:border-indigo-500/50 transition"
                  >
                    <option value="bassa">Bassa</option>
                    <option value="media">Media</option>
                    <option value="alta">Alta</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Categoria Ticket (opzionale)
                  </label>
                  <select
                    value={newTicket.categoryId}
                    onChange={(e) => setNewTicket({ ...newTicket, categoryId: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-900/50 border border-indigo-500/20 rounded-lg text-white focus:outline-none focus:border-indigo-500/50 transition"
                  >
                    <option value="">Senza categoria</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.nome} → {cat.targetRole.nome}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Assegna direttamente a (opzionale)
                </label>
                <select
                  value={newTicket.assignedToId}
                  onChange={(e) => setNewTicket({ ...newTicket, assignedToId: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-900/50 border border-indigo-500/20 rounded-lg text-white focus:outline-none focus:border-indigo-500/50 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={!!newTicket.categoryId}
                >
                  <option value="">Routing automatico</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.nome} {user.cognome} ({user.email})
                    </option>
                  ))}
                </select>
                {newTicket.categoryId && (
                  <p className="text-xs text-indigo-400 mt-2 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Con una categoria selezionata, il ticket sarà automaticamente indirizzato al ruolo target
                  </p>
                )}
              </div>

              {/* Similar Tickets */}
              {similarTickets.length > 0 && (
                <div className="border-t border-indigo-500/20 pt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Lightbulb className="w-5 h-5 text-cyan-400" />
                    <h4 className="text-sm font-semibold text-cyan-400">Ticket Simili Trovati</h4>
                  </div>
                  <div className="space-y-2">
                    {similarTickets.map((ticket: any, index: number) => (
                      <div key={index} className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-white">{ticket.titolo}</p>
                            <p className="text-xs text-gray-400 mt-1">{ticket.descrizione?.substring(0, 80)}...</p>
                          </div>
                          <div className="flex flex-col items-end gap-1 ml-3">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                              ticket.stato === 'risolto' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                            }`}>
                              {ticket.stato}
                            </span>
                            <span className="text-xs text-cyan-400 font-semibold">
                              {ticket.similarity_score}% simile
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t border-indigo-500/20">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition font-medium"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white rounded-lg transition shadow-lg font-medium"
                >
                  Crea Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal dettaglio ticket */}
      {showDetailModal && selectedTicket && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-indigo-500/20 rounded-2xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-slate-800 border-b border-indigo-500/20 p-6">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-white mb-2">{selectedTicket.titolo}</h3>
                  <div className="flex items-center gap-3 text-sm text-gray-400">
                    <span>{selectedTicket.autore.nome} {selectedTicket.autore.cognome}</span>
                    <span>•</span>
                    <span>{new Date(selectedTicket.createdAt).toLocaleString('it-IT')}</span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowDetailModal(false);
                    setSelectedTicket(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Informazioni ticket */}
              <div className="bg-slate-900/50 rounded-xl p-4 border border-indigo-500/20">
                <p className="text-gray-300 mb-4">{selectedTicket.descrizione}</p>
                <div className="flex flex-wrap gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    selectedTicket.stato === 'risolto' ? 'bg-green-500/20 text-green-400' :
                    selectedTicket.stato === 'in_lavorazione' ? 'bg-blue-500/20 text-blue-400' :
                    'bg-yellow-500/20 text-yellow-400'
                  }`}>
                    {selectedTicket.stato}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    selectedTicket.priorita === 'alta' ? 'bg-red-500/20 text-red-400' :
                    selectedTicket.priorita === 'media' ? 'bg-orange-500/20 text-orange-400' :
                    'bg-green-500/20 text-green-400'
                  }`}>
                    Priorità: {selectedTicket.priorita}
                  </span>
                  {selectedTicket.category && (
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-400">
                      {selectedTicket.category.nome}
                    </span>
                  )}
                </div>
              </div>

              {/* Pulsante "Prendi in carico" */}
              {!selectedTicket.takenBy && selectedTicket.category && (
                <button
                  onClick={() => handleTakeTicket(selectedTicket.id)}
                  className="w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-3 rounded-lg transition font-medium"
                >
                  <Users className="w-5 h-5" />
                  Prendi in Carico questo Ticket
                </button>
              )}

              {/* Conversazione */}
              <div>
                <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-indigo-400" />
                  Conversazione ({selectedTicket.risposte?.length || 0})
                </h4>
                <div className="space-y-3 mb-4">
                  {selectedTicket.risposte && selectedTicket.risposte.length > 0 ? (
                    selectedTicket.risposte.map((risposta) => (
                      <div
                        key={risposta.id}
                        className={`p-4 rounded-xl ${
                          risposta.isAdmin
                            ? 'bg-indigo-500/10 border-l-4 border-indigo-500'
                            : 'bg-slate-700/50 border-l-4 border-slate-500'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-xs">
                            {risposta.autore.nome.charAt(0)}{risposta.autore.cognome.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-white">
                              {risposta.autore.nome} {risposta.autore.cognome}
                              {risposta.isAdmin && <span className="text-indigo-400 ml-2">(Admin)</span>}
                            </p>
                            <p className="text-xs text-gray-500">
                              {new Date(risposta.createdAt).toLocaleString('it-IT')}
                            </p>
                          </div>
                        </div>
                        <p className="text-gray-300 text-sm whitespace-pre-wrap">{risposta.contenuto}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-gray-500 py-8">Nessuna risposta ancora</p>
                  )}
                </div>

                {/* Aggiungi risposta */}
                {selectedTicket.stato !== 'risolto' && (
                  <div className="border-t border-indigo-500/20 pt-4">
                    <textarea
                      value={newResponse}
                      onChange={(e) => setNewResponse(e.target.value)}
                      placeholder="Scrivi una risposta..."
                      className="w-full px-4 py-3 bg-slate-900/50 border border-indigo-500/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500/50 resize-none"
                      rows={3}
                    />
                    <div className="flex justify-end mt-2">
                      <button
                        onClick={handleAddResponse}
                        disabled={!newResponse.trim()}
                        className="flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition shadow-lg"
                      >
                        <Send className="w-4 h-4" />
                        Invia Risposta
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TicketManagement;
