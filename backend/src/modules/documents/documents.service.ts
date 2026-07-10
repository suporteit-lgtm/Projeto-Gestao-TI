// Geração do Termo de Responsabilidade em PDF a partir de um template editável.
import Handlebars from "handlebars";
import { prisma } from "../../config/prisma";
import { AppError } from "../../middlewares/error";
import { STATUS, CONDITION, StatusKey, ConditionKey } from "../equipment/equipment.constants";
import { DEFAULT_TERMO_TEMPLATE } from "./default-template";

// Busca o template (cria com o padrão na primeira vez).
export async function getTemplate() {
  let t = await prisma.documentTemplate.findUnique({ where: { id: 1 } });
  if (!t) {
    t = await prisma.documentTemplate.create({
      data: { id: 1, content: DEFAULT_TERMO_TEMPLATE },
    });
  }
  return t;
}

export async function updateTemplate(content: string, name?: string) {
  await getTemplate();
  return prisma.documentTemplate.update({
    where: { id: 1 },
    data: { content, ...(name ? { name } : {}) },
  });
}

// Restaura o texto padrão do termo.
export async function resetTemplate() {
  await getTemplate();
  return prisma.documentTemplate.update({
    where: { id: 1 },
    data: { content: DEFAULT_TERMO_TEMPLATE },
  });
}

function fmtDate(d: Date | null): string {
  return d ? new Date(d).toLocaleDateString("pt-BR") : "";
}

// Transforma um equipamento (com categoria) no formato esperado pelo template.
function toTemplateItem(eq: any) {
  return {
    tipo: eq.category?.name ?? "",
    marca: eq.brand ?? "",
    modelo: eq.model ?? "",
    cor: eq.color ?? "",
    serie: eq.serialNumber ?? "",
    patrimonio: eq.assetTag ?? "",
    imei1: eq.imei1 ?? "",
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
function dataExtenso(): string {
  const d = new Date();
  const dia = String(d.getDate()).padStart(2, "0");
  return `${dia} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
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
  empresa: { nome: string; cnpj: string; endereco: string }
) {
  const template = await getTemplate();
  const compiled = Handlebars.compile(template.content);
  return compiled({
    dataAtual: new Date().toLocaleDateString("pt-BR"),
    dataExtenso: dataExtenso(),
    empresa,
    usuario,
    equipamentos: equipamentos.map(toTemplateItem),
  });
}

// Converte HTML em PDF (A4). Em produção/serverless usa @sparticuz/chromium;
// em desenvolvimento usa o puppeteer local.
async function htmlToPdf(html: string): Promise<Buffer> {
  let browser;
  const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME;

  if (isServerless) {
    // Ambiente serverless (Vercel): usa chromium headless compacto.
    const chromium = await import("@sparticuz/chromium").then((m) => m.default);
    const puppeteerCore = await import("puppeteer-core").then((m) => m.default);
    browser = await puppeteerCore.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: true,
    });
  } else {
    // Desenvolvimento local: usa puppeteer completo (com Chromium embutido).
    const puppeteer = await import("puppeteer").then((m) => m.default);
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
  }

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "0", bottom: "0", left: "0", right: "0" },
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

// Termo a partir de UM equipamento (usa o responsável atual do item).
export async function termoForEquipment(id: string, unitId: string): Promise<Buffer> {
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
    empresa
  );
  return htmlToPdf(html);
}

// Termo a partir de UMA PESSOA: junta todos os itens em uso por ela (na unidade).
export async function termoForPerson(nome: string, unitId: string): Promise<Buffer> {
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
    empresa
  );
  return htmlToPdf(html);
}
