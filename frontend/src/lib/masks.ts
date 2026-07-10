// Máscaras de entrada para campos numéricos (aplicadas enquanto o usuário digita).

// CPF: 000.000.000-00
export function maskCPF(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

// Telefone BR: (00) 00000-0000 (aceita fixo e celular)
export function maskPhoneBR(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 10) {
    return d.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{4})(\d{1,4})$/, "$1-$2");
  }
  return d.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d{1,4})$/, "$1-$2");
}

// IMEI: apenas dígitos, até 15
export function maskIMEI(value: string): string {
  return value.replace(/\D/g, "").slice(0, 15);
}

// Endereço MAC: AA:BB:CC:DD:EE:FF (hexadecimal)
export function maskMAC(value: string): string {
  const hex = value.replace(/[^a-fA-F0-9]/g, "").toUpperCase().slice(0, 12);
  return hex.match(/.{1,2}/g)?.join(":") ?? hex;
}

// Apenas dígitos (ex.: número de patrimônio numérico)
export function maskDigits(value: string): string {
  return value.replace(/\D/g, "");
}

// Valor em Reais: formata como 1.234,56 enquanto digita (baseado em centavos).
export function maskMoneyBR(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  const cents = parseInt(digits, 10);
  const reais = (cents / 100).toFixed(2); // ex.: "1234.56"
  const [intPart, decPart] = reais.split(".");
  const withThousands = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${withThousands},${decPart}`;
}

// Converte "1.234,56" (ou "1234,56" / "1234.56") em número.
export function parseMoneyBR(masked: string): number | null {
  if (!masked) return null;
  let v = masked.replace(/[R$\s]/g, "");
  if (v.includes(",")) v = v.replace(/\./g, "").replace(",", ".");
  const n = Number(v);
  return isNaN(n) ? null : n;
}
