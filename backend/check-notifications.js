const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkNotifications() {
  try {
    // Get all notifications
    const notifications = await prisma.notification.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        user: {
          select: { nome: true, cognome: true, email: true }
        }
      }
    });

    console.log('\n=== ULTIME 10 NOTIFICHE ===');
    if (notifications.length === 0) {
      console.log('Nessuna notifica trovata nel database!');
    } else {
      notifications.forEach(n => {
        console.log(`[${n.letta ? 'LETTA' : 'NON LETTA'}] ${n.user.nome} ${n.user.cognome}: ${n.titolo}`);
        console.log(`   Messaggio: ${n.messaggio}`);
        console.log(`   Tipo: ${n.tipo} | Data: ${n.createdAt}`);
        console.log('');
      });
    }

    // Count per user
    const users = await prisma.user.findMany({
      select: { id: true, nome: true, cognome: true }
    });

    console.log('\n=== NOTIFICHE PER UTENTE ===');
    for (const user of users) {
      const count = await prisma.notification.count({
        where: { userId: user.id }
      });
      const unread = await prisma.notification.count({
        where: { userId: user.id, letta: false }
      });
      if (count > 0) {
        console.log(`${user.nome} ${user.cognome}: ${count} totali, ${unread} non lette`);
      }
    }

  } catch (error) {
    console.error('Errore:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkNotifications();
