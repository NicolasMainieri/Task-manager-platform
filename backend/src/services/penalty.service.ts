import prisma from "../config/database";

class PenaltyService {
  /**
   * Calcola e applica penalità giornaliere per task scadute non completate
   * Chiamato da un cron job ogni giorno
   */
  async applyDailyPenalties(): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Trova tutte le task scadute e non completate
    const overdueTasks = await prisma.task.findMany({
      where: {
        scadenza: {
          lt: today
        },
        stato: {
          not: 'completato'
        }
      },
      include: {
        owner: true,
        assignees: true
      }
    });

    for (const task of overdueTasks) {
      const scadenza = new Date(task.scadenza!);
      const giornoRitardo = Math.floor((today.getTime() - scadenza.getTime()) / (1000 * 60 * 60 * 24));

      // Calcola penalità in base ai giorni di ritardo
      let puntPenalita = 0;
      if (giornoRitardo >= 1 && giornoRitardo <= 3) {
        puntPenalita = -5; // -5 punti per giorno nei primi 3 giorni
      } else if (giornoRitardo > 3 && giornoRitardo <= 7) {
        puntPenalita = -10; // -10 punti per giorno da 4 a 7 giorni
      } else if (giornoRitardo > 7) {
        puntPenalita = -15; // -15 punti per giorno oltre 7 giorni
      }

      // Applica penalità al proprietario della task
      const userId = task.ownerId;

      // Verifica se la penalità per oggi è già stata applicata
      const existingPenalty = await prisma.dailyPenalty.findUnique({
        where: {
          userId_taskId_data: {
            userId,
            taskId: task.id,
            data: today
          }
        }
      });

      if (!existingPenalty) {
        // Crea record penalità
        await prisma.dailyPenalty.create({
          data: {
            userId,
            taskId: task.id,
            giornoRitardo,
            puntPenalita,
            applicata: true,
            data: today
          }
        });

        // Applica penalità allo score
        await prisma.score.create({
          data: {
            userId,
            taskId: task.id,
            puntiBase: 0,
            punti: puntPenalita,
            moltiplicatore: 1.0,
            bonusPuntualita: 0,
            malusPuntualita: Math.abs(puntPenalita),
            puntiTotali: puntPenalita,
            tipo: 'daily_penalty',
            breakdown: JSON.stringify({
              tipo: 'daily_penalty',
              giornoRitardo,
              taskId: task.id,
              taskTitolo: task.titolo,
              puntPenalita
            })
          }
        });

        // Crea notifica per l'utente
        await prisma.notification.create({
          data: {
            userId,
            tipo: 'penalty',
            titolo: 'Penalità per task scaduta',
            messaggio: `Hai ricevuto ${puntPenalita} punti per la task scaduta "${task.titolo}" (${giornoRitardo} giorni di ritardo)`,
            link: `/tasks/${task.id}`
          }
        });
      }
    }

    console.log(`[PenaltyService] Processate ${overdueTasks.length} task scadute`);
  }

  /**
   * Assegna bonus giornalieri per attività
   */
  async assignDailyBonus(userId: string, tipo: string, punti: number, descrizione?: string): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Verifica se il bonus per oggi è già stato assegnato
    const existingBonus = await prisma.dailyBonus.findFirst({
      where: {
        userId,
        tipo,
        data: {
          gte: today
        }
      }
    });

    if (!existingBonus) {
      // Crea record bonus
      await prisma.dailyBonus.create({
        data: {
          userId,
          tipo,
          punti,
          descrizione: descrizione || `Bonus ${tipo}`,
          data: today
        }
      });

      // Applica bonus allo score
      await prisma.score.create({
        data: {
          userId,
          taskId: null,
          puntiBase: punti,
          punti: punti,
          moltiplicatore: 1.0,
          bonusPuntualita: punti,
          malusPuntualita: 0,
          puntiTotali: punti,
          tipo: 'daily_bonus',
          breakdown: JSON.stringify({
            tipo: 'daily_bonus',
            bonusType: tipo,
            punti,
            descrizione
          })
        }
      });
    }
  }

  /**
   * Bonus per primo login giornaliero
   */
  async loginBonus(userId: string): Promise<void> {
    await this.assignDailyBonus(userId, 'login', 5, 'Bonus login giornaliero');
  }

  /**
   * Bonus per prima task completata del giorno
   */
  async firstTaskBonus(userId: string): Promise<void> {
    await this.assignDailyBonus(userId, 'first_task', 10, 'Bonus prima task del giorno');
  }

  /**
   * Bonus per tempo focus (più di 2 ore di lavoro continuativo)
   */
  async focusTimeBonus(userId: string, ore: number): Promise<void> {
    const punti = Math.min(ore * 5, 25); // Max 25 punti per 5+ ore
    await this.assignDailyBonus(userId, 'focus_time', punti, `Bonus tempo focus: ${ore.toFixed(1)} ore`);
  }

  /**
   * Bonus per collaborazione (ha lavorato su task di team)
   */
  async collaborationBonus(userId: string): Promise<void> {
    await this.assignDailyBonus(userId, 'collaboration', 15, 'Bonus collaborazione team');
  }

  /**
   * Bonus per completamento anticipato di una task
   */
  async earlyCompletionBonus(userId: string, giorniAnticipo: number): Promise<void> {
    const punti = Math.min(giorniAnticipo * 10, 50); // Max 50 punti
    await this.assignDailyBonus(userId, 'early_completion', punti, `Completato ${giorniAnticipo} giorni in anticipo`);
  }
}

export default new PenaltyService();
