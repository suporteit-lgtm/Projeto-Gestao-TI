// Funções de formatação e rótulos em PT-BR.

export const STATUS_LABEL: Record<string, string> = {
  EM_USO: "Em uso",
  EM_ESTOQUE: "Em estoque",
  EM_MANUTENCAO: "Em manutenção",
  DESCARTADO: "Descartado",
};

export const CONDITION_LABEL: Record<string, string> = {
  NOVO: "Novo",
  BOM: "Bom",
  REGULAR: "Regular",
  RUIM: "Ruim",
  DEFEITO: "Defeito",
};

export const OWNERSHIP_LABEL: Record<string, string> = {
  PROPRIO: "Próprio",
  ALUGADO: "Alugado",
};

// Detecta se a categoria é de telefone/celular (para mostrar campos específicos).
export function isPhoneCategory(name?: string | null): boolean {
  if (!name) return false;
  return /celular|telefone|smartphone|phone|iphone/i.test(name);
}

// Cores (classes Tailwind) para os badges de status.
export const STATUS_COLOR: Record<string, string> = {
  EM_USO: "bg-green-100 text-green-800",
  EM_ESTOQUE: "bg-blue-100 text-blue-800",
  EM_MANUTENCAO: "bg-amber-100 text-amber-800",
  DESCARTADO: "bg-gray-200 text-gray-600",
};

export const CONDITION_COLOR: Record<string, string> = {
  NOVO: "bg-emerald-100 text-emerald-800",
  BOM: "bg-green-100 text-green-800",
  REGULAR: "bg-yellow-100 text-yellow-800",
  RUIM: "bg-orange-100 text-orange-800",
  DEFEITO: "bg-red-100 text-red-800",
};

// Data ISO -> dd/mm/aaaa.
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("pt-BR");
}

// Data ISO -> yyyy-mm-dd (para inputs type="date").
export function toDateInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

// Número -> "R$ 1.234,56".
export function formatMoney(value: number | null | undefined): string {
  if (value == null) return "—";
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
