// Formulário de cadastro/edição de equipamento.
// - ID do Ativo é GERADO automaticamente (não editável).
// - Quando a categoria é de celular, mostra campos específicos (IMEI, MAC,
//   película, capa, CPF) em vez de série/configuração/e-mail.
// - Campos numéricos usam máscaras (valor, CPF, IMEI, MAC).
import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import { Category, Equipment, MetaOption } from "../types";
import { toDateInput, isPhoneCategory } from "../lib/format";
import { maskCPF, maskIMEI, maskMAC, maskMoneyBR, parseMoneyBR } from "../lib/masks";
import { Alert } from "./ui";
import CategoryManagerModal from "./CategoryManagerModal";

interface Props {
  equipment?: Equipment | null; // se vier, é edição
  categories: Category[];
  statusOptions: MetaOption[];
  conditionOptions: MetaOption[];
  ownershipOptions: MetaOption[];
  onSaved: (eq: Equipment) => void;
  onCancel: () => void;
  onCategoriesChanged?: () => void;
}

function emptyForm() {
  return {
    categoryId: "",
    brand: "",
    model: "",
    color: "",
    configuration: "",
    serialNumber: "",
    assetTag: "",
    status: "EM_ESTOQUE",
    condition: "BOM",
    ownership: "",
    pelicula: "",
    capa: "",
    imei1: "",
    imei2: "",
    macAddress: "",
    supplier: "",
    location: "",
    currentUserName: "",
    department: "",
    manager: "",
    userEmail: "",
    userCpf: "",
    acquisitionDate: "",
    deliveryDate: "",
    warrantyEndDate: "",
    lastCheckDate: "",
    value: "",
    notes: "",
    accessories: "",
  };
}

export default function EquipmentForm({
  equipment,
  categories,
  statusOptions,
  conditionOptions,
  ownershipOptions,
  onSaved,
  onCancel,
  onCategoriesChanged,
}: Props) {
  const [form, setForm] = useState(emptyForm());
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [showCatModal, setShowCatModal] = useState(false);

  useEffect(() => {
    if (equipment) {
      setForm({
        categoryId: equipment.categoryId ?? "",
        brand: equipment.brand ?? "",
        model: equipment.model ?? "",
        color: equipment.color ?? "",
        configuration: equipment.configuration ?? "",
        serialNumber: equipment.serialNumber ?? "",
        assetTag: equipment.assetTag ?? "",
        status: equipment.status ?? "EM_ESTOQUE",
        condition: equipment.condition ?? "BOM",
        ownership: equipment.ownership ?? "",
        pelicula: equipment.pelicula ?? "",
        capa: equipment.capa ?? "",
        imei1: equipment.imei1 ?? "",
        imei2: equipment.imei2 ?? "",
        macAddress: equipment.macAddress ?? "",
        supplier: equipment.supplier ?? "",
        location: equipment.location ?? "",
        currentUserName: equipment.currentUserName ?? "",
        department: equipment.department ?? "",
        manager: equipment.manager ?? "",
        userEmail: equipment.userEmail ?? "",
        userCpf: equipment.userCpf ?? "",
        acquisitionDate: toDateInput(equipment.acquisitionDate),
        deliveryDate: toDateInput(equipment.deliveryDate),
        warrantyEndDate: toDateInput(equipment.warrantyEndDate),
        lastCheckDate: toDateInput(equipment.lastCheckDate),
        value: equipment.value != null ? maskMoneyBR(String(Math.round(equipment.value * 100))) : "",
        notes: equipment.notes ?? "",
        accessories: equipment.accessories ?? "",
      });
    } else {
      setForm({ ...emptyForm(), categoryId: categories[0]?.id ?? "" });
    }
  }, [equipment, categories]);

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  // Nome da categoria selecionada -> decide se mostra os campos de celular.
  const selectedCategoryName = useMemo(
    () => categories.find((c) => c.id === form.categoryId)?.name ?? "",
    [categories, form.categoryId]
  );
  const isPhone = isPhoneCategory(selectedCategoryName);

  // Abre o popup de gerenciamento de categorias (adicionar/renomear/remover).
  function abrirCategorias() {
    setShowCatModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const payload: any = {
        ...form,
        value: parseMoneyBR(form.value),
        ownership: form.ownership || null,
      };
      // Não enviamos assetId: o backend gera automaticamente na criação.
      const saved = equipment
        ? await api<Equipment>(`/equipment/${equipment.id}`, { method: "PUT", body: payload })
        : await api<Equipment>("/equipment", { method: "POST", body: payload });
      onSaved(saved);
    } catch (err: any) {
      setError(err.message ?? "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  // Helper para um campo de texto simples com máscara opcional.
  const field = (
    label: string,
    name: keyof ReturnType<typeof emptyForm>,
    opts: { type?: string; mask?: (v: string) => string; placeholder?: string } = {}
  ) => (
    <div>
      <label className="label">{label}</label>
      <input
        type={opts.type ?? "text"}
        className="input"
        placeholder={opts.placeholder}
        value={(form as any)[name]}
        onChange={(e) => set(name, opts.mask ? opts.mask(e.target.value) : e.target.value)}
      />
    </div>
  );

  const simNao = (label: string, name: keyof ReturnType<typeof emptyForm>) => (
    <div>
      <label className="label">{label}</label>
      <select className="input" value={(form as any)[name]} onChange={(e) => set(name, e.target.value)}>
        <option value="">—</option>
        <option value="Sim">Sim</option>
        <option value="Não">Não</option>
      </select>
    </div>
  );

  return (
    <>
    {showCatModal && (
      <CategoryManagerModal
        categories={categories}
        onClose={() => setShowCatModal(false)}
        onChanged={async () => {
          await onCategoriesChanged?.();
        }}
      />
    )}
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <Alert>{error}</Alert>}

      {/* ID do Ativo: automático */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">ID do Ativo</label>
          <input
            className="input bg-gray-100 text-gray-500"
            value={equipment ? equipment.assetId : "Gerado automaticamente"}
            readOnly
            disabled
          />
          {!equipment && (
            <p className="text-xs text-gray-400 mt-1">Criado automaticamente conforme a categoria.</p>
          )}
        </div>
        <div>
          <label className="label">Tipo / Categoria *</label>
          <div className="flex gap-2">
            <select
              className="input"
              value={form.categoryId}
              onChange={(e) => set("categoryId", e.target.value)}
              required
            >
              <option value="">Selecione...</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="btn-secondary px-3"
              onClick={abrirCategorias}
              title="Gerenciar categorias"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {isPhone && (
        <Alert kind="info">Categoria de celular: mostrando campos específicos (IMEI, MAC, película, capa, CPF).</Alert>
      )}

      <div className="grid grid-cols-3 gap-4">
        {field("Marca", "brand")}
        {field("Modelo", "model")}
        {field("Cor", "color")}
      </div>

      {/* Campos que variam conforme o tipo */}
      {isPhone ? (
        <>
          <div className="grid grid-cols-2 gap-4">
            {simNao("Película", "pelicula")}
            {simNao("Capa", "capa")}
          </div>
          <div className="grid grid-cols-2 gap-4">
            {field("IMEI 1", "imei1", { mask: maskIMEI, placeholder: "15 dígitos" })}
            {field("IMEI 2", "imei2", { mask: maskIMEI, placeholder: "15 dígitos" })}
          </div>
          <div className="grid grid-cols-2 gap-4">
            {field("Endereço MAC", "macAddress", { mask: maskMAC, placeholder: "AA:BB:CC:DD:EE:FF" })}
            {field("Número de Patrimônio", "assetTag")}
          </div>
        </>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4">
            {field("Configuração", "configuration")}
            {field("Número de Série", "serialNumber")}
          </div>
          <div className="grid grid-cols-2 gap-4">{field("Número de Patrimônio", "assetTag")}</div>
        </>
      )}

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="label">Status do Ativo</label>
          <select className="input" value={form.status} onChange={(e) => set("status", e.target.value)}>
            {statusOptions.map((o) => (
              <option key={o.key} value={o.key}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Condição</label>
          <select className="input" value={form.condition} onChange={(e) => set("condition", e.target.value)}>
            {conditionOptions.map((o) => (
              <option key={o.key} value={o.key}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Propriedade</label>
          <select className="input" value={form.ownership} onChange={(e) => set("ownership", e.target.value)}>
            <option value="">—</option>
            {ownershipOptions.map((o) => (
              <option key={o.key} value={o.key}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {field("Fornecedor", "supplier")}
        {field("Localização", "location")}
      </div>

      <div className="border-t pt-4">
        <div className="text-sm font-semibold text-gray-600 mb-2">Responsável atual (quando em uso)</div>
        <div className="grid grid-cols-2 gap-4">
          {field("Usuário Atual", "currentUserName")}
          {field("E-mail do Usuário", "userEmail", { type: "email" })}
          {field("CPF do Usuário", "userCpf", { mask: maskCPF, placeholder: "000.000.000-00" })}
          {field("Departamento", "department")}
          {field("Gestor", "manager")}
        </div>
        <p className="text-xs text-gray-400 mt-1">
          Ao mudar o "Usuário Atual", o sistema registra a troca no histórico automaticamente.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {field("Data de Aquisição", "acquisitionDate", { type: "date" })}
        {field("Data de Entrega ao Usuário", "deliveryDate", { type: "date" })}
        {!isPhone && field("Garantia (Data Final)", "warrantyEndDate", { type: "date" })}
        {!isPhone && field("Última Conferência", "lastCheckDate", { type: "date" })}
        <div>
          <label className="label">Valor (R$)</label>
          <input
            className="input"
            value={form.value}
            onChange={(e) => set("value", maskMoneyBR(e.target.value))}
            placeholder="0,00"
            inputMode="numeric"
          />
        </div>
      </div>

      <div>
        <label className="label">Acessórios / itens inclusos</label>
        <input
          className="input"
          value={form.accessories}
          onChange={(e) => set("accessories", e.target.value)}
          placeholder="Ex.: Carregador, Capa, Fonte, Adaptador"
        />
      </div>

      <div>
        <label className="label">Observações</label>
        <textarea
          className="input min-h-[70px]"
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
          placeholder="Ex.: defeitos, riscos, tela com mancha, bateria fraca..."
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button type="button" className="btn-secondary" onClick={onCancel}>
          Cancelar
        </button>
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? "Salvando..." : "Salvar"}
        </button>
      </div>
    </form>
    </>
  );
}
