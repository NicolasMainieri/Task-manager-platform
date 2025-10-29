import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  MessageSquare,
  Send,
  Smile,
  Edit2,
  Trash2,
  Reply,
  Check,
  CheckCheck,
  Search,
  X
} from 'lucide-react';

const API_URL = 'http://localhost:4000/api';

interface User {
  id: string;
  nome: string;
  cognome: string;
  email: string;
  avatar?: string;
  role: {
    nome: string;
    colore?: string;
  };
}

interface ChatMessage {
  id: string;
  messaggio: string;
  menzioni: string;
  autoreId: string;
  companyId: string;
  modificato: boolean;
  eliminato: boolean;
  reactions: string;
  replyToId?: string;
  createdAt: string;
  updatedAt: string;
  autore: User;
  replyTo?: {
    id: string;
    messaggio: string;
    autore: {
      nome: string;
      cognome: string;
    };
  };
  readBy?: Array<{
    userId: string;
    readAt: string;
  }>;
}

const CompanyChat: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [showUserList, setShowUserList] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [mentionPosition, setMentionPosition] = useState(0);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const token = localStorage.getItem('token');

  const emojis = ['👍', '❤️', '😄', '😮', '😢', '😡', '🎉', '🚀', '👏', '🔥'];

  useEffect(() => {
    loadMessages();
    loadUsers();

    // Auto-refresh ogni 5 secondi
    const interval = setInterval(() => {
      loadMessages();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Detect @ mentions
  useEffect(() => {
    if (newMessage.includes('@')) {
      const lastAtIndex = newMessage.lastIndexOf('@');
      const textAfterAt = newMessage.substring(lastAtIndex + 1);

      if (!textAfterAt.includes(' ')) {
        setMentionSearch(textAfterAt);
        setMentionPosition(lastAtIndex);
        setShowUserList(true);
      } else {
        setShowUserList(false);
      }
    } else {
      setShowUserList(false);
    }
  }, [newMessage]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadMessages = async () => {
    try {
      const response = await axios.get(`${API_URL}/chat/messages`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessages(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Errore nel caricamento messaggi:', error);
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await axios.get(`${API_URL}/chat/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(response.data);
    } catch (error) {
      console.error('Errore nel caricamento utenti:', error);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newMessage.trim() || sending) return;

    try {
      setSending(true);

      const payload: any = {
        messaggio: editingMessage ? editingMessage.messaggio : newMessage.trim()
      };

      if (replyingTo) {
        payload.replyToId = replyingTo.id;
      }

      if (editingMessage) {
        // Edit existing message
        await axios.put(
          `${API_URL}/chat/messages/${editingMessage.id}`,
          { messaggio: newMessage.trim() },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setEditingMessage(null);
      } else {
        // Send new message
        await axios.post(`${API_URL}/chat/messages`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }

      setNewMessage('');
      setReplyingTo(null);
      loadMessages();
    } catch (error: any) {
      console.error('Errore nell\'invio del messaggio:', error);
      alert(error.response?.data?.error || 'Errore nell\'invio del messaggio');
    } finally {
      setSending(false);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!confirm('Sei sicuro di voler eliminare questo messaggio?')) return;

    try {
      await axios.delete(`${API_URL}/chat/messages/${messageId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      loadMessages();
    } catch (error: any) {
      console.error('Errore nell\'eliminazione:', error);
      alert(error.response?.data?.error || 'Errore nell\'eliminazione');
    }
  };

  const handleReaction = async (messageId: string, emoji: string) => {
    try {
      await axios.post(
        `${API_URL}/chat/messages/${messageId}/reaction`,
        { emoji },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      loadMessages();
    } catch (error) {
      console.error('Errore nell\'aggiunta reaction:', error);
    }
  };

  const handleSelectUser = (user: User) => {
    const beforeMention = newMessage.substring(0, mentionPosition);
    const afterMention = newMessage.substring(mentionPosition + mentionSearch.length + 1);
    setNewMessage(`${beforeMention}@${user.nome}${user.cognome} ${afterMention}`);
    setShowUserList(false);
    textareaRef.current?.focus();
  };

  const filteredUsers = users.filter(
    (user) =>
      user.nome.toLowerCase().includes(mentionSearch.toLowerCase()) ||
      user.cognome.toLowerCase().includes(mentionSearch.toLowerCase()) ||
      user.email.toLowerCase().includes(mentionSearch.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Ora';
    if (minutes < 60) return `${minutes}m fa`;
    if (hours < 24) return `${hours}h fa`;
    if (days < 7) return `${days}g fa`;

    return date.toLocaleDateString('it-IT', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderMessage = (msg: ChatMessage) => {
    // Parse reactions
    const reactions = msg.reactions ? JSON.parse(msg.reactions) : {};
    const hasReactions = Object.keys(reactions).length > 0;

    // Highlight mentions in message
    const renderMessageWithMentions = (text: string) => {
      const mentionRegex = /@(\w+)/g;
      const parts = text.split(mentionRegex);

      return parts.map((part, index) => {
        if (index % 2 === 1) {
          // This is a mention
          return (
            <span
              key={index}
              className="bg-indigo-500/20 text-indigo-300 px-1 rounded font-semibold"
            >
              @{part}
            </span>
          );
        }
        return part;
      });
    };

    return (
      <div key={msg.id} className="mb-4">
        {msg.replyTo && (
          <div className="ml-12 mb-1 pl-3 border-l-2 border-gray-600 text-xs text-gray-500">
            <span className="font-semibold">
              {msg.replyTo.autore.nome} {msg.replyTo.autore.cognome}
            </span>
            : {msg.replyTo.messaggio.substring(0, 50)}
            {msg.replyTo.messaggio.length > 50 && '...'}
          </div>
        )}

        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            {msg.autore.avatar ? (
              <img
                src={msg.autore.avatar}
                alt={msg.autore.nome}
                className="w-10 h-10 rounded-full"
              />
            ) : (
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                style={{ backgroundColor: msg.autore.role.colore || '#6366f1' }}
              >
                {msg.autore.nome[0]}
                {msg.autore.cognome[0]}
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-bold text-white">
                {msg.autore.nome} {msg.autore.cognome}
              </span>
              <span
                className="text-xs px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: msg.autore.role.colore + '30' || '#6366f130',
                  color: msg.autore.role.colore || '#6366f1'
                }}
              >
                {msg.autore.role.nome}
              </span>
              <span className="text-xs text-gray-500">{formatDate(msg.createdAt)}</span>
              {msg.modificato && (
                <span className="text-xs text-gray-500 italic">(modificato)</span>
              )}
            </div>

            <div className="bg-slate-800/50 rounded-lg px-4 py-3 inline-block max-w-full break-words">
              <p className="text-gray-300 whitespace-pre-wrap">
                {renderMessageWithMentions(msg.messaggio)}
              </p>

              {hasReactions && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {Object.entries(reactions).map(([emoji, userIds]: [string, any]) => (
                    <button
                      key={emoji}
                      onClick={() => handleReaction(msg.id, emoji)}
                      className="flex items-center gap-1 bg-slate-700/50 hover:bg-slate-700 rounded-full px-2 py-1 text-sm transition-colors"
                    >
                      <span>{emoji}</span>
                      <span className="text-xs text-gray-400">{userIds.length}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 mt-1">
              <button
                onClick={() => setReplyingTo(msg)}
                className="text-xs text-gray-500 hover:text-gray-300 flex items-center gap-1"
              >
                <Reply className="w-3 h-3" />
                Rispondi
              </button>

              <button
                onClick={() => setShowEmojiPicker(showEmojiPicker === msg.id ? null : msg.id)}
                className="text-xs text-gray-500 hover:text-gray-300 flex items-center gap-1"
              >
                <Smile className="w-3 h-3" />
                Reagisci
              </button>

              {msg.autoreId === JSON.parse(localStorage.getItem('user') || '{}').id && (
                <>
                  <button
                    onClick={() => {
                      setEditingMessage(msg);
                      setNewMessage(msg.messaggio);
                      textareaRef.current?.focus();
                    }}
                    className="text-xs text-gray-500 hover:text-gray-300 flex items-center gap-1"
                  >
                    <Edit2 className="w-3 h-3" />
                    Modifica
                  </button>

                  <button
                    onClick={() => handleDeleteMessage(msg.id)}
                    className="text-xs text-red-500 hover:text-red-400 flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    Elimina
                  </button>
                </>
              )}
            </div>

            {showEmojiPicker === msg.id && (
              <div className="flex gap-1 mt-2 bg-slate-700/50 rounded-lg p-2">
                {emojis.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => {
                      handleReaction(msg.id, emoji);
                      setShowEmojiPicker(null);
                    }}
                    className="text-xl hover:scale-125 transition-transform"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-xl text-gray-400">Caricamento chat...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl border border-indigo-500/20 overflow-hidden">
      {/* Header */}
      <div className="bg-slate-800/50 border-b border-indigo-500/20 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-500/20 rounded-lg">
              <MessageSquare className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Chat Aziendale</h2>
              <p className="text-sm text-gray-400">
                Chatta con i tuoi colleghi - usa @ per menzionare
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span>{users.length} membri online</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <MessageSquare className="w-16 h-16 text-gray-600 mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">
              Nessun messaggio ancora
            </h3>
            <p className="text-gray-400 mb-6">
              Inizia la conversazione con i tuoi colleghi!
            </p>
          </div>
        ) : (
          <>
            {messages.map(renderMessage)}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Reply/Edit Banner */}
      {(replyingTo || editingMessage) && (
        <div className="px-6 py-2 bg-indigo-500/10 border-t border-indigo-500/20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {replyingTo && (
              <>
                <Reply className="w-4 h-4 text-indigo-400" />
                <span className="text-sm text-gray-300">
                  Rispondendo a{' '}
                  <span className="font-semibold">
                    {replyingTo.autore.nome} {replyingTo.autore.cognome}
                  </span>
                </span>
              </>
            )}
            {editingMessage && (
              <>
                <Edit2 className="w-4 h-4 text-yellow-400" />
                <span className="text-sm text-gray-300">
                  Modificando il messaggio
                </span>
              </>
            )}
          </div>
          <button
            onClick={() => {
              setReplyingTo(null);
              setEditingMessage(null);
              setNewMessage('');
            }}
            className="text-gray-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* User mention dropdown */}
      {showUserList && filteredUsers.length > 0 && (
        <div className="mx-6 mb-2 bg-slate-700 rounded-lg border border-indigo-500/20 max-h-48 overflow-y-auto">
          {filteredUsers.map((user) => (
            <button
              key={user.id}
              onClick={() => handleSelectUser(user)}
              className="w-full flex items-center gap-3 px-4 py-2 hover:bg-slate-600 transition-colors text-left"
            >
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.nome}
                  className="w-8 h-8 rounded-full"
                />
              ) : (
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                  style={{ backgroundColor: user.role.colore || '#6366f1' }}
                >
                  {user.nome[0]}
                  {user.cognome[0]}
                </div>
              )}
              <div className="flex-1">
                <p className="text-sm font-semibold text-white">
                  {user.nome} {user.cognome}
                </p>
                <p className="text-xs text-gray-400">{user.role.nome}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSendMessage} className="px-6 py-4 bg-slate-800/50 border-t border-indigo-500/20">
        <div className="flex items-end gap-3">
          <textarea
            ref={textareaRef}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage(e);
              }
            }}
            placeholder="Scrivi un messaggio... (usa @ per menzionare)"
            className="flex-1 bg-slate-700/50 border border-indigo-500/20 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500/40 resize-none"
            rows={2}
            disabled={sending}
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || sending}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-2 font-semibold"
          >
            <Send className="w-5 h-5" />
            {sending ? 'Invio...' : editingMessage ? 'Salva' : 'Invia'}
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Premi Invio per inviare, Shift+Invio per andare a capo
        </p>
      </form>
    </div>
  );
};

export default CompanyChat;
