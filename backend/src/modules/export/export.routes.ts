// Exportação do inventário (respeitando os filtros aplicados) para CSV e Excel.
import { Router } from "express";
import ExcelJS from "exceljs";
import Papa from "papaparse";
import { authenticate } from "../../middlewares/auth";
import { listEquipment, EquipmentFilters } from "../equipment/equipment.service";
import { exportColumns } from "./export.columns";

const router = Router();
router.use(authenticate);

function filtersFromQuery(q: any, unitId: string): EquipmentFilters {
  return {
    unitId,
    search: q.search,
    categoryId: q.categoryId,
    status: q.status,
    condition: q.condition,
    responsible: q.responsible,
    department: q.department,
    location: q.location,
  };
}

// GET /api/export/csv — gera um CSV com cabeçalhos em PT-BR.
router.get("/csv", async (req, res, next) => {
  try {
    const items = await listEquipment(filtersFromQuery(req.query, req.user!.unitId));
    const rows = items.map((eq) => {
      const row: Record<string, unknown> = {};
      for (const col of exportColumns) row[col.header] = col.get(eq);
      return row;
    });

    // BOM (﻿) ajuda o Excel a abrir UTF-8 com acentos corretos.
    const csv = "﻿" + Papa.unparse(rows, { delimiter: ";" });
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="inventario.csv"');
    res.send(csv);
  } catch (err) {
    next(err);
  }
});

// GET /api/export/xlsx — gera uma planilha Excel formatada.
router.get("/xlsx", async (req, res, next) => {
  try {
    const items = await listEquipment(filtersFromQuery(req.query, req.user!.unitId));

    const wb = new ExcelJS.Workbook();
    wb.creator = "Inventário de T.I.";
    const ws = wb.addWorksheet("Inventário");

    ws.columns = exportColumns.map((c) => ({
      header: c.header,
      key: c.header,
      width: Math.max(14, Math.min(40, c.header.length + 6)),
    }));

    // Cabeçalho em negrito com fundo.
    ws.getRow(1).font = { bold: true };
    ws.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1F2937" },
    };
    ws.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };

    for (const eq of items) {
      const row: Record<string, unknown> = {};
      for (const col of exportColumns) row[col.header] = col.get(eq);
      ws.addRow(row);
    }
    ws.autoFilter = { from: "A1", to: { row: 1, column: exportColumns.length } };

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", 'attachment; filename="inventario.xlsx"');
    await wb.xlsx.write(res);
    res.end();
  } catch (err) {
    next(err);
  }
});

export default router;
