// Importação inicial do inventário a partir de linhas já mapeadas (chave interna
// -> valor) enviadas pelo frontend. Faz validação e, no commit, cria os
// equipamentos e popula o histórico inicial (inclusive a coluna "Usuário Antigo").
import Papa from "papaparse";
import { prisma } from "../../config/prisma";
import {
  STATUS_KEYS,
  CONDITION_KEYS,
  statusFromLabel,
  conditionFromLabel,
  ownershipFromLabel,
} from "../equipment/equipment.constants";
import { generateAssetId } from "../equipment/equipment.service";
import {
  findDuplicate,
  duplicateMessage,
  hasIdentifier,
  DUPLICATE_SELECT,
  ExistingEquipment,
  IdentifierFields,
} from "../equipment/equipment.duplicates";

// Campos que o frontend pode mapear. "formerUser" alimenta SÓ o histórico.
// "assetId" é opcional: se a coluna estiver vazia, o ID é gerado automaticamente.
export const IMPORT_FIELDS = [
  { key: "assetId", label: "ID do Ativo (vazio = gera automático)", csvHeader: "ID do Ativo" },
  { key: "category", label: "Tipo / Categoria", required: true },
  { key: "brand", label: "Marca" },
  { key: "model", label: "Modelo" },
  { key: "color", label: "Cor" },
  { key: "configuration", label: "Configuração" },
  { key: "serialNumber", label: "Número de Série" },
  { key: "assetTag", label: "Número de Patrimônio" },
  { key: "status", label: "Status do Ativo" },
  { key: "condition", label: "Condição" },
  { key: "ownership", label: "Propriedade (Próprio/Alugado)", csvHeader: "Propriedade" },
  { key: "pelicula", label: "Película" },
  { key: "capa", label: "Capa" },
  { key: "imei1", label: "IMEI 1" },
  { key: "imei2", label: "IMEI 2" },
  { key: "macAddress", label: "Endereço MAC" },
  // Linha corporativa (chip/plano)
  { key: "operadora", label: "Operadora" },
  { key: "plano", label: "Plano" },
  { key: "portabilidade", label: "Portabilidade" },
  { key: "iccid", label: "ICCID" },
  { key: "telefone", label: "Número de Telefone" },
  { key: "supplier", label: "Fornecedor" },
  { key: "location", label: "Localização" },
  { key: "currentUserName", label: "Usuário Atual" },
  { key: "formerUser", label: "Usuário Antigo (vai p/ histórico)", csvHeader: "Usuário Antigo" },
  { key: "department", label: "Departamento" },
  { key: "manager", label: "Gestor" },
  { key: "userEmail", label: "E-mail do Usuário" },
  { key: "userCpf", label: "CPF do Usuário" },
  { key: "acquisitionDate", label: "Data de Aquisição" },
  { key: "deliveryDate", label: "Data de Entrega ao Usuário" },
  { key: "warrantyEndDate", label: "Garantia (Data Final)" },
  { key: "lastCheckDate", label: "Última Conferência" },
  { key: "value", label: "Valor (R$)" },
  { key: "notes", label: "Observações" },
  { key: "accessories", label: "Acessórios" },
] as const;

type Row = Record<string, string | undefined>;

// ── Planilha modelo ─────────────────────────────────────────────────────────
// Gerada a partir de IMPORT_FIELDS, então nunca fica desalinhada dos campos que
// a importação aceita: campo novo na lista = coluna nova no modelo.
// Os cabeçalhos usam os mesmos nomes que o mapeamento automático reconhece, e
// as duas linhas de exemplo mostram os dois formatos (equipamento e linha).
const TEMPLATE_EXAMPLES: Row[] = [
  {
    category: "Notebook",
    brand: "Dell",
    model: "Latitude 5420",
    color: "Preto",
    configuration: "i5 8GB 256GB SSD",
    serialNumber: "SN123XYZ",
    assetTag: "PAT-9987",
    status: "Em uso",
    condition: "Bom",
    ownership: "Próprio",
    supplier: "Fornecedora Alfa",
    location: "Sede - 2º andar",
    currentUserName: "João da Silva",
    formerUser: "Maria Souza",
    department: "Comercial",
    manager: "Carla Dias",
    userEmail: "joao@empresa.com",
    userCpf: "111.222.333-44",
    acquisitionDate: "15/03/2024",
    deliveryDate: "20/03/2024",
    warrantyEndDate: "15/03/2027",
    lastCheckDate: "10/01/2026",
    value: "3.500,00",
    notes: "Tela com risco leve",
    accessories: "Carregador, Mouse",
  },
  {
    category: "Linha Corporativa",
    status: "Em uso",
    condition: "Bom",
    operadora: "Vivo",
    plano: "Controle 20GB",
    portabilidade: "Sim",
    iccid: "89550000000000000001",
    telefone: "(11) 99999-8888",
    supplier: "Vivo Empresas",
    currentUserName: "Ana Lima",
    formerUser: "Pedro Rocha",
    department: "Financeiro",
    manager: "Carla Dias",
    userEmail: "ana@empresa.com",
    userCpf: "222.333.444-55",
    acquisitionDate: "10/01/2026",
    deliveryDate: "01/02/2026",
  },
];

// Cabeçalho da coluna no modelo (o label sem a dica entre parênteses).
function templateHeader(f: (typeof IMPORT_FIELDS)[number]): string {
  return "csvHeader" in f ? f.csvHeader : f.label;
}

// Monta o CSV modelo: cabeçalhos + linhas de exemplo. Mesmo separador (";") e
// BOM do export, para o Excel abrir com os acentos certos.
export function buildTemplateCsv(): string {
  const headers = IMPORT_FIELDS.map(templateHeader);
  const rows = TEMPLATE_EXAMPLES.map((exemplo) => {
    const linha: Record<string, string> = {};
    for (const f of IMPORT_FIELDS) linha[templateHeader(f)] = exemplo[f.key] ?? "";
    return linha;
  });
  return "﻿" + Papa.unparse({ fields: headers, data: rows }, { delimiter: ";" });
}

// Converte data em dd/mm/aaaa, aaaa-mm-dd ou ISO para Date (ou null).
// Sempre à meia-noite UTC: com o horário local do servidor, a mesma planilha
// importada em fusos diferentes gravaria dias diferentes.
function parseDate(value?: string): Date | null {
  if (!value) return null;
  const v = value.trim();
  if (!v) return null;

  // dd/mm/aaaa
  const br = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (br) {
    const [, d, m, y] = br;
    const year = y.length === 2 ? 2000 + Number(y) : Number(y);
    const date = new Date(Date.UTC(year, Number(m) - 1, Number(d)));
    return isNaN(date.getTime()) ? null : date;
  }

  // aaaa-mm-dd
  const iso = v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) {
    const [, y, m, d] = iso;
    const date = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
    return isNaN(date.getTime()) ? null : date;
  }

  const date = new Date(v);
  return isNaN(date.getTime()) ? null : date;
}

// Converte "R$ 1.234,56" / "1234,56" / "1234.56" para número (ou null).
function parseMoney(value?: string): number | null {
  if (!value) return null;
  let v = value.replace(/[R$\s]/g, "").trim();
  if (!v) return null;
  if (v.includes(",")) {
    // formato BR: remove separador de milhar "." e troca "," decimal por "."
    v = v.replace(/\./g, "").replace(",", ".");
  }
  const n = Number(v);
  return isNaN(n) ? null : n;
}

// Identificadores fisicos de uma linha do CSV, no formato que a checagem de
// duplicata espera (a mesma usada no cadastro pela tela).
function rowIdentifiers(row: Row): IdentifierFields {
  return {
    serialNumber: (row.serialNumber ?? "").trim() || null,
    assetTag: (row.assetTag ?? "").trim() || null,
    imei1: (row.imei1 ?? "").trim() || null,
    imei2: (row.imei2 ?? "").trim() || null,
    macAddress: (row.macAddress ?? "").trim() || null,
    iccid: (row.iccid ?? "").trim() || null,
    telefone: (row.telefone ?? "").trim() || null,
  };
}

// Carrega os identificadores dos ativos ja cadastrados na unidade.
async function loadIdentifiers(unitId: string): Promise<ExistingEquipment[]> {
  return prisma.equipment.findMany({ where: { unitId }, select: DUPLICATE_SELECT });
}

export interface RowValidation {
  index: number;
  ok: boolean;
  errors: string[];
  assetId: string;
}

// Valida uma lista de linhas e devolve os problemas de cada uma (dry-run).
export function validateRows(rows: Row[]): RowValidation[] {
  const seen = new Set<string>();
  return rows.map((row, index) => {
    const errors: string[] = [];
    const assetId = (row.assetId ?? "").trim();

    // ID do Ativo é opcional (gerado automaticamente quando vazio). Só valida
    // duplicidade quando um ID foi informado no arquivo.
    if (assetId) {
      if (seen.has(assetId)) errors.push("ID do Ativo duplicado no arquivo.");
      seen.add(assetId);
    }

    if (!(row.category ?? "").trim()) errors.push("Tipo/Categoria é obrigatório.");

    if (row.status && !statusFromLabel(row.status)) {
      errors.push(`Status inválido: "${row.status}".`);
    }
    if (row.condition && !conditionFromLabel(row.condition)) {
      errors.push(`Condição inválida: "${row.condition}".`);
    }

    return { index, ok: errors.length === 0, errors, assetId };
  });
}

// Validacao COMPLETA do preview: formato + duplicatas. Aponta tanto o
// equipamento que ja esta no inventario quanto a linha repetida dentro do
// proprio arquivo, para o usuario corrigir antes de importar.
export async function validateImport(rows: Row[], unitId: string): Promise<RowValidation[]> {
  const validations = validateRows(rows);
  const cadastrados = await loadIdentifiers(unitId);

  // Linhas do arquivo ja aceitas; "id" guarda o indice para citar a linha.
  const doArquivo: ExistingEquipment[] = [];

  rows.forEach((row, i) => {
    const ids = rowIdentifiers(row);
    if (!hasIdentifier(ids)) return;

    const noInventario = findDuplicate(ids, cadastrados);
    if (noInventario) {
      validations[i].errors.push(duplicateMessage(noInventario));
      validations[i].ok = false;
      return;
    }

    const noArquivo = findDuplicate(ids, doArquivo);
    if (noArquivo) {
      const linha = Number(noArquivo.existing.id) + 1;
      validations[i].errors.push(
        `Duplicado no próprio arquivo: o ${noArquivo.label} "${noArquivo.value}" já aparece na linha ${linha}.`
      );
      validations[i].ok = false;
      return;
    }

    doArquivo.push({ id: String(i), assetId: validations[i].assetId, ...ids });
  });

  return validations;
}

export interface ImportResult {
  created: number;
  skipped: number;
  errors: { index: number; assetId: string; reason: string }[];
}

// Importa de fato (na unidade ativa). Linhas inválidas, com assetId já
// existente ou que dupliquem um equipamento do inventário são puladas — a
// importação segue com as demais e reporta o motivo de cada uma.
export async function commitImport(rows: Row[], unitId: string): Promise<ImportResult> {
  const result: ImportResult = { created: 0, skipped: 0, errors: [] };

  // Identificadores já no inventário. A lista cresce a cada linha importada,
  // então pega também duplicata entre linhas do próprio arquivo. Entre os
  // blocos que o frontend envia, as linhas anteriores já estão no banco.
  const identificadores = await loadIdentifiers(unitId);

  // Cache de categorias DA UNIDADE (cria as que faltam, ignorando caixa).
  const categoryCache = new Map<string, string>();
  const todasCategorias = await prisma.category.findMany({ where: { unitId } });
  async function categoryId(name: string): Promise<string> {
    const key = name.trim().toLowerCase();
    if (categoryCache.has(key)) return categoryCache.get(key)!;
    const existing = todasCategorias.find((c) => c.name.trim().toLowerCase() === key);
    const cat = existing ?? (await prisma.category.create({ data: { name: name.trim(), unitId } }));
    if (!existing) todasCategorias.push(cat);
    categoryCache.set(key, cat.id);
    return cat.id;
  }

  const validations = validateRows(rows);

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const v = validations[i];
    const assetId = (row.assetId ?? "").trim();

    if (!v.ok) {
      result.skipped++;
      result.errors.push({ index: i, assetId, reason: v.errors.join(" ") });
      continue;
    }

    // Pula se já existir um equipamento com esse assetId (quando informado).
    if (assetId) {
      const dup = await prisma.equipment.findUnique({ where: { assetId } });
      if (dup) {
        result.skipped++;
        result.errors.push({ index: i, assetId, reason: "Já existe um ativo com esse ID." });
        continue;
      }
    }

    // Mesmo equipamento físico já cadastrado (série, patrimônio, IMEI ou MAC).
    const ids = rowIdentifiers(row);
    if (hasIdentifier(ids)) {
      const conflito = findDuplicate(ids, identificadores);
      if (conflito) {
        result.skipped++;
        result.errors.push({ index: i, assetId, reason: duplicateMessage(conflito) });
        continue;
      }
    }

    const statusKey = row.status ? statusFromLabel(row.status) : null;
    const conditionKey = row.condition ? conditionFromLabel(row.condition) : null;
    const ownershipKey = row.ownership ? ownershipFromLabel(row.ownership) : null;
    const acquisitionDate = parseDate(row.acquisitionDate);
    const deliveryDate = parseDate(row.deliveryDate);
    const currentUserName = (row.currentUserName ?? "").trim() || null;
    const formerUser = (row.formerUser ?? "").trim() || null;

    try {
      // Resolve/cria a categoria ANTES de abrir a transação. O SQLite só
      // permite UM escritor por vez; criar categoria (prisma global) dentro da
      // transação travava o banco e estourava o timeout de 5s.
      const catId = await categoryId(row.category!);

      const criado = await prisma.$transaction(async (tx) => {
        // Gera o ID automaticamente quando a coluna vem vazia.
        const finalAssetId = assetId || (await generateAssetId(tx, catId));
        const eq = await tx.equipment.create({
          data: {
            assetId: finalAssetId,
            categoryId: catId,
            unitId,
            brand: (row.brand ?? "").trim() || null,
            model: (row.model ?? "").trim() || null,
            color: (row.color ?? "").trim() || null,
            configuration: (row.configuration ?? "").trim() || null,
            serialNumber: (row.serialNumber ?? "").trim() || null,
            assetTag: (row.assetTag ?? "").trim() || null,
            status: statusKey ?? (currentUserName ? "EM_USO" : "EM_ESTOQUE"),
            condition: conditionKey ?? "BOM",
            ownership: ownershipKey,
            pelicula: (row.pelicula ?? "").trim() || null,
            capa: (row.capa ?? "").trim() || null,
            imei1: (row.imei1 ?? "").trim() || null,
            imei2: (row.imei2 ?? "").trim() || null,
            macAddress: (row.macAddress ?? "").trim() || null,
            operadora: (row.operadora ?? "").trim() || null,
            plano: (row.plano ?? "").trim() || null,
            portabilidade: (row.portabilidade ?? "").trim() || null,
            iccid: (row.iccid ?? "").trim() || null,
            telefone: (row.telefone ?? "").trim() || null,
            // "Usuário Antigo" alimenta o campo do cadastro E o histórico.
            previousUserName: formerUser,
            supplier: (row.supplier ?? "").trim() || null,
            location: (row.location ?? "").trim() || null,
            currentUserName,
            department: (row.department ?? "").trim() || null,
            manager: (row.manager ?? "").trim() || null,
            userEmail: (row.userEmail ?? "").trim() || null,
            userCpf: (row.userCpf ?? "").trim() || null,
            acquisitionDate,
            deliveryDate,
            warrantyEndDate: parseDate(row.warrantyEndDate),
            lastCheckDate: parseDate(row.lastCheckDate),
            value: parseMoney(row.value),
            notes: (row.notes ?? "").trim() || null,
            accessories: (row.accessories ?? "").trim() || null,
            statusChangedAt: new Date(),
          },
        });

        // Histórico inicial:
        // 1) "Usuário Antigo" -> registro FECHADO (já passou).
        if (formerUser) {
          await tx.assignmentHistory.create({
            data: {
              equipmentId: eq.id,
              userName: formerUser,
              startDate: acquisitionDate ?? new Date(0),
              endDate: deliveryDate ?? new Date(), // encerrado quando o atual assumiu
              note: "Importado do histórico (Usuário Antigo).",
            },
          });
        }
        // 2) "Usuário Atual" (se em uso) -> registro EM ABERTO.
        if (currentUserName && eq.status === "EM_USO") {
          await tx.assignmentHistory.create({
            data: {
              equipmentId: eq.id,
              userName: currentUserName,
              userEmail: eq.userEmail,
              department: eq.department,
              manager: eq.manager,
              startDate: deliveryDate ?? new Date(),
              note: "Importado (responsável atual).",
            },
          });
        }
        return eq;
      }, { timeout: 20000 });

      // Passa a valer como "já cadastrado" para as próximas linhas.
      identificadores.push({
        id: criado.id,
        assetId: criado.assetId,
        brand: criado.brand,
        model: criado.model,
        ...ids,
      });
      result.created++;
    } catch (e: any) {
      result.skipped++;
      result.errors.push({ index: i, assetId, reason: e?.message ?? "Erro ao importar." });
    }
  }

  return result;
}
