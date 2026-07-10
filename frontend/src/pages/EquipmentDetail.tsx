// Ficha completa de um equipamento: dados, histórico de responsáveis e termo.
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, openPdf } from "../api/client";
import { Equipment } from "../types";
import { StatusBadge, ConditionBadge, Modal, Spinner, Alert } from "../components/ui";
import EquipmentForm from "../components/EquipmentForm";
import AssignModal from "../components/AssignModal";
import { formatDate, formatMoney, isPhoneCategory, OWNERSHIP_LABEL } from "../lib/format";
import { useData } from "../context/DataContext";

export default function EquipmentDetail() {
  const { id } = useParams();
  // Categorias e listas fixas vêm do contexto (sem rebuscar a cada visita).
  const {
    categories,
    status: statusOptions,
    condition: conditionOptions,
    ownership: ownershipOptions,
  } = useData();

  const [eq, setEq] = useState<Equipment | null>(null);
  const [editing, setEditing] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setEq(await api<Equipment>(`/equipment/${id}`));
  }

  useEffect(() => {
    load();
  }, [id]);

  async function gerarTermo() {
    setError("");
    try {
      await openPdf(`/documents/equipment/${id}/termo.pdf`);
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function devolver() {
    if (!confirm("Devolver este item ao estoque? O responsável atual será encerrado no histórico.")) return;
    await api(`/equipment/${id}/unassign`, { method: "POST", body: {} });
    load();
  }

  if (!eq) return <Spinner />;

  const Info = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div>
      <div className="text-xs uppercase tracking-wide text-gray-400 dark:text-slate-400">{label}</div>
      <div className="text-sm">{value ?? "—"}</div>
    </div>
  );

  return (
    <div className="space-y-4">
      <Link to="/inventario" className="text-sm text-marca dark:text-marca-claro hover:underline">
        ← Voltar ao inventário
      </Link>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">
            {eq.assetId} <span className="text-gray-400 dark:text-slate-500 text-lg">· {eq.category?.name}</span>
          </h1>
          <div className="mt-1 flex gap-2">
            <StatusBadge status={eq.status} />
            <ConditionBadge condition={eq.condition} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2 justify-end">
          <button className="btn-secondary" onClick={() => setAssigning(true)}>
            Atribuir / Trocar
          </button>
          {eq.status === "EM_USO" && (
            <button className="btn-secondary" onClick={devolver}>
              Devolver ao estoque
            </button>
          )}
          <button className="btn-verde" onClick={gerarTermo} title="Gerar termo de responsabilidade">
            Gerar termo (PDF)
          </button>
          <button className="btn-secondary" onClick={() => setEditing(true)}>
            Editar
          </button>
        </div>
      </div>

      {error && <Alert>{error}</Alert>}

      <div className="grid md:grid-cols-3 gap-4">
        {/* Dados do equipamento */}
        <div className="card p-5 md:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Info label="Marca" value={eq.brand} />
          <Info label="Modelo" value={eq.model} />
          <Info label="Cor" value={eq.color} />
          <Info label="Propriedade" value={eq.ownership ? OWNERSHIP_LABEL[eq.ownership] ?? eq.ownership : "—"} />
          {isPhoneCategory(eq.category?.name) ? (
            <>
              <Info label="Película" value={eq.pelicula} />
              <Info label="Capa" value={eq.capa} />
              <Info label="IMEI 1" value={eq.imei1} />
              <Info label="IMEI 2" value={eq.imei2} />
              <Info label="Endereço MAC" value={eq.macAddress} />
            </>
          ) : (
            <>
              <Info label="Configuração" value={eq.configuration} />
              <Info label="Número de Série" value={eq.serialNumber} />
            </>
          )}
          <Info label="Patrimônio" value={eq.assetTag} />
          <Info label="Fornecedor" value={eq.supplier} />
          <Info label="Localização" value={eq.location} />
          <Info label="Valor" value={formatMoney(eq.value)} />
          <Info label="Aquisição" value={formatDate(eq.acquisitionDate)} />
          <Info label="Entrega ao usuário" value={formatDate(eq.deliveryDate)} />
          {!isPhoneCategory(eq.category?.name) && (
            <>
              <Info label="Garantia (final)" value={formatDate(eq.warrantyEndDate)} />
              <Info label="Última conferência" value={formatDate(eq.lastCheckDate)} />
            </>
          )}
        </div>

        {/* Responsável atual */}
        <div className="card p-5 space-y-3">
          <div className="text-sm font-semibold text-gray-600 dark:text-slate-200">Responsável atual</div>
          {eq.currentUserName ? (
            <>
              <Info label="Nome" value={eq.currentUserName} />
              <Info label="E-mail" value={eq.userEmail} />
              <Info label="CPF" value={eq.userCpf} />
              <Info label="Departamento" value={eq.department} />
              <Info label="Gestor" value={eq.manager} />
            </>
          ) : (
            <div className="text-sm text-gray-400 dark:text-slate-500">Sem responsável (em estoque).</div>
          )}
        </div>
      </div>

      {/* Acessórios e Observações */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="card p-5">
          <div className="text-sm font-semibold text-gray-600 dark:text-slate-200 mb-1">Acessórios / itens inclusos</div>
          <div className="text-sm whitespace-pre-wrap">{eq.accessories || "—"}</div>
        </div>
        <div className="card p-5">
          <div className="text-sm font-semibold text-gray-600 dark:text-slate-200 mb-1">Observações</div>
          <div className="text-sm whitespace-pre-wrap">{eq.notes || "—"}</div>
        </div>
      </div>

      {/* Linha do tempo do histórico */}
      <div className="card p-5">
        <div className="text-sm font-semibold text-gray-600 dark:text-slate-200 mb-3">
          Histórico de responsáveis (gerado automaticamente)
        </div>
        {!eq.assignments || eq.assignments.length === 0 ? (
          <div className="text-sm text-gray-400 dark:text-slate-500">Ainda não há histórico para este item.</div>
        ) : (
          <ol className="relative border-l-2 border-gray-200 dark:border-slate-700 ml-2 space-y-4">
            {eq.assignments.map((a) => (
              <li key={a.id} className="ml-4">
                <span className="absolute -left-[7px] h-3 w-3 rounded-full bg-marca dark:bg-marca-claro" />
                <div className="flex items-center gap-2">
                  <span className="font-medium">{a.userName}</span>
                  {!a.endDate && (
                    <span className="rounded-full bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-400 px-2 py-0.5 text-xs">atual</span>
                  )}
                </div>
                <div className="text-xs text-gray-500 dark:text-slate-400">
                  {formatDate(a.startDate)} → {a.endDate ? formatDate(a.endDate) : "presente"}
                  {a.department ? ` · ${a.department}` : ""}
                </div>
                {a.note && <div className="text-xs text-gray-400 dark:text-slate-500 italic">{a.note}</div>}
              </li>
            ))}
          </ol>
        )}
      </div>

      {/* Modais */}
      <Modal open={editing} title={`Editar — ${eq.assetId}`} onClose={() => setEditing(false)} wide>
        <EquipmentForm
          equipment={eq}
          categories={categories}
          statusOptions={statusOptions}
          conditionOptions={conditionOptions}
          ownershipOptions={ownershipOptions}
          onSaved={() => {
            setEditing(false);
            load();
          }}
          onCancel={() => setEditing(false)}
        />
      </Modal>

      {assigning && (
        <AssignModal
          equipment={eq}
          onClose={() => setAssigning(false)}
          onDone={() => {
            setAssigning(false);
            load();
          }}
        />
      )}
    </div>
  );
}
