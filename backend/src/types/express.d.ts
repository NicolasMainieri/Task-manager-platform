import { User, Role, Team } from "@prisma/client";

declare global {
  namespace Express {
    interface Request {
      user?: User & {
        role: Role;
        team: Team | null;
      };
    }
  }
}

export {};