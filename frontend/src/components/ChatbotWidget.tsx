import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import {
  MessageSquare,
  Send,
  X,
  Minimize2,
  Maximize2,
  Bot,
  User,
  Loader2,
  Sparkles,
  Lightbulb,
  HelpCircle
} from 'lucide-react';

const API_URL = 'http://localhost:4000/api';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  sources?: string[];
  followUpQuestions?: string[];
  confidence?: number;
}

interface ChatbotWidgetProps {
  token: string;
}

const ChatbotWidget: React.FC<ChatbotWidgetProps> = ({ token }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Suggerimenti di domande iniziali
  const suggestedQuestions = [
    "Quali task ho da completare oggi?",
    "Chi è responsabile del progetto X?",
    "Come posso creare un nuovo ticket?",
    "Mostrami i task in scadenza questa settimana"
  ];

  useEffect(() => {
    if (isOpen && !isMinimized) {
      scrollToBottom();
    }
  }, [messages, isOpen, isMinimized]);

  useEffect(() => {
    if (isOpen && !isMinimized && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen, isMinimized]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = async (messageText?: string) => {
    const question = messageText || inputMessage.trim();
    if (!question || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: question,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await axios.post(
        `${API_URL}/ai/chatbot/ask`,
        { question },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.data.answer,
        timestamp: new Date(),
        sources: response.data.sources,
        followUpQuestions: response.data.follow_up_questions,
        confidence: response.data.confidence
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error('Errore chatbot:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: error.response?.data?.error || 'Scusa, si è verificato un errore. Riprova.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  // Widget button (floating)
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        data-tutorial="chatbot-widget"
        className="fixed bottom-6 right-6 w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full shadow-2xl hover:shadow-indigo-500/50 transition-all hover:scale-110 flex items-center justify-center group z-50"
        title="Apri Assistente AI"
      >
        <Bot className="w-8 h-8 text-white group-hover:animate-bounce" />
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white animate-pulse"></span>
      </button>
    );
  }

  // Chat window
  return (
    <div
      className={`fixed bottom-6 right-6 bg-slate-900 border border-indigo-500/30 rounded-2xl shadow-2xl transition-all z-50 flex flex-col ${
        isMinimized ? 'w-80 h-16' : 'w-96 h-[600px]'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-indigo-500/20 bg-gradient-to-r from-indigo-600/20 to-purple-600/20 rounded-t-2xl">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Bot className="w-6 h-6 text-indigo-400" />
            <span className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-slate-900"></span>
          </div>
          <div>
            <h3 className="text-white font-bold text-sm flex items-center gap-2">
              Assistente AI
              <Sparkles className="w-4 h-4 text-yellow-400" />
            </h3>
            <p className="text-gray-400 text-xs">Sempre pronto ad aiutarti</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1.5 hover:bg-white/10 rounded-lg transition text-gray-400 hover:text-white"
            title={isMinimized ? 'Espandi' : 'Riduci'}
          >
            {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 hover:bg-white/10 rounded-lg transition text-gray-400 hover:text-white"
            title="Chiudi"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-950/50">
            {messages.length === 0 ? (
              // Welcome Screen
              <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mb-2">
                  <Bot className="w-10 h-10 text-white" />
                </div>
                <div>
                  <h4 className="text-white font-bold text-lg mb-2">Ciao! 👋</h4>
                  <p className="text-gray-400 text-sm max-w-xs">
                    Sono il tuo assistente AI. Posso aiutarti con task, progetti, procedure e tanto altro!
                  </p>
                </div>

                {/* Suggested Questions */}
                <div className="w-full space-y-2 pt-4">
                  <p className="text-gray-500 text-xs font-semibold flex items-center justify-center gap-1">
                    <Lightbulb className="w-3 h-3" />
                    Prova a chiedere:
                  </p>
                  {suggestedQuestions.map((question, index) => (
                    <button
                      key={index}
                      onClick={() => sendMessage(question)}
                      className="w-full text-left px-3 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 rounded-lg text-gray-300 text-xs transition-all hover:border-indigo-500/40"
                    >
                      <HelpCircle className="w-3 h-3 inline mr-2 text-indigo-400" />
                      {question}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              // Messages
              <>
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {message.role === 'assistant' && (
                      <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                        <Bot className="w-5 h-5 text-white" />
                      </div>
                    )}

                    <div className={`flex flex-col max-w-[80%] ${message.role === 'user' ? 'items-end' : 'items-start'}`}>
                      <div
                        className={`px-4 py-3 rounded-2xl ${
                          message.role === 'user'
                            ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white'
                            : 'bg-slate-800 text-gray-200 border border-indigo-500/20'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      </div>

                      {/* Confidence & Sources */}
                      {message.role === 'assistant' && message.confidence !== undefined && (
                        <div className="mt-1 flex items-center gap-2 px-2">
                          <span className="text-xs text-gray-500">
                            Confidenza: {Math.round(message.confidence * 100)}%
                          </span>
                        </div>
                      )}

                      {/* Sources */}
                      {message.role === 'assistant' && message.sources && message.sources.length > 0 && (
                        <div className="mt-2 space-y-1 w-full">
                          <p className="text-xs text-gray-500 font-semibold">Fonti:</p>
                          {message.sources.map((source, idx) => (
                            <div key={idx} className="text-xs text-indigo-400 bg-indigo-500/5 px-2 py-1 rounded">
                              • {source}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Follow-up Questions */}
                      {message.role === 'assistant' && message.followUpQuestions && message.followUpQuestions.length > 0 && (
                        <div className="mt-2 space-y-1 w-full">
                          <p className="text-xs text-gray-500 font-semibold">Domande correlate:</p>
                          {message.followUpQuestions.map((question, idx) => (
                            <button
                              key={idx}
                              onClick={() => sendMessage(question)}
                              className="w-full text-left text-xs text-gray-400 hover:text-indigo-400 bg-slate-800/50 hover:bg-indigo-500/10 px-2 py-1 rounded transition-all border border-transparent hover:border-indigo-500/30"
                            >
                              → {question}
                            </button>
                          ))}
                        </div>
                      )}

                      <span className="text-xs text-gray-600 mt-1 px-2">
                        {message.timestamp.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    {message.role === 'user' && (
                      <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <User className="w-5 h-5 text-white" />
                      </div>
                    )}
                  </div>
                ))}

                {/* Loading indicator */}
                {isLoading && (
                  <div className="flex gap-3 justify-start">
                    <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <Bot className="w-5 h-5 text-white" />
                    </div>
                    <div className="px-4 py-3 rounded-2xl bg-slate-800 border border-indigo-500/20">
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
                        <span className="text-sm text-gray-400">Sto pensando...</span>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Input Area */}
          <div className="p-4 border-t border-indigo-500/20 bg-slate-900/80">
            {messages.length > 0 && (
              <button
                onClick={clearChat}
                className="text-xs text-gray-500 hover:text-indigo-400 mb-2 transition-colors"
              >
                Cancella conversazione
              </button>
            )}
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Scrivi la tua domanda..."
                disabled={isLoading}
                className="flex-1 px-4 py-3 bg-slate-800 border border-indigo-500/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500/50 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <button
                onClick={() => sendMessage()}
                disabled={!inputMessage.trim() || isLoading}
                className="p-3 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-indigo-500/50"
                title="Invia messaggio"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 text-white animate-spin" />
                ) : (
                  <Send className="w-5 h-5 text-white" />
                )}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ChatbotWidget;
