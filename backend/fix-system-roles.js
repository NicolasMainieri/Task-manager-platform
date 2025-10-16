const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixSystemRoles() {
  try {
    console.log('Correzione ruoli di sistema in corso...\n');

    // Aggiorna i ruoli "Admin" e "Dipendente" come ruoli di sistema
    const adminRole = await prisma.role.updateMany({
      where: { nome: 'Admin', companyId: null },
      data: { isSystem: true, isCustom: false }
    });

    const dipendenteRole = await prisma.role.updateMany({
      where: { nome: 'Dipendente', companyId: null },
      data: { isSystem: true, isCustom: false }
    });

    console.log(`✅ Aggiornati ${adminRole.count} ruoli "Admin" come sistema`);
    console.log(`✅ Aggiornati ${dipendenteRole.count} ruoli "Dipendente" come sistema`);

    // Verifica risultato
    const roles = await prisma.role.findMany({
      select: { id: true, nome: true, isSystem: true, isCustom: true, companyId: true }
    });

    console.log('\n=== RUOLI DOPO LA CORREZIONE ===\n');
    roles.forEach(role => {
      console.log(`${role.nome}: isSystem=${role.isSystem}, isCustom=${role.isCustom}, companyId=${role.companyId || 'NULL'}`);
    });

    console.log('\n✅ Correzione completata!');
  } catch (error) {
    console.error('❌ Errore:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixSystemRoles();
