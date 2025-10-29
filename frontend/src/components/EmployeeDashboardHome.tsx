import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  TrendingUp,
  Calendar,
  Mail,
  Video,
  Trophy,
  Clock,
  CheckCircle2,
  ArrowRight,
  Plus,
  Bell,
  Target,
  BarChart3
} from 'lucide-react';
import TodayTasksList from './TodayTasksList';

const API_URL = 'http://localhost:4000/api';

interface UserStats {
  tasksToday: number;
  score: number;
  ranking: number;
  completedToday: number;
}

interface Task {
  id: string;
  titolo: string;
  priorita: string;
  dataScadenza: string;
  stato: string;
}

interface CalendarEvent {
  id: string;
  titolo: string;
  dataInizio: string;
  tipo: string;
}

interface Email {
  id: string;
  oggetto: string;
  mittente: string;
  dataInvio: string;
  letto: boolean;
}

interface VideoCall {
  id: string;
  nome: string;
  scheduledAt: string;
}

interface Notification {
  id: string;
  titolo: string;
  messaggio: string;
  createdAt: string;
  letta: boolean;
}

interface Props {
  user: any;
  onNavigate?: (view: string) => void;
}

const EmployeeDashboardHome: React.FC<Props> = ({ user, onNavigate }) => {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [urgentTasks, setUrgentTasks] = useState<Task[]>([]);
  const [inProgressTasks, setInProgressTasks] = useState<Task[]>([]);
  const [completedTasks, setCompletedTasks] = useState<Task[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<CalendarEvent[]>([]);
  const [recentEmails, setRecentEmails] = useState<Email[]>([]);
  const [upcomingCalls, setUpcomingCalls] = useState<VideoCall[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [weeklyProgress, setWeeklyProgress] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem('token');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      const [
        statsRes,
        urgentRes,
        inProgressRes,
        completedRes,
        eventsRes,
        emailsRes,
        callsRes,
        notificationsRes,
        progressRes
      ] = await Promise.all([
        axios.get(`${API_URL}/analytics/my-stats`, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => ({ data: null })),

        axios.get(`${API_URL}/tasks/my-tasks`, {
          headers: { Authorization: `Bearer ${token}` }
        }).then(res => {
          const allTasks = res.data.tutte || [];
          return {
            data: allTasks
              .filter((t: any) => t.priorita === 'alta' && (t.stato === 'todo' || t.stato === 'in_progress'))
              .slice(0, 3)
          };
        }).catch(() => ({ data: [] })),

        axios.get(`${API_URL}/tasks/my-tasks`, {
          headers: { Authorization: `Bearer ${token}` }
        }).then(res => {
          const allTasks = res.data.tutte || [];
          return {
            data: allTasks
              .filter((t: any) => t.stato === 'in_progress')
              .slice(0, 5)
          };
        }).catch(() => ({ data: [] })),

        axios.get(`${API_URL}/tasks/my-tasks`, {
          headers: { Authorization: `Bearer ${token}` }
        }).then(res => {
          const todayTasks = res.data.oggi || [];
          return {
            data: todayTasks
              .filter((t: any) => t.stato === 'completato')
              .slice(0, 5)
          };
        }).catch(() => ({ data: [] })),

        axios.get(`${API_URL}/calendar/my-events?limit=5`, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => ({ data: [] })),

        axios.get(`${API_URL}/emails/my?limit=5`, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => ({ data: [] })),

        axios.get(`${API_URL}/video-rooms/my-upcoming?limit=3`, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => ({ data: [] })),

        axios.get(`${API_URL}/notifications/recent?limit=5`, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => ({ data: [] })),

        axios.get(`${API_URL}/analytics/weekly-progress`, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => ({ data: [] }))
      ]);

      console.log('[Dashboard] Stats ricevute:', statsRes.data);
      setStats(statsRes.data || {
        tasksToday: 0,
        score: 0,
        ranking: 0,
        completedToday: 0
      });
      setUrgentTasks(Array.isArray(urgentRes.data) ? urgentRes.data : []);
      setInProgressTasks(Array.isArray(inProgressRes.data) ? inProgressRes.data : []);
      setCompletedTasks(Array.isArray(completedRes.data) ? completedRes.data : []);
      setUpcomingEvents(Array.isArray(eventsRes.data) ? eventsRes.data : []);
      setRecentEmails(Array.isArray(emailsRes.data) ? emailsRes.data : []);
      setUpcomingCalls(Array.isArray(callsRes.data) ? callsRes.data : []);
      setNotifications(Array.isArray(notificationsRes.data) ? notificationsRes.data : []);

      // Converti l'oggetto progress in array di numeri
      let progressArray: number[] = [0, 0, 0, 0, 0, 0, 0];
      if (Array.isArray(progressRes.data)) {
        progressArray = progressRes.data.map((item: any) => {
          if (typeof item === 'number') return item;
          if (item && typeof item === 'object' && 'completed' in item) {
            return item.completed || 0;
          }
          return 0;
        });
      } else if (progressRes.data && typeof progressRes.data === 'object') {
        progressArray = Object.values(progressRes.data).map((item: any) => {
          if (typeof item === 'number') return item;
          if (item && typeof item === 'object' && 'completed' in item) {
            return item.completed || 0;
          }
          return 0;
        }).slice(0, 7);
      }
      setWeeklyProgress(progressArray);
    } catch (error) {
      console.error('Errore caricamento dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('it-IT', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buongiorno';
    if (hour < 18) return 'Buon pomeriggio';
    return 'Buonasera';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-xl text-gray-400">Caricamento dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Welcome Card */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-6 text-white shadow-lg">
        <h2 className="text-2xl font-bold mb-2">
          {getGreeting()}, {user?.nome}! 👋
        </h2>
        <p className="text-indigo-100 mb-4">
          Hai <span className="font-bold">{stats?.tasksToday || 0}</span> task da completare oggi
        </p>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Trophy className="w-4 h-4 text-yellow-300" />
              <p className="text-indigo-100 text-sm">Score Totale</p>
            </div>
            <p className="text-3xl font-bold text-white">{stats?.score || 0} <span className="text-sm text-indigo-200">pt</span></p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-green-300" />
              <p className="text-indigo-100 text-sm">Classifica</p>
            </div>
            <p className="text-3xl font-bold text-white">#{stats?.ranking || '-'}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="w-4 h-4 text-blue-300" />
              <p className="text-indigo-100 text-sm">Completati oggi</p>
            </div>
            <p className="text-3xl font-bold text-white">{stats?.completedToday || 0}</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <button
          onClick={() => onNavigate?.('tasks')}
          className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-200 dark:border-slate-700 hover:shadow-lg transition-all hover:scale-105"
        >
          <div className="flex flex-col items-center gap-2">
            <div className="p-3 bg-indigo-500/10 rounded-lg">
              <Plus className="w-6 h-6 text-indigo-500" />
            </div>
            <span className="text-sm font-semibold text-gray-900 dark:text-white">Nuovo Task</span>
          </div>
        </button>
        <button
          onClick={() => onNavigate?.('email')}
          className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-200 dark:border-slate-700 hover:shadow-lg transition-all hover:scale-105"
        >
          <div className="flex flex-col items-center gap-2">
            <div className="p-3 bg-blue-500/10 rounded-lg">
              <Mail className="w-6 h-6 text-blue-500" />
            </div>
            <span className="text-sm font-semibold text-gray-900 dark:text-white">Nuova Email</span>
          </div>
        </button>
        <button
          onClick={() => onNavigate?.('videocall')}
          className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-200 dark:border-slate-700 hover:shadow-lg transition-all hover:scale-105"
        >
          <div className="flex flex-col items-center gap-2">
            <div className="p-3 bg-green-500/10 rounded-lg">
              <Video className="w-6 h-6 text-green-500" />
            </div>
            <span className="text-sm font-semibold text-gray-900 dark:text-white">Avvia Call</span>
          </div>
        </button>
        <button
          onClick={() => onNavigate?.('tickets')}
          className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-200 dark:border-slate-700 hover:shadow-lg transition-all hover:scale-105"
        >
          <div className="flex flex-col items-center gap-2">
            <div className="p-3 bg-orange-500/10 rounded-lg">
              <Bell className="w-6 h-6 text-orange-500" />
            </div>
            <span className="text-sm font-semibold text-gray-900 dark:text-white">Ticket</span>
          </div>
        </button>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Tasks */}
        <div className="lg:col-span-2 space-y-6">
          {/* Task del Giorno - Nuovo Componente ToDo */}
          <TodayTasksList />

          {/* Progressi */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-200 dark:border-slate-700">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-indigo-500" />
              I Miei Progressi
            </h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  Task Completati - Ultima Settimana
                </p>
                <div className="flex items-end justify-between gap-2 h-32">
                  {weeklyProgress.map((value, index) => (
                    <div key={index} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-t-lg relative" style={{ height: '100%' }}>
                        <div
                          className="absolute bottom-0 w-full bg-indigo-500 rounded-t-lg transition-all"
                          style={{ height: `${(value / Math.max(...weeklyProgress, 1)) * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {['L', 'M', 'M', 'G', 'V', 'S', 'D'][index]}
                      </span>
                      <span className="text-xs font-bold text-gray-900 dark:text-white">
                        {value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-indigo-50 dark:bg-indigo-900/10 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Trophy className="w-4 h-4 text-indigo-500" />
                    <p className="text-sm text-gray-600 dark:text-gray-400">Score Totale</p>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.score || 0}</p>
                </div>
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/10 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="w-4 h-4 text-yellow-500" />
                    <p className="text-sm text-gray-600 dark:text-gray-400">Posizione</p>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">#{stats?.ranking || 0}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Calendar & Communications */}
        <div className="space-y-6">
          {/* Calendario */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-200 dark:border-slate-700">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-500" />
              Calendario
            </h3>
            <div className="space-y-2">
              {upcomingEvents.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-sm py-8 text-center">
                  Nessun evento programmato
                </p>
              ) : (
                upcomingEvents.map((event) => (
                  <div
                    key={event.id}
                    className="p-3 bg-indigo-50 dark:bg-indigo-900/10 rounded-lg border border-indigo-200 dark:border-indigo-800/30"
                  >
                    <p className="font-semibold text-gray-900 dark:text-white text-sm">
                      {event.titolo}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {formatDate(event.dataInizio)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Prossime Call */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-200 dark:border-slate-700">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Video className="w-5 h-5 text-green-500" />
              Prossime Call
            </h3>
            <div className="space-y-2">
              {upcomingCalls.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-sm py-8 text-center">
                  Nessuna call programmata
                </p>
              ) : (
                upcomingCalls.map((call) => (
                  <div
                    key={call.id}
                    className="p-3 bg-green-50 dark:bg-green-900/10 rounded-lg border border-green-200 dark:border-green-800/30 hover:shadow-md transition-shadow cursor-pointer"
                  >
                    <p className="font-semibold text-gray-900 dark:text-white text-sm">
                      {call.nome}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {formatDate(call.scheduledAt)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Email Recenti */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-200 dark:border-slate-700">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Mail className="w-5 h-5 text-blue-500" />
              Email Recenti
            </h3>
            <div className="space-y-2">
              {recentEmails.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-sm py-8 text-center">
                  Nessuna email
                </p>
              ) : (
                recentEmails.slice(0, 3).map((email) => (
                  <div
                    key={email.id}
                    className={`p-3 rounded-lg border cursor-pointer hover:shadow-md transition-shadow ${
                      !email.letto
                        ? 'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800/30'
                        : 'bg-gray-50 dark:bg-slate-700/50 border-gray-200 dark:border-slate-600'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <p className={`font-semibold text-sm ${!email.letto ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                        {email.oggetto.substring(0, 30)}...
                      </p>
                      {!email.letto && (
                        <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {email.mittente}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Notifiche Recenti */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-200 dark:border-slate-700">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Bell className="w-5 h-5 text-orange-500" />
              Notifiche
            </h3>
            <div className="space-y-2">
              {notifications.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-sm py-8 text-center">
                  Nessuna notifica
                </p>
              ) : (
                notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`p-3 rounded-lg border cursor-pointer ${
                      !notif.letta
                        ? 'bg-orange-50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-800/30'
                        : 'bg-gray-50 dark:bg-slate-700/50 border-gray-200 dark:border-slate-600'
                    }`}
                  >
                    <p className="font-semibold text-gray-900 dark:text-white text-sm">
                      {notif.titolo}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {notif.messaggio.substring(0, 50)}...
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeDashboardHome;
