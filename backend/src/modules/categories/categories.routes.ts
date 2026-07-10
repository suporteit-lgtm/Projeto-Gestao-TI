// Categorias / tipos de equipamento — EXTENSÍVEIS pela tela.
// Leitura: qualquer usuário logado. Criar/editar/excluir: qualquer logado
// (são metadados do inventário; pode-se restringir a ADMIN se preferir).
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/prisma";
import { authenticate } from "../../middlewares/auth";
import { AppError } from "../../middlewares/error";

const router = Router();
router.use(authenticate);

const schema = z.object({ name: z.string().min(1, "Informe o nome da categoria.") });

// Procura, DENTRO da unidade, uma categoria de mesmo nome ignorando caixa.
async function findByNameCI(name: string, unitId: string, exceptId?: string) {
  const alvo = name.trim().toLowerCase();
  const todas = await prisma.category.findMany({ where: { unitId } });
  return todas.find((c) => c.name.trim().toLowerCase() === alvo && c.id !== exceptId) ?? null;
}

// Lista as categorias DA UNIDADE ativa, com a contagem de equipamentos.
router.get("/", async (req, res, next) => {
  try {
    const categories = await prisma.category.findMany({
      where: { unitId: req.user!.unitId },
      orderBy: { name: "asc" },
      include: { _count: { select: { equipment: true } } },
    });
    res.json(
      categories.map((c) => ({ id: c.id, name: c.name, count: c._count.equipment }))
    );
  } catch (err) {
    next(err);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const { name } = schema.parse(req.body);
    const unitId = req.user!.unitId;
    // Reaproveita se já existir na unidade (ignorando caixa) — evita duplicatas.
    const existente = await findByNameCI(name, unitId);
    if (existente) return res.status(200).json(existente);
    const category = await prisma.category.create({ data: { name: name.trim(), unitId } });
    res.status(201).json(category);
  } catch (err) {
    next(err);
  }
});

async function categoriaDaUnidade(id: string, unitId: string) {
  const cat = await prisma.category.findUnique({ where: { id } });
  if (!cat || cat.unitId !== unitId) throw new AppError("Categoria não encontrada.", 404);
  return cat;
}

router.put("/:id", async (req, res, next) => {
  try {
    const { name } = schema.parse(req.body);
    const unitId = req.user!.unitId;
    await categoriaDaUnidade(req.params.id, unitId);
    const conflito = await findByNameCI(name, unitId, req.params.id);
    if (conflito) {
      throw new AppError(`Já existe a categoria "${conflito.name}".`, 409);
    }
    const category = await prisma.category.update({
      where: { id: req.params.id },
      data: { name: name.trim() },
    });
    res.json(category);
  } catch (err) {
    next(err);
  }
});

// Só permite excluir categoria (da unidade) sem equipamentos vinculados.
router.delete("/:id", async (req, res, next) => {
  try {
    await categoriaDaUnidade(req.params.id, req.user!.unitId);
    const count = await prisma.equipment.count({ where: { categoryId: req.params.id } });
    if (count > 0) {
      throw new AppError(
        `Não é possível excluir: há ${count} equipamento(s) nesta categoria.`,
        409
      );
    }
    await prisma.category.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;
