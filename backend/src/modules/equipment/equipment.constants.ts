// Listas FIXAS de Status e Condição (o cliente definiu valores fechados).
// Guardamos o valor "interno" (chave) e o rótulo em PT-BR para exibição.

export const STATUS = {
  EM_USO: "Em uso",
  EM_ESTOQUE: "Em estoque",
  EM_MANUTENCAO: "Em manutenção",
  DESCARTADO: "Descartado",
} as const;

export const CONDITION = {
  NOVO: "Novo",
  BOM: "Bom",
  REGULAR: "Regular",
  RUIM: "Ruim",
  DEFEITO: "Defeito",
} as const;

// Propriedade do ativo (para o painel: próprios x alugados).
export const OWNERSHIP = {
  PROPRIO: "Próprio",
  ALUGADO: "Alugado",
} as const;

export type StatusKey = keyof typeof STATUS;
export type ConditionKey = keyof typeof CONDITION;
export type OwnershipKey = keyof typeof OWNERSHIP;

export const STATUS_KEYS = Object.keys(STATUS) as [StatusKey, ...StatusKey[]];
export const CONDITION_KEYS = Object.keys(CONDITION) as [ConditionKey, ...ConditionKey[]];
export const OWNERSHIP_KEYS = Object.keys(OWNERSHIP) as [OwnershipKey, ...OwnershipKey[]];

// Detecta se uma categoria é de telefone/celular pelo nome (para mostrar os
// campos específicos: IMEI, MAC, película, capa, CPF...).
export function isPhoneCategoryName(name?: string | null): boolean {
  if (!name) return false;
  return /celular|telefone|smartphone|phone|iphone/i.test(name);
}

export function ownershipFromLabel(label: string): OwnershipKey | null {
  const v = label.trim().toLowerCase();
  const entry = Object.entries(OWNERSHIP).find(([, l]) => l.toLowerCase() === v);
  if (entry) return entry[0] as OwnershipKey;
  const upper = label.trim().toUpperCase();
  return (OWNERSHIP_KEYS as string[]).includes(upper) ? (upper as OwnershipKey) : null;
}

// Ajuda a importação: mapeia rótulos PT-BR (do Sheets) de volta para a chave interna.
export function statusFromLabel(label: string): StatusKey | null {
  const v = label.trim().toLowerCase();
  const entry = Object.entries(STATUS).find(([, l]) => l.toLowerCase() === v);
  if (entry) return entry[0] as StatusKey;
  // aceita também a própria chave
  const upper = label.trim().toUpperCase().replace(/\s+/g, "_");
  return (STATUS_KEYS as string[]).includes(upper) ? (upper as StatusKey) : null;
}

export function conditionFromLabel(label: string): ConditionKey | null {
  const v = label.trim().toLowerCase();
  const entry = Object.entries(CONDITION).find(([, l]) => l.toLowerCase() === v);
  if (entry) return entry[0] as ConditionKey;
  const upper = label.trim().toUpperCase();
  return (CONDITION_KEYS as string[]).includes(upper) ? (upper as ConditionKey) : null;
}
