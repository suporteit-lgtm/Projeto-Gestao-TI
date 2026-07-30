// Rotas de configuração dos limites de alerta.
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/prisma";
import { authenticate, requireRole } from "../../middlewares/auth";
import { getSettings } from "./settings.service";

const router = Router();
router.use(authenticate);

// Qualquer usuário logado pode ler as configurações da SUA unidade.
router.get("/", async (req, res, next) => {
  try {
    res.json(await getSettings(req.user!.unitId));
  } catch (err) {
    next(err);
  }
});

const schema = z.object({
  idleDaysLimit: z.number().int().positive().optional(),
  conferenceDaysLimit: z.number().int().positive().optional(),
  warrantyWarningDays: z.number().int().positive().optional(),
});

// Apenas admin altera os limites (da unidade ativa).
router.put("/", requireRole("ADMIN"), async (req, res, next) => {
  try {
    const data = schema.parse(req.body);
    const unitId = req.user!.unitId;
    await getSettings(unitId); // garante que a linha existe
    const updated = await prisma.settings.update({ where: { unitId }, data });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// Apenas admin pode apagar os dados do inventário (Zona de Perigo)
router.delete("/wipe-data", requireRole("ADMIN"), async (req, res, next) => {
  try {
    // Usamos transação para garantir que apaga tudo ou nada.
    // Apaga apenas dados operacionais. Usuários, Unidades e Configurações continuam.
    await prisma.$transaction([
      prisma.assignmentHistory.deleteMany(),
      prisma.equipment.deleteMany(),
      prisma.category.deleteMany(),
    ]);
    res.json({ message: "Dados do sistema apagados com sucesso." });
  } catch (err) {
    next(err);
  }
});

export default router;
