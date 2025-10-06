const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

// Verifica che Prisma sia inizializzato
if (!prisma.role) {
  console.error("Errore: Prisma Client non generato. Esegui: npx prisma generate");
  process.exit(1);
}

async function main() {
  console.log("Inizio seeding...");

  const adminRole = await prisma.role.upsert({
    where: { nome: "Admin" },
    update: {},
    create: {
      nome: "Admin",
      descrizione: "Amministratore con accesso completo",
      permessi: JSON.stringify({
        isAdmin: true,
        canViewAllTasks: true,
        canCreateTasks: true,
        canEditTasks: true,
        canDeleteTasks: true,
        canAssignTasks: true,
        canManageUsers: true,
        canManageRoles: true,
        canViewReports: true,
        canExportData: true
      }),
      isCustom: false
    }
  });

  const employeeRole = await prisma.role.upsert({
    where: { nome: "Dipendente" },
    update: {},
    create: {
      nome: "Dipendente",
      descrizione: "Dipendente standard",
      permessi: JSON.stringify({
        isAdmin: false,
        canViewAllTasks: false,
        canCreateTasks: true,
        canEditTasks: true,
        canDeleteTasks: false,
        canAssignTasks: false,
        canManageUsers: false,
        canManageRoles: false,
        canViewReports: false,
        canExportData: false
      }),
      isCustom: false
    }
  });

  console.log("Ruoli creati");

  const devTeam = await prisma.team.upsert({
    where: { nome: "Development" },
    update: {},
    create: { nome: "Development", descrizione: "Team di sviluppo", colore: "#3B82F6" }
  });

  console.log("Team creati");

  const admin = await prisma.user.upsert({
    where: { email: "admin@taskmanager.com" },
    update: {},
    create: {
      email: "admin@taskmanager.com",
      password: await bcrypt.hash("admin123", 10),
      nome: "Admin",
      cognome: "Sistema",
      roleId: adminRole.id,
      teamId: devTeam.id
    }
  });

  console.log("Utenti creati");
  console.log("\nSeeding completato!");
  console.log("Email: admin@taskmanager.com");
  console.log("Password: admin123\n");
}

main()
  .catch((e) => { 
    console.error(e); 
    process.exit(1); 
  })
  .finally(async () => { 
    await prisma.$disconnect(); 
  });