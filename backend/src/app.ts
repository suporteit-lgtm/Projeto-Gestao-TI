// Configuração do app Express: middlewares globais e registro das rotas.
import express from "express";
import cors from "cors";
import { env } from "./config/env";
import { errorHandler } from "./middlewares/error";

import authRoutes from "./modules/auth/auth.routes";
import usersRoutes from "./modules/users/users.routes";
import categoriesRoutes from "./modules/categories/categories.routes";
import equipmentRoutes from "./modules/equipment/equipment.routes";
import alertsRoutes from "./modules/alerts/alerts.routes";
import settingsRoutes from "./modules/settings/settings.routes";
import exportRoutes from "./modules/export/export.routes";
import importRoutes from "./modules/import/import.routes";
import documentsRoutes from "./modules/documents/documents.routes";
import metaRoutes from "./modules/meta/meta.routes";
import dashboardRoutes from "./modules/dashboard/dashboard.routes";
import unitsRoutes from "./modules/units/units.routes";

export function createApp() {
  const app = express();

  app.use(cors({ origin: env.corsOrigin }));
  app.use(express.json({ limit: "10mb" })); // limite maior por causa da importação

  // Healthcheck simples.
  app.get("/api/health", (_req, res) => res.json({ ok: true }));

  app.use("/api/auth", authRoutes);
  app.use("/api/users", usersRoutes);
  app.use("/api/categories", categoriesRoutes);
  app.use("/api/equipment", equipmentRoutes);
  app.use("/api/alerts", alertsRoutes);
  app.use("/api/settings", settingsRoutes);
  app.use("/api/export", exportRoutes);
  app.use("/api/import", importRoutes);
  app.use("/api/documents", documentsRoutes);
  app.use("/api/meta", metaRoutes);
  app.use("/api/dashboard", dashboardRoutes);
  app.use("/api/units", unitsRoutes);

  // Tratamento de erros sempre por último.
  app.use(errorHandler);

  return app;
}
