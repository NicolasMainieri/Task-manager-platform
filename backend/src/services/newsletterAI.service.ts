import OpenAI from "openai";

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    })
  : null;

// Eventi promozionali noti con date tipiche
const PROMOTIONAL_EVENTS = {
  black_friday: {
    nome: "Black Friday",
    descrizione: "Ultimo venerdì di novembre, evento di shopping globale",
    mese: 11, // Novembre
    giorno: "ultimo venerdì",
    durataGiorni: 3,
    suggerimenti: [
      "Offerte limitate nel tempo",
      "Sconti importanti (30-70%)",
      "Urgenza e scarsità",
      "Countdown timer"
    ]
  },
  cyber_monday: {
    nome: "Cyber Monday",
    descrizione: "Lunedì dopo il Thanksgiving, sconti per prodotti tech",
    mese: 11,
    giorno: "lunedì dopo Thanksgiving",
    durataGiorni: 1,
    suggerimenti: [
      "Focus su prodotti tecnologici",
      "Offerte flash",
      "Sconti su bundle",
      "Free shipping"
    ]
  },
  natale: {
    nome: "Natale",
    descrizione: "Periodo natalizio, regali e celebrazioni",
    mese: 12,
    giorno: "1-25",
    durataGiorni: 25,
    suggerimenti: [
      "Idee regalo",
      "Gift cards",
      "Confezioni regalo gratuite",
      "Tema festivo e caldo"
    ]
  },
  capodanno: {
    nome: "Capodanno",
    descrizione: "Fine anno, nuovi inizi e obiettivi",
    mese: 12,
    giorno: "26-31",
    durataGiorni: 6,
    suggerimenti: [
      "Nuovi inizi",
      "Buoni propositi",
      "Liquidazione fine anno",
      "Preparazione per il nuovo anno"
    ]
  },
  san_valentino: {
    nome: "San Valentino",
    descrizione: "14 febbraio, giorno degli innamorati",
    mese: 2,
    giorno: "14",
    durataGiorni: 7,
    suggerimenti: [
      "Regali romantici",
      "Tema cuori e rose",
      "Pacchetti coppia",
      "Messaggi d'amore"
    ]
  },
  pasqua: {
    nome: "Pasqua",
    descrizione: "Marzo/Aprile, festività primaverile",
    mese: 4, // Varia ogni anno
    giorno: "variabile",
    durataGiorni: 10,
    suggerimenti: [
      "Tema primaverile",
      "Colori pastello",
      "Regali per bambini",
      "Decorazioni pasquali"
    ]
  },
  festa_mamma: {
    nome: "Festa della Mamma",
    descrizione: "Seconda domenica di maggio",
    mese: 5,
    giorno: "seconda domenica",
    durataGiorni: 7,
    suggerimenti: [
      "Regali personalizzati",
      "Tema famiglia",
      "Fiori e gioielli",
      "Esperienze speciali"
    ]
  },
  festa_papa: {
    nome: "Festa del Papà",
    descrizione: "19 marzo in Italia",
    mese: 3,
    giorno: "19",
    durataGiorni: 7,
    suggerimenti: [
      "Regali per papà",
      "Tech e hobby",
      "Esperienze outdoor",
      "Personalizzazioni"
    ]
  },
  estate: {
    nome: "Estate / Saldi Estivi",
    descrizione: "Giugno-Agosto, saldi estivi",
    mese: 7,
    giorno: "1-31",
    durataGiorni: 90,
    suggerimenti: [
      "Liquidazione estate",
      "Prodotti per vacanze",
      "Tema spiaggia e sole",
      "Abbigliamento estivo"
    ]
  },
  halloween: {
    nome: "Halloween",
    descrizione: "31 ottobre, festa spettrale",
    mese: 10,
    giorno: "31",
    durataGiorni: 7,
    suggerimenti: [
      "Tema spettrale",
      "Costumi e decorazioni",
      "Colori arancio e nero",
      "Offerte spaventose"
    ]
  }
};

/**
 * Analizza i periodi promozionali e suggerisce quando inviare newsletter
 */
export async function analyzePromotionalPeriods(dataInizio?: Date, dataFine?: Date) {
  try {
    const oggi = new Date();
    const anno = oggi.getFullYear();

    // Se non specificate, analizza i prossimi 6 mesi
    const start = dataInizio || oggi;
    const end = dataFine || new Date(oggi.getFullYear(), oggi.getMonth() + 6, oggi.getDate());

    const eventiRilevanti: any[] = [];

    // Trova eventi promozionali nel periodo
    for (const [key, evento] of Object.entries(PROMOTIONAL_EVENTS)) {
      // Calcola data approssimativa dell'evento
      let dataEvento: Date;

      if (evento.giorno === "ultimo venerdì") {
        // Black Friday - ultimo venerdì di novembre
        dataEvento = getLastFriday(anno, 10); // 10 = novembre (0-indexed)
      } else if (evento.giorno === "seconda domenica") {
        // Festa della mamma
        dataEvento = getSecondSunday(anno, evento.mese - 1);
      } else if (evento.giorno.includes("-")) {
        // Range di giorni
        const [giornoStart] = evento.giorno.split("-");
        dataEvento = new Date(anno, evento.mese - 1, parseInt(giornoStart));
      } else if (evento.giorno === "variabile") {
        // Pasqua (calcoliamo una data approssimativa)
        dataEvento = new Date(anno, 3, 15); // Circa metà aprile
      } else {
        dataEvento = new Date(anno, evento.mese - 1, parseInt(evento.giorno));
      }

      // Se l'evento è nel periodo analizzato
      if (dataEvento >= start && dataEvento <= end) {
        // Data suggerita per newsletter: 7-10 giorni prima dell'evento
        const dataNewsletterSuggerita = new Date(dataEvento);
        dataNewsletterSuggerita.setDate(dataNewsletterSuggerita.getDate() - 7);

        eventiRilevanti.push({
          evento: key,
          nome: evento.nome,
          descrizione: evento.descrizione,
          dataEvento: dataEvento.toISOString(),
          dataNewsletterSuggerita: dataNewsletterSuggerita.toISOString(),
          giorniMancanti: Math.ceil((dataEvento.getTime() - oggi.getTime()) / (1000 * 60 * 60 * 24)),
          suggerimenti: evento.suggerimenti,
          urgenza: getUrgenza(dataEvento, oggi)
        });
      }
    }

    // Ordina per data evento
    eventiRilevanti.sort((a, b) =>
      new Date(a.dataEvento).getTime() - new Date(b.dataEvento).getTime()
    );

    return {
      periodoAnalisi: {
        da: start.toISOString(),
        a: end.toISOString()
      },
      eventiRilevanti,
      raccomandazioni: generateRecommendations(eventiRilevanti, oggi)
    };

  } catch (error) {
    console.error('[newsletterAI] Errore analisi periodi promozionali:', error);
    throw error;
  }
}

/**
 * Genera una newsletter HTML completa con AI
 */
export async function generateNewsletterHTML(prompt: {
  tipo: string; // 'promozionale', 'informativa', 'evento'
  tema: string;
  contenuto?: string;
  eventoPromozionale?: string;
  aziendaNome?: string;
  coloriAziendali?: { primario: string; secondario: string };
  includeCTA?: boolean;
  ctaText?: string;
  ctaUrl?: string;
}) {
  try {
    const systemPrompt = `Sei un esperto di email marketing e copywriting.
Crea newsletter HTML responsive, moderne e professionali.
Usa inline CSS per massima compatibilità con client email.
Struttura: header con logo/titolo, hero section, contenuto principale, CTA, footer.
Colori vivaci ma professionali, typography leggibile, design mobile-first.`;

    const userPrompt = buildNewsletterPrompt(prompt);

    if (!openai) throw new Error("OpenAI API key non configurata");
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 3000
    });

    const htmlContent = response.choices[0]?.message?.content || "";

    // Estrai HTML se è wrappato in code blocks
    const htmlMatch = htmlContent.match(/```html\n?([\s\S]*?)\n?```/) ||
                      htmlContent.match(/```\n?([\s\S]*?)\n?```/);

    const cleanHTML = htmlMatch ? htmlMatch[1] : htmlContent;

    return {
      html: cleanHTML,
      prompt: userPrompt,
      suggerimenti: await generateContentSuggestions(prompt)
    };

  } catch (error) {
    console.error('[newsletterAI] Errore generazione newsletter:', error);
    throw error;
  }
}

/**
 * Migliora un contenuto newsletter esistente
 */
export async function improveNewsletterContent(contenutoAttuale: string, obiettivo: string) {
  try {
    if (!openai) throw new Error("OpenAI API key non configurata");
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "Sei un esperto di email marketing. Migliora il contenuto delle newsletter mantenendo l'HTML esistente ma rendendo il copy più efficace, coinvolgente e orientato alla conversione."
        },
        {
          role: "user",
          content: `Migliora questa newsletter per: ${obiettivo}\n\nContenuto attuale:\n${contenutoAttuale}`
        }
      ],
      temperature: 0.7,
      max_tokens: 3000
    });

    return response.choices[0]?.message?.content || contenutoAttuale;

  } catch (error) {
    console.error('[newsletterAI] Errore miglioramento contenuto:', error);
    throw error;
  }
}

/**
 * Suggerisce oggetto email accattivante
 */
export async function suggestSubjectLines(tema: string, contenuto: string): Promise<string[]> {
  try {
    if (!openai) throw new Error("OpenAI API key non configurata");
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "Sei un esperto di email marketing. Crea oggetti email accattivanti, brevi (max 60 caratteri), che aumentino il tasso di apertura. Usa emoji quando appropriato."
        },
        {
          role: "user",
          content: `Crea 5 oggetti email diversi per questa newsletter:\nTema: ${tema}\nContenuto: ${contenuto.substring(0, 500)}`
        }
      ],
      temperature: 0.8,
      max_tokens: 300
    });

    const content = response.choices[0]?.message?.content || "";
    const subjects = content.split('\n').filter(line => line.trim().length > 0 && line.match(/^\d\./));
    return subjects.map(s => s.replace(/^\d\.\s*/, '').trim());

  } catch (error) {
    console.error('[newsletterAI] Errore suggerimento oggetti:', error);
    return ["Scopri le novità", "Non perdere questa opportunità", "Speciale per te"];
  }
}

// Helper functions

function getLastFriday(year: number, month: number): Date {
  const lastDay = new Date(year, month + 1, 0); // Ultimo giorno del mese
  const day = lastDay.getDay();
  const diff = day >= 5 ? day - 5 : day + 2; // Differenza per arrivare a venerdì
  return new Date(year, month, lastDay.getDate() - diff);
}

function getSecondSunday(year: number, month: number): Date {
  const first = new Date(year, month, 1);
  const day = first.getDay();
  const diff = day === 0 ? 7 : 14 - day; // Seconda domenica
  return new Date(year, month, diff + 1);
}

function getUrgenza(dataEvento: Date, oggi: Date): 'alta' | 'media' | 'bassa' {
  const giorni = Math.ceil((dataEvento.getTime() - oggi.getTime()) / (1000 * 60 * 60 * 24));
  if (giorni <= 7) return 'alta';
  if (giorni <= 30) return 'media';
  return 'bassa';
}

function generateRecommendations(eventi: any[], oggi: Date): string[] {
  const recommendations: string[] = [];

  eventi.forEach(evento => {
    if (evento.urgenza === 'alta') {
      recommendations.push(`🔴 URGENTE: ${evento.nome} è tra ${evento.giorniMancanti} giorni! Invia la newsletter immediatamente.`);
    } else if (evento.urgenza === 'media') {
      recommendations.push(`🟡 ${evento.nome} si avvicina (${evento.giorniMancanti} giorni). Pianifica l'invio newsletter per ${new Date(evento.dataNewsletterSuggerita).toLocaleDateString('it-IT')}.`);
    } else {
      recommendations.push(`🟢 ${evento.nome} è tra ${evento.giorniMancanti} giorni. Hai tempo per pianificare una campagna efficace.`);
    }
  });

  if (recommendations.length === 0) {
    recommendations.push("✅ Nessun evento promozionale imminente. Considera newsletter informative o di brand awareness.");
  }

  return recommendations;
}

function buildNewsletterPrompt(prompt: any): string {
  let userPrompt = `Crea una newsletter HTML completa e responsive per email.\n\n`;

  userPrompt += `TIPO: ${prompt.tipo}\n`;
  userPrompt += `TEMA: ${prompt.tema}\n`;

  if (prompt.aziendaNome) {
    userPrompt += `AZIENDA: ${prompt.aziendaNome}\n`;
  }

  if (prompt.coloriAziendali) {
    userPrompt += `COLORI BRAND: Primario ${prompt.coloriAziendali.primario}, Secondario ${prompt.coloriAziendali.secondario}\n`;
  }

  if (prompt.eventoPromozionale) {
    const evento = PROMOTIONAL_EVENTS[prompt.eventoPromozionale as keyof typeof PROMOTIONAL_EVENTS];
    if (evento) {
      userPrompt += `EVENTO PROMOZIONALE: ${evento.nome}\n`;
      userPrompt += `SUGGERIMENTI: ${evento.suggerimenti.join(', ')}\n`;
    }
  }

  if (prompt.contenuto) {
    userPrompt += `\nCONTENUTO DA INCLUDERE:\n${prompt.contenuto}\n`;
  }

  if (prompt.includeCTA && prompt.ctaText) {
    userPrompt += `\nCALL TO ACTION: "${prompt.ctaText}"`;
    if (prompt.ctaUrl) {
      userPrompt += ` che porta a ${prompt.ctaUrl}`;
    }
    userPrompt += `\n`;
  }

  userPrompt += `\nREQUISITI TECNICI:
- Usa solo inline CSS per compatibilità email client
- Responsive design (mobile-first)
- Struttura table-based per massima compatibilità
- Font web-safe (Arial, Helvetica, Georgia, etc.)
- Immagini con alt text
- CTA button ben visibile e cliccabile
- Footer con link unsubscribe placeholder
- Max width: 600px

Genera solo il codice HTML completo, senza spiegazioni.`;

  return userPrompt;
}

async function generateContentSuggestions(prompt: any): Promise<string[]> {
  const suggestions = [
    "Usa emoji nell'oggetto per aumentare l'apertura (+10-15%)",
    "Personalizza il saluto con il nome del destinatario",
    "Inserisci social proof (testimonianze, recensioni)",
    "Crea senso di urgenza con countdown o quantità limitate"
  ];

  if (prompt.eventoPromozionale) {
    const evento = PROMOTIONAL_EVENTS[prompt.eventoPromozionale as keyof typeof PROMOTIONAL_EVENTS];
    if (evento) {
      suggestions.push(...evento.suggerimenti.map(s => `💡 ${s}`));
    }
  }

  return suggestions;
}
