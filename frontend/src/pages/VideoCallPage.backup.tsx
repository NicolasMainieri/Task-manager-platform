import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { io, Socket } from 'socket.io-client';
import Peer from 'simple-peer';
import { Video, VideoOff, Mic, MicOff, PhoneOff, MessageSquare, Users, Calendar, Clock, Settings, X, Plus, Send, ExternalLink } from 'lucide-react';

const API_URL = 'http://localhost:4000/api';

interface Room {
  id: string;
  nome: string;
  descrizione?: string;
  tipo: string;
  creatoreId: string;
  maxPartecipanti: number;
  isActive: boolean;
  scheduledAt?: string;
  meetingProvider?: string;
  zoomJoinUrl?: string;
  googleMeetUrl?: string;
  invitedUserIds: string;
  creatore: {
    nome: string;
    cognome: string;
    avatar?: string;
  };
}

interface VideoUser {
  userId: string;
  socketId: string;
  userName: string;
  isMuted: boolean;
  isVideoOff: boolean;
  stream?: MediaStream;
  peer?: Peer.Instance;
}

interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  messaggio: string;
  createdAt: Date;
}

interface User {
  id: string;
  nome: string;
  cognome: string;
  email: string;
  avatar?: string;
}

const VideoCallPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'rooms' | 'scheduled' | 'integrations'>('rooms');
  const [rooms, setRooms] = useState<Room[]>([]);
  const [scheduledMeetings, setScheduledMeetings] = useState<Room[]>([]);
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [inCall, setInCall] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [users, setUsers] = useState<VideoUser[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [showChat, setShowChat] = useState(true);

  // Admin modals
  const [showInstantMeetingModal, setShowInstantMeetingModal] = useState(false);
  const [showScheduleMeetingModal, setShowScheduleMeetingModal] = useState(false);
  const [showNewRoomModal, setShowNewRoomModal] = useState(false);

  // Instant meeting state
  const [instantMeetingName, setInstantMeetingName] = useState('');
  const [instantMeetingDescription, setInstantMeetingDescription] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);

  // Schedule meeting state
  const [scheduleMeetingName, setScheduleMeetingName] = useState('');
  const [scheduleMeetingDescription, setScheduleMeetingDescription] = useState('');
  const [scheduleMeetingDate, setScheduleMeetingDate] = useState('');
  const [scheduleMeetingTime, setScheduleMeetingTime] = useState('');
  const [scheduleSelectedUsers, setScheduleSelectedUsers] = useState<string[]>([]);
  const [meetingProvider, setMeetingProvider] = useState<'native' | 'zoom' | 'google_meet'>('native');

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideosRef = useRef<Map<string, HTMLVideoElement>>(new Map());
  const socketRef = useRef<Socket | null>(null);
  const peersRef = useRef<Map<string, Peer.Instance>>(new Map());

  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const token = localStorage.getItem('token');
  const isAdmin = currentUser.role?.nome === 'Admin';

  // Load initial data
  useEffect(() => {
    loadRooms();
    loadScheduledMeetings();
    if (isAdmin) {
      loadAvailableUsers();
    }
  }, []);

  const loadRooms = async () => {
    try {
      const response = await axios.get(`${API_URL}/video/rooms`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      // Filter only active, non-scheduled rooms
      const activeRooms = response.data.filter((r: Room) => r.isActive && !r.scheduledAt);
      setRooms(activeRooms);
    } catch (error) {
      console.error('Errore caricamento rooms:', error);
    }
  };

  const loadScheduledMeetings = async () => {
    try {
      const response = await axios.get(`${API_URL}/video/rooms`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      // Filter scheduled meetings
      const scheduled = response.data.filter((r: Room) => r.scheduledAt);
      setScheduledMeetings(scheduled);
    } catch (error) {
      console.error('Errore caricamento scheduled meetings:', error);
    }
  };

  const loadAvailableUsers = async () => {
    try {
      const response = await axios.get(`${API_URL}/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      // Filter out current user
      const users = response.data.filter((u: User) => u.id !== currentUser.id);
      setAvailableUsers(users);
    } catch (error) {
      console.error('Errore caricamento utenti:', error);
    }
  };

  // Admin: Start instant meeting
  const handleStartInstantMeeting = async () => {
    if (!instantMeetingName.trim()) {
      alert('Inserisci un nome per la riunione');
      return;
    }

    try {
      const response = await axios.post(
        `${API_URL}/video/rooms`,
        {
          nome: instantMeetingName,
          descrizione: instantMeetingDescription,
          tipo: 'meeting',
          invitedUserIds: JSON.stringify(selectedUsers),
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const newRoom = response.data;

      // Send notifications to selected users
      if (selectedUsers.length > 0) {
        await axios.post(
          `${API_URL}/video/rooms/${newRoom.id}/notify`,
          { userIds: selectedUsers },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }

      // Reset and join
      setInstantMeetingName('');
      setInstantMeetingDescription('');
      setSelectedUsers([]);
      setShowInstantMeetingModal(false);

      // Join the room immediately
      await loadRooms();
      joinRoom(newRoom);
    } catch (error) {
      console.error('Errore creazione meeting istantaneo:', error);
      alert('Errore durante la creazione della riunione');
    }
  };

  // Admin: Schedule meeting
  const handleScheduleMeeting = async () => {
    if (!scheduleMeetingName.trim() || !scheduleMeetingDate || !scheduleMeetingTime) {
      alert('Compila tutti i campi obbligatori');
      return;
    }

    try {
      const scheduledDateTime = new Date(`${scheduleMeetingDate}T${scheduleMeetingTime}`);

      const roomData: any = {
        nome: scheduleMeetingName,
        descrizione: scheduleMeetingDescription,
        tipo: 'scheduled',
        scheduledAt: scheduledDateTime.toISOString(),
        invitedUserIds: JSON.stringify(scheduleSelectedUsers),
        meetingProvider,
      };

      // If Zoom or Google Meet, we would create the meeting here
      // For now, we'll just store the provider type
      if (meetingProvider === 'zoom') {
        // TODO: Create Zoom meeting via API
        // roomData.zoomMeetingId = zoomResponse.id;
        // roomData.zoomJoinUrl = zoomResponse.join_url;
      } else if (meetingProvider === 'google_meet') {
        // TODO: Create Google Meet via Google Calendar API
        // roomData.googleMeetUrl = meetResponse.hangoutLink;
      }

      const response = await axios.post(
        `${API_URL}/video/rooms`,
        roomData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const newRoom = response.data;

      // Send notifications
      if (scheduleSelectedUsers.length > 0) {
        await axios.post(
          `${API_URL}/video/rooms/${newRoom.id}/notify`,
          { userIds: scheduleSelectedUsers },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }

      // Reset
      setScheduleMeetingName('');
      setScheduleMeetingDescription('');
      setScheduleMeetingDate('');
      setScheduleMeetingTime('');
      setScheduleSelectedUsers([]);
      setMeetingProvider('native');
      setShowScheduleMeetingModal(false);

      loadScheduledMeetings();
      alert('Riunione programmata con successo!');
    } catch (error) {
      console.error('Errore programmazione meeting:', error);
      alert('Errore durante la programmazione della riunione');
    }
  };

  // Join room with improved WebRTC handling
  const joinRoom = async (room: Room) => {
    try {
      setCurrentRoom(room);

      // Get media stream
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
        audio: { echoCancellation: true, noiseSuppression: true },
      });

      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Connect to Socket.IO
      const socket = io('http://localhost:4000/video', {
        transports: ['websocket'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
      });

      socketRef.current = socket;

      socket.on('connect', () => {
        console.log('✅ Socket connected:', socket.id);

        // Join room
        socket.emit('join-room', {
          roomId: room.id,
          userId: currentUser.id,
          userName: `${currentUser.nome} ${currentUser.cognome}`,
        });
      });

      socket.on('error', (error: any) => {
        console.error('❌ Socket error:', error);
        alert(error.message || 'Errore connessione');
      });

      // Room users list
      socket.on('room-users', (otherUsers: VideoUser[]) => {
        console.log('👥 Users in room:', otherUsers);
        setUsers(otherUsers);

        // Create peer for each existing user (we are initiator)
        otherUsers.forEach((user) => {
          createPeer(user.socketId, stream, true);
        });
      });

      // New user joined
      socket.on('user-joined', (user: VideoUser) => {
        console.log('👤 User joined:', user);
        setUsers((prev) => {
          // Check if user already exists
          if (prev.find(u => u.socketId === user.socketId)) {
            return prev;
          }
          return [...prev, user];
        });
        // We don't create peer here, we wait for their offer
      });

      // Receive offer from initiator
      socket.on('offer', ({ from, offer }: { from: string; offer: any }) => {
        console.log('📨 Received offer from:', from);
        handleReceiveOffer(from, offer, stream);
      });

      // Receive answer
      socket.on('answer', ({ from, answer }: { from: string; answer: any }) => {
        console.log('📨 Received answer from:', from);
        const peer = peersRef.current.get(from);
        if (peer) {
          peer.signal(answer);
        } else {
          console.warn('⚠️ Peer not found for answer:', from);
        }
      });

      // ICE candidate
      socket.on('ice-candidate', ({ from, candidate }: { from: string; candidate: any }) => {
        const peer = peersRef.current.get(from);
        if (peer) {
          peer.signal(candidate);
        }
      });

      // User left
      socket.on('user-left', ({ socketId }: { socketId: string }) => {
        console.log('👋 User left:', socketId);
        const peer = peersRef.current.get(socketId);
        if (peer) {
          peer.destroy();
          peersRef.current.delete(socketId);
        }
        setUsers((prev) => prev.filter((u) => u.socketId !== socketId));
      });

      // Chat message
      socket.on('chat-message', (message: ChatMessage) => {
        setChatMessages((prev) => [...prev, message]);
      });

      // Mute/unmute
      socket.on('user-toggled-mute', ({ userId, isMuted }: { userId: string; isMuted: boolean }) => {
        setUsers((prev) =>
          prev.map((u) => (u.userId === userId ? { ...u, isMuted } : u))
        );
      });

      // Video on/off
      socket.on('user-toggled-video', ({ userId, isVideoOff }: { userId: string; isVideoOff: boolean }) => {
        setUsers((prev) =>
          prev.map((u) => (u.userId === userId ? { ...u, isVideoOff } : u))
        );
      });

      setInCall(true);
    } catch (error: any) {
      console.error('❌ Error joining room:', error);
      if (error.name === 'NotAllowedError') {
        alert('Permesso negato per accedere a camera/microfono. Controlla le impostazioni del browser.');
      } else if (error.name === 'NotFoundError') {
        alert('Nessuna camera o microfono trovato.');
      } else {
        alert('Impossibile accedere alla camera/microfono: ' + error.message);
      }
    }
  };

  // Create peer connection
  const createPeer = (targetSocketId: string, stream: MediaStream, initiator: boolean): Peer.Instance => {
    console.log(`${initiator ? '📤 Creating' : '📥 Answering'} peer to:`, targetSocketId);

    const peer = new Peer({
      initiator,
      trickle: true, // Changed to true for better connectivity
      stream,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:global.stun.twilio.com:3478' },
        ],
      },
    });

    peer.on('signal', (data) => {
      console.log('📡 Signaling to:', targetSocketId, initiator ? 'OFFER' : 'ANSWER');
      if (initiator) {
        socketRef.current?.emit('offer', { to: targetSocketId, offer: data });
      } else {
        socketRef.current?.emit('answer', { to: targetSocketId, answer: data });
      }
    });

    peer.on('stream', (remoteStream) => {
      console.log('🎥 Received stream from:', targetSocketId);
      setUsers((prev) =>
        prev.map((u) =>
          u.socketId === targetSocketId ? { ...u, stream: remoteStream } : u
        )
      );
    });

    peer.on('error', (err) => {
      console.error('❌ Peer error:', err);
    });

    peer.on('close', () => {
      console.log('🔌 Peer closed:', targetSocketId);
    });

    peersRef.current.set(targetSocketId, peer);
    return peer;
  };

  // Handle receiving offer
  const handleReceiveOffer = (fromSocketId: string, offer: any, stream: MediaStream) => {
    console.log('📨 Handling offer from:', fromSocketId);
    const peer = createPeer(fromSocketId, stream, false);
    peer.signal(offer);
  };

  // Toggle mute
  const toggleMute = () => {
    if (localStream) {
      const enabled = !isMuted;
      localStream.getAudioTracks().forEach((track) => {
        track.enabled = enabled;
      });
      setIsMuted(!enabled);
      socketRef.current?.emit('toggle-mute', !enabled);
    }
  };

  // Toggle video
  const toggleVideo = () => {
    if (localStream) {
      const enabled = !isVideoOff;
      localStream.getVideoTracks().forEach((track) => {
        track.enabled = enabled;
      });
      setIsVideoOff(!enabled);
      socketRef.current?.emit('toggle-video', !enabled);
    }
  };

  // Send chat message
  const sendChatMessage = () => {
    if (!chatInput.trim()) return;
    socketRef.current?.emit('chat-message', chatInput);
    setChatInput('');
  };

  // Leave room
  const leaveRoom = () => {
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
      setLocalStream(null);
    }

    peersRef.current.forEach((peer) => peer.destroy());
    peersRef.current.clear();

    socketRef.current?.emit('leave-room');
    socketRef.current?.disconnect();
    socketRef.current = null;

    setInCall(false);
    setCurrentRoom(null);
    setUsers([]);
    setChatMessages([]);
    setIsMuted(false);
    setIsVideoOff(false);
    setShowChat(true);
  };

  // Toggle user selection
  const toggleUserSelection = (userId: string, isScheduled = false) => {
    if (isScheduled) {
      setScheduleSelectedUsers((prev) =>
        prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
      );
    } else {
      setSelectedUsers((prev) =>
        prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
      );
    }
  };

  // Render: In-call view
  if (inCall && currentRoom) {
    return (
      <div className="flex h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900">
        {/* Main video area */}
        <div className="flex-1 flex flex-col p-4">
          {/* Header */}
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">{currentRoom.nome}</h2>
              <p className="text-gray-400 text-sm">{users.length + 1} partecipanti</p>
            </div>
            <button
              onClick={() => setShowChat(!showChat)}
              className="p-3 rounded-lg bg-slate-800 text-white hover:bg-slate-700 transition-colors"
            >
              <MessageSquare className="w-5 h-5" />
            </button>
          </div>

          {/* Video grid */}
          <div className="flex-1 grid gap-4" style={{
            gridTemplateColumns: users.length === 0 ? '1fr' : users.length === 1 ? 'repeat(2, 1fr)' : 'repeat(auto-fit, minmax(300px, 1fr))',
          }}>
            {/* Local video */}
            <div className="relative bg-slate-800 rounded-xl overflow-hidden shadow-2xl border border-indigo-500/20">
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
              />
              {isVideoOff && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
                  <div className="text-center">
                    <div className="w-20 h-20 rounded-full bg-indigo-600 flex items-center justify-center mx-auto mb-2">
                      <span className="text-2xl font-bold text-white">
                        {currentUser.nome[0]}{currentUser.cognome[0]}
                      </span>
                    </div>
                  </div>
                </div>
              )}
              <div className="absolute bottom-4 left-4 bg-black/70 backdrop-blur-sm px-3 py-2 rounded-lg flex items-center gap-2">
                <span className="text-white font-medium">Tu</span>
                {isMuted && <MicOff className="w-4 h-4 text-red-400" />}
                {isVideoOff && <VideoOff className="w-4 h-4 text-red-400" />}
              </div>
            </div>

            {/* Remote videos */}
            {users.map((user) => (
              <div key={user.socketId} className="relative bg-slate-800 rounded-xl overflow-hidden shadow-2xl border border-indigo-500/20">
                {user.stream ? (
                  <video
                    autoPlay
                    playsInline
                    ref={(el) => {
                      if (el && user.stream) {
                        el.srcObject = user.stream;
                        remoteVideosRef.current.set(user.socketId, el);
                      }
                    }}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-slate-900">
                    <div className="text-center">
                      <div className="w-16 h-16 rounded-full bg-purple-600 flex items-center justify-center mx-auto mb-2">
                        <Users className="w-8 h-8 text-white" />
                      </div>
                      <p className="text-gray-400">Connessione...</p>
                    </div>
                  </div>
                )}
                {user.isVideoOff && user.stream && (
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
                    <div className="w-20 h-20 rounded-full bg-purple-600 flex items-center justify-center">
                      <span className="text-2xl font-bold text-white">
                        {user.userName.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                  </div>
                )}
                <div className="absolute bottom-4 left-4 bg-black/70 backdrop-blur-sm px-3 py-2 rounded-lg flex items-center gap-2">
                  <span className="text-white font-medium">{user.userName}</span>
                  {user.isMuted && <MicOff className="w-4 h-4 text-red-400" />}
                  {user.isVideoOff && <VideoOff className="w-4 h-4 text-red-400" />}
                </div>
              </div>
            ))}
          </div>

          {/* Controls */}
          <div className="mt-4 flex items-center justify-center gap-4">
            <button
              onClick={toggleMute}
              className={`p-4 rounded-full transition-all ${
                isMuted ? 'bg-red-600 hover:bg-red-700' : 'bg-slate-700 hover:bg-slate-600'
              } text-white shadow-lg`}
              title={isMuted ? 'Attiva microfono' : 'Disattiva microfono'}
            >
              {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
            </button>

            <button
              onClick={toggleVideo}
              className={`p-4 rounded-full transition-all ${
                isVideoOff ? 'bg-red-600 hover:bg-red-700' : 'bg-slate-700 hover:bg-slate-600'
              } text-white shadow-lg`}
              title={isVideoOff ? 'Attiva videocamera' : 'Disattiva videocamera'}
            >
              {isVideoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
            </button>

            <button
              onClick={leaveRoom}
              className="p-4 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-lg transition-all"
              title="Lascia chiamata"
            >
              <PhoneOff className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Chat sidebar */}
        {showChat && (
          <div className="w-96 bg-slate-800 border-l border-indigo-500/20 flex flex-col">
            <div className="p-4 border-b border-indigo-500/20 flex items-center justify-between">
              <h3 className="text-white font-bold text-lg">Chat</h3>
              <button onClick={() => setShowChat(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {chatMessages.map((msg, index) => (
                <div key={index} className="bg-slate-700/50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-indigo-400 text-sm">{msg.userName}</span>
                    <span className="text-xs text-gray-500">
                      {new Date(msg.createdAt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-white text-sm">{msg.messaggio}</p>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-indigo-500/20">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
                  placeholder="Scrivi un messaggio..."
                  className="flex-1 px-4 py-2 bg-slate-700 text-white rounded-lg border border-slate-600 focus:outline-none focus:border-indigo-500"
                />
                <button
                  onClick={sendChatMessage}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Render: Main lobby view
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Videochiamate</h1>
            <p className="text-gray-400">Gestisci le tue riunioni e videochiamate</p>
          </div>

          {isAdmin && (
            <div className="flex gap-3">
              <button
                onClick={() => setShowInstantMeetingModal(true)}
                className="px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-lg flex items-center gap-2 font-semibold"
              >
                <Video className="w-5 h-5" />
                Avvia Riunione
              </button>
              <button
                onClick={() => setShowScheduleMeetingModal(true)}
                className="px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-all shadow-lg flex items-center gap-2 font-semibold"
              >
                <Calendar className="w-5 h-5" />
                Pianifica Riunione
              </button>
            </div>
          )}

          {!isAdmin && (
            <button
              onClick={() => setShowNewRoomModal(true)}
              className="px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-lg flex items-center gap-2 font-semibold"
            >
              <Plus className="w-5 h-5" />
              Nuova Stanza
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-4 border-b border-indigo-500/20">
          <button
            onClick={() => setActiveTab('rooms')}
            className={`px-6 py-3 font-semibold transition-all ${
              activeTab === 'rooms'
                ? 'text-indigo-400 border-b-2 border-indigo-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Stanze Attive
          </button>
          <button
            onClick={() => setActiveTab('scheduled')}
            className={`px-6 py-3 font-semibold transition-all ${
              activeTab === 'scheduled'
                ? 'text-indigo-400 border-b-2 border-indigo-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Riunioni Programmate
          </button>
          <button
            onClick={() => setActiveTab('integrations')}
            className={`px-6 py-3 font-semibold transition-all ${
              activeTab === 'integrations'
                ? 'text-indigo-400 border-b-2 border-indigo-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Integrazioni
          </button>
        </div>

        {/* Active Rooms Tab */}
        {activeTab === 'rooms' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rooms.map((room) => (
              <div
                key={room.id}
                className="bg-slate-800/50 backdrop-blur-sm border border-indigo-500/20 rounded-2xl p-6 hover:border-indigo-500/40 transition-all shadow-xl"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white mb-2">{room.nome}</h3>
                    {room.descrizione && (
                      <p className="text-gray-400 text-sm mb-3">{room.descrizione}</p>
                    )}
                  </div>
                  <div className="w-12 h-12 rounded-full bg-indigo-600/20 flex items-center justify-center">
                    <Video className="w-6 h-6 text-indigo-400" />
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm text-gray-400 mb-4">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    <span>0 / {room.maxPartecipanti}</span>
                  </div>
                  <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full">Attiva</span>
                </div>

                <button
                  onClick={() => joinRoom(room)}
                  className="w-full px-4 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all font-semibold shadow-lg"
                >
                  Entra nella Stanza
                </button>
              </div>
            ))}

            {rooms.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center py-20">
                <Video className="w-16 h-16 text-gray-600 mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">Nessuna stanza attiva</h3>
                <p className="text-gray-400 mb-6">Crea una nuova stanza per iniziare</p>
                {!isAdmin && (
                  <button
                    onClick={() => setShowNewRoomModal(true)}
                    className="px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all"
                  >
                    Crea Stanza
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Scheduled Meetings Tab */}
        {activeTab === 'scheduled' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {scheduledMeetings.map((meeting) => {
              const scheduledDate = new Date(meeting.scheduledAt!);
              const isUpcoming = scheduledDate > new Date();

              return (
                <div
                  key={meeting.id}
                  className="bg-slate-800/50 backdrop-blur-sm border border-indigo-500/20 rounded-2xl p-6 hover:border-indigo-500/40 transition-all shadow-xl"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-white mb-2">{meeting.nome}</h3>
                      {meeting.descrizione && (
                        <p className="text-gray-400 text-sm mb-3">{meeting.descrizione}</p>
                      )}
                    </div>
                    <div className="w-12 h-12 rounded-full bg-purple-600/20 flex items-center justify-center">
                      <Calendar className="w-6 h-6 text-purple-400" />
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <Calendar className="w-4 h-4" />
                      <span>{scheduledDate.toLocaleDateString('it-IT')}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <Clock className="w-4 h-4" />
                      <span>{scheduledDate.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    {meeting.meetingProvider && meeting.meetingProvider !== 'native' && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded-full">
                          {meeting.meetingProvider === 'zoom' ? 'Zoom' : 'Google Meet'}
                        </span>
                      </div>
                    )}
                  </div>

                  {isUpcoming ? (
                    <button
                      onClick={() => {
                        if (meeting.zoomJoinUrl) {
                          window.open(meeting.zoomJoinUrl, '_blank');
                        } else if (meeting.googleMeetUrl) {
                          window.open(meeting.googleMeetUrl, '_blank');
                        } else {
                          joinRoom(meeting);
                        }
                      }}
                      className="w-full px-4 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-all font-semibold shadow-lg flex items-center justify-center gap-2"
                    >
                      {(meeting.zoomJoinUrl || meeting.googleMeetUrl) && <ExternalLink className="w-4 h-4" />}
                      Partecipa
                    </button>
                  ) : (
                    <div className="text-center py-3 text-gray-500 text-sm">Riunione terminata</div>
                  )}
                </div>
              );
            })}

            {scheduledMeetings.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center py-20">
                <Calendar className="w-16 h-16 text-gray-600 mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">Nessuna riunione programmata</h3>
                <p className="text-gray-400">Le riunioni programmate appariranno qui</p>
              </div>
            )}
          </div>
        )}

        {/* Integrations Tab */}
        {activeTab === 'integrations' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Zoom */}
            <div className="bg-slate-800/50 backdrop-blur-sm border border-indigo-500/20 rounded-2xl p-8">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 rounded-xl bg-blue-600/20 flex items-center justify-center">
                  <Video className="w-8 h-8 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white">Zoom</h3>
                  <p className="text-gray-400 text-sm">Integrazione con Zoom Meetings</p>
                </div>
              </div>
              <p className="text-gray-300 mb-6">
                Collega il tuo account Zoom per creare e gestire meeting direttamente dalla piattaforma.
              </p>
              <button className="w-full px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all font-semibold">
                Connetti Zoom
              </button>
              <p className="text-xs text-gray-500 mt-3">
                Richiede account Zoom e API credentials
              </p>
            </div>

            {/* Google Meet */}
            <div className="bg-slate-800/50 backdrop-blur-sm border border-indigo-500/20 rounded-2xl p-8">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 rounded-xl bg-green-600/20 flex items-center justify-center">
                  <Video className="w-8 h-8 text-green-400" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white">Google Meet</h3>
                  <p className="text-gray-400 text-sm">Integrazione con Google Meet</p>
                </div>
              </div>
              <p className="text-gray-300 mb-6">
                Collega il tuo account Google per creare meeting Google Meet integrati con il calendario.
              </p>
              <button className="w-full px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all font-semibold">
                Connetti Google Meet
              </button>
              <p className="text-xs text-gray-500 mt-3">
                Usa l'integrazione Google Calendar esistente
              </p>
            </div>
          </div>
        )}

        {/* Admin: Instant Meeting Modal */}
        {showInstantMeetingModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl border border-indigo-500/20">
              <div className="p-6 border-b border-indigo-500/20">
                <h2 className="text-2xl font-bold text-white">Avvia Riunione Immediata</h2>
                <p className="text-gray-400 mt-1">Crea e avvia una riunione immediatamente</p>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">Nome Riunione *</label>
                  <input
                    type="text"
                    value={instantMeetingName}
                    onChange={(e) => setInstantMeetingName(e.target.value)}
                    placeholder="Es: Standup Team"
                    className="w-full px-4 py-3 bg-slate-700 text-white rounded-xl border border-slate-600 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-white mb-2">Descrizione</label>
                  <textarea
                    value={instantMeetingDescription}
                    onChange={(e) => setInstantMeetingDescription(e.target.value)}
                    placeholder="Descrizione opzionale..."
                    rows={3}
                    className="w-full px-4 py-3 bg-slate-700 text-white rounded-xl border border-slate-600 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-white mb-3">Invita Partecipanti</label>
                  <div className="max-h-48 overflow-y-auto space-y-2 bg-slate-700/50 rounded-xl p-3">
                    {availableUsers.map((user) => (
                      <label key={user.id} className="flex items-center gap-3 p-2 hover:bg-slate-600/50 rounded-lg cursor-pointer transition-colors">
                        <input
                          type="checkbox"
                          checked={selectedUsers.includes(user.id)}
                          onChange={() => toggleUserSelection(user.id)}
                          className="w-4 h-4 text-indigo-600 bg-slate-600 border-slate-500 rounded focus:ring-indigo-500"
                        />
                        <div className="flex-1">
                          <p className="text-white font-medium">{user.nome} {user.cognome}</p>
                          <p className="text-gray-400 text-xs">{user.email}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    {selectedUsers.length} utenti selezionati - Riceveranno una notifica
                  </p>
                </div>
              </div>

              <div className="p-6 border-t border-indigo-500/20 flex gap-3">
                <button
                  onClick={() => {
                    setShowInstantMeetingModal(false);
                    setInstantMeetingName('');
                    setInstantMeetingDescription('');
                    setSelectedUsers([]);
                  }}
                  className="flex-1 px-6 py-3 bg-slate-700 text-white rounded-xl hover:bg-slate-600 transition-all font-semibold"
                >
                  Annulla
                </button>
                <button
                  onClick={handleStartInstantMeeting}
                  className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all font-semibold"
                >
                  Avvia Riunione
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Admin: Schedule Meeting Modal */}
        {showScheduleMeetingModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl border border-indigo-500/20 my-8">
              <div className="p-6 border-b border-indigo-500/20">
                <h2 className="text-2xl font-bold text-white">Pianifica Riunione</h2>
                <p className="text-gray-400 mt-1">Programma una riunione futura</p>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">Nome Riunione *</label>
                  <input
                    type="text"
                    value={scheduleMeetingName}
                    onChange={(e) => setScheduleMeetingName(e.target.value)}
                    placeholder="Es: Revisione Progetto"
                    className="w-full px-4 py-3 bg-slate-700 text-white rounded-xl border border-slate-600 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-white mb-2">Descrizione</label>
                  <textarea
                    value={scheduleMeetingDescription}
                    onChange={(e) => setScheduleMeetingDescription(e.target.value)}
                    placeholder="Descrizione opzionale..."
                    rows={3}
                    className="w-full px-4 py-3 bg-slate-700 text-white rounded-xl border border-slate-600 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-white mb-2">Data *</label>
                    <input
                      type="date"
                      value={scheduleMeetingDate}
                      onChange={(e) => setScheduleMeetingDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-4 py-3 bg-slate-700 text-white rounded-xl border border-slate-600 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-white mb-2">Ora *</label>
                    <input
                      type="time"
                      value={scheduleMeetingTime}
                      onChange={(e) => setScheduleMeetingTime(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-700 text-white rounded-xl border border-slate-600 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-white mb-2">Piattaforma</label>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      onClick={() => setMeetingProvider('native')}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        meetingProvider === 'native'
                          ? 'border-indigo-500 bg-indigo-500/20'
                          : 'border-slate-600 bg-slate-700 hover:border-slate-500'
                      }`}
                    >
                      <Video className="w-6 h-6 text-white mx-auto mb-2" />
                      <p className="text-white text-sm font-semibold">Nativo</p>
                    </button>
                    <button
                      onClick={() => setMeetingProvider('zoom')}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        meetingProvider === 'zoom'
                          ? 'border-blue-500 bg-blue-500/20'
                          : 'border-slate-600 bg-slate-700 hover:border-slate-500'
                      }`}
                    >
                      <Video className="w-6 h-6 text-blue-400 mx-auto mb-2" />
                      <p className="text-white text-sm font-semibold">Zoom</p>
                    </button>
                    <button
                      onClick={() => setMeetingProvider('google_meet')}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        meetingProvider === 'google_meet'
                          ? 'border-green-500 bg-green-500/20'
                          : 'border-slate-600 bg-slate-700 hover:border-slate-500'
                      }`}
                    >
                      <Video className="w-6 h-6 text-green-400 mx-auto mb-2" />
                      <p className="text-white text-sm font-semibold">Meet</p>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-white mb-3">Invita Partecipanti</label>
                  <div className="max-h-48 overflow-y-auto space-y-2 bg-slate-700/50 rounded-xl p-3">
                    {availableUsers.map((user) => (
                      <label key={user.id} className="flex items-center gap-3 p-2 hover:bg-slate-600/50 rounded-lg cursor-pointer transition-colors">
                        <input
                          type="checkbox"
                          checked={scheduleSelectedUsers.includes(user.id)}
                          onChange={() => toggleUserSelection(user.id, true)}
                          className="w-4 h-4 text-indigo-600 bg-slate-600 border-slate-500 rounded focus:ring-indigo-500"
                        />
                        <div className="flex-1">
                          <p className="text-white font-medium">{user.nome} {user.cognome}</p>
                          <p className="text-gray-400 text-xs">{user.email}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    {scheduleSelectedUsers.length} utenti selezionati - Verrà creato un evento nel calendario
                  </p>
                </div>
              </div>

              <div className="p-6 border-t border-indigo-500/20 flex gap-3">
                <button
                  onClick={() => {
                    setShowScheduleMeetingModal(false);
                    setScheduleMeetingName('');
                    setScheduleMeetingDescription('');
                    setScheduleMeetingDate('');
                    setScheduleMeetingTime('');
                    setScheduleSelectedUsers([]);
                    setMeetingProvider('native');
                  }}
                  className="flex-1 px-6 py-3 bg-slate-700 text-white rounded-xl hover:bg-slate-600 transition-all font-semibold"
                >
                  Annulla
                </button>
                <button
                  onClick={handleScheduleMeeting}
                  className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-all font-semibold"
                >
                  Pianifica Riunione
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Regular User: New Room Modal */}
        {showNewRoomModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-2xl w-full max-w-md shadow-2xl border border-indigo-500/20">
              <div className="p-6 border-b border-indigo-500/20">
                <h2 className="text-2xl font-bold text-white">Crea Nuova Stanza</h2>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">Nome Stanza</label>
                  <input
                    type="text"
                    value={instantMeetingName}
                    onChange={(e) => setInstantMeetingName(e.target.value)}
                    placeholder="Es: Sala Riunioni"
                    className="w-full px-4 py-3 bg-slate-700 text-white rounded-xl border border-slate-600 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-white mb-2">Descrizione</label>
                  <textarea
                    value={instantMeetingDescription}
                    onChange={(e) => setInstantMeetingDescription(e.target.value)}
                    placeholder="Descrizione opzionale..."
                    rows={3}
                    className="w-full px-4 py-3 bg-slate-700 text-white rounded-xl border border-slate-600 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="p-6 border-t border-indigo-500/20 flex gap-3">
                <button
                  onClick={() => {
                    setShowNewRoomModal(false);
                    setInstantMeetingName('');
                    setInstantMeetingDescription('');
                  }}
                  className="flex-1 px-6 py-3 bg-slate-700 text-white rounded-xl hover:bg-slate-600 transition-all font-semibold"
                >
                  Annulla
                </button>
                <button
                  onClick={async () => {
                    if (!instantMeetingName.trim()) return;
                    try {
                      const response = await axios.post(
                        `${API_URL}/video/rooms`,
                        {
                          nome: instantMeetingName,
                          descrizione: instantMeetingDescription,
                          tipo: 'meeting',
                        },
                        { headers: { Authorization: `Bearer ${token}` } }
                      );
                      setShowNewRoomModal(false);
                      setInstantMeetingName('');
                      setInstantMeetingDescription('');
                      await loadRooms();
                      joinRoom(response.data);
                    } catch (error) {
                      console.error('Errore creazione stanza:', error);
                      alert('Errore durante la creazione della stanza');
                    }
                  }}
                  className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all font-semibold"
                >
                  Crea e Entra
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoCallPage;
