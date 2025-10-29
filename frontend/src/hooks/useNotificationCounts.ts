import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

interface NotificationCounts {
  tasks: number;
  chat: number;
  directMessages: number;
  tickets: number;
  rewards: number;
  calendar: number;
  email: number;
  requests: number;
  projects: number;
}

export const useNotificationCounts = () => {
  const [counts, setCounts] = useState<NotificationCounts>({
    tasks: 0,
    chat: 0,
    directMessages: 0,
    tickets: 0,
    rewards: 0,
    calendar: 0,
    email: 0,
    requests: 0,
    projects: 0,
  });

  const fetchCounts = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const userStr = localStorage.getItem('user');
      if (!userStr) return;

      const currentUserId = JSON.parse(userStr).id;
      if (!currentUserId) return;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Oggetto per accumulare tutti i conteggi
      const newCounts: Partial<NotificationCounts> = {
        tasks: 0,
        chat: 0,
        directMessages: 0,
        tickets: 0,
        rewards: 0,
        calendar: 0,
        email: 0,
        requests: 0,
        projects: 0,
      };

      // **NUOVO**: Fetch notifications vere dal database
      try {
        const notificationsResponse = await axios.get(`${API_URL}/api/notifications`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        const notifications = notificationsResponse.data.notifications || [];
        const unreadNotifications = notifications.filter((n: any) => !n.letta);

        // Conta notifiche per tipo
        newCounts.tasks = unreadNotifications.filter((n: any) =>
          ['task_assigned', 'task_completed', 'task_auto_completed', 'mention'].includes(n.tipo)
        ).length;

        newCounts.projects = unreadNotifications.filter((n: any) =>
          ['progetto_assegnato', 'progetto_completato', 'progetto_attivato'].includes(n.tipo)
        ).length;

        newCounts.calendar = unreadNotifications.filter((n: any) =>
          ['calendar_invite', 'calendar_reminder', 'calendar_cancelled'].includes(n.tipo)
        ).length;

        newCounts.email = unreadNotifications.filter((n: any) =>
          n.tipo === 'email_received'
        ).length;

        newCounts.rewards = unreadNotifications.filter((n: any) =>
          ['punti_guadagnati', 'reward_redeemed'].includes(n.tipo)
        ).length;

        newCounts.tickets = unreadNotifications.filter((n: any) =>
          ['ticket_assigned', 'ticket_reply', 'richiesta_aperta'].includes(n.tipo)
        ).length;

        newCounts.requests = unreadNotifications.filter((n: any) =>
          ['richiesta_aperta', 'richiesta_completata'].includes(n.tipo)
        ).length;

        newCounts.chat = unreadNotifications.filter((n: any) =>
          n.tipo === 'chat_message'
        ).length;

        newCounts.directMessages = unreadNotifications.filter((n: any) =>
          n.tipo === 'direct_message'
        ).length;
      } catch (error) {
        console.error('[useNotificationCounts] Error fetching notifications:', error);
      }

      // **OPZIONALE**: Mantieni il vecchio comportamento per chat/DM se non usi notifiche
      // Fetch chat unread messages (fallback se non ci sono notifiche)
      try {
        const tasksResponse = await axios.get(`${API_URL}/api/tasks/my-tasks`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Gestisci sia array che oggetto (con categorie oggi, settimana, tutte)
        let allTasks: any[] = [];
        if (Array.isArray(tasksResponse.data)) {
          allTasks = tasksResponse.data;
        } else if (tasksResponse.data && tasksResponse.data.tutte) {
          allTasks = tasksResponse.data.tutte;
        }

        const importantTasks = allTasks.filter((task: any) => {
          if (task.stato === 'completato') return false;

          // Task creati oggi
          const createdAt = new Date(task.createdAt);
          createdAt.setHours(0, 0, 0, 0);
          if (createdAt.getTime() === today.getTime()) return true;

          // Task in scadenza entro domani
          if (task.scadenza) {
            const scadenza = new Date(task.scadenza);
            scadenza.setHours(0, 0, 0, 0);
            if (scadenza.getTime() <= tomorrow.getTime()) return true;
          }

          return false;
        });

        newCounts.tasks = importantTasks.length;
      } catch (error) {
        console.error('Error fetching tasks:', error);
      }

      // Fetch chat unread messages
      try {
        const chatResponse = await axios.get(`${API_URL}/api/chat/messages`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        const messages = Array.isArray(chatResponse.data) ? chatResponse.data : [];
        const unreadChat = messages.filter((msg: any) => {
          try {
            const readBy = msg.readBy ? JSON.parse(msg.readBy) : [];
            return !readBy.includes(currentUserId) && msg.autoreId !== currentUserId;
          } catch (e) {
            // Se il parsing fallisce, considera il messaggio come non letto
            return msg.autoreId !== currentUserId;
          }
        });

        newCounts.chat = unreadChat.length;
      } catch (error) {
        console.error('Error fetching chat messages:', error);
      }

      // Fetch direct messages unread count
      try {
        const dmResponse = await axios.get(`${API_URL}/api/direct-messages/conversations`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        newCounts.directMessages = dmResponse.data.reduce(
          (sum: number, conv: any) => sum + conv.unreadCount,
          0
        );
      } catch (error) {
        console.error('Error fetching direct messages:', error);
      }

      // Fetch tickets count (aperti o in lavorazione)
      try {
        const ticketsResponse = await axios.get(`${API_URL}/api/tickets`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        const openTickets = ticketsResponse.data.filter((ticket: any) =>
          ticket.stato === 'aperto' || ticket.stato === 'in_lavorazione'
        );

        newCounts.tickets = openTickets.length;
      } catch (error) {
        console.error('Error fetching tickets:', error);
      }

      // Fetch rewards (premi approvati in attesa di ritiro)
      try {
        const rewardsResponse = await axios.get(`${API_URL}/api/rewards/redemptions/approved`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        const pendingRewards = rewardsResponse.data.filter(
          (r: any) => r.stato === 'approved'
        );

        newCounts.rewards = pendingRewards.length;
      } catch (error) {
        // Ignora errori rewards se non esistono
      }

      // Fetch calendar events (eventi di oggi)
      try {
        const calendarResponse = await axios.get(`${API_URL}/api/calendar/events`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        const todayEvents = calendarResponse.data.filter((event: any) => {
          const eventDate = new Date(event.dataInizio);
          eventDate.setHours(0, 0, 0, 0);
          return eventDate.getTime() === today.getTime();
        });

        newCounts.calendar = todayEvents.length;
      } catch (error) {
        // Ignora errori calendario
      }

      // Fetch projects (progetti attivi con task in scadenza)
      try {
        const projectsResponse = await axios.get(`${API_URL}/api/projects`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        const activeProjects = projectsResponse.data.filter((project: any) => {
          if (project.stato === 'completato' || project.stato === 'archiviato') return false;

          // Progetti con scadenza nelle prossime 7 giorni
          if (project.scadenza) {
            const scadenza = new Date(project.scadenza);
            const weekFromNow = new Date(today);
            weekFromNow.setDate(weekFromNow.getDate() + 7);
            return scadenza <= weekFromNow;
          }

          return false;
        });

        newCounts.projects = activeProjects.length;
      } catch (error) {
        // Ignora errori progetti
      }

      // Fetch requests count (solo per admin)
      try {
        const requestsResponse = await axios.get(`${API_URL}/api/requests`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        const pendingRequests = requestsResponse.data.filter((req: any) =>
          req.stato === 'aperta' || req.stato === 'in_lavorazione'
        );

        newCounts.requests = pendingRequests.length;
      } catch (error) {
        // Ignora errori richieste
      }

      // Aggiorna stato con tutti i conteggi in una volta sola
      setCounts(newCounts as NotificationCounts);

    } catch (error) {
      console.error('Error fetching notification counts:', error);
    }
  }, []);

  useEffect(() => {
    fetchCounts();

    // Refresh counts every 30 seconds
    const interval = setInterval(fetchCounts, 30000);

    return () => clearInterval(interval);
  }, [fetchCounts]);

  return { counts, refreshCounts: fetchCounts };
};
