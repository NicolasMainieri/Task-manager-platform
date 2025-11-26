const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixUserCompanies() {
  console.log('\n🔧 FIXING USER-COMPANY ASSOCIATIONS');
  console.log('═══════════════════════════════════════════\n');

  try {
    // Get all users
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        nome: true,
        cognome: true,
        companyId: true,
        isSuperAdmin: true
      }
    });

    console.log(`Found ${users.length} users:\n`);

    const usersWithoutCompany = users.filter(u => !u.companyId && !u.isSuperAdmin);
    const superAdmins = users.filter(u => u.isSuperAdmin);
    const usersWithCompany = users.filter(u => u.companyId);

    console.log(`✅ Users with company: ${usersWithCompany.length}`);
    console.log(`⚠️  Users without company: ${usersWithoutCompany.length}`);
    console.log(`🔐 SuperAdmins: ${superAdmins.length}\n`);

    if (usersWithoutCompany.length > 0) {
      console.log('Users without company:');
      usersWithoutCompany.forEach(u => {
        console.log(`  - ${u.nome} ${u.cognome} (${u.email})`);
      });
      console.log('');
    }

    // Get Valior Capital company (has modules including legal)
    const valiorCompany = await prisma.company.findFirst({
      where: { nome: { contains: 'Valior' } }
    });

    if (!valiorCompany) {
      console.log('❌ Valior Capital company not found!');
      return;
    }

    console.log(`\n📦 Will associate users with: ${valiorCompany.nome} (ID: ${valiorCompany.id})`);
    console.log(`   Active modules: ${JSON.parse(valiorCompany.moduliAttivi).join(', ')}\n`);

    // Ask for confirmation (in reality, we'll just do it)
    console.log('Updating users...\n');

    for (const user of usersWithoutCompany) {
      await prisma.user.update({
        where: { id: user.id },
        data: { companyId: valiorCompany.id }
      });
      console.log(`✅ Updated: ${user.nome} ${user.cognome}`);
    }

    console.log(`\n🎉 Successfully updated ${usersWithoutCompany.length} users!`);

    // Verify
    console.log('\n📊 VERIFICATION');
    const updatedUsers = await prisma.user.findMany({
      where: { companyId: valiorCompany.id },
      select: {
        id: true,
        nome: true,
        cognome: true,
        email: true,
        role: {
          select: { nome: true }
        }
      }
    });

    console.log(`Users now associated with ${valiorCompany.nome}: ${updatedUsers.length}\n`);
    updatedUsers.forEach(u => {
      console.log(`  - ${u.nome} ${u.cognome} (${u.email}) - Role: ${u.role?.nome || 'no role'}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

fixUserCompanies();
