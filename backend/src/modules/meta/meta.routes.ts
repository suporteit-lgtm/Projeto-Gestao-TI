// Metadados úteis ao frontend: rótulos das listas fixas (Status/Condição).
import { Router } from "express";
import { authenticate } from "../../middlewares/auth";
import { STATUS, CONDITION, OWNERSHIP } from "../equipment/equipment.constants";

const router = Router();
router.use(authenticate);

router.get("/", (_req, res) => {
  res.json({
    status: Object.entries(STATUS).map(([key, label]) => ({ key, label })),
    condition: Object.entries(CONDITION).map(([key, label]) => ({ key, label })),
    ownership: Object.entries(OWNERSHIP).map(([key, label]) => ({ key, label })),
  });
});

export default router;
