// backend/src/config/database.ts
import { PrismaClient } from "@prisma/client";

declare global {
  // Evita errori di redeclare in TS
  // e permette il singleton in dev con nodemon
  // eslint-disable-next-line no-var
  var __PRISMA__: PrismaClient | undefined;
}

const createClient = () =>
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

// In sviluppo riutilizziamo lo stesso client tra i reload di nodemon
const prisma = global.__PRISMA__ ?? createClient();
if (process.env.NODE_ENV === "development") {
  global.__PRISMA__ = prisma;
}

// Shutdown pulito (facoltativo ma utile)
process.on("beforeExit", async () => {
  try {
    await prisma.$disconnect();
  } catch {
    /* ignore */
  }
});

export default prisma;
