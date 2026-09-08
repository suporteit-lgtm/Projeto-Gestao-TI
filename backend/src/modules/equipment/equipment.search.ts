// Busca livre do inventario: varre TODAS as informacoes do equipamento.
// Fica em modulo proprio para poder ser testada isoladamente.
import { Prisma } from "@prisma/client";
import {
  STATUS,
  CONDITION,
  OWNERSHIP,
  StatusKey,
  ConditionKey,
  OwnershipKey,
} from "./equipment.constants";

// ── Busca livre ──────────────────────────────────────────────────────────────
// A busca varre TODAS as informações do equipamento: campos de texto, nome da
// categoria, rótulos de status/condição/propriedade, datas e valor. É feita em
// memória (a listagem já carrega a unidade inteira) porque assim conseguimos
// ignorar acentos — algo que o `contains` do Postgres não faz.

type ListedEquipment = Prisma.EquipmentGetPayload<{ include: { category: true } }>;

// Minúsculas, sem acento e sem espaços repetidos.
function normalizeSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

// Data -> "aaaa-mm-dd" e "dd/mm/aaaa" (o usuário pode digitar em qualquer um).
function dateTokens(d: Date | null | undefined): string[] {
  if (!d) return [];
  const iso = d.toISOString().slice(0, 10);
  const [y, m, day] = iso.split("-");
  return [iso, `${day}/${m}/${y}`];
}

// Valor -> "1500.5", "1500,5" e "1.500,50" (como aparece na tela).
function moneyTokens(v: number | null | undefined): string[] {
  if (v == null) return [];
  return [
    String(v),
    String(v).replace(".", ","),
    v.toLocaleString("pt-BR", { minimumFractionDigits: 2 }),
  ];
}

// Junta tudo que é "informação do equipamento" num único texto pesquisável.
function searchHaystack(eq: ListedEquipment): string {
  const parts: (string | null | undefined)[] = [
    eq.assetId,
    eq.category?.name,
    eq.brand,
    eq.model,
    eq.color,
    eq.configuration,
    eq.serialNumber,
    eq.assetTag,
    eq.status,
    STATUS[eq.status as StatusKey],
    eq.condition,
    CONDITION[eq.condition as ConditionKey],
    eq.ownership,
    OWNERSHIP[eq.ownership as OwnershipKey],
    eq.supplier,
    eq.location,
    eq.pelicula,
    eq.capa,
    eq.imei1,
    eq.imei2,
    eq.macAddress,
    eq.operadora,
    eq.plano,
    eq.portabilidade,
    eq.iccid,
    eq.telefone,
    eq.previousUserName,
    eq.currentUserName,
    eq.department,
    eq.manager,
    eq.userEmail,
    eq.userCpf,
    eq.notes,
    eq.accessories,
    ...dateTokens(eq.acquisitionDate),
    ...dateTokens(eq.deliveryDate),
    ...dateTokens(eq.warrantyEndDate),
    ...dateTokens(eq.lastCheckDate),
    ...moneyTokens(eq.value),
  ];
  return normalizeSearch(parts.filter(Boolean).join(" "));
}

// Cada palavra digitada precisa aparecer em algum campo (ex.: "dell 8gb").
export function filterBySearch<T extends ListedEquipment>(items: T[], search?: string): T[] {
  const terms = normalizeSearch(search ?? "").split(" ").filter(Boolean);
  if (!terms.length) return items;
  return items.filter((eq) => {
    const haystack = searchHaystack(eq);
    return terms.every((term) => haystack.includes(term));
  });
}
