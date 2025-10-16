const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkRoles() {
  try {
    const roles = await prisma.role.findMany({
      include: {
        _count: { select: { users: true } }
      }
    });

    console.log('\n=== RUOLI NEL DATABASE ===\n');
    roles.forEach(role => {
      console.log(`ID: ${role.id}`);
      console.log(`Nome: ${role.nome}`);
      console.log(`isSystem: ${role.isSystem}`);
      console.log(`isCustom: ${role.isCustom}`);
      console.log(`companyId: ${role.companyId || 'NULL'}`);
      console.log(`Utenti: ${role._count.users}`);
      console.log('---');
    });

    console.log('\n=== COMPANIES NEL DATABASE ===\n');
    const companies = await prisma.company.findMany({
      select: { id: true, nome: true }
    });
    companies.forEach(c => {
      console.log(`Company: ${c.nome} (ID: ${c.id})`);
    });

  } catch (error) {
    console.error('Errore:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkRoles();
