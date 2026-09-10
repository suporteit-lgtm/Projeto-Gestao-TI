// Geração do Termo de Responsabilidade em PDF a partir de um template editável.
import Handlebars from "handlebars";
import { prisma } from "../../config/prisma";
import { AppError } from "../../middlewares/error";
import {
  STATUS,
  CONDITION,
  StatusKey,
  ConditionKey,
  isLineCategoryName,
} from "../equipment/equipment.constants";
import {
  TipoTermo,
  TIPO_TERMO_PADRAO,
  TIPOS_TERMO,
  DEFINICAO_TIPOS,
} from "./template-types";

// Busca o template de um tipo (cria com o texto padrão na primeira vez).
export async function getTemplate(tipo: TipoTermo = TIPO_TERMO_PADRAO) {
  const def = DEFINICAO_TIPOS[tipo];
  let t = await prisma.documentTemplate.findUnique({ where: { id: def.id } });
  if (!t) {
    t = await prisma.documentTemplate.create({
      data: { id: def.id, name: def.nome, content: def.padrao },
    });
  }
  return { ...t, tipo };
}

// Lista os três tipos com o texto atual de cada um, para a tela de edição.
export async function listTemplates() {
  return Promise.all(
    TIPOS_TERMO.map(async (tipo) => {
      const t = await getTemplate(tipo);
      return {
        tipo,
        nome: DEFINICAO_TIPOS[tipo].nome,
        descricao: DEFINICAO_TIPOS[tipo].descricao,
        content: t.content,
        updatedAt: t.updatedAt,
      };
    })
  );
}

export async function updateTemplate(
  content: string,
  name?: string,
  tipo: TipoTermo = TIPO_TERMO_PADRAO
) {
  await getTemplate(tipo);
  return prisma.documentTemplate.update({
    where: { id: DEFINICAO_TIPOS[tipo].id },
    data: { content, ...(name ? { name } : {}) },
  });
}

// Restaura o texto padrão do tipo.
export async function resetTemplate(tipo: TipoTermo = TIPO_TERMO_PADRAO) {
  const def = DEFINICAO_TIPOS[tipo];
  await getTemplate(tipo);
  return prisma.documentTemplate.update({
    where: { id: def.id },
    data: { content: def.padrao, name: def.nome },
  });
}

// Datas puras (aquisição, entrega...) são lidas em UTC, como estão gravadas.
function fmtDate(d: Date | null): string {
  return d ? new Date(d).toLocaleDateString("pt-BR", { timeZone: "UTC" }) : "";
}

// Transforma um equipamento (com categoria) no formato esperado pelo template.
//
// Linha corporativa nao e aparelho: nao tem marca, modelo, serie nem IMEI, e
// por isso saia com a linha inteira em branco no termo. Os dados que a
// identificam sao outros, e entram nas colunas equivalentes:
//   operadora -> marca      (quem presta o servico)
//   numero    -> serie      (o que identifica a linha)
//   ICCID     -> IMEI       (o numero do chip)
// A troca e feita AQUI, nos dados, e nao no HTML do template: assim vale
// tambem para quem ja personalizou o texto do termo.
function toTemplateItem(eq: any) {
  const linha = isLineCategoryName(eq.category?.name);

  return {
    tipo: eq.category?.name ?? "",
    marca: (linha ? eq.operadora : eq.brand) ?? "",
    modelo: (linha ? eq.plano : eq.model) ?? "",
    cor: eq.color ?? "",
    serie: (linha ? eq.telefone : eq.serialNumber) ?? "",
    patrimonio: eq.assetTag ?? "",
    imei1: (linha ? eq.iccid : eq.imei1) ?? "",
    imei2: eq.imei2 ?? "",
    condicao: CONDITION[eq.condition as ConditionKey] ?? eq.condition,
    status: STATUS[eq.status as StatusKey] ?? eq.status,
    observacoes: eq.notes ?? "",
    acessorios: eq.accessories ?? "",
    valor: eq.value != null ? `R$ ${Number(eq.value).toFixed(2)}` : "",
  };
}

const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

// Data por extenso: ex. "01 de julho de 2026".
const FUSO_BR = "America/Sao_Paulo";

// "Hoje" no fuso do Brasil. O servidor roda em UTC, então usar a data local dele
// imprimia o dia seguinte no termo depois das 21h.
function hojeNoBrasil(): { dia: number; mes: number; ano: number } {
  const [dia, mes, ano] = new Date()
    .toLocaleDateString("pt-BR", { timeZone: FUSO_BR })
    .split("/")
    .map(Number);
  return { dia, mes, ano };
}

function dataExtenso(): string {
  const { dia, mes, ano } = hojeNoBrasil();
  return `${String(dia).padStart(2, "0")} de ${MESES[mes - 1]} de ${ano}`;
}

// Nome fixo da empresa (usado no termo).
const EMPRESA_NOME = "LOCAGORA LOCADORA DE VEÍCULOS";

// Carrega os dados da empresa/unidade para o termo (endereço + CNPJ da unidade).
async function empresaFromUnit(unitId?: string) {
  let cnpj = "";
  let endereco = "";
  if (unitId) {
    const unit = await prisma.unit.findUnique({ where: { id: unitId } });
    if (!unit) throw new AppError("Unidade não encontrada.", 404);
    cnpj = unit.cnpj ?? "";
    endereco = unit.address ?? "";
  }
  return { nome: EMPRESA_NOME, cnpj, endereco };
}

// Escolhe o CPF do colaborador: primeiro item que tiver CPF preenchido.
function pickCpf(equipamentos: any[]): string {
  const comCpf = equipamentos.find((e) => (e.userCpf ?? "").trim());
  return comCpf?.userCpf ?? "";
}

// Monta o contexto (dados da pessoa + equipamentos + empresa) e renderiza o HTML.
async function renderHtml(
  equipamentos: any[],
  usuario: { nome: string; email: string; cpf: string; departamento: string; gestor: string },
  empresa: { nome: string; cnpj: string; endereco: string },
  tipo: TipoTermo = TIPO_TERMO_PADRAO
) {
  const template = await getTemplate(tipo);
  const compiled = Handlebars.compile(template.content);
  return compiled({
    dataAtual: new Date().toLocaleDateString("pt-BR", { timeZone: FUSO_BR }),
    dataExtenso: dataExtenso(),
    empresa,
    usuario,
    equipamentos: equipamentos.map(toTemplateItem),
  });
}

// Termo a partir de UM equipamento (usa o responsável atual do item).
export async function termoForEquipment(
  id: string,
  unitId: string,
  tipo: TipoTermo = TIPO_TERMO_PADRAO
): Promise<{ html: string }> {
  const eq = await prisma.equipment.findUnique({ where: { id }, include: { category: true } });
  if (!eq || eq.unitId !== unitId) throw new AppError("Equipamento não encontrado.", 404);
  if (!eq.currentUserName) {
    throw new AppError("Este equipamento não tem um responsável atual definido.", 400);
  }
  // Dados da empresa vêm da unidade ativa (endereço + CNPJ da unidade).
  const empresa = await empresaFromUnit(unitId);
  const html = await renderHtml(
    [eq],
    {
      nome: eq.currentUserName,
      email: eq.userEmail ?? "",
      cpf: eq.userCpf ?? "",
      departamento: eq.department ?? "",
      gestor: eq.manager ?? "",
    },
    empresa,
    tipo
  );
  return { html };
}

// Termo a partir de UMA PESSOA: junta todos os itens em uso por ela (na unidade).
export async function termoForPerson(
  nome: string,
  unitId: string,
  tipo: TipoTermo = TIPO_TERMO_PADRAO
): Promise<{ html: string }> {
  const equipamentos = await prisma.equipment.findMany({
    where: { currentUserName: nome, status: "EM_USO", unitId },
    include: { category: true },
  });
  if (equipamentos.length === 0) {
    throw new AppError("Nenhum equipamento em uso encontrado para esta pessoa.", 404);
  }
  const ref = equipamentos[0];
  const empresa = await empresaFromUnit(unitId);
  const html = await renderHtml(
    equipamentos,
    {
      nome,
      email: ref.userEmail ?? "",
      cpf: pickCpf(equipamentos), // puxa o CPF de qualquer item da pessoa que tenha
      departamento: ref.department ?? "",
      gestor: ref.manager ?? "",
    },
    empresa,
    tipo
  );
  return { html };
}
