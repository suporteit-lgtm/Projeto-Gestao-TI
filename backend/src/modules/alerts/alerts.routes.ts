// Alertas automáticos:
//  - Parado/sem movimentação há muito tempo (em estoque além do limite)
//  - Garantia vencendo ou vencida
//  - Conferência atrasada (última conferência além do limite)
import { Router } from "express";
import { prisma } from "../../config/prisma";
import { authenticate } from "../../middlewares/auth";
import { getSettings } from "../settings/settings.service";

const router = Router();
router.use(authenticate);

// Diferença em dias entre agora e uma data passada (positivo = no passado).
function daysSince(date: Date): number {
  return Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
}
function daysUntil(date: Date): number {
  return Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

// GET /api/alerts — devolve as 3 categorias de alerta já calculadas (da unidade).
router.get("/", async (req, res, next) => {
  try {
    const unitId = req.user!.unitId;
    const settings = await getSettings(unitId);
    const items = await prisma.equipment.findMany({ where: { unitId }, include: { category: true } });

    const idle: any[] = []; // parados
    const warranty: any[] = []; // garantia
    const conference: any[] = []; // conferência atrasada

    for (const eq of items) {
      const base = {
        id: eq.id,
        assetId: eq.assetId,
        category: eq.category.name,
        brand: eq.brand,
        model: eq.model,
        currentUserName: eq.currentUserName,
        status: eq.status,
      };

      // 1) Parado em estoque há mais que o limite
      if (eq.status === "EM_ESTOQUE") {
        const d = daysSince(eq.statusChangedAt);
        if (d >= settings.idleDaysLimit) {
          idle.push({ ...base, dias: d, desde: eq.statusChangedAt });
        }
      }

      // 2) Garantia vencida ou vencendo
      if (eq.warrantyEndDate && eq.status !== "DESCARTADO") {
        const d = daysUntil(eq.warrantyEndDate);
        if (d < 0) {
          warranty.push({ ...base, situacao: "vencida", dias: Math.abs(d), data: eq.warrantyEndDate });
        } else if (d <= settings.warrantyWarningDays) {
          warranty.push({ ...base, situacao: "vencendo", dias: d, data: eq.warrantyEndDate });
        }
      }

      // 3) Conferência atrasada
      if (eq.status !== "DESCARTADO") {
        if (!eq.lastCheckDate) {
          conference.push({ ...base, dias: null, ultimaConferencia: null });
        } else {
          const d = daysSince(eq.lastCheckDate);
          if (d >= settings.conferenceDaysLimit) {
            conference.push({ ...base, dias: d, ultimaConferencia: eq.lastCheckDate });
          }
        }
      }
    }

    res.json({
      settings,
      resumo: { parados: idle.length, garantia: warranty.length, conferencia: conference.length },
      parados: idle,
      garantia: warranty,
      conferencia: conference,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
