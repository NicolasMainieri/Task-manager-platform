import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { io, Socket } from 'socket.io-client';
import Peer from 'simple-peer';
import { Video, VideoOff, Mic, MicOff, PhoneOff, MessageSquare, Users, Calendar, Clock, Settings, X, Plus, Send, ExternalLink, Trash2, Edit, Smile, ChevronDown, Sparkles, FileText } from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';
import VoiceNoteRecorder from '../components/VoiceNoteRecorder';

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
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Device selection
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedAudioDevice, setSelectedAudioDevice] = useState<string>('');
  const [selectedVideoDevice, setSelectedVideoDevice] = useState<string>('');
  const [showAudioDevices, setShowAudioDevices] = useState(false);
  const [showVideoDevices, setShowVideoDevices] = useState(false);

  // Admin modals
  const [showInstantMeetingModal, setShowInstantMeetingModal] = useState(false);
  const [showScheduleMeetingModal, setShowScheduleMeetingModal] = useState(false);
  const [showNewRoomModal, setShowNewRoomModal] = useState(false);
  const [showEditMeetingModal, setShowEditMeetingModal] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<Room | null>(null);

  // AI features state
  const [isRecordingMeeting, setIsRecordingMeeting] = useState(false);
  const [meetingRecorder, setMeetingRecorder] = useState<MediaRecorder | null>(null);
  const [meetingAudioChunks, setMeetingAudioChunks] = useState<Blob[]>([]);
  const [recordingStartTime, setRecordingStartTime] = useState<number>(0);
  const [recordingDuration, setRecordingDuration] = useState<number>(0);
  const [isGeneratingNotes, setIsGeneratingNotes] = useState(false);

  // Media test modal
  const [showMediaTestModal, setShowMediaTestModal] = useState(false);
  const [pendingRoom, setPendingRoom] = useState<Room | null>(null);
  const [testStream, setTestStream] = useState<MediaStream | null>(null);
  const [testMicLevel, setTestMicLevel] = useState(0);
  const testVideoRef = useRef<HTMLVideoElement>(null);

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

  // Edit meeting state
  const [editMeetingName, setEditMeetingName] = useState('');
  const [editMeetingDescription, setEditMeetingDescription] = useState('');
  const [editMeetingDate, setEditMeetingDate] = useState('');
  const [editMeetingTime, setEditMeetingTime] = useState('');
  const [editSelectedUsers, setEditSelectedUsers] = useState<string[]>([]);

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

  // Open edit meeting modal
  const handleOpenEditMeeting = (meeting: Room) => {
    setEditingMeeting(meeting);
    setEditMeetingName(meeting.nome);
    setEditMeetingDescription(meeting.descrizione || '');

    if (meeting.scheduledAt) {
      const scheduledDate = new Date(meeting.scheduledAt);
      setEditMeetingDate(scheduledDate.toISOString().split('T')[0]);
      setEditMeetingTime(scheduledDate.toTimeString().slice(0, 5));
    }

    try {
      const invitedIds = JSON.parse(meeting.invitedUserIds);
      setEditSelectedUsers(invitedIds);
    } catch {
      setEditSelectedUsers([]);
    }

    setShowEditMeetingModal(true);
  };

  // Save edited meeting
  const handleSaveEditedMeeting = async () => {
    if (!editingMeeting || !editMeetingName.trim() || !editMeetingDate || !editMeetingTime) {
      alert('Compila tutti i campi obbligatori');
      return;
    }

    try {
      const scheduledDateTime = new Date(`${editMeetingDate}T${editMeetingTime}`);

      await axios.put(
        `${API_URL}/video/rooms/${editingMeeting.id}`,
        {
          nome: editMeetingName,
          descrizione: editMeetingDescription,
          scheduledAt: scheduledDateTime.toISOString(),
          invitedUserIds: JSON.stringify(editSelectedUsers),
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Send notifications to newly added users
      if (editSelectedUsers.length > 0) {
        await axios.post(
          `${API_URL}/video/rooms/${editingMeeting.id}/notify`,
          { userIds: editSelectedUsers },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }

      // Reset and close
      setShowEditMeetingModal(false);
      setEditingMeeting(null);
      setEditMeetingName('');
      setEditMeetingDescription('');
      setEditMeetingDate('');
      setEditMeetingTime('');
      setEditSelectedUsers([]);

      loadScheduledMeetings();
      alert('Riunione aggiornata con successo!');
    } catch (error) {
      console.error('Errore aggiornamento meeting:', error);
      alert('Errore durante l\'aggiornamento della riunione');
    }
  };

  // Open media test modal before joining
  const joinRoom = (room: Room) => {
    setPendingRoom(room);
    setShowMediaTestModal(true);
    startMediaTest();
  };

  // Load available devices
  const loadDevices = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter(d => d.kind === 'audioinput');
      const videoInputs = devices.filter(d => d.kind === 'videoinput');

      setAudioDevices(audioInputs);
      setVideoDevices(videoInputs);

      // Set default devices if not set
      if (!selectedAudioDevice && audioInputs.length > 0) {
        setSelectedAudioDevice(audioInputs[0].deviceId);
      }
      if (!selectedVideoDevice && videoInputs.length > 0) {
        setSelectedVideoDevice(videoInputs[0].deviceId);
      }
    } catch (error) {
      console.error('Error loading devices:', error);
    }
  };

  // Change audio device
  const changeAudioDevice = async (deviceId: string) => {
    if (!localStream) return;

    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        audio: { deviceId: { exact: deviceId }, echoCancellation: true, noiseSuppression: true },
        video: false
      });

      const audioTrack = newStream.getAudioTracks()[0];
      const oldAudioTrack = localStream.getAudioTracks()[0];

      localStream.removeTrack(oldAudioTrack);
      localStream.addTrack(audioTrack);
      oldAudioTrack.stop();

      // Update peers with new track
      peersRef.current.forEach(peer => {
        peer.replaceTrack(oldAudioTrack, audioTrack, localStream);
      });

      setSelectedAudioDevice(deviceId);
      console.log('🎤 Audio device changed to:', deviceId);
    } catch (error) {
      console.error('Error changing audio device:', error);
    }
  };

  // Change video device
  const changeVideoDevice = async (deviceId: string) => {
    if (!localStream) return;

    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: deviceId }, width: 1280, height: 720 },
        audio: false
      });

      const videoTrack = newStream.getVideoTracks()[0];
      const oldVideoTrack = localStream.getVideoTracks()[0];

      localStream.removeTrack(oldVideoTrack);
      localStream.addTrack(videoTrack);
      oldVideoTrack.stop();

      // Update local video ref
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStream;
      }

      // Update peers with new track
      peersRef.current.forEach(peer => {
        peer.replaceTrack(oldVideoTrack, videoTrack, localStream);
      });

      setSelectedVideoDevice(deviceId);
      console.log('📹 Video device changed to:', deviceId);
    } catch (error) {
      console.error('Error changing video device:', error);
    }
  };

  // Start media test
  const startMediaTest = async () => {
    // Load devices first
    await loadDevices();

    try {
      const constraints: MediaStreamConstraints = {
        video: selectedVideoDevice
          ? { deviceId: { exact: selectedVideoDevice }, width: 1280, height: 720 }
          : { width: 1280, height: 720 },
        audio: selectedAudioDevice
          ? { deviceId: { exact: selectedAudioDevice }, echoCancellation: true, noiseSuppression: true }
          : { echoCancellation: true, noiseSuppression: true },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      setTestStream(stream);
      if (testVideoRef.current) {
        testVideoRef.current.srcObject = stream;
      }

      // Monitor microphone level
      const audioContext = new AudioContext();
      const audioSource = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      audioSource.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateMicLevel = () => {
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        setTestMicLevel(Math.min(100, (average / 128) * 100));
        if (showMediaTestModal) {
          requestAnimationFrame(updateMicLevel);
        }
      };
      updateMicLevel();
    } catch (error: any) {
      console.error('Errore test media:', error);
      if (error.name === 'NotAllowedError') {
        alert('Permesso negato per accedere a camera/microfono. Controlla le impostazioni del browser.');
      } else if (error.name === 'NotFoundError') {
        alert('Nessuna camera o microfono trovato.');
      } else {
        alert('Impossibile accedere alla camera/microfono: ' + error.message);
      }
      setShowMediaTestModal(false);
      setPendingRoom(null);
    }
  };

  // Cancel media test
  const cancelMediaTest = () => {
    if (testStream) {
      testStream.getTracks().forEach((track) => track.stop());
      setTestStream(null);
    }
    setShowMediaTestModal(false);
    setPendingRoom(null);
    setTestMicLevel(0);
  };

  // Proceed to join room after test
  const proceedToJoinRoom = async () => {
    if (!pendingRoom) return;

    const room = pendingRoom;

    // Reuse the test stream instead of requesting a new one
    if (!testStream) {
      console.error('❌ No test stream available');
      alert('Errore: stream non disponibile');
      return;
    }

    console.log('✅ Test stream available, tracks:', testStream.getTracks().map(t => ({ kind: t.kind, enabled: t.enabled, readyState: t.readyState })));

    try {
      // Use the existing test stream
      const stream = testStream;

      // Set local stream BEFORE closing modal
      setLocalStream(stream);

      // Close test modal AFTER setting stream
      setShowMediaTestModal(false);
      setPendingRoom(null);
      setTestStream(null);

      setCurrentRoom(room);

      // Set video ref after a small delay to ensure component is mounted
      setTimeout(() => {
        if (localVideoRef.current && stream) {
          console.log('🎥 Setting video ref with stream');
          localVideoRef.current.srcObject = stream;
        } else {
          console.error('❌ Video ref or stream not available:', { ref: !!localVideoRef.current, stream: !!stream });
        }
      }, 100);

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
      const newMutedState = !isMuted;
      localStream.getAudioTracks().forEach((track) => {
        track.enabled = !newMutedState; // If muted, disable track
      });
      setIsMuted(newMutedState);
      socketRef.current?.emit('toggle-mute', newMutedState);
      console.log('🎤 Mute toggled:', newMutedState);
    }
  };

  // Toggle video
  const toggleVideo = () => {
    if (localStream) {
      const newVideoOffState = !isVideoOff;
      localStream.getVideoTracks().forEach((track) => {
        track.enabled = !newVideoOffState; // If video off, disable track
      });
      setIsVideoOff(newVideoOffState);
      socketRef.current?.emit('toggle-video', newVideoOffState);
      console.log('📹 Video toggled:', newVideoOffState);
    }
  };

  // Send chat message
  const sendChatMessage = () => {
    if (!chatInput.trim()) return;
    socketRef.current?.emit('chat-message', chatInput);
    setChatInput('');
    setShowEmojiPicker(false);
  };

  // Handle emoji selection
  const handleEmojiClick = (emojiData: any) => {
    setChatInput((prev) => prev + emojiData.emoji);
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

  // Timer effect for recording duration
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isRecordingMeeting && recordingStartTime > 0) {
      interval = setInterval(() => {
        setRecordingDuration(Math.floor((Date.now() - recordingStartTime) / 1000));
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRecordingMeeting, recordingStartTime]);

  // Start/Stop meeting recording with AI
  const handleToggleMeetingRecording = async () => {
    if (!currentRoom) return;

    if (!isRecordingMeeting) {
      // Start recording
      try {
        // Capture system audio + microphone
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            sampleRate: 44100
          }
        });

        const mimeType = MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : MediaRecorder.isTypeSupported('audio/mp4')
          ? 'audio/mp4'
          : 'audio/ogg';

        const recorder = new MediaRecorder(stream, { mimeType });
        const chunks: Blob[] = [];

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            chunks.push(e.data);
          }
        };

        recorder.onstop = async () => {
          stream.getTracks().forEach(track => track.stop());

          // Create audio blob
          const audioBlob = new Blob(chunks, { type: mimeType });

          // Send to backend for transcription and analysis
          await processRecordedMeeting(audioBlob);
        };

        recorder.start();
        setMeetingRecorder(recorder);
        setMeetingAudioChunks(chunks);
        setIsRecordingMeeting(true);
        setRecordingStartTime(Date.now());
        setRecordingDuration(0);

        console.log('🎙️ Started meeting recording');
      } catch (error: any) {
        console.error('Errore avvio registrazione:', error);
        alert('Impossibile avviare la registrazione: ' + error.message);
      }
    } else {
      // Stop recording
      if (meetingRecorder && meetingRecorder.state === 'recording') {
        meetingRecorder.stop();
        setIsRecordingMeeting(false);
        setMeetingRecorder(null);
        console.log('⏹️ Stopped meeting recording');
      }
    }
  };

  // Process recorded meeting audio
  const processRecordedMeeting = async (audioBlob: Blob) => {
    if (!currentRoom) return;

    try {
      // Show processing message
      alert('⏳ Elaborazione registrazione in corso...\n\nStto trascrivendo l\'audio e generando il riassunto AI. Questo potrebbe richiedere alcuni minuti.');

      // Upload audio for transcription
      const formData = new FormData();
      formData.append('audio', audioBlob, `meeting-${currentRoom.id}-${Date.now()}.webm`);
      formData.append('language', 'it');
      formData.append('videoCallId', currentRoom.id);

      const transcriptionRes = await axios.post(
        `${API_URL}/notes/transcribe`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      const { transcription, analysis } = transcriptionRes.data;

      // Show results
      const summaryText = `
✅ RIASSUNTO MEETING COMPLETATO

📝 Trascrizione:
${transcription.text.substring(0, 200)}${transcription.text.length > 200 ? '...' : ''}

🎯 Punti Chiave (${analysis.keyPoints.length}):
${analysis.keyPoints.map((point: string, index: number) => `${index + 1}. ${point}`).join('\n')}

✅ Action Items (${analysis.actionItems.length}):
${analysis.actionItems.map((item: string) => `• ${item}`).join('\n')}

⏱️ Durata: ${Math.floor(recordingDuration / 60)}m ${recordingDuration % 60}s

La nota completa è stata salvata nella sezione Note.
      `.trim();

      alert(summaryText);
      console.log('Meeting recording processed:', transcriptionRes.data);
    } catch (error: any) {
      console.error('Errore elaborazione registrazione:', error);
      alert(`Errore: ${error.response?.data?.error || 'Impossibile elaborare la registrazione'}`);
    } finally {
      setRecordingStartTime(0);
      setRecordingDuration(0);
    }
  };

  // Generate and save meeting notes with AI
  const handleGenerateNotes = async () => {
    if (!currentRoom) return;

    setIsGeneratingNotes(true);
    try {
      const response = await axios.post(
        `${API_URL}/notes/meeting/${currentRoom.id}/notes`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const { note, summary, actionItems, keyPoints } = response.data;

      alert(`✅ Note salvate con successo!

📄 Nota: ${note.titolo}
🎯 ${keyPoints.length} punti chiave estratti
✅ ${actionItems.length} action items identificati

Le note complete sono state salvate e sono disponibili nella sezione Note.`);

      console.log('Meeting notes saved:', response.data);
    } catch (error: any) {
      console.error('Errore generazione note:', error);
      alert(`Errore: ${error.response?.data?.error || 'Impossibile generare le note'}`);
    } finally {
      setIsGeneratingNotes(false);
    }
  };

  // Toggle user selection
  const toggleUserSelection = (userId: string, mode: 'instant' | 'schedule' | 'edit' = 'instant') => {
    if (mode === 'schedule') {
      setScheduleSelectedUsers((prev) =>
        prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
      );
    } else if (mode === 'edit') {
      setEditSelectedUsers((prev) =>
        prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
      );
    } else {
      setSelectedUsers((prev) =>
        prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
      );
    }
  };

  // Close/Delete room (for room creator)
  const handleCloseRoom = async (roomId: string) => {
    if (!confirm('Sei sicuro di voler chiudere questa stanza? Tutti i partecipanti verranno disconnessi.')) {
      return;
    }

    try {
      await axios.delete(`${API_URL}/video/rooms/${roomId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Reload rooms
      loadRooms();
      alert('Stanza chiusa con successo');
    } catch (error) {
      console.error('Errore chiusura stanza:', error);
      alert('Errore durante la chiusura della stanza');
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
          <div className="mt-4 space-y-3">
            {/* Pulsanti AI e Registrazione Vocale */}
            <div className="flex items-center justify-center gap-3">
              <VoiceNoteRecorder
                videoCallId={currentRoom.id}
                onTranscriptionComplete={(data) => {
                  const actionItemsCount = data.analysis?.actionItems?.length || 0;
                  alert(`✅ Trascrizione completata!\n\nNota salvata con ${actionItemsCount} action items.`);
                }}
              />

              <button
                className={`flex items-center gap-2 px-4 py-2 ${
                  isRecordingMeeting
                    ? 'bg-red-600 hover:bg-red-700 animate-pulse'
                    : 'bg-purple-600 hover:bg-purple-700'
                } text-white rounded-lg transition-colors`}
                title={isRecordingMeeting ? "Ferma registrazione e genera riassunto" : "Inizia registrazione meeting con AI"}
                onClick={handleToggleMeetingRecording}
              >
                {isRecordingMeeting ? (
                  <>
                    <div className="w-5 h-5 bg-white rounded-full animate-pulse" />
                    <span className="hidden sm:inline">
                      Stop {Math.floor(recordingDuration / 60)}:{String(recordingDuration % 60).padStart(2, '0')}
                    </span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    <span className="hidden sm:inline">AI Riassunto</span>
                  </>
                )}
              </button>

              <button
                className={`flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors ${isGeneratingNotes ? 'opacity-50 cursor-not-allowed' : ''}`}
                title="Genera note strutturate"
                onClick={handleGenerateNotes}
                disabled={isGeneratingNotes}
              >
                {isGeneratingNotes ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span className="hidden sm:inline">Salvando...</span>
                  </>
                ) : (
                  <>
                    <FileText className="w-5 h-5" />
                    <span className="hidden sm:inline">Note AI</span>
                  </>
                )}
              </button>
            </div>

            {/* Controlli Video/Audio */}
            <div className="flex items-center justify-center gap-4">
            {/* Audio control with dropdown */}
            <div className="relative">
              <div className="flex items-center gap-1">
                <button
                  onClick={toggleMute}
                  className={`p-4 rounded-l-full transition-all ${
                    isMuted ? 'bg-red-600 hover:bg-red-700' : 'bg-slate-700 hover:bg-slate-600'
                  } text-white shadow-lg`}
                  title={isMuted ? 'Attiva microfono' : 'Disattiva microfono'}
                >
                  {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                </button>
                <button
                  onClick={() => setShowAudioDevices(!showAudioDevices)}
                  className={`p-4 rounded-r-full transition-all ${
                    isMuted ? 'bg-red-600 hover:bg-red-700' : 'bg-slate-700 hover:bg-slate-600'
                  } text-white shadow-lg border-l border-white/20`}
                  title="Seleziona microfono"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>

              {showAudioDevices && audioDevices.length > 0 && (
                <div className="absolute bottom-full mb-2 left-0 bg-slate-800 rounded-xl shadow-2xl border border-indigo-500/20 p-2 min-w-[250px] z-50">
                  {audioDevices.map((device) => (
                    <button
                      key={device.deviceId}
                      onClick={() => {
                        changeAudioDevice(device.deviceId);
                        setShowAudioDevices(false);
                      }}
                      className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                        selectedAudioDevice === device.deviceId
                          ? 'bg-indigo-600 text-white'
                          : 'text-gray-300 hover:bg-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Mic className="w-4 h-4" />
                        <span className="text-sm truncate">{device.label || `Microfono ${device.deviceId.slice(0, 8)}`}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Video control with dropdown */}
            <div className="relative">
              <div className="flex items-center gap-1">
                <button
                  onClick={toggleVideo}
                  className={`p-4 rounded-l-full transition-all ${
                    isVideoOff ? 'bg-red-600 hover:bg-red-700' : 'bg-slate-700 hover:bg-slate-600'
                  } text-white shadow-lg`}
                  title={isVideoOff ? 'Attiva videocamera' : 'Disattiva videocamera'}
                >
                  {isVideoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
                </button>
                <button
                  onClick={() => setShowVideoDevices(!showVideoDevices)}
                  className={`p-4 rounded-r-full transition-all ${
                    isVideoOff ? 'bg-red-600 hover:bg-red-700' : 'bg-slate-700 hover:bg-slate-600'
                  } text-white shadow-lg border-l border-white/20`}
                  title="Seleziona webcam"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>

              {showVideoDevices && videoDevices.length > 0 && (
                <div className="absolute bottom-full mb-2 left-0 bg-slate-800 rounded-xl shadow-2xl border border-indigo-500/20 p-2 min-w-[250px] z-50">
                  {videoDevices.map((device) => (
                    <button
                      key={device.deviceId}
                      onClick={() => {
                        changeVideoDevice(device.deviceId);
                        setShowVideoDevices(false);
                      }}
                      className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                        selectedVideoDevice === device.deviceId
                          ? 'bg-indigo-600 text-white'
                          : 'text-gray-300 hover:bg-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Video className="w-4 h-4" />
                        <span className="text-sm truncate">{device.label || `Webcam ${device.deviceId.slice(0, 8)}`}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={leaveRoom}
              className="p-4 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-lg transition-all"
              title="Lascia chiamata"
            >
              <PhoneOff className="w-6 h-6" />
            </button>
            </div>
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
              {/* Emoji Picker */}
              {showEmojiPicker && (
                <div className="mb-3">
                  <EmojiPicker
                    onEmojiClick={handleEmojiClick}
                    width="100%"
                    height="350px"
                    theme="dark"
                  />
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="px-3 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
                  title="Emoji"
                >
                  <Smile className="w-5 h-5" />
                </button>
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

                {room.creatoreId === currentUser.id ? (
                  <div className="flex gap-2">
                    <button
                      onClick={() => joinRoom(room)}
                      className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all font-semibold shadow-lg"
                    >
                      Entra
                    </button>
                    <button
                      onClick={() => handleCloseRoom(room.id)}
                      className="px-4 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all font-semibold shadow-lg"
                      title="Chiudi stanza"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => joinRoom(room)}
                    className="w-full px-4 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all font-semibold shadow-lg"
                  >
                    Entra nella Stanza
                  </button>
                )}
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
                    meeting.creatoreId === currentUser.id ? (
                      <div className="flex gap-2">
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
                          className="flex-1 px-4 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-all font-semibold shadow-lg flex items-center justify-center gap-2"
                        >
                          {(meeting.zoomJoinUrl || meeting.googleMeetUrl) && <ExternalLink className="w-4 h-4" />}
                          Partecipa
                        </button>
                        <button
                          onClick={() => handleOpenEditMeeting(meeting)}
                          className="px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all font-semibold shadow-lg"
                          title="Modifica riunione"
                        >
                          <Edit className="w-5 h-5" />
                        </button>
                      </div>
                    ) : (
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
                    )
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
                          onChange={() => toggleUserSelection(user.id, 'schedule')}
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

        {/* Admin: Edit Meeting Modal */}
        {showEditMeetingModal && editingMeeting && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl border border-indigo-500/20 my-8">
              <div className="p-6 border-b border-indigo-500/20">
                <h2 className="text-2xl font-bold text-white">Modifica Riunione</h2>
                <p className="text-gray-400 mt-1">Modifica data, ora e partecipanti</p>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">Nome Riunione *</label>
                  <input
                    type="text"
                    value={editMeetingName}
                    onChange={(e) => setEditMeetingName(e.target.value)}
                    placeholder="Es: Revisione Progetto"
                    className="w-full px-4 py-3 bg-slate-700 text-white rounded-xl border border-slate-600 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-white mb-2">Descrizione</label>
                  <textarea
                    value={editMeetingDescription}
                    onChange={(e) => setEditMeetingDescription(e.target.value)}
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
                      value={editMeetingDate}
                      onChange={(e) => setEditMeetingDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-4 py-3 bg-slate-700 text-white rounded-xl border border-slate-600 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-white mb-2">Ora *</label>
                    <input
                      type="time"
                      value={editMeetingTime}
                      onChange={(e) => setEditMeetingTime(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-700 text-white rounded-xl border border-slate-600 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-white mb-3">Partecipanti</label>
                  <div className="max-h-48 overflow-y-auto space-y-2 bg-slate-700/50 rounded-xl p-3">
                    {availableUsers.map((user) => (
                      <label key={user.id} className="flex items-center gap-3 p-2 hover:bg-slate-600/50 rounded-lg cursor-pointer transition-colors">
                        <input
                          type="checkbox"
                          checked={editSelectedUsers.includes(user.id)}
                          onChange={() => toggleUserSelection(user.id, 'edit')}
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
                    {editSelectedUsers.length} utenti selezionati - Verrà aggiornato il calendario
                  </p>
                </div>
              </div>

              <div className="p-6 border-t border-indigo-500/20 flex gap-3">
                <button
                  onClick={() => {
                    setShowEditMeetingModal(false);
                    setEditingMeeting(null);
                    setEditMeetingName('');
                    setEditMeetingDescription('');
                    setEditMeetingDate('');
                    setEditMeetingTime('');
                    setEditSelectedUsers([]);
                  }}
                  className="flex-1 px-6 py-3 bg-slate-700 text-white rounded-xl hover:bg-slate-600 transition-all font-semibold"
                >
                  Annulla
                </button>
                <button
                  onClick={handleSaveEditedMeeting}
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all font-semibold"
                >
                  Salva Modifiche
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Media Test Modal */}
        {showMediaTestModal && pendingRoom && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl border border-indigo-500/20">
              <div className="p-6 border-b border-indigo-500/20">
                <h2 className="text-2xl font-bold text-white">Test Dispositivi</h2>
                <p className="text-gray-400 mt-1">Verifica il funzionamento di microfono e webcam</p>
              </div>

              <div className="p-6 space-y-6">
                {/* Video Preview */}
                <div>
                  <label className="block text-sm font-semibold text-white mb-3">Anteprima Webcam</label>
                  <div className="relative bg-slate-900 rounded-xl overflow-hidden aspect-video">
                    <video
                      ref={testVideoRef}
                      autoPlay
                      muted
                      playsInline
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-4 left-4 bg-black/70 backdrop-blur-sm px-3 py-2 rounded-lg">
                      <span className="text-white font-medium">La tua webcam</span>
                    </div>
                  </div>
                </div>

                {/* Microphone Level */}
                <div>
                  <label className="block text-sm font-semibold text-white mb-3">Livello Microfono</label>
                  <div className="bg-slate-700 rounded-xl p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <Mic className="w-5 h-5 text-indigo-400" />
                      <div className="flex-1 bg-slate-600 rounded-full h-6 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-green-500 to-indigo-500 transition-all duration-100"
                          style={{ width: `${testMicLevel}%` }}
                        />
                      </div>
                      <span className="text-white font-mono text-sm w-12">{Math.round(testMicLevel)}%</span>
                    </div>
                    <p className="text-xs text-gray-400">Parla per testare il microfono</p>
                  </div>
                </div>

                {/* Info */}
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
                  <p className="text-blue-300 text-sm">
                    Assicurati che la webcam e il microfono funzionino correttamente prima di entrare nella chiamata.
                  </p>
                </div>
              </div>

              <div className="p-6 border-t border-indigo-500/20 flex gap-3">
                <button
                  onClick={cancelMediaTest}
                  className="flex-1 px-6 py-3 bg-slate-700 text-white rounded-xl hover:bg-slate-600 transition-all font-semibold"
                >
                  Annulla
                </button>
                <button
                  onClick={proceedToJoinRoom}
                  className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all font-semibold"
                >
                  Entra nella Chiamata
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
