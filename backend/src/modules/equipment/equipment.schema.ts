// Validação (Zod) dos dados de equipamento na criação e edição.
import { z } from "zod";
import { STATUS_KEYS, CONDITION_KEYS, OWNERSHIP_KEYS } from "./equipment.constants";

// Converte "" -> undefined, e strings de data -> Date. Mantém null explícito.
const optionalString = z
  .union([z.string(), z.null()])
  .optional()
  .transform((v) => (v === "" || v === undefined ? undefined : v));

const optionalDate = z
  .union([z.string(), z.date(), z.null()])
  .optional()
  .transform((v) => {
    if (v === "" || v === null || v === undefined) return null;
    const d = v instanceof Date ? v : new Date(v);
    return isNaN(d.getTime()) ? null : d;
  });

const optionalNumber = z
  .union([z.string(), z.number(), z.null()])
  .optional()
  .transform((v) => {
    if (v === "" || v === null || v === undefined) return null;
    const n = typeof v === "number" ? v : Number(String(v).replace(",", "."));
    return isNaN(n) ? null : n;
  });

// Campos comuns. O ID do Ativo é GERADO automaticamente quando não é enviado.
const baseShape = {
  // assetId opcional: se vier vazio, o backend gera (ex.: CEL-0001).
  assetId: optionalString,
  categoryId: z.string().min(1, "Selecione a categoria."),
  brand: optionalString,
  model: optionalString,
  color: optionalString,
  configuration: optionalString,
  serialNumber: optionalString,
  assetTag: optionalString,
  status: z.enum(STATUS_KEYS),
  condition: z.enum(CONDITION_KEYS),
  ownership: z.enum(OWNERSHIP_KEYS).optional().nullable(),
  supplier: optionalString,
  location: optionalString,
  // Campos específicos de celular
  pelicula: optionalString,
  capa: optionalString,
  imei1: optionalString,
  imei2: optionalString,
  macAddress: optionalString,
  currentUserName: optionalString,
  department: optionalString,
  manager: optionalString,
  userEmail: optionalString,
  userCpf: optionalString,
  acquisitionDate: optionalDate,
  deliveryDate: optionalDate,
  warrantyEndDate: optionalDate,
  lastCheckDate: optionalDate,
  value: optionalNumber,
  notes: optionalString,
  accessories: optionalString,
};

export const createEquipmentSchema = z.object(baseShape);

// Na edição, todos os campos são opcionais (atualização parcial).
export const updateEquipmentSchema = z.object({
  ...baseShape,
  categoryId: z.string().min(1).optional(),
  status: z.enum(STATUS_KEYS).optional(),
  condition: z.enum(CONDITION_KEYS).optional(),
});

// Troca rápida de responsável.
export const assignSchema = z.object({
  currentUserName: z.string().min(1, "Informe o nome do responsável."),
  userEmail: optionalString,
  department: optionalString,
  manager: optionalString,
  deliveryDate: optionalDate,
  note: optionalString,
});

export type CreateEquipmentInput = z.infer<typeof createEquipmentSchema>;
export type UpdateEquipmentInput = z.infer<typeof updateEquipmentSchema>;
export type AssignInput = z.infer<typeof assignSchema>;
