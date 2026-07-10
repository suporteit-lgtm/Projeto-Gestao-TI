// Rota do painel (dashboard): totais e quebra por categoria/propriedade/status.
import { Router } from "express";
import { authenticate } from "../../middlewares/auth";
import { getDashboardStats } from "../equipment/equipment.service";

const router = Router();
router.use(authenticate);

// GET /api/dashboard
router.get("/", async (req, res, next) => {
  try {
    res.json(await getDashboardStats(req.user!.unitId));
  } catch (err) {
    next(err);
  }
});

export default router;
