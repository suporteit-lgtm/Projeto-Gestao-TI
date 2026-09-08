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
import {
  getClicksignDocument,
  listClicksignDocuments,
  clicksignPrefix,
  TermStatus,
} from "../documents/clicksign.service";

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

export interface ResultadoSync {
  importados: number;
  jaRegistrados: number;
  // Documentos do Clicksign cujo nome não casa com ninguém desta unidade.
  // Devolvidos para a tela explicar por que ficaram de fora.
  semColaborador: string[];
}

// Extrai o nome da pessoa do caminho do documento no Clicksign, que este
// sistema grava como "/<prefixo>/<Nome da Pessoa>/termo-....pdf".
function nomeNoCaminho(path: string, prefixo: string): string | null {
  const partes = path.split("/").filter(Boolean);
  if (partes[0] !== prefixo) return null; // documento de outro sistema
  const nome = partes[1]?.trim();
  return nome && nome.toLowerCase() !== "geral" ? nome : null;
}

// Importa para o banco os termos que já estavam no Clicksign — os enviados
// ANTES desta tela existir, que por isso apareciam como "não enviado". Também
// serve para termos enviados direto pelo painel do Clicksign.
//
// Roda quantas vezes quiser: o documentKey é único, então reimportar não
// duplica nada. O status de cada um é resolvido na listagem seguinte, pela
// consulta normal ao Clicksign.
export async function syncFromClicksign(unitId: string): Promise<ResultadoSync> {
  const prefixo = clicksignPrefix();
  const documentos = await listClicksignDocuments();

  // Só importa nomes que correspondem a alguém COM equipamento nesta unidade.
  // Sem isso, uma conta Clicksign compartilhada jogaria pessoas de outra
  // unidade aqui dentro — e o sistema isola os dados por unidade.
  const equipamentos = await prisma.equipment.findMany({
    where: { unitId },
    select: { currentUserName: true },
  });
  const daUnidade = new Map<string, string>();
  for (const eq of equipamentos) {
    const nome = eq.currentUserName?.trim();
    if (nome) daUnidade.set(chaveNome(nome), nome);
  }

  const jaTemos = new Set(
    (await prisma.termSubmission.findMany({ select: { documentKey: true } })).map(
      (t) => t.documentKey
    )
  );

  const resultado: ResultadoSync = { importados: 0, jaRegistrados: 0, semColaborador: [] };
  const foraDaUnidade = new Set<string>();

  for (const doc of documentos) {
    if (jaTemos.has(doc.key)) {
      resultado.jaRegistrados++;
      continue;
    }

    // O nome do signatário é mais confiável que o caminho; o caminho é a reserva.
    const nome = doc.signerName?.trim() || nomeNoCaminho(doc.path, prefixo);
    if (!nome) continue; // não é um termo deste sistema

    const conhecido = daUnidade.get(chaveNome(nome));
    if (!conhecido) {
      foraDaUnidade.add(nome);
      continue;
    }

    await prisma.termSubmission.create({
      data: {
        unitId,
        personName: conhecido,
        personEmail: doc.signerEmail?.trim() || null,
        personCpf: null,
        documentKey: doc.key,
        filename: doc.path.split("/").pop() || "termo.pdf",
        status: "PENDENTE", // a listagem consulta o Clicksign e resolve
        sentAt: doc.createdAt ?? new Date(),
      },
    });
    resultado.importados++;
  }

  resultado.semColaborador = [...foraDaUnidade].sort((a, b) => a.localeCompare(b, "pt-BR"));
  return resultado;
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
