// Situação do Termo de Responsabilidade por colaborador: quem assinou, quem
// recebeu e ainda não respondeu, quem recusou e quem nunca recebeu.
// Quem assinou tem espaço para o link do Drive onde o termo foi arquivado.
import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import { formatDate } from "../lib/format";
import { Alert, Spinner } from "../components/ui";

type Situacao = "ASSINADO" | "ENVIADO" | "RECUSADO" | "NAO_ENVIADO";

interface TermoRow {
  personName: string;
  personEmail: string | null;
  personCpf: string | null;
  equipmentCount: number;
  situacao: Situacao;
  submissionId: string | null;
  sentAt: string | null;
  signedAt: string | null;
  refusedAt: string | null;
  clicksignUrl: string | null;
  driveUrl: string | null;
  statusIndisponivel: boolean;
}

const SITUACAO = {
  ASSINADO: { label: "Assinado", cor: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300", icone: "ti-circle-check" },
  ENVIADO: { label: "Enviado", cor: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300", icone: "ti-clock" },
  RECUSADO: { label: "Recusado", cor: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300", icone: "ti-circle-x" },
  NAO_ENVIADO: { label: "Não enviado", cor: "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300", icone: "ti-mail-off" },
} as const;

const ORDEM: Situacao[] = ["NAO_ENVIADO", "ENVIADO", "RECUSADO", "ASSINADO"];

export default function Terms() {
  const [rows, setRows] = useState<TermoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filtro, setFiltro] = useState<Situacao | "">("");
  const [busca, setBusca] = useState("");

  // Edição do link do Drive: id da linha em edição e o valor digitado.
  const [editando, setEditando] = useState<string | null>(null);
  const [linkDigitado, setLinkDigitado] = useState("");
  const [salvando, setSalvando] = useState(false);

  async function carregar() {
    setLoading(true);
    setError("");
    try {
      setRows(await api<TermoRow[]>("/terms"));
    } catch (err: any) {
      setError(err?.message ?? "Não foi possível carregar a situação dos termos.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  const contagem = useMemo(() => {
    const c: Record<Situacao, number> = { ASSINADO: 0, ENVIADO: 0, RECUSADO: 0, NAO_ENVIADO: 0 };
    for (const r of rows) c[r.situacao]++;
    return c;
  }, [rows]);

  const visiveis = useMemo(() => {
    const termo = busca
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .trim();
    return rows.filter((r) => {
      if (filtro && r.situacao !== filtro) return false;
      if (!termo) return true;
      const alvo = `${r.personName} ${r.personEmail ?? ""} ${r.personCpf ?? ""}`
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase();
      return alvo.includes(termo);
    });
  }, [rows, filtro, busca]);

  const semStatus = rows.some((r) => r.statusIndisponivel);

  async function salvarLink(row: TermoRow) {
    if (!row.submissionId) return;
    setSalvando(true);
    setError("");
    try {
      await api(`/terms/${row.submissionId}/drive`, {
        method: "PATCH",
        body: { driveUrl: linkDigitado.trim() || null },
      });
      setRows((atual) =>
        atual.map((r) =>
          r.submissionId === row.submissionId ? { ...r, driveUrl: linkDigitado.trim() || null } : r
        )
      );
      setEditando(null);
      setLinkDigitado("");
    } catch (err: any) {
      setError(err?.message ?? "Não foi possível salvar o link.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">Termos de Responsabilidade</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {loading ? "Carregando..." : `${rows.length} colaborador(es)`}
          </p>
        </div>
        <button
          onClick={carregar}
          disabled={loading}
          className="flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors"
        >
          <i className={`ti ${loading ? "ti-loader-2 animate-spin" : "ti-refresh"} text-sm`}></i>
          Atualizar
        </button>
      </div>

      {error && <Alert>{error}</Alert>}
      {semStatus && (
        <Alert kind="info">
          Não foi possível consultar o Clicksign de algum termo. As linhas marcadas com
          <i className="ti ti-alert-triangle mx-1"></i>
          podem estar desatualizadas — tente atualizar novamente.
        </Alert>
      )}

      {/* Resumo, que também filtra */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {ORDEM.map((s) => {
          const ativo = filtro === s;
          return (
            <button
              key={s}
              onClick={() => setFiltro(ativo ? "" : s)}
              title={ativo ? "Remover filtro" : `Mostrar só ${SITUACAO[s].label.toLowerCase()}`}
              className={`rounded-2xl border p-4 text-left transition-all ${
                ativo
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-1 ring-blue-500"
                  : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700"
              }`}
            >
              <div className="flex items-center gap-2">
                <i className={`ti ${SITUACAO[s].icone} text-base text-slate-400`}></i>
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  {SITUACAO[s].label}
                </span>
              </div>
              <div className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">
                {contagem[s]}
              </div>
            </button>
          );
        })}
      </div>

      {/* Busca */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-800">
          <i className="ti ti-search text-slate-400 dark:text-slate-500 text-lg shrink-0"></i>
          <input
            className="flex-1 bg-transparent text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none"
            placeholder="Buscar por nome, e-mail ou CPF..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
          {busca && (
            <button onClick={() => setBusca("")} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
              <i className="ti ti-x text-sm"></i>
            </button>
          )}
        </div>

        {loading ? (
          <Spinner label="Consultando o Clicksign..." />
        ) : visiveis.length === 0 ? (
          <div className="p-10 text-center">
            <i className="ti ti-file-off text-3xl text-slate-300 dark:text-slate-600"></i>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
              {rows.length === 0
                ? "Nenhum colaborador com equipamento nesta unidade."
                : "Nenhum colaborador nesse filtro."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 text-left">
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Colaborador</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Situação</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Equip.</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Datas</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Termo assinado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {visiveis.map((r) => {
                  const s = SITUACAO[r.situacao];
                  const emEdicao = editando === r.submissionId && r.submissionId !== null;
                  return (
                    <tr key={r.submissionId ?? r.personName} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      {/* Colaborador */}
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-800 dark:text-slate-100">{r.personName}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {r.personEmail || "sem e-mail"}
                          {r.personCpf ? ` · ${r.personCpf}` : ""}
                        </div>
                        {!r.personEmail && r.situacao === "NAO_ENVIADO" && (
                          <div className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                            <i className="ti ti-alert-triangle"></i> sem e-mail, não dá para enviar
                          </div>
                        )}
                      </td>

                      {/* Situação */}
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${s.cor}`}>
                          <i className={`ti ${s.icone}`}></i>
                          {s.label}
                        </span>
                        {r.statusIndisponivel && (
                          <i
                            className="ti ti-alert-triangle text-amber-500 ml-1"
                            title="Não foi possível consultar o Clicksign: pode estar desatualizado"
                          ></i>
                        )}
                      </td>

                      {/* Equipamentos */}
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300 font-mono text-xs">
                        {r.equipmentCount}
                      </td>

                      {/* Datas */}
                      <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {r.sentAt && <div>Enviado: {formatDate(r.sentAt)}</div>}
                        {r.signedAt && <div>Assinado: {formatDate(r.signedAt)}</div>}
                        {r.refusedAt && <div>Recusado: {formatDate(r.refusedAt)}</div>}
                        {!r.sentAt && <span className="text-slate-300 dark:text-slate-600">—</span>}
                      </td>

                      {/* Link do termo assinado */}
                      <td className="px-4 py-3">
                        {r.situacao !== "ASSINADO" ? (
                          <span className="text-xs text-slate-300 dark:text-slate-600">—</span>
                        ) : emEdicao ? (
                          <div className="flex items-center gap-2">
                            <input
                              autoFocus
                              className="input text-xs py-1"
                              placeholder="https://drive.google.com/..."
                              value={linkDigitado}
                              onChange={(e) => setLinkDigitado(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") salvarLink(r);
                                if (e.key === "Escape") setEditando(null);
                              }}
                            />
                            <button
                              onClick={() => salvarLink(r)}
                              disabled={salvando}
                              className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50"
                            >
                              {salvando ? "..." : "Salvar"}
                            </button>
                            <button
                              onClick={() => setEditando(null)}
                              className="text-xs text-slate-400 hover:text-slate-600"
                            >
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-wrap items-center gap-3">
                            {r.driveUrl ? (
                              <a
                                href={r.driveUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
                              >
                                <i className="ti ti-brand-google-drive"></i> Drive
                              </a>
                            ) : (
                              <span className="text-xs text-slate-400">sem link do Drive</span>
                            )}
                            <button
                              onClick={() => {
                                setEditando(r.submissionId);
                                setLinkDigitado(r.driveUrl ?? "");
                              }}
                              className="text-xs text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400"
                            >
                              <i className="ti ti-pencil"></i> {r.driveUrl ? "trocar" : "colar link"}
                            </button>
                            {r.clicksignUrl && (
                              <a
                                href={r.clicksignUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 hover:underline"
                                title="Documento assinado no Clicksign"
                              >
                                <i className="ti ti-external-link"></i> Clicksign
                              </a>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-xs text-slate-400 dark:text-slate-500">
        A situação vem do Clicksign, consultada a cada abertura desta tela. O termo é enviado pelo
        botão de termo no inventário (visão Colaboradores).
      </p>
    </div>
  );
}
