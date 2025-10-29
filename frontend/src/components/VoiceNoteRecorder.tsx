import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Loader2, CheckCircle, XCircle } from 'lucide-react';
import axios from 'axios';

const API_URL = 'http://localhost:4000/api';

interface VoiceNoteRecorderProps {
  onTranscriptionComplete?: (note: any) => void;
  videoCallId?: string;
}

const VoiceNoteRecorder: React.FC<VoiceNoteRecorderProps> = ({
  onTranscriptionComplete,
  videoCallId
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const token = localStorage.getItem('token');

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      setError(null);
      setSuccess(false);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Usa formato supportato dal browser
      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : 'audio/ogg';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: mimeType });
        stream.getTracks().forEach(track => track.stop());

        if (timerRef.current) {
          clearInterval(timerRef.current);
        }

        await sendAudioForTranscription(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      // Avvia timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (err: any) {
      console.error('Errore avvio registrazione:', err);
      setError('Impossibile accedere al microfono. Verifica i permessi.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const sendAudioForTranscription = async (audioBlob: Blob) => {
    try {
      setIsProcessing(true);

      const formData = new FormData();
      formData.append('audio', audioBlob, `recording-${Date.now()}.webm`);
      formData.append('language', 'it');
      if (videoCallId) {
        formData.append('videoCallId', videoCallId);
      }

      const response = await axios.post(`${API_URL}/notes/transcribe`, formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      setSuccess(true);
      setError(null);

      if (onTranscriptionComplete) {
        onTranscriptionComplete(response.data);
      }

      // Reset dopo 3 secondi
      setTimeout(() => {
        setSuccess(false);
        setRecordingTime(0);
      }, 3000);

    } catch (err: any) {
      console.error('Errore trascrizione:', err);
      setError(err.response?.data?.error || 'Errore durante la trascrizione');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="inline-flex items-center gap-3">
      {!isRecording && !isProcessing && !success && (
        <button
          onClick={startRecording}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          title="Registra nota vocale"
        >
          <Mic className="w-5 h-5" />
          <span className="hidden sm:inline">Nota Vocale</span>
        </button>
      )}

      {isRecording && (
        <div className="flex items-center gap-3">
          <button
            onClick={stopRecording}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors animate-pulse"
          >
            <Square className="w-5 h-5" />
            <span>{formatTime(recordingTime)}</span>
          </button>
          <div className="flex items-center gap-2 text-red-600">
            <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse"></div>
            <span className="text-sm font-semibold">Registrazione in corso...</span>
          </div>
        </div>
      )}

      {isProcessing && (
        <div className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Trascrizione in corso...</span>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg">
          <CheckCircle className="w-5 h-5" />
          <span>Trascrizione completata!</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg">
          <XCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};

export default VoiceNoteRecorder;
