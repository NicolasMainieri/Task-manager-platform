import axios from 'axios';
import * as cheerio from 'cheerio';
import OpenAI from 'openai';

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  : null;

interface ProductData {
  nomeProdotto: string;
  descrizioneProdotto: string;
  caratteristiche: string[];
  funzionalita: string[];
  compatibilita: string[];
  vantaggi: string[];
  riconoscimenti: string[];
  prezzoOriginale: number;
  cosaRicevi: string[];
  passaggiAcquisto: string[];
  garanzie: string[];
}

/**
 * Estrae il contenuto HTML da un URL
 */
async function fetchProductPage(url: string): Promise<string> {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      timeout: 30000
    });
    return response.data;
  } catch (error: any) {
    console.error(`[preventivoAI] Error fetching ${url}:`, error.message);
    throw new Error(`Impossibile recuperare i dati dal link: ${url}`);
  }
}

/**
 * Estrae il testo principale da HTML usando cheerio
 */
function extractMainContent(html: string): string {
  const $ = cheerio.load(html);

  // Rimuovi script, style, header, footer, nav
  $('script, style, header, footer, nav, iframe, noscript').remove();

  // Estrai il testo principale
  const mainContent = $('body').text()
    .replace(/\s+/g, ' ')  // Normalizza spazi
    .trim()
    .substring(0, 15000);  // Limita a 15000 caratteri per non saturare l'AI

  return mainContent;
}

/**
 * Chiama OpenAI GPT-4 per estrarre dati strutturati dal contenuto della pagina prodotto
 */
async function extractProductDataWithAI(content: string, url: string): Promise<ProductData> {
  const prompt = `Sei un assistente esperto nell'analisi di pagine prodotto e creazione di preventivi professionali.

Analizza il seguente contenuto di una pagina prodotto e estrai tutte le informazioni rilevanti in formato JSON strutturato.

URL PRODOTTO: ${url}

CONTENUTO PAGINA:
${content}

ISTRUZIONI:
Estrai le seguenti informazioni e restituisci un JSON valido con questa struttura esatta:

{
  "nomeProdotto": "Nome completo del prodotto",
  "descrizioneProdotto": "Descrizione dettagliata del prodotto (2-3 paragrafi)",
  "caratteristiche": ["caratteristica 1", "caratteristica 2", "caratteristica 3"],
  "funzionalita": ["funzionalità 1", "funzionalità 2", "funzionalità 3"],
  "compatibilita": ["dispositivo/sistema 1", "dispositivo/sistema 2"],
  "vantaggi": ["vantaggio 1", "vantaggio 2", "vantaggio 3"],
  "riconoscimenti": ["certificazione/riconoscimento 1", "certificazione/riconoscimento 2"],
  "prezzoOriginale": 99.99,
  "cosaRicevi": ["cosa include 1", "cosa include 2", "cosa include 3"],
  "passaggiAcquisto": ["Step 1: ...", "Step 2: ...", "Step 3: ..."],
  "garanzie": ["garanzia 1", "garanzia 2", "garanzia 3"]
}

REGOLE IMPORTANTI:
- Il prezzo deve essere un numero (float), NON una stringa. Cerca prezzi nella pagina e converti correttamente.
- Se un array è vuoto, metti almeno un elemento generico ma pertinente
- Descrizione prodotto deve essere professionale e dettagliata (almeno 100 parole)
- Caratteristiche devono essere specifiche tecniche
- Funzionalità devono essere cosa può fare il prodotto
- Compatibilità: dispositivi/sistemi operativi supportati
- Vantaggi: benefici per l'utente
- Riconoscimenti: certificazioni, premi, recensioni positive
- Cosa ricevi: tutto ciò che è incluso nell'acquisto
- Passaggi acquisto: procedura per acquistare (step by step)
- Garanzie: garanzie offerte, supporto, politiche reso

RISPOSTA:
Restituisci SOLO il JSON, senza spiegazioni o markdown. JSON valido:`;

  try {
    if (!openai) throw new Error("OpenAI API key non configurata");
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "Sei un assistente esperto nell'analisi di pagine prodotto. Rispondi SOLO con JSON valido, senza markdown o spiegazioni."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 2500
    });

    const response = completion.choices[0]?.message?.content || '{}';

    // Pulisci il response da eventuali markdown
    let jsonText = response.trim();
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```\n?/g, '');
    }

    const productData = JSON.parse(jsonText) as ProductData;

    // Validazione e fallback
    if (!productData.nomeProdotto) {
      productData.nomeProdotto = 'Prodotto da URL fornito';
    }
    if (!productData.descrizioneProdotto) {
      productData.descrizioneProdotto = 'Prodotto di alta qualità';
    }
    if (!productData.prezzoOriginale || isNaN(productData.prezzoOriginale)) {
      productData.prezzoOriginale = 0;
    }
    if (!Array.isArray(productData.caratteristiche)) {
      productData.caratteristiche = [];
    }
    if (!Array.isArray(productData.funzionalita)) {
      productData.funzionalita = [];
    }
    if (!Array.isArray(productData.compatibilita)) {
      productData.compatibilita = [];
    }
    if (!Array.isArray(productData.vantaggi)) {
      productData.vantaggi = [];
    }
    if (!Array.isArray(productData.riconoscimenti)) {
      productData.riconoscimenti = [];
    }
    if (!Array.isArray(productData.cosaRicevi)) {
      productData.cosaRicevi = [];
    }
    if (!Array.isArray(productData.passaggiAcquisto)) {
      productData.passaggiAcquisto = [];
    }
    if (!Array.isArray(productData.garanzie)) {
      productData.garanzie = [];
    }

    console.log('[preventivoAI] Dati estratti con successo:', productData.nomeProdotto);

    return productData;
  } catch (error: any) {
    console.error('[preventivoAI] Error parsing AI response:', error.message);
    throw new Error('Impossibile estrarre dati strutturati dal prodotto');
  }
}

/**
 * Funzione principale: analizza uno o più link prodotti e combina i dati
 */
export async function analyzeProductLinks(links: string[]): Promise<ProductData> {
  if (!links || links.length === 0) {
    throw new Error('Nessun link fornito');
  }

  console.log(`[preventivoAI] Analisi di ${links.length} link prodotti...`);

  // Analizza il primo link (principale)
  const mainLink = links[0];
  const html = await fetchProductPage(mainLink);
  const content = extractMainContent(html);
  const productData = await extractProductDataWithAI(content, mainLink);

  // Se ci sono più link, analizza anche quelli e combina i dati
  if (links.length > 1) {
    for (let i = 1; i < links.length; i++) {
      try {
        const additionalHtml = await fetchProductPage(links[i]);
        const additionalContent = extractMainContent(additionalHtml);
        const additionalData = await extractProductDataWithAI(additionalContent, links[i]);

        // Combina i dati (aggiungi senza duplicare)
        productData.caratteristiche = [
          ...productData.caratteristiche,
          ...additionalData.caratteristiche.filter(c => !productData.caratteristiche.includes(c))
        ];
        productData.funzionalita = [
          ...productData.funzionalita,
          ...additionalData.funzionalita.filter(f => !productData.funzionalita.includes(f))
        ];
        productData.compatibilita = [
          ...productData.compatibilita,
          ...additionalData.compatibilita.filter(c => !productData.compatibilita.includes(c))
        ];
        productData.vantaggi = [
          ...productData.vantaggi,
          ...additionalData.vantaggi.filter(v => !productData.vantaggi.includes(v))
        ];
        productData.riconoscimenti = [
          ...productData.riconoscimenti,
          ...additionalData.riconoscimenti.filter(r => !productData.riconoscimenti.includes(r))
        ];
        productData.cosaRicevi = [
          ...productData.cosaRicevi,
          ...additionalData.cosaRicevi.filter(c => !productData.cosaRicevi.includes(c))
        ];
        productData.garanzie = [
          ...productData.garanzie,
          ...additionalData.garanzie.filter(g => !productData.garanzie.includes(g))
        ];

        // Aggiorna prezzo se il nuovo è diverso da 0 e maggiore
        if (additionalData.prezzoOriginale > productData.prezzoOriginale) {
          productData.prezzoOriginale = additionalData.prezzoOriginale;
        }
      } catch (error: any) {
        console.warn(`[preventivoAI] Errore nell'analisi del link aggiuntivo ${links[i]}:`, error.message);
      }
    }
  }

  return productData;
}

/**
 * Genera una descrizione completa del preventivo con AI
 */
export async function generatePreventivoDescription(productData: ProductData): Promise<string> {
  const prompt = `Sei un commerciale esperto. Scrivi una descrizione professionale e persuasiva per un preventivo di vendita del seguente prodotto:

PRODOTTO: ${productData.nomeProdotto}
DESCRIZIONE BASE: ${productData.descrizioneProdotto}
CARATTERISTICHE: ${productData.caratteristiche.join(', ')}
VANTAGGI: ${productData.vantaggi.join(', ')}
PREZZO: €${productData.prezzoOriginale}

Scrivi 2-3 paragrafi professionali che:
1. Presentano il prodotto in modo accattivante
2. Evidenziano i benefici principali per il cliente
3. Creano valore e giustificano il prezzo

Scrivi in italiano professionale, tono persuasivo ma non invadente.`;

  try {
    if (!openai) throw new Error("OpenAI API key non configurata");
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "Sei un commerciale esperto che scrive descrizioni professionali per preventivi di vendita."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 800
    });

    return completion.choices[0]?.message?.content || productData.descrizioneProdotto;
  } catch (error) {
    console.error('[preventivoAI] Error generating description:', error);
    return productData.descrizioneProdotto;
  }
}
