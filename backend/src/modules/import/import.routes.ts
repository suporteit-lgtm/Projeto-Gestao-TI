// Rotas de importação: lista de campos, validação (dry-run) e commit.
import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../../middlewares/auth";
import {
  IMPORT_FIELDS,
  validateImport,
  commitImport,
  buildTemplateCsv,
} from "./import.service";

const router = Router();
router.use(authenticate);

// Cada linha é um objeto { chaveInterna: valorTexto }.
const rowsSchema = z.object({
  rows: z.array(z.record(z.string(), z.string().optional())),
});

// GET /api/import/fields — campos disponíveis para o mapeamento na tela.
router.get("/fields", (_req, res) => {
  res.json(IMPORT_FIELDS);
});

// GET /api/import/modelo — baixa a planilha modelo (CSV) com todas as colunas
// aceitas e duas linhas de exemplo.
router.get("/modelo", (_req, res) => {
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="modelo-importacao.csv"');
  res.send(buildTemplateCsv());
});

// POST /api/import/validate — valida sem gravar (preview), já apontando as
// linhas que duplicam um equipamento do inventário ou do próprio arquivo.
router.post("/validate", async (req, res, next) => {
  try {
    const { rows } = rowsSchema.parse(req.body);
    res.json(await validateImport(rows, req.user!.unitId));
  } catch (err) {
    next(err);
  }
});

// POST /api/import/commit — importa de fato.
router.post("/commit", async (req, res, next) => {
  try {
    const { rows } = rowsSchema.parse(req.body);
    res.json(await commitImport(rows, req.user!.unitId));
  } catch (err) {
    next(err);
  }
});

export default router;
