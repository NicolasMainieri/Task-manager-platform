import type { TutorialStep } from '../components/TutorialOverlay';

export const adminTutorialSteps: TutorialStep[] = [
  {
    title: 'Benvenuto in Planora! 🚀',
    description: 'Congratulazioni per aver creato la tua azienda su Planora! Questo tutorial ti guiderà attraverso le funzionalità principali della piattaforma per aiutarti a gestire al meglio il tuo team.',
    position: 'center'
  },
  {
    title: 'Dashboard Panoramica',
    description: 'Questa è la tua dashboard principale. Qui puoi vedere una panoramica delle statistiche aziendali, i task attivi, i dipendenti e le performance del team in tempo reale.',
    target: '[data-tutorial="admin-dashboard"]',
    position: 'center'
  },
  {
    title: 'Codice Azienda',
    description: 'Questo è il codice univoco della tua azienda. Condividilo con i tuoi dipendenti per permettergli di registrarsi e unirsi al team. Puoi copiarlo facilmente cliccando sull\'icona.',
    target: '[data-tutorial="company-code"]',
    position: 'bottom'
  },
  {
    title: 'Menu di Navigazione',
    description: 'Usa questo menu laterale per navigare tra le diverse sezioni: gestione dipendenti, task, team, analisi AI, ticket di supporto e molto altro.',
    target: '[data-tutorial="sidebar-menu"]',
    position: 'right'
  },
  {
    title: 'Gestione Dipendenti',
    description: 'Nella sezione "Tutti i Dipendenti" puoi vedere tutti i membri del team, modificare i loro ruoli, visualizzare le loro performance e gestire i permessi. Puoi anche approvare o rifiutare richieste di cambio ruolo.',
    target: '[data-tutorial="menu-employees"]',
    position: 'right'
  },
  {
    title: 'Creazione e Gestione Team',
    description: 'Organizza i tuoi dipendenti in team per una migliore collaborazione. Crea team per dipartimenti, progetti o aree funzionali. Ogni team può avere task e obiettivi specifici.',
    target: '[data-tutorial="menu-teams"]',
    position: 'right'
  },
  {
    title: 'Gestione Task',
    description: 'Crea, assegna e monitora i task del team. Puoi impostare priorità, scadenze, difficoltà e assegnare task a singoli dipendenti o team interi. Usa l\'AI per ottenere suggerimenti intelligenti!',
    target: '[data-tutorial="menu-tasks"]',
    position: 'right'
  },
  {
    title: 'Analisi AI Aziendale 🤖',
    description: 'La sezione Analisi AI ti fornisce insights avanzati sulle performance aziendali: identifica i top performer, dipendenti a rischio, distribuzione del carico di lavoro e ricevi raccomandazioni strategiche personalizzate.',
    target: '[data-tutorial="menu-ai-analysis"]',
    position: 'right'
  },
  {
    title: 'Sistema Ticket di Supporto',
    description: 'Gestisci le richieste dei dipendenti attraverso un sistema di ticketing intelligente. L\'AI può suggerire automaticamente il routing ottimale e le soluzioni basate su ticket simili risolti in passato.',
    target: '[data-tutorial="menu-tickets"]',
    position: 'right'
  },
  {
    title: 'Chatbot AI Aziendale 💬',
    description: 'Usa il chatbot AI per ottenere risposte immediate su task, dipendenti, statistiche e politiche aziendali. Il chatbot è sempre disponibile nell\'angolo in basso a destra.',
    target: '[data-tutorial="chatbot-widget"]',
    position: 'top'
  },
  {
    title: 'Notifiche in Tempo Reale 🔔',
    description: 'Ricevi notifiche istantanee per eventi importanti: nuovi dipendenti, task completati, ticket urgenti, richieste di cambio ruolo e molto altro. Clicca sull\'icona per visualizzare tutte le notifiche.',
    target: '[data-tutorial="notifications"]',
    position: 'bottom'
  },
  {
    title: 'Sei Pronto! 🎉',
    description: 'Hai completato il tutorial! Ora sei pronto per gestire il tuo team con Planora. Ricorda: puoi sempre accedere all\'help cliccando sull\'icona "?" o rivedere questo tutorial dalle impostazioni. Buon lavoro!',
    position: 'center'
  }
];
