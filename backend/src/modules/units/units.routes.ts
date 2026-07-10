// Unidades / filiais da empresa (nome, CNPJ, endereço) — usadas no Termo.
// Leitura: qualquer usuário logado. Criar/editar/excluir: apenas admin.
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/prisma";
import { authenticate, requireRole } from "../../middlewares/auth";

const router = Router();
router.use(authenticate);

const schema = z.object({
  name: z.string().min(1, "Informe o nome da unidade."),
  cnpj: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
});

router.get("/", async (_req, res, next) => {
  try {
    res.json(await prisma.unit.findMany({ orderBy: { name: "asc" } }));
  } catch (err) {
    next(err);
  }
});

router.post("/", requireRole("ADMIN"), async (req, res, next) => {
  try {
    const data = schema.parse(req.body);
    res.status(201).json(await prisma.unit.create({ data }));
  } catch (err) {
    next(err);
  }
});

router.put("/:id", requireRole("ADMIN"), async (req, res, next) => {
  try {
    const data = schema.parse(req.body);
    res.json(await prisma.unit.update({ where: { id: req.params.id }, data }));
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", requireRole("ADMIN"), async (req, res, next) => {
  try {
    await prisma.unit.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;
