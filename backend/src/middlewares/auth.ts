// Middlewares de autenticação (JWT) e autorização por papel.
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { TokenPayload } from "../modules/auth/auth.service";
import { AppError } from "./error";

// Acrescenta o usuário autenticado ao objeto Request.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

// Exige um token válido no header Authorization: Bearer <token>.
export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    throw new AppError("Não autenticado.", 401);
  }
  const token = header.slice("Bearer ".length);
  try {
    req.user = jwt.verify(token, env.jwtSecret) as TokenPayload;
    next();
  } catch {
    throw new AppError("Sessão expirada ou inválida.", 401);
  }
}

// Restringe o acesso a determinados papéis (ex.: requireRole("ADMIN")).
export function requireRole(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw new AppError("Você não tem permissão para esta ação.", 403);
    }
    next();
  };
}
