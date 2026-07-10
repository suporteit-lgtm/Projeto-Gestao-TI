// Rotas de autenticação.
import { Router } from "express";
import { z } from "zod";
import { login, switchUnit } from "./auth.service";
import { authenticate } from "../../middlewares/auth";
import { prisma } from "../../config/prisma";

const router = Router();

const loginSchema = z.object({
  email: z.string().email("E-mail inválido."),
  password: z.string().min(1, "Informe a senha."),
  unitId: z.string().optional(),
});

// GET /api/auth/units — lista pública das unidades (para o seletor do login).
router.get("/units", async (_req, res, next) => {
  try {
    const units = await prisma.unit.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    });
    res.json(units);
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/units-stats — estatísticas públicas de cada unidade para o banner da tela de login.
router.get("/units-stats", async (_req, res, next) => {
  try {
    const units = await prisma.unit.findMany({
      orderBy: { name: "asc" },
      include: {
        settings: true,
        equipment: true,
      },
    });

    const now = Date.now();
    const stats = units.map((u) => {
      const settings = u.settings || {
        idleDaysLimit: 90,
        conferenceDaysLimit: 180,
        warrantyWarningDays: 30,
      };

      const total = u.equipment.length;
      let emUso = 0;
      let alertas = 0;

      for (const eq of u.equipment) {
        if (eq.status === "EM_USO") {
          emUso++;
        }

        let temAlerta = false;

        // 1) Parado
        if (eq.status === "EM_ESTOQUE") {
          const diasParado = Math.floor((now - eq.statusChangedAt.getTime()) / (1000 * 60 * 60 * 24));
          if (diasParado >= settings.idleDaysLimit) {
            temAlerta = true;
          }
        }

        // 2) Garantia
        if (!temAlerta && eq.warrantyEndDate && eq.status !== "DESCARTADO") {
          const diasGarantia = Math.ceil((eq.warrantyEndDate.getTime() - now) / (1000 * 60 * 60 * 24));
          if (diasGarantia < 0 || diasGarantia <= settings.warrantyWarningDays) {
            temAlerta = true;
          }
        }

        // 3) Conferência
        if (!temAlerta && eq.status !== "DESCARTADO") {
          if (!eq.lastCheckDate) {
            temAlerta = true;
          } else {
            const diasConferencia = Math.floor((now - eq.lastCheckDate.getTime()) / (1000 * 60 * 60 * 24));
            if (diasConferencia >= settings.conferenceDaysLimit) {
              temAlerta = true;
            }
          }
        }

        if (temAlerta) {
          alertas++;
        }
      }

      return {
        id: u.id,
        name: u.name,
        total,
        emUso,
        alertas,
      };
    });

    res.json(stats);
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
router.post("/login", async (req, res, next) => {
  try {
    const { email, password, unitId } = loginSchema.parse(req.body);
    const result = await login(email, password, unitId);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/switch-unit — troca a unidade ativa na sessão atual.
router.post("/switch-unit", authenticate, async (req, res, next) => {
  try {
    const { unitId } = z.object({ unitId: z.string().min(1) }).parse(req.body);
    const result = await switchUnit(req.user!.sub, unitId);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me — retorna os dados do usuário logado (valida o token).
router.get("/me", authenticate, (req, res) => {
  res.json({ user: req.user });
});

export default router;
