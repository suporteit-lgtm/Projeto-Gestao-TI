// Rotas do Termo de Responsabilidade: template editável + geração de PDF.
import { Router } from "express";
import { z } from "zod";
import { authenticate, requireRole } from "../../middlewares/auth";
import {
  getTemplate,
  updateTemplate,
  resetTemplate,
  termoForEquipment,
  termoForPerson,
} from "./documents.service";

const router = Router();
router.use(authenticate);

// --- Template editável ---
router.get("/template", async (_req, res, next) => {
  try {
    res.json(await getTemplate());
  } catch (err) {
    next(err);
  }
});

const tplSchema = z.object({ content: z.string().min(1), name: z.string().optional() });

// Editar o termo: restrito a admin.
router.put("/template", requireRole("ADMIN"), async (req, res, next) => {
  try {
    const { content, name } = tplSchema.parse(req.body);
    res.json(await updateTemplate(content, name));
  } catch (err) {
    next(err);
  }
});

router.post("/template/reset", requireRole("ADMIN"), async (_req, res, next) => {
  try {
    res.json(await resetTemplate());
  } catch (err) {
    next(err);
  }
});

// --- Geração de PDF ---
function sendPdf(res: any, pdf: Buffer, filename: string) {
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename="${filename}"`);
  res.send(pdf);
}

// GET /api/documents/equipment/:id/termo.pdf — termo de um equipamento.
router.get("/equipment/:id/termo.pdf", async (req, res, next) => {
  try {
    const pdf = await termoForEquipment(req.params.id, req.user!.unitId);
    sendPdf(res, pdf, "termo-responsabilidade.pdf");
  } catch (err) {
    next(err);
  }
});

// GET /api/documents/person/termo.pdf?nome=...&unitId=... — termo de uma pessoa.
// A unidade pode ser escolhida (query unitId); se não vier, usa a unidade ativa.
router.get("/person/termo.pdf", async (req, res, next) => {
  try {
    const nome = String(req.query.nome ?? "").trim();
    if (!nome) return res.status(400).json({ error: "Informe o nome da pessoa." });
    const unitId = req.query.unitId ? String(req.query.unitId) : req.user!.unitId;
    const pdf = await termoForPerson(nome, unitId);
    sendPdf(res, pdf, `termo-${nome}.pdf`);
  } catch (err) {
    next(err);
  }
});

export default router;
