const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

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

  const designTeam = await prisma.team.upsert({
    where: { nome: "Design" },
    update: {},
    create: { nome: "Design", descrizione: "Team di design", colore: "#8B5CF6" }
  });

  console.log("Team creati");

  // Crea una company temporanea senza admin
  // Data di esempio: trial che scade tra 5 giorni
  const trialEndDate = new Date();
  trialEndDate.setDate(trialEndDate.getDate() + 5); // Tra 5 giorni

  const demoCompany = await prisma.company.upsert({
    where: { code: "DEMO123" },
    update: {
      plan: "free_trial",
      planStatus: "active",
      trialEndsAt: trialEndDate,
      subscriptionEndsAt: null,
      nextRenewalDate: null
    },
    create: {
      nome: "Demo Company",
      code: "DEMO123",
      plan: "free_trial",
      planStatus: "active",
      trialEndsAt: trialEndDate,
      subscriptionEndsAt: null,
      nextRenewalDate: null
    }
  });

  console.log("Company creata");

  // Crea l'admin e assegnalo alla company
  const admin = await prisma.user.upsert({
    where: { email: "admin@taskmanager.com" },
    update: {},
    create: {
      email: "admin@taskmanager.com",
      password: await bcrypt.hash("admin123", 10),
      nome: "Admin",
      cognome: "Sistema",
      roleId: adminRole.id,
      teamId: devTeam.id,
      companyId: demoCompany.id
    }
  });

  // Aggiorna la company con l'admin
  await prisma.company.update({
    where: { id: demoCompany.id },
    data: { adminUserId: admin.id }
  });

  const user = await prisma.user.upsert({
    where: { email: "user@taskmanager.com" },
    update: {},
    create: {
      email: "user@taskmanager.com",
      password: await bcrypt.hash("user123", 10),
      nome: "Mario",
      cognome: "Rossi",
      roleId: employeeRole.id,
      teamId: devTeam.id,
      companyId: demoCompany.id
    }
  });

  // Crea task di esempio
  await prisma.task.create({
    data: {
      titolo: "Setup progetto iniziale",
      descrizione: "Configurare l'ambiente di sviluppo e le dipendenze del progetto",
      stato: "in_corso",
      priorita: "alta",
      difficolta: 4,
      scadenza: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // tra 7 giorni
      ownerId: admin.id,
      assignees: { connect: [{ id: user.id }] },
      teamId: devTeam.id
    }
  });

  await prisma.task.create({
    data: {
      titolo: "Implementare autenticazione",
      descrizione: "Aggiungere JWT auth e protezione delle route",
      stato: "todo",
      priorita: "alta",
      difficolta: 5,
      scadenza: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // tra 14 giorni
      ownerId: admin.id,
      assignees: { connect: [{ id: user.id }] },
      teamId: devTeam.id
    }
  });

  console.log("Utenti e task creati");
  console.log("\nSeeding completato!");
  console.log("Admin - Email: admin@taskmanager.com | Password: admin123");
  console.log("User  - Email: user@taskmanager.com | Password: user123\n");
}

main()
  .catch((e) => { 
    console.error(e); 
    process.exit(1); 
  })
  .finally(async () => { 
    await prisma.$disconnect(); 
  });