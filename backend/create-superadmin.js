const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createSuperAdmin() {
  try {
    // Verifica se esiste già un superadmin
    const existingSuperAdmin = await prisma.user.findFirst({
      where: { isSuperAdmin: true }
    });

    if (existingSuperAdmin) {
      console.log('✅ SuperAdmin già esistente:', existingSuperAdmin.email);

      // Aggiorna per sicurezza
      await prisma.user.update({
        where: { id: existingSuperAdmin.id },
        data: { isSuperAdmin: true }
      });

      return;
    }

    // Trova o crea un ruolo Admin
    let adminRole = await prisma.role.findFirst({
      where: { nome: 'Admin', isSystem: true }
    });

    if (!adminRole) {
      adminRole = await prisma.role.create({
        data: {
          nome: 'Admin',
          descrizione: 'Amministratore di sistema',
          isSystem: true,
          colore: '#ef4444',
          icona: 'Shield'
        }
      });
    }

    // Crea SuperAdmin
    const hashedPassword = await bcrypt.hash('superadmin123', 10);

    const superAdmin = await prisma.user.create({
      data: {
        email: 'superadmin@planora.com',
        password: hashedPassword,
        nome: 'Super',
        cognome: 'Admin',
        isSuperAdmin: true,
        status: 'approved',
        roleId: adminRole.id
      }
    });

    console.log('✅ SuperAdmin creato con successo!');
    console.log('📧 Email: superadmin@planora.com');
    console.log('🔑 Password: superadmin123');
    console.log('');
    console.log('🚀 Puoi ora accedere come SuperAdmin');

  } catch (error) {
    console.error('❌ Errore creazione SuperAdmin:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createSuperAdmin();
