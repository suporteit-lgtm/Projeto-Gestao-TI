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

  const host =
    (process.env.CLICKSIGN_ENV || "production") === "sandbox"
      ? "https://sandbox.clicksign.com"
      : "https://app.clicksign.com";

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

  const prefixo = (process.env.CLICKSIGN_PATH_PREFIX || "inventario-ti").replace(/[^\w-]/g, "");
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
