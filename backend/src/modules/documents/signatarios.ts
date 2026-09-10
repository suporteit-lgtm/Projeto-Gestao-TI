// Quem assina cada termo enviado ao Clicksign.
//
// Todo termo vai para TRÊS pessoas, sempre: o colaborador, o responsável
// técnico de T.I. e o setor de termos. A tela manda só o colaborador — os
// outros dois são acrescentados aqui, para que um clique baste e ninguém
// precise lembrar de incluí-los.
//
// Os dois fixos podem ser trocados por variáveis de ambiente, sem alterar
// código, caso a pessoa responsável ou o e-mail do setor mudem.
import { Signer } from "./clicksign.service";

// "party" = assina como parte; "sign" = assina (é como estão os termos que a
// empresa já enviou pelo Clicksign, e o que aparece no log do documento).
export const SIGNATARIO_TECNICO: Signer = {
  name: process.env.TERMO_TECNICO_NOME || "Kaique Santos",
  email: process.env.TERMO_TECNICO_EMAIL || "kaique.santos@locgrupo.com.br",
  documentation: process.env.TERMO_TECNICO_CPF || "019.462.446-35",
  sign_as: "sign",
};

export const SIGNATARIO_SETOR: Signer = {
  name: process.env.TERMO_SETOR_NOME || "Locagora — Setor de Termos",
  email: process.env.TERMO_SETOR_EMAIL || "termos@locgrupo.com.br",
  sign_as: "party",
};

const emailNormalizado = (s?: string | null) => (s ?? "").trim().toLowerCase();

// Monta a lista final: o colaborador primeiro, depois os dois fixos.
//
// Sem repetir e-mail: se o colaborador for o próprio responsável técnico, o
// Clicksign recusaria (ou mandaria dois convites para a mesma pessoa).
export function montarSignatarios(colaboradores: Signer[]): Signer[] {
  const final: Signer[] = [];
  const vistos = new Set<string>();

  for (const s of [...colaboradores, SIGNATARIO_TECNICO, SIGNATARIO_SETOR]) {
    const email = emailNormalizado(s?.email);
    if (!email || !s?.name?.trim() || vistos.has(email)) continue;
    vistos.add(email);
    final.push({ ...s, email: s.email.trim(), name: s.name.trim() });
  }

  return final;
}
