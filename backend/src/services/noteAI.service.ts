import OpenAI from "openai";
import prisma from "../config/database";
import fs from "fs";
import path from "path";
import { Readable } from "stream";

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  : null;

class NoteAIService {
  private ensureOpenAI() {
    if (!openai) {
      throw new Error("OpenAI API key non configurata. Le funzionalità AI non sono disponibili.");
    }
  }
  /**
   * Genera un riassunto della nota
   */
  async generateSummary(contenuto: string): Promise<string> {
    this.ensureOpenAI();
    try {
      const response = await openai!.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "Sei un assistente che crea riassunti concisi e accurati. Crea un riassunto in italiano del testo fornito, evidenziando i punti chiave in 2-3 frasi.",
          },
          {
            role: "user",
            content: `Riassumi questo testo:\n\n${contenuto}`,
          },
        ],
        max_tokens: 200,
        temperature: 0.5,
      });

      return response.choices[0]?.message?.content || "Impossibile generare il riassunto";
    } catch (error) {
      console.error("Errore generazione riassunto:", error);
      throw new Error("Errore nella generazione del riassunto");
    }
  }

  /**
   * Converte il testo in bullet points
   */
  async generateBulletPoints(contenuto: string): Promise<string> {
    this.ensureOpenAI();
    try {
      const response = await openai!.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "Sei un assistente che organizza informazioni in modo strutturato. Converti il testo in una lista di bullet points chiari e concisi in italiano.",
          },
          {
            role: "user",
            content: `Converti in bullet points:\n\n${contenuto}`,
          },
        ],
        max_tokens: 500,
        temperature: 0.3,
      });

      return response.choices[0]?.message?.content || "Impossibile generare i bullet points";
    } catch (error) {
      console.error("Errore generazione bullet points:", error);
      throw new Error("Errore nella generazione dei bullet points");
    }
  }

  /**
   * Corregge grammatica e ortografia
   */
  async correctGrammar(contenuto: string): Promise<string> {
    this.ensureOpenAI();
    try {
      const response = await openai!.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "Sei un correttore di bozze esperto. Correggi grammatica, ortografia e punteggiatura del testo mantenendo lo stile originale. Rispondi SOLO con il testo corretto, senza spiegazioni.",
          },
          {
            role: "user",
            content: contenuto,
          },
        ],
        temperature: 0.2,
      });

      return response.choices[0]?.message?.content || contenuto;
    } catch (error) {
      console.error("Errore correzione grammaticale:", error);
      throw new Error("Errore nella correzione grammaticale");
    }
  }

  /**
   * Traduce il testo
   */
  async translate(contenuto: string, targetLang: string = "en"): Promise<string> {
    this.ensureOpenAI();
    try {
      const langMap: Record<string, string> = {
        en: "inglese",
        it: "italiano",
        es: "spagnolo",
        fr: "francese",
        de: "tedesco",
        pt: "portoghese",
        ru: "russo",
        zh: "cinese",
        ja: "giapponese",
      };

      const targetLanguage = langMap[targetLang] || targetLang;

      const response = await openai!.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `Sei un traduttore professionista. Traduci il testo in ${targetLanguage} mantenendo il significato e lo stile originale. Rispondi SOLO con la traduzione, senza spiegazioni.`,
          },
          {
            role: "user",
            content: contenuto,
          },
        ],
        temperature: 0.3,
      });

      return response.choices[0]?.message?.content || contenuto;
    } catch (error) {
      console.error("Errore traduzione:", error);
      throw new Error("Errore nella traduzione");
    }
  }

  /**
   * Espande una nota breve in una più dettagliata
   */
  async expandNote(contenuto: string): Promise<string> {
    this.ensureOpenAI();
    try {
      const response = await openai!.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "Sei un assistente che espande note brevi in versioni più dettagliate e complete. Aggiungi contesto, esempi e dettagli mantenendo il significato originale. Scrivi in italiano.",
          },
          {
            role: "user",
            content: `Espandi questa nota in una versione più dettagliata:\n\n${contenuto}`,
          },
        ],
        max_tokens: 1000,
        temperature: 0.7,
      });

      return response.choices[0]?.message?.content || contenuto;
    } catch (error) {
      console.error("Errore espansione nota:", error);
      throw new Error("Errore nell'espansione della nota");
    }
  }

  /**
   * Trascrivi audio in testo usando Whisper API
   */
  async transcribeAudio(audioBuffer: Buffer, filename: string, language: string = "it"): Promise<{
    text: string;
    duration: number;
    language: string;
  }> {
    this.ensureOpenAI();
    let tempFilePath: string | null = null;

    try {
      // Crea un file temporaneo
      const tempDir = path.join(process.cwd(), 'temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      tempFilePath = path.join(tempDir, `${Date.now()}-${filename}`);
      fs.writeFileSync(tempFilePath, audioBuffer);

      // Crea un file stream per OpenAI
      const fileStream = fs.createReadStream(tempFilePath);

      const response = await openai!.audio.transcriptions.create({
        file: fileStream as any,
        model: "whisper-1",
        language: language,
        response_format: "verbose_json",
      });

      return {
        text: response.text,
        duration: (response as any).duration || 0,
        language: (response as any).language || language,
      };
    } catch (error) {
      console.error("Errore trascrizione audio:", error);
      throw new Error("Errore nella trascrizione audio");
    } finally {
      // Elimina file temporaneo
      if (tempFilePath && fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
    }
  }

  /**
   * Genera una nota da un prompt
   */
  async generateFromPrompt(prompt: string, userId: string): Promise<{
    titolo: string;
    contenuto: string;
  }> {
    this.ensureOpenAI();
    try {
      const response = await openai!.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "Sei un assistente che crea note strutturate e ben organizzate. Genera una nota completa in italiano basata sul prompt dell'utente. La nota deve essere in formato Markdown e includere titoli, sottotitoli, bullet points e paragrafi dove appropriato.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        max_tokens: 2000,
        temperature: 0.7,
      });

      const contenuto = response.choices[0]?.message?.content || "";

      // Estrai il primo titolo come titolo della nota
      const firstLineMatch = contenuto.match(/^#\s+(.+)/m);
      const titolo =
        firstLineMatch?.[1] ||
        prompt.slice(0, 50) + (prompt.length > 50 ? "..." : "");

      return {
        titolo,
        contenuto,
      };
    } catch (error) {
      console.error("Errore generazione nota da prompt:", error);
      throw new Error("Errore nella generazione della nota");
    }
  }

  /**
   * Genera note dall'ultima trascrizione di una videochiamata
   */
  async generateNotesFromTranscription(transcriptionText: string): Promise<{
    summary: string;
    actionItems: string[];
    keyPoints: string[];
  }> {
    this.ensureOpenAI();
    try {
      const response = await openai!.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "Sei un assistente che analizza trascrizioni di meeting. Estrai dal testo: 1) Un riassunto conciso, 2) Action items (compiti da fare), 3) Punti chiave discussi. Rispondi in formato JSON con le chiavi: summary, actionItems (array), keyPoints (array). Scrivi tutto in italiano.",
          },
          {
            role: "user",
            content: transcriptionText,
          },
        ],
        max_tokens: 1000,
        temperature: 0.5,
        response_format: { type: "json_object" },
      });

      const result = JSON.parse(response.choices[0]?.message?.content || "{}");

      return {
        summary: result.summary || "",
        actionItems: result.actionItems || [],
        keyPoints: result.keyPoints || [],
      };
    } catch (error) {
      console.error("Errore analisi trascrizione:", error);
      throw new Error("Errore nell'analisi della trascrizione");
    }
  }

  /**
   * Genera riassunto completo del meeting da chat messages
   */
  async generateMeetingSummary(roomId: string): Promise<{
    titolo: string;
    summary: string;
    actionItems: string[];
    keyPoints: string[];
    participants: string[];
    duration: string;
  }> {
    this.ensureOpenAI();
    try {
      // Recupera messaggi della chat e info room
      const room = await prisma.videoRoom.findUnique({
        where: { id: roomId },
        include: {
          creatore: { select: { nome: true, cognome: true } }
        }
      });

      // Get messages separately
      const messages = await prisma.videoRoomMessage.findMany({
        where: { roomId },
        include: {
          user: { select: { nome: true, cognome: true } }
        },
        orderBy: { createdAt: 'asc' }
      });

      if (!room) {
        throw new Error("Room non trovata");
      }

      // Costruisci trascrizione dai messaggi
      const transcript = messages.map(msg =>
        `${msg.user.nome} ${msg.user.cognome}: ${msg.messaggio}`
      ).join('\n');

      // Estrai partecipanti unici
      const participants = Array.from(new Set(
        messages.map(msg => `${msg.user.nome} ${msg.user.cognome}`)
      ));

      // Calcola durata (differenza tra primo e ultimo messaggio)
      let duration = "N/A";
      if (messages.length > 1) {
        const start = new Date(messages[0].createdAt);
        const end = new Date(messages[messages.length - 1].createdAt);
        const diffMinutes = Math.floor((end.getTime() - start.getTime()) / 60000);
        duration = `${diffMinutes} minuti`;
      }

      // Genera analisi AI
      let analysis = {
        summary: "",
        actionItems: [] as string[],
        keyPoints: [] as string[]
      };

      if (transcript.trim()) {
        analysis = await this.generateNotesFromTranscription(transcript);
      }

      return {
        titolo: `Meeting: ${room.nome}`,
        summary: analysis.summary || "Nessuna discussione rilevata nella chat",
        actionItems: analysis.actionItems,
        keyPoints: analysis.keyPoints,
        participants,
        duration
      };
    } catch (error) {
      console.error("Errore generazione riassunto meeting:", error);
      throw new Error("Errore nella generazione del riassunto meeting");
    }
  }

  /**
   * Genera note strutturate complete del meeting
   */
  async generateMeetingNotes(roomId: string): Promise<string> {
    try {
      const summary = await this.generateMeetingSummary(roomId);

      // Genera nota formattata in markdown
      const noteContent = `# ${summary.titolo}

## Informazioni Meeting
- **Durata**: ${summary.duration}
- **Partecipanti**: ${summary.participants.join(', ')}
- **Data**: ${new Date().toLocaleDateString('it-IT', {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric'
})}

## Riassunto
${summary.summary}

## Punti Chiave
${summary.keyPoints.map((point, i) => `${i + 1}. ${point}`).join('\n')}

## Action Items
${summary.actionItems.map((item, i) => `- [ ] ${item}`).join('\n')}

---
*Nota generata automaticamente da Planora AI*
`;

      return noteContent;
    } catch (error) {
      console.error("Errore generazione note meeting:", error);
      throw new Error("Errore nella generazione delle note meeting");
    }
  }
}

export default new NoteAIService();
