// Cliente HTTP simples baseado em fetch. Injeta o token JWT e trata erros.
const TOKEN_KEY = "inventario_token";

// Em produção usa VITE_API_URL (ex: https://api.seudominio.com.br/api)
// Em desenvolvimento usa /api (proxy do Vite)
const BASE_URL = import.meta.env.VITE_API_URL ?? "/api";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  details?: unknown;
  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

interface Options {
  method?: string;
  body?: unknown;
  raw?: boolean; // quando true, retorna o Response (ex.: download de arquivos)
}

export async function api<T = any>(path: string, opts: Options = {}): Promise<T> {
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let body: BodyInit | undefined;
  if (opts.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(opts.body);
  }

  const res = await fetch(`${BASE_URL}${path}`, { method: opts.method ?? "GET", headers, body });

  if (opts.raw) return res as unknown as T;

  if (res.status === 204) return undefined as T;

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401) setToken(null);
    // Monta uma mensagem clara explicando o MOTIVO (detalhes da validação).
    let message = data.error ?? "Erro na requisição";
    if (Array.isArray(data.details) && data.details.length) {
      const motivos = data.details
        .map((d: any) => (d.campo ? `${d.campo}: ${d.msg}` : d.msg))
        .join(" · ");
      message = `${message} — ${motivos}`;
    }
    throw new ApiError(message, res.status, data.details);
  }
  return data as T;
}

// Helper para baixar arquivos (CSV/Excel/PDF) já autenticados.
export async function download(path: string, fallbackName: string) {
  const res = (await api(path, { raw: true })) as Response;
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError(data.error ?? "Erro ao gerar arquivo", res.status);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fallbackName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// Abre um PDF em nova aba (para o termo de responsabilidade).
// Importante: abrimos a aba SINCRONAMENTE (antes do await) para não ser
// bloqueada pelo navegador. Se o popup for bloqueado, baixamos o arquivo.
export async function openPdf(path: string, fallbackName = "termo.pdf") {
  const win = window.open("", "_blank");
  try {
    const res = (await api(path, { raw: true })) as Response;
    if (!res.ok) {
      win?.close();
      const data = await res.json().catch(() => ({}));
      throw new ApiError(data.error ?? "Erro ao gerar PDF", res.status);
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    if (win) {
      win.location.href = url;
    } else {
      // Popup bloqueado: cai para download do arquivo.
      const a = document.createElement("a");
      a.href = url;
      a.download = fallbackName;
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
  } catch (err) {
    win?.close();
    throw err;
  }
}
