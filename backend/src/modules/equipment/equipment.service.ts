// Regras de negócio dos equipamentos, incluindo a geração AUTOMÁTICA do
// histórico de responsáveis sempre que o "Usuário Atual" muda.
import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { AppError } from "../../middlewares/error";
import { getSettings } from "../settings/settings.service";
import {
  CreateEquipmentInput,
  UpdateEquipmentInput,
  AssignInput,
} from "./equipment.schema";

// Normaliza nomes para comparação (ignora espaços extras e maiúsc./minúsc.).
function sameName(a?: string | null, b?: string | null) {
  return (a ?? "").trim().toLowerCase() === (b ?? "").trim().toLowerCase();
}

// Deriva um prefixo (3 letras) a partir do nome da categoria. Ex.: Celular -> CEL.
function prefixFromCategory(name: string): string {
  const letters = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z]/g, "")
    .toUpperCase();
  return (letters.slice(0, 3) || "EQP").padEnd(3, "X");
}

// Gera um ID do Ativo único no formato PREFIXO-0001, com base na categoria.
// O número é o próximo da sequência para aquele prefixo.
export async function generateAssetId(
  tx: Prisma.TransactionClient,
  categoryId: string
): Promise<string> {
  const category = await tx.category.findUnique({ where: { id: categoryId } });
  const prefix = prefixFromCategory(category?.name ?? "EQP");

  // Busca o maior número já usado com esse prefixo.
  const existing = await tx.equipment.findMany({
    where: { assetId: { startsWith: `${prefix}-` } },
    select: { assetId: true },
  });
  let max = 0;
  for (const e of existing) {
    const n = parseInt(e.assetId.slice(prefix.length + 1), 10);
    if (!isNaN(n) && n > max) max = n;
  }

  // Garante unicidade mesmo diante de IDs manuais fora do padrão.
  let next = max + 1;
  let candidate = `${prefix}-${String(next).padStart(4, "0")}`;
  while (await tx.equipment.findUnique({ where: { assetId: candidate } })) {
    next++;
    candidate = `${prefix}-${String(next).padStart(4, "0")}`;
  }
  return candidate;
}

export interface EquipmentFilters {
  unitId: string; // unidade (tenant) — sempre presente, isola os dados
  search?: string;
  categoryId?: string;
  status?: string;
  condition?: string;
  responsible?: string;
  department?: string;
  location?: string;
}

// Monta o "where" do Prisma a partir dos filtros da listagem.
function buildWhere(f: EquipmentFilters): Prisma.EquipmentWhereInput {
  const where: Prisma.EquipmentWhereInput = {};
  const and: Prisma.EquipmentWhereInput[] = [{ unitId: f.unitId }];

  if (f.categoryId) and.push({ categoryId: f.categoryId });
  if (f.status) and.push({ status: f.status });
  if (f.condition) and.push({ condition: f.condition });
  if (f.department) and.push({ department: { contains: f.department } });
  if (f.location) and.push({ location: { contains: f.location } });
  if (f.responsible) and.push({ currentUserName: { contains: f.responsible } });

  if (f.search) {
    const s = f.search;
    and.push({
      OR: [
        { assetId: { contains: s } },
        { brand: { contains: s } },
        { model: { contains: s } },
        { serialNumber: { contains: s } },
        { assetTag: { contains: s } },
        { currentUserName: { contains: s } },
        { userEmail: { contains: s } },
      ],
    });
  }

  if (and.length) where.AND = and;
  return where;
}

export async function listEquipment(filters: EquipmentFilters) {
  return prisma.equipment.findMany({
    where: buildWhere(filters),
    include: { category: true },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getEquipment(id: string, unitId: string) {
  const eq = await prisma.equipment.findUnique({
    where: { id },
    include: {
      category: true,
      assignments: { orderBy: [{ startDate: "desc" }, { createdAt: "desc" }] },
    },
  });
  // 404 também quando o item é de outra unidade (isolamento).
  if (!eq || eq.unitId !== unitId) throw new AppError("Equipamento não encontrado.", 404);
  return eq;
}

export async function createEquipment(input: CreateEquipmentInput, unitId: string) {
  return prisma.$transaction(async (tx) => {
    // ID do Ativo gerado automaticamente quando não é informado.
    const assetId =
      input.assetId && input.assetId.trim()
        ? input.assetId.trim()
        : await generateAssetId(tx, input.categoryId);

    const eq = await tx.equipment.create({
      data: {
        ...input,
        assetId,
        unitId,
        statusChangedAt: new Date(),
      } as Prisma.EquipmentUncheckedCreateInput,
    });

    // Se já nasce "em uso" com um responsável, abre o 1º registro de histórico.
    if (eq.status === "EM_USO" && eq.currentUserName) {
      await tx.assignmentHistory.create({
        data: {
          equipmentId: eq.id,
          userName: eq.currentUserName,
          userEmail: eq.userEmail,
          department: eq.department,
          manager: eq.manager,
          startDate: eq.deliveryDate ?? new Date(),
        },
      });
    }
    return eq;
  });
}

export async function updateEquipment(id: string, input: UpdateEquipmentInput, unitId: string) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.equipment.findUnique({ where: { id } });
    if (!current || current.unitId !== unitId) throw new AppError("Equipamento não encontrado.", 404);

    const statusChanged =
      input.status !== undefined && input.status !== current.status;

    const eq = await tx.equipment.update({
      where: { id },
      data: {
        ...input,
        ...(statusChanged ? { statusChangedAt: new Date() } : {}),
      } as Prisma.EquipmentUncheckedUpdateInput,
    });

    // Detecta troca de responsável comparando antes/depois.
    const newName = input.currentUserName ?? current.currentUserName;
    await reconcileAssignment(tx, current.id, current.currentUserName, eq, newName);

    return eq;
  });
}

// Fecha o histórico anterior e abre um novo quando o responsável muda.
async function reconcileAssignment(
  tx: Prisma.TransactionClient,
  equipmentId: string,
  previousName: string | null,
  eq: { currentUserName: string | null; userEmail: string | null; department: string | null; manager: string | null; status: string; deliveryDate: Date | null },
  newName: string | null,
  note?: string
) {
  if (sameName(previousName, newName)) return; // nada mudou

  // Fecha o registro em aberto (responsável anterior), se existir.
  const open = await tx.assignmentHistory.findFirst({
    where: { equipmentId, endDate: null },
    orderBy: { startDate: "desc" },
  });
  if (open) {
    await tx.assignmentHistory.update({
      where: { id: open.id },
      data: { endDate: new Date() },
    });
  }

  // Abre um novo registro para o novo responsável (se houver nome).
  if (newName && newName.trim()) {
    await tx.assignmentHistory.create({
      data: {
        equipmentId,
        userName: newName.trim(),
        userEmail: eq.userEmail,
        department: eq.department,
        manager: eq.manager,
        startDate: eq.deliveryDate ?? new Date(),
        note,
      },
    });
  }
}

// Troca rápida de responsável: usado pela ação "Atribuir / Trocar usuário".
// Coloca o item em uso, atualiza os dados do responsável e registra o histórico.
export async function assignEquipment(id: string, input: AssignInput, unitId: string) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.equipment.findUnique({ where: { id } });
    if (!current || current.unitId !== unitId) throw new AppError("Equipamento não encontrado.", 404);

    const eq = await tx.equipment.update({
      where: { id },
      data: {
        currentUserName: input.currentUserName,
        userEmail: input.userEmail ?? null,
        department: input.department ?? null,
        manager: input.manager ?? null,
        deliveryDate: input.deliveryDate ?? new Date(),
        status: "EM_USO",
        statusChangedAt: current.status !== "EM_USO" ? new Date() : current.statusChangedAt,
      },
    });

    await reconcileAssignment(
      tx,
      id,
      current.currentUserName,
      eq,
      input.currentUserName,
      input.note ?? undefined
    );
    return eq;
  });
}

// Devolve o item ao estoque: encerra o responsável atual no histórico.
export async function unassignEquipment(id: string, unitId: string, note?: string) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.equipment.findUnique({ where: { id } });
    if (!current || current.unitId !== unitId) throw new AppError("Equipamento não encontrado.", 404);

    const eq = await tx.equipment.update({
      where: { id },
      data: {
        currentUserName: null,
        status: "EM_ESTOQUE",
        statusChangedAt: new Date(),
      },
    });

    await reconcileAssignment(tx, id, current.currentUserName, eq, null, note);
    return eq;
  });
}

export async function deleteEquipment(id: string, unitId: string) {
  const eq = await prisma.equipment.findUnique({ where: { id } });
  if (!eq || eq.unitId !== unitId) throw new AppError("Equipamento não encontrado.", 404);
  await prisma.equipment.delete({ where: { id } });
}

// -----------------------------------------------------------------------------
// Estatísticas para o painel (dashboard).
// -----------------------------------------------------------------------------
export async function getDashboardStats(unitId: string) {
  const settings = await getSettings(unitId);
  const items = await prisma.equipment.findMany({ where: { unitId }, include: { category: true } });

  const now = Date.now();
  const idleMs = settings.idleDaysLimit * 24 * 60 * 60 * 1000;

  const totals = {
    total: items.length,
    emUso: 0,
    emEstoque: 0,
    emManutencao: 0,
    descartado: 0,
    parados: 0, // em estoque além do limite de dias
    proprios: 0,
    alugados: 0,
    semPropriedade: 0,
  };

  // Agrupamento por categoria (tipo).
  const porCategoria = new Map<
    string,
    { categoria: string; total: number; emUso: number; emEstoque: number; emManutencao: number; descartado: number; parados: number }
  >();

  for (const eq of items) {
    if (eq.status === "EM_USO") totals.emUso++;
    else if (eq.status === "EM_ESTOQUE") totals.emEstoque++;
    else if (eq.status === "EM_MANUTENCAO") totals.emManutencao++;
    else if (eq.status === "DESCARTADO") totals.descartado++;

    const parado =
      eq.status === "EM_ESTOQUE" && now - new Date(eq.statusChangedAt).getTime() >= idleMs;
    if (parado) totals.parados++;

    if (eq.ownership === "PROPRIO") totals.proprios++;
    else if (eq.ownership === "ALUGADO") totals.alugados++;
    else totals.semPropriedade++;

    const nome = eq.category.name;
    if (!porCategoria.has(nome)) {
      porCategoria.set(nome, {
        categoria: nome,
        total: 0,
        emUso: 0,
        emEstoque: 0,
        emManutencao: 0,
        descartado: 0,
        parados: 0,
      });
    }
    const c = porCategoria.get(nome)!;
    c.total++;
    if (eq.status === "EM_USO") c.emUso++;
    else if (eq.status === "EM_ESTOQUE") c.emEstoque++;
    else if (eq.status === "EM_MANUTENCAO") c.emManutencao++;
    else if (eq.status === "DESCARTADO") c.descartado++;
    if (parado) c.parados++;
  }

  return {
    settings,
    totals,
    porCategoria: Array.from(porCategoria.values()).sort((a, b) => b.total - a.total),
  };
}
