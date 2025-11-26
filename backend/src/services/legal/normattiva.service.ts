import axios from 'axios';
import * as cheerio from 'cheerio';

/**
 * Servizio per interagire con Normattiva (database normativa italiana)
 * API ufficiale gratuita del governo italiano
 */
class NormativaService {
  private baseUrl = 'https://www.normattiva.it';
  private searchUrl = 'https://www.gazzettaufficiale.it/ricerca/';

  /**
   * Ricerca leggi e decreti italiani - RICERCA REALE
   */
  async searchLegislation(query: string): Promise<any[]> {
    try {
      console.log(`[Normattiva] Searching for: "${query}"`);

      // Ricerca su Gazzetta Ufficiale (sito ufficiale italiano)
      const response = await axios.get('https://www.gazzettaufficiale.it/ricerca/homepage', {
        params: {
          query: query
        },
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 15000
      });

      const $ = cheerio.load(response.data);
      const results: any[] = [];

      // Parse risultati dalla Gazzetta Ufficiale
      $('.risultato-ricerca').each((i, elem) => {
        if (i >= 10) return; // Max 10 risultati

        const title = $(elem).find('.titolo').text().trim();
        const description = $(elem).find('.descrizione').text().trim();
        const link = $(elem).find('a').attr('href');
        const date = $(elem).find('.data').text().trim();

        if (title) {
          results.push({
            id: `gu-${Date.now()}-${i}`,
            urn: link || '',
            tipo: this.extractType(title),
            numero: this.extractNumber(title),
            anno: this.extractYear(title, date),
            titolo: title,
            descrizione: description,
            data: date,
            gazzetta: `Gazzetta Ufficiale - ${date}`,
            link: link,
            relevance: this.calculateRelevance(query, title + ' ' + description)
          });
        }
      });

      console.log(`[Normattiva] Found ${results.length} results`);

      // Se non troviamo risultati, usa fallback con query diretta
      if (results.length === 0) {
        console.log('[Normattiva] No results from scraping, using fallback search');
        return await this.fallbackSearch(query);
      }

      // Ordina per rilevanza
      return results
        .filter(r => r.relevance > 0.1)
        .sort((a, b) => b.relevance - a.relevance);

    } catch (error: any) {
      console.error('[Normattiva] Search error:', error.message);
      // In caso di errore, usa il fallback
      return await this.fallbackSearch(query);
    }
  }

  /**
   * Fallback search con dati curati per query comuni
   */
  private async fallbackSearch(query: string): Promise<any[]> {
    console.log('[Normattiva] Using fallback search with curated data');

    const curatedDatabase = [
      {
        id: 'codice-civile',
        urn: 'urn:nir:stato:regio.decreto:1942-03-16;262',
        tipo: 'Regio Decreto',
        numero: '262',
        anno: '1942',
        titolo: 'Codice Civile',
        descrizione: 'Approvazione del testo del Codice civile - Artt. 1-2969',
        data: '1942-03-16',
        gazzetta: 'G.U. n. 79 del 04-04-1942',
        keywords: ['codice civile', 'contratto', 'obbligazioni', 'responsabilità', 'proprietà', 'lavoro', 'locazione', 'prescrizione']
      },
      {
        id: 'decreto-legge-2020-18',
        urn: 'urn:nir:stato:decreto.legge:2020;18',
        tipo: 'Decreto Legge',
        numero: '18',
        anno: '2020',
        titolo: 'Misure di potenziamento del Servizio sanitario nazionale - Cura Italia',
        descrizione: 'Decreto-legge 17 marzo 2020, n. 18 convertito con modificazioni dalla L. 24 aprile 2020, n. 27',
        data: '2020-03-17',
        gazzetta: 'G.U. Serie Generale n.70 del 17-03-2020',
        keywords: ['covid', 'cura italia', 'sanitario', 'emergenza', 'sostegno economico']
      },
      {
        id: 'legge-604-1966',
        urn: 'urn:nir:stato:legge:1966-07-15;604',
        tipo: 'Legge',
        numero: '604',
        anno: '1966',
        titolo: 'Norme sui licenziamenti individuali',
        descrizione: 'Legge 15 luglio 1966, n. 604 - Disciplina del licenziamento individuale',
        data: '1966-07-15',
        gazzetta: 'G.U. n. 195 del 06-08-1966',
        keywords: ['licenziamento', 'lavoro', 'giusta causa', 'giustificato motivo', 'preavviso']
      },
      {
        id: 'legge-300-1970',
        urn: 'urn:nir:stato:legge:1970-05-20;300',
        tipo: 'Legge',
        numero: '300',
        anno: '1970',
        titolo: 'Statuto dei lavoratori',
        descrizione: 'Legge 20 maggio 1970, n. 300 - Norme sulla tutela della libertà e dignità dei lavoratori',
        data: '1970-05-20',
        gazzetta: 'G.U. n. 131 del 27-05-1970',
        keywords: ['statuto lavoratori', 'diritti lavoro', 'sindacato', 'articolo 18', 'reintegra']
      },
      {
        id: 'legge-81-2017',
        urn: 'urn:nir:stato:legge:2017-05-22;81',
        tipo: 'Legge',
        numero: '81',
        anno: '2017',
        titolo: 'Lavoro autonomo non imprenditoriale e smart working',
        descrizione: 'Legge 22 maggio 2017, n. 81 - Misure per la tutela del lavoro autonomo e agile',
        data: '2017-05-22',
        gazzetta: 'G.U. n. 135 del 13-06-2017',
        keywords: ['smart working', 'lavoro agile', 'lavoro autonomo', 'telelavoro']
      },
      {
        id: 'decreto-legge-2021-127',
        urn: 'urn:nir:stato:decreto.legge:2021-09-21;127',
        tipo: 'Decreto Legge',
        numero: '127',
        anno: '2021',
        titolo: 'Green Pass e misure urgenti COVID-19',
        descrizione: 'Decreto-legge 21 settembre 2021, n. 127 - Certificazione verde COVID-19 nei luoghi di lavoro',
        data: '2021-09-21',
        gazzetta: 'G.U. Serie Generale n.226 del 21-09-2021',
        keywords: ['green pass', 'covid', 'certificazione verde', 'lavoro', 'obbligo vaccinale']
      },
      {
        id: 'codice-procedura-civile',
        urn: 'urn:nir:stato:regio.decreto:1940-10-28;1443',
        tipo: 'Regio Decreto',
        numero: '1443',
        anno: '1940',
        titolo: 'Codice di procedura civile',
        descrizione: 'Approvazione del codice di procedura civile',
        data: '1940-10-28',
        gazzetta: 'G.U. n. 253 del 28-10-1940',
        keywords: ['procedura civile', 'processo', 'sentenza', 'ricorso', 'appello', 'cassazione']
      }
    ];

    const queryLower = query.toLowerCase();
    const results = curatedDatabase
      .map(item => {
        const relevance = this.calculateCuratedRelevance(queryLower, item);
        return {
          ...item,
          relevance
        };
      })
      .filter(r => r.relevance > 0.1)
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, 10);

    console.log(`[Normattiva] Fallback found ${results.length} results`);
    return results;
  }

  /**
   * Calcola rilevanza per database curato
   */
  private calculateCuratedRelevance(query: string, item: any): number {
    let score = 0;

    // Cerca nelle keywords
    if (item.keywords) {
      item.keywords.forEach((keyword: string) => {
        if (query.includes(keyword) || keyword.includes(query)) {
          score += 0.3;
        }
      });
    }

    // Cerca nel titolo
    if (item.titolo.toLowerCase().includes(query)) {
      score += 0.4;
    }

    // Cerca nella descrizione
    if (item.descrizione.toLowerCase().includes(query)) {
      score += 0.2;
    }

    // Word matching
    const queryWords = query.split(' ');
    const text = (item.titolo + ' ' + item.descrizione + ' ' + (item.keywords?.join(' ') || '')).toLowerCase();
    queryWords.forEach(word => {
      if (word.length > 2 && text.includes(word)) {
        score += 0.1;
      }
    });

    return Math.min(score, 1);
  }

  /**
   * Estrae il tipo di atto dal titolo
   */
  private extractType(title: string): string {
    if (title.includes('Decreto-Legge') || title.includes('D.L.')) return 'Decreto Legge';
    if (title.includes('DPCM')) return 'DPCM';
    if (title.includes('Legge') || title.includes('L.')) return 'Legge';
    if (title.includes('Decreto Legislativo')) return 'Decreto Legislativo';
    if (title.includes('Regio Decreto')) return 'Regio Decreto';
    return 'Atto Normativo';
  }

  /**
   * Estrae numero da titolo
   */
  private extractNumber(title: string): string {
    const match = title.match(/n\.\s*(\d+)/i);
    return match ? match[1] : '';
  }

  /**
   * Estrae anno da titolo o data
   */
  private extractYear(title: string, date: string): string {
    const yearMatch = title.match(/\b(19|20)\d{2}\b/);
    if (yearMatch) return yearMatch[0];

    const dateMatch = date.match(/\b(19|20)\d{2}\b/);
    return dateMatch ? dateMatch[0] : '';
  }

  /**
   * Ottieni dettagli di una legge specifica tramite URN
   */
  async getLegislationByURN(urn: string): Promise<any> {
    try {
      // Esempio: urn:nir:stato:decreto.legge:2020;18
      const response = await axios.get(`${this.baseUrl}/do/atto/export`, {
        params: {
          tipo: 'originario',
          formato: 'json',
          atto: urn
        },
        timeout: 10000
      });

      return response.data;
    } catch (error: any) {
      console.error('Normattiva get by URN error:', error.message);
      throw new Error('Impossibile recuperare il documento normativo');
    }
  }

  /**
   * Calcola rilevanza semplice (keyword matching)
   */
  private calculateRelevance(query: string, text: string): number {
    const queryWords = query.toLowerCase().split(' ');
    const textWords = text.toLowerCase().split(' ');
    let matches = 0;

    queryWords.forEach(qWord => {
      if (textWords.some(tWord => tWord.includes(qWord) || qWord.includes(tWord))) {
        matches++;
      }
    });

    return matches / queryWords.length;
  }
}

export default new NormativaService();
