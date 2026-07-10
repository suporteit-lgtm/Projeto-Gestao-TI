// Importação inicial do inventário a partir de um CSV (ex.: export do Google Sheets).
// Fluxo: 1) ler arquivo  2) mapear colunas  3) validar  4) importar.
import { useEffect, useRef, useState } from "react";
import Papa from "papaparse";
import { api } from "../api/client";
import { Alert } from "../components/ui";

interface ImportField {
  key: string;
  label: string;
  required?: boolean;
}
interface RowValidation {
  index: number;
  ok: boolean;
  errors: string[];
  assetId: string;
}
interface ImportResult {
  created: number;
  skipped: number;
  errors: { index: number; assetId: string; reason: string }[];
}

// Normaliza um texto para comparação (sem acentos, minúsculo).
function norm(s: string) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

const ALIASES: Record<string, string> = {
  "id do ativo": "assetId",
  tipo: "category",
  "tipo / categoria": "category",
  marca: "brand",
  modelo: "model",
  cor: "color",
  configuracao: "configuration",
  "numero de serie": "serialNumber",
  "numero de patrimonio": "assetTag",
  "status do ativo": "status",
  condicao: "condition",
  propriedade: "ownership",
  pelicula: "pelicula",
  capa: "capa",
  "imei 1": "imei1",
  imei1: "imei1",
  "imei 2": "imei2",
  imei2: "imei2",
  "endereco mac": "macAddress",
  mac: "macAddress",
  "cpf do usuario": "userCpf",
  cpf: "userCpf",
  "numero de patrmonio": "assetTag",
  fornecedor: "supplier",
  localizacao: "location",
  "usuario atual": "currentUserName",
  "usuario antigo": "formerUser",
  departamento: "department",
  gestor: "manager",
  "e-mail do usuario": "userEmail",
  "email do usuario": "userEmail",
  "data de aquisicao": "acquisitionDate",
  "data de entrega ao usuario": "deliveryDate",
  "garantia (data final)": "warrantyEndDate",
  garantia: "warrantyEndDate",
  "ultima conferencia": "lastCheckDate",
  "valor (r$)": "value",
  valor: "value",
  observacoes: "notes",
  acessorios: "accessories",
};

// Step indicator component
function Step({ number, label, active, done }: { number: number; label: string; active: boolean; done: boolean }) {
  return (
    <div className={`flex items-center gap-3 ${active ? "opacity-100" : done ? "opacity-70" : "opacity-30"}`}>
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 transition-all ${
          done
            ? "bg-emerald-500 text-white"
            : active
            ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30"
            : "bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400"
        }`}
      >
        {done ? <i className="ti ti-check text-sm"></i> : number}
      </div>
      <span className={`text-sm font-medium ${active ? "text-slate-800 dark:text-slate-100" : "text-slate-500 dark:text-slate-400"}`}>
        {label}
      </span>
    </div>
  );
}

export default function ImportPage() {
  const [fields, setFields] = useState<ImportField[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [validation, setValidation] = useState<RowValidation[] | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api<ImportField[]>("/import/fields").then(setFields);
  }, []);

  function parseFile(file: File) {
    setError("");
    setResult(null);
    setValidation(null);
    setFileName(file.name);
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      delimiter: "",
      complete: (res) => {
        const hdrs = (res.meta.fields ?? []).filter(Boolean);
        setHeaders(hdrs);
        setRows(res.data);
        const auto: Record<string, string> = {};
        for (const h of hdrs) {
          const key = ALIASES[norm(h)];
          if (key && !auto[key]) auto[key] = h;
        }
        setMapping(auto);
      },
      error: (err) => setError("Erro ao ler o arquivo: " + err.message),
    });
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) parseFile(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) parseFile(file);
  }

  function mappedRows(): Record<string, string>[] {
    return rows.map((row) => {
      const out: Record<string, string> = {};
      for (const f of fields) {
        const header = mapping[f.key];
        if (header) out[f.key] = (row[header] ?? "").toString();
      }
      return out;
    });
  }

  async function validar() {
    setBusy(true);
    setError("");
    try {
      const v = await api<RowValidation[]>("/import/validate", {
        method: "POST",
        body: { rows: mappedRows() },
      });
      setValidation(v);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function importar() {
    if (!confirm(`Importar ${rows.length} linha(s)? Itens com ID já existente serão ignorados.`)) return;
    setBusy(true);
    setError("");
    try {
      const r = await api<ImportResult>("/import/commit", {
        method: "POST",
        body: { rows: mappedRows() },
      });
      setResult(r);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const invalidCount = validation?.filter((v) => !v.ok).length ?? 0;
  const step = result ? 4 : validation ? 3 : rows.length > 0 ? 2 : 1;

  const mappedCount = fields.filter((f) => mapping[f.key]).length;
  const requiredMapped = fields.filter((f) => f.required).every((f) => mapping[f.key]);

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">Importar inventário</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Envie um CSV exportado do Google Sheets ou Excel. A detecção de colunas é automática.
        </p>
      </div>

      {/* Step progress */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-4">
        <div className="flex items-center gap-3 flex-wrap">
          <Step number={1} label="Selecionar arquivo" active={step === 1} done={step > 1} />
          <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800 min-w-6" />
          <Step number={2} label="Mapear colunas" active={step === 2} done={step > 2} />
          <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800 min-w-6" />
          <Step number={3} label="Validar" active={step === 3} done={step > 3} />
          <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800 min-w-6" />
          <Step number={4} label="Concluído" active={step === 4} done={false} />
        </div>
      </div>

      {error && <Alert>{error}</Alert>}

      {/* Passo 1: arquivo */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center">
            <i className="ti ti-file-spreadsheet text-blue-500 text-lg"></i>
          </div>
          <div>
            <div className="font-semibold text-slate-800 dark:text-slate-100 text-sm">Passo 1 — Selecione o arquivo CSV</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Formatos suportados: .csv (separado por vírgula ou ponto e vírgula)</div>
          </div>
        </div>

        <div className="p-6">
          {/* Drop zone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
              dragOver
                ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                : rows.length > 0
                ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-900/10"
                : "border-slate-300 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-600 hover:bg-slate-50 dark:hover:bg-slate-800/50"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleFile}
              className="hidden"
            />
            {rows.length > 0 ? (
              <div className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                  <i className="ti ti-circle-check text-emerald-500 text-2xl"></i>
                </div>
                <div className="font-semibold text-slate-800 dark:text-slate-100 text-sm">{fileName}</div>
                <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                  {rows.length} linha(s) · {headers.length} coluna(s) detectadas
                </div>
                <button
                  className="mt-2 text-xs text-slate-400 hover:text-blue-500 underline"
                  onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                >
                  Trocar arquivo
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                  <i className={`ti ti-upload text-slate-400 text-2xl ${dragOver ? "text-blue-500" : ""}`}></i>
                </div>
                <div>
                  <p className="font-medium text-slate-700 dark:text-slate-300 text-sm">
                    Arraste o CSV aqui ou clique para selecionar
                  </p>
                  <p className="text-xs text-slate-400 mt-1">Suporte a arquivos exportados do Google Sheets e Excel</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Passo 2: mapeamento */}
      {headers.length > 0 && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-violet-500/10 flex items-center justify-center">
                <i className="ti ti-table-column text-violet-500 text-lg"></i>
              </div>
              <div>
                <div className="font-semibold text-slate-800 dark:text-slate-100 text-sm">Passo 2 — Mapeamento de colunas</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">{mappedCount} de {fields.length} campos mapeados</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Progress bar */}
              <div className="w-24 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-violet-500 rounded-full transition-all duration-300"
                  style={{ width: `${(mappedCount / fields.length) * 100}%` }}
                />
              </div>
              <span className="text-xs text-slate-400 font-mono">{Math.round((mappedCount / fields.length) * 100)}%</span>
            </div>
          </div>

          <div className="p-6 space-y-4">
            <div className="grid sm:grid-cols-2 gap-3">
              {fields.map((f) => {
                const mapped = !!mapping[f.key];
                return (
                  <div
                    key={f.key}
                    className={`rounded-xl border p-3 transition-colors ${
                      mapped
                        ? "border-violet-200 dark:border-violet-800/60 bg-violet-50 dark:bg-violet-900/10"
                        : f.required
                        ? "border-red-200 dark:border-red-900/60 bg-red-50/50 dark:bg-red-900/10"
                        : "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {f.label}
                      </span>
                      {f.required && (
                        <span className="text-[10px] font-bold text-red-500 bg-red-100 dark:bg-red-900/30 px-1.5 py-0.5 rounded">
                          obrigatório
                        </span>
                      )}
                    </div>
                    <select
                      className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                      value={mapping[f.key] ?? ""}
                      onChange={(e) => setMapping({ ...mapping, [f.key]: e.target.value })}
                    >
                      <option value="">— ignorar —</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>

            {!requiredMapped && (
              <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-3 py-2 rounded-lg">
                <i className="ti ti-alert-triangle text-sm"></i>
                Mapeie todos os campos obrigatórios antes de prosseguir.
              </div>
            )}

            <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
                onClick={validar}
                disabled={busy || !requiredMapped}
              >
                <i className={`ti ${busy ? "ti-loader-2 animate-spin" : "ti-checks"} text-sm`}></i>
                Validar dados
              </button>
              <button
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors disabled:opacity-50"
                onClick={importar}
                disabled={busy || !requiredMapped}
              >
                <i className={`ti ${busy ? "ti-loader-2 animate-spin" : "ti-database-import"} text-sm`}></i>
                {busy ? "Processando..." : "Importar agora"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Resultado da validação */}
      {validation && !result && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 dark:border-slate-800">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${invalidCount > 0 ? "bg-amber-500/10" : "bg-emerald-500/10"}`}>
              <i className={`ti ${invalidCount > 0 ? "ti-alert-triangle text-amber-500" : "ti-circle-check text-emerald-500"} text-lg`}></i>
            </div>
            <div>
              <div className="font-semibold text-slate-800 dark:text-slate-100 text-sm">Passo 3 — Resultado da validação</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">{validation.length - invalidCount} válido(s)</span>
                {invalidCount > 0 && (
                  <> · <span className="text-red-600 dark:text-red-400 font-medium">{invalidCount} com problema</span></>
                )}
              </div>
            </div>
          </div>

          {invalidCount > 0 && (
            <div className="p-6">
              <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                      <th className="text-left px-4 py-2.5">Linha</th>
                      <th className="text-left px-4 py-2.5">ID do Ativo</th>
                      <th className="text-left px-4 py-2.5">Problemas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {validation
                      .filter((v) => !v.ok)
                      .map((v) => (
                        <tr key={v.index} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400 font-mono text-xs">{v.index + 2}</td>
                          <td className="px-4 py-2.5 text-slate-700 dark:text-slate-300 font-mono text-xs">{v.assetId || "—"}</td>
                          <td className="px-4 py-2.5 text-red-600 dark:text-red-400 text-xs">{v.errors.join(" ")}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Resultado da importação */}
      {result && (
        <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-900/10 p-6 space-y-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
              <i className="ti ti-circle-check text-emerald-500 text-2xl"></i>
            </div>
            <div>
              <h3 className="font-semibold text-emerald-800 dark:text-emerald-300">Importação concluída com sucesso!</h3>
              <div className="flex gap-4 mt-2">
                <div className="text-center">
                  <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{result.created}</div>
                  <div className="text-xs text-emerald-600 dark:text-emerald-500">criado(s)</div>
                </div>
                <div className="w-px bg-emerald-200 dark:bg-emerald-800" />
                <div className="text-center">
                  <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{result.skipped}</div>
                  <div className="text-xs text-amber-600 dark:text-amber-500">ignorado(s)</div>
                </div>
              </div>
            </div>
          </div>

          {result.errors.length > 0 && (
            <details className="text-sm">
              <summary className="cursor-pointer font-medium text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 list-none flex items-center gap-1.5">
                <i className="ti ti-chevron-right text-sm transition-transform [[open]_&]:rotate-90"></i>
                Ver {result.errors.length} item(s) ignorado(s)
              </summary>
              <ul className="mt-3 space-y-1 pl-5">
                {result.errors.map((e, i) => (
                  <li key={i} className="text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-mono">Linha {e.index + 2}</span>
                    {e.assetId && <span className="ml-1 text-slate-400">({e.assetId})</span>}:
                    <span className="ml-1 text-red-500">{e.reason}</span>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
