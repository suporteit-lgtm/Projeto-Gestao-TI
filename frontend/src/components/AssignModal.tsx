// Modal de troca rápida de responsável — o "maior incômodo" resolvido em poucos cliques.
import { useState } from "react";
import { api } from "../api/client";
import { Equipment } from "../types";
import { Modal, Alert } from "./ui";

export default function AssignModal({
  equipment,
  onClose,
  onDone,
}: {
  equipment: Equipment;
  onClose: () => void;
  onDone: (eq: Equipment) => void;
}) {
  const [currentUserName, setName] = useState("");
  const [userEmail, setEmail] = useState("");
  const [department, setDept] = useState(equipment.department ?? "");
  const [manager, setManager] = useState(equipment.manager ?? "");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    setError("");
    setSaving(true);
    try {
      const eq = await api<Equipment>(`/equipment/${equipment.id}/assign`, {
        method: "POST",
        body: { currentUserName, userEmail, department, manager, note },
      });
      onDone(eq);
    } catch (err: any) {
      setError(err.message ?? "Erro ao atribuir.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open title={`Atribuir / Trocar responsável — ${equipment.assetId}`} onClose={onClose}>
      <div className="space-y-3">
        {error && <Alert>{error}</Alert>}
        {equipment.currentUserName && (
          <Alert kind="info">
            Responsável atual: <strong>{equipment.currentUserName}</strong>. Ao confirmar, ele será
            encerrado no histórico e o novo passará a constar como atual.
          </Alert>
        )}
        <div>
          <label className="label">Novo responsável *</label>
          <input className="input" value={currentUserName} onChange={(e) => setName(e.target.value)} autoFocus />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">E-mail</label>
            <input className="input" value={userEmail} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="label">Departamento</label>
            <input className="input" value={department} onChange={(e) => setDept(e.target.value)} />
          </div>
          <div>
            <label className="label">Gestor</label>
            <input className="input" value={manager} onChange={(e) => setManager(e.target.value)} />
          </div>
          <div>
            <label className="label">Observação da troca</label>
            <input className="input" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button className="btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn-primary" onClick={submit} disabled={saving || !currentUserName.trim()}>
            {saving ? "Salvando..." : "Confirmar troca"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
