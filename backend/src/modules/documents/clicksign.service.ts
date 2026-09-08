import { AppError } from "../../middlewares/error";

export interface Signer {
  name: string;
  email: string;
  documentation?: string; // CPF
  sign_as?: string; // party, sign, witness
}

const soDigitos = (s: string) => (s || "").replace(/\D/g, "");

// Validação de CPF
const cpfValido = (raw?: string): boolean => {
  const c = soDigitos(raw || "");
  if (c.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(c)) return false;
  let soma = 0;
  for (let i = 0; i < 9; i++) soma += Number(c[i]) * (10 - i);
  let d1 = (soma * 10) % 11;
  if (d1 === 10) d1 = 0;
  if (d1 !== Number(c[9])) return false;
  soma = 0;
  for (let i = 0; i < 10; i++) soma += Number(c[i]) * (11 - i);
  let d2 = (soma * 10) % 11;
  if (d2 === 10) d2 = 0;
  return d2 === Number(c[10]);
};

// O Clicksign espera o CPF no formato 000.000.000-00
const formatarCpf = (raw: string) => {
  const c = soDigitos(raw);
  return `${c.slice(0, 3)}.${c.slice(3, 6)}.${c.slice(6, 9)}-${c.slice(9)}`;
};

// Host da API, conforme o ambiente configurado.
function clicksignHost(): string {
  return (process.env.CLICKSIGN_ENV || "production") === "sandbox"
    ? "https://sandbox.clicksign.com"
    : "https://app.clicksign.com";
}

export type TermStatus = "PENDENTE" | "ASSINADO" | "RECUSADO";

// Prefixo sob o qual este sistema grava os termos no Clicksign. Serve para
// separar os nossos documentos de qualquer outro da mesma conta.
export function clicksignPrefix(): string {
  return (process.env.CLICKSIGN_PATH_PREFIX || "inventario-ti").replace(/[^\w-]/g, "");
}

export interface ClicksignDocumentoResumo {
  key: string;
  path: string;
  createdAt: Date | null;
  signerName: string | null;
  signerEmail: string | null;
}

function resumoDoDocumento(doc: any): ClicksignDocumentoResumo | null {
  const key = doc?.key;
  if (!key) return null;
  const primeiro = Array.isArray(doc.signers) ? doc.signers[0] : null;
  const data = doc.created_at ?? doc.uploaded_at ?? null;
  return {
    key,
    path: doc.path ?? "",
    createdAt: data ? new Date(data) : null,
    signerName: primeiro?.name ?? null,
    signerEmail: primeiro?.email ?? null,
  };
}

// Lista os documentos da conta. Usada para recuperar os termos enviados ANTES
// desta tela existir, que por isso não têm registro no banco.
//
// A paginação da API v1 é inconsistente entre contas: se o parâmetro "page" for
// ignorado, a segunda página repete a primeira. Por isso paramos quando não vem
// nada novo, além de um teto de páginas.
export async function listClicksignDocuments(): Promise<ClicksignDocumentoResumo[]> {
  const token = process.env.CLICKSIGN_TOKEN;
  if (!token) throw new AppError("CLICKSIGN_TOKEN não configurado no servidor", 500);

  const host = clicksignHost();
  const encontrados = new Map<string, ClicksignDocumentoResumo>();
  const MAX_PAGINAS = 50;

  for (let page = 1; page <= MAX_PAGINAS; page++) {
    const res = await fetch(`${host}/api/v1/documents?access_token=${token}&page=${page}`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      const detalhe = (await res.text()).slice(0, 300);
      console.error(`[clicksign-list] página ${page} FALHOU (${res.status}):`, detalhe);
      // Já trouxemos algo? Devolve o que deu, em vez de perder tudo.
      if (encontrados.size) break;
      throw new AppError(`Clicksign lista de documentos (HTTP ${res.status})`, 502);
    }

    const corpo = await res.json();
    const lista: any[] = Array.isArray(corpo) ? corpo : corpo?.documents ?? [];
    if (!lista.length) break;

    let novos = 0;
    for (const item of lista) {
      const resumo = resumoDoDocumento(item?.document ?? item);
      if (!resumo || encontrados.has(resumo.key)) continue;
      encontrados.set(resumo.key, resumo);
      novos++;
    }
    // Página repetida (ou sem nada novo): a API não está paginando.
    if (!novos) break;
  }

  return [...encontrados.values()];
}

export interface DocumentStatus {
  status: TermStatus;
  signedAt: Date | null;
  refusedAt: Date | null;
  url: string | null; // link do documento no Clicksign
}

// Consulta o status de um documento. É assim que a tela de termos sabe quem
// assinou: perguntamos ao Clicksign em vez de depender de webhook, que exigiria
// endpoint público e configuração no painel deles.
export async function getClicksignDocument(documentKey: string): Promise<DocumentStatus | null> {
  const token = process.env.CLICKSIGN_TOKEN;
  if (!token) throw new AppError("CLICKSIGN_TOKEN não configurado no servidor", 500);

  const res = await fetch(
    `${clicksignHost()}/api/v1/documents/${encodeURIComponent(documentKey)}?access_token=${token}`,
    { headers: { Accept: "application/json" } }
  );

  // Documento apagado no Clicksign: deixa como está, sem derrubar a tela.
  if (res.status === 404) return null;
  if (!res.ok) {
    const detalhe = (await res.text()).slice(0, 300);
    console.error(`[clicksign-status] ${documentKey} FALHOU (${res.status}):`, detalhe);
    throw new AppError(`Clicksign status (HTTP ${res.status})`, 502);
  }

  const doc = (await res.json())?.document ?? {};
  const signers: any[] = Array.isArray(doc.signers) ? doc.signers : [];

  // "closed" com todos assinados = fechado; se alguém recusou, o Clicksign
  // marca refusal_at (no documento ou no signatário).
  const recusa =
    doc.refusal_at ?? signers.map((s) => s?.refusal_at).find(Boolean) ?? null;

  const assinaturas = signers.map((s) => s?.signed_at).filter(Boolean);
  const todosAssinaram = signers.length > 0 && assinaturas.length === signers.length;
  const fechado = doc.status === "closed";

  let status: TermStatus = "PENDENTE";
  if (recusa) status = "RECUSADO";
  else if (todosAssinaram || (fechado && assinaturas.length > 0)) status = "ASSINADO";

  // A data da assinatura é a da última pessoa a assinar.
  const ultima = assinaturas.sort().slice(-1)[0] ?? doc.finished_at ?? null;

  return {
    status,
    signedAt: status === "ASSINADO" && ultima ? new Date(ultima) : null,
    refusedAt: status === "RECUSADO" && recusa ? new Date(recusa) : null,
    url: doc.downloads?.signed_file_url ?? doc.downloads?.original_file_url ?? null,
  };
}

export async function sendToClicksign(opts: {
  filename: string;
  pdfBase64: string;
  signers: Signer[];
  message?: string;
  deadlineDays?: number;
  pasta?: string;
}) {
  const { filename, pdfBase64, signers, message, deadlineDays, pasta } = opts;

  const token = process.env.CLICKSIGN_TOKEN;
  if (!token) throw new AppError("CLICKSIGN_TOKEN não configurado no servidor", 500);

  const host = clicksignHost();

  if (!filename || !pdfBase64 || !Array.isArray(signers) || !signers.length) {
    throw new AppError("Parâmetros inválidos para o Clicksign", 400);
  }

  const cs = async (path: string, payload: unknown) => {
    const res = await fetch(`${host}/api/v1/${path}?access_token=${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload),
    });
    const txt = await res.text();
    let data: any = null;
    try {
      data = JSON.parse(txt);
    } catch {
      data = { raw: txt };
    }
    if (!res.ok) {
      const detalhe = data?.errors ? JSON.stringify(data.errors) : txt.slice(0, 300);
      console.error(`[clicksign-send] ${path} FALHOU (${res.status}):`, detalhe);
      throw new AppError(`Clicksign ${path} (HTTP ${res.status}): ${detalhe}`, 502);
    }
    return data;
  };

  // 1) Cria o documento
  const prazo = new Date();
  prazo.setDate(prazo.getDate() + (deadlineDays && deadlineDays > 0 ? deadlineDays : 30));

  const prefixo = clicksignPrefix();
  const pastaSegura = (pasta || "Geral").replace(/[\/\\]/g, "-").trim() || "Geral";

  const doc = await cs("documents", {
    document: {
      path: `/${prefixo}/${pastaSegura}/${filename}`,
      content_base64: `data:application/pdf;base64,${pdfBase64}`,
      deadline_at: prazo.toISOString(),
      auto_close: true,
      locale: "pt-BR",
    },
  });

  const documentKey = doc?.document?.key;
  if (!documentKey) throw new AppError("Clicksign não retornou a chave do documento", 502);

  // 2) Cria cada signatário, vincula ao documento e dispara o e-mail
  const enviados: string[] = [];
  for (const s of signers) {
    if (!s?.email || !s?.name) continue;
    const temDoc = cpfValido(s.documentation);

    const signer = await cs("signers", {
      signer: {
        email: s.email.trim(),
        name: s.name.trim(),
        documentation: temDoc ? formatarCpf(s.documentation!) : undefined,
        has_documentation: temDoc,
        auths: ["email"],
        delivery: "email",
      },
    });

    const signerKey = signer?.signer?.key;
    if (!signerKey) continue;

    const list = await cs("lists", {
      list: {
        document_key: documentKey,
        signer_key: signerKey,
        sign_as: s.sign_as || "sign",
        message: message || "Segue o termo para assinatura eletrônica.",
      },
    });

    const requestSignatureKey = list?.list?.request_signature_key;
    if (requestSignatureKey) {
      await cs("notifications", {
        request_signature_key: requestSignatureKey,
        message: message || "Segue o termo para assinatura eletrônica.",
      });
      enviados.push(s.email.trim());
    }
  }

  return { ok: true, documentKey, enviados };
}
