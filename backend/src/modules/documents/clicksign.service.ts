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

  const primeiro = signers[0];

  return {
    status,
    signedAt: status === "ASSINADO" && ultima ? new Date(ultima) : null,
    refusedAt: status === "RECUSADO" && recusa ? new Date(recusa) : null,
    url: doc.downloads?.signed_file_url ?? doc.downloads?.original_file_url ?? null,
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
