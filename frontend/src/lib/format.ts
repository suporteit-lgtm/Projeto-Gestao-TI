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

// Detecta se a categoria é de LINHA CORPORATIVA (chip/plano de telefonia).
// A linha não é um aparelho: o que importa é operadora, plano, ICCID e número.
export function isLineCategory(name?: string | null): boolean {
  if (!name) return false;
  return /linha|chip|sim.?card/i.test(name);
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
//
// Os campos de data do sistema (aquisição, entrega, garantia, conferência) são
// "data pura", sem hora, e ficam gravados à meia-noite UTC. Formatar no fuso do
// navegador jogava a data um dia para trás no Brasil (2026-02-01T00:00Z virava
// 31/01/2026), então a exibição é fixada em UTC — igual ao toDateInput, que
// também trabalha em UTC.
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("pt-BR", { timeZone: "UTC" });
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
