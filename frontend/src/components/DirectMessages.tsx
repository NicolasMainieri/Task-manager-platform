import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  MessageSquare,
  Send,
  Search,
  X,
  MoreVertical,
  Edit2,
  Trash2,
  CheckCheck,
  Check,
  Plus
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL;

interface User {
  id: string;
  nome: string;
  cognome: string;
  email: string;
  avatar?: string;
  role?: {
    nome: string;
    colore?: string;
  };
}

interface DirectMessage {
  id: string;
  senderId: string;
  receiverId: string;
  messaggio: string;
  letto: boolean;
  lettoAt?: string;
  modificato: boolean;
  eliminato: boolean;
  createdAt: string;
  updatedAt: string;
  sender: User;
  receiver: User;
}

interface Conversation {
  user: User;
  lastMessage?: DirectMessage;
  unreadCount: number;
}

const DirectMessages: React.FC = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<User | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [companyUsers, setCompanyUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');

  // Ottieni il profilo utente corrente
  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/auth/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCurrentUser(response.data);
    } catch (error) {
      console.error('Error fetching current user:', error);
    }
  };

  // Carica le conversazioni
  useEffect(() => {
    fetchConversations();
    const interval = setInterval(fetchConversations, 5000); // Refresh ogni 5 secondi
    return () => clearInterval(interval);
  }, []);

  // Carica i messaggi quando si seleziona una conversazione
  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.id);
      const interval = setInterval(() => fetchMessages(selectedConversation.id), 3000);
      return () => clearInterval(interval);
    }
  }, [selectedConversation]);

  // Scroll automatico ai nuovi messaggi
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchConversations = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/direct-messages/conversations`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setConversations(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      setLoading(false);
    }
  };

  const fetchMessages = async (userId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/direct-messages/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessages(response.data);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !selectedConversation || sending) return;

    setSending(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/api/direct-messages/${selectedConversation.id}`,
        { messaggio: messageText },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessageText('');
      await fetchMessages(selectedConversation.id);
      await fetchConversations();
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Errore nell\'invio del messaggio');
    } finally {
      setSending(false);
    }
  };

  const editMessage = async (messageId: string, newText: string) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${API_URL}/api/direct-messages/${messageId}`,
        { messaggio: newText },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setEditingMessageId(null);
      if (selectedConversation) {
        await fetchMessages(selectedConversation.id);
      }
    } catch (error) {
      console.error('Error editing message:', error);
      alert('Errore nella modifica del messaggio');
    }
  };

  const deleteMessage = async (messageId: string) => {
    if (!confirm('Sei sicuro di voler eliminare questo messaggio?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/api/direct-messages/${messageId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (selectedConversation) {
        await fetchMessages(selectedConversation.id);
      }
    } catch (error) {
      console.error('Error deleting message:', error);
      alert('Errore nell\'eliminazione del messaggio');
    }
  };

  const fetchCompanyUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/direct-messages/company/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCompanyUsers(response.data);
    } catch (error) {
      console.error('Error fetching company users:', error);
    }
  };

  const startNewChat = async (user: User) => {
    setSelectedConversation(user);
    setShowNewChatModal(false);
    await fetchMessages(user.id);
  };

  const getAvatarInitials = (user: User) => {
    return `${user.nome[0]}${user.cognome[0]}`.toUpperCase();
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return 'Ieri';
    } else if (days < 7) {
      return date.toLocaleDateString('it-IT', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' });
    }
  };

  const filteredConversations = conversations.filter(conv =>
    `${conv.user.nome} ${conv.user.cognome}`.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Sidebar con lista conversazioni */}
      <div className="w-80 border-r border-gray-200 flex flex-col">
        {/* Header sidebar */}
        <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-indigo-600 to-purple-600">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-bold text-white flex items-center">
              <MessageSquare className="w-5 h-5 mr-2" />
              Messaggi Diretti
            </h2>
            <button
              onClick={() => {
                setShowNewChatModal(true);
                fetchCompanyUsers();
              }}
              className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
              title="Nuova chat"
            >
              <Plus className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Cerca conversazioni..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/30"
            />
          </div>
        </div>

        {/* Lista conversazioni */}
        <div className="flex-1 overflow-y-auto">
          {filteredConversations.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <MessageSquare className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium mb-2">Nessuna conversazione</p>
              <p className="text-sm">Inizia una nuova chat!</p>
            </div>
          ) : (
            filteredConversations.map((conv) => (
              <div
                key={conv.user.id}
                onClick={() => setSelectedConversation(conv.user)}
                className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                  selectedConversation?.id === conv.user.id ? 'bg-indigo-50 border-l-4 border-l-indigo-600' : ''
                }`}
              >
                <div className="flex items-start">
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    {conv.user.avatar ? (
                      <img
                        src={conv.user.avatar}
                        alt={`${conv.user.nome} ${conv.user.cognome}`}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold"
                        style={{ backgroundColor: conv.user.role?.colore || '#6366f1' }}
                      >
                        {getAvatarInitials(conv.user)}
                      </div>
                    )}
                    {conv.unreadCount > 0 && (
                      <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                        {conv.unreadCount}
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="ml-3 flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-semibold text-gray-900 truncate">
                        {conv.user.nome} {conv.user.cognome}
                      </h3>
                      {conv.lastMessage && (
                        <span className="text-xs text-gray-500 ml-2">
                          {formatTime(conv.lastMessage.createdAt)}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mb-1">{conv.user.role?.nome}</p>
                    {conv.lastMessage && (
                      <p className={`text-sm truncate ${conv.unreadCount > 0 ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>
                        {conv.lastMessage.senderId === currentUser?.id ? 'Tu: ' : ''}
                        {conv.lastMessage.messaggio}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Area messaggi */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            {/* Header chat */}
            <div className="p-4 border-b border-gray-200 bg-white shadow-sm">
              <div className="flex items-center">
                {selectedConversation.avatar ? (
                  <img
                    src={selectedConversation.avatar}
                    alt={`${selectedConversation.nome} ${selectedConversation.cognome}`}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold"
                    style={{ backgroundColor: selectedConversation.role?.colore || '#6366f1' }}
                  >
                    {getAvatarInitials(selectedConversation)}
                  </div>
                )}
                <div className="ml-3">
                  <h3 className="font-semibold text-gray-900">
                    {selectedConversation.nome} {selectedConversation.cognome}
                  </h3>
                  <p className="text-sm text-gray-500">{selectedConversation.role?.nome}</p>
                </div>
              </div>
            </div>

            {/* Messaggi */}
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
              {messages.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <MessageSquare className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium">Nessun messaggio</p>
                  <p className="text-sm">Inizia la conversazione!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((message) => {
                    const isMe = message.senderId === currentUser?.id;
                    return (
                      <div
                        key={message.id}
                        className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-[70%] ${isMe ? 'order-2' : 'order-1'}`}>
                          <div
                            className={`relative group rounded-lg px-4 py-2 ${
                              isMe
                                ? 'bg-indigo-600 text-white'
                                : 'bg-white text-gray-900 border border-gray-200'
                            }`}
                          >
                            {editingMessageId === message.id ? (
                              <div className="space-y-2">
                                <input
                                  type="text"
                                  value={editingText}
                                  onChange={(e) => setEditingText(e.target.value)}
                                  className="w-full px-2 py-1 text-sm border rounded text-gray-900"
                                  autoFocus
                                />
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => editMessage(message.id, editingText)}
                                    className="text-xs px-2 py-1 bg-green-500 text-white rounded"
                                  >
                                    Salva
                                  </button>
                                  <button
                                    onClick={() => setEditingMessageId(null)}
                                    className="text-xs px-2 py-1 bg-gray-500 text-white rounded"
                                  >
                                    Annulla
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <p className="text-sm break-words">{message.messaggio}</p>
                                {message.modificato && (
                                  <span className="text-xs opacity-70 italic"> (modificato)</span>
                                )}
                              </>
                            )}

                            {/* Menu azioni (solo per messaggi propri) */}
                            {isMe && !editingMessageId && (
                              <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <div className="flex gap-1 bg-white rounded-lg shadow-lg p-1">
                                  <button
                                    onClick={() => {
                                      setEditingMessageId(message.id);
                                      setEditingText(message.messaggio);
                                    }}
                                    className="p-1 hover:bg-gray-100 rounded text-gray-600"
                                    title="Modifica"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={() => deleteMessage(message.id)}
                                    className="p-1 hover:bg-gray-100 rounded text-red-600"
                                    title="Elimina"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Timestamp e stato */}
                          <div className={`flex items-center gap-1 mt-1 text-xs text-gray-500 ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <span>{formatTime(message.createdAt)}</span>
                            {isMe && (
                              message.letto ? (
                                <CheckCheck className="w-3 h-3 text-blue-500" title="Letto" />
                              ) : (
                                <Check className="w-3 h-3 text-gray-400" title="Inviato" />
                              )
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Input messaggio */}
            <form onSubmit={sendMessage} className="p-4 border-t border-gray-200 bg-white">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Scrivi un messaggio..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  disabled={sending}
                />
                <button
                  type="submit"
                  disabled={!messageText.trim() || sending}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  Invia
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <MessageSquare className="w-24 h-24 mx-auto mb-4 text-gray-300" />
              <p className="text-xl font-medium mb-2">Seleziona una conversazione</p>
              <p className="text-sm">Oppure inizia una nuova chat</p>
            </div>
          </div>
        )}
      </div>

      {/* Modal nuova chat */}
      {showNewChatModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[80vh] flex flex-col">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Nuova Chat</h3>
              <button
                onClick={() => setShowNewChatModal(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {companyUsers.length === 0 ? (
                <p className="text-center text-gray-500 py-8">Nessun utente disponibile</p>
              ) : (
                <div className="space-y-2">
                  {companyUsers.map((user) => (
                    <div
                      key={user.id}
                      onClick={() => startNewChat(user)}
                      className="flex items-center p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
                    >
                      {user.avatar ? (
                        <img
                          src={user.avatar}
                          alt={`${user.nome} ${user.cognome}`}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold"
                          style={{ backgroundColor: user.role?.colore || '#6366f1' }}
                        >
                          {getAvatarInitials(user)}
                        </div>
                      )}
                      <div className="ml-3">
                        <h4 className="font-medium text-gray-900">
                          {user.nome} {user.cognome}
                        </h4>
                        <p className="text-sm text-gray-500">{user.role?.nome}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DirectMessages;
