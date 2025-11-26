import axios from 'axios';
import { generateChatCompletion } from './openai.service';

/**
 * Servizio per integrazione con EUR-Lex API (legislazione europea)
 * EUR-Lex fornisce accesso gratuito alla legislazione UE
 */

const EURLEX_API_BASE = 'https://eur-lex.europa.eu/search.html';
const EURLEX_CONTENT_BASE = 'https://eur-lex.europa.eu/legal-content';

interface EURLexDocument {
  celex: string;
  title: string;
  type: string;
  date: string;
  url: string;
  summary?: string;
}

/**
 * Ricerca documenti su EUR-Lex
 */
export const searchEURLex = async (query: string, filters?: {
  type?: 'directive' | 'regulation' | 'decision' | 'all';
  dateFrom?: string;
  dateTo?: string;
  subject?: string;
}): Promise<EURLexDocument[]> => {
  try {
    // Nota: EUR-Lex non ha una vera API REST pubblica
    // Questa è una implementazione di base che può essere estesa
    // con scraping o con accesso SPARQL endpoint

    // Per ora, ritorniamo documenti di esempio
    // TODO: Implementare vera integrazione quando disponibile

    const mockDocuments: EURLexDocument[] = [
      {
        celex: '32016R0679',
        title: 'Regolamento (UE) 2016/679 - GDPR',
        type: 'regulation',
        date: '2016-04-27',
        url: 'https://eur-lex.europa.eu/eli/reg/2016/679/oj',
        summary: 'Regolamento generale sulla protezione dei dati'
      },
      {
        celex: '32019R1150',
        title: 'Regolamento (UE) 2019/1150 - Piattaforme digitali',
        type: 'regulation',
        date: '2019-06-20',
        url: 'https://eur-lex.europa.eu/eli/reg/2019/1150/oj',
        summary: 'Regolamento su equità e trasparenza per gli utenti commerciali dei servizi di intermediazione online'
      }
    ];

    // Filtra i risultati in base alla query (simulazione)
    const results = mockDocuments.filter(doc =>
      doc.title.toLowerCase().includes(query.toLowerCase()) ||
      doc.summary?.toLowerCase().includes(query.toLowerCase())
    );

    return results;
  } catch (error) {
    console.error('Errore ricerca EUR-Lex:', error);
    throw new Error('Errore durante la ricerca su EUR-Lex');
  }
};

/**
 * Ottiene il testo completo di un documento EUR-Lex
 */
export const getEURLexDocument = async (celex: string): Promise<string> => {
  try {
    // TODO: Implementare retrieval del documento
    // Per ora ritorna testo di esempio
    return `Documento EUR-Lex ${celex}\n\nContenuto del documento...`;
  } catch (error) {
    console.error('Errore recupero documento EUR-Lex:', error);
    throw new Error('Errore durante il recupero del documento');
  }
};

/**
 * Analizza un documento legale con AI
 */
export const analyzeLegalDocument = async (documentText: string, userQuery?: string) => {
  const prompt = userQuery
    ? `Analizza questo documento legale e rispondi alla seguente domanda: "${userQuery}"\n\nDocumento:\n${documentText.substring(0, 4000)}`
    : `Fornisci un'analisi dettagliata di questo documento legale, includendo:\n1. Punti chiave\n2. Implicazioni pratiche\n3. Soggetti coinvolti\n4. Obblighi principali\n\nDocumento:\n${documentText.substring(0, 4000)}`;

  const response = await generateChatCompletion(
    [
      {
        role: 'system',
        content: 'Sei un assistente legale AI esperto in diritto italiano ed europeo. Analizza i documenti legali in modo accurato e fornisci risposte chiare e pratiche.'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    { temperature: 0.3 }
  );

  return response;
};

/**
 * Trova documenti correlati basandosi sul contenuto
 */
export const findRelatedLegalDocuments = async (
  documentTitle: string,
  documentContent: string,
  existingDocuments: Array<{ id: string; titolo: string; testoCompleto: string | null }>
) => {
  const docsContext = existingDocuments
    .slice(0, 20)
    .map(d => `ID: ${d.id} | Titolo: ${d.titolo} | Contenuto: ${d.testoCompleto?.substring(0, 200) || 'N/A'}`)
    .join('\n');

  const prompt = `Analizza questo documento legale e trova i documenti più correlati dal database.

DOCUMENTO CORRENTE:
Titolo: ${documentTitle}
Contenuto: ${documentContent.substring(0, 500)}

DOCUMENTI ESISTENTI:
${docsContext}

Rispondi in formato JSON:
{
  "documenti_correlati": [
    {
      "document_id": "id",
      "titolo": "titolo",
      "relevance_score": 0-100,
      "motivo_correlazione": "perché è correlato"
    }
  ],
  "suggerimenti": "suggerimenti per l'utente"
}`;

  const response = await generateChatCompletion(
    [
      {
        role: 'system',
        content: 'Sei un assistente AI esperto in ricerca giuridica. Identifica collegamenti e correlazioni tra documenti legali.'
      },
      { role: 'user', content: prompt }
    ],
    { jsonMode: true, temperature: 0.3 }
  );

  return JSON.parse(response);
};

/**
 * Estrae punti chiave da una sentenza
 */
export const extractKeyPointsFromSentence = async (sentenceText: string) => {
  const prompt = `Analizza questa sentenza e estrai i punti chiave.

Sentenza:
${sentenceText.substring(0, 5000)}

Rispondi in formato JSON con questa struttura:
{
  "massima": "massima della sentenza (breve)",
  "punti_chiave": [
    "punto chiave 1",
    "punto chiave 2",
    "punto chiave 3"
  ],
  "principio_diritto": "principio di diritto affermato",
  "dispositivo": "dispositivo della sentenza",
  "riferimenti_normativi": ["art. 123 c.c.", "art. 456 c.p.", ...],
  "precedenti_citati": ["Cass. 1234/2020", ...]
}`;

  const response = await generateChatCompletion(
    [
      {
        role: 'system',
        content: 'Sei un assistente AI esperto in analisi giuridica. Estrai informazioni strutturate da sentenze.'
      },
      { role: 'user', content: prompt }
    ],
    { jsonMode: true, temperature: 0.2 }
  );

  return JSON.parse(response);
};

/**
 * Chatbot legale - risponde a domande con riferimenti legali
 */
export const legalChatbot = async (
  userQuestion: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
  relevantDocuments?: Array<{ titolo: string; testoCompleto: string }>
) => {
  const docsContext = relevantDocuments?.length
    ? `\n\nDOCUMENTI DI RIFERIMENTO:\n${relevantDocuments.map(d => `- ${d.titolo}:\n${d.testoCompleto.substring(0, 500)}...`).join('\n\n')}`
    : '';

  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    {
      role: 'system',
      content: `Sei un assistente legale AI esperto in diritto italiano ed europeo. Fornisci consulenze accurate citando sempre le fonti normative e giurisprudenziali.${docsContext}`
    },
    ...conversationHistory,
    {
      role: 'user',
      content: userQuestion
    }
  ];

  const response = await generateChatCompletion(messages, { temperature: 0.4 });

  return response;
};

/**
 * Genera suggerimenti per un caso legale
 */
export const generateCaseSuggestions = async (caseData: {
  titolo: string;
  descrizione: string;
  materia: string;
  sottoMateria?: string;
}) => {
  const prompt = `Analizza questo caso legale e fornisci suggerimenti strategici.

Caso:
Titolo: ${caseData.titolo}
Descrizione: ${caseData.descrizione}
Materia: ${caseData.materia}
${caseData.sottoMateria ? `Sotto-materia: ${caseData.sottoMateria}` : ''}

Rispondi in formato JSON:
{
  "strategia_suggerita": "strategia complessiva consigliata",
  "precedenti_rilevanti": [
    { "riferimento": "Cass. 1234/2020", "rilevanza": "perché è rilevante" }
  ],
  "norme_applicabili": [
    { "riferimento": "art. 123 c.c.", "applicazione": "come si applica al caso" }
  ],
  "azioni_immediate": [
    "azione 1",
    "azione 2"
  ],
  "rischi": [
    "rischio 1",
    "rischio 2"
  ],
  "opportunita": [
    "opportunità 1",
    "opportunità 2"
  ]
}`;

  const response = await generateChatCompletion(
    [
      {
        role: 'system',
        content: 'Sei un avvocato esperto con decenni di esperienza. Fornisci consulenza strategica sui casi legali.'
      },
      { role: 'user', content: prompt }
    ],
    { jsonMode: true, temperature: 0.5 }
  );

  return JSON.parse(response);
};
