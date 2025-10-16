import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  TrendingUp,
  Users,
  AlertCircle,
  Target,
  Calendar,
  Mail,
  Video,
  Trophy,
  Clock,
  CheckCircle2,
  ArrowRight,
  Ticket
} from 'lucide-react';

const API_URL = 'http://localhost:4000/api';

interface DashboardStats {
  tasksCompletedToday: number;
  tasksCompletedWeek: number;
  activeEmployees: number;
  overdueTasks: number;
  avgProductivity: number;
}

interface UrgentTask {
  id: string;
  titolo: string;
  priorita: string;
  dataScadenza: string;
  assegnato?: {
    nome: string;
    cognome: string;
  };
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
  partecipanti: number;
}

interface TopPerformer {
  id: string;
  nome: string;
  cognome: string;
  score: number;
  tasksCompleted: number;
}

const AdminDashboardHome: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [urgentTasks, setUrgentTasks] = useState<UrgentTask[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<CalendarEvent[]>([]);
  const [recentEmails, setRecentEmails] = useState<Email[]>([]);
  const [upcomingCalls, setUpcomingCalls] = useState<VideoCall[]>([]);
  const [topPerformers, setTopPerformers] = useState<TopPerformer[]>([]);
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem('token');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Carica tutte le chiamate in parallelo
      const [
        statsRes,
        tasksRes,
        eventsRes,
        emailsRes,
        callsRes,
        performersRes
      ] = await Promise.all([
        axios.get(`${API_URL}/analytics/dashboard-stats`, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => ({ data: null })),

        axios.get(`${API_URL}/tasks?priorita=alta&limit=5`, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => ({ data: [] })),

        axios.get(`${API_URL}/calendar/events?limit=5`, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => ({ data: [] })),

        axios.get(`${API_URL}/emails?limit=5`, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => ({ data: [] })),

        axios.get(`${API_URL}/video-rooms?scheduled=true&limit=3`, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => ({ data: [] })),

        axios.get(`${API_URL}/analytics/top-performers?limit=5`, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => ({ data: [] }))
      ]);

      setStats(statsRes.data || {
        tasksCompletedToday: 0,
        tasksCompletedWeek: 0,
        activeEmployees: 0,
        overdueTasks: 0,
        avgProductivity: 0
      });
      setUrgentTasks(Array.isArray(tasksRes.data) ? tasksRes.data : []);
      setUpcomingEvents(Array.isArray(eventsRes.data) ? eventsRes.data : []);
      setRecentEmails(Array.isArray(emailsRes.data) ? emailsRes.data : []);
      setUpcomingCalls(Array.isArray(callsRes.data) ? callsRes.data : []);
      setTopPerformers(Array.isArray(performersRes.data) ? performersRes.data : []);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-xl text-gray-400">Caricamento dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Task Completati */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Task Completati</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                {stats?.tasksCompletedToday || 0}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {stats?.tasksCompletedWeek || 0} questa settimana
              </p>
            </div>
            <div className="p-3 bg-green-500/10 rounded-lg">
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </div>
          </div>
        </div>

        {/* Dipendenti Attivi */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Dipendenti Attivi</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                {stats?.activeEmployees || 0}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Online ora
              </p>
            </div>
            <div className="p-3 bg-blue-500/10 rounded-lg">
              <Users className="w-8 h-8 text-blue-500" />
            </div>
          </div>
        </div>

        {/* Task in Ritardo */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Task in Ritardo</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                {stats?.overdueTasks || 0}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Richiedono attenzione
              </p>
            </div>
            <div className="p-3 bg-red-500/10 rounded-lg">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
          </div>
        </div>

        {/* Produttività Media */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Produttività Media</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                {stats?.avgProductivity || 0}%
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Team performance
              </p>
            </div>
            <div className="p-3 bg-indigo-500/10 rounded-lg">
              <Target className="w-8 h-8 text-indigo-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Tasks */}
        <div className="lg:col-span-2 space-y-6">
          {/* Task Urgenti */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-500" />
                Task Urgenti del Team
              </h3>
              <button className="text-indigo-600 dark:text-indigo-400 text-sm font-semibold hover:underline flex items-center gap-1">
                Vedi tutti
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              {urgentTasks.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-sm text-center py-8">
                  Nessun task urgente
                </p>
              ) : (
                urgentTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-900/10 rounded-lg border border-red-200 dark:border-red-800/30 hover:shadow-md transition-shadow cursor-pointer"
                  >
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 dark:text-white">{task.titolo}</h4>
                      <div className="flex items-center gap-3 mt-1">
                        {task.assegnato && (
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {task.assegnato.nome} {task.assegnato.cognome}
                          </span>
                        )}
                        <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(task.dataScadenza)}
                        </span>
                      </div>
                    </div>
                    <span className="px-3 py-1 bg-red-500 text-white text-xs font-semibold rounded-full">
                      {task.priorita}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Top Performers */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-500" />
                Top Performers
              </h3>
            </div>
            <div className="space-y-3">
              {topPerformers.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-sm text-center py-8">
                  Nessun dato disponibile
                </p>
              ) : (
                topPerformers.map((performer, index) => (
                  <div
                    key={performer.id}
                    className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${
                        index === 0 ? 'bg-yellow-500' :
                        index === 1 ? 'bg-gray-400' :
                        index === 2 ? 'bg-orange-600' : 'bg-indigo-500'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {performer.nome} {performer.cognome}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {performer.tasksCompleted} task completati
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                        {performer.score}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">punti</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Calendar & Communications */}
        <div className="space-y-6">
          {/* Calendario */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-500" />
                Prossimi Eventi
              </h3>
            </div>
            <div className="space-y-3">
              {upcomingEvents.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-sm text-center py-8">
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
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Video className="w-5 h-5 text-green-500" />
                Prossime Call
              </h3>
            </div>
            <div className="space-y-3">
              {upcomingCalls.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-sm text-center py-8">
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
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {formatDate(call.scheduledAt)}
                      </p>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {call.partecipanti} partecipanti
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Email Recenti */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Mail className="w-5 h-5 text-blue-500" />
                Email Recenti
              </h3>
            </div>
            <div className="space-y-3">
              {recentEmails.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-sm text-center py-8">
                  Nessuna email
                </p>
              ) : (
                recentEmails.slice(0, 5).map((email) => (
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
                        {email.oggetto}
                      </p>
                      {!email.letto && (
                        <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Da: {email.mittente}
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

export default AdminDashboardHome;
