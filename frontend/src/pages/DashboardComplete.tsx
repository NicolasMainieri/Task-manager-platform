import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import GoogleCalendarConnect from '../components/GoogleCalendarConnect';
import GmailConnect from '../components/GmailConnect';
import OutlookCalendarConnect from '../components/OutlookCalendarConnect';
import OutlookEmailConnect from '../components/OutlookEmailConnect';
import ImapPop3Config from '../components/ImapPop3Config';
import VideoCallPage from './VideoCallPage';
import InternalCalendar from '../components/InternalCalendar';
import Settings from './Settings';
import EmployeeDashboardHome from '../components/EmployeeDashboardHome';
import NotesComplete from './NotesComplete';
import TicketManagement from '../components/TicketManagement';
import ChatbotWidget from '../components/ChatbotWidget';
import TutorialOverlay from '../components/TutorialOverlay';
import { employeeTutorialSteps } from '../data/employeeTutorialSteps';
import type { ViewType as NotesViewType, NotesCounts } from './NotesComplete';
import {
  LayoutDashboard,
  ListTodo,
  TrendingUp,
  Trophy,
  LogOut,
  Menu,
  X,
  CheckCircle2,
  Calendar,
  Activity,
  ArrowUp,
  ArrowDown,
  Plus,
  Edit,
  Trash2,
  Award,
  Star,
  Flame,
  Bell,
  ListChecks,
  MessageSquare,
  Send,
  Mail,
  Ticket,
  Video,
  FileText,
  Settings as SettingsIcon,
  Table,
  Palette,
  ChevronDown,
  ChevronRight,
  Archive,
  Sparkles,
  Wand2,
  Loader2,
  AlertCircle,
  HelpCircle,
  Inbox
} from 'lucide-react';

interface Subtask {
  id: string;
  titolo: string;
  descrizione?: string;
  completata: boolean;
  ordine: number;
  createdAt: string;
}

interface TaskRequest {
  id: string;
  tipo: string;
  urgenza: string;
  descrizione: string;
  stato: string;
  createdAt: string;
  autore: {
    id: string;
    nome: string;
    cognome: string;
  };
}

interface Task {
  id: string;
  titolo: string;
  descrizione?: string;
  stato: string;
  priorita: string;
  difficolta: number;
  scadenza?: string;
  owner?: {
    id: string;
    nome: string;
    cognome: string;
  };
  assignees?: Array<{
    id: string;
    nome: string;
    cognome: string;
  }>;
  team?: any;
  subtasks?: Subtask[];
  requests?: TaskRequest[];
}

interface LeaderboardEntry {
  id: string;
  nome: string;
  cognome: string;
  email: string;
  score?: number;
  completedTasks?: number;
}

interface Notification {
  id: string;
  tipo: string;
  titolo: string;
  messaggio: string;
  letta: boolean;
  link?: string;
  createdAt: string;
}

interface TicketRisposta {
  id: string;
  contenuto: string;
  isAdmin: boolean;
  createdAt: string;
  autore: {
    id: string;
    nome: string;
    cognome: string;
    email: string;
  };
}

interface TicketRequest {
  id: string;
  tipo: string;
  urgenza: string;
  descrizione: string;
  stato: string;
  chiuso: boolean;
  createdAt: string;
  autore: {
    id: string;
    nome: string;
    cognome: string;
    email: string;
  };
  task?: {
    id: string;
    titolo: string;
  };
  risposte?: TicketRisposta[];
}

const DashboardComplete = () => {
  const { user, logout, token } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeView, setActiveView] = useState('dashboard');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [stats, setStats] = useState({
    totali: 0,
    daFare: 0,
    inCorso: 0,
    completati: 0,
    score: 0
  });
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);
  const [newTask, setNewTask] = useState({
    titolo: '',
    descrizione: '',
    priorita: 'medium',
    difficolta: 3,
    scadenza: '',
    subtasks: [] as Array<{ titolo: string; descrizione?: string }>
  });
  const [newTaskSubtaskInput, setNewTaskSubtaskInput] = useState('');
  const [teams, setTeams] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [newSubtask, setNewSubtask] = useState('');
  const [showAddSubtask, setShowAddSubtask] = useState(false);
  const [newRequest, setNewRequest] = useState({ tipo: '', urgenza: 'media', descrizione: '' });
  const [showRequestModal, setShowRequestModal] = useState(false);

  // AI Assistant states
  const [aiSuggesting, setAiSuggesting] = useState(false);
  const [aiGeneratingSubtasks, setAiGeneratingSubtasks] = useState(false);
  const [aiEstimating, setAiEstimating] = useState(false);
  const [aiAnalyzingProductivity, setAiAnalyzingProductivity] = useState(false);
  const [productivityInsights, setProductivityInsights] = useState<any>(null);
  const [aiAnalyzingEmailCalendar, setAiAnalyzingEmailCalendar] = useState(false);
  const [emailCalendarInsights, setEmailCalendarInsights] = useState<any>(null);
  const [aiAnalyzingTasks, setAiAnalyzingTasks] = useState(false);
  const [tasksAnalysis, setTasksAnalysis] = useState<any>(null);

  // Ticket states
  const [tickets, setTickets] = useState<TicketRequest[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<TicketRequest | null>(null);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [newTicketResponse, setNewTicketResponse] = useState('');

  // Tutorial states
  const [showTutorial, setShowTutorial] = useState(false);

  // Notes states
  const [notesView, setNotesView] = useState<NotesViewType>('home');
  const [notesCounts, setNotesCounts] = useState<NotesCounts>({ total: 0, text: 0, spreadsheet: 0, whiteboard: 0, favorites: 0, archived: 0 });
  const [notesExpanded, setNotesExpanded] = useState(false);

  // Email states
  const [emailView, setEmailView] = useState<'inbox' | 'sent' | 'drafts' | 'archived' | 'starred'>('inbox');
  const [emailExpanded, setEmailExpanded] = useState(false);

  useEffect(() => {
    if (token) {
      fetchAllData();
    }

    // Check se è il primo accesso e mostra tutorial
    const tutorialCompleted = localStorage.getItem('employee-tutorial-completed');
    if (!tutorialCompleted) {
      // Aspetta 1 secondo per dare tempo al DOM di caricarsi
      setTimeout(() => setShowTutorial(true), 1000);
    }
  }, [token]);

  const fetchAllData = async () => {
    await Promise.all([
      fetchTasks(),
      fetchLeaderboard(),
      fetchTeams(),
      fetchUserScore(),
      fetchNotifications(),
      fetchTickets()
    ]);
    setLoading(false);
  };

  const fetchTasks = async () => {
    try {
      const response = await fetch('http://localhost:4000/api/tasks/my-tasks', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        const allTasks = data.tutte || [];
        setTasks(allTasks);

        const statsCalc = {
          totali: allTasks.length,
          daFare: allTasks.filter((t: Task) => t.stato === 'todo' || t.stato === 'da_fare').length,
          inCorso: allTasks.filter((t: Task) => t.stato === 'in_corso' || t.stato === 'in_progress').length,
          completati: allTasks.filter((t: Task) => t.stato === 'completato' || t.stato === 'completata').length,
          score: 0 // TODO: calcolare dal backend
        };

        setStats(statsCalc);
      }
    } catch (error) {
      console.error('Errore nel caricamento dei task:', error);
    }
  };

  const fetchLeaderboard = async () => {
    try {
      const response = await fetch('http://localhost:4000/api/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        const users = Array.isArray(data) ? data : [];
        // Ordina per score reale dal backend
        const sorted = users.sort((a: any, b: any) => (b.score || 0) - (a.score || 0));
        setLeaderboard(sorted.slice(0, 10));
      }
    } catch (error) {
      console.error('Errore nel caricamento della classifica:', error);
    }
  };

  const fetchTeams = async () => {
    try {
      const response = await fetch('http://localhost:4000/api/teams', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setTeams(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Errore nel caricamento dei team:', error);
    }
  };

  const fetchUserScore = async () => {
    try {
      if (!user?.id) return;
      const response = await fetch(`http://localhost:4000/api/scores/user/${user.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setStats(prev => ({ ...prev, score: data.score || 0 }));
      }
    } catch (error) {
      console.error('Errore nel caricamento dello score:', error);
    }
  };

  const fetchNotifications = async () => {
    try {
      const response = await fetch('http://localhost:4000/api/notifications', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (error) {
      console.error('Errore nel caricamento delle notifiche:', error);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(`http://localhost:4000/api/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        await fetchNotifications();
      }
    } catch (error) {
      console.error('Errore nel segnare la notifica come letta:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const response = await fetch('http://localhost:4000/api/notifications/read-all', {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        await fetchNotifications();
      }
    } catch (error) {
      console.error('Errore nel segnare tutte le notifiche come lette:', error);
    }
  };

  // Fetch tickets
  const fetchTickets = async () => {
    try {
      const response = await fetch('http://localhost:4000/api/requests', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setTickets(data.requests || data || []);
      }
    } catch (error) {
      console.error('Errore nel caricamento dei ticket:', error);
    }
  };

  // Aggiungi risposta al ticket
  const handleAddTicketResponse = async (ticketId: string) => {
    if (!newTicketResponse.trim()) return;

    try {
      const response = await fetch(`http://localhost:4000/api/requests/${ticketId}/risposte`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ contenuto: newTicketResponse })
      });

      if (response.ok) {
        const risposta = await response.json();
        if (selectedTicket) {
          setSelectedTicket({
            ...selectedTicket,
            risposte: [...(selectedTicket.risposte || []), risposta]
          });
        }
        setNewTicketResponse('');
        await fetchTickets();
      }
    } catch (error) {
      console.error('Errore nell\'aggiunta della risposta:', error);
    }
  };

  // Chiudi ticket
  const handleCloseTicket = async (ticketId: string) => {
    try {
      const response = await fetch(`http://localhost:4000/api/requests/${ticketId}/close`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        await fetchTickets();
        if (selectedTicket?.id === ticketId) {
          const updatedTicket = await response.json();
          setSelectedTicket(updatedTicket);
        }
      }
    } catch (error) {
      console.error('Errore nella chiusura del ticket:', error);
    }
  };

  // Riapri ticket
  const handleReopenTicket = async (ticketId: string) => {
    try {
      const response = await fetch(`http://localhost:4000/api/requests/${ticketId}/reopen`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        await fetchTickets();
        if (selectedTicket?.id === ticketId) {
          const updatedTicket = await response.json();
          setSelectedTicket(updatedTicket);
        }
      }
    } catch (error) {
      console.error('Errore nella riapertura del ticket:', error);
    }
  };

  // AI Assistant Functions
  const handleAISuggestMetadata = async () => {
    if (!newTask.titolo) {
      alert('Inserisci un titolo per ottenere suggerimenti AI');
      return;
    }

    setAiSuggesting(true);
    try {
      const response = await fetch('http://localhost:4000/api/ai/tasks/suggest-metadata', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          titolo: newTask.titolo,
          descrizione: newTask.descrizione
        })
      });

      if (response.ok) {
        const suggestions = await response.json();
        // Mappa priorità AI a formato del form
        const prioritaMap: Record<string, string> = {
          'bassa': 'bassa',
          'media': 'media',
          'alta': 'alta'
        };

        setNewTask({
          ...newTask,
          priorita: prioritaMap[suggestions.priorita] || 'media',
          difficolta: suggestions.difficolta || 3
        });

        alert(`✨ Suggerimenti AI:\n\nPriorità: ${suggestions.priorita}\nDifficoltà: ${suggestions.difficolta}/5\n\n${suggestions.reasoning}`);
      }
    } catch (error) {
      console.error('Errore suggerimento AI:', error);
      alert('Errore nel ottenere suggerimenti AI. Verifica che l\'API OpenAI sia configurata.');
    } finally {
      setAiSuggesting(false);
    }
  };

  const handleAIGenerateSubtasks = async () => {
    if (!newTask.titolo) {
      alert('Inserisci un titolo per generare subtask AI');
      return;
    }

    setAiGeneratingSubtasks(true);
    try {
      const response = await fetch('http://localhost:4000/api/ai/tasks/generate-subtasks', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          titolo: newTask.titolo,
          descrizione: newTask.descrizione,
          numSubtasks: 5
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.subtasks && result.subtasks.length > 0) {
          setNewTask({
            ...newTask,
            subtasks: [
              ...newTask.subtasks,
              ...result.subtasks.map((st: any) => ({ titolo: st.titolo, descrizione: st.descrizione }))
            ]
          });
        }
      }
    } catch (error) {
      console.error('Errore generazione subtask AI:', error);
      alert('Errore nel generare subtask AI. Verifica che l\'API OpenAI sia configurata.');
    } finally {
      setAiGeneratingSubtasks(false);
    }
  };

  const handleAIEstimateTime = async () => {
    if (!newTask.titolo) {
      alert('Inserisci un titolo per stimare il tempo');
      return;
    }

    setAiEstimating(true);
    try {
      const response = await fetch('http://localhost:4000/api/ai/tasks/estimate-time', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          titolo: newTask.titolo,
          descrizione: newTask.descrizione,
          difficolta: newTask.difficolta
        })
      });

      if (response.ok) {
        const estimate = await response.json();
        alert(`⏱️ Stima Tempo AI:\n\nTempo stimato: ${estimate.stima_ore} ore\nRange: ${estimate.stima_min}-${estimate.stima_max} ore\n\n${estimate.reasoning}`);
      }
    } catch (error) {
      console.error('Errore stima tempo AI:', error);
      alert('Errore nel stimare il tempo AI. Verifica che l\'API OpenAI sia configurata.');
    } finally {
      setAiEstimating(false);
    }
  };

  // AI: Analyze Productivity
  const handleAIAnalyzeProductivity = async () => {
    setAiAnalyzingProductivity(true);
    try {
      const response = await fetch('http://localhost:4000/api/ai/productivity/analyze', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const insights = await response.json();
        setProductivityInsights(insights);
      }
    } catch (error) {
      console.error('Errore analisi produttività AI:', error);
      alert('Errore nell\'analisi della produttività AI');
    } finally {
      setAiAnalyzingProductivity(false);
    }
  };

  // AI: Analyze Email & Calendar
  const handleAIAnalyzeEmailCalendar = async () => {
    setAiAnalyzingEmailCalendar(true);
    try {
      const response = await fetch('http://localhost:4000/api/ai/calendar/analyze', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const insights = await response.json();
        setEmailCalendarInsights(insights);
      }
    } catch (error) {
      console.error('Errore analisi email/calendario AI:', error);
      alert('Errore nell\'analisi email/calendario AI');
    } finally {
      setAiAnalyzingEmailCalendar(false);
    }
  };

  // AI: Analyze All Tasks
  const handleAIAnalyzeAllTasks = async () => {
    setAiAnalyzingTasks(true);
    try {
      const response = await fetch('http://localhost:4000/api/ai/tasks/analyze-all', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const analysis = await response.json();
        setTasksAnalysis(analysis);
      }
    } catch (error) {
      console.error('Errore analisi task AI:', error);
      alert('Errore nell\'analisi task AI');
    } finally {
      setAiAnalyzingTasks(false);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:4000/api/tasks', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newTask)
      });

      if (response.ok) {
        await fetchTasks();
        setShowCreateTaskModal(false);
        setNewTask({
          titolo: '',
          descrizione: '',
          priorita: 'medium',
          difficolta: 3,
          scadenza: '',
          subtasks: []
        });
        setNewTaskSubtaskInput('');
      }
    } catch (error) {
      console.error('Errore nella creazione del task:', error);
    }
  };

  const handleUpdateTaskStatus = async (taskId: string, newStatus: string) => {
    try {
      const response = await fetch(`http://localhost:4000/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ stato: newStatus })
      });

      if (response.ok) {
        await fetchTasks();
        setShowTaskModal(false);
        setSelectedTask(null);
      }
    } catch (error) {
      console.error('Errore nell\'aggiornamento del task:', error);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // Gestione Subtask
  const handleAddSubtask = async () => {
    if (!selectedTask || !newSubtask.trim()) return;

    try {
      const response = await fetch(`http://localhost:4000/api/tasks/${selectedTask.id}/subtasks`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ titolo: newSubtask })
      });

      if (response.ok) {
        const subtask = await response.json();
        setSelectedTask({
          ...selectedTask,
          subtasks: [...(selectedTask.subtasks || []), subtask]
        });
        setNewSubtask('');
        setShowAddSubtask(false);
      }
    } catch (error) {
      console.error('Errore nell\'aggiunta della subtask:', error);
    }
  };

  const handleToggleSubtask = async (subtaskId: string) => {
    if (!selectedTask) return;

    try {
      const response = await fetch(`http://localhost:4000/api/subtasks/${subtaskId}/toggle`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const updatedSubtask = await response.json();
        setSelectedTask({
          ...selectedTask,
          subtasks: selectedTask.subtasks?.map(st =>
            st.id === subtaskId ? updatedSubtask : st
          )
        });
      }
    } catch (error) {
      console.error('Errore nell\'aggiornamento della subtask:', error);
    }
  };

  const handleDeleteSubtask = async (subtaskId: string) => {
    if (!selectedTask) return;

    try {
      const response = await fetch(`http://localhost:4000/api/subtasks/${subtaskId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setSelectedTask({
          ...selectedTask,
          subtasks: selectedTask.subtasks?.filter(st => st.id !== subtaskId)
        });
      }
    } catch (error) {
      console.error('Errore nell\'eliminazione della subtask:', error);
    }
  };

  // Gestione Richieste
  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;

    try {
      const response = await fetch('http://localhost:4000/api/requests', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          taskId: selectedTask.id,
          ...newRequest
        })
      });

      if (response.ok) {
        const request = await response.json();
        setSelectedTask({
          ...selectedTask,
          requests: [...(selectedTask.requests || []), request]
        });
        setNewRequest({ tipo: '', urgenza: 'media', descrizione: '' });
        setShowRequestModal(false);
      }
    } catch (error) {
      console.error('Errore nella creazione della richiesta:', error);
    }
  };

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'tasks', label: 'I Miei Task', icon: ListTodo },
    { id: 'notes', label: 'Note', icon: FileText },
    { id: 'tickets', label: 'Ticket', icon: Ticket },
    { id: 'videocall', label: 'Videochiamate', icon: Video },
    { id: 'calendar', label: 'Calendario', icon: Calendar },
    { id: 'email', label: 'Email', icon: Mail },
    { id: 'progress', label: 'Progressi', icon: TrendingUp },
    { id: 'leaderboard', label: 'Classifica', icon: Trophy },
    { id: 'settings', label: 'Impostazioni', icon: SettingsIcon }
  ];

  const getStatusBadge = (stato: string) => {
    const statusMap: Record<string, { label: string; class: string }> = {
      'todo': { label: 'Da Fare', class: 'bg-yellow-500/20 text-yellow-400' },
      'da_fare': { label: 'Da Fare', class: 'bg-yellow-500/20 text-yellow-400' },
      'in_corso': { label: 'In Corso', class: 'bg-orange-500/20 text-orange-400' },
      'in_progress': { label: 'In Corso', class: 'bg-orange-500/20 text-orange-400' },
      'completato': { label: 'Completato', class: 'bg-green-500/20 text-green-400' },
      'completata': { label: 'Completato', class: 'bg-green-500/20 text-green-400' }
    };

    const status = statusMap[stato] || statusMap['todo'];
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${status.class}`}>
        {status.label}
      </span>
    );
  };

  const getPriorityBadge = (priorita: string) => {
    const priorityMap: Record<string, { label: string; class: string }> = {
      'alta': { label: 'Alta', class: 'bg-red-500/20 text-red-400 border-red-500/30' },
      'high': { label: 'Alta', class: 'bg-red-500/20 text-red-400 border-red-500/30' },
      'media': { label: 'Media', class: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
      'medium': { label: 'Media', class: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
      'bassa': { label: 'Bassa', class: 'bg-green-500/20 text-green-400 border-green-500/30' },
      'low': { label: 'Bassa', class: 'bg-green-500/20 text-green-400 border-green-500/30' }
    };

    const priority = priorityMap[priorita] || priorityMap['media'];
    return (
      <span className={`px-2 py-1 rounded text-xs font-semibold border ${priority.class}`}>
        {priority.label}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 flex">
      {/* Sidebar */}
      <aside className={`fixed left-0 top-0 h-full bg-slate-900/90 backdrop-blur-xl border-r border-indigo-500/20 z-40 transition-all duration-300 ${sidebarOpen ? 'w-64' : 'w-20'}`}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-indigo-500/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center">
                <Activity className="w-6 h-6 text-white" />
              </div>
              {sidebarOpen && (
                <div>
                  <h1 className="text-white font-bold text-lg">TaskFlow</h1>
                  <p className="text-gray-400 text-xs">Dashboard</p>
                </div>
              )}
            </div>
          </div>

          {/* User Info */}
          {sidebarOpen && (
            <div className="p-6 border-b border-indigo-500/20">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                  {user?.nome?.charAt(0)}{user?.cognome?.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold truncate">{user?.nome} {user?.cognome}</p>
                  <p className="text-gray-400 text-sm truncate">{user?.email}</p>
                </div>
              </div>
            </div>
          )}

          {/* Menu */}
          <nav className="flex-1 p-4 overflow-y-auto">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isNotes = item.id === 'notes';
              const isEmail = item.id === 'email';

              return (
                <div key={item.id}>
                  <button
                    onClick={() => {
                      if (isNotes) {
                        if (activeView === 'notes') {
                          // If already on notes, toggle expansion
                          setNotesExpanded(!notesExpanded);
                        } else {
                          // First time clicking notes, show home and expand
                          setActiveView('notes');
                          setNotesView('home');
                          setNotesExpanded(true);
                        }
                      } else if (isEmail) {
                        if (activeView === 'email') {
                          // If already on email, toggle expansion
                          setEmailExpanded(!emailExpanded);
                        } else {
                          // First time clicking email, show inbox and expand
                          setActiveView('email');
                          setEmailView('inbox');
                          setEmailExpanded(true);
                        }
                      } else {
                        setActiveView(item.id);
                        setNotesExpanded(false);
                        setEmailExpanded(false);
                      }
                    }}
                    data-tutorial={`menu-${item.id}`}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl mb-2 transition-all ${
                      activeView === item.id
                        ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/50'
                        : 'text-gray-400 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    {sidebarOpen && (
                      <>
                        <span className="font-medium flex-1 text-left">{item.label}</span>
                        {isNotes && notesCounts.total > 0 && (
                          <span className="text-xs bg-indigo-500/30 px-2 py-0.5 rounded-full">
                            {notesCounts.total}
                          </span>
                        )}
                        {isNotes && (
                          notesExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
                        )}
                        {isEmail && (
                          emailExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
                        )}
                      </>
                    )}
                  </button>

                  {/* Notes Subcategories */}
                  {isNotes && notesExpanded && sidebarOpen && activeView === 'notes' && (
                    <div className="ml-4 mb-2 space-y-1">
                      <button
                        onClick={() => setNotesView('text')}
                        className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-all ${
                          notesView === 'text'
                            ? 'bg-indigo-500/20 text-indigo-300'
                            : 'text-gray-500 hover:bg-white/5 hover:text-gray-300'
                        }`}
                      >
                        <FileText className="w-4 h-4 flex-shrink-0" />
                        <span className="text-sm flex-1 text-left">Fogli di Testo</span>
                        {notesCounts.text > 0 && (
                          <span className="text-xs bg-indigo-500/20 px-1.5 py-0.5 rounded">
                            {notesCounts.text}
                          </span>
                        )}
                      </button>
                      <button
                        onClick={() => setNotesView('spreadsheet')}
                        className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-all ${
                          notesView === 'spreadsheet'
                            ? 'bg-indigo-500/20 text-indigo-300'
                            : 'text-gray-500 hover:bg-white/5 hover:text-gray-300'
                        }`}
                      >
                        <Table className="w-4 h-4 flex-shrink-0" />
                        <span className="text-sm flex-1 text-left">Fogli di Calcolo</span>
                        {notesCounts.spreadsheet > 0 && (
                          <span className="text-xs bg-indigo-500/20 px-1.5 py-0.5 rounded">
                            {notesCounts.spreadsheet}
                          </span>
                        )}
                      </button>
                      <button
                        onClick={() => setNotesView('whiteboard')}
                        className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-all ${
                          notesView === 'whiteboard'
                            ? 'bg-indigo-500/20 text-indigo-300'
                            : 'text-gray-500 hover:bg-white/5 hover:text-gray-300'
                        }`}
                      >
                        <Palette className="w-4 h-4 flex-shrink-0" />
                        <span className="text-sm flex-1 text-left">Lavagne</span>
                        {notesCounts.whiteboard > 0 && (
                          <span className="text-xs bg-indigo-500/20 px-1.5 py-0.5 rounded">
                            {notesCounts.whiteboard}
                          </span>
                        )}
                      </button>

                      {/* Divider */}
                      <div className="h-px bg-slate-700 my-2" />

                      {/* Special Categories */}
                      <button
                        onClick={() => setNotesView('favorites')}
                        className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-all ${
                          notesView === 'favorites'
                            ? 'bg-yellow-500/20 text-yellow-300'
                            : 'text-gray-500 hover:bg-white/5 hover:text-gray-300'
                        }`}
                      >
                        <Star className="w-4 h-4 flex-shrink-0" />
                        <span className="text-sm flex-1 text-left">Preferiti</span>
                        {notesCounts.favorites > 0 && (
                          <span className="text-xs bg-yellow-500/20 px-1.5 py-0.5 rounded">
                            {notesCounts.favorites}
                          </span>
                        )}
                      </button>
                      <button
                        onClick={() => setNotesView('archived')}
                        className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-all ${
                          notesView === 'archived'
                            ? 'bg-gray-500/20 text-gray-300'
                            : 'text-gray-500 hover:bg-white/5 hover:text-gray-300'
                        }`}
                      >
                        <Archive className="w-4 h-4 flex-shrink-0" />
                        <span className="text-sm flex-1 text-left">Archiviati</span>
                        {notesCounts.archived > 0 && (
                          <span className="text-xs bg-gray-500/20 px-1.5 py-0.5 rounded">
                            {notesCounts.archived}
                          </span>
                        )}
                      </button>
                    </div>
                  )}

                  {/* Email Subcategories */}
                  {isEmail && emailExpanded && sidebarOpen && activeView === 'email' && (
                    <div className="ml-4 mb-2 space-y-1">
                      <button
                        onClick={() => setEmailView('inbox')}
                        className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-all ${
                          emailView === 'inbox'
                            ? 'bg-indigo-500/20 text-indigo-300'
                            : 'text-gray-400 hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        <Inbox className="w-4 h-4 flex-shrink-0" />
                        <span className="text-sm flex-1 text-left">Posta in arrivo</span>
                      </button>
                      <button
                        onClick={() => setEmailView('sent')}
                        className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-all ${
                          emailView === 'sent'
                            ? 'bg-green-500/20 text-green-300'
                            : 'text-gray-400 hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        <Send className="w-4 h-4 flex-shrink-0" />
                        <span className="text-sm flex-1 text-left">Posta inviata</span>
                      </button>
                      <button
                        onClick={() => setEmailView('drafts')}
                        className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-all ${
                          emailView === 'drafts'
                            ? 'bg-orange-500/20 text-orange-300'
                            : 'text-gray-400 hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        <Edit className="w-4 h-4 flex-shrink-0" />
                        <span className="text-sm flex-1 text-left">Bozze</span>
                      </button>
                      <button
                        onClick={() => setEmailView('starred')}
                        className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-all ${
                          emailView === 'starred'
                            ? 'bg-yellow-500/20 text-yellow-300'
                            : 'text-gray-400 hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        <Star className="w-4 h-4 flex-shrink-0" />
                        <span className="text-sm flex-1 text-left">Con stella</span>
                      </button>
                      <button
                        onClick={() => setEmailView('archived')}
                        className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-all ${
                          emailView === 'archived'
                            ? 'bg-gray-500/20 text-gray-300'
                            : 'text-gray-500 hover:bg-white/5 hover:text-gray-300'
                        }`}
                      >
                        <Archive className="w-4 h-4 flex-shrink-0" />
                        <span className="text-sm flex-1 text-left">Archiviate</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          {/* Tutorial & Logout */}
          <div className="p-4 border-t border-indigo-500/20 space-y-2">
            <button
              onClick={() => {
                localStorage.removeItem('employee-tutorial-completed');
                setShowTutorial(true);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-cyan-400 hover:bg-cyan-500/10 hover:text-cyan-300 transition-all"
            >
              <HelpCircle className="w-5 h-5 flex-shrink-0" />
              {sidebarOpen && <span className="font-medium">Tutorial</span>}
            </button>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all"
            >
              <LogOut className="w-5 h-5 flex-shrink-0" />
              {sidebarOpen && <span className="font-medium">Logout</span>}
            </button>
          </div>

          {/* Toggle Button */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="absolute -right-3 top-20 w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center text-white hover:bg-indigo-600 transition-colors"
          >
            {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-20'}`}>
        <div className="p-8">
          {/* Notifications Bell - Moved to top right */}
          <div className="mb-8 flex items-end justify-end">
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-3 bg-slate-800/50 border border-indigo-500/20 rounded-xl hover:border-indigo-500/40 transition-all"
              >
                <Bell className="w-6 h-6 text-gray-400" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notifications Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-96 bg-slate-800 border border-indigo-500/20 rounded-xl shadow-2xl z-50 max-h-96 overflow-y-auto">
                  <div className="p-4 border-b border-indigo-500/20 flex items-center justify-between">
                    <h3 className="text-white font-bold">Notifiche</h3>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllAsRead}
                        className="text-indigo-400 hover:text-indigo-300 text-sm"
                      >
                        Segna tutte come lette
                      </button>
                    )}
                  </div>

                  <div className="divide-y divide-indigo-500/10">
                    {notifications.length > 0 ? (
                      notifications.map((notification) => (
                        <div
                          key={notification.id}
                          className={`p-4 hover:bg-slate-700/30 transition cursor-pointer ${
                            !notification.letta ? 'bg-indigo-500/5' : ''
                          }`}
                          onClick={() => {
                            handleMarkAsRead(notification.id);
                            if (notification.link) {
                              navigate(notification.link);
                              setShowNotifications(false);
                            }
                          }}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                              !notification.letta ? 'bg-indigo-500' : 'bg-gray-600'
                            }`}></div>
                            <div className="flex-1">
                              <h4 className="text-white font-semibold text-sm mb-1">
                                {notification.titolo}
                              </h4>
                              <p className="text-gray-400 text-sm mb-2">
                                {notification.messaggio}
                              </p>
                              <span className="text-gray-500 text-xs">
                                {new Date(notification.createdAt).toLocaleString('it-IT')}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-8 text-center">
                        <Bell className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                        <p className="text-gray-500">Nessuna notifica</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <>
              {/* Dashboard View */}
              {activeView === 'dashboard' && (
                <div data-tutorial="employee-dashboard">
                  <EmployeeDashboardHome user={user} onNavigate={setActiveView} />
                </div>
              )}

              {/* Tasks View */}
              {activeView === 'tasks' && (
                <div data-tutorial="my-tasks">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-2xl font-bold text-white">I Miei Task</h3>
                    <div className="flex gap-3">
                      <button
                        onClick={handleAIAnalyzeAllTasks}
                        data-tutorial="ai-task-help"
                        disabled={aiAnalyzingTasks}
                        className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 disabled:from-gray-600 disabled:to-gray-600 text-white px-4 py-2 rounded-lg transition-all shadow-lg shadow-cyan-500/50 disabled:shadow-none"
                      >
                        {aiAnalyzingTasks ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Analizzando...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-5 h-5" />
                            Analizza Task con AI
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => setShowCreateTaskModal(true)}
                        className="flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white px-4 py-2 rounded-lg transition-all shadow-lg shadow-indigo-500/50"
                      >
                        <Plus className="w-5 h-5" />
                        Crea Task
                      </button>
                    </div>
                  </div>

                  {/* AI Tasks Analysis */}
                  {tasksAnalysis && (
                    <div className="mb-6 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 rounded-2xl p-6">
                      <div className="flex items-start gap-3">
                        <Sparkles className="w-6 h-6 text-cyan-400 flex-shrink-0 mt-1" />
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="text-white font-bold text-lg">📊 Analisi AI dei Task</h4>
                            <button
                              onClick={() => setTasksAnalysis(null)}
                              className="text-gray-400 hover:text-white"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          </div>

                          {/* Panoramica */}
                          <div className="bg-slate-800/50 rounded-xl p-4 mb-4">
                            <p className="text-gray-300 text-sm mb-2">{tasksAnalysis.panoramica_generale}</p>
                            <p className="text-cyan-400 font-semibold text-lg">{tasksAnalysis.tasso_completamento}</p>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            {/* Performance Highlights */}
                            <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
                              <h5 className="text-green-400 font-semibold text-sm mb-3 flex items-center gap-2">
                                <Trophy className="w-4 h-4" />
                                Punti di Forza
                              </h5>
                              <ul className="text-gray-300 text-sm space-y-1">
                                {tasksAnalysis.performance_highlights.map((highlight: string, i: number) => (
                                  <li key={i}>• {highlight}</li>
                                ))}
                              </ul>
                            </div>

                            {/* Aree Critiche */}
                            <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4">
                              <h5 className="text-orange-400 font-semibold text-sm mb-3 flex items-center gap-2">
                                <AlertCircle className="w-4 h-4" />
                                Aree Critiche
                              </h5>
                              <ul className="text-gray-300 text-sm space-y-1">
                                {tasksAnalysis.aree_critiche.map((area: string, i: number) => (
                                  <li key={i}>• {area}</li>
                                ))}
                              </ul>
                            </div>
                          </div>

                          {/* Task Prioritari */}
                          {tasksAnalysis.task_prioritari && tasksAnalysis.task_prioritari.length > 0 && (
                            <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-xl p-4 mb-4">
                              <h5 className="text-indigo-400 font-semibold text-sm mb-3">🎯 Task Prioritari</h5>
                              <div className="space-y-2">
                                {tasksAnalysis.task_prioritari.map((task: any, i: number) => (
                                  <div key={i} className="bg-slate-800/50 rounded-lg p-3">
                                    <p className="text-white font-semibold text-sm">{task.titolo || task.descrizione}</p>
                                    <p className="text-gray-400 text-xs mt-1">{task.motivo}</p>
                                    <p className="text-indigo-400 text-xs mt-1">→ {task.azione_suggerita}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Gestione Scadenze */}
                          {tasksAnalysis.gestione_scadenze && (
                            <div className={`rounded-xl p-4 mb-4 ${
                              tasksAnalysis.gestione_scadenze.valutazione === 'Eccellente' ? 'bg-green-500/10 border border-green-500/30' :
                              tasksAnalysis.gestione_scadenze.valutazione === 'Buona' ? 'bg-blue-500/10 border border-blue-500/30' :
                              tasksAnalysis.gestione_scadenze.valutazione === 'Da migliorare' ? 'bg-yellow-500/10 border border-yellow-500/30' :
                              'bg-red-500/10 border border-red-500/30'
                            }`}>
                              <h5 className={`font-semibold text-sm mb-2 ${
                                tasksAnalysis.gestione_scadenze.valutazione === 'Eccellente' ? 'text-green-400' :
                                tasksAnalysis.gestione_scadenze.valutazione === 'Buona' ? 'text-blue-400' :
                                tasksAnalysis.gestione_scadenze.valutazione === 'Da migliorare' ? 'text-yellow-400' :
                                'text-red-400'
                              }`}>
                                📅 Gestione Scadenze: {tasksAnalysis.gestione_scadenze.valutazione}
                              </h5>
                              <p className="text-gray-300 text-sm">{tasksAnalysis.gestione_scadenze.commento}</p>
                            </div>
                          )}

                          {/* Raccomandazioni */}
                          <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4 mb-4">
                            <h5 className="text-purple-400 font-semibold text-sm mb-3">💡 Raccomandazioni</h5>
                            <ul className="text-gray-300 text-sm space-y-1">
                              {tasksAnalysis.raccomandazioni.map((rec: string, i: number) => (
                                <li key={i}>• {rec}</li>
                              ))}
                            </ul>
                          </div>

                          {/* Prossimi Passi */}
                          <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-4">
                            <h5 className="text-cyan-400 font-semibold text-sm mb-3">🚀 Prossimi Passi</h5>
                            <ol className="text-gray-300 text-sm space-y-1">
                              {tasksAnalysis.prossimi_passi.map((step: string, i: number) => (
                                <li key={i}>{i + 1}. {step}</li>
                              ))}
                            </ol>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  {tasks.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {tasks.map((task) => (
                        <div
                          key={task.id}
                          onClick={async () => {
                            // Carica i dettagli completi del task
                            try {
                              const response = await fetch(`http://localhost:4000/api/tasks/${task.id}`, {
                                headers: { 'Authorization': `Bearer ${token}` }
                              });
                              if (response.ok) {
                                const fullTask = await response.json();
                                setSelectedTask(fullTask);
                                setShowTaskModal(true);
                              }
                            } catch (error) {
                              console.error('Errore nel caricamento del task:', error);
                              setSelectedTask(task);
                              setShowTaskModal(true);
                            }
                          }}
                          className="bg-slate-800/50 backdrop-blur-sm border border-indigo-500/20 rounded-2xl p-6 hover:border-indigo-500/40 cursor-pointer transition-all"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <h4 className="text-white font-bold text-lg flex-1">{task.titolo}</h4>
                          </div>
                          {task.descrizione && (
                            <p className="text-gray-400 text-sm mb-4 line-clamp-2">{task.descrizione}</p>
                          )}
                          <div className="flex flex-wrap items-center gap-2 mb-3">
                            {getStatusBadge(task.stato)}
                            {getPriorityBadge(task.priorita)}
                          </div>
                          {task.scadenza && (
                            <div className="flex items-center gap-2 text-gray-500 text-sm">
                              <Calendar className="w-4 h-4" />
                              <span>Scadenza: {new Date(task.scadenza).toLocaleDateString('it-IT')}</span>
                            </div>
                          )}
                          {task.owner && (
                            <div className="mt-3 pt-3 border-t border-indigo-500/10">
                              <span className="text-gray-500 text-xs">
                                Creato da: {task.owner.nome} {task.owner.cognome}
                              </span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-slate-800/50 backdrop-blur-sm border border-indigo-500/20 rounded-2xl p-12 text-center">
                      <ListTodo className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                      <h3 className="text-xl font-bold text-white mb-2">Nessun task</h3>
                      <p className="text-gray-400">Non hai task assegnati al momento</p>
                    </div>
                  )}
                </div>
              )}

              {/* Progress View */}
              {activeView === 'progress' && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-2xl font-bold text-white">I Miei Progressi</h3>
                    <button
                      onClick={handleAIAnalyzeProductivity}
                      disabled={aiAnalyzingProductivity}
                      className="flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 disabled:from-gray-600 disabled:to-gray-600 text-white px-4 py-2 rounded-lg transition-all shadow-lg shadow-indigo-500/50 disabled:shadow-none"
                    >
                      {aiAnalyzingProductivity ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Analisi in corso...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-5 h-5" />
                          Analizza Produttività con AI
                        </>
                      )}
                    </button>
                  </div>

                  {/* AI Productivity Insights */}
                  {productivityInsights && (
                    <div className="mb-6 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/30 rounded-2xl p-6">
                      <div className="flex items-start gap-3 mb-4">
                        <Sparkles className="w-6 h-6 text-indigo-400 flex-shrink-0 mt-1" />
                        <div className="flex-1">
                          <h4 className="text-white font-bold text-lg mb-2">Insights AI sulla Produttività</h4>
                          <p className="text-gray-300 text-sm mb-4">{productivityInsights.analisi_generale}</p>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                            {/* Pattern */}
                            <div className="bg-slate-800/50 rounded-xl p-4 border border-indigo-500/20">
                              <h5 className="text-indigo-400 font-semibold text-sm mb-2">📊 Pattern</h5>
                              <ul className="text-gray-300 text-sm space-y-1">
                                {productivityInsights.pattern.map((p: string, i: number) => (
                                  <li key={i}>• {p}</li>
                                ))}
                              </ul>
                            </div>

                            {/* Burnout Risk */}
                            <div className="bg-slate-800/50 rounded-xl p-4 border border-indigo-500/20">
                              <h5 className="text-orange-400 font-semibold text-sm mb-2">⚠️ Rischio Burnout</h5>
                              <p className={`text-lg font-bold mb-2 ${
                                productivityInsights.rischio_burnout === 'Alto' ? 'text-red-400' :
                                productivityInsights.rischio_burnout === 'Medio' ? 'text-yellow-400' : 'text-green-400'
                              }`}>
                                {productivityInsights.rischio_burnout}
                              </p>
                              <p className="text-gray-400 text-xs">{productivityInsights.spiegazione_burnout}</p>
                            </div>

                            {/* Suggestions */}
                            <div className="bg-slate-800/50 rounded-xl p-4 border border-indigo-500/20">
                              <h5 className="text-green-400 font-semibold text-sm mb-2">💡 Suggerimenti</h5>
                              <ul className="text-gray-300 text-sm space-y-1">
                                {productivityInsights.suggerimenti.slice(0, 3).map((s: string, i: number) => (
                                  <li key={i}>• {s}</li>
                                ))}
                              </ul>
                            </div>
                          </div>

                          <button
                            onClick={() => setProductivityInsights(null)}
                            className="text-gray-400 hover:text-white text-sm flex items-center gap-1"
                          >
                            <X className="w-4 h-4" />
                            Chiudi
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Weekly Progress */}
                    <div className="bg-slate-800/50 backdrop-blur-sm border border-indigo-500/20 rounded-2xl p-6">
                      <h4 className="text-white font-bold mb-4 flex items-center gap-2">
                        <Flame className="w-5 h-5 text-orange-400" />
                        Progressi Settimanali
                      </h4>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400">Lunedì</span>
                          <div className="flex items-center gap-2">
                            <div className="w-32 bg-slate-700 rounded-full h-2">
                              <div className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full" style={{ width: '80%' }}></div>
                            </div>
                            <span className="text-white text-sm">4/5</span>
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400">Martedì</span>
                          <div className="flex items-center gap-2">
                            <div className="w-32 bg-slate-700 rounded-full h-2">
                              <div className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full" style={{ width: '60%' }}></div>
                            </div>
                            <span className="text-white text-sm">3/5</span>
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400">Mercoledì</span>
                          <div className="flex items-center gap-2">
                            <div className="w-32 bg-slate-700 rounded-full h-2">
                              <div className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full" style={{ width: '100%' }}></div>
                            </div>
                            <span className="text-white text-sm">5/5</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Stats Summary */}
                    <div className="bg-slate-800/50 backdrop-blur-sm border border-indigo-500/20 rounded-2xl p-6">
                      <h4 className="text-white font-bold mb-4 flex items-center gap-2">
                        <Award className="w-5 h-5 text-yellow-400" />
                        Statistiche Totali
                      </h4>
                      <div className="space-y-4">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Task Completati</span>
                          <span className="text-white font-bold">{stats.completati}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Task in Corso</span>
                          <span className="text-white font-bold">{stats.inCorso}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Tasso di Completamento</span>
                          <span className="text-green-400 font-bold">
                            {stats.totali > 0 ? Math.round((stats.completati / stats.totali) * 100) : 0}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Punteggio Totale</span>
                          <span className="text-purple-400 font-bold">{stats.score} pts</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Leaderboard View */}
              {activeView === 'leaderboard' && (
                <div>
                  <h3 className="text-2xl font-bold text-white mb-6">Classifica Aziendale</h3>
                  <div className="bg-slate-800/50 backdrop-blur-sm border border-indigo-500/20 rounded-2xl p-6">
                    <div className="space-y-3">
                      {leaderboard.map((entry, index) => {
                        const isCurrentUser = entry.id === user?.id;
                        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : null;

                        return (
                          <div
                            key={entry.id}
                            className={`p-4 rounded-xl border transition-all ${
                              isCurrentUser
                                ? 'bg-indigo-500/20 border-indigo-500/50'
                                : 'bg-slate-900/50 border-slate-700'
                            }`}
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 flex items-center justify-center">
                                {medal ? (
                                  <span className="text-3xl">{medal}</span>
                                ) : (
                                  <span className="text-gray-400 font-bold text-lg">#{index + 1}</span>
                                )}
                              </div>
                              <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                                {entry.nome.charAt(0)}{entry.cognome.charAt(0)}
                              </div>
                              <div className="flex-1">
                                <p className={`font-semibold ${isCurrentUser ? 'text-white' : 'text-gray-200'}`}>
                                  {entry.nome} {entry.cognome} {isCurrentUser && '(Tu)'}
                                </p>
                                <p className="text-gray-500 text-sm">{entry.email}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-purple-400 font-bold text-lg">{entry.score || 0} pts</p>
                                <p className="text-gray-500 text-sm">{entry.completedTasks || 0} task</p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      {leaderboard.length === 0 && (
                        <p className="text-gray-500 text-center py-8">Nessun dato disponibile</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Tickets View */}
              {activeView === 'tickets' && <TicketManagement />}

              {/* Calendar View */}
              {activeView === 'calendar' && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-2xl font-bold text-white">Calendario</h3>
                    <button
                      onClick={handleAIAnalyzeEmailCalendar}
                      disabled={aiAnalyzingEmailCalendar}
                      className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 disabled:from-gray-600 disabled:to-gray-600 text-white px-4 py-2 rounded-lg transition-all shadow-lg shadow-cyan-500/50 disabled:shadow-none"
                    >
                      {aiAnalyzingEmailCalendar ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Analisi in corso...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-5 h-5" />
                          Analizza con AI
                        </>
                      )}
                    </button>
                  </div>

                  {/* AI Calendar/Email Insights */}
                  {emailCalendarInsights && (
                    <div className="mb-6 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 rounded-2xl p-6">
                      <div className="flex items-start gap-3">
                        <Sparkles className="w-6 h-6 text-cyan-400 flex-shrink-0 mt-1" />
                        <div className="flex-1">
                          <h4 className="text-white font-bold text-lg mb-4">🗓️ Insights AI Calendario & Email</h4>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            {/* Meeting Extracted */}
                            {emailCalendarInsights.meeting_estratti && emailCalendarInsights.meeting_estratti.length > 0 && (
                              <div className="bg-slate-800/50 rounded-xl p-4 border border-cyan-500/20">
                                <h5 className="text-cyan-400 font-semibold text-sm mb-3 flex items-center gap-2">
                                  <Calendar className="w-4 h-4" />
                                  Meeting Estratti ({emailCalendarInsights.meeting_estratti.length})
                                </h5>
                                <div className="space-y-2">
                                  {emailCalendarInsights.meeting_estratti.slice(0, 3).map((meeting: any, i: number) => (
                                    <div key={i} className="text-sm">
                                      <p className="text-white font-semibold">{meeting.titolo}</p>
                                      <p className="text-gray-400 text-xs">
                                        {meeting.data} • {meeting.partecipanti?.join(', ')}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Deadlines Extracted */}
                            {emailCalendarInsights.scadenze && emailCalendarInsights.scadenze.length > 0 && (
                              <div className="bg-slate-800/50 rounded-xl p-4 border border-orange-500/20">
                                <h5 className="text-orange-400 font-semibold text-sm mb-3 flex items-center gap-2">
                                  <AlertCircle className="w-4 h-4" />
                                  Scadenze Imminenti ({emailCalendarInsights.scadenze.length})
                                </h5>
                                <div className="space-y-2">
                                  {emailCalendarInsights.scadenze.slice(0, 3).map((scadenza: any, i: number) => (
                                    <div key={i} className="text-sm">
                                      <p className="text-white font-semibold">{scadenza.descrizione}</p>
                                      <p className="text-gray-400 text-xs">{scadenza.data}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Smart Scheduling */}
                            {emailCalendarInsights.suggerimenti_scheduling && emailCalendarInsights.suggerimenti_scheduling.length > 0 && (
                              <div className="bg-slate-800/50 rounded-xl p-4 border border-green-500/20 md:col-span-2">
                                <h5 className="text-green-400 font-semibold text-sm mb-3 flex items-center gap-2">
                                  <Activity className="w-4 h-4" />
                                  Suggerimenti Smart Scheduling
                                </h5>
                                <ul className="text-gray-300 text-sm space-y-1">
                                  {emailCalendarInsights.suggerimenti_scheduling.map((sug: string, i: number) => (
                                    <li key={i}>• {sug}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>

                          <button
                            onClick={() => setEmailCalendarInsights(null)}
                            className="text-gray-400 hover:text-white text-sm flex items-center gap-1"
                          >
                            <X className="w-4 h-4" />
                            Chiudi
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Internal Calendar - Main Interface */}
                  <div className="mb-8">
                    <InternalCalendar />
                  </div>

                  {/* Calendar Integrations - External Services */}
                  <div className="mt-8 border-t border-indigo-500/20 pt-8">
                    <h4 className="text-xl font-bold text-white mb-6">Integrazioni Esterne</h4>
                    <div className="space-y-6">
                      <div>
                        <h5 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                          <span className="text-2xl">📅</span>
                          Google Calendar
                        </h5>
                        <GoogleCalendarConnect />
                      </div>

                      <div>
                        <h5 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                          <span className="text-2xl">📆</span>
                          Outlook Calendar
                        </h5>
                        <OutlookCalendarConnect />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Email View */}
              {activeView === 'email' && (
                <div>
                  <h3 className="text-2xl font-bold text-white mb-6">Email</h3>

                  {/* Email Integrations */}
                  <div className="mb-8 space-y-6">
                    <div>
                      <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <span className="text-2xl">📧</span>
                        Gmail
                      </h4>
                      <GmailConnect />
                    </div>

                    <div>
                      <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <span className="text-2xl">📨</span>
                        Outlook Email
                      </h4>
                      <OutlookEmailConnect />
                    </div>

                    <div>
                      <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <span className="text-2xl">⚙️</span>
                        IMAP / POP3
                      </h4>
                      <ImapPop3Config />
                    </div>
                  </div>

                  {/* Email List - Coming soon */}
                  <div className="bg-slate-800/50 backdrop-blur-sm border border-indigo-500/20 rounded-2xl p-12 text-center">
                    <Mail className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-white mb-2">Casella Email</h3>
                    <p className="text-gray-400">Le email sincronizzate appariranno qui</p>
                  </div>
                </div>
              )}

              {/* Video Call View */}
              {activeView === 'videocall' && <VideoCallPage />}

              {/* Notes View */}
              {activeView === 'notes' && (
                <NotesComplete
                  view={notesView}
                  onViewChange={setNotesView}
                  onCountsChange={setNotesCounts}
                />
              )}

              {/* Settings View */}
              {activeView === 'settings' && <Settings />}
            </>
          )}
        </div>
      </main>

      {/* Ticket Detail Modal */}
      {showTicketModal && selectedTicket && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-indigo-500/20 rounded-2xl p-8 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-2xl font-bold text-white">{selectedTicket.tipo}</h3>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    selectedTicket.stato === 'aperta' ? 'bg-yellow-500/20 text-yellow-400' :
                    selectedTicket.stato === 'in_lavorazione' ? 'bg-blue-500/20 text-blue-400' :
                    selectedTicket.stato === 'approvata' ? 'bg-green-500/20 text-green-400' :
                    'bg-red-500/20 text-red-400'
                  }`}>
                    {selectedTicket.stato}
                  </span>
                  {selectedTicket.chiuso && (
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-500/20 text-gray-400">
                      Chiuso
                    </span>
                  )}
                </div>
                <p className="text-gray-400 text-sm">
                  Creato il {new Date(selectedTicket.createdAt).toLocaleString('it-IT')}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowTicketModal(false);
                  setSelectedTicket(null);
                }}
                className="p-2 hover:bg-white/10 rounded-lg transition"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Ticket Info */}
            <div className="mb-6 p-4 bg-slate-900/50 rounded-xl border border-indigo-500/10">
              <h4 className="text-gray-400 text-sm font-semibold mb-2">Descrizione iniziale</h4>
              <p className="text-white mb-3">{selectedTicket.descrizione}</p>
              <div className="flex items-center gap-4 text-sm">
                <span className={`text-xs font-semibold ${
                  selectedTicket.urgenza === 'alta' || selectedTicket.urgenza === 'urgente' ? 'text-red-400' :
                  selectedTicket.urgenza === 'media' ? 'text-yellow-400' : 'text-green-400'
                }`}>
                  Urgenza: {selectedTicket.urgenza}
                </span>
                {selectedTicket.task && (
                  <span className="text-indigo-400 text-xs">Task: {selectedTicket.task.titolo}</span>
                )}
              </div>
            </div>

            {/* Conversazione */}
            <div className="mb-6">
              <h4 className="text-white font-bold mb-4 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-indigo-400" />
                Conversazione ({selectedTicket.risposte?.length || 0})
              </h4>
              <div className="space-y-3 mb-4">
                {selectedTicket.risposte && selectedTicket.risposte.length > 0 ? (
                  selectedTicket.risposte.map((risposta) => (
                    <div
                      key={risposta.id}
                      className={`p-4 rounded-xl ${
                        risposta.isAdmin
                          ? 'bg-indigo-500/10 border-l-4 border-indigo-500'
                          : 'bg-slate-900/50 border-l-4 border-green-500'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-xs">
                          {risposta.autore.nome.charAt(0)}{risposta.autore.cognome.charAt(0)}
                        </div>
                        <div>
                          <p className="text-white font-semibold text-sm">
                            {risposta.autore.nome} {risposta.autore.cognome}
                            {risposta.isAdmin && <span className="text-indigo-400 ml-2">(Admin)</span>}
                          </p>
                          <p className="text-gray-500 text-xs">
                            {new Date(risposta.createdAt).toLocaleString('it-IT')}
                          </p>
                        </div>
                      </div>
                      <p className="text-gray-300 text-sm whitespace-pre-wrap">{risposta.contenuto}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-8">Nessuna risposta ancora</p>
                )}
              </div>

              {/* Add Response */}
              {!selectedTicket.chiuso && (
                <div className="border-t border-indigo-500/20 pt-4">
                  <textarea
                    value={newTicketResponse}
                    onChange={(e) => setNewTicketResponse(e.target.value)}
                    placeholder="Scrivi una risposta..."
                    className="w-full bg-slate-900/50 border border-indigo-500/20 rounded-lg px-4 py-3 text-white resize-none focus:outline-none focus:border-indigo-500/50 transition"
                    rows={3}
                  />
                  <div className="flex justify-end mt-2">
                    <button
                      onClick={() => handleAddTicketResponse(selectedTicket.id)}
                      disabled={!newTicketResponse.trim()}
                      className="flex items-center gap-2 bg-indigo-500 hover:bg-indigo-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition"
                    >
                      <Send className="w-4 h-4" />
                      Invia Risposta
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="border-t border-indigo-500/20 pt-6">
              <div className="flex gap-3">
                {selectedTicket.chiuso ? (
                  <button
                    onClick={() => handleReopenTicket(selectedTicket.id)}
                    className="flex-1 bg-green-500/20 hover:bg-green-500/30 text-green-400 px-4 py-3 rounded-lg transition flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Riapri Ticket
                  </button>
                ) : (
                  <button
                    onClick={() => handleCloseTicket(selectedTicket.id)}
                    className="flex-1 bg-gray-500/20 hover:bg-gray-500/30 text-gray-400 px-4 py-3 rounded-lg transition flex items-center justify-center gap-2"
                  >
                    <X className="w-4 h-4" />
                    Chiudi Ticket
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Task Modal */}
      {showTaskModal && selectedTask && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-indigo-500/20 rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-6">
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-white mb-2">{selectedTask.titolo}</h3>
                <div className="flex items-center gap-2 mb-4">
                  {getStatusBadge(selectedTask.stato)}
                  {getPriorityBadge(selectedTask.priorita)}
                </div>
              </div>
              <button
                onClick={() => {
                  setShowTaskModal(false);
                  setSelectedTask(null);
                }}
                className="p-2 hover:bg-white/10 rounded-lg transition"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {selectedTask.descrizione && (
              <div className="mb-6">
                <h4 className="text-gray-400 text-sm font-semibold mb-2">Descrizione</h4>
                <p className="text-white">{selectedTask.descrizione}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <h4 className="text-gray-400 text-sm font-semibold mb-2">Difficoltà</h4>
                <p className="text-white">
                  {'⭐'.repeat(selectedTask.difficolta)} ({selectedTask.difficolta}/5)
                </p>
              </div>
              {selectedTask.scadenza && (
                <div>
                  <h4 className="text-gray-400 text-sm font-semibold mb-2">Scadenza</h4>
                  <p className="text-white">{new Date(selectedTask.scadenza).toLocaleDateString('it-IT')}</p>
                </div>
              )}
            </div>

            {selectedTask.owner && (
              <div className="mb-6">
                <h4 className="text-gray-400 text-sm font-semibold mb-2">Creato da</h4>
                <p className="text-white">{selectedTask.owner.nome} {selectedTask.owner.cognome}</p>
              </div>
            )}

            {/* Subtasks Section */}
            <div className="mb-6 border-t border-indigo-500/20 pt-6">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-gray-400 text-sm font-semibold flex items-center gap-2">
                  <ListChecks className="w-4 h-4" />
                  Subtask ({selectedTask.subtasks?.filter(st => st.completata).length || 0}/{selectedTask.subtasks?.length || 0})
                </h4>
                <button
                  onClick={() => setShowAddSubtask(!showAddSubtask)}
                  className="text-indigo-400 hover:text-indigo-300 text-sm flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  Aggiungi
                </button>
              </div>

              {showAddSubtask && (
                <div className="mb-3 flex gap-2">
                  <input
                    type="text"
                    value={newSubtask}
                    onChange={(e) => setNewSubtask(e.target.value)}
                    placeholder="Titolo subtask..."
                    className="flex-1 bg-slate-900/50 border border-indigo-500/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500/50"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleAddSubtask();
                      }
                    }}
                  />
                  <button
                    onClick={handleAddSubtask}
                    className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm transition"
                  >
                    Aggiungi
                  </button>
                </div>
              )}

              <div className="space-y-2">
                {selectedTask.subtasks && selectedTask.subtasks.length > 0 ? (
                  selectedTask.subtasks.map((subtask) => (
                    <div
                      key={subtask.id}
                      className="flex items-center gap-3 p-3 bg-slate-900/50 rounded-lg border border-slate-700 hover:border-indigo-500/50 transition"
                    >
                      <button
                        onClick={() => handleToggleSubtask(subtask.id)}
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition ${
                          subtask.completata
                            ? 'bg-green-500 border-green-500'
                            : 'border-gray-500 hover:border-indigo-400'
                        }`}
                      >
                        {subtask.completata && <CheckCircle2 className="w-4 h-4 text-white" />}
                      </button>
                      <span className={`flex-1 text-sm ${subtask.completata ? 'text-gray-500 line-through' : 'text-white'}`}>
                        {subtask.titolo}
                      </span>
                      <button
                        onClick={() => handleDeleteSubtask(subtask.id)}
                        className="text-red-400 hover:text-red-300 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-sm text-center py-4">Nessuna subtask</p>
                )}
              </div>
            </div>

            {/* Ticket Info */}
            <div className="mb-6 border-t border-indigo-500/20 pt-6">
              <div className="flex items-center gap-2 p-4 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
                <Ticket className="w-5 h-5 text-indigo-400" />
                <div>
                  <p className="text-white font-semibold text-sm">Vuoi aprire un ticket per questo task?</p>
                  <p className="text-gray-400 text-xs">Vai alla sezione <button onClick={() => setActiveView('tickets')} className="text-indigo-400 hover:text-indigo-300 font-semibold underline">Ticket</button> per aprire un nuovo ticket.</p>
                </div>
              </div>
            </div>

            <div className="border-t border-indigo-500/20 pt-6">
              <h4 className="text-gray-400 text-sm font-semibold mb-3">Cambia Stato</h4>
              <div className="flex gap-3">
                <button
                  onClick={() => handleUpdateTaskStatus(selectedTask.id, 'todo')}
                  className="flex-1 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 px-4 py-3 rounded-lg transition"
                >
                  Da Fare
                </button>
                <button
                  onClick={() => handleUpdateTaskStatus(selectedTask.id, 'in_corso')}
                  className="flex-1 bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 px-4 py-3 rounded-lg transition"
                >
                  In Corso
                </button>
                <button
                  onClick={() => handleUpdateTaskStatus(selectedTask.id, 'completato')}
                  className="flex-1 bg-green-500/20 hover:bg-green-500/30 text-green-400 px-4 py-3 rounded-lg transition"
                >
                  Completato
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Task Modal */}
      {showCreateTaskModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-indigo-500/20 rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-6">
              <h3 className="text-2xl font-bold text-white">Crea Nuovo Task</h3>
              <button
                onClick={() => setShowCreateTaskModal(false)}
                className="p-2 hover:bg-white/10 rounded-lg transition"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-6">
              <div>
                <label className="text-gray-400 text-sm font-semibold mb-2 block">Titolo *</label>
                <input
                  type="text"
                  required
                  value={newTask.titolo}
                  onChange={(e) => setNewTask({ ...newTask, titolo: e.target.value })}
                  className="w-full bg-slate-900/50 border border-indigo-500/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-indigo-500/50 transition"
                  placeholder="Es: Implementare nuova funzionalità"
                />
              </div>

              <div>
                <label className="text-gray-400 text-sm font-semibold mb-2 block">Descrizione</label>
                <textarea
                  value={newTask.descrizione}
                  onChange={(e) => setNewTask({ ...newTask, descrizione: e.target.value })}
                  className="w-full bg-slate-900/50 border border-indigo-500/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-indigo-500/50 transition resize-none"
                  placeholder="Descrivi il task in dettaglio..."
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-gray-400 text-sm font-semibold mb-2 block">Priorità</label>
                  <select
                    value={newTask.priorita}
                    onChange={(e) => setNewTask({ ...newTask, priorita: e.target.value })}
                    className="w-full bg-slate-900/50 border border-indigo-500/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-indigo-500/50 transition"
                  >
                    <option value="bassa">Bassa</option>
                    <option value="media">Media</option>
                    <option value="alta">Alta</option>
                  </select>
                </div>

                <div>
                  <label className="text-gray-400 text-sm font-semibold mb-2 block">Difficoltà</label>
                  <select
                    value={newTask.difficolta}
                    onChange={(e) => setNewTask({ ...newTask, difficolta: parseInt(e.target.value) })}
                    className="w-full bg-slate-900/50 border border-indigo-500/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-indigo-500/50 transition"
                  >
                    <option value="1">1 - Molto Facile</option>
                    <option value="2">2 - Facile</option>
                    <option value="3">3 - Media</option>
                    <option value="4">4 - Difficile</option>
                    <option value="5">5 - Molto Difficile</option>
                  </select>
                </div>
              </div>

              {/* AI Suggestions Button */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleAISuggestMetadata}
                  disabled={!newTask.titolo || aiSuggesting}
                  className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 hover:from-indigo-500/30 hover:to-purple-500/30 border border-indigo-500/30 text-indigo-300 px-4 py-3 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  title="L'AI analizzerà il titolo e la descrizione per suggerire priorità e difficoltà"
                >
                  {aiSuggesting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Sparkles className="w-5 h-5" />
                  )}
                  <span className="font-medium">
                    {aiSuggesting ? 'Analisi in corso...' : 'Suggerisci Priorità/Difficoltà con AI'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handleAIEstimateTime}
                  disabled={!newTask.titolo || aiEstimating}
                  className="flex items-center justify-center gap-2 bg-gradient-to-r from-purple-500/20 to-pink-500/20 hover:from-purple-500/30 hover:to-pink-500/30 border border-purple-500/30 text-purple-300 px-4 py-3 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Stima il tempo necessario per completare questo task"
                >
                  {aiEstimating ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <span className="text-lg">⏱️</span>
                  )}
                </button>
              </div>

              <div>
                <label className="text-gray-400 text-sm font-semibold mb-2 block">Scadenza</label>
                <input
                  type="datetime-local"
                  value={newTask.scadenza}
                  onChange={(e) => setNewTask({ ...newTask, scadenza: e.target.value })}
                  className="w-full bg-slate-900/50 border border-indigo-500/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-indigo-500/50 transition"
                />
              </div>

              {/* Subtasks Section */}
              <div className="border-t border-indigo-500/20 pt-6">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-gray-400 text-sm font-semibold flex items-center gap-2">
                    <ListChecks className="w-4 h-4" />
                    Subtask ({newTask.subtasks.length})
                  </label>
                  <button
                    type="button"
                    onClick={handleAIGenerateSubtasks}
                    disabled={!newTask.titolo || aiGeneratingSubtasks}
                    className="flex items-center gap-2 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 hover:from-indigo-500/30 hover:to-purple-500/30 border border-indigo-500/30 text-indigo-300 px-3 py-1.5 rounded-lg text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Genera subtask automaticamente con AI"
                  >
                    {aiGeneratingSubtasks ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Wand2 className="w-4 h-4" />
                    )}
                    <span>{aiGeneratingSubtasks ? 'Generazione...' : 'Genera con AI'}</span>
                  </button>
                </div>

                {/* Subtask Input */}
                <div className="mb-3 flex gap-2">
                  <input
                    type="text"
                    value={newTaskSubtaskInput}
                    onChange={(e) => setNewTaskSubtaskInput(e.target.value)}
                    placeholder="Aggiungi una subtask..."
                    className="flex-1 bg-slate-900/50 border border-indigo-500/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500/50"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (newTaskSubtaskInput.trim()) {
                          setNewTask({
                            ...newTask,
                            subtasks: [...newTask.subtasks, { titolo: newTaskSubtaskInput.trim() }]
                          });
                          setNewTaskSubtaskInput('');
                        }
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newTaskSubtaskInput.trim()) {
                        setNewTask({
                          ...newTask,
                          subtasks: [...newTask.subtasks, { titolo: newTaskSubtaskInput.trim() }]
                        });
                        setNewTaskSubtaskInput('');
                      }
                    }}
                    className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm transition"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                {/* Subtask List */}
                <div className="space-y-2">
                  {newTask.subtasks.length > 0 ? (
                    newTask.subtasks.map((subtask, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-3 p-3 bg-slate-900/50 rounded-lg border border-slate-700"
                      >
                        <span className="flex-1 text-sm text-white">{subtask.titolo}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setNewTask({
                              ...newTask,
                              subtasks: newTask.subtasks.filter((_, i) => i !== index)
                            });
                          }}
                          className="text-red-400 hover:text-red-300 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-sm text-center py-4">Nessuna subtask aggiunta</p>
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-indigo-500/20">
                <button
                  type="button"
                  onClick={() => setShowCreateTaskModal(false)}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-white px-4 py-3 rounded-lg transition"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white px-4 py-3 rounded-lg transition shadow-lg shadow-indigo-500/50"
                >
                  Crea Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AI Chatbot Widget - Fixed floating button */}
      {token && <ChatbotWidget token={token} />}

      {/* Tutorial Overlay */}
      <TutorialOverlay
        steps={employeeTutorialSteps}
        isOpen={showTutorial}
        onClose={() => setShowTutorial(false)}
        onComplete={() => setShowTutorial(false)}
        storageKey="employee-tutorial-completed"
      />
    </div>
  );
};

export default DashboardComplete;
