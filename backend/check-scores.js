const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkScores() {
  try {
    // Get all scores
    const scores = await prisma.score.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        user: {
          select: { nome: true, cognome: true, email: true }
        }
      }
    });

    console.log('\n=== ULTIMI 10 SCORE ===');
    scores.forEach(s => {
      console.log(`${s.user.nome} ${s.user.cognome}: ${s.puntiTotali} punti (${s.tipo})`);
    });

    // Get aggregate scores per user
    const users = await prisma.user.findMany({
      select: { id: true, nome: true, cognome: true }
    });

    console.log('\n=== SCORE TOTALE PER UTENTE ===');
    for (const user of users) {
      const totalScore = await prisma.score.aggregate({
        where: { userId: user.id },
        _sum: { puntiTotali: true }
      });
      console.log(`${user.nome} ${user.cognome}: ${totalScore._sum.puntiTotali || 0} punti totali`);
    }

  } catch (error) {
    console.error('Errore:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkScores();
