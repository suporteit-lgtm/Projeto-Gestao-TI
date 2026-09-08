// Impede cadastrar duas vezes o MESMO equipamento físico. Dois ativos não podem
// compartilhar número de série, número de patrimônio, IMEI ou endereço MAC —
// esses campos identificam o aparelho, então repetição significa duplicata.
//
// Marca/modelo NÃO entram: cinco monitores iguais sem número de série são cinco
// equipamentos diferentes, e não uma duplicata.
import { AppError } from "../../middlewares/error";

// Comparação tolerante à formatação: descarta tudo que não é letra ou dígito,
// então "sn-123 456" e "SN123456" são o mesmo número de série, e
// "(11) 99999-8888" é o mesmo telefone que "11999998888".
function normalizeIdentifier(value?: string | null): string {
  return (value ?? "").replace(/[^0-9A-Za-z]/g, "").toUpperCase();
}

// Grupos de campos que representam o mesmo identificador. IMEI 1 e IMEI 2
// ficam juntos: o IMEI novo não pode ser o IMEI 2 de outro aparelho.
const IDENTIFIER_GROUPS = [
  { label: "Número de Série", fields: ["serialNumber"] },
  { label: "Número de Patrimônio", fields: ["assetTag"] },
  { label: "IMEI", fields: ["imei1", "imei2"] },
  { label: "Endereço MAC", fields: ["macAddress"] },
  // Linha corporativa: o chip e o número identificam a linha.
  { label: "ICCID", fields: ["iccid"] },
  { label: "Número de Telefone", fields: ["telefone"] },
] as const;

const IDENTIFIER_FIELDS = [
  "serialNumber",
  "assetTag",
  "imei1",
  "imei2",
  "macAddress",
  "iccid",
  "telefone",
] as const;

export type IdentifierFields = {
  [K in (typeof IDENTIFIER_FIELDS)[number]]?: string | null;
};

// Colunas que a checagem precisa carregar do banco.
export const DUPLICATE_SELECT = {
  id: true,
  assetId: true,
  brand: true,
  model: true,
  serialNumber: true,
  assetTag: true,
  imei1: true,
  imei2: true,
  macAddress: true,
  iccid: true,
  telefone: true,
} as const;

export interface ExistingEquipment extends IdentifierFields {
  id: string;
  assetId: string;
  brand?: string | null;
  model?: string | null;
}

export interface DuplicateConflict {
  label: string; // rótulo do campo em conflito (ex.: "Número de Série")
  value: string; // valor como o usuário digitou
  existing: ExistingEquipment;
}

// Nada identificável preenchido -> não há como detectar duplicata.
export function hasIdentifier(eq: IdentifierFields): boolean {
  return IDENTIFIER_FIELDS.some((f) => normalizeIdentifier(eq[f]).length > 0);
}

// Valores (normalizados) que o registro tem num grupo.
function groupValues(eq: IdentifierFields, fields: readonly string[]): string[] {
  return fields
    .map((f) => normalizeIdentifier(eq[f as keyof IdentifierFields]))
    .filter((v) => v.length > 0);
}

// Procura entre os ativos existentes um que compartilhe algum identificador
// com o equipamento que está sendo cadastrado/editado.
export function findDuplicate(
  incoming: IdentifierFields,
  existing: ExistingEquipment[]
): DuplicateConflict | null {
  for (const group of IDENTIFIER_GROUPS) {
    const novos = groupValues(incoming, group.fields);
    if (!novos.length) continue;

    for (const eq of existing) {
      const repetido = novos.find((v) => groupValues(eq, group.fields).includes(v));
      if (!repetido) continue;

      // Mostra o valor como foi digitado, não o normalizado.
      const original = group.fields
        .map((f) => incoming[f as keyof IdentifierFields])
        .find((v) => normalizeIdentifier(v) === repetido);
      return { label: group.label, value: (original ?? repetido).trim(), existing: eq };
    }
  }
  return null;
}

export function duplicateMessage(c: DuplicateConflict): string {
  const descricao = [c.existing.brand, c.existing.model].filter(Boolean).join(" ");
  const ativo = descricao ? `${c.existing.assetId} (${descricao})` : c.existing.assetId;
  return (
    `Este equipamento já está cadastrado no inventário: o ${c.label} "${c.value}" ` +
    `pertence ao ativo ${ativo}. Corrija o campo ou edite o ativo existente.`
  );
}

// Lança 409 (Conflito) quando o equipamento já existe no inventário.
export function assertNotDuplicate(incoming: IdentifierFields, existing: ExistingEquipment[]) {
  const conflito = findDuplicate(incoming, existing);
  if (conflito) throw new AppError(duplicateMessage(conflito), 409);
}
