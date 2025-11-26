import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  Scale, Search, FileText, Plus, MessageSquare, BookOpen, Briefcase,
  Filter, Calendar, Tag, ExternalLink, Brain, Sparkles, Clock,
  ChevronDown, ChevronUp, Send, Loader2, ArrowLeft, Download,
  FileCheck, AlertCircle, CheckCircle, XCircle, Eye
} from "lucide-react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api";

type LegalDocument = {
  id: string;
  tipo: string;
  titolo: string;
  numero?: string;
  anno?: number;
  autorita?: string;
  dataEmissione?: string;
  abstract?: string;
  massima?: string;
  materia?: string;
  keywords: string[];
  aiSummary?: string;
  aiKeyPoints: string[];
  riferimentiNormativi: string[];
  fonte?: string;
  url?: string;
};

type LegalCase = {
  id: string;
  numeroPratica: string;
  titolo: string;
  clienteNome: string;
  materia: string;
  sottoMateria?: string;
  stato: string;
  dataApertura: string;
  dataChiusura?: string;
  descrizione?: string;
  teamLegale: string[];
  aiSuggerimenti: any[];
  precedentiRilevanti: any[];
};

type LegalChat = {
  id: string;
  titolo: string;
  caseId?: string;
  messaggi: Array<{
    role: "user" | "assistant";
    content: string;
    timestamp: string;
  }>;
  documentiRiferimento: string[];
  updatedAt: string;
};

export default function LegalPage() {
  const { user, token } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<"search" | "cases" | "chat">("search");
  const [loading, setLoading] = useState(false);

  // Search tab
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFilters, setSearchFilters] = useState({
    fonte: "",
    materia: "",
    tipo: "",
    annoFrom: "",
    annoTo: ""
  });
  const [searchResults, setSearchResults] = useState<{
    localResults: LegalDocument[];
    externalResults: any[];
  }>({ localResults: [], externalResults: [] });

  // Cases tab
  const [cases, setCases] = useState<LegalCase[]>([]);
  const [selectedCase, setSelectedCase] = useState<LegalCase | null>(null);
  const [showNewCaseForm, setShowNewCaseForm] = useState(false);
  const [newCase, setNewCase] = useState({
    titolo: "",
    clienteNome: "",
    materia: "",
    sottoMateria: "",
    descrizione: ""
  });

  // Chat tab
  const [chats, setChats] = useState<LegalChat[]>([]);
  const [selectedChat, setSelectedChat] = useState<LegalChat | null>(null);
  const [chatMessage, setChatMessage] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  // Expanded documents
  const [expandedDoc, setExpandedDoc] = useState<string | null>(null);

  useEffect(() => {
    if (activeTab === "cases") {
      loadCases();
    } else if (activeTab === "chat") {
      loadChats();
    }
  }, [activeTab]);

  const handleSearch = async () => {
    try {
      setLoading(true);

      // Cerca su normativa italiana e sentenze cassazione in parallelo
      const [legislationRes, sentencesRes] = await Promise.all([
        fetch(`${API_BASE_URL}/legal/search/italian-legislation?query=${encodeURIComponent(searchQuery)}`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }),
        fetch(`${API_BASE_URL}/legal/search/cassazione?text=${encodeURIComponent(searchQuery)}`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        })
      ]);

      const legislation = legislationRes.ok ? await legislationRes.json() : { results: [] };
      const sentences = sentencesRes.ok ? await sentencesRes.json() : { results: [] };

      // Combina i risultati in formato compatibile
      const combinedResults = [
        ...legislation.results.map((doc: any) => ({
          id: doc.id || doc.urn,
          tipo: doc.tipo,
          titolo: doc.titolo,
          numero: doc.numero,
          anno: doc.anno,
          abstract: doc.descrizione,
          keywords: doc.keywords || [],
          aiKeyPoints: [],
          riferimentiNormativi: [],
          url: doc.link,
          fonte: 'Normativa Italiana',
          relevance: doc.relevance
        })),
        ...sentences.results.map((doc: any) => ({
          id: doc.id,
          tipo: 'Sentenza',
          titolo: `Sentenza ${doc.numero}/${doc.anno} - ${doc.sezione}`,
          numero: doc.numero,
          anno: parseInt(doc.anno),
          abstract: doc.massima,
          massima: doc.massima,
          materia: doc.materia,
          keywords: doc.keywords || [],
          aiKeyPoints: [],
          riferimentiNormativi: [],
          fonte: 'Cassazione',
          relevance: doc.relevance
        }))
      ];

      // Ordina per relevance
      combinedResults.sort((a, b) => (b.relevance || 0) - (a.relevance || 0));

      setSearchResults({
        localResults: combinedResults,
        externalResults: []
      });
    } catch (error) {
      console.error("Errore ricerca:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadCases = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/legal/cases`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        setCases(data);
      }
    } catch (error) {
      console.error("Errore caricamento casi:", error);
    }
  };

  const handleCreateCase = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/legal/cases`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(newCase)
      });

      if (res.ok) {
        const data = await res.json();
        setCases([data, ...cases]);
        setShowNewCaseForm(false);
        setNewCase({
          titolo: "",
          clienteNome: "",
          materia: "",
          sottoMateria: "",
          descrizione: ""
        });
      }
    } catch (error) {
      console.error("Errore creazione caso:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadChats = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/legal/chats`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        setChats(data);
      }
    } catch (error) {
      console.error("Errore caricamento chat:", error);
    }
  };

  const handleCreateChat = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/legal/chats`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ titolo: "Nuova consulenza" })
      });

      if (res.ok) {
        const data = await res.json();
        setChats([data, ...chats]);
        setSelectedChat(data);
      }
    } catch (error) {
      console.error("Errore creazione chat:", error);
    }
  };

  const handleSendMessage = async () => {
    if (!selectedChat || !chatMessage.trim()) return;

    try {
      setChatLoading(true);

      // Aggiungi messaggio utente
      const userMessage = {
        role: "user" as const,
        content: chatMessage,
        timestamp: new Date().toISOString()
      };

      const updatedMessages = [...selectedChat.messaggi, userMessage];
      setSelectedChat({ ...selectedChat, messaggi: updatedMessages });
      setChatMessage("");

      // Chiama l'AI
      const res = await fetch(`${API_BASE_URL}/legal/ai/ask`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ question: chatMessage })
      });

      if (res.ok) {
        const data = await res.json();

        // Formatta la risposta AI con fonti
        let aiContent = data.answer;
        if (data.sources && data.sources.length > 0) {
          aiContent += "\n\n📚 Fonti:\n";
          data.sources.forEach((source: any, idx: number) => {
            aiContent += `${idx + 1}. ${source.tipo} - ${source.titolo || source.numero}\n`;
          });
        }
        if (data.confidence) {
          aiContent += `\n✨ Confidenza: ${(data.confidence * 100).toFixed(0)}%`;
        }

        const aiMessage = {
          role: "assistant" as const,
          content: aiContent,
          timestamp: new Date().toISOString()
        };

        const finalMessages = [...updatedMessages, aiMessage];
        setSelectedChat({ ...selectedChat, messaggi: finalMessages });
        setChats(chats.map(c => c.id === selectedChat.id ? { ...c, messaggi: finalMessages } : c));
      }
    } catch (error) {
      console.error("Errore invio messaggio:", error);
    } finally {
      setChatLoading(false);
    }
  };

  const handleAnalyzeDocument = async (docId: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/legal/documents/${docId}/extract-key-points`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        }
      });

      if (res.ok) {
        const data = await res.json();
        // Aggiorna il documento con i punti chiave estratti
        setSearchResults({
          ...searchResults,
          localResults: searchResults.localResults.map(d =>
            d.id === docId ? { ...d, aiKeyPoints: data.keyPoints.punti_chiave, aiSummary: data.keyPoints.massima } : d
          )
        });
      }
    } catch (error) {
      console.error("Errore analisi documento:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <div className="bg-black/20 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/dashboard")}
              className="text-white/60 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-3">
              <Scale className="w-8 h-8 text-purple-400" />
              <div>
                <h1 className="text-2xl font-bold text-white">Studi Legali</h1>
                <p className="text-sm text-white/60">Ricerca giuridica e gestione casi</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Tabs */}
        <div className="flex gap-4 mb-8">
          <button
            onClick={() => setActiveTab("search")}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg transition-all ${
              activeTab === "search"
                ? "bg-purple-500 text-white"
                : "bg-white/10 text-white/60 hover:bg-white/20"
            }`}
          >
            <Search className="w-5 h-5" />
            <span>Ricerca Documenti</span>
          </button>
          <button
            onClick={() => setActiveTab("cases")}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg transition-all ${
              activeTab === "cases"
                ? "bg-purple-500 text-white"
                : "bg-white/10 text-white/60 hover:bg-white/20"
            }`}
          >
            <Briefcase className="w-5 h-5" />
            <span>Gestione Casi</span>
          </button>
          <button
            onClick={() => setActiveTab("chat")}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg transition-all ${
              activeTab === "chat"
                ? "bg-purple-500 text-white"
                : "bg-white/10 text-white/60 hover:bg-white/20"
            }`}
          >
            <MessageSquare className="w-5 h-5" />
            <span>Consulenza AI</span>
          </button>
        </div>

        {/* SEARCH TAB */}
        {activeTab === "search" && (
          <div className="space-y-6">
            {/* Search Bar */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
              <div className="flex gap-4 mb-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    placeholder="Cerca leggi, sentenze, decreti..."
                    className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <button
                  onClick={handleSearch}
                  disabled={loading}
                  className="px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Cerca"}
                </button>
              </div>

              {/* Filters */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <select
                  value={searchFilters.fonte}
                  onChange={(e) => setSearchFilters({ ...searchFilters, fonte: e.target.value })}
                  className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">Tutte le fonti</option>
                  <option value="locale">Database locale</option>
                  <option value="eur-lex">EUR-Lex</option>
                </select>

                <select
                  value={searchFilters.materia}
                  onChange={(e) => setSearchFilters({ ...searchFilters, materia: e.target.value })}
                  className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">Tutte le materie</option>
                  <option value="civile">Civile</option>
                  <option value="penale">Penale</option>
                  <option value="amministrativo">Amministrativo</option>
                  <option value="lavoro">Lavoro</option>
                  <option value="tributario">Tributario</option>
                </select>

                <select
                  value={searchFilters.tipo}
                  onChange={(e) => setSearchFilters({ ...searchFilters, tipo: e.target.value })}
                  className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">Tutti i tipi</option>
                  <option value="sentenza">Sentenza</option>
                  <option value="legge">Legge</option>
                  <option value="decreto">Decreto</option>
                  <option value="regolamento">Regolamento</option>
                  <option value="direttiva_ue">Direttiva UE</option>
                </select>

                <input
                  type="number"
                  value={searchFilters.annoFrom}
                  onChange={(e) => setSearchFilters({ ...searchFilters, annoFrom: e.target.value })}
                  placeholder="Anno da"
                  className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            {/* Results */}
            <div className="space-y-4">
              {searchResults.localResults.map(doc => (
                <div
                  key={doc.id}
                  className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 overflow-hidden"
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <FileText className="w-5 h-5 text-purple-400" />
                          <h3 className="text-lg font-bold text-white">{doc.titolo}</h3>
                          {doc.tipo && (
                            <span className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-xs">
                              {doc.tipo.toUpperCase()}
                            </span>
                          )}
                        </div>
                        {doc.abstract && (
                          <p className="text-white/60 text-sm">{doc.abstract}</p>
                        )}
                      </div>
                      <button
                        onClick={() => setExpandedDoc(expandedDoc === doc.id ? null : doc.id)}
                        className="p-2 hover:bg-white/10 rounded-lg transition-all"
                      >
                        {expandedDoc === doc.id ? (
                          <ChevronUp className="w-5 h-5 text-white" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-white" />
                        )}
                      </button>
                    </div>

                    {doc.keywords.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {doc.keywords.map((kw, idx) => (
                          <span key={idx} className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded text-xs">
                            {kw}
                          </span>
                        ))}
                      </div>
                    )}

                    {expandedDoc === doc.id && (
                      <div className="mt-4 pt-4 border-t border-white/10 space-y-4">
                        {doc.massima && (
                          <div>
                            <h4 className="text-white font-semibold mb-2">Massima</h4>
                            <p className="text-white/80 text-sm">{doc.massima}</p>
                          </div>
                        )}

                        {doc.aiSummary && (
                          <div>
                            <h4 className="text-white font-semibold mb-2 flex items-center gap-2">
                              <Brain className="w-4 h-4 text-purple-400" />
                              Analisi AI
                            </h4>
                            <p className="text-white/80 text-sm">{doc.aiSummary}</p>
                          </div>
                        )}

                        {doc.aiKeyPoints.length > 0 && (
                          <div>
                            <h4 className="text-white font-semibold mb-2">Punti Chiave</h4>
                            <ul className="space-y-1">
                              {doc.aiKeyPoints.map((point, idx) => (
                                <li key={idx} className="text-white/80 text-sm flex items-start gap-2">
                                  <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                                  <span>{point}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {doc.riferimentiNormativi.length > 0 && (
                          <div>
                            <h4 className="text-white font-semibold mb-2">Riferimenti Normativi</h4>
                            <div className="flex flex-wrap gap-2">
                              {doc.riferimentiNormativi.map((rif, idx) => (
                                <span key={idx} className="px-2 py-1 bg-orange-500/20 text-orange-300 rounded text-xs">
                                  {rif}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="flex gap-2">
                          {!doc.aiKeyPoints.length && (
                            <button
                              onClick={() => handleAnalyzeDocument(doc.id)}
                              className="px-4 py-2 bg-purple-500/20 text-purple-300 rounded-lg hover:bg-purple-500/30 transition-all text-sm flex items-center gap-2"
                            >
                              <Sparkles className="w-4 h-4" />
                              Analizza con AI
                            </button>
                          )}
                          {doc.url && (
                            <a
                              href={doc.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-4 py-2 bg-blue-500/20 text-blue-300 rounded-lg hover:bg-blue-500/30 transition-all text-sm flex items-center gap-2"
                            >
                              <ExternalLink className="w-4 h-4" />
                              Apri documento
                            </a>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {searchResults.externalResults.length > 0 && (
                <div>
                  <h3 className="text-white font-semibold mb-4">Risultati EUR-Lex</h3>
                  {searchResults.externalResults.map((doc, idx) => (
                    <div
                      key={idx}
                      className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 mb-4"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="text-white font-semibold mb-2">{doc.title}</h4>
                          {doc.summary && <p className="text-white/60 text-sm">{doc.summary}</p>}
                        </div>
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2 bg-blue-500/20 text-blue-300 rounded-lg hover:bg-blue-500/30 transition-all text-sm flex items-center gap-2"
                        >
                          <ExternalLink className="w-4 h-4" />
                          Apri
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {searchResults.localResults.length === 0 && searchResults.externalResults.length === 0 && searchQuery && (
                <div className="text-center py-12">
                  <p className="text-white/60">Nessun risultato trovato</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* CASES TAB */}
        {activeTab === "cases" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-white">Gestione Casi</h2>
              <button
                onClick={() => setShowNewCaseForm(!showNewCaseForm)}
                className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-all flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Nuovo Caso
              </button>
            </div>

            {showNewCaseForm && (
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                <h3 className="text-white font-semibold mb-4">Crea Nuovo Caso</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <input
                    type="text"
                    value={newCase.titolo}
                    onChange={(e) => setNewCase({ ...newCase, titolo: e.target.value })}
                    placeholder="Titolo del caso"
                    className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <input
                    type="text"
                    value={newCase.clienteNome}
                    onChange={(e) => setNewCase({ ...newCase, clienteNome: e.target.value })}
                    placeholder="Nome cliente"
                    className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <select
                    value={newCase.materia}
                    onChange={(e) => setNewCase({ ...newCase, materia: e.target.value })}
                    className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">Seleziona materia</option>
                    <option value="civile">Civile</option>
                    <option value="penale">Penale</option>
                    <option value="amministrativo">Amministrativo</option>
                    <option value="lavoro">Lavoro</option>
                    <option value="tributario">Tributario</option>
                  </select>
                  <input
                    type="text"
                    value={newCase.sottoMateria}
                    onChange={(e) => setNewCase({ ...newCase, sottoMateria: e.target.value })}
                    placeholder="Sotto-materia (opzionale)"
                    className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <textarea
                  value={newCase.descrizione}
                  onChange={(e) => setNewCase({ ...newCase, descrizione: e.target.value })}
                  placeholder="Descrizione del caso"
                  rows={4}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500 mb-4"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleCreateCase}
                    disabled={loading || !newCase.titolo || !newCase.clienteNome || !newCase.materia}
                    className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Crea Caso
                  </button>
                  <button
                    onClick={() => setShowNewCaseForm(false)}
                    className="px-4 py-2 bg-red-500/20 text-red-300 rounded-lg hover:bg-red-500/30 transition-all"
                  >
                    Annulla
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-4">
              {cases.map(c => (
                <div
                  key={c.id}
                  className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Briefcase className="w-5 h-5 text-purple-400" />
                        <h3 className="text-lg font-bold text-white">{c.titolo}</h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          c.stato === "aperto" ? "bg-green-500/20 text-green-300" :
                          c.stato === "in_corso" ? "bg-blue-500/20 text-blue-300" :
                          "bg-gray-500/20 text-gray-300"
                        }`}>
                          {c.stato.toUpperCase()}
                        </span>
                      </div>
                      <div className="flex items-center gap-6 text-sm text-white/60">
                        <span>Cliente: {c.clienteNome}</span>
                        <span>Materia: {c.materia}</span>
                        <span>N. Pratica: {c.numeroPratica}</span>
                      </div>
                      {c.descrizione && (
                        <p className="text-white/60 text-sm mt-2">{c.descrizione}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {cases.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-white/60">Nessun caso creato</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* CHAT TAB */}
        {activeTab === "chat" && (
          <div className="grid grid-cols-12 gap-6 h-[600px]">
            {/* Chat List */}
            <div className="col-span-4 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 overflow-hidden">
              <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <h3 className="text-white font-semibold">Consulenze</h3>
                <button
                  onClick={handleCreateChat}
                  className="p-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-all"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
              <div className="overflow-y-auto h-[calc(100%-60px)]">
                {chats.map(chat => (
                  <div
                    key={chat.id}
                    onClick={() => setSelectedChat(chat)}
                    className={`p-4 border-b border-white/10 cursor-pointer transition-all ${
                      selectedChat?.id === chat.id ? "bg-purple-500/20" : "hover:bg-white/5"
                    }`}
                  >
                    <p className="text-white font-medium text-sm">{chat.titolo}</p>
                    <p className="text-white/60 text-xs mt-1">
                      {chat.messaggi.length} messaggi
                    </p>
                  </div>
                ))}
                {chats.length === 0 && (
                  <div className="p-4 text-center text-white/60 text-sm">
                    Nessuna chat disponibile
                  </div>
                )}
              </div>
            </div>

            {/* Chat Messages */}
            <div className="col-span-8 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 flex flex-col">
              {selectedChat ? (
                <>
                  <div className="p-4 border-b border-white/10">
                    <h3 className="text-white font-semibold">{selectedChat.titolo}</h3>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {selectedChat.messaggi.map((msg, idx) => (
                      <div
                        key={idx}
                        className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[80%] px-4 py-3 rounded-lg ${
                            msg.role === "user"
                              ? "bg-purple-500 text-white"
                              : "bg-white/10 text-white"
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                          <p className="text-xs opacity-60 mt-1">
                            {new Date(msg.timestamp).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    ))}
                    {chatLoading && (
                      <div className="flex justify-start">
                        <div className="bg-white/10 px-4 py-3 rounded-lg">
                          <Loader2 className="w-5 h-5 text-white animate-spin" />
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="p-4 border-t border-white/10">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={chatMessage}
                        onChange={(e) => setChatMessage(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendMessage()}
                        placeholder="Scrivi la tua domanda..."
                        className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                      <button
                        onClick={handleSendMessage}
                        disabled={chatLoading || !chatMessage.trim()}
                        className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Send className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-white/60">
                  Seleziona una chat o creane una nuova
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
