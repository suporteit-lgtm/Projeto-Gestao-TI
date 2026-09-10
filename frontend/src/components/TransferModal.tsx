// Transferência em lote dos equipamentos de um colaborador: devolver ao estoque
// (quando a pessoa sai) ou repassar para outra pessoa — tudo de uma vez.
//
// São dois passos de propósito: escolher, e depois CONFIRMAR vendo exatamente o
// que vai acontecer. Mover o inventário de várias pessoas por engano é caro de
// desfazer, então a confirmação lista item por item antes de gravar.
import { useMemo, useState } from "react";
import { api } from "../api/client";
import { Equipment } from "../types";
import { maskCPF } from "../lib/masks";
import { Modal, Alert } from "./ui";

type Destino = "ESTOQUE" | "PESSOA";

interface ResultadoTransferencia {
  transferidos: number;
  destino: Destino;
  para: string | null;
  assetIds: string[];
}

export default function TransferModal({
  origem,
  equipments,
  onClose,
  onDone,
}: {
  origem: string; // de quem são os equipamentos
  equipments: Equipment[];
  onClose: () => void;
  onDone: (resultado: ResultadoTransferencia) => void;
}) {
  // Começa com tudo marcado: o caso mais comum é a pessoa sair e devolver tudo.
  const [selecionados, setSelecionados] = useState<Set<string>>(
    () => new Set(equipments.map((e) => e.id))
  );
  const [destino, setDestino] = useState<Destino>("ESTOQUE");

  const [currentUserName, setNome] = useState("");
  const [userEmail, setEmail] = useState("");
  const [userCpf, setCpf] = useState("");
  const [department, setDept] = useState("");
  const [manager, setManager] = useState("");
  const [deliveryDate, setEntrega] = useState("");
  const [note, setNote] = useState("");

  const [confirmando, setConfirmando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [error, setError] = useState("");

  const escolhidos = useMemo(
    () => equipments.filter((e) => selecionados.has(e.id)),
    [equipments, selecionados]
  );

  const faltaNome = destino === "PESSOA" && !currentUserName.trim();
  const podeAvancar = escolhidos.length > 0 && !faltaNome;

  function alternar(id: string) {
    setSelecionados((atual) => {
      const novo = new Set(atual);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  }

  const todosMarcados = selecionados.size === equipments.length;

  function alternarTodos() {
    setSelecionados(todosMarcados ? new Set() : new Set(equipments.map((e) => e.id)));
  }

  async function transferir() {
    setSalvando(true);
    setError("");
    try {
      const resultado = await api<ResultadoTransferencia>("/equipment/bulk-transfer", {
        method: "POST",
        body: {
          equipmentIds: escolhidos.map((e) => e.id),
          destino,
          ...(destino === "PESSOA"
            ? { currentUserName, userEmail, userCpf, department, manager, deliveryDate }
            : {}),
          note,
        },
      });
      onDone(resultado);
    } catch (err: any) {
      setError(err?.message ?? "Não foi possível transferir.");
      setConfirmando(false); // volta para a edição, com o erro à vista
    } finally {
      setSalvando(false);
    }
  }

  const rotuloDestino =
    destino === "ESTOQUE" ? "o Estoque" : `${currentUserName.trim() || "—"}`;

  return (
    <Modal open title={`Transferir equipamentos — ${origem}`} onClose={onClose} wide>
      <div className="space-y-4">
        {error && <Alert>{error}</Alert>}

        {confirmando ? (
          /* ── Passo 2: confirmação ───────────────────────────────────────── */
          <>
            <Alert kind="info">
              Confira antes de confirmar. Esta ação muda o responsável de{" "}
              <strong>{escolhidos.length} equipamento(s)</strong> e fica registrada no histórico.
            </Alert>

            <div className="rounded-xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-800">
              <div className="px-4 py-3 flex items-center gap-3 text-sm">
                <span className="text-slate-500 dark:text-slate-400">De</span>
                <strong className="text-slate-800 dark:text-slate-100">{origem}</strong>
                <i className="ti ti-arrow-right text-slate-400"></i>
                <span className="text-slate-500 dark:text-slate-400">Para</span>
                <strong className="text-slate-800 dark:text-slate-100">
                  {destino === "ESTOQUE" ? "Estoque" : currentUserName.trim()}
                </strong>
              </div>

              {destino === "PESSOA" && (
                <div className="px-4 py-3 grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-slate-600 dark:text-slate-300">
                  <div>E-mail: {userEmail.trim() || "—"}</div>
                  <div>CPF: {userCpf.trim() || "—"}</div>
                  <div>Departamento: {department.trim() || "—"}</div>
                  <div>Gestor: {manager.trim() || "—"}</div>
                  <div>Entrega: {deliveryDate || "hoje"}</div>
                </div>
              )}

              <div className="px-4 py-3">
                <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">
                  Equipamentos ({escolhidos.length})
                </div>
                <ul className="space-y-1 max-h-48 overflow-y-auto">
                  {escolhidos.map((eq) => (
                    <li key={eq.id} className="text-xs text-slate-700 dark:text-slate-300 flex gap-2">
                      <span className="font-mono text-slate-500 dark:text-slate-400">{eq.assetId}</span>
                      <span>
                        {eq.category?.name ?? "Equipamento"}
                        {eq.brand || eq.model ? ` · ${[eq.brand, eq.model].filter(Boolean).join(" ")}` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {note.trim() && (
                <div className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300">
                  Observação: {note.trim()}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                className="btn-secondary"
                onClick={() => setConfirmando(false)}
                disabled={salvando}
              >
                Voltar
              </button>
              <button className="btn-primary" onClick={transferir} disabled={salvando}>
                {salvando
                  ? "Transferindo..."
                  : `Confirmar transferência de ${escolhidos.length} item(ns)`}
              </button>
            </div>
          </>
        ) : (
          /* ── Passo 1: o que transferir e para onde ──────────────────────── */
          <>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="label mb-0">Equipamentos de {origem}</label>
                <button
                  type="button"
                  onClick={alternarTodos}
                  className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {todosMarcados ? "Desmarcar todos" : "Marcar todos"}
                </button>
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-800 max-h-56 overflow-y-auto">
                {equipments.map((eq) => (
                  <label
                    key={eq.id}
                    className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  >
                    <input
                      type="checkbox"
                      checked={selecionados.has(eq.id)}
                      onChange={() => alternar(eq.id)}
                      className="h-4 w-4 rounded border-slate-300 dark:border-slate-700 text-marca focus:ring-2 focus:ring-marca/30"
                    />
                    <span className="font-mono text-xs text-slate-500 dark:text-slate-400 w-24 shrink-0">
                      {eq.assetId}
                    </span>
                    <span className="text-sm text-slate-700 dark:text-slate-200 truncate">
                      {eq.category?.name ?? "Equipamento"}
                      {eq.brand || eq.model ? ` · ${[eq.brand, eq.model].filter(Boolean).join(" ")}` : ""}
                    </span>
                  </label>
                ))}
              </div>

              <p className="text-xs text-slate-400 mt-1">
                {escolhidos.length} de {equipments.length} selecionado(s)
              </p>
            </div>

            <div>
              <label className="label">Transferir para</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setDestino("ESTOQUE")}
                  className={`rounded-xl border p-3 text-left transition-all ${
                    destino === "ESTOQUE"
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-1 ring-blue-500"
                      : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                  }`}
                >
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-800 dark:text-slate-100">
                    <i className="ti ti-package"></i> Estoque
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Para quando a pessoa sai e devolve os itens.
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setDestino("PESSOA")}
                  className={`rounded-xl border p-3 text-left transition-all ${
                    destino === "PESSOA"
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-1 ring-blue-500"
                      : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                  }`}
                >
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-800 dark:text-slate-100">
                    <i className="ti ti-user-check"></i> Outra pessoa
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Passa todos os itens para o novo responsável.
                  </div>
                </button>
              </div>
            </div>

            {destino === "PESSOA" && (
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-3">
                <div className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                  Dados do novo responsável
                </div>
                <div>
                  <label className="label">Nome *</label>
                  <input
                    className="input"
                    value={currentUserName}
                    onChange={(e) => setNome(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">E-mail do Usuário</label>
                    <input
                      type="email"
                      className="input"
                      value={userEmail}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="label">CPF do Usuário</label>
                    <input
                      className="input"
                      value={userCpf}
                      onChange={(e) => setCpf(maskCPF(e.target.value))}
                      placeholder="000.000.000-00"
                      inputMode="numeric"
                    />
                  </div>
                  <div>
                    <label className="label">Departamento</label>
                    <input
                      className="input"
                      value={department}
                      onChange={(e) => setDept(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="label">Gestor</label>
                    <input
                      className="input"
                      value={manager}
                      onChange={(e) => setManager(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="label">Data de Entrega</label>
                    <input
                      type="date"
                      className="input"
                      value={deliveryDate}
                      onChange={(e) => setEntrega(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="label">Observação da transferência</label>
              <input
                className="input"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Ex.: desligamento, mudança de área..."
              />
              <p className="text-xs text-slate-400 mt-1">
                Fica registrada no histórico de cada equipamento.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button className="btn-secondary" onClick={onClose}>
                Cancelar
              </button>
              <button
                className="btn-primary"
                onClick={() => {
                  setError("");
                  setConfirmando(true);
                }}
                disabled={!podeAvancar}
                title={
                  escolhidos.length === 0
                    ? "Selecione ao menos um equipamento"
                    : faltaNome
                    ? "Informe o nome do novo responsável"
                    : undefined
                }
              >
                Revisar transferência
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
