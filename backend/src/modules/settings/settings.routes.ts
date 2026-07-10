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

export default router;
