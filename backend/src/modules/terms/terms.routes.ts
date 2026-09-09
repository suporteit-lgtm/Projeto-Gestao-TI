// Rotas da tela de Termos: situação por colaborador e link do Drive.
import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../../middlewares/auth";
import { listTerms, setDriveUrl, linkExistingTerm } from "./terms.service";

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

const vinculoSchema = z.object({
  personName: z.string().trim().min(1, "Informe o colaborador."),
  documento: z.string().trim().min(1, "Cole o link ou a chave do documento."),
});

// POST /api/terms/link — vincula a um colaborador um termo que já existe no
// Clicksign (enviado antes desta tela, ou direto pelo painel deles). Necessário
// porque a API v1 não permite listar os documentos da conta.
router.post("/link", async (req, res, next) => {
  try {
    const { personName, documento } = vinculoSchema.parse(req.body);
    res.json(await linkExistingTerm({ unitId: req.user!.unitId, personName, documento }));
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
