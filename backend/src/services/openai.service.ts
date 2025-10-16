import OpenAI from 'openai';

// Singleton OpenAI client
let openaiClient: OpenAI | null = null;

export const getOpenAIClient = (): OpenAI => {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey || apiKey === 'sk-your-openai-api-key-here') {
      throw new Error('OpenAI API key not configured. Please set OPENAI_API_KEY in your .env file');
    }

    openaiClient = new OpenAI({
      apiKey: apiKey
    });
  }

  return openaiClient;
};

export const getDefaultModel = (): string => {
  return process.env.OPENAI_MODEL || 'gpt-4o-mini';
};

/**
 * Generate a chat completion with OpenAI
 */
export const generateChatCompletion = async (
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  options?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    jsonMode?: boolean;
  }
) => {
  const client = getOpenAIClient();
  const model = options?.model || getDefaultModel();

  const completionOptions: any = {
    model,
    messages,
    temperature: options?.temperature ?? 0.7,
    max_tokens: options?.maxTokens
  };

  if (options?.jsonMode) {
    completionOptions.response_format = { type: 'json_object' };
  }

  const completion = await client.chat.completions.create(completionOptions);

  return completion.choices[0]?.message?.content || '';
};

/**
 * Task AI Features
 */
export const aiTaskService = {
  /**
   * Suggest priority and difficulty for a task based on title and description
   */
  async suggestTaskMetadata(taskTitle: string, taskDescription?: string) {
    const prompt = `Analizza questo task e suggerisci priorità e difficoltà appropriate.

Task: ${taskTitle}
${taskDescription ? `Descrizione: ${taskDescription}` : ''}

Rispondi in formato JSON con questa struttura:
{
  "priorita": "bassa" | "media" | "alta",
  "difficolta": 1-5 (numero),
  "reasoning": "breve spiegazione della tua scelta"
}`;

    const response = await generateChatCompletion(
      [
        {
          role: 'system',
          content: 'Sei un assistente AI esperto in project management. Analizza i task e fornisci suggerimenti accurati su priorità e difficoltà.'
        },
        { role: 'user', content: prompt }
      ],
      { jsonMode: true, temperature: 0.3 }
    );

    return JSON.parse(response);
  },

  /**
   * Generate subtasks from a task description
   */
  async generateSubtasks(taskTitle: string, taskDescription?: string, numSubtasks: number = 5) {
    const prompt = `Crea una lista di subtask per questo task principale.

Task: ${taskTitle}
${taskDescription ? `Descrizione: ${taskDescription}` : ''}

Genera ${numSubtasks} subtask specifiche e actionable. Rispondi in formato JSON:
{
  "subtasks": [
    { "titolo": "...", "descrizione": "..." },
    ...
  ]
}`;

    const response = await generateChatCompletion(
      [
        {
          role: 'system',
          content: 'Sei un assistente AI esperto in task breakdown. Crea subtask specifiche, actionable e ben definite.'
        },
        { role: 'user', content: prompt }
      ],
      { jsonMode: true, temperature: 0.7 }
    );

    return JSON.parse(response);
  },

  /**
   * Estimate completion time based on similar tasks
   */
  async estimateCompletionTime(
    taskTitle: string,
    taskDescription: string | undefined,
    difficolta: number,
    similarTasksData?: Array<{ titolo: string; tempoImpiegato: number }>
  ) {
    const similarTasksContext = similarTasksData?.length
      ? `\nTask simili completati in passato:\n${similarTasksData.map(t => `- ${t.titolo}: ${t.tempoImpiegato} ore`).join('\n')}`
      : '';

    const prompt = `Stima il tempo necessario per completare questo task.

Task: ${taskTitle}
${taskDescription ? `Descrizione: ${taskDescription}` : ''}
Difficoltà: ${difficolta}/5${similarTasksContext}

Rispondi in formato JSON:
{
  "stima_ore": numero (ore stimate),
  "stima_min": numero (minimo ore),
  "stima_max": numero (massimo ore),
  "reasoning": "spiegazione della stima"
}`;

    const response = await generateChatCompletion(
      [
        {
          role: 'system',
          content: 'Sei un assistente AI esperto in project estimation. Fornisci stime realistiche basate sui dati disponibili.'
        },
        { role: 'user', content: prompt }
      ],
      { jsonMode: true, temperature: 0.3 }
    );

    return JSON.parse(response);
  },

  /**
   * Comprehensive task analysis - analyze all tasks (completed, in progress, overdue)
   */
  async analyzeAllTasks(tasksData: {
    completati: Array<{ titolo: string; priorita: string; difficolta: number; tempoImpiegato?: number }>;
    inCorso: Array<{ titolo: string; priorita: string; difficolta: number; scadenza?: string }>;
    scaduti: Array<{ titolo: string; priorita: string; difficolta: number; giorniScaduti: number }>;
    totali: number;
  }) {
    const completatiSummary = tasksData.completati.length > 0
      ? tasksData.completati.slice(0, 10).map(t => `${t.titolo} (Priorità: ${t.priorita}, Difficoltà: ${t.difficolta}/5)`).join('\n')
      : 'Nessun task completato';

    const inCorsoSummary = tasksData.inCorso.length > 0
      ? tasksData.inCorso.slice(0, 10).map(t => `${t.titolo} (Priorità: ${t.priorita}, Scadenza: ${t.scadenza || 'N/A'})`).join('\n')
      : 'Nessun task in corso';

    const scadutiSummary = tasksData.scaduti.length > 0
      ? tasksData.scaduti.slice(0, 10).map(t => `${t.titolo} (Scaduto da ${t.giorniScaduti} giorni)`).join('\n')
      : 'Nessun task scaduto';

    const prompt = `Analizza in modo completo i task dell'utente e fornisci insights dettagliati.

STATISTICHE GENERALI:
- Totale task: ${tasksData.totali}
- Task completati: ${tasksData.completati.length}
- Task in corso: ${tasksData.inCorso.length}
- Task scaduti: ${tasksData.scaduti.length}

TASK COMPLETATI RECENTI (${tasksData.completati.length}):
${completatiSummary}

TASK IN CORSO (${tasksData.inCorso.length}):
${inCorsoSummary}

TASK SCADUTI (${tasksData.scaduti.length}):
${scadutiSummary}

Rispondi in formato JSON con questa struttura esatta:
{
  "panoramica_generale": "Analisi generale dello stato dei task",
  "tasso_completamento": "percentuale e valutazione (es: '85% - Ottimo')",
  "performance_highlights": [
    "punto forte 1",
    "punto forte 2",
    "punto forte 3"
  ],
  "aree_critiche": [
    "area critica 1",
    "area critica 2",
    "area critica 3"
  ],
  "task_prioritari": [
    {
      "titolo": "titolo task da prioritizzare",
      "motivo": "perché è prioritario",
      "azione_suggerita": "azione da intraprendere"
    }
  ],
  "gestione_scadenze": {
    "valutazione": "Eccellente" | "Buona" | "Da migliorare" | "Critica",
    "commento": "commento sulla gestione delle scadenze"
  },
  "raccomandazioni": [
    "raccomandazione 1",
    "raccomandazione 2",
    "raccomandazione 3",
    "raccomandazione 4"
  ],
  "prossimi_passi": [
    "passo 1",
    "passo 2",
    "passo 3"
  ]
}`;

    const response = await generateChatCompletion(
      [
        {
          role: 'system',
          content: 'Sei un assistente AI esperto in task management e project planning. Analizza i dati dei task e fornisci insights actionable e strategici in italiano.'
        },
        { role: 'user', content: prompt }
      ],
      { jsonMode: true, temperature: 0.5 }
    );

    return JSON.parse(response);
  },

  /**
   * Admin: Comprehensive company-wide analysis
   */
  async analyzeCompanyPerformance(companyData: {
    totalEmployees: number;
    totalTasks: number;
    employeesData: Array<{
      nome: string;
      cognome: string;
      ruolo: string;
      tasksCompletati: number;
      tasksInCorso: number;
      tasksScaduti: number;
      tempoMedioCompletamento?: number;
    }>;
    tasksByPriority: { alta: number; media: number; bassa: number };
    completionRate: number;
  }) {
    const topPerformers = companyData.employeesData
      .sort((a, b) => b.tasksCompletati - a.tasksCompletati)
      .slice(0, 5)
      .map(e => `${e.nome} ${e.cognome} (${e.ruolo}): ${e.tasksCompletati} task completati`)
      .join('\n');

    const employeesNeedingHelp = companyData.employeesData
      .filter(e => e.tasksScaduti > 0 || e.tasksInCorso > 10)
      .slice(0, 5)
      .map(e => `${e.nome} ${e.cognome}: ${e.tasksScaduti} scaduti, ${e.tasksInCorso} in corso`)
      .join('\n');

    const prompt = `Analizza la performance aziendale complessiva e fornisci insights strategici per il management.

DATI AZIENDALI:
- Dipendenti totali: ${companyData.totalEmployees}
- Task totali: ${companyData.totalTasks}
- Tasso completamento: ${companyData.completionRate.toFixed(1)}%
- Task per priorità: Alta ${companyData.tasksByPriority.alta}, Media ${companyData.tasksByPriority.media}, Bassa ${companyData.tasksByPriority.bassa}

TOP PERFORMERS:
${topPerformers || 'Nessun dato disponibile'}

DIPENDENTI CHE NECESSITANO SUPPORTO:
${employeesNeedingHelp || 'Nessun dipendente in difficoltà'}

Rispondi in formato JSON con questa struttura esatta:
{
  "valutazione_generale": "Valutazione complessiva delle performance aziendali",
  "health_score": 0-100,
  "punti_forza_aziendali": [
    "punto di forza 1",
    "punto di forza 2",
    "punto di forza 3"
  ],
  "aree_miglioramento_aziendali": [
    "area da migliorare 1",
    "area da migliorare 2",
    "area da migliorare 3"
  ],
  "top_performers": [
    {
      "nome": "nome dipendente",
      "achievements": "cosa ha fatto di eccellente",
      "suggerimento": "come valorizzarlo ulteriormente"
    }
  ],
  "dipendenti_a_rischio": [
    {
      "nome": "nome dipendente",
      "problemi": "descrizione dei problemi",
      "azioni_suggerite": "cosa fare per aiutarlo"
    }
  ],
  "distribuzione_workload": {
    "valutazione": "Bilanciata" | "Sbilanciata" | "Critica",
    "commento": "analisi della distribuzione del carico di lavoro"
  },
  "raccomandazioni_strategiche": [
    "raccomandazione 1 per il management",
    "raccomandazione 2",
    "raccomandazione 3",
    "raccomandazione 4"
  ],
  "metriche_chiave": {
    "efficienza_team": "Alta" | "Media" | "Bassa",
    "collaboration_score": "Ottimo" | "Buono" | "Da migliorare",
    "deadline_compliance": "Eccellente" | "Buona" | "Critica"
  },
  "azioni_immediate": [
    "azione immediata 1",
    "azione immediata 2",
    "azione immediata 3"
  ]
}`;

    const response = await generateChatCompletion(
      [
        {
          role: 'system',
          content: 'Sei un assistente AI esperto in people management, HR analytics e organizational performance. Fornisci insights strategici actionable per il management in italiano.'
        },
        { role: 'user', content: prompt }
      ],
      { jsonMode: true, temperature: 0.5 }
    );

    return JSON.parse(response);
  }
};

/**
 * Ticket AI Features
 */
export const aiTicketService = {
  /**
   * Analyze ticket content and suggest appropriate role/category
   */
  async analyzeTicketContent(
    titolo: string,
    descrizione: string,
    availableRoles: Array<{ id: string; nome: string; descrizione?: string }>,
    availableCategories: Array<{ id: string; nome: string; targetRole?: { nome: string } }>
  ) {
    const rolesContext = availableRoles
      .map(r => `- ${r.nome}${r.descrizione ? `: ${r.descrizione}` : ''}`)
      .join('\n');

    const categoriesContext = availableCategories
      .map(c => `- ${c.nome}${c.targetRole ? ` (gestito da: ${c.targetRole.nome})` : ''}`)
      .join('\n');

    const prompt = `Analizza questo ticket e suggerisci la migliore categoria e ruolo a cui assegnarlo.

Ticket: ${titolo}
Descrizione: ${descrizione}

Ruoli disponibili:
${rolesContext}

Categorie disponibili:
${categoriesContext}

Rispondi in formato JSON:
{
  "categoria_suggerita": "id della categoria",
  "ruolo_suggerito": "id del ruolo",
  "confidence": 0.0-1.0,
  "reasoning": "spiegazione della scelta",
  "urgenza_suggerita": "bassa" | "media" | "alta"
}`;

    const response = await generateChatCompletion(
      [
        {
          role: 'system',
          content: 'Sei un assistente AI esperto in ticket routing e categorizzazione. Analizza il contenuto e suggerisci la migliore assegnazione.'
        },
        { role: 'user', content: prompt }
      ],
      { jsonMode: true, temperature: 0.3 }
    );

    return JSON.parse(response);
  },

  /**
   * Suggest solutions based on similar resolved tickets
   */
  async suggestSolutions(
    ticketContent: string,
    similarResolvedTickets: Array<{ titolo: string; descrizione: string; soluzione: string }>
  ) {
    const similarContext = similarResolvedTickets
      .map(t => `Ticket: ${t.titolo}\nProblema: ${t.descrizione}\nSoluzione: ${t.soluzione}`)
      .join('\n\n---\n\n');

    const prompt = `Basandoti su questi ticket risolti in passato, suggerisci possibili soluzioni per il nuovo ticket.

NUOVO TICKET:
${ticketContent}

TICKET SIMILI RISOLTI:
${similarContext}

Rispondi in formato JSON:
{
  "soluzioni_suggerite": [
    { "soluzione": "...", "confidence": 0.0-1.0, "reasoning": "..." }
  ]
}`;

    const response = await generateChatCompletion(
      [
        {
          role: 'system',
          content: 'Sei un assistente AI esperto nel supporto tecnico. Analizza ticket passati e suggerisci soluzioni pertinenti.'
        },
        { role: 'user', content: prompt }
      ],
      { jsonMode: true, temperature: 0.5 }
    );

    return JSON.parse(response);
  },

  /**
   * Analyze sentiment of ticket messages
   */
  async analyzeSentiment(contenuto: string) {
    const prompt = `Analizza il sentiment di questo messaggio da un ticket di supporto.

Messaggio: ${contenuto}

Rispondi in formato JSON:
{
  "sentiment": "positivo" | "neutrale" | "negativo" | "urgente",
  "score": -1.0 a 1.0 (negativo a positivo),
  "emotional_tone": "descrizione del tono emotivo",
  "urgency_level": "basso" | "medio" | "alto",
  "requires_immediate_attention": boolean
}`;

    const response = await generateChatCompletion(
      [
        {
          role: 'system',
          content: 'Sei un assistente AI esperto in analisi del sentiment. Identifica il tono emotivo e il livello di urgenza nei messaggi.'
        },
        { role: 'user', content: prompt }
      ],
      { jsonMode: true, temperature: 0.2 }
    );

    return JSON.parse(response);
  },

  /**
   * Suggest optimal routing for a ticket
   */
  async suggestRouting(
    titolo: string,
    descrizione: string,
    priorita: string,
    availableRoles: Array<{ nome: string; descrizione: string }>,
    availableTeams: string[]
  ) {
    const rolesContext = availableRoles
      .map(r => `- ${r.nome}: ${r.descrizione}`)
      .join('\n');

    const teamsContext = availableTeams.join(', ');

    const prompt = `Analizza questo ticket e suggerisci il routing ottimale.

Ticket: ${titolo}
Descrizione: ${descrizione}
Priorità: ${priorita}

Ruoli disponibili:
${rolesContext}

Team disponibili: ${teamsContext}

Rispondi in formato JSON:
{
  "ruolo_suggerito": "nome del ruolo più adatto",
  "competenze_richieste": ["competenza1", "competenza2", ...],
  "reasoning": "spiegazione dettagliata della scelta",
  "stima_complessita": "bassa" | "media" | "alta"
}`;

    const response = await generateChatCompletion(
      [
        {
          role: 'system',
          content: 'Sei un assistente AI esperto in ticket routing e resource allocation. Suggerisci il routing ottimale basato sulle competenze richieste.'
        },
        { role: 'user', content: prompt }
      ],
      { jsonMode: true, temperature: 0.3 }
    );

    return JSON.parse(response);
  },

  /**
   * Find similar tickets based on content
   */
  async findSimilarTickets(
    titolo: string,
    descrizione: string,
    allTickets: Array<{ id: string; titolo: string; descrizione: string | null; stato: string; priorita: string }>
  ) {
    const ticketsContext = allTickets
      .slice(0, 20) // Limita a 20 ticket per non sovraccaricare il prompt
      .map(t => `ID: ${t.id} | Titolo: ${t.titolo} | Desc: ${t.descrizione?.substring(0, 100) || 'N/A'} | Stato: ${t.stato}`)
      .join('\n');

    const prompt = `Trova i ticket più simili a questo nuovo ticket.

NUOVO TICKET:
Titolo: ${titolo}
Descrizione: ${descrizione}

TICKET ESISTENTI:
${ticketsContext}

Rispondi in formato JSON:
{
  "tickets_simili": [
    {
      "ticket_id": "id",
      "titolo": "titolo ticket",
      "descrizione": "descrizione breve",
      "stato": "stato",
      "similarity_score": 0-100 (percentuale similarità),
      "reasoning": "perché è simile"
    }
  ],
  "suggerimento": "suggerimento basato sui ticket simili trovati"
}`;

    const response = await generateChatCompletion(
      [
        {
          role: 'system',
          content: 'Sei un assistente AI esperto in semantic search. Identifica ticket simili basandoti sul contenuto semantico, non solo sulle keyword.'
        },
        { role: 'user', content: prompt }
      ],
      { jsonMode: true, temperature: 0.3 }
    );

    return JSON.parse(response);
  }
};

/**
 * Productivity & Analytics AI Features
 */
export const aiProductivityService = {
  /**
   * Analyze user productivity patterns and suggest improvements
   */
  async analyzeProductivityPatterns(userData: {
    completedTasks: number;
    averageCompletionTime: number;
    missedDeadlines: number;
    workingHoursDistribution: Record<string, number>;
  }) {
    const prompt = `Analizza questi dati di produttività e fornisci suggerimenti personalizzati.

Dati:
- Task completati: ${userData.completedTasks}
- Tempo medio di completamento: ${userData.averageCompletionTime.toFixed(1)} ore
- Scadenze mancate: ${userData.missedDeadlines}
- Distribuzione ore di lavoro: ${JSON.stringify(userData.workingHoursDistribution)}

Rispondi in formato JSON con questa struttura esatta:
{
  "analisi_generale": "Analisi generale della produttività dell'utente",
  "pattern": ["pattern 1", "pattern 2", "pattern 3"],
  "rischio_burnout": "Basso" | "Medio" | "Alto",
  "spiegazione_burnout": "Spiegazione del livello di rischio burnout",
  "suggerimenti": ["suggerimento 1", "suggerimento 2", "suggerimento 3", "suggerimento 4", "suggerimento 5"]
}`;

    const response = await generateChatCompletion(
      [
        {
          role: 'system',
          content: 'Sei un assistente AI esperto in produttività e wellbeing lavorativo. Analizza i pattern e fornisci consigli personalizzati e actionable in italiano.'
        },
        { role: 'user', content: prompt }
      ],
      { jsonMode: true, temperature: 0.5 }
    );

    return JSON.parse(response);
  }
};

/**
 * Notes AI Features
 */
export const aiNotesService = {
  /**
   * Summarize a long note
   */
  async summarizeNote(noteContent: string, maxWords: number = 100) {
    const prompt = `Crea un riassunto conciso di questa nota (massimo ${maxWords} parole).

Nota:
${noteContent}

Rispondi in formato JSON con questa struttura esatta:
{
  "riassunto": "riassunto conciso della nota",
  "punti_chiave": ["punto chiave 1", "punto chiave 2", "punto chiave 3"]
}`;

    const response = await generateChatCompletion(
      [
        {
          role: 'system',
          content: 'Sei un assistente AI esperto in summarization. Crea riassunti chiari e informativi in italiano.'
        },
        { role: 'user', content: prompt }
      ],
      { jsonMode: true, temperature: 0.3 }
    );

    return JSON.parse(response);
  },

  /**
   * Extract action items from notes
   */
  async extractActionItems(noteContent: string) {
    const prompt = `Estrai tutti gli action item da questa nota.

Nota:
${noteContent}

Rispondi in formato JSON con questa struttura esatta:
{
  "azioni": [
    { "descrizione": "descrizione dell'azione", "priorita": "alta" | "media" | "bassa", "scadenza": "data se menzionata o null" }
  ]
}`;

    const response = await generateChatCompletion(
      [
        {
          role: 'system',
          content: 'Sei un assistente AI esperto nell\'identificare action item. Estrai tutti i compiti e azioni da compiere menzionati nel testo in italiano.'
        },
        { role: 'user', content: prompt }
      ],
      { jsonMode: true, temperature: 0.3 }
    );

    return JSON.parse(response);
  },

  /**
   * Suggest related notes based on content similarity
   */
  async findRelatedNotes(
    currentNoteContent: string,
    existingNotes: Array<{ id: string; titolo: string; contenuto: string; tipo: string }>
  ) {
    const notesContext = existingNotes
      .slice(0, 15) // Limita a 15 note
      .map(n => `ID: ${n.id} | Titolo: ${n.titolo} | Tipo: ${n.tipo} | Contenuto: ${n.contenuto.substring(0, 150)}...`)
      .join('\n');

    const prompt = `Analizza questa nota e identifica quali note esistenti sono correlate.

NOTA CORRENTE:
${currentNoteContent.substring(0, 500)}

NOTE ESISTENTI:
${notesContext}

Rispondi in formato JSON con questa struttura esatta:
{
  "note_correlate": [
    { "note_id": "id", "titolo": "titolo", "tipo": "tipo", "similarity_score": 0-100 (percentuale similarità) }
  ],
  "suggerimento": "suggerimento su come usare le note correlate"
}`;

    const response = await generateChatCompletion(
      [
        {
          role: 'system',
          content: 'Sei un assistente AI esperto nell\'analisi semantica. Identifica relazioni e collegamenti tra contenuti in italiano.'
        },
        { role: 'user', content: prompt }
      ],
      { jsonMode: true, temperature: 0.3 }
    );

    return JSON.parse(response);
  }
};

/**
 * Email & Calendar AI Features
 */
export const aiEmailCalendarService = {
  /**
   * Suggest email response
   */
  async suggestEmailResponse(
    emailContent: string,
    context?: string,
    tone: 'formal' | 'casual' | 'friendly' = 'formal'
  ) {
    const prompt = `Suggerisci una risposta appropriata per questa email.

Email ricevuta:
${emailContent}

${context ? `Contesto: ${context}` : ''}

Tono desiderato: ${tone}

Rispondi in formato JSON:
{
  "suggested_response": "testo della risposta suggerita",
  "key_points_to_address": ["punto 1", "punto 2", ...],
  "tone_match": "quanto la risposta corrisponde al tono richiesto"
}`;

    const response = await generateChatCompletion(
      [
        {
          role: 'system',
          content: 'Sei un assistente AI esperto nella comunicazione professionale via email. Suggerisci risposte appropriate e ben formulate.'
        },
        { role: 'user', content: prompt }
      ],
      { jsonMode: true, temperature: 0.7 }
    );

    return JSON.parse(response);
  },

  /**
   * Detect meetings and deadlines from email content
   */
  async extractMeetingsAndDeadlines(emailContent: string) {
    const prompt = `Estrai meeting e deadline da questa email.

Email:
${emailContent}

Rispondi in formato JSON:
{
  "meetings": [
    { "title": "titolo meeting", "date": "YYYY-MM-DD", "time": "HH:MM", "duration_minutes": numero, "location": "luogo o link" }
  ],
  "deadlines": [
    { "task": "descrizione", "date": "YYYY-MM-DD", "urgency": "alta" | "media" | "bassa" }
  ]
}`;

    const response = await generateChatCompletion(
      [
        {
          role: 'system',
          content: 'Sei un assistente AI esperto nell\'estrazione di informazioni temporali. Identifica date, orari e deadline menzionati nelle email.'
        },
        { role: 'user', content: prompt }
      ],
      { jsonMode: true, temperature: 0.2 }
    );

    return JSON.parse(response);
  },

  /**
   * Smart meeting scheduling suggestions
   */
  async suggestMeetingSlots(
    participants: string[],
    duration: number,
    existingMeetings: Array<{ start: string; end: string }>,
    workingHours: { start: string; end: string }
  ) {
    const prompt = `Suggerisci slot ottimali per una riunione.

Partecipanti: ${participants.join(', ')}
Durata: ${duration} minuti
Orario di lavoro: ${workingHours.start} - ${workingHours.end}
Meeting esistenti: ${JSON.stringify(existingMeetings)}

Rispondi in formato JSON:
{
  "suggested_slots": [
    { "date": "YYYY-MM-DD", "start_time": "HH:MM", "end_time": "HH:MM", "score": 0.0-1.0, "reasoning": "perché questo slot è ottimale" }
  ]
}`;

    const response = await generateChatCompletion(
      [
        {
          role: 'system',
          content: 'Sei un assistente AI esperto in calendar management. Suggerisci slot ottimali considerando work-life balance e produttività.'
        },
        { role: 'user', content: prompt }
      ],
      { jsonMode: true, temperature: 0.3 }
    );

    return JSON.parse(response);
  },

  /**
   * Analyze calendar and deadlines to provide insights
   */
  async analyzeCalendar(
    upcomingEvents: Array<{ titolo: string; data: string; durata: number; partecipanti: string[] }>,
    upcomingDeadlines: Array<{ descrizione: string; data: string; priorita: string }>
  ) {
    const eventsContext = upcomingEvents.length > 0
      ? upcomingEvents.slice(0, 10).map(e => `${e.titolo} il ${new Date(e.data).toLocaleDateString('it-IT')} (${e.durata} min, ${e.partecipanti.length} partecipanti)`).join('\n')
      : 'Nessun evento programmato';

    const deadlinesContext = upcomingDeadlines.length > 0
      ? upcomingDeadlines.slice(0, 10).map(d => `${d.descrizione} - Scadenza: ${new Date(d.data).toLocaleDateString('it-IT')} (Priorità: ${d.priorita})`).join('\n')
      : 'Nessuna scadenza imminente';

    const prompt = `Analizza il calendario e le scadenze imminenti e fornisci insights utili.

EVENTI PROSSIMI (${upcomingEvents.length} totali):
${eventsContext}

SCADENZE IMMINENTI (${upcomingDeadlines.length} totali):
${deadlinesContext}

Rispondi in formato JSON con questa struttura esatta:
{
  "meeting_estratti": [
    { "titolo": "titolo meeting", "data": "data formattata", "partecipanti": ["partecipante1", ...] }
  ],
  "scadenze": [
    { "descrizione": "descrizione scadenza", "data": "data formattata" }
  ],
  "suggerimenti_scheduling": [
    "suggerimento 1 per ottimizzare il calendario",
    "suggerimento 2",
    "suggerimento 3"
  ]
}`;

    const response = await generateChatCompletion(
      [
        {
          role: 'system',
          content: 'Sei un assistente AI esperto in calendar management e time optimization. Analizza eventi e scadenze per fornire insights actionable in italiano.'
        },
        { role: 'user', content: prompt }
      ],
      { jsonMode: true, temperature: 0.4 }
    );

    return JSON.parse(response);
  }
};

/**
 * Company Chatbot
 */
export const aiChatbotService = {
  /**
   * Answer questions about tasks, projects, and procedures
   */
  async answerQuestion(
    question: string,
    context: {
      companyKnowledge?: string;
      relevantTasks?: Array<{ titolo: string; descrizione: string }>;
      relevantDocuments?: Array<{ titolo: string; contenuto: string }>;
    }
  ) {
    const tasksContext = context.relevantTasks?.length
      ? `\nTask correlati:\n${context.relevantTasks.map(t => `- ${t.titolo}: ${t.descrizione}`).join('\n')}`
      : '';

    const docsContext = context.relevantDocuments?.length
      ? `\nDocumenti correlati:\n${context.relevantDocuments.map(d => `- ${d.titolo}: ${d.contenuto.substring(0, 200)}...`).join('\n')}`
      : '';

    const prompt = `Rispondi a questa domanda in modo chiaro e utile.

Domanda: ${question}
${context.companyKnowledge ? `\nConoscenze aziendali: ${context.companyKnowledge}` : ''}${tasksContext}${docsContext}

Rispondi in formato JSON:
{
  "answer": "risposta completa e chiara",
  "confidence": 0.0-1.0,
  "sources": ["fonte 1", "fonte 2", ...],
  "follow_up_questions": ["domanda correlata 1", ...]
}`;

    const response = await generateChatCompletion(
      [
        {
          role: 'system',
          content: 'Sei un assistente virtuale aziendale. Fornisci risposte accurate, chiare e utili basate sul contesto aziendale disponibile.'
        },
        { role: 'user', content: prompt }
      ],
      { jsonMode: true, temperature: 0.5 }
    );

    return JSON.parse(response);
  },

  /**
   * Generate onboarding content for new employees
   */
  async generateOnboardingContent(
    employeeRole: string,
    companyInfo: {
      name: string;
      industry: string;
      teamStructure: string;
      mainProjects: string[];
    }
  ) {
    const prompt = `Genera contenuto di onboarding personalizzato per un nuovo dipendente.

Ruolo: ${employeeRole}
Azienda: ${companyInfo.name}
Settore: ${companyInfo.industry}
Struttura team: ${companyInfo.teamStructure}
Progetti principali: ${companyInfo.mainProjects.join(', ')}

Rispondi in formato JSON:
{
  "welcome_message": "messaggio di benvenuto personalizzato",
  "first_week_checklist": [
    { "task": "...", "description": "...", "priority": "alta" | "media" | "bassa" }
  ],
  "key_contacts": [
    { "role": "...", "why_contact": "..." }
  ],
  "learning_resources": [
    { "topic": "...", "description": "...", "estimated_time": "..." }
  ]
}`;

    const response = await generateChatCompletion(
      [
        {
          role: 'system',
          content: 'Sei un assistente AI esperto in employee onboarding. Crea contenuti di benvenuto personalizzati e checklist utili per nuovi dipendenti.'
        },
        { role: 'user', content: prompt }
      ],
      { jsonMode: true, temperature: 0.7 }
    );

    return JSON.parse(response);
  }
};
