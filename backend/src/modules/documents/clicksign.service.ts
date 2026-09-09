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

// Traduz a falha do Clicksign para algo que diga o que fazer. O caso mais comum
// e mais confuso é o token invalido: a API responde 403 com "Access Token
// inválido", e um "HTTP 403" seco fazia parecer problema de permissão do
// documento, quando é a credencial que está errada.
function erroDoClicksign(status: number, corpo: string, contexto: string): AppError {
  const tokenInvalido =
    status === 401 || (status === 403 && /access token/i.test(corpo));

  if (tokenInvalido) {
    return new AppError(
      "O Clicksign recusou o token de acesso (Access Token inválido). " +
        "Gere um novo token no painel do Clicksign (Configurações → API) e " +
        "atualize a variável CLICKSIGN_TOKEN no servidor.",
      502
    );
  }
  if (status === 404) {
    return new AppError(`Clicksign: ${contexto} não encontrado.`, 404);
  }
  return new AppError(`Clicksign ${contexto} (HTTP ${status})`, 502);
}

// Prefixo sob o qual este sistema grava os termos no Clicksign. Serve para
// separar os nossos documentos de qualquer outro da mesma conta.
export function clicksignPrefix(): string {
  return (process.env.CLICKSIGN_PATH_PREFIX || "inventario-ti").replace(/[^\w-]/g, "");
}

export interface DocumentStatus {
  status: TermStatus;
  signedAt: Date | null;
  refusedAt: Date | null;
  url: string | null; // link do documento no Clicksign
  // Quem assina, para conferir se o documento é da pessoa certa ao vincular.
  signerName: string | null;
  signerEmail: string | null;
}

// Consulta o status de um documento pela sua chave. É o ÚNICO endpoint de
// documentos que a API v1 oferece — não existe listagem (GET /documents sem
// chave responde 403), por isso a chave de cada termo precisa ser conhecida:
// vem do envio feito pelo sistema ou é vinculada à mão na tela de Termos.
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
    throw erroDoClicksign(res.status, detalhe, "consulta do documento");
  }

  const doc = (await res.json())?.document ?? {};
  return interpretarDocumento(doc);
}

// Nomes de evento do Clicksign (campo "name" de cada item de "events").
const EVENTO_ASSINOU = "sign";
const EVENTO_RECUSOU = "refusal";
const EVENTOS_FECHAMENTO = ["close", "auto_close", "document_closed"];
const EVENTO_CANCELOU = "cancel";

// Traduz a resposta do Clicksign para a situação do termo.
//
// ATENÇÃO ao formato: os signatários NÃO têm campo "signed_at" — quem carrega
// as datas é o array "events" (evento "sign" para cada assinatura, "refusal"
// para recusa), e cada evento traz "occurred_at". Procurar "signed_at" no
// signatário faz todo documento parecer pendente, mesmo já assinado.
export function interpretarDocumento(doc: any): DocumentStatus {
  const signers: any[] = Array.isArray(doc?.signers) ? doc.signers : [];
  const eventos: any[] = Array.isArray(doc?.events) ? doc.events : [];
  const nomeDoEvento = (e: any) => String(e?.name ?? "").toLowerCase();
  const quando = (e: any) => e?.occurred_at ?? e?.created_at ?? null;

  const deEvento = (nome: string) => eventos.filter((e) => nomeDoEvento(e) === nome);
  const assinaturas = deEvento(EVENTO_ASSINOU).map(quando).filter(Boolean).sort();
  const recusas = deEvento(EVENTO_RECUSOU).map(quando).filter(Boolean).sort();
  const cancelamentos = deEvento(EVENTO_CANCELOU).map(quando).filter(Boolean).sort();
  const fechamentos = eventos
    .filter((e) => EVENTOS_FECHAMENTO.includes(nomeDoEvento(e)))
    .map(quando)
    .filter(Boolean)
    .sort();

  // Reserva: alguns retornos trazem a assinatura/recusa dentro do próprio
  // signatário, em vez de (ou além de) "events". Ler as duas formas evita
  // depender de um único formato de resposta.
  const assinadosNoSigner = signers
    .map((sg) => sg?.signed_at ?? sg?.signature?.created_at ?? (sg?.signature ? true : null))
    .filter(Boolean);
  const recusadosNoSigner = signers.map((sg) => sg?.refusal_at).filter(Boolean).sort();

  const totalAssinado = Math.max(assinaturas.length, assinadosNoSigner.length);
  const todosAssinaram = signers.length > 0 && totalAssinado >= signers.length;

  const fechado = doc?.status === "closed" || fechamentos.length > 0;
  const cancelado = doc?.status === "canceled" || cancelamentos.length > 0;
  const recusado = recusas.length > 0 || Boolean(doc?.refusal_at) || recusadosNoSigner.length > 0;

  let status: TermStatus = "PENDENTE";
  if (recusado) status = "RECUSADO";
  else if (fechado || todosAssinaram) status = "ASSINADO";
  // Cancelado sem recusa: não foi assinado e não será. A tela tem três
  // situações, e "recusado" é a que leva a pessoa a agir.
  else if (cancelado) status = "RECUSADO";

  // Datas: prefere o evento, cai para o signatário e por fim para o documento.
  const datasDeAssinatura = assinadosNoSigner.filter((d) => typeof d === "string").sort();
  const assinadoEm =
    assinaturas.slice(-1)[0] ??
    datasDeAssinatura.slice(-1)[0] ??
    fechamentos.slice(-1)[0] ??
    doc?.finished_at ??
    null;
  const recusadoEm =
    recusas.slice(-1)[0] ??
    recusadosNoSigner.slice(-1)[0] ??
    doc?.refusal_at ??
    cancelamentos.slice(-1)[0] ??
    null;

  const primeiro = signers[0];

  return {
    status,
    signedAt: status === "ASSINADO" && assinadoEm ? new Date(assinadoEm) : null,
    refusedAt: status === "RECUSADO" && recusadoEm ? new Date(recusadoEm) : null,
    url: doc?.downloads?.signed_file_url ?? doc?.downloads?.original_file_url ?? null,
    signerName: primeiro?.name ?? null,
    signerEmail: primeiro?.email ?? null,
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
      throw erroDoClicksign(res.status, detalhe, `envio (${path})`);
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
