import React, { useState } from 'react';
import { CheckCircle2, Circle } from 'lucide-react';
import WorkSessionTimer from './WorkSessionTimer';
import axios from 'axios';

const API_URL = 'http://localhost:4000/api';

interface SubtaskItemWithTimerProps {
  subtask: any;
  onUpdate?: () => void;
}

const SubtaskItemWithTimer: React.FC<SubtaskItemWithTimerProps> = ({ subtask, onUpdate }) => {
  const [isCompleted, setIsCompleted] = useState(subtask.completata);
  const [isLoading, setIsLoading] = useState(false);
  const token = localStorage.getItem('token');

  const handleToggleComplete = async () => {
    setIsLoading(true);
    try {
      const response = await axios.put(
        `${API_URL}/subtasks/${subtask.id}/toggle`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setIsCompleted(response.data.completata);

      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Errore toggle subtask:', error);
      alert('Errore durante l\'aggiornamento della subtask');
    } finally {
      setIsLoading(false);
    }
  };

  // Trova la sessione attiva se presente
  const activeSession = subtask.workSessions?.find(
    (ws: any) => ws.stato === 'active' || ws.stato === 'paused'
  );

  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
        isCompleted
          ? 'bg-slate-800/30 opacity-60'
          : 'bg-slate-800/50 hover:bg-slate-800/70'
      }`}
    >
      {/* Checkbox */}
      <button
        onClick={handleToggleComplete}
        disabled={isLoading}
        className={`flex-shrink-0 transition-all ${isLoading ? 'opacity-50' : ''}`}
      >
        {isCompleted ? (
          <CheckCircle2 className="w-5 h-5 text-green-500" />
        ) : (
          <Circle className="w-5 h-5 text-gray-400 hover:text-indigo-400" />
        )}
      </button>

      {/* Titolo subtask */}
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm ${
            isCompleted
              ? 'line-through text-gray-500'
              : 'text-white'
          }`}
        >
          {subtask.titolo}
        </p>
        {subtask.descrizione && (
          <p className="text-xs text-gray-400 mt-1">{subtask.descrizione}</p>
        )}
      </div>

      {/* Timer - solo se non completata */}
      {!isCompleted && (
        <div className="flex-shrink-0">
          <WorkSessionTimer
            subtaskId={subtask.id}
            subtaskTitle={subtask.titolo}
            existingSession={activeSession}
            onSessionStart={onUpdate}
            onSessionUpdate={onUpdate}
            onSessionEnd={onUpdate}
          />
        </div>
      )}
    </div>
  );
};

export default SubtaskItemWithTimer;
