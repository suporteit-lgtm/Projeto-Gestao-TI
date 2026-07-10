// Popup para gerenciar categorias (adicionar, renomear, remover) — usado pelo
// botão "+" do formulário de equipamento e pela página de Categorias.
import { useState } from "react";
import { api } from "../api/client";
import { Category } from "../types";
import { Modal, Alert } from "./ui";

export default function CategoryManagerModal({
  categories,
  onClose,
  onChanged,
}: {
  categories: Category[];
  onClose: () => void;
  onChanged: () => Promise<void> | void;
}) {
  const [novo, setNovo] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editNome, setEditNome] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function run(fn: () => Promise<any>) {
    setError("");
    setBusy(true);
    try {
      await fn();
      await onChanged();
    } catch (err: any) {
      setError(err.message ?? "Erro.");
    } finally {
      setBusy(false);
    }
  }

  const adicionar = () =>
    novo.trim() &&
    run(async () => {
      await api("/categories", { method: "POST", body: { name: novo.trim() } });
      setNovo("");
    });

  const salvarEdicao = (id: string) =>
    editNome.trim() &&
    run(async () => {
      await api(`/categories/${id}`, { method: "PUT", body: { name: editNome.trim() } });
      setEditId(null);
      setEditNome("");
    });

  const excluir = (c: Category) => {
    if (!confirm(`Excluir a categoria "${c.name}"?`)) return;
    run(() => api(`/categories/${c.id}`, { method: "DELETE" }));
  };

  return (
    <Modal open title="Gerenciar categorias" onClose={onClose}>
      <div className="space-y-3">
        {error && <Alert>{error}</Alert>}

        {/* Adicionar */}
        <div className="flex gap-2">
          <input
            className="input"
            placeholder="Nova categoria (ex.: Webcam, Dock Station...)"
            value={novo}
            onChange={(e) => setNovo(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), adicionar())}
          />
          <button className="btn-primary whitespace-nowrap" onClick={adicionar} disabled={busy || !novo.trim()}>
            Adicionar
          </button>
        </div>

        {/* Lista */}
        <div className="max-h-72 overflow-y-auto rounded-lg border border-slate-200 divide-y divide-slate-100">
          {categories.length === 0 && (
            <div className="px-3 py-6 text-center text-sm text-slate-400">Nenhuma categoria ainda.</div>
          )}
          {categories.map((c) => (
            <div key={c.id} className="flex items-center gap-2 px-3 py-2">
              {editId === c.id ? (
                <>
                  <input
                    className="input py-1"
                    value={editNome}
                    autoFocus
                    onChange={(e) => setEditNome(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), salvarEdicao(c.id))}
                  />
                  <button className="text-sm text-verde-escuro hover:underline" onClick={() => salvarEdicao(c.id)}>
                    Salvar
                  </button>
                  <button className="text-sm text-slate-500 hover:underline" onClick={() => setEditId(null)}>
                    Cancelar
                  </button>
                </>
              ) : (
                <>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{c.name}</div>
                    <div className="text-xs text-slate-400">{c.count ?? 0} equipamento(s)</div>
                  </div>
                  <button
                    className="text-sm text-marca hover:underline"
                    onClick={() => {
                      setEditId(c.id);
                      setEditNome(c.name);
                    }}
                  >
                    Renomear
                  </button>
                  <button className="text-sm text-red-600 hover:underline" onClick={() => excluir(c)}>
                    Excluir
                  </button>
                </>
              )}
            </div>
          ))}
        </div>

        <div className="flex justify-end pt-1">
          <button className="btn-secondary" onClick={onClose}>
            Fechar
          </button>
        </div>
      </div>
    </Modal>
  );
}
