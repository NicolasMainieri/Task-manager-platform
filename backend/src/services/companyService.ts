import prisma from "../config/database";

// Genera codice azienda univoco
function generateCompanyCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

class CompanyService {
  // Crea azienda e admin
  async createCompany(data: {
    name: string;
    companyName: string;
    email: string;
    hashedPassword: string;
    plan: string;
    categoria?: string;
    roleId: string;
  }) {
    const companyCode = generateCompanyCode();

    // Crea azienda e utente admin in una transazione
    const result = await prisma.$transaction(async (tx) => {
      // Crea l'azienda
      const company = await tx.company.create({
        data: {
          nome: data.companyName,
          code: companyCode,
          plan: data.plan,
          categoria: data.categoria || 'generale',
        }
      });

      // Crea l'utente admin
      const user = await tx.user.create({
        data: {
          nome: data.name,
          cognome: "",
          email: data.email,
          password: data.hashedPassword,
          roleId: data.roleId,
          companyId: company.id,
          status: "approved"
        }
      });

      // Aggiorna company con adminUserId
      const updatedCompany = await tx.company.update({
        where: { id: company.id },
        data: { adminUserId: user.id }
      });

      return { company: updatedCompany, user, companyCode };
    });

    return result;
  }

  // Registra dipendente
  async registerEmployee(data: {
    name: string;
    email: string;
    hashedPassword: string;
    companyCode: string;
    roleId: string;
  }) {
    // Verifica che l'azienda esista
    const company = await prisma.company.findUnique({
      where: { code: data.companyCode }
    });

    if (!company) {
      throw new Error("Codice azienda non valido");
    }

    // Crea utente con status pending
    const user = await prisma.user.create({
      data: {
        nome: data.name,
        cognome: "",
        email: data.email,
        password: data.hashedPassword,
        roleId: data.roleId,
        companyId: company.id,
        status: "pending"
      }
    });

    return user;
  }

  // Ottieni richieste pending per un admin
  async getPendingRequests(companyId: string) {
    const pendingUsers = await prisma.user.findMany({
      where: {
        companyId: companyId,
        status: "pending"
      },
      select: {
        id: true,
        nome: true,
        cognome: true,
        email: true,
        createdAt: true
      }
    });

    return pendingUsers;
  }

  // Approva/Rifiuta dipendente
  async updateUserStatus(userId: string, status: "approved" | "rejected") {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { status }
    });

    return user;
  }
}

export default new CompanyService();