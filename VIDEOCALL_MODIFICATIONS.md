# Modifiche VideoCallPage - TODO

## Stato Attuale
✅ Backend completo e funzionante
✅ Eventi calendario per tutti gli utenti invitati
✅ Package emoji-picker-react installato
✅ Base VideoCallPage funzionante

## Modifiche Rimanenti

### 1. Bottone "Chiudi Stanza" per Room Attive ⏳

**File**: `frontend/src/pages/VideoCallPage.tsx`

**Passo 1**: Aggiungi import icona Trash2 (linea 5)
```typescript
import { Video, VideoOff, Mic, MicOff, PhoneOff, MessageSquare, Users, Calendar, Clock, Settings, X, Plus, Send, ExternalLink, Trash2 } from 'lucide-react';
```

**Passo 2**: Aggiungi funzione per chiudere stanza (dopo la funzione `toggleUserSelection` intorno alla linea 506)
```typescript
// Close room (only for creator)
const handleCloseRoom = async (roomId: string) => {
  if (!confirm('Sei sicuro di voler chiudere questa stanza? Tutti i partecipanti verranno disconnessi.')) {
    return;
  }

  try {
    await axios.put(
      `${API_URL}/video/rooms/${roomId}`,
      { isActive: false },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    loadRooms();
    alert('Stanza chiusa con successo');
  } catch (error) {
    console.error('Errore chiusura stanza:', error);
    alert('Errore durante la chiusura della stanza');
  }
};
```

**Passo 3**: Modifica il render delle room attive (intorno alla linea 785-790) per mostrare 2 bottoni se l'utente è il creatore:
```typescript
{/* Sostituisci il bottone singolo "Entra nella Stanza" con questo: */}
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
```

---

### 2. Modal Modifica Riunione Programmata ⏳

**Passo 1**: Aggiungi stati (dopo linea 86)
```typescript
// Edit meeting state
const [showEditMeetingModal, setShowEditMeetingModal] = useState(false);
const [editingMeeting, setEditingMeeting] = useState<Room | null>(null);
const [editMeetingName, setEditMeetingName] = useState('');
const [editMeetingDescription, setEditMeetingDescription] = useState('');
const [editMeetingDate, setEditMeetingDate] = useState('');
const [editMeetingTime, setEditMeetingTime] = useState('');
const [editSelectedUsers, setEditSelectedUsers] = useState<string[]>([]);
```

**Passo 2**: Aggiungi import Edit2 alla linea 5:
```typescript
import { ..., Trash2, Edit2, ... } from 'lucide-react';
```

**Passo 3**: Aggiungi funzioni (dopo handleScheduleMeeting)
```typescript
// Open edit meeting modal
const openEditMeeting = (meeting: Room) => {
  setEditingMeeting(meeting);
  setEditMeetingName(meeting.nome);
  setEditMeetingDescription(meeting.descrizione || '');

  const scheduledDate = new Date(meeting.scheduledAt!);
  setEditMeetingDate(scheduledDate.toISOString().split('T')[0]);
  setEditMeetingTime(scheduledDate.toTimeString().slice(0, 5));

  try {
    const invitedIds = JSON.parse(meeting.invitedUserIds);
    setEditSelectedUsers(invitedIds);
  } catch {
    setEditSelectedUsers([]);
  }

  setShowEditMeetingModal(true);
};

// Handle edit meeting
const handleEditMeeting = async () => {
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

    // Reset
    setShowEditMeetingModal(false);
    setEditingMeeting(null);
    setEditMeetingName('');
    setEditMeetingDescription('');
    setEditMeetingDate('');
    setEditMeetingTime('');
    setEditSelectedUsers([]);

    loadScheduledMeetings();
    alert('Riunione modificata con successo!');
  } catch (error) {
    console.error('Errore modifica meeting:', error);
    alert('Errore durante la modifica della riunione');
  }
};
```

**Passo 4**: Aggiungi bottone Edit nelle scheduled meetings (intorno alla linea 854)
```typescript
{/* Sostituisci il bottone "Partecipa" con questo: */}
{isUpcoming ? (
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
    {meeting.creatoreId === currentUser.id && (
      <button
        onClick={() => openEditMeeting(meeting)}
        className="px-4 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all font-semibold shadow-lg"
        title="Modifica riunione"
      >
        <Edit2 className="w-5 h-5" />
      </button>
    )}
  </div>
) : (
  <div className="text-center py-3 text-gray-500 text-sm">Riunione terminata</div>
)}
```

**Passo 5**: Aggiungi modal Edit Meeting (prima del closing tag finale, intorno alla linea 1220)
```tsx
{/* Edit Meeting Modal */}
{showEditMeetingModal && editingMeeting && (
  <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
    <div className="bg-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl border border-indigo-500/20 my-8">
      <div className="p-6 border-b border-indigo-500/20">
        <h2 className="text-2xl font-bold text-white">Modifica Riunione</h2>
        <p className="text-gray-400 mt-1">Aggiorna dettagli e partecipanti</p>
      </div>

      <div className="p-6 space-y-4">
        <div>
          <label className="block text-sm font-semibold text-white mb-2">Nome Riunione *</label>
          <input
            type="text"
            value={editMeetingName}
            onChange={(e) => setEditMeetingName(e.target.value)}
            className="w-full px-4 py-3 bg-slate-700 text-white rounded-xl border border-slate-600 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-white mb-2">Descrizione</label>
          <textarea
            value={editMeetingDescription}
            onChange={(e) => setEditMeetingDescription(e.target.value)}
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
                  onChange={() => {
                    setEditSelectedUsers((prev) =>
                      prev.includes(user.id) ? prev.filter((id) => id !== user.id) : [...prev, user.id]
                    );
                  }}
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
            {editSelectedUsers.length} utenti selezionati
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
          onClick={handleEditMeeting}
          className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all font-semibold"
        >
          Salva Modifiche
        </button>
      </div>
    </div>
  </div>
)}
```

---

### 3. Modal Test Microfono/Webcam ⏳

**Passo 1**: Aggiungi stati (dopo linea 86)
```typescript
// Media test state
const [showMediaTestModal, setShowMediaTestModal] = useState(false);
const [testStream, setTestStream] = useState<MediaStream | null>(null);
const [testVideoOn, setTestVideoOn] = useState(true);
const [testAudioOn, setTestAudioOn] = useState(true);
const testVideoRef = useRef<HTMLVideoElement>(null);
```

**Passo 2**: Aggiungi import TestTube alla linea 5

**Passo 3**: Aggiungi funzioni test media (dopo handleCloseRoom)
```typescript
// Open media test modal
const openMediaTest = async (room: Room) => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });

    setTestStream(stream);
    if (testVideoRef.current) {
      testVideoRef.current.srcObject = stream;
    }

    setShowMediaTestModal(true);
    setCurrentRoom(room); // Save room to join after test
  } catch (error: any) {
    console.error('Errore accesso media:', error);
    alert('Impossibile accedere a camera/microfono');
  }
};

// Close media test and join room
const closeMediaTestAndJoin = () => {
  if (testStream) {
    testStream.getTracks().forEach((track) => track.stop());
    setTestStream(null);
  }

  setShowMediaTestModal(false);
  setTestVideoOn(true);
  setTestAudioOn(true);

  if (currentRoom) {
    joinRoom(currentRoom);
  }
};

// Toggle test video
const toggleTestVideo = () => {
  if (testStream) {
    testStream.getVideoTracks().forEach((track) => {
      track.enabled = !testVideoOn;
    });
    setTestVideoOn(!testVideoOn);
  }
};

// Toggle test audio
const toggleTestAudio = () => {
  if (testStream) {
    testStream.getAudioTracks().forEach((track) => {
      track.enabled = !testAudioOn;
    });
    setTestAudioOn(!testAudioOn);
  }
};
```

**Passo 4**: Modifica chiamata joinRoom per passare per test modal (sostituisci onClick nelle room card)
```typescript
{/* Nelle room attive, sostituisci onClick={() => joinRoom(room)} con: */}
onClick={() => openMediaTest(room)}
```

**Passo 5**: Aggiungi modal test media (prima del closing tag finale)
```tsx
{/* Media Test Modal */}
{showMediaTestModal && (
  <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    <div className="bg-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl border border-indigo-500/20">
      <div className="p-6 border-b border-indigo-500/20">
        <h2 className="text-2xl font-bold text-white">Test Microfono e Webcam</h2>
        <p className="text-gray-400 mt-1">Verifica che tutto funzioni prima di entrare</p>
      </div>

      <div className="p-6">
        <div className="relative bg-slate-900 rounded-xl overflow-hidden aspect-video mb-6">
          <video
            ref={testVideoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover"
          />
          {!testVideoOn && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
              <div className="text-center">
                <VideoOff className="w-16 h-16 text-gray-600 mx-auto mb-2" />
                <p className="text-gray-400">Camera disattivata</p>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-center gap-4 mb-6">
          <button
            onClick={toggleTestAudio}
            className={`p-4 rounded-full transition-all ${
              !testAudioOn ? 'bg-red-600 hover:bg-red-700' : 'bg-slate-700 hover:bg-slate-600'
            } text-white shadow-lg`}
          >
            {testAudioOn ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
          </button>

          <button
            onClick={toggleTestVideo}
            className={`p-4 rounded-full transition-all ${
              !testVideoOn ? 'bg-red-600 hover:bg-red-700' : 'bg-slate-700 hover:bg-slate-600'
            } text-white shadow-lg`}
          >
            {testVideoOn ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
          </button>
        </div>

        <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4 mb-6">
          <p className="text-sm text-indigo-300">
            <strong>Nota:</strong> Se vedi il video e l'audio funziona, sei pronto per entrare!
          </p>
        </div>
      </div>

      <div className="p-6 border-t border-indigo-500/20 flex gap-3">
        <button
          onClick={() => {
            if (testStream) {
              testStream.getTracks().forEach((track) => track.stop());
              setTestStream(null);
            }
            setShowMediaTestModal(false);
            setCurrentRoom(null);
          }}
          className="flex-1 px-6 py-3 bg-slate-700 text-white rounded-xl hover:bg-slate-600 transition-all font-semibold"
        >
          Annulla
        </button>
        <button
          onClick={closeMediaTestAndJoin}
          className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all font-semibold"
        >
          Entra nella Stanza
        </button>
      </div>
    </div>
  </div>
)}
```

---

### 4. Emoji Picker nella Chat ⏳

**Passo 1**: Aggiungi import (linea 5)
```typescript
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
import { ..., Smile, ... } from 'lucide-react';
```

**Passo 2**: Aggiungi stato (dopo linea 67)
```typescript
const [showEmojiPicker, setShowEmojiPicker] = useState(false);
```

**Passo 3**: Aggiungi funzione handle emoji (dopo sendChatMessage)
```typescript
// Handle emoji click
const onEmojiClick = (emojiData: EmojiClickData) => {
  setChatInput((prev) => prev + emojiData.emoji);
};
```

**Passo 4**: Modifica input chat (intorno alla linea 658-674)
```tsx
{/* Sostituisci il div chat input con questo: */}
<div className="p-4 border-t border-indigo-500/20">
  {showEmojiPicker && (
    <div className="mb-2">
      <EmojiPicker
        onEmojiClick={onEmojiClick}
        width="100%"
        height="350px"
      />
    </div>
  )}
  <div className="flex gap-2">
    <button
      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
      className="px-3 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
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
```

---

## Riepilogo
Dopo aver applicato tutte queste modifiche, avrai:
✅ Bottone "Chiudi Stanza" per il creatore
✅ Modal modifica riunione programmata
✅ Test microfono/webcam prima di entrare
✅ Emoji picker nella chat

Il WebRTC dovrebbe già funzionare correttamente con la configurazione attuale (trickle: true, STUN servers configurati).

Se hai problemi, verifica che:
1. Il browser abbia permessi per camera/microfono
2. Sei in HTTPS o localhost (WebRTC richiede connessione sicura)
3. I STUN servers siano raggiungibili

---

## Note Finali
- Tutte le funzionalità backend sono già implementate e funzionanti
- Gli eventi calendario vengono creati automaticamente per tutti gli invitati
- Il sistema di notifiche funziona per avvisare gli utenti invitati
