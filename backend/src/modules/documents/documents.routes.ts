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

// --- Geração de PDF (Retorna HTML) ---
// GET /api/documents/equipment/:id/termo.html — HTML do termo de um equipamento.
router.get("/equipment/:id/termo.html", async (req, res, next) => {
  try {
    const result = await termoForEquipment(req.params.id, req.user!.unitId);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/documents/person/termo.html?nome=...&unitId=... — HTML do termo de uma pessoa.
router.get("/person/termo.html", async (req, res, next) => {
  try {
    const nome = String(req.query.nome ?? "").trim();
    if (!nome) return res.status(400).json({ error: "Informe o nome da pessoa." });
    const unitId = req.query.unitId ? String(req.query.unitId) : req.user!.unitId;
    const result = await termoForPerson(nome, unitId);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

import { sendToClicksign } from "./clicksign.service";

const clicksignSchema = z.object({
  filename: z.string(),
  pdfBase64: z.string(),
  signers: z.array(z.object({
    name: z.string(),
    email: z.string().email(),
    documentation: z.string().optional(),
    sign_as: z.string().optional(),
  })),
  message: z.string().optional(),
  pasta: z.string().optional(),
});

// POST /api/documents/clicksign/send — Envia um PDF Base64 para o Clicksign
router.post("/clicksign/send", async (req, res, next) => {
  try {
    const body = clicksignSchema.parse(req.body);
    const result = await sendToClicksign(body);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
