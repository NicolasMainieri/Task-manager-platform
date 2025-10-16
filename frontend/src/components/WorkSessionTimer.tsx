import React, { useState, useEffect } from 'react';
import { Play, Pause, Square, Clock } from 'lucide-react';
import axios from 'axios';

const API_URL = 'http://localhost:4000/api';

interface WorkSessionTimerProps {
  subtaskId: string;
  subtaskTitle: string;
  existingSession?: any;
  onSessionStart?: () => void;
  onSessionUpdate?: () => void;
  onSessionEnd?: () => void;
}

const WorkSessionTimer: React.FC<WorkSessionTimerProps> = ({
  subtaskId,
  subtaskTitle,
  existingSession,
  onSessionStart,
  onSessionUpdate,
  onSessionEnd,
}) => {
  const [session, setSession] = useState<any>(existingSession || null);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const token = localStorage.getItem('token');

  // Calcola il tempo totale dalla sessione
  useEffect(() => {
    if (session) {
      const baseTime = session.tempoAccumulato || 0;

      if (session.stato === 'active') {
        setIsRunning(true);
        const startTime = new Date(session.lastUpdateAt || session.startedAt).getTime();
        const now = Date.now();
        const additionalSeconds = Math.floor((now - startTime) / 1000);
        setTimeElapsed(baseTime + additionalSeconds);
      } else if (session.stato === 'paused') {
        setIsRunning(false);
        setTimeElapsed(baseTime);
      }
    }
  }, [session]);

  // Timer tick ogni secondo
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isRunning) {
      interval = setInterval(() => {
        setTimeElapsed((prev) => prev + 1);
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning]);

  // Aggiorna il backend ogni minuto
  useEffect(() => {
    let updateInterval: NodeJS.Timeout;

    if (isRunning && session) {
      updateInterval = setInterval(async () => {
        try {
          const response = await axios.put(
            `${API_URL}/work-sessions/${session.id}/update`,
            {},
            { headers: { Authorization: `Bearer ${token}` } }
          );

          // Controlla se deve notificare la pausa
          if (response.data.shouldNotifyBreak) {
            showBreakNotification();
          }

          if (onSessionUpdate) onSessionUpdate();
        } catch (error) {
          console.error('Errore aggiornamento sessione:', error);
        }
      }, 60000); // Ogni minuto
    }

    return () => {
      if (updateInterval) clearInterval(updateInterval);
    };
  }, [isRunning, session, token, onSessionUpdate]);

  const showBreakNotification = () => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Tempo per una pausa! ☕', {
        body: 'Hai lavorato per 1 ora consecutiva. Prenditi 15 minuti di pausa.',
        icon: '/favicon.ico',
      });
    } else {
      alert('⏰ Tempo per una pausa!\n\nHai lavorato per 1 ora consecutiva.\nPrenditi 15 minuti di pausa.');
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStart = async () => {
    try {
      const response = await axios.post(
        `${API_URL}/subtasks/${subtaskId}/work-sessions/start`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSession(response.data);
      setIsRunning(true);

      // Richiedi permesso notifiche
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
      }

      if (onSessionStart) onSessionStart();
    } catch (error: any) {
      console.error('Errore avvio sessione:', error);
      alert(error.response?.data?.error || 'Errore durante l\'avvio della sessione');
    }
  };

  const handlePause = async () => {
    if (!session) return;

    try {
      const response = await axios.put(
        `${API_URL}/work-sessions/${session.id}/pause`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSession(response.data);
      setIsRunning(false);

      if (onSessionUpdate) onSessionUpdate();
    } catch (error) {
      console.error('Errore pausa sessione:', error);
      alert('Errore durante la pausa della sessione');
    }
  };

  const handleResume = async () => {
    if (!session) return;

    try {
      const response = await axios.put(
        `${API_URL}/work-sessions/${session.id}/resume`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSession(response.data);
      setIsRunning(true);

      if (onSessionUpdate) onSessionUpdate();
    } catch (error) {
      console.error('Errore ripresa sessione:', error);
      alert('Errore durante la ripresa della sessione');
    }
  };

  const handleStop = async () => {
    if (!session) return;

    const confirmStop = window.confirm(
      `Vuoi fermare la sessione di lavoro su "${subtaskTitle}"?\n\nTempo registrato: ${formatTime(timeElapsed)}`
    );

    if (!confirmStop) return;

    try {
      await axios.put(
        `${API_URL}/work-sessions/${session.id}/stop`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSession(null);
      setIsRunning(false);
      setTimeElapsed(0);

      if (onSessionEnd) onSessionEnd();
    } catch (error) {
      console.error('Errore stop sessione:', error);
      alert('Errore durante lo stop della sessione');
    }
  };

  return (
    <div className="flex items-center gap-2">
      {/* Display tempo */}
      {session && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-500/20 rounded-lg">
          <Clock className="w-4 h-4 text-indigo-400" />
          <span className="text-sm font-mono font-semibold text-indigo-300">
            {formatTime(timeElapsed)}
          </span>
        </div>
      )}

      {/* Pulsanti controllo */}
      <div className="flex items-center gap-1">
        {!session && (
          <button
            onClick={handleStart}
            className="p-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
            title="Avvia timer"
          >
            <Play className="w-4 h-4" />
          </button>
        )}

        {session && session.stato === 'active' && (
          <>
            <button
              onClick={handlePause}
              className="p-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors"
              title="Pausa timer"
            >
              <Pause className="w-4 h-4" />
            </button>
            <button
              onClick={handleStop}
              className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              title="Ferma e registra"
            >
              <Square className="w-4 h-4" />
            </button>
          </>
        )}

        {session && session.stato === 'paused' && (
          <>
            <button
              onClick={handleResume}
              className="p-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
              title="Riprendi timer"
            >
              <Play className="w-4 h-4" />
            </button>
            <button
              onClick={handleStop}
              className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              title="Ferma e registra"
            >
              <Square className="w-4 h-4" />
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default WorkSessionTimer;
