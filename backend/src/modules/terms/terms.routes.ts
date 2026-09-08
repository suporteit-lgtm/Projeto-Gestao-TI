// Rotas da tela de Termos: situação por colaborador e link do Drive.
import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../../middlewares/auth";
import { listTerms, setDriveUrl, syncFromClicksign } from "./terms.service";

const router = Router();
router.use(authenticate);

// GET /api/terms — situação do termo de cada colaborador da unidade ativa.
router.get("/", async (req, res, next) => {
  try {
    res.json(await listTerms(req.user!.unitId));
  } catch (err) {
    next(err);
  }
});

// POST /api/terms/sync — importa do Clicksign os termos que ainda não têm
// registro (os enviados antes desta tela existir).
router.post("/sync", async (req, res, next) => {
  try {
    res.json(await syncFromClicksign(req.user!.unitId));
  } catch (err) {
    next(err);
  }
});

const driveSchema = z.object({
  driveUrl: z
    .string()
    .trim()
    .max(2000)
    .refine((v) => v === "" || /^https?:\/\//i.test(v), "Informe um link começando com http:// ou https://")
    .nullable()
    .optional(),
});

// PATCH /api/terms/:id/drive — grava (ou limpa) o link do Drive do termo.
router.patch("/:id/drive", async (req, res, next) => {
  try {
    const { driveUrl } = driveSchema.parse(req.body ?? {});
    res.json(await setDriveUrl(req.params.id, req.user!.unitId, driveUrl ?? null));
  } catch (err) {
    next(err);
  }
});

export default router;
