const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTasks() {
  try {
    const tasks = await prisma.task.findMany({
      include: {
        subtasks: true,
        owner: { select: { nome: true, cognome: true, email: true } }
      }
    });

    console.log('=== TASK NEL DATABASE ===');
    console.log('Totale task:', tasks.length);
    console.log('');

    if (tasks.length === 0) {
      console.log('❌ Nessuna task trovata nel database!');
      console.log('');
      console.log('Creo delle task di esempio...');

      // Trova il primo utente
      const user = await prisma.user.findFirst();
      if (!user) {
        console.log('❌ Nessun utente trovato! Registrati prima.');
        return;
      }

      // Crea task di esempio con subtasks con scadenza oggi
      const oggi = new Date();
      const task1 = await prisma.task.create({
        data: {
          titolo: 'Completare documentazione progetto',
          descrizione: 'Scrivere la documentazione tecnica completa',
          stato: 'in_corso',
          priorita: 'alta',
          difficolta: 5,
          scadenza: oggi,
          ownerId: user.id,
          assignees: { connect: [{ id: user.id }] },
          subtasks: {
            create: [
              { titolo: 'Scrivere README', ordine: 0 },
              { titolo: 'Documentare API', ordine: 1 },
              { titolo: 'Creare diagrammi', ordine: 2 },
            ]
          }
        }
      });

      const task2 = await prisma.task.create({
        data: {
          titolo: 'Implementare sistema di notifiche',
          descrizione: 'Sistema push notifications in tempo reale',
          stato: 'in_corso',
          priorita: 'urgente',
          difficolta: 7,
          scadenza: oggi,
          ownerId: user.id,
          assignees: { connect: [{ id: user.id }] },
          subtasks: {
            create: [
              { titolo: 'Setup WebSocket', ordine: 0 },
              { titolo: 'Creare notifiche backend', ordine: 1 },
              { titolo: 'UI notifiche frontend', ordine: 2 },
              { titolo: 'Test notifiche', ordine: 3 },
            ]
          }
        }
      });

      const task3 = await prisma.task.create({
        data: {
          titolo: 'Testare nuovo sistema timer',
          descrizione: 'Verificare che il sistema di timer funzioni correttamente',
          stato: 'in_corso',
          priorita: 'media',
          difficolta: 3,
          scadenza: null, // Task senza scadenza ma in corso
          ownerId: user.id,
          assignees: { connect: [{ id: user.id }] },
          subtasks: {
            create: [
              { titolo: 'Avviare timer su subtask', ordine: 0 },
              { titolo: 'Mettere in pausa', ordine: 1 },
              { titolo: 'Riprendere timer', ordine: 2 },
              { titolo: 'Completare subtask', ordine: 3 },
              { titolo: 'Verificare auto-completamento', ordine: 4 },
            ]
          }
        }
      });

      console.log('✅ Create 3 task di esempio con subtasks!');
    } else {
      tasks.forEach((task, i) => {
        console.log(`${i + 1}. ${task.titolo}`);
        console.log(`   Owner: ${task.owner.nome} ${task.owner.cognome}`);
        console.log(`   Stato: ${task.stato}`);
        console.log(`   Priorità: ${task.priorita}`);
        console.log(`   Scadenza: ${task.scadenza || 'Nessuna'}`);
        console.log(`   Subtasks: ${task.subtasks.length}`);
        task.subtasks.forEach((st, j) => {
          console.log(`     ${j + 1}. ${st.titolo} ${st.completata ? '✅' : '⭕'}`);
        });
        console.log('');
      });
    }

    // Verifica task di oggi
    const oggi = new Date();
    oggi.setHours(0, 0, 0, 0);
    const fine = new Date();
    fine.setHours(23, 59, 59, 999);

    const taskOggi = await prisma.task.count({
      where: {
        stato: { notIn: ['completed', 'completata'] },
        OR: [
          { scadenza: { gte: oggi, lte: fine } },
          { scadenza: null, stato: 'in_progress' }
        ]
      }
    });

    console.log('=== TASK DI OGGI ===');
    console.log('Task in scadenza oggi o in progress:', taskOggi);

  } catch (error) {
    console.error('Errore:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTasks();
