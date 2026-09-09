// Situação do Termo de Responsabilidade por colaborador.
//
// A lista parte de QUEM TEM EQUIPAMENTO na unidade (o mesmo critério da visão
// "Colaboradores" do inventário) e cruza com os termos já enviados. Assim
// aparece também quem NUNCA recebeu termo — que é justamente o que interessa
// controlar.
//
// O status vem do Clicksign, consultado sob demanda: quando fica definitivo
// (assinado ou recusado) é gravado no banco e não perguntamos de novo.
import { prisma } from "../../config/prisma";
import { AppError } from "../../middlewares/error";
import { getClicksignDocument, TermStatus } from "../documents/clicksign.service";

export type SituacaoTermo = "ASSINADO" | "ENVIADO" | "RECUSADO" | "NAO_ENVIADO";

export interface TermoDoColaborador {
  personName: string;
  personEmail: string | null;
  personCpf: string | null;
  equipmentCount: number;
  situacao: SituacaoTermo;
  // Dados do último envio (ausentes quando nunca foi enviado).
  submissionId: string | null;
  sentAt: Date | null;
  signedAt: Date | null;
  refusedAt: Date | null;
  clicksignUrl: string | null;
  driveUrl: string | null;
  // Verdadeiro quando a consulta ao Clicksign falhou: a tela avisa que o
  // status pode estar desatualizado em vez de mentir que está tudo certo.
  statusIndisponivel: boolean;
}

// Normaliza nome para agrupar (ignora acento, caixa e espaços repetidos).
function chaveNome(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

const FINAL: TermStatus[] = ["ASSINADO", "RECUSADO"];

// Registra um envio. Chamado depois que o Clicksign aceita o documento.
export async function recordSubmission(input: {
  unitId: string;
  personName: string;
  personEmail?: string | null;
  personCpf?: string | null;
  documentKey: string;
  filename: string;
}) {
  return prisma.termSubmission.create({
    data: {
      unitId: input.unitId,
      personName: input.personName.trim(),
      personEmail: input.personEmail?.trim() || null,
      personCpf: input.personCpf?.trim() || null,
      documentKey: input.documentKey,
      filename: input.filename,
      status: "PENDENTE",
      sentAt: new Date(),
    },
  });
}

// Um termo que já existia no Clicksign, vinculado à mão a um colaborador.
//
// Por que à mão: a API v1 do Clicksign não tem endpoint de listagem — só dá
// para consultar um documento se a gente já souber a chave dele. Os termos
// enviados PELO SISTEMA têm a chave registrada automaticamente; os enviados
// antes (ou direto pelo painel do Clicksign) precisam ser apontados uma vez.
export interface ResultadoVinculo {
  situacao: SituacaoTermo;
  signerName: string | null;
  signerEmail: string | null;
}

// Aceita a chave do documento ou a URL de onde ela aparece. Permissivo aqui,
// porque a validação de verdade é a consulta ao Clicksign logo depois.
export function extrairDocumentKey(entrada: string): string | null {
  const texto = (entrada ?? "").trim();
  if (!texto) return null;

  // Formato mais comum da chave: UUID. Pega de dentro de uma URL também.
  const uuid = texto.match(
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i
  );
  if (uuid) return uuid[0];

  // Colou a URL sem UUID reconhecível: usa o último pedaço do caminho.
  if (/[\/?#]/.test(texto)) {
    const ultimo = texto.split(/[?#]/)[0].split("/").filter(Boolean).pop();
    return ultimo || null;
  }

  // Colou só a chave, em outro formato.
  return texto;
}

// Vincula um documento do Clicksign a um colaborador e já resolve o status.
export async function linkExistingTerm(input: {
  unitId: string;
  personName: string;
  documento: string;
}): Promise<ResultadoVinculo> {
  const personName = input.personName.trim();
  if (!personName) throw new AppError("Informe o colaborador.", 400);

  const documentKey = extrairDocumentKey(input.documento);
  if (!documentKey) {
    throw new AppError("Cole o link ou a chave do documento no Clicksign.", 400);
  }

  // Já vinculado? Diz de quem é, em vez de um erro seco de chave repetida.
  const existente = await prisma.termSubmission.findUnique({ where: { documentKey } });
  if (existente) {
    throw new AppError(
      `Este documento já está vinculado a ${existente.personName}.`,
      409
    );
  }

  const doc = await getClicksignDocument(documentKey);
  if (!doc) {
    throw new AppError(
      `Documento "${documentKey}" não encontrado no Clicksign. Confira se o link está completo e se é da mesma conta.`,
      404
    );
  }

  await prisma.termSubmission.create({
    data: {
      unitId: input.unitId,
      personName,
      personEmail: doc.signerEmail,
      personCpf: null,
      documentKey,
      filename: `termo-${personName}.pdf`,
      status: doc.status,
      // Sem data de envio na consulta: usa a assinatura/recusa quando houver.
      sentAt: doc.signedAt ?? doc.refusedAt ?? new Date(),
      signedAt: doc.signedAt,
      refusedAt: doc.refusedAt,
      clicksignUrl: doc.url,
    },
  });

  return {
    situacao: SITUACAO_POR_STATUS[doc.status] ?? "ENVIADO",
    // Devolvidos para a tela avisar se o documento parece ser de outra pessoa.
    signerName: doc.signerName,
    signerEmail: doc.signerEmail,
  };
}

// Guarda (ou atualiza) o link do Drive do termo assinado.
export async function setDriveUrl(id: string, unitId: string, driveUrl: string | null) {
  const atual = await prisma.termSubmission.findUnique({ where: { id } });
  if (!atual || atual.unitId !== unitId) throw new AppError("Termo não encontrado.", 404);
  return prisma.termSubmission.update({
    where: { id },
    data: { driveUrl: driveUrl?.trim() || null },
  });
}

// Consulta o Clicksign sobre os envios ainda pendentes e grava o que virou
// definitivo. Uma falha em um documento não impede os outros.
async function atualizarPendentes(pendentes: { id: string; documentKey: string }[]) {
  const falhas = new Set<string>();

  await Promise.all(
    pendentes.map(async (p) => {
      try {
        const doc = await getClicksignDocument(p.documentKey);
        if (!doc) return; // apagado no Clicksign: mantém como está
        if (!FINAL.includes(doc.status)) {
          // Segue pendente; só aproveita o link se já veio.
          if (doc.url) {
            await prisma.termSubmission.update({
              where: { id: p.id },
              data: { clicksignUrl: doc.url },
            });
          }
          return;
        }
        await prisma.termSubmission.update({
          where: { id: p.id },
          data: {
            status: doc.status,
            signedAt: doc.signedAt,
            refusedAt: doc.refusedAt,
            clicksignUrl: doc.url,
          },
        });
      } catch (err) {
        console.error(`[termos] status do documento ${p.documentKey} falhou:`, err);
        falhas.add(p.id);
      }
    })
  );

  return falhas;
}

const SITUACAO_POR_STATUS: Record<string, SituacaoTermo> = {
  ASSINADO: "ASSINADO",
  RECUSADO: "RECUSADO",
  PENDENTE: "ENVIADO",
};

// Ordem de exibição: o que exige ação primeiro.
const PESO: Record<SituacaoTermo, number> = {
  NAO_ENVIADO: 0,
  RECUSADO: 1,
  ENVIADO: 2,
  ASSINADO: 3,
};

export async function listTerms(unitId: string): Promise<TermoDoColaborador[]> {
  // 1) Quem tem equipamento na unidade.
  const equipamentos = await prisma.equipment.findMany({
    where: { unitId },
    select: { currentUserName: true, userEmail: true, userCpf: true },
  });

  interface Pessoa {
    personName: string;
    personEmail: string | null;
    personCpf: string | null;
    equipmentCount: number;
  }
  const pessoas = new Map<string, Pessoa>();
  for (const eq of equipamentos) {
    const nome = eq.currentUserName?.trim();
    if (!nome) continue;
    const chave = chaveNome(nome);
    const atual = pessoas.get(chave);
    if (atual) {
      atual.equipmentCount++;
      atual.personEmail = atual.personEmail ?? eq.userEmail;
      atual.personCpf = atual.personCpf ?? eq.userCpf;
    } else {
      pessoas.set(chave, {
        personName: nome,
        personEmail: eq.userEmail,
        personCpf: eq.userCpf,
        equipmentCount: 1,
      });
    }
  }

  // 2) Termos enviados, do mais recente para o mais antigo.
  const envios = await prisma.termSubmission.findMany({
    where: { unitId },
    orderBy: { sentAt: "desc" },
  });

  // 3) Atualiza os pendentes junto ao Clicksign.
  const pendentes = envios
    .filter((e) => e.status === "PENDENTE")
    .map((e) => ({ id: e.id, documentKey: e.documentKey }));
  const falhas = pendentes.length ? await atualizarPendentes(pendentes) : new Set<string>();

  const atualizados = pendentes.length
    ? await prisma.termSubmission.findMany({ where: { unitId }, orderBy: { sentAt: "desc" } })
    : envios;

  // 4) Um envio por pessoa: o mais recente (a lista já vem ordenada).
  const ultimoEnvio = new Map<string, (typeof atualizados)[number]>();
  for (const e of atualizados) {
    const chave = chaveNome(e.personName);
    if (!ultimoEnvio.has(chave)) ultimoEnvio.set(chave, e);
  }

  // 5) Junta as duas pontas. Quem recebeu termo mas já não tem equipamento
  //    continua aparecendo — o termo assinado dele não deixou de existir.
  const linhas: TermoDoColaborador[] = [];
  const vistos = new Set<string>();

  const montar = (p: Pessoa, chave: string): TermoDoColaborador => {
    const envio = ultimoEnvio.get(chave);
    return {
      personName: p.personName,
      personEmail: p.personEmail,
      personCpf: p.personCpf,
      equipmentCount: p.equipmentCount,
      situacao: envio ? SITUACAO_POR_STATUS[envio.status] ?? "ENVIADO" : "NAO_ENVIADO",
      submissionId: envio?.id ?? null,
      sentAt: envio?.sentAt ?? null,
      signedAt: envio?.signedAt ?? null,
      refusedAt: envio?.refusedAt ?? null,
      clicksignUrl: envio?.clicksignUrl ?? null,
      driveUrl: envio?.driveUrl ?? null,
      statusIndisponivel: envio ? falhas.has(envio.id) : false,
    };
  };

  for (const [chave, p] of pessoas) {
    linhas.push(montar(p, chave));
    vistos.add(chave);
  }
  for (const [chave, envio] of ultimoEnvio) {
    if (vistos.has(chave)) continue;
    linhas.push(
      montar(
        {
          personName: envio.personName,
          personEmail: envio.personEmail,
          personCpf: envio.personCpf,
          equipmentCount: 0,
        },
        chave
      )
    );
  }

  return linhas.sort(
    (a, b) =>
      PESO[a.situacao] - PESO[b.situacao] ||
      a.personName.localeCompare(b.personName, "pt-BR")
  );
}
