// Regras de autenticação: validar credenciais e gerar token JWT.
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../../config/prisma";
import { env } from "../../config/env";
import { AppError } from "../../middlewares/error";

export interface TokenPayload {
  sub: string; // id do usuário
  name: string;
  role: string;
  unitId: string; // unidade (tenant) ativa nesta sessão
  unitName: string;
}

// Login com escolha de unidade. Usuário COMUM só entra na unidade dele;
// ADMIN pode entrar em qualquer unidade (para gerir todas).
export async function login(email: string, password: string, unitId?: string) {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user || !user.active) {
    throw new AppError("E-mail ou senha inválidos.", 401);
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    throw new AppError("E-mail ou senha inválidos.", 401);
  }

  let targetUnitId = unitId || user.lastUnitId || user.unitId;

  if (!targetUnitId) {
    const primeiraUnidade = await prisma.unit.findFirst();
    if (!primeiraUnidade) {
      throw new AppError("Nenhuma unidade cadastrada no sistema.", 500);
    }
    targetUnitId = primeiraUnidade.id;
  }

  const unidade = await prisma.unit.findUnique({ where: { id: targetUnitId } });
  if (!unidade) throw new AppError("Unidade selecionada inválida.", 400);

  // Comum só pode entrar na própria unidade.
  if (user.role !== "ADMIN" && user.unitId !== targetUnitId) {
    throw new AppError("Este usuário não tem acesso à unidade selecionada.", 403);
  }

  // Se a unidade ativa mudou ou não estava registrada no lastUnitId, salvamos no BD
  if (user.lastUnitId !== targetUnitId) {
    await prisma.user.update({
      where: { id: user.id },
      data: { lastUnitId: targetUnitId }
    });
  }

  const payload: TokenPayload = {
    sub: user.id,
    name: user.name,
    role: user.role,
    unitId: unidade.id,
    unitName: unidade.name,
  };
  const token = jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn } as any);

  return {
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role, unitId: unidade.id, unitName: unidade.name },
  };
}

// Gera o hash de uma senha (usado no cadastro de usuários e no seed).
export function hashPassword(plain: string) {
  return bcrypt.hash(plain, 10);
}

// Permite trocar a unidade ativa de um usuário e emitir um novo token.
export async function switchUnit(userId: string, unitId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.active) {
    throw new AppError("Usuário inválido ou inativo.", 401);
  }

  const unidade = await prisma.unit.findUnique({ where: { id: unitId } });
  if (!unidade) {
    throw new AppError("Selecione uma unidade válida.", 400);
  }

  // Comum só pode entrar na própria unidade.
  if (user.role !== "ADMIN" && user.unitId !== unitId) {
    throw new AppError("Este usuário não tem acesso à unidade selecionada.", 403);
  }

  // Salvamos a unidade trocada no lastUnitId do banco de dados
  await prisma.user.update({
    where: { id: userId },
    data: { lastUnitId: unitId }
  });

  const payload: TokenPayload = {
    sub: user.id,
    name: user.name,
    role: user.role,
    unitId: unidade.id,
    unitName: unidade.name,
  };
  const token = jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn } as any);

  return {
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role, unitId: unidade.id, unitName: unidade.name },
  };
}
