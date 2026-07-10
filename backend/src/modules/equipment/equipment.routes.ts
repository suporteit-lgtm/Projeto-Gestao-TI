// Rotas do CRUD de equipamentos + listagem com filtros + troca de responsável.
import { Router } from "express";
import { authenticate } from "../../middlewares/auth";
import {
  createEquipmentSchema,
  updateEquipmentSchema,
  assignSchema,
} from "./equipment.schema";
import {
  listEquipment,
  getEquipment,
  createEquipment,
  updateEquipment,
  deleteEquipment,
  assignEquipment,
  unassignEquipment,
} from "./equipment.service";
import { z } from "zod";

const router = Router();
router.use(authenticate);

// GET /api/equipment — listagem (só da unidade ativa) com busca e filtros.
router.get("/", async (req, res, next) => {
  try {
    const q = req.query;
    const items = await listEquipment({
      unitId: req.user!.unitId,
      search: q.search as string | undefined,
      categoryId: q.categoryId as string | undefined,
      status: q.status as string | undefined,
      condition: q.condition as string | undefined,
      responsible: q.responsible as string | undefined,
      department: q.department as string | undefined,
      location: q.location as string | undefined,
    });
    res.json(items);
  } catch (err) {
    next(err);
  }
});

// GET /api/equipment/:id — ficha completa + histórico.
router.get("/:id", async (req, res, next) => {
  try {
    res.json(await getEquipment(req.params.id, req.user!.unitId));
  } catch (err) {
    next(err);
  }
});

// POST /api/equipment — cria (na unidade ativa).
router.post("/", async (req, res, next) => {
  try {
    const data = createEquipmentSchema.parse(req.body);
    res.status(201).json(await createEquipment(data, req.user!.unitId));
  } catch (err) {
    next(err);
  }
});

// PUT /api/equipment/:id — edita.
router.put("/:id", async (req, res, next) => {
  try {
    const data = updateEquipmentSchema.parse(req.body);
    res.json(await updateEquipment(req.params.id, data, req.user!.unitId));
  } catch (err) {
    next(err);
  }
});

// POST /api/equipment/:id/assign — troca rápida de responsável.
router.post("/:id/assign", async (req, res, next) => {
  try {
    const data = assignSchema.parse(req.body);
    res.json(await assignEquipment(req.params.id, data, req.user!.unitId));
  } catch (err) {
    next(err);
  }
});

// POST /api/equipment/:id/unassign — devolve ao estoque.
router.post("/:id/unassign", async (req, res, next) => {
  try {
    const { note } = z.object({ note: z.string().optional() }).parse(req.body ?? {});
    res.json(await unassignEquipment(req.params.id, req.user!.unitId, note));
  } catch (err) {
    next(err);
  }
});

// DELETE /api/equipment/:id — remove.
router.delete("/:id", async (req, res, next) => {
  try {
    await deleteEquipment(req.params.id, req.user!.unitId);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;
