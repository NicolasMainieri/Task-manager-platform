import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import GoogleCalendarConnect from "../components/GoogleCalendarConnect";
import GmailConnect from "../components/GmailConnect";
import OutlookCalendarConnect from "../components/OutlookCalendarConnect";
import OutlookEmailConnect from "../components/OutlookEmailConnect";
import ImapPop3Config from "../components/ImapPop3Config";
import VideoCallPage from "./VideoCallPage";
import InternalCalendar from "../components/InternalCalendar";
import Settings from "./Settings";
import AdminDashboardHome from "../components/AdminDashboardHome";
import TicketManagement from "../components/TicketManagement";
import UserManagement from "../components/UserManagement";
import AdminRewardsManagement from "../components/AdminRewardsManagement";
import ChatWithTabs from "../components/ChatWithTabs";
import Contacts from "../components/Contacts";
import ContactMentionInput from "../components/ContactMentionInput";
import NotificationBadge from "../components/NotificationBadge";
import { useNotificationCounts } from "../hooks/useNotificationCounts";
import ChatbotWidget from "../components/ChatbotWidget";
import TutorialOverlay from "../components/TutorialOverlay";
import { adminTutorialSteps } from "../data/adminTutorialSteps";
import ProjectsPage from "./ProjectsPage";
import Drive from "./Drive";
import CRMPage from "./CRMPage";
import TaskHistoryAdmin from "../components/TaskHistoryAdmin";
import RealProgressCharts from "../components/RealProgressCharts";
import {
  Copy, Check, LogOut, Users, CheckCircle, XCircle, LayoutDashboard, ListTodo,
  TrendingUp, Trophy, Brain, Menu, X, Target, Plus, Edit, Trash2, UserPlus,
  Calendar, Clock, Award, Mail, Phone, MapPin, Briefcase, Star, ArrowUp, ArrowDown,
  Bell, MessageSquare, Inbox, Ticket, Send, Video, Settings as SettingsIcon, Loader2,
  AlertCircle, TrendingDown, Zap, BarChart3, Activity, HelpCircle, Gift, FolderOpen, BookUser, HardDrive,
  Database
} from "lucide-react";

// Types
type PendingUser = {
  id: string;
  nome?: string;
  cognome?: string;
  email: string;
  createdAt: string;
};

type Employee = {
  id: string;
  nome: string;
  cognome: string;
  email: string;
  avatar?: string;
  taskCount?: number;
  completedTasks?: number;
  score?: number;
  role?: any;
  team?: any;
  companyId?: string;
  status?: string;
  createdAt?: string;
};

type Task = {
  id: string;
  titolo: string;
  descrizione?: string;
  stato: string;
  priorita: string;
  difficolta: number;
  scadenza?: string;
  assignees?: Employee[];
  owner?: Employee;
};

type Team = {
  id: string;
  nome: string;
  descrizione?: string;
  colore?: string;
  users?: Employee[];
};

type Notification = {
  id: string;
  tipo: string;
  titolo: string;
  messaggio: string;
  letta: boolean;
  link?: string;
  createdAt: string;
};

type TicketRisposta = {
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
};

type Request = {
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
};

type CalendarEvent = {
  id: string;
  titolo: string;
  descrizione?: string;
  tipo: string;
  dataInizio: string;
  dataFine: string;
  luogo?: string;
  linkMeeting?: string;
  organizer: {
    nome: string;
    cognome: string;
  };
};

type EmailType = {
  id: string;
  oggetto: string;
  corpo: string;
  mittente: string;
  destinatari: string;
  stato: string;
  importante: boolean;
  dataInvio: string;
};

const AdminPanelComplete: React.FC = () => {
  const { user, logout, token } = useAuth() as { user: any; logout: () => void; token: string | null };
  const navigate = useNavigate();

  // State
  const [activeView, setActiveView] = useState('dashboard');
  const { counts: notificationCounts } = useNotificationCounts();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [companyCode, setCompanyCode] = useState<string>("");
  const [companyName, setCompanyName] = useState<string>("");
  const [copied, setCopied] = useState<boolean>(false);
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);

  // New state for requests, calendar, email
  const [requests, setRequests] = useState<Request[]>([]);
  const [rewardRedemptions, setRewardRedemptions] = useState<any[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [emails, setEmails] = useState<EmailType[]>([]);

  // Modal states
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [newTask, setNewTask] = useState({
    titolo: '', descrizione: '', stato: 'todo', priorita: 'medium',
    difficolta: 3, scadenza: '', assignedTo: [] as string[], assignedTeam: '', contactIds: [] as string[]
  });
  const [newTeam, setNewTeam] = useState({
    nome: '', descrizione: '', colore: '#3B82F6'
  });
  const [newEmployee, setNewEmployee] = useState({
    email: '', password: '', nome: '', cognome: '', roleId: '', teamId: ''
  });
  const [roles, setRoles] = useState<any[]>([]);

  // New modal states for advanced features
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [showRequestResponseModal, setShowRequestResponseModal] = useState(false);
  const [requestResponse, setRequestResponse] = useState('');
  const [selectedEmail, setSelectedEmail] = useState<EmailType | null>(null);
  const [showEmailDetailModal, setShowEmailDetailModal] = useState(false);
  const [showComposeEmailModal, setShowComposeEmailModal] = useState(false);
  const [newEmail, setNewEmail] = useState({
    oggetto: '', corpo: '', destinatari: [] as string[], cc: [] as string[], importante: false
  });

  // Ticket states
  const [selectedTicket, setSelectedTicket] = useState<Request | null>(null);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [newTicketResponse, setNewTicketResponse] = useState('');

  // AI Analysis states
  const [aiAnalyzingCompany, setAiAnalyzingCompany] = useState(false);
  const [companyAnalysis, setCompanyAnalysis] = useState<any>(null);

  // Tutorial states
  const [showTutorial, setShowTutorial] = useState(false);

  // Load data
  useEffect(() => {
    if (user?.company?.code) {
      setCompanyCode(user.company.code);
      setCompanyName(user.company.nome || "La tua Azienda");
    } else if (user?.adminCompany?.code) {
      setCompanyCode(user.adminCompany.code);
      setCompanyName(user.adminCompany.nome || "La tua Azienda");
    }

    if (token) {
      fetchAllData();
    }

    // Check se è il primo accesso e mostra tutorial
    const tutorialCompleted = localStorage.getItem('admin-tutorial-completed');
    if (!tutorialCompleted) {
      // Aspetta 1 secondo per dare tempo al DOM di caricarsi
      setTimeout(() => setShowTutorial(true), 1000);
    }
  }, [token, user]);

  const fetchAllData = async () => {
    await Promise.all([
      fetchPendingRequests(),
      fetchEmployees(),
      fetchTasks(),
      fetchTeams(),
      fetchNotifications(),
      fetchRoles(),
      fetchRequests(),
      fetchRewardRedemptions(),
      fetchCalendarEvents(),
      fetchEmails()
    ]);
    setLoading(false);
  };

  const fetchRequests = async () => {
    try {
      const response = await fetch("http://localhost:4000/api/requests", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setRequests(data.requests || data);
      }
    } catch (error) {
      console.error("Error fetching requests:", error);
    }
  };

  const fetchRewardRedemptions = async () => {
    try {
      const response = await fetch("http://localhost:4000/api/rewards/redemptions/pending", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setRewardRedemptions(data);
      }
    } catch (error) {
      console.error("Error fetching reward redemptions:", error);
    }
  };

  const handleRewardRedemptionAction = async (redemptionId: string, stato: 'approved' | 'rejected', adminNote?: string) => {
    try {
      const response = await fetch(`http://localhost:4000/api/rewards/redemptions/${redemptionId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ stato, adminNote })
      });
      if (response.ok) {
        await fetchRewardRedemptions();
        alert(`Richiesta premio ${stato === 'approved' ? 'approvata' : 'rifiutata'} con successo!`);
      }
    } catch (error) {
      console.error('Error updating redemption:', error);
      alert('Errore nell\'aggiornamento della richiesta');
    }
  };

  const fetchCalendarEvents = async () => {
    try {
      const response = await fetch("http://localhost:4000/api/calendar/events", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setCalendarEvents(data);
      }
    } catch (error) {
      console.error("Error fetching calendar events:", error);
    }
  };

  const fetchEmails = async () => {
    try {
      const response = await fetch("http://localhost:4000/api/emails", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setEmails(data.emails || data);
      }
    } catch (error) {
      console.error("Error fetching emails:", error);
    }
  };

  const handleUpdateRequestStatus = async (requestId: string, stato: string, risposta?: string) => {
    try {
      const response = await fetch(`http://localhost:4000/api/requests/${requestId}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ stato, risposta })
      });
      if (response.ok) {
        fetchRequests();
        setShowRequestResponseModal(false);
        setSelectedRequest(null);
        setRequestResponse('');
      }
    } catch (error) {
      console.error('Error updating request:', error);
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
        await fetchRequests();
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
        await fetchRequests();
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
        await fetchRequests();
        if (selectedTicket?.id === ticketId) {
          const updatedTicket = await response.json();
          setSelectedTicket(updatedTicket);
        }
      }
    } catch (error) {
      console.error('Errore nella riapertura del ticket:', error);
    }
  };

  const fetchPendingRequests = async () => {
    try {
      const response = await fetch("http://localhost:4000/api/auth/pending-requests", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setPendingUsers(data);
      }
    } catch (error) {
      console.error("Error fetching pending requests:", error);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await fetch("http://localhost:4000/api/users", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        const myCompanyId = user?.company?.id || user?.adminCompany?.id;
        const companyEmployees = Array.isArray(data)
          ? data.filter((u: any) => u.companyId === myCompanyId && u.id !== user?.id)
          : [];
        setEmployees(companyEmployees);
      }
    } catch (error) {
      console.error("Error fetching employees:", error);
    }
  };

  const fetchTasks = async () => {
    try {
      const response = await fetch("http://localhost:4000/api/tasks", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setTasks(data.tasks || []);
      }
    } catch (error) {
      console.error("Error fetching tasks:", error);
    }
  };

  const fetchTeams = async () => {
    try {
      const response = await fetch("http://localhost:4000/api/teams", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setTeams(data || []);
      }
    } catch (error) {
      console.error("Error fetching teams:", error);
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

  const fetchRoles = async () => {
    try {
      const response = await fetch("http://localhost:4000/api/roles", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setRoles(data || []);
      }
    } catch (error) {
      console.error("Error fetching roles:", error);
    }
  };

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch("http://localhost:4000/api/users", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(newEmployee)
      });
      if (response.ok) {
        await fetchEmployees();
        setShowEmployeeModal(false);
        setNewEmployee({ email: '', password: '', nome: '', cognome: '', roleId: '', teamId: '' });
      } else {
        const error = await response.json();
        alert(error.error || "Errore nella creazione del dipendente");
      }
    } catch (error) {
      console.error("Error creating employee:", error);
      alert("Errore nella creazione del dipendente");
    }
  };

  const handleApprove = async (userId: string) => {
    try {
      const response = await fetch("http://localhost:4000/api/auth/update-user-status", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ userId, status: "approved" })
      });
      if (response.ok) {
        await fetchPendingRequests();
        await fetchEmployees();
      }
    } catch (error) {
      console.error("Error approving user:", error);
    }
  };

  const handleReject = async (userId: string) => {
    try {
      const response = await fetch("http://localhost:4000/api/auth/update-user-status", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ userId, status: "rejected" })
      });
      if (response.ok) {
        await fetchPendingRequests();
      }
    } catch (error) {
      console.error("Error rejecting user:", error);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch("http://localhost:4000/api/tasks", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(newTask)
      });
      if (response.ok) {
        await fetchTasks();
        setShowTaskModal(false);
        setNewTask({ titolo: '', descrizione: '', stato: 'todo', priorita: 'medium', difficolta: 3, scadenza: '', assignedTo: [], assignedTeam: '', contactIds: [] });
      }
    } catch (error) {
      console.error("Error creating task:", error);
    }
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch("http://localhost:4000/api/teams", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(newTeam)
      });
      if (response.ok) {
        await fetchTeams();
        setShowTeamModal(false);
        setNewTeam({ nome: '', descrizione: '', colore: '#3B82F6' });
      }
    } catch (error) {
      console.error("Error creating team:", error);
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(companyCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAIAnalyzeCompany = async () => {
    setAiAnalyzingCompany(true);
    try {
      const response = await fetch('http://localhost:4000/api/ai/admin/analyze-company', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const analysis = await response.json();
        setCompanyAnalysis(analysis);
      } else {
        const error = await response.json();
        alert(error.error || 'Errore nell\'analisi AI');
      }
    } catch (error) {
      console.error('Errore nell\'analisi AI aziendale:', error);
      alert('Errore nell\'analisi AI aziendale');
    } finally {
      setAiAnalyzingCompany(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const menuItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'employees', icon: Users, label: 'Tutti i Dipendenti' },
    { id: 'tasks', icon: ListTodo, label: 'Tasks' },
    { id: 'projects', icon: FolderOpen, label: 'Progetti' },
    { id: 'drive', icon: HardDrive, label: 'Drive' },
    { id: 'crm', icon: Database, label: 'CRM' },
    { id: 'requests', icon: MessageSquare, label: 'Richieste Dipendenti' },
    { id: 'chat', icon: Send, label: 'Chat' },
    { id: 'contacts', icon: BookUser, label: 'Contatti' },
    { id: 'tickets', icon: Ticket, label: 'Ticket' },
    { id: 'rewards', icon: Gift, label: 'Premi' },
    { id: 'videocall', icon: Video, label: 'Videochiamate' },
    { id: 'teams', icon: UserPlus, label: 'Team' },
    { id: 'calendar', icon: Calendar, label: 'Calendario' },
    { id: 'email', icon: Mail, label: 'Email' },
    { id: 'progress', icon: TrendingUp, label: 'Progressi' },
    { id: 'leaderboard', icon: Trophy, label: 'Classifica' },
    { id: 'ai-analysis', icon: Brain, label: 'Analisi AI' },
    { id: 'settings', icon: SettingsIcon, label: 'Impostazioni' },
  ];

  // Calculate stats
  const completedTasks = tasks.filter(t => t.stato === 'completato').length;
  const inProgressTasks = tasks.filter(t => t.stato === 'in_corso').length;
  const totalScore = employees.reduce((sum, emp) => sum + (emp.score || 0), 0);

  // Leaderboard data
  const leaderboard = [...employees]
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .slice(0, 10);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 flex">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-slate-900/90 backdrop-blur-xl border-r border-indigo-500/20 transition-all duration-300 flex flex-col`}>
        <div className="p-4 border-b border-indigo-500/20 flex items-center justify-between">
          {sidebarOpen && (
            <div>
              <h2 className="text-white font-bold text-lg">Admin Panel</h2>
              <p className="text-gray-400 text-xs">{companyName}</p>
            </div>
          )}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-white/10 rounded-lg transition">
            {sidebarOpen ? <X className="w-5 h-5 text-gray-400" /> : <Menu className="w-5 h-5 text-gray-400" />}
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2" data-tutorial="sidebar-menu">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id)}
                data-tutorial={`menu-${item.id}`}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  isActive ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg' : 'text-gray-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <div className="relative">
                  <Icon className="w-5 h-5" />
                  {!sidebarOpen && (
                    <>
                      {item.id === 'tasks' && <NotificationBadge count={notificationCounts.tasks} />}
                      {item.id === 'projects' && <NotificationBadge count={notificationCounts.projects} />}
                      {item.id === 'chat' && <NotificationBadge count={notificationCounts.chat + notificationCounts.directMessages} />}
                      {item.id === 'tickets' && <NotificationBadge count={notificationCounts.tickets} />}
                      {item.id === 'rewards' && <NotificationBadge count={notificationCounts.rewards} />}
                      {item.id === 'calendar' && <NotificationBadge count={notificationCounts.calendar} />}
                      {item.id === 'email' && <NotificationBadge count={notificationCounts.email} />}
                      {item.id === 'requests' && <NotificationBadge count={notificationCounts.requests} />}
                    </>
                  )}
                </div>
                {sidebarOpen && (
                  <>
                    <span className="font-medium flex-1 text-left">{item.label}</span>
                    {item.id === 'tasks' && notificationCounts.tasks > 0 && (
                      <span className="text-xs bg-red-500 text-white font-bold px-2 py-0.5 rounded-full">
                        {notificationCounts.tasks}
                      </span>
                    )}
                    {item.id === 'projects' && notificationCounts.projects > 0 && (
                      <span className="text-xs bg-orange-500 text-white font-bold px-2 py-0.5 rounded-full">
                        {notificationCounts.projects}
                      </span>
                    )}
                    {item.id === 'chat' && (notificationCounts.chat + notificationCounts.directMessages) > 0 && (
                      <span className="text-xs bg-red-500 text-white font-bold px-2 py-0.5 rounded-full">
                        {notificationCounts.chat + notificationCounts.directMessages}
                      </span>
                    )}
                    {item.id === 'tickets' && notificationCounts.tickets > 0 && (
                      <span className="text-xs bg-red-500 text-white font-bold px-2 py-0.5 rounded-full">
                        {notificationCounts.tickets}
                      </span>
                    )}
                    {item.id === 'rewards' && notificationCounts.rewards > 0 && (
                      <span className="text-xs bg-red-500 text-white font-bold px-2 py-0.5 rounded-full">
                        {notificationCounts.rewards}
                      </span>
                    )}
                    {item.id === 'calendar' && notificationCounts.calendar > 0 && (
                      <span className="text-xs bg-blue-500 text-white font-bold px-2 py-0.5 rounded-full">
                        {notificationCounts.calendar}
                      </span>
                    )}
                    {item.id === 'email' && notificationCounts.email > 0 && (
                      <span className="text-xs bg-red-500 text-white font-bold px-2 py-0.5 rounded-full">
                        {notificationCounts.email}
                      </span>
                    )}
                    {item.id === 'requests' && notificationCounts.requests > 0 && (
                      <span className="text-xs bg-orange-500 text-white font-bold px-2 py-0.5 rounded-full">
                        {notificationCounts.requests}
                      </span>
                    )}
                  </>
                )}
              </button>
            );
          })}
        </nav>

        {sidebarOpen && companyCode && (
          <div className="p-4 border-t border-indigo-500/20">
            <div className="bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 rounded-xl p-3" data-tutorial="company-code">
              <p className="text-gray-400 text-xs mb-1">Codice Azienda</p>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white tracking-wider">{companyCode}</span>
                <button onClick={copyCode} className="p-1 bg-white/10 hover:bg-white/20 rounded transition">
                  {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3 text-gray-400" />}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="p-4 border-t border-indigo-500/20 space-y-2">
          <button
            onClick={() => {
              localStorage.removeItem('admin-tutorial-completed');
              setShowTutorial(true);
            }}
            className="w-full flex items-center gap-3 px-4 py-3 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 rounded-xl transition"
          >
            <HelpCircle className="w-5 h-5" />
            {sidebarOpen && <span className="font-medium">Tutorial</span>}
          </button>
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 rounded-xl transition">
            <LogOut className="w-5 h-5" />
            {sidebarOpen && <span className="font-medium">Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-8">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* Dashboard View */}
              {activeView === 'dashboard' && (
                <div data-tutorial="admin-dashboard">
                  <AdminDashboardHome />
                </div>
              )}

              {/* Pending Users Section */}
              {activeView === 'dashboard' && pendingUsers.length > 0 && (
                <div className="bg-slate-800/50 backdrop-blur-sm border border-orange-500/20 rounded-2xl p-6 mb-8 mt-8">
                  <div className="flex items-center gap-3 mb-6">
                    <Users className="w-6 h-6 text-orange-400" />
                    <h2 className="text-xl font-bold text-white">Richieste in Attesa ({pendingUsers.length})</h2>
                  </div>
                  <div className="space-y-3">
                    {pendingUsers.map((u) => (
                      <div key={u.id} className="flex items-center justify-between bg-slate-900/50 p-4 rounded-xl border border-slate-700">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold">
                            {u.nome?.charAt(0)}{u.cognome?.charAt(0)}
                          </div>
                          <div>
                            <p className="text-white font-semibold">{u.nome} {u.cognome}</p>
                            <p className="text-gray-400 text-sm">{u.email}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => handleApprove(u.id)} className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition">
                            <CheckCircle className="w-4 h-4" />
                            Approva
                          </button>
                          <button onClick={() => handleReject(u.id)} className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition">
                            <XCircle className="w-4 h-4" />
                            Rifiuta
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Employees View */}
              {activeView === 'employees' && <UserManagement />}

              {/* Tasks View */}
              {activeView === 'tasks' && (
                <div>
                  <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold text-white">Gestione Tasks</h1>
                    <button
                      onClick={() => setShowTaskModal(true)}
                      className="flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-6 py-3 rounded-xl hover:shadow-lg transition"
                    >
                      <Plus className="w-5 h-5" />
                      Nuovo Task
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {tasks.map((task) => (
                      <div key={task.id} className="bg-slate-800/50 backdrop-blur-sm border border-indigo-500/20 rounded-2xl p-6">
                        <h3 className="text-white font-bold mb-2">{task.titolo}</h3>
                        <p className="text-gray-400 text-sm mb-4">{task.descrizione}</p>
                        <div className="flex items-center gap-2 mb-3">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            task.stato === 'completato' ? 'bg-green-500/20 text-green-400' :
                            task.stato === 'in_corso' ? 'bg-orange-500/20 text-orange-400' :
                            'bg-yellow-500/20 text-yellow-400'
                          }`}>
                            {task.stato === 'completato' ? 'Completato' : task.stato === 'in_corso' ? 'In Corso' : 'Da Fare'}
                          </span>
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            task.priorita === 'alta' ? 'bg-red-500/20 text-red-400' :
                            task.priorita === 'media' ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-green-500/20 text-green-400'
                          }`}>
                            {task.priorita === 'alta' ? 'Alta' : task.priorita === 'media' ? 'Media' : 'Bassa'}
                          </span>
                        </div>

                        {/* Assegnatari */}
                        {task.assignees && task.assignees.length > 0 && (
                          <div className="border-t border-indigo-500/10 pt-3">
                            <p className="text-gray-400 text-xs mb-2">Assegnato a:</p>
                            <div className="flex items-center gap-2">
                              {task.assignees.slice(0, 3).map((assignee) => (
                                <div
                                  key={assignee.id}
                                  className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white text-xs font-bold"
                                  title={`${assignee.nome} ${assignee.cognome}`}
                                >
                                  {assignee.nome.charAt(0)}{assignee.cognome.charAt(0)}
                                </div>
                              ))}
                              {task.assignees.length > 3 && (
                                <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                                  +{task.assignees.length - 3}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Teams View */}
              {activeView === 'teams' && (
                <div>
                  <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold text-white">Gestione Team</h1>
                    <button
                      onClick={() => setShowTeamModal(true)}
                      className="flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-6 py-3 rounded-xl hover:shadow-lg transition"
                    >
                      <Plus className="w-5 h-5" />
                      Nuovo Team
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {teams.map((team) => (
                      <div key={team.id} className="bg-slate-800/50 backdrop-blur-sm border border-indigo-500/20 rounded-2xl p-6">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: team.colore }}>
                            <Users className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <h3 className="text-white font-bold">{team.nome}</h3>
                            <p className="text-gray-400 text-sm">{team.descrizione}</p>
                          </div>
                        </div>
                        <p className="text-gray-400 text-sm">Membri: {team.users?.length || 0}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Leaderboard View */}
              {activeView === 'leaderboard' && (
                <div>
                  <h1 className="text-3xl font-bold text-white mb-8">Classifica Aziendale</h1>
                  <div className="bg-slate-800/50 backdrop-blur-sm border border-indigo-500/20 rounded-2xl p-6">
                    <div className="space-y-4">
                      {leaderboard.map((emp, index) => (
                        <div key={emp.id} className="flex items-center justify-between p-4 bg-slate-900/50 rounded-xl border border-slate-700">
                          <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${
                              index === 0 ? 'bg-yellow-500 text-white' :
                              index === 1 ? 'bg-gray-400 text-white' :
                              index === 2 ? 'bg-amber-700 text-white' :
                              'bg-slate-700 text-gray-300'
                            }`}>
                              {index + 1}
                            </div>
                            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                              {emp.nome.charAt(0)}{emp.cognome.charAt(0)}
                            </div>
                            <div>
                              <p className="text-white font-semibold">{emp.nome} {emp.cognome}</p>
                              <p className="text-gray-400 text-sm">{emp.email}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-purple-400">{emp.score || 0}</p>
                            <p className="text-gray-400 text-sm">punti</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Progress View */}
              {activeView === 'progress' && (
                <div className="space-y-8">
                  {/* Header con pulsante Azzera Score */}
                  <div className="flex justify-between items-center">
                    <h1 className="text-3xl font-bold text-white">Progressi</h1>
                    <button
                      onClick={async () => {
                        if (!confirm('Sei sicuro di voler azzerare tutti i punteggi? Questa azione è irreversibile!')) return;
                        try {
                          const response = await fetch(`${import.meta.env.VITE_API_URL}/api/analytics/reset-all-scores`, {
                            method: 'POST',
                            headers: {
                              'Authorization': `Bearer ${localStorage.getItem('token')}`,
                              'Content-Type': 'application/json'
                            }
                          });
                          const data = await response.json();
                          if (response.ok) {
                            alert(data.message);
                            window.location.reload();
                          } else {
                            alert('Errore: ' + data.error);
                          }
                        } catch (err) {
                          alert('Errore nella richiesta');
                        }
                      }}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Azzera Score di Tutti
                    </button>
                  </div>

                  {/* Grafici Performance */}
                  <RealProgressCharts />

                  {/* Divider */}
                  <div className="border-t border-slate-700"></div>

                  {/* Cronologia Task */}
                  <TaskHistoryAdmin />
                </div>
              )}

              {/* Requests View */}
              {activeView === 'requests' && (
                <div>
                  <h1 className="text-3xl font-bold text-white mb-8">Richieste Dipendenti</h1>

                  {/* Richieste Premi Section */}
                  {rewardRedemptions.length > 0 && (
                    <div className="mb-8">
                      <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                        <Gift className="w-5 h-5 text-amber-400" />
                        Richieste Premi ({rewardRedemptions.length})
                      </h2>
                      <div className="space-y-4">
                        {rewardRedemptions.map((redemption: any) => (
                          <div key={redemption.id} className="bg-slate-800/50 backdrop-blur-sm border border-amber-500/20 rounded-2xl p-6">
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-500 rounded-full flex items-center justify-center text-white font-bold">
                                  <Gift className="w-6 h-6" />
                                </div>
                                <div>
                                  <h3 className="text-white font-bold">{redemption.reward.nome}</h3>
                                  <p className="text-gray-400 text-sm">{redemption.user.nome} {redemption.user.cognome}</p>
                                  <p className="text-gray-500 text-xs">{redemption.user.email}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-amber-400 font-bold text-lg mb-1">
                                  {redemption.reward.costoScore} pts
                                </div>
                                <div className="text-gray-400 text-xs">
                                  {new Date(redemption.createdAt).toLocaleDateString('it-IT')}
                                </div>
                              </div>
                            </div>
                            {redemption.reward.descrizione && (
                              <p className="text-gray-300 text-sm mb-4">{redemption.reward.descrizione}</p>
                            )}
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => handleRewardRedemptionAction(redemption.id, 'approved')}
                                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition text-sm font-semibold"
                              >
                                <CheckCircle className="w-4 h-4" />
                                Approva
                              </button>
                              <button
                                onClick={() => handleRewardRedemptionAction(redemption.id, 'rejected', 'Richiesta rifiutata dall\'amministratore')}
                                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition text-sm font-semibold"
                              >
                                <XCircle className="w-4 h-4" />
                                Rifiuta
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Richieste Standard Section */}
                  <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-indigo-400" />
                    Richieste Generali ({requests.length})
                  </h2>
                  <div className="space-y-4">
                    {requests.length > 0 ? (
                      requests.map((request) => (
                        <div key={request.id} className="bg-slate-800/50 backdrop-blur-sm border border-indigo-500/20 rounded-2xl p-6">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                                {request.autore.nome.charAt(0)}{request.autore.cognome.charAt(0)}
                              </div>
                              <div>
                                <h3 className="text-white font-bold">{request.tipo}</h3>
                                <p className="text-gray-400 text-sm">{request.autore.nome} {request.autore.cognome}</p>
                              </div>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              request.stato === 'aperta' ? 'bg-yellow-500/20 text-yellow-400' :
                              request.stato === 'approvata' ? 'bg-green-500/20 text-green-400' :
                              'bg-red-500/20 text-red-400'
                            }`}>
                              {request.stato}
                            </span>
                          </div>
                          <p className="text-gray-300 mb-4">{request.descrizione}</p>
                          {request.task && (
                            <p className="text-indigo-400 text-sm mb-4">Task: {request.task.titolo}</p>
                          )}
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500 text-sm">
                              Urgenza: <span className={`font-semibold ${
                                request.urgenza === 'alta' || request.urgenza === 'urgente' ? 'text-red-400' :
                                request.urgenza === 'media' ? 'text-yellow-400' : 'text-green-400'
                              }`}>{request.urgenza}</span>
                            </span>
                            {request.stato === 'aperta' && (
                              <button
                                onClick={() => {
                                  setSelectedRequest(request);
                                  setShowRequestResponseModal(true);
                                }}
                                className="flex items-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-lg transition text-sm"
                              >
                                <MessageSquare className="w-4 h-4" />
                                Rispondi
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="bg-slate-800/50 backdrop-blur-sm border border-indigo-500/20 rounded-2xl p-12 text-center">
                        <MessageSquare className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-white mb-2">Nessuna richiesta</h3>
                        <p className="text-gray-400">Le richieste dei dipendenti appariranno qui</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Calendar View */}
              {activeView === 'calendar' && (
                <div>
                  <h3 className="text-2xl font-bold text-white mb-6">Calendario</h3>

                  {/* Internal Calendar - Main Interface */}
                  <div className="mb-8">
                    <InternalCalendar />
                  </div>

                  {/* Calendar Integrations - External Services */}
                  <div className="mt-8 border-t border-indigo-500/20 pt-8">
                    <h4 className="text-2xl font-bold text-white mb-8 text-center">Sincronizza anche con</h4>

                    {/* Logo Row - Clickable */}
                    <div className="flex items-center justify-center gap-6">
                      <button
                        onClick={() => {/* Trigger Google Calendar sync */}}
                        className="flex flex-col items-center gap-3 bg-white rounded-2xl p-6 shadow-lg hover:shadow-2xl hover:scale-105 transition-all cursor-pointer group"
                        title="Sincronizza Google Calendar"
                      >
                        <svg viewBox="0 0 24 24" className="w-16 h-16">
                          <path fill="#1A73E8" d="M5.243 4.5h13.514c.395 0 .743.322.743.717v13.566a.73.73 0 0 1-.743.717H5.243a.73.73 0 0 1-.743-.717V5.217c0-.395.348-.717.743-.717z"/>
                          <path fill="#FFF" d="M19.5 7.5v-2c0-.55-.45-1-1-1h-2v2h2v2h1zM7.5 17.5h-2v-2h-2v2c0 .55.45 1 1 1h2v-1zM5.5 6.5h2v-2h-2c-.55 0-1 .45-1 1v2h1v-1z"/>
                          <path fill="#EA4335" d="M7.5 4.5h2v2h-2z"/>
                          <path fill="#FBBC04" d="M4.5 6.5h2v2h-2z"/>
                          <path fill="#34A853" d="M4.5 17.5h2v2h-2z"/>
                          <path fill="#188038" d="M7.5 17.5h2v2h-2z"/>
                          <path fill="#1967D2" d="M7.5 4.5h2v2h-2z"/>
                          <path fill="#4285F4" d="M17.5 4.5h2v2h-2z"/>
                          <path fill="#4285F4" d="M17.5 6.5h2v2h-2z"/>
                          <rect fill="#4285F4" x="8" y="8" width="8" height="8" rx="1"/>
                          <path fill="#FFF" d="M12 9.5v3.793l2.854 1.646-.5.867L11 13.5V9.5h1z"/>
                        </svg>
                        <span className="text-base font-semibold text-gray-800 group-hover:text-indigo-600 transition">Google Calendar</span>
                      </button>

                      <button
                        onClick={() => {/* Trigger Outlook Calendar sync */}}
                        className="flex flex-col items-center gap-3 bg-white rounded-2xl p-6 shadow-lg hover:shadow-2xl hover:scale-105 transition-all cursor-pointer group"
                        title="Sincronizza Outlook Calendar"
                      >
                        <svg viewBox="0 0 24 24" className="w-16 h-16">
                          <path fill="#0078D4" d="M24 7.875v8.25A2.626 2.626 0 0 1 21.375 18.75h-7.312L14.25 12l-.187-6.75h7.312A2.626 2.626 0 0 1 24 7.875z"/>
                          <path fill="#0364B8" d="M21.375 5.25h-7.312L14.25 12l-.187 6.75h7.312c.72 0 1.339-.288 1.8-.75L24 7.875a2.627 2.627 0 0 0-2.625-2.625z"/>
                          <path fill="#0078D4" d="M14.063 5.25L8.25 1.5H3.375A2.626 2.626 0 0 0 .75 4.125v15.75A2.626 2.626 0 0 0 3.375 22.5H8.25l5.813-3.75V12z"/>
                          <path fill="#28A8EA" d="M14.063 5.25H8.25v13.5h5.813V12z"/>
                          <path fill="#0078D4" d="M8.25 1.5v4.5H3.375c-.72 0-1.339.288-1.8.75L.75 4.125A2.626 2.626 0 0 1 3.375 1.5z"/>
                          <path fill="#0364B8" d="M8.25 18.75v3.75H3.375a2.626 2.626 0 0 1-2.625-2.625V17.25l.825-1.5c.461.462 1.08.75 1.8.75z"/>
                          <path fill="#50D9FF" d="M8.25 5.25v13.5H3.375A2.626 2.626 0 0 1 .75 16.125V7.875A2.626 2.626 0 0 1 3.375 5.25z"/>
                          <path fill="#FFF" d="M5.625 10.5h4.5v1.5h-4.5zm0 3h4.5V15h-4.5z"/>
                        </svg>
                        <span className="text-base font-semibold text-gray-800 group-hover:text-indigo-600 transition">Outlook Calendar</span>
                      </button>

                      <button
                        onClick={() => {/* Trigger Apple Calendar sync */}}
                        className="flex flex-col items-center gap-3 bg-white rounded-2xl p-6 shadow-lg hover:shadow-2xl hover:scale-105 transition-all cursor-pointer group"
                        title="Sincronizza Apple Calendar"
                      >
                        <svg viewBox="0 0 24 24" className="w-16 h-16">
                          <defs>
                            <linearGradient id="apple-cal-grad-admin" x1="0%" y1="0%" x2="0%" y2="100%">
                              <stop offset="0%" style={{ stopColor: '#FF3B30', stopOpacity: 1 }} />
                              <stop offset="100%" style={{ stopColor: '#FF453A', stopOpacity: 1 }} />
                            </linearGradient>
                          </defs>
                          <rect x="3" y="4" width="18" height="18" rx="3" fill="url(#apple-cal-grad-admin)"/>
                          <rect x="3" y="4" width="18" height="6" fill="#FF2D20"/>
                          <text x="12" y="18" fontFamily="Arial, sans-serif" fontSize="11" fontWeight="bold" fill="white" textAnchor="middle">{new Date().getDate()}</text>
                        </svg>
                        <span className="text-base font-semibold text-gray-800 group-hover:text-indigo-600 transition">Apple Calendar</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Email View */}
              {activeView === 'email' && (
                <div>
                  <div className="mb-12">
                    <h3 className="text-2xl font-bold text-white mb-8 text-center">Sincronizza anche con</h3>
                    <div className="flex items-center justify-center gap-6 mb-12">
                      {/* Gmail */}
                      <button
                        onClick={() => {/* Trigger Gmail sync */}}
                        className="flex flex-col items-center gap-3 bg-white rounded-2xl p-6 shadow-lg hover:shadow-2xl hover:scale-105 transition-all cursor-pointer group"
                      >
                        <svg viewBox="0 0 24 24" className="w-16 h-16">
                          <path fill="#EA4335" d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z"/>
                          <path fill="#FBBC05" d="M7.364 12.182L1.636 8.91V5.457c0-2.023 2.309-3.178 3.927-1.964L7.364 4.64"/>
                          <path fill="#34A853" d="M16.636 12.182L22.364 8.91V5.457c0-2.023-2.309-3.178-3.927-1.964L16.636 4.64"/>
                          <path fill="#C5221F" d="M7.364 12.182V21.09h9.272V12.182L12 16.64z"/>
                        </svg>
                        <span className="text-base font-semibold text-gray-800 group-hover:text-indigo-600 transition">Gmail</span>
                      </button>

                      {/* Outlook */}
                      <button
                        onClick={() => {/* Trigger Outlook sync */}}
                        className="flex flex-col items-center gap-3 bg-white rounded-2xl p-6 shadow-lg hover:shadow-2xl hover:scale-105 transition-all cursor-pointer group"
                      >
                        <svg viewBox="0 0 24 24" className="w-16 h-16">
                          <path fill="#0078D4" d="M24 7.875v8.25A2.626 2.626 0 0 1 21.375 18.75h-7.312L14.25 12l-.187-6.75h7.312A2.626 2.626 0 0 1 24 7.875z"/>
                          <path fill="#0364B8" d="M21.375 5.25h-7.312L14.25 12l-.187 6.75h7.312c.72 0 1.339-.288 1.8-.75L24 7.875a2.627 2.627 0 0 0-2.625-2.625z"/>
                          <path fill="#0078D4" d="M14.063 5.25L8.25 1.5H3.375A2.626 2.626 0 0 0 .75 4.125v15.75A2.626 2.626 0 0 0 3.375 22.5H8.25l5.813-3.75V12z"/>
                          <path fill="#28A8EA" d="M14.063 5.25H8.25v13.5h5.813V12z"/>
                          <path fill="#0078D4" d="M8.25 1.5v4.5H3.375c-.72 0-1.339.288-1.8.75L.75 4.125A2.626 2.626 0 0 1 3.375 1.5z"/>
                          <path fill="#0364B8" d="M8.25 18.75v3.75H3.375a2.626 2.626 0 0 1-2.625-2.625V17.25l.825-1.5c.461.462 1.08.75 1.8.75z"/>
                          <path fill="#14447D" d="M8.25 5.25v13.5H3.375A2.626 2.626 0 0 1 .75 16.125V7.875A2.626 2.626 0 0 1 3.375 5.25z"/>
                          <path fill="#0078D4" opacity=".5" d="M13.875 5.25h-5.437v13.5h5.437c.419 0 .806-.104 1.156-.281V5.531a2.567 2.567 0 0 0-1.156-.281z"/>
                          <path fill="#0078D4" opacity=".1" d="M13.313 6.375H8.25v11.25h5.063c.419 0 .806-.104 1.156-.281V6.656a2.567 2.567 0 0 0-1.156-.281z"/>
                          <path fill="#0078D4" opacity=".2" d="M13.313 6.375H8.25v10.125h5.063c.419 0 .806-.104 1.156-.281V6.656a2.567 2.567 0 0 0-1.156-.281z"/>
                          <path fill="#0078D4" opacity=".2" d="M12.75 6.375H8.25v10.125H12.75c.419 0 .806-.104 1.156-.281V6.656a2.567 2.567 0 0 0-1.156-.281z"/>
                          <path fill="#0078D4" opacity=".3" d="M12.75 6.375H8.25V16.5H12.75c.419 0 .806-.104 1.156-.281V6.656a2.567 2.567 0 0 0-1.156-.281z"/>
                          <radialGradient id="outlook-admin-email-grad" cx="5.332" cy="12.132" r="10.114" gradientUnits="userSpaceOnUse">
                            <stop offset="0" stopColor="#1784d8"/>
                            <stop offset="1" stopColor="#0864c5"/>
                          </radialGradient>
                          <path fill="url(#outlook-admin-email-grad)" d="M3.469 7.688A3.844 3.844 0 0 1 7.313 3.844a3.844 3.844 0 0 1 3.843 3.844 3.844 3.844 0 0 1-3.843 3.843 3.844 3.844 0 0 1-3.844-3.843zm1.406 0a2.438 2.438 0 0 0 4.875 0 2.438 2.438 0 0 0-4.875 0z" transform="translate(.656 4.313)"/>
                        </svg>
                        <span className="text-base font-semibold text-gray-800 group-hover:text-indigo-600 transition">Outlook</span>
                      </button>

                      {/* POP/IMAP - smaller */}
                      <button
                        onClick={() => {/* Trigger POP/IMAP sync */}}
                        className="flex flex-col items-center gap-3 bg-gray-700 rounded-2xl p-5 shadow-lg hover:shadow-2xl hover:scale-105 transition-all cursor-pointer group"
                      >
                        <svg viewBox="0 0 24 24" className="w-14 h-14" fill="none" stroke="white" strokeWidth="2">
                          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                          <polyline points="22,6 12,13 2,6"/>
                        </svg>
                        <span className="text-sm font-semibold text-white group-hover:text-gray-200 transition">POP/IMAP</span>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {emails.length > 0 ? (
                      emails.map((email) => (
                        <div key={email.id} className="bg-slate-800/50 backdrop-blur-sm border border-indigo-500/20 rounded-2xl p-6 hover:border-indigo-500/40 cursor-pointer transition">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              {email.importante && <Star className="w-5 h-5 text-yellow-400" />}
                              <div>
                                <h3 className="text-white font-bold">{email.oggetto}</h3>
                                <p className="text-gray-400 text-sm">Da: {email.mittente}</p>
                              </div>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              email.stato === 'letta' ? 'bg-green-500/20 text-green-400' :
                              email.stato === 'inviata' ? 'bg-blue-500/20 text-blue-400' :
                              'bg-gray-500/20 text-gray-400'
                            }`}>
                              {email.stato}
                            </span>
                          </div>
                          <p className="text-gray-300 text-sm mb-3 line-clamp-2">{email.corpo}</p>
                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <span>A: {email.destinatari}</span>
                            <span>{new Date(email.dataInvio).toLocaleString('it-IT')}</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="bg-slate-800/50 backdrop-blur-sm border border-indigo-500/20 rounded-2xl p-12 text-center">
                        <Mail className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-white mb-2">Nessuna email</h3>
                        <p className="text-gray-400">Le email interne appariranno qui</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Video Call View */}
              {activeView === 'videocall' && <VideoCallPage />}

              {/* Settings View */}
              {activeView === 'settings' && <Settings />}

              {/* AI Analysis View */}
              {activeView === 'ai-analysis' && (
                <div>
                  <div className="flex items-center justify-between mb-8">
                    <h1 className="text-3xl font-bold text-white">Analisi AI Aziendale</h1>
                    <button
                      onClick={handleAIAnalyzeCompany}
                      disabled={aiAnalyzingCompany}
                      className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-6 py-3 rounded-xl hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {aiAnalyzingCompany ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Analisi in corso...
                        </>
                      ) : (
                        <>
                          <Brain className="w-5 h-5" />
                          Analizza Performance Aziendale
                        </>
                      )}
                    </button>
                  </div>

                  {!companyAnalysis && !aiAnalyzingCompany && (
                    <div className="bg-slate-800/50 backdrop-blur-sm border border-cyan-500/20 rounded-2xl p-12 text-center">
                      <Brain className="w-16 h-16 text-cyan-400 mx-auto mb-4" />
                      <h3 className="text-xl font-bold text-white mb-2">Analisi Performance Aziendale con AI</h3>
                      <p className="text-gray-400 mb-4">Ottieni insights dettagliati su performance, dipendenti, distribuzione del lavoro e raccomandazioni strategiche</p>
                      <p className="text-gray-500 text-sm">Clicca il pulsante in alto per iniziare l'analisi</p>
                    </div>
                  )}

                  {companyAnalysis && (
                    <div className="space-y-6">
                      {/* Health Score & Overview */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 rounded-2xl p-6">
                          <div className="flex items-center gap-3 mb-4">
                            <Activity className="w-6 h-6 text-cyan-400" />
                            <h3 className="text-xl font-bold text-white">Health Score</h3>
                          </div>
                          <div className="text-center">
                            <div className="text-5xl font-bold text-cyan-400 mb-2">
                              {companyAnalysis.health_score}/100
                            </div>
                            <p className="text-gray-300">{companyAnalysis.valutazione_generale}</p>
                          </div>
                        </div>

                        <div className="bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border border-blue-500/30 rounded-2xl p-6">
                          <div className="flex items-center gap-3 mb-4">
                            <BarChart3 className="w-6 h-6 text-blue-400" />
                            <h3 className="text-xl font-bold text-white">Metriche Chiave</h3>
                          </div>
                          {companyAnalysis.metriche_chiave && (
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <span className="text-gray-400">Efficienza Operativa</span>
                                <span className="text-white font-semibold">{companyAnalysis.metriche_chiave.efficienza_operativa}%</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-gray-400">Collaborazione</span>
                                <span className="text-white font-semibold">{companyAnalysis.metriche_chiave.collaborazione_team}/10</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-gray-400">Rispetto Scadenze</span>
                                <span className="text-white font-semibold">{companyAnalysis.metriche_chiave.rispetto_scadenze}%</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Strengths & Areas of Improvement */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-slate-800/50 backdrop-blur-sm border border-green-500/20 rounded-2xl p-6">
                          <div className="flex items-center gap-3 mb-4">
                            <TrendingUp className="w-6 h-6 text-green-400" />
                            <h3 className="text-xl font-bold text-white">Punti di Forza</h3>
                          </div>
                          <ul className="space-y-2">
                            {companyAnalysis.punti_forza_aziendali?.map((strength: string, idx: number) => (
                              <li key={idx} className="flex items-start gap-2 text-gray-300">
                                <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                                <span>{strength}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="bg-slate-800/50 backdrop-blur-sm border border-orange-500/20 rounded-2xl p-6">
                          <div className="flex items-center gap-3 mb-4">
                            <AlertCircle className="w-6 h-6 text-orange-400" />
                            <h3 className="text-xl font-bold text-white">Aree di Miglioramento</h3>
                          </div>
                          <ul className="space-y-2">
                            {companyAnalysis.aree_miglioramento_aziendali?.map((area: string, idx: number) => (
                              <li key={idx} className="flex items-start gap-2 text-gray-300">
                                <AlertCircle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
                                <span>{area}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {/* Top Performers */}
                      {companyAnalysis.top_performers && companyAnalysis.top_performers.length > 0 && (
                        <div className="bg-slate-800/50 backdrop-blur-sm border border-yellow-500/20 rounded-2xl p-6">
                          <div className="flex items-center gap-3 mb-4">
                            <Trophy className="w-6 h-6 text-yellow-400" />
                            <h3 className="text-xl font-bold text-white">Top Performers</h3>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {companyAnalysis.top_performers.map((performer: any, idx: number) => (
                              <div key={idx} className="bg-slate-900/50 border border-yellow-500/20 rounded-xl p-4">
                                <div className="flex items-center gap-3 mb-3">
                                  <div className="w-10 h-10 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-full flex items-center justify-center text-white font-bold">
                                    {performer.nome?.charAt(0)}{performer.cognome?.charAt(0)}
                                  </div>
                                  <div>
                                    <p className="text-white font-semibold">{performer.nome} {performer.cognome}</p>
                                    <p className="text-gray-400 text-xs">{performer.ruolo}</p>
                                  </div>
                                </div>
                                <p className="text-gray-300 text-sm">{performer.motivo}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* At-Risk Employees */}
                      {companyAnalysis.dipendenti_a_rischio && companyAnalysis.dipendenti_a_rischio.length > 0 && (
                        <div className="bg-slate-800/50 backdrop-blur-sm border border-red-500/20 rounded-2xl p-6">
                          <div className="flex items-center gap-3 mb-4">
                            <TrendingDown className="w-6 h-6 text-red-400" />
                            <h3 className="text-xl font-bold text-white">Dipendenti a Rischio</h3>
                          </div>
                          <div className="space-y-4">
                            {companyAnalysis.dipendenti_a_rischio.map((employee: any, idx: number) => (
                              <div key={idx} className="bg-slate-900/50 border border-red-500/20 rounded-xl p-4">
                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-orange-500 rounded-full flex items-center justify-center text-white font-bold">
                                      {employee.nome?.charAt(0)}{employee.cognome?.charAt(0)}
                                    </div>
                                    <div>
                                      <p className="text-white font-semibold">{employee.nome} {employee.cognome}</p>
                                      <p className="text-gray-400 text-xs">{employee.ruolo}</p>
                                    </div>
                                  </div>
                                  <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded-full font-semibold">
                                    {employee.livello_rischio}
                                  </span>
                                </div>
                                <p className="text-gray-300 text-sm mb-2">{employee.motivo}</p>
                                <p className="text-cyan-400 text-sm flex items-start gap-2">
                                  <Zap className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                  <span><strong>Azione:</strong> {employee.azione_suggerita}</span>
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Workload Distribution */}
                      {companyAnalysis.distribuzione_workload && (
                        <div className="bg-slate-800/50 backdrop-blur-sm border border-indigo-500/20 rounded-2xl p-6">
                          <div className="flex items-center gap-3 mb-4">
                            <Users className="w-6 h-6 text-indigo-400" />
                            <h3 className="text-xl font-bold text-white">Distribuzione Workload</h3>
                          </div>
                          <div className="space-y-3">
                            <p className="text-gray-300">
                              <strong className="text-white">Stato:</strong> {companyAnalysis.distribuzione_workload.stato}
                            </p>
                            <p className="text-gray-300">{companyAnalysis.distribuzione_workload.descrizione}</p>
                          </div>
                        </div>
                      )}

                      {/* Strategic Recommendations */}
                      {companyAnalysis.raccomandazioni_strategiche && companyAnalysis.raccomandazioni_strategiche.length > 0 && (
                        <div className="bg-slate-800/50 backdrop-blur-sm border border-purple-500/20 rounded-2xl p-6">
                          <div className="flex items-center gap-3 mb-4">
                            <Brain className="w-6 h-6 text-purple-400" />
                            <h3 className="text-xl font-bold text-white">Raccomandazioni Strategiche</h3>
                          </div>
                          <ul className="space-y-3">
                            {companyAnalysis.raccomandazioni_strategiche.map((recommendation: string, idx: number) => (
                              <li key={idx} className="flex items-start gap-3 bg-slate-900/50 p-4 rounded-lg">
                                <div className="w-6 h-6 bg-purple-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                  <span className="text-purple-400 font-bold text-sm">{idx + 1}</span>
                                </div>
                                <span className="text-gray-300">{recommendation}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Immediate Actions */}
                      {companyAnalysis.azioni_immediate && companyAnalysis.azioni_immediate.length > 0 && (
                        <div className="bg-gradient-to-br from-red-500/10 to-orange-500/10 border border-red-500/30 rounded-2xl p-6">
                          <div className="flex items-center gap-3 mb-4">
                            <Zap className="w-6 h-6 text-red-400" />
                            <h3 className="text-xl font-bold text-white">Azioni Immediate Richieste</h3>
                          </div>
                          <ul className="space-y-2">
                            {companyAnalysis.azioni_immediate.map((action: string, idx: number) => (
                              <li key={idx} className="flex items-start gap-2 text-gray-300">
                                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                                <span>{action}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Projects View */}
              {activeView === 'projects' && (
                <div className="-mx-8 -my-8">
                  <ProjectsPage />
                </div>
              )}

              {/* Drive View */}
              {activeView === 'drive' && (
                <div className="-mx-8 -my-8">
                  <Drive />
                </div>
              )}

              {/* CRM View */}
              {activeView === 'crm' && (
                <div className="-mx-8 -my-8">
                  <CRMPage />
                </div>
              )}

              {/* Tickets View */}
              {activeView === 'tickets' && <TicketManagement />}

              {/* Chat View (includes Company Chat and Direct Messages) */}
              {activeView === 'chat' && (
                <div className="h-[calc(100vh-12rem)]">
                  <ChatWithTabs />
                </div>
              )}

              {/* Contacts View */}
              {activeView === 'contacts' && (
                <div className="h-[calc(100vh-12rem)]">
                  <Contacts />
                </div>
              )}

              {/* Rewards Management */}
              {activeView === 'rewards' && <AdminRewardsManagement />}
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
                <p className="text-gray-400 text-sm mb-2">
                  Autore: {selectedTicket.autore.nome} {selectedTicket.autore.cognome}
                </p>
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
                          ? 'bg-indigo-600/10 border-l-4 border-indigo-500'
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

      {/* Employee Detail Modal */}
      {selectedEmployee && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setSelectedEmployee(null)}>
          <div className="bg-slate-800 border border-indigo-500/20 rounded-2xl p-8 max-w-2xl w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-2xl">
                  {selectedEmployee.nome.charAt(0)}{selectedEmployee.cognome.charAt(0)}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">{selectedEmployee.nome} {selectedEmployee.cognome}</h2>
                  <p className="text-gray-400">{selectedEmployee.role?.nome || 'Dipendente'}</p>
                </div>
              </div>
              <button onClick={() => setSelectedEmployee(null)} className="text-gray-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-6 mb-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-indigo-400" />
                  <div>
                    <p className="text-gray-400 text-sm">Email</p>
                    <p className="text-white">{selectedEmployee.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Briefcase className="w-5 h-5 text-indigo-400" />
                  <div>
                    <p className="text-gray-400 text-sm">Team</p>
                    <p className="text-white">{selectedEmployee.team?.nome || 'Nessun team'}</p>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Trophy className="w-5 h-5 text-indigo-400" />
                  <div>
                    <p className="text-gray-400 text-sm">Punteggio</p>
                    <p className="text-white font-bold text-xl">{selectedEmployee.score || 0} pts</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-indigo-400" />
                  <div>
                    <p className="text-gray-400 text-sm">Task Completati</p>
                    <p className="text-white">{selectedEmployee.completedTasks || 0} / {selectedEmployee.taskCount || 0}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-900/50 rounded-xl p-4">
              <h3 className="text-white font-semibold mb-3">Statistiche</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Tasso Completamento</span>
                  <span className="text-green-400 font-semibold">
                    {selectedEmployee.taskCount ? Math.round((selectedEmployee.completedTasks || 0) / selectedEmployee.taskCount * 100) : 0}%
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Data Registrazione</span>
                  <span className="text-white">{selectedEmployee.createdAt ? new Date(selectedEmployee.createdAt).toLocaleDateString('it-IT') : 'N/D'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Stato</span>
                  <span className="text-green-400">{selectedEmployee.status === 'approved' ? 'Attivo' : 'In Attesa'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Task Creation Modal */}
      {showTaskModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowTaskModal(false)}>
          <div className="bg-slate-800 border border-indigo-500/20 rounded-2xl p-8 max-w-2xl w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-bold text-white mb-6">Crea Nuovo Task</h2>
            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-gray-400 text-sm mb-2">Titolo</label>
                <input
                  type="text"
                  value={newTask.titolo}
                  onChange={(e) => setNewTask({ ...newTask, titolo: e.target.value })}
                  className="w-full bg-slate-900 border border-indigo-500/30 rounded-lg px-4 py-3 text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-2">Descrizione</label>
                <textarea
                  value={newTask.descrizione}
                  onChange={(e) => setNewTask({ ...newTask, descrizione: e.target.value })}
                  className="w-full bg-slate-900 border border-indigo-500/30 rounded-lg px-4 py-3 text-white"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Priorità</label>
                  <select
                    value={newTask.priorita}
                    onChange={(e) => setNewTask({ ...newTask, priorita: e.target.value })}
                    className="w-full bg-slate-900 border border-indigo-500/30 rounded-lg px-4 py-3 text-white"
                  >
                    <option value="bassa">Bassa</option>
                    <option value="media">Media</option>
                    <option value="alta">Alta</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Difficoltà</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={newTask.difficolta}
                    onChange={(e) => setNewTask({ ...newTask, difficolta: parseInt(e.target.value) })}
                    className="w-full bg-slate-900 border border-indigo-500/30 rounded-lg px-4 py-3 text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-2">Scadenza</label>
                <input
                  type="date"
                  value={newTask.scadenza}
                  onChange={(e) => setNewTask({ ...newTask, scadenza: e.target.value })}
                  className="w-full bg-slate-900 border border-indigo-500/30 rounded-lg px-4 py-3 text-white"
                />
              </div>

              {/* Assegnazione Dipendenti o Team */}
              <div className="border-t border-indigo-500/20 pt-4">
                <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-400" />
                  Assegna Task
                </h3>

                {/* Sezione Dipendenti */}
                <div className="mb-4">
                  <label className="block text-gray-400 text-sm mb-2">Dipendenti</label>
                  <div className="bg-slate-900 border border-indigo-500/30 rounded-lg p-3 max-h-48 overflow-y-auto">
                    {employees.length > 0 ? (
                      <div className="space-y-2">
                        {employees.map((emp) => (
                          <label key={emp.id} className="flex items-center gap-3 p-2 hover:bg-slate-800 rounded cursor-pointer">
                            <input
                              type="checkbox"
                              checked={newTask.assignedTo.includes(emp.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setNewTask({ ...newTask, assignedTo: [...newTask.assignedTo, emp.id] });
                                } else {
                                  setNewTask({ ...newTask, assignedTo: newTask.assignedTo.filter(id => id !== emp.id) });
                                }
                              }}
                              className="w-4 h-4 text-indigo-500 bg-slate-800 border-indigo-500/30 rounded"
                            />
                            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                              {emp.nome.charAt(0)}{emp.cognome.charAt(0)}
                            </div>
                            <div className="flex-1">
                              <p className="text-white text-sm">{emp.nome} {emp.cognome}</p>
                              <p className="text-gray-500 text-xs">{emp.email}</p>
                            </div>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-sm">Nessun dipendente disponibile</p>
                    )}
                  </div>
                  {newTask.assignedTo.length > 0 && (
                    <p className="text-indigo-400 text-xs mt-2">
                      {newTask.assignedTo.length} dipendent{newTask.assignedTo.length === 1 ? 'e' : 'i'} selezionat{newTask.assignedTo.length === 1 ? 'o' : 'i'}
                    </p>
                  )}
                </div>

                {/* Sezione Team */}
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Oppure assegna a un Team</label>
                  <select
                    value={newTask.assignedTeam}
                    onChange={(e) => setNewTask({ ...newTask, assignedTeam: e.target.value })}
                    className="w-full bg-slate-900 border border-indigo-500/30 rounded-lg px-4 py-3 text-white"
                  >
                    <option value="">Nessun team</option>
                    {teams.map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.nome} ({team.users?.length || 0} membri)
                      </option>
                    ))}
                  </select>
                  {newTask.assignedTeam && (
                    <p className="text-indigo-400 text-xs mt-2">
                      Il task sarà assegnato a tutti i membri del team selezionato
                    </p>
                  )}
                </div>
              </div>

              {/* Contatti */}
              <div className="border-t border-indigo-500/20 pt-4">
                <ContactMentionInput
                  selectedContacts={newTask.contactIds}
                  onChange={(contactIds) => setNewTask({ ...newTask, contactIds })}
                  label="Contatti associati"
                  placeholder="Cerca contatti da associare al task..."
                />
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-6 py-3 rounded-lg hover:shadow-lg transition"
                >
                  Crea Task
                </button>
                <button
                  type="button"
                  onClick={() => setShowTaskModal(false)}
                  className="px-6 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition"
                >
                  Annulla
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Employee Creation Modal */}
      {showEmployeeModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowEmployeeModal(false)}>
          <div className="bg-slate-800 border border-indigo-500/20 rounded-2xl p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-bold text-white mb-6">Crea Nuovo Dipendente</h2>
            <form onSubmit={handleCreateEmployee} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Nome *</label>
                  <input
                    type="text"
                    value={newEmployee.nome}
                    onChange={(e) => setNewEmployee({ ...newEmployee, nome: e.target.value })}
                    className="w-full bg-slate-900 border border-indigo-500/30 rounded-lg px-4 py-3 text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Cognome *</label>
                  <input
                    type="text"
                    value={newEmployee.cognome}
                    onChange={(e) => setNewEmployee({ ...newEmployee, cognome: e.target.value })}
                    className="w-full bg-slate-900 border border-indigo-500/30 rounded-lg px-4 py-3 text-white"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-2">Email *</label>
                <input
                  type="email"
                  value={newEmployee.email}
                  onChange={(e) => setNewEmployee({ ...newEmployee, email: e.target.value })}
                  className="w-full bg-slate-900 border border-indigo-500/30 rounded-lg px-4 py-3 text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-2">Password (opzionale)</label>
                <input
                  type="password"
                  value={newEmployee.password}
                  onChange={(e) => setNewEmployee({ ...newEmployee, password: e.target.value })}
                  className="w-full bg-slate-900 border border-indigo-500/30 rounded-lg px-4 py-3 text-white"
                  placeholder="Lascia vuoto per password temporanea"
                />
                <p className="text-gray-500 text-xs mt-1">Se lasciato vuoto, verrà generata la password: TempPassword123!</p>
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-2">Ruolo (opzionale)</label>
                <select
                  value={newEmployee.roleId}
                  onChange={(e) => setNewEmployee({ ...newEmployee, roleId: e.target.value })}
                  className="w-full bg-slate-900 border border-indigo-500/30 rounded-lg px-4 py-3 text-white"
                >
                  <option value="">Seleziona ruolo</option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.nome}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-2">Team (opzionale)</label>
                <select
                  value={newEmployee.teamId}
                  onChange={(e) => setNewEmployee({ ...newEmployee, teamId: e.target.value })}
                  className="w-full bg-slate-900 border border-indigo-500/30 rounded-lg px-4 py-3 text-white"
                >
                  <option value="">Nessun team</option>
                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.nome}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-6 py-3 rounded-lg hover:shadow-lg transition"
                >
                  Crea Dipendente
                </button>
                <button
                  type="button"
                  onClick={() => setShowEmployeeModal(false)}
                  className="px-6 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition"
                >
                  Annulla
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Team Creation Modal */}
      {showTeamModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowTeamModal(false)}>
          <div className="bg-slate-800 border border-indigo-500/20 rounded-2xl p-8 max-w-2xl w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-bold text-white mb-6">Crea Nuovo Team</h2>
            <form onSubmit={handleCreateTeam} className="space-y-4">
              <div>
                <label className="block text-gray-400 text-sm mb-2">Nome Team</label>
                <input
                  type="text"
                  value={newTeam.nome}
                  onChange={(e) => setNewTeam({ ...newTeam, nome: e.target.value })}
                  className="w-full bg-slate-900 border border-indigo-500/30 rounded-lg px-4 py-3 text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-2">Descrizione</label>
                <textarea
                  value={newTeam.descrizione}
                  onChange={(e) => setNewTeam({ ...newTeam, descrizione: e.target.value })}
                  className="w-full bg-slate-900 border border-indigo-500/30 rounded-lg px-4 py-3 text-white"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-2">Colore</label>
                <input
                  type="color"
                  value={newTeam.colore}
                  onChange={(e) => setNewTeam({ ...newTeam, colore: e.target.value })}
                  className="w-full h-12 bg-slate-900 border border-indigo-500/30 rounded-lg px-2"
                />
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-6 py-3 rounded-lg hover:shadow-lg transition"
                >
                  Crea Team
                </button>
                <button
                  type="button"
                  onClick={() => setShowTeamModal(false)}
                  className="px-6 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition"
                >
                  Annulla
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Request Response Modal */}
      {showRequestResponseModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => {
          setShowRequestResponseModal(false);
          setSelectedRequest(null);
          setRequestResponse('');
        }}>
          <div className="bg-slate-800 border border-indigo-500/20 rounded-2xl p-8 max-w-2xl w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Rispondi alla Richiesta</h2>
              <button
                onClick={() => {
                  setShowRequestResponseModal(false);
                  setSelectedRequest(null);
                  setRequestResponse('');
                }}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Original Request Details */}
            <div className="bg-slate-900/50 border border-indigo-500/10 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                  {selectedRequest.autore.nome.charAt(0)}{selectedRequest.autore.cognome.charAt(0)}
                </div>
                <div>
                  <p className="text-white font-semibold">{selectedRequest.autore.nome} {selectedRequest.autore.cognome}</p>
                  <p className="text-gray-400 text-sm">{selectedRequest.autore.email}</p>
                </div>
              </div>
              <div className="border-t border-indigo-500/10 pt-3">
                <p className="text-gray-400 text-sm mb-1">Tipo: <span className="text-white font-semibold">{selectedRequest.tipo}</span></p>
                <p className="text-gray-400 text-sm mb-1">
                  Urgenza: <span className={`font-semibold ${
                    selectedRequest.urgenza === 'alta' || selectedRequest.urgenza === 'urgente' ? 'text-red-400' :
                    selectedRequest.urgenza === 'media' ? 'text-yellow-400' : 'text-green-400'
                  }`}>{selectedRequest.urgenza}</span>
                </p>
                {selectedRequest.task && (
                  <p className="text-gray-400 text-sm mb-1">Task: <span className="text-indigo-400">{selectedRequest.task.titolo}</span></p>
                )}
                <p className="text-gray-400 text-sm mt-3 mb-1">Descrizione:</p>
                <p className="text-white bg-slate-950/50 rounded p-3">{selectedRequest.descrizione}</p>
              </div>
            </div>

            {/* Response Textarea */}
            <div className="mb-6">
              <label className="block text-gray-400 text-sm mb-2">La tua risposta</label>
              <textarea
                value={requestResponse}
                onChange={(e) => setRequestResponse(e.target.value)}
                placeholder="Scrivi qui la tua risposta o motivazione..."
                className="w-full bg-slate-900 border border-indigo-500/30 rounded-lg px-4 py-3 text-white resize-none focus:border-indigo-500/50 focus:outline-none"
                rows={4}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => handleUpdateRequestStatus(selectedRequest.id, 'approvata', requestResponse)}
                disabled={!requestResponse.trim()}
                className="flex-1 flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg transition"
              >
                <CheckCircle className="w-5 h-5" />
                Approva e Rispondi
              </button>
              <button
                onClick={() => handleUpdateRequestStatus(selectedRequest.id, 'rifiutata', requestResponse)}
                disabled={!requestResponse.trim()}
                className="flex-1 flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg transition"
              >
                <XCircle className="w-5 h-5" />
                Rifiuta con Motivazione
              </button>
            </div>
            <p className="text-gray-500 text-xs text-center mt-3">La tua risposta sarà aggiunta alla richiesta e l'autore riceverà una notifica</p>
          </div>
        </div>
      )}

      {/* AI Chatbot Widget - Fixed floating button */}
      {token && <ChatbotWidget token={token} />}

      {/* Tutorial Overlay */}
      <TutorialOverlay
        steps={adminTutorialSteps}
        isOpen={showTutorial}
        onClose={() => setShowTutorial(false)}
        onComplete={() => setShowTutorial(false)}
        storageKey="admin-tutorial-completed"
      />
    </div>
  );
};

export default AdminPanelComplete;
