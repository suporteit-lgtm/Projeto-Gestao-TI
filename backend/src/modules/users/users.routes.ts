// Gestão de usuários DO SISTEMA — somente admin.
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/prisma";
import { hashPassword } from "../auth/auth.service";
import { authenticate, requireRole } from "../../middlewares/auth";
import { AppError } from "../../middlewares/error";

const router = Router();

// Todas as rotas exigem login + papel ADMIN.
router.use(authenticate, requireRole("ADMIN"));

const createSchema = z.object({
  name: z.string().min(1, "Informe o nome."),
  email: z.string().email("E-mail inválido."),
  password: z.string().min(6, "A senha deve ter ao menos 6 caracteres."),
  role: z.enum(["ADMIN", "COMMON"]).default("COMMON"),
  unitId: z.string().min(1, "Selecione a unidade do usuário."),
});

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  role: z.enum(["ADMIN", "COMMON"]).optional(),
  active: z.boolean().optional(),
  unitId: z.string().min(1).optional(),
});

// Lista todos os usuários (com a unidade). Gestão de usuários é global do admin.
router.get("/", async (_req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true, name: true, email: true, role: true, active: true, createdAt: true,
        unitId: true, unit: { select: { name: true } },
      },
      orderBy: { name: "asc" },
    });
    res.json(users.map((u) => ({ ...u, unitName: u.unit?.name ?? null, unit: undefined })));
  } catch (err) {
    next(err);
  }
});

// Cria um novo usuário (na unidade escolhida).
router.post("/", async (req, res, next) => {
  try {
    const data = createSchema.parse(req.body);
    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email.toLowerCase(),
        role: data.role,
        unitId: data.unitId,
        passwordHash: await hashPassword(data.password),
      },
      select: { id: true, name: true, email: true, role: true, active: true, unitId: true },
    });
    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
});

// Atualiza um usuário (inclui troca de senha, unidade e ativar/desativar).
router.put("/:id", async (req, res, next) => {
  try {
    const data = updateSchema.parse(req.body);
    const update: Record<string, unknown> = { ...data };
    if (data.email) update.email = data.email.toLowerCase();
    if (data.password) {
      update.passwordHash = await hashPassword(data.password);
      delete update.password;
    }
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: update,
      select: { id: true, name: true, email: true, role: true, active: true, unitId: true },
    });
    res.json(user);
  } catch (err) {
    next(err);
  }
});

// Remove um usuário (não permite remover a si mesmo).
router.delete("/:id", async (req, res, next) => {
  try {
    if (req.user?.sub === req.params.id) {
      throw new AppError("Você não pode remover o seu próprio usuário.", 400);
    }
    await prisma.user.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;
