import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import prisma from "../config/database";
import { parseJsonField } from "../utils/jsonHelper";

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    companyId: string;
    roleId: string;
    teamId: string | null;
    role: {
      id: string;
      name: string;
      permessi: any;
      isAdmin?: boolean;
    };
    team?: any;
  };
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) return res.status(401).json({ error: "Token mancante" });

    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error("JWT_SECRET non configurato");
    const decoded = jwt.verify(token, secret) as any;
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { role: true, team: true },
    });

    if (!user) return res.status(401).json({ error: "Utente non trovato" });

    // Parse permessi
    req.user = {
      ...user,
      role: {
        ...user.role,
        permessi: parseJsonField(user.role.permessi)
      }
    };
    
    next();
  } catch (error) {
    res.status(401).json({ error: "Token non valido" });
  }
};

export const authorize = (...permissions: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: "Non autenticato" });

    const userPermissions = req.user.role.permessi;
    const hasPermission = permissions.some(p => userPermissions[p] === true);

    if (!hasPermission && !userPermissions.isAdmin) {
      return res.status(403).json({ error: "Non hai i permessi necessari" });
    }

    next();
  };
};

// Helper per verificare se l'utente è admin
export const isAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) return res.status(401).json({ error: "Non autenticato" });
  
  const userPermissions = req.user.role.permessi;
  if (!userPermissions.isAdmin) {
    return res.status(403).json({ error: "Accesso riservato agli admin" });
  }
  
  next();
};