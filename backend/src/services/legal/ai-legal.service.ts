import OpenAI from 'openai';
import normativaService from './normattiva.service';
import cassazioneService from './cassazione.service';

/**
 * Servizio AI per assistenza legale con RAG
 * Usa OpenAI GPT-4 + documenti legali come context
 */
class AILegalService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  /**
   * Risponde a domande legali con context-aware AI
   */
  async answerLegalQuestion(question: string): Promise<{
    answer: string;
    sources: any[];
    confidence: number;
  }> {
    try {
      // 1. Cerca documenti rilevanti
      const [legislation, sentences] = await Promise.all([
        normativaService.searchLegislation(question),
        cassazioneService.searchSentences({ text: question })
      ]);

      // 2. Combina i risultati più rilevanti
      const topLegislation = legislation.slice(0, 2);
      const topSentences = sentences.slice(0, 3);

      // 3. Costruisci il context
      const context = this.buildContext(topLegislation, topSentences);

      // 4. Chiedi a GPT-4
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: `Sei un assistente legale esperto in diritto italiano.

REGOLE IMPORTANTI:
1. Rispondi SOLO basandoti sui documenti forniti nel CONTEXT
2. Se la risposta non è presente nei documenti, dillo chiaramente
3. Cita SEMPRE le fonti specifiche (numero legge, sentenza, articolo)
4. Usa un linguaggio chiaro ma professionale
5. Se ci sono interpretazioni diverse, menzionale tutte

CONTEXT (Documenti Legali):
${context}

Se il context è vuoto o non sufficiente, rispondi: "Non ho trovato documenti rilevanti per rispondere alla tua domanda. Prova a riformulare o a fornire più dettagli."`
          },
          {
            role: 'user',
            content: question
          }
        ],
        temperature: 0.3, // Più deterministico per risposte legali
        max_tokens: 1500,
        presence_penalty: 0.1,
        frequency_penalty: 0.1
      });

      const answer = response.choices[0].message.content || 'Nessuna risposta generata';

      // 5. Calcola confidence basato sulla lunghezza del context
      const confidence = this.calculateConfidence(context, answer);

      return {
        answer,
        sources: [
          ...topLegislation.map(l => ({
            tipo: l.tipo,
            titolo: l.titolo,
            numero: l.numero,
            anno: l.anno,
            relevance: l.relevance
          })),
          ...topSentences.map(s => ({
            tipo: 'Sentenza',
            titolo: `Sentenza n. ${s.numero}/${s.anno}`,
            sezione: s.sezione,
            data: s.data,
            relevance: s.relevance
          }))
        ],
        confidence
      };

    } catch (error: any) {
      console.error('AI Legal answer error:', error.message);
      throw new Error('Errore nell\'elaborazione della richiesta AI');
    }
  }

  /**
   * Analizza un caso e trova sentenze simili
   */
  async analyzeSimilarCases(caseDescription: string): Promise<{
    similarCases: any[];
    analysis: string;
    recommendations: string[];
  }> {
    try {
      // 1. Cerca sentenze simili
      const sentences = await cassazioneService.searchSentences({
        text: caseDescription
      });

      const topSentences = sentences.slice(0, 5);

      // 2. Analizza con GPT-4
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: 'Sei un esperto legale. Analizza le sentenze fornite ed estrai i principi comuni.'
          },
          {
            role: 'user',
            content: `Caso: ${caseDescription}

Sentenze simili trovate:
${topSentences.map((s, i) => `
${i + 1}. Sentenza ${s.numero}/${s.anno} - ${s.sezione}
   Massima: ${s.massima}
   Dispositivo: ${s.dispositivo}
`).join('\n')}

Fornisci:
1. Un'analisi dei principi comuni
2. Suggerimenti strategici basati sulla giurisprudenza`
          }
        ],
        temperature: 0.4,
        max_tokens: 1000
      });

      const analysis = response.choices[0].message.content || '';

      // 3. Estrai raccomandazioni
      const recommendations = this.extractRecommendations(analysis);

      return {
        similarCases: topSentences,
        analysis,
        recommendations
      };

    } catch (error: any) {
      console.error('Analyze similar cases error:', error.message);
      throw new Error('Errore nell\'analisi dei casi simili');
    }
  }

  /**
   * Genera draft di documento legale
   */
  async generateLegalDocument(params: {
    tipo: 'atto_citazione' | 'ricorso' | 'memoria' | 'contratto';
    parti: any;
    fatti: string;
    richieste: string;
  }): Promise<string> {
    try {
      const prompt = this.buildDocumentPrompt(params);

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: 'Sei un avvocato esperto nella redazione di atti legali secondo la prassi italiana.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.5,
        max_tokens: 2000
      });

      return response.choices[0].message.content || '';

    } catch (error: any) {
      console.error('Generate document error:', error.message);
      throw new Error('Errore nella generazione del documento');
    }
  }

  /**
   * Costruisce il context per RAG
   */
  private buildContext(legislation: any[], sentences: any[]): string {
    let context = '';

    if (legislation.length > 0) {
      context += '=== NORMATIVA ===\n\n';
      legislation.forEach(l => {
        context += `[${l.tipo}] ${l.titolo}\n`;
        context += `Numero: ${l.numero}/${l.anno}\n`;
        context += `Descrizione: ${l.descrizione}\n`;
        context += `Pubblicazione: ${l.gazzetta}\n`;
        context += '---\n\n';
      });
    }

    if (sentences.length > 0) {
      context += '=== GIURISPRUDENZA ===\n\n';
      sentences.forEach(s => {
        context += `[Sentenza] ${s.numero}/${s.anno} - ${s.sezione}\n`;
        context += `Data: ${s.data}\n`;
        context += `Massima: ${s.massima}\n`;
        context += `Dispositivo: ${s.dispositivo}\n`;
        context += '---\n\n';
      });
    }

    return context || 'Nessun documento rilevante trovato.';
  }

  /**
   * Calcola confidence della risposta
   */
  private calculateConfidence(context: string, answer: string): number {
    if (context.includes('Nessun documento')) return 0.2;
    if (answer.includes('Non ho trovato')) return 0.3;

    // Confidence basato su lunghezza context e presenza citazioni
    const contextScore = Math.min(context.length / 1000, 1);
    const citationScore = (answer.match(/sentenza|legge|articolo/gi) || []).length / 5;

    return Math.min((contextScore + citationScore) / 2, 1);
  }

  /**
   * Estrae raccomandazioni dal testo
   */
  private extractRecommendations(analysis: string): string[] {
    const recommendations: string[] = [];

    // Cerca pattern di raccomandazioni
    const lines = analysis.split('\n');
    lines.forEach(line => {
      if (
        line.includes('suggerimento') ||
        line.includes('consiglio') ||
        line.includes('raccomand') ||
        line.match(/^\d+\./) ||
        line.match(/^-/)
      ) {
        const clean = line.replace(/^\d+\.|^-/, '').trim();
        if (clean.length > 20) {
          recommendations.push(clean);
        }
      }
    });

    return recommendations.slice(0, 5);
  }

  /**
   * Costruisce prompt per generazione documenti
   */
  private buildDocumentPrompt(params: any): string {
    return `Genera un ${params.tipo} professionale con i seguenti elementi:

PARTI:
${JSON.stringify(params.parti, null, 2)}

FATTI:
${params.fatti}

RICHIESTE:
${params.richieste}

Il documento deve:
- Seguire la struttura standard italiana
- Usare linguaggio giuridico appropriato
- Includere tutti gli elementi formali richiesti
- Essere completo e pronto per la firma`;
  }
}

export default new AILegalService();
