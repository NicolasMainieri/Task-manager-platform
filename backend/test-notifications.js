const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testNotifications() {
  try {
    // Trova il tuo utente
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: { contains: 'nicolas' } },
          { nome: { contains: 'Nicolas' } }
        ]
      }
    });

    if (!user) {
      console.log('Utente non trovato!');
      return;
    }

    console.log(`\nUtente trovato: ${user.nome} ${user.cognome} (${user.email})`);

    // Crea una notifica di test
    const notification = await prisma.notification.create({
      data: {
        userId: user.id,
        tipo: 'test',
        titolo: '🎉 TEST NOTIFICHE',
        messaggio: 'Questa è una notifica di test per verificare che il sistema funzioni!',
        link: '/dashboard'
      }
    });

    console.log('\n✅ Notifica di test creata con successo!');
    console.log('ID:', notification.id);
    console.log('Titolo:', notification.titolo);
    console.log('Messaggio:', notification.messaggio);

    // Conta le notifiche non lette
    const unreadCount = await prisma.notification.count({
      where: { userId: user.id, letta: false }
    });

    console.log(`\n📬 Hai ${unreadCount} notifiche non lette`);

    // Mostra ultime 5 notifiche
    const recent = await prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    console.log('\n📋 Ultime 5 notifiche:');
    recent.forEach((n, i) => {
      console.log(`${i + 1}. [${n.letta ? '✓' : '✗'}] ${n.titolo} - ${n.messaggio.substring(0, 50)}...`);
    });

  } catch (error) {
    console.error('Errore:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testNotifications();
