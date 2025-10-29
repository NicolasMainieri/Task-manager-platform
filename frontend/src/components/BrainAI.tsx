import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  Brain,
  Send,
  Sparkles,
  Zap,
  MessageSquare,
  FileText,
  Lightbulb,
  Target,
  TrendingUp,
  Calendar,
  Users,
  CheckCircle,
  Loader2,
  ChevronDown,
  X,
  Copy,
  Check
} from 'lucide-react';

const API_URL = 'http://localhost:4000/api';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AIModel {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
}

const BrainAI: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState<AIModel>({
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    description: 'Veloce ed efficiente per task quotidiani',
    icon: '⚡',
    category: 'Quick'
  });
  const [showModelSelector, setShowModelSelector] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const token = localStorage.getItem('token');

  const aiModels: AIModel[] = [
    {
      id: 'gpt-4o-mini',
      name: 'GPT-4o Mini',
      description: 'Veloce ed efficiente per task quotidiani',
      icon: '⚡',
      category: 'Quick'
    },
    {
      id: 'gpt-4o',
      name: 'GPT-4o',
      description: 'Potente e versatile per task complessi',
      icon: '🧠',
      category: 'Advanced'
    },
    {
      id: 'gpt-4-turbo',
      name: 'GPT-4 Turbo',
      description: 'Bilanciato tra velocità e qualità',
      icon: '🚀',
      category: 'Balanced'
    },
    {
      id: 'claude-3-5-sonnet',
      name: 'Claude 3.5 Sonnet',
      description: 'Eccellente per analisi e ragionamento',
      icon: '🎯',
      category: 'Advanced'
    },
    {
      id: 'claude-3-opus',
      name: 'Claude 3 Opus',
      description: 'Il più potente per task critici',
      icon: '👑',
      category: 'Premium'
    }
  ];

  const suggestedPrompts = [
    {
      category: 'Consigliato',
      icon: Sparkles,
      prompts: [
        {
          text: 'Genera un riepilogo del progetto corrente',
          icon: FileText,
          prompt: 'Crea un riepilogo dettagliato dello stato attuale del progetto, includendo task completati, in corso e da fare.'
        },
        {
          text: 'Aggiorna lo stato delle attività',
          icon: CheckCircle,
          prompt: 'Analizza tutte le mie attività e suggerisci quali aggiornamenti di stato sono necessari.'
        },
        {
          text: 'Crea nuove task da obiettivi',
          icon: Target,
          prompt: 'Aiutami a creare task specifiche e actionable partendo da un obiettivo generale.'
        }
      ]
    },
    {
      category: 'Report',
      icon: TrendingUp,
      prompts: [
        {
          text: 'StandUp giornaliero',
          icon: MessageSquare,
          prompt: 'Genera un report standup con cosa ho fatto ieri, cosa farò oggi e eventuali blocchi.'
        },
        {
          text: 'Aggiornamenti sul team',
          icon: Users,
          prompt: 'Crea un report sullo stato del team, produttività e task completate questa settimana.'
        },
        {
          text: 'Aggiornamenti sul progetto',
          icon: Calendar,
          prompt: 'Genera un report dettagliato sull\'avanzamento del progetto con metriche e milestone.'
        }
      ]
    },
    {
      category: 'Pensiero Creativo',
      icon: Lightbulb,
      prompts: [
        {
          text: 'Brainstorming idee',
          icon: Lightbulb,
          prompt: 'Aiutami a fare brainstorming su nuove idee per migliorare il progetto.'
        },
        {
          text: 'Risolvi problemi',
          icon: Zap,
          prompt: 'Ho un problema con [descrivi il problema]. Suggerisci soluzioni creative e pratiche.'
        },
        {
          text: 'Pianifica strategia',
          icon: Target,
          prompt: 'Aiutami a creare una strategia per raggiungere [obiettivo] nei prossimi 30 giorni.'
        }
      ]
    }
  ];

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (customPrompt?: string) => {
    const messageText = customPrompt || input;
    if (!messageText.trim() || loading) return;

    const userMessage: Message = {
      role: 'user',
      content: messageText,
      timestamp: new Date()
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await axios.post(
        `${API_URL}/ai/brain`,
        {
          prompt: messageText,
          model: selectedModel.id,
          conversationHistory: messages.slice(-6) // Ultimi 3 scambi
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const assistantMessage: Message = {
        role: 'assistant',
        content: response.data.response,
        timestamp: new Date()
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error('Errore Brain:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: `Errore: ${error.response?.data?.error || 'Impossibile elaborare la richiesta'}`,
        timestamp: new Date()
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyMessage = (content: string, index: number) => {
    navigator.clipboard.writeText(content);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('it-IT', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] bg-gradient-to-br from-purple-900/20 via-indigo-900/20 to-slate-900 rounded-2xl border border-purple-500/20 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600/20 to-indigo-600/20 border-b border-purple-500/20 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-purple-500/20 blur-xl rounded-full"></div>
              <div className="relative p-3 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl">
                <Brain className="w-6 h-6 text-white" />
              </div>
            </div>
            <div>
              <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-400">
                PlanOra Brain
              </h2>
              <p className="text-sm text-gray-400">
                Il tuo assistente AI intelligente
              </p>
            </div>
          </div>

          {/* Model Selector */}
          <div className="relative">
            <button
              onClick={() => setShowModelSelector(!showModelSelector)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 hover:bg-slate-700/50 border border-purple-500/20 rounded-lg transition-colors"
            >
              <span className="text-xl">{selectedModel.icon}</span>
              <div className="text-left">
                <p className="text-sm font-semibold text-white">{selectedModel.name}</p>
                <p className="text-xs text-gray-400">{selectedModel.category}</p>
              </div>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </button>

            {showModelSelector && (
              <div className="absolute right-0 mt-2 w-80 bg-slate-800 border border-purple-500/20 rounded-xl shadow-2xl z-50 max-h-96 overflow-y-auto">
                <div className="p-3 border-b border-purple-500/20">
                  <h3 className="text-sm font-bold text-white">Seleziona Modello AI</h3>
                </div>
                <div className="p-2 space-y-1">
                  {aiModels.map((model) => (
                    <button
                      key={model.id}
                      onClick={() => {
                        setSelectedModel(model);
                        setShowModelSelector(false);
                      }}
                      className={`w-full flex items-start gap-3 p-3 rounded-lg transition-colors ${
                        selectedModel.id === model.id
                          ? 'bg-purple-500/20 border border-purple-500/40'
                          : 'hover:bg-slate-700/50'
                      }`}
                    >
                      <span className="text-2xl">{model.icon}</span>
                      <div className="flex-1 text-left">
                        <p className="text-sm font-semibold text-white">{model.name}</p>
                        <p className="text-xs text-gray-400">{model.description}</p>
                        <span
                          className={`inline-block mt-1 px-2 py-0.5 text-xs rounded-full ${
                            model.category === 'Quick'
                              ? 'bg-green-500/20 text-green-400'
                              : model.category === 'Advanced'
                              ? 'bg-blue-500/20 text-blue-400'
                              : model.category === 'Premium'
                              ? 'bg-purple-500/20 text-purple-400'
                              : 'bg-yellow-500/20 text-yellow-400'
                          }`}
                        >
                          {model.category}
                        </span>
                      </div>
                      {selectedModel.id === model.id && (
                        <Check className="w-5 h-5 text-purple-400" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Messages or Suggested Prompts */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {messages.length === 0 ? (
          <div className="space-y-8">
            <div className="text-center mb-8">
              <div className="relative inline-block mb-4">
                <div className="absolute inset-0 bg-purple-500/20 blur-2xl rounded-full"></div>
                <div className="relative p-6 bg-gradient-to-br from-purple-500/20 to-indigo-600/20 rounded-2xl border border-purple-500/20">
                  <Brain className="w-16 h-16 text-purple-400" />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">
                Ciao! Sono PlanOra Brain
              </h3>
              <p className="text-gray-400 max-w-2xl mx-auto">
                Posso aiutarti a gestire progetti, creare report, generare idee e molto altro.
                Scegli un prompt suggerito o scrivi la tua domanda.
              </p>
            </div>

            {suggestedPrompts.map((category, idx) => {
              const Icon = category.icon;
              return (
                <div key={idx} className="space-y-3">
                  <div className="flex items-center gap-2 text-purple-400 font-semibold">
                    <Icon className="w-5 h-5" />
                    <h4>{category.category}</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {category.prompts.map((p, pIdx) => {
                      const PromptIcon = p.icon;
                      return (
                        <button
                          key={pIdx}
                          onClick={() => handleSendMessage(p.prompt)}
                          className="group relative p-4 bg-slate-800/50 hover:bg-slate-700/50 border border-purple-500/20 hover:border-purple-500/40 rounded-xl transition-all text-left"
                        >
                          <div className="flex items-start gap-3">
                            <div className="p-2 bg-purple-500/20 rounded-lg group-hover:bg-purple-500/30 transition-colors">
                              <PromptIcon className="w-5 h-5 text-purple-400" />
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-semibold text-white mb-1">
                                {p.text}
                              </p>
                              <p className="text-xs text-gray-400 line-clamp-2">
                                {p.prompt}
                              </p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-6">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex gap-4 ${
                  msg.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {msg.role === 'assistant' && (
                  <div className="flex-shrink-0">
                    <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg">
                      <Brain className="w-5 h-5 text-white" />
                    </div>
                  </div>
                )}

                <div
                  className={`max-w-[80%] ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600'
                      : 'bg-slate-800/50 border border-purple-500/20'
                  } rounded-2xl px-6 py-4`}
                >
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <p className="text-xs text-gray-400">{formatTime(msg.timestamp)}</p>
                    {msg.role === 'assistant' && (
                      <button
                        onClick={() => handleCopyMessage(msg.content, idx)}
                        className="text-gray-400 hover:text-white transition-colors"
                      >
                        {copiedIndex === idx ? (
                          <Check className="w-4 h-4 text-green-400" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    )}
                  </div>
                  <p className="text-white whitespace-pre-wrap leading-relaxed">
                    {msg.content}
                  </p>
                </div>

                {msg.role === 'user' && (
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold">
                      {JSON.parse(localStorage.getItem('user') || '{}').nome?.[0] || 'U'}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg">
                    <Brain className="w-5 h-5 text-white" />
                  </div>
                </div>
                <div className="bg-slate-800/50 border border-purple-500/20 rounded-2xl px-6 py-4">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
                    <span className="text-gray-400 text-sm">PlanOra Brain sta pensando...</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="px-6 py-4 bg-slate-800/50 border-t border-purple-500/20">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-3"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Chiedi qualcosa a PlanOra Brain..."
            className="flex-1 bg-slate-700/50 border border-purple-500/20 rounded-xl px-6 py-4 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/40 transition-colors"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="px-6 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed text-white rounded-xl transition-all flex items-center gap-2 font-semibold shadow-lg shadow-purple-500/30"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
            Invia
          </button>
        </form>
        <p className="text-xs text-gray-500 mt-2 text-center">
          Brain può commettere errori. Verifica le informazioni importanti.
        </p>
      </div>
    </div>
  );
};

export default BrainAI;
