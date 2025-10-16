import type { TutorialStep } from '../components/TutorialOverlay';

export const employeeTutorialSteps: TutorialStep[] = [
  {
    title: 'Benvenuto in Planora! 👋',
    description: 'Benvenuto nella piattaforma di gestione task della tua azienda! Questo breve tutorial ti mostrerà come utilizzare Planora per organizzare il tuo lavoro e collaborare con il team.',
    position: 'center'
  },
  {
    title: 'La Tua Dashboard',
    description: 'Questa è la tua dashboard personale. Qui trovi una panoramica dei tuoi task, statistiche di produttività, prossime scadenze e tutto ciò che ti serve per organizzare la tua giornata lavorativa.',
    target: '[data-tutorial="employee-dashboard"]',
    position: 'center'
  },
  {
    title: 'I Miei Task 📋',
    description: 'In questa sezione trovi tutti i task assegnati a te. Puoi filtrarli per stato (da fare, in corso, completati), priorità e scadenza. Clicca su un task per visualizzare i dettagli e aggiornarne lo stato.',
    target: '[data-tutorial="my-tasks"]',
    position: 'bottom'
  },
  {
    title: 'Timer di Lavoro ⏱️',
    description: 'Usa il timer integrato per tracciare il tempo speso su ogni task. Avvia il timer quando inizi a lavorare e fermalo quando finisci. Questo aiuta te e il team a comprendere meglio i tempi di lavoro.',
    target: '[data-tutorial="task-timer"]',
    position: 'bottom'
  },
  {
    title: 'Subtask e Checklist ✓',
    description: 'Ogni task può essere suddiviso in subtask più piccoli. Usa l\'AI per generare automaticamente subtask intelligenti! Completa i subtask uno alla volta per progredire verso il completamento del task principale.',
    target: '[data-tutorial="subtasks"]',
    position: 'bottom'
  },
  {
    title: 'AI Assistant per Task 🤖',
    description: 'L\'AI ti aiuta a lavorare meglio! Può suggerirti la priorità ottimale, generare subtask automaticamente, stimare i tempi di completamento e analizzare tutti i tuoi task per darti consigli personalizzati.',
    target: '[data-tutorial="ai-task-help"]',
    position: 'bottom'
  },
  {
    title: 'Task di Oggi 📅',
    description: 'Visualizza rapidamente i task da completare oggi. Questa vista ti aiuta a concentrarti sulle priorità della giornata senza distrazioni.',
    target: '[data-tutorial="today-tasks"]',
    position: 'bottom'
  },
  {
    title: 'Progressi e Statistiche 📊',
    description: 'Monitora i tuoi progressi nel tempo: task completati, tasso di completamento, produttività e molto altro. L\'AI può analizzare i tuoi pattern di lavoro e suggerirti come migliorare.',
    target: '[data-tutorial="progress"]',
    position: 'right'
  },
  {
    title: 'Sistema Ticket di Supporto 🎫',
    description: 'Hai bisogno di aiuto? Crea un ticket di supporto! Descivi il problema e l\'AI suggerirà automaticamente la categoria, la priorità e il team più adatto per assisterti.',
    target: '[data-tutorial="menu-tickets"]',
    position: 'right'
  },
  {
    title: 'Note e Documentazione 📝',
    description: 'Crea note per documentare il tuo lavoro, salvare idee o organizzare informazioni. Supporta testo ricco, tabelle e disegni. L\'AI può riassumere le note ed estrarre action items automaticamente!',
    target: '[data-tutorial="menu-notes"]',
    position: 'right'
  },
  {
    title: 'Calendario Integrato 📆',
    description: 'Visualizza tutti i tuoi task, scadenze e meeting in un unico calendario. Puoi anche sincronizzare Google Calendar o Outlook per avere tutto in un solo posto.',
    target: '[data-tutorial="menu-calendar"]',
    position: 'right'
  },
  {
    title: 'Chatbot AI 💬',
    description: 'Il chatbot AI è il tuo assistente personale! Chiedigli informazioni sui task, scadenze, colleghi, politiche aziendali o qualsiasi cosa ti serva. È sempre disponibile nell\'angolo in basso a destra.',
    target: '[data-tutorial="chatbot-widget"]',
    position: 'top'
  },
  {
    title: 'Notifiche 🔔',
    description: 'Ricevi notifiche in tempo reale per nuovi task assegnati, messaggi, scadenze imminenti e aggiornamenti importanti. Clicca sull\'icona campanella per visualizzare tutte le notifiche.',
    target: '[data-tutorial="notifications"]',
    position: 'bottom'
  },
  {
    title: 'Tutto Pronto! 🎉',
    description: 'Ottimo lavoro! Hai completato il tutorial e sei pronto per iniziare a usare Planora. Ricorda: l\'AI è qui per aiutarti, usala spesso! Se hai domande, chiedi al chatbot o crea un ticket di supporto. Buon lavoro!',
    position: 'center'
  }
];
