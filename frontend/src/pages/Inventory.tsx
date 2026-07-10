// Listagem do inventário: busca, filtros, exportação e ações rápidas.
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api, download } from "../api/client";
import { Equipment } from "../types";
import { StatusBadge, ConditionBadge, Modal, Spinner, Alert } from "../components/ui";
import EquipmentForm from "../components/EquipmentForm";
import AssignModal from "../components/AssignModal";
import { formatMoney } from "../lib/format";
import { useData } from "../context/DataContext";

export default function Inventory() {
  const {
    categories,
    status: statusOptions,
    condition: conditionOptions,
    ownership: ownershipOptions,
    reloadCategories,
  } = useData();

  const [items, setItems] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Filtros
  const [search, setSearch] = useState("");
  const [fCategory, setFCategory] = useState("");
  const [fStatus, setFStatus] = useState("");
  const [fCondition, setFCondition] = useState("");
  const [fResponsible, setFResponsible] = useState("");
  const [fDepartment, setFDepartment] = useState("");
  const [fLocation, setFLocation] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Modais
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Equipment | null>(null);
  const [assigning, setAssigning] = useState<Equipment | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Equipment | null>(null);
  const [deleting, setDeleting] = useState(false);

  const query = useMemo(() => {
    const p = new URLSearchParams();
    if (search) p.set("search", search);
    if (fCategory) p.set("categoryId", fCategory);
    if (fStatus) p.set("status", fStatus);
    if (fCondition) p.set("condition", fCondition);
    if (fResponsible) p.set("responsible", fResponsible);
    if (fDepartment) p.set("department", fDepartment);
    if (fLocation) p.set("location", fLocation);
    const s = p.toString();
    return s ? `?${s}` : "";
  }, [search, fCategory, fStatus, fCondition, fResponsible, fDepartment, fLocation]);

  useEffect(() => {
    setLoading(true);
    setLoadError("");
    setCurrentPage(1); // Reseta a página ao filtrar/buscar
    const t = setTimeout(async () => {
      try {
        setItems(await api<Equipment[]>(`/equipment${query}`));
      } catch (err: any) {
        setLoadError(err?.message ?? "Não foi possível carregar o inventário.");
        setItems([]);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  async function reload() {
    try {
      setItems(await api<Equipment[]>(`/equipment${query}`));
    } catch (err: any) {
      setLoadError(err?.message ?? "Falha ao recarregar.");
    }
  }

  function clearFilters() {
    setSearch("");
    setFCategory("");
    setFStatus("");
    setFCondition("");
    setFResponsible("");
    setFDepartment("");
    setFLocation("");
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await api(`/equipment/${confirmDelete.id}`, { method: "DELETE" });
      setConfirmDelete(null);
      reload();
    } catch (err: any) {
      alert(err?.message ?? "Não foi possível excluir.");
    } finally {
      setDeleting(false);
    }
  }

  const hasFilters = search || fCategory || fStatus || fCondition || fResponsible || fDepartment || fLocation;
  const activeFilterCount = [fCategory, fStatus, fCondition, fResponsible, fDepartment, fLocation].filter(Boolean).length;

  // Paginação - Computação
  const totalItems = items.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const displayedItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return items.slice(start, start + itemsPerPage);
  }, [items, currentPage]);

  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      if (start > 2) pages.push("ellipsis-1");
      for (let i = start; i <= end; i++) pages.push(i);
      if (end < totalPages - 1) pages.push("ellipsis-2");
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">Inventário</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {loading ? "Carregando..." : `${items.length} equipamento${items.length !== 1 ? "s" : ""} encontrado${items.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => download(`/export/csv${query}`, "inventario.csv")}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <i className="ti ti-file-type-csv text-sm"></i>
            CSV
          </button>
          <button
            onClick={() => download(`/export/xlsx${query}`, "inventario.xlsx")}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <i className="ti ti-file-spreadsheet text-sm"></i>
            Excel
          </button>
          <button
            onClick={() => { setEditing(null); setShowForm(true); }}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-sm"
          >
            <i className="ti ti-plus text-base"></i>
            Novo equipamento
          </button>
        </div>
      </div>

      {loadError && <Alert>{loadError}</Alert>}

      {/* ── Search + Filters ── */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
        {/* Search bar row */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-800">
          <i className="ti ti-search text-slate-400 dark:text-slate-500 text-lg shrink-0"></i>
          <input
            className="flex-1 bg-transparent text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none"
            placeholder="Buscar por ID, marca, modelo, série, patrimônio, responsável..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch("")} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
              <i className="ti ti-x text-sm"></i>
            </button>
          )}
          <div className="w-px h-5 bg-slate-200 dark:bg-slate-700" />
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
              showFilters || activeFilterCount > 0
                ? "bg-blue-600 text-white"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
            }`}
          >
            <i className="ti ti-adjustments-horizontal text-sm"></i>
            Filtros
            {activeFilterCount > 0 && (
              <span className="bg-white/30 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full ml-0.5">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Filters panel */}
        {showFilters && (
          <div className="px-4 py-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-1">Tipo</label>
                <select className="input text-xs" value={fCategory} onChange={(e) => setFCategory(e.target.value)}>
                  <option value="">Todos</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-1">Status</label>
                <select className="input text-xs" value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
                  <option value="">Todos</option>
                  {statusOptions.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-1">Condição</label>
                <select className="input text-xs" value={fCondition} onChange={(e) => setFCondition(e.target.value)}>
                  <option value="">Todas</option>
                  {conditionOptions.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-1">Responsável</label>
                <input className="input text-xs" placeholder="Nome..." value={fResponsible} onChange={(e) => setFResponsible(e.target.value)} />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-1">Departamento</label>
                <input className="input text-xs" placeholder="Dept..." value={fDepartment} onChange={(e) => setFDepartment(e.target.value)} />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-1">Localização</label>
                <input className="input text-xs" placeholder="Local..." value={fLocation} onChange={(e) => setFLocation(e.target.value)} />
              </div>
            </div>
            {hasFilters && (
              <button onClick={clearFilters} className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 font-medium hover:underline">
                <i className="ti ti-x text-sm"></i>
                Limpar filtros
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Table ── */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Spinner />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
              <i className="ti ti-device-laptop text-slate-400 text-2xl"></i>
            </div>
            <div className="text-center">
              <p className="font-semibold text-slate-700 dark:text-slate-300">Nenhum equipamento encontrado</p>
              <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
                {hasFilters ? "Tente remover alguns filtros." : "Cadastre o primeiro equipamento."}
              </p>
            </div>
            {hasFilters ? (
              <button onClick={clearFilters} className="text-xs text-blue-600 dark:text-blue-400 underline">
                Limpar filtros
              </button>
            ) : (
              <button
                onClick={() => { setEditing(null); setShowForm(true); }}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
              >
                <i className="ti ti-plus text-sm"></i>
                Novo equipamento
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
                  {["ID / Tipo", "Marca / Modelo", "Status", "Condição", "Responsável", "Localização", "Valor", ""].map((h, i) => (
                    <th
                      key={i}
                      className={`px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 ${
                        i === 7 ? "text-right" : "text-left"
                      }`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {displayedItems.map((eq) => (
                  <tr
                    key={eq.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group"
                  >
                    {/* ID / Tipo */}
                    <td className="px-4 py-3">
                      <Link
                        to={`/equipamento/${eq.id}`}
                        className="font-semibold text-blue-600 dark:text-blue-400 hover:underline text-sm"
                      >
                        {eq.assetId}
                      </Link>
                      {eq.category?.name && (
                        <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 flex items-center gap-1">
                          <i className="ti ti-tag text-[10px]"></i>
                          {eq.category.name}
                        </div>
                      )}
                    </td>

                    {/* Marca / Modelo */}
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800 dark:text-slate-200">
                        {eq.brand} {eq.model}
                      </div>
                      {eq.serialNumber && (
                        <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 font-mono">
                          SN: {eq.serialNumber}
                        </div>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <StatusBadge status={eq.status} />
                    </td>

                    {/* Condição */}
                    <td className="px-4 py-3">
                      <ConditionBadge condition={eq.condition} />
                    </td>

                    {/* Responsável */}
                    <td className="px-4 py-3">
                      {eq.currentUserName ? (
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center text-[10px] font-bold shrink-0">
                            {eq.currentUserName.split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase()}
                          </div>
                          <span className="text-sm text-slate-700 dark:text-slate-300 truncate max-w-[120px]">{eq.currentUserName}</span>
                        </div>
                      ) : (
                        <span className="text-slate-300 dark:text-slate-600">—</span>
                      )}
                    </td>

                    {/* Localização */}
                    <td className="px-4 py-3">
                      {eq.location ? (
                        <span className="text-sm text-slate-600 dark:text-slate-300 flex items-center gap-1">
                          <i className="ti ti-map-pin text-slate-400 text-xs"></i>
                          {eq.location}
                        </span>
                      ) : (
                        <span className="text-slate-300 dark:text-slate-600">—</span>
                      )}
                    </td>

                    {/* Valor */}
                    <td className="px-4 py-3 font-mono text-xs text-slate-600 dark:text-slate-400">
                      {formatMoney(eq.value)}
                    </td>

                    {/* Ações */}
                    <td className="px-4 py-3">
                      <div className="flex justify-end items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setAssigning(eq)}
                          title="Atribuir responsável"
                          className="w-7 h-7 flex items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                        >
                          <i className="ti ti-user-check text-sm"></i>
                        </button>
                        <button
                          onClick={() => { setEditing(eq); setShowForm(true); }}
                          title="Editar"
                          className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                        >
                          <i className="ti ti-pencil text-sm"></i>
                        </button>
                        <button
                          onClick={() => setConfirmDelete(eq)}
                          title="Excluir"
                          className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                        >
                          <i className="ti ti-trash text-sm"></i>
                        </button>
                        <Link
                          to={`/equipamento/${eq.id}`}
                          title="Ver detalhes"
                          className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                        >
                          <i className="ti ti-arrow-right text-sm"></i>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Table footer com paginação */}
            <div className="px-5 py-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50 dark:bg-slate-800/20">
              {/* Contagem */}
              <div className="text-xs text-slate-500 dark:text-slate-400 order-2 sm:order-1">
                Exibindo <span className="font-semibold text-slate-800 dark:text-slate-200">{startItem}</span> a{" "}
                <span className="font-semibold text-slate-800 dark:text-slate-200">{endItem}</span> de{" "}
                <span className="font-semibold text-slate-800 dark:text-slate-200">{totalItems}</span> equipamentos
              </div>

              {/* Controles de página */}
              {totalPages > 1 && (
                <div className="flex items-center gap-1.5 order-1 sm:order-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors"
                    title="Página anterior"
                  >
                    <i className="ti ti-chevron-left text-sm"></i>
                  </button>

                  {getPageNumbers().map((p, idx) => {
                    if (typeof p === "string") {
                      return (
                        <span key={`ellipsis-${idx}`} className="px-1.5 text-slate-400 dark:text-slate-600 select-none text-xs">
                          ...
                        </span>
                      );
                    }
                    return (
                      <button
                        key={p}
                        onClick={() => setCurrentPage(p)}
                        className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-semibold transition-all ${
                          currentPage === p
                            ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                            : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                        }`}
                      >
                        {p}
                      </button>
                    );
                  })}

                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors"
                    title="Próxima página"
                  >
                    <i className="ti ti-chevron-right text-sm"></i>
                  </button>
                </div>
              )}

              {/* Ações de exportação */}
              <div className="flex items-center gap-3 order-3">
                <button
                  onClick={() => download(`/export/csv${query}`, "inventario.csv")}
                  className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 transition-colors"
                  title="Exportar como CSV"
                >
                  <i className="ti ti-file-type-csv text-sm"></i>
                  CSV
                </button>
                <div className="w-px h-3 bg-slate-200 dark:bg-slate-700" />
                <button
                  onClick={() => download(`/export/xlsx${query}`, "inventario.xlsx")}
                  className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 transition-colors"
                  title="Exportar como Excel"
                >
                  <i className="ti ti-file-spreadsheet text-sm"></i>
                  Excel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Confirm Delete Modal */}
      {confirmDelete && (
        <Modal open title="Excluir equipamento" onClose={() => setConfirmDelete(null)}>
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <i className="ti ti-alert-triangle text-red-500 text-xl mt-0.5"></i>
              <div>
                <p className="font-medium text-red-700 dark:text-red-400 text-sm">Ação irreversível</p>
                <p className="text-sm text-red-600 dark:text-red-500 mt-0.5">
                  Tem certeza que deseja excluir o equipamento{" "}
                  <strong>{confirmDelete.assetId}</strong>? Esta ação não pode ser desfeita.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button className="btn-secondary" onClick={() => setConfirmDelete(null)}>
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
              >
                <i className={`ti ${deleting ? "ti-loader-2 animate-spin" : "ti-trash"} text-sm`}></i>
                {deleting ? "Excluindo..." : "Excluir"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal de criação/edição */}
      <Modal
        open={showForm}
        title={editing ? `Editar — ${editing.assetId}` : "Novo equipamento"}
        onClose={() => setShowForm(false)}
        wide
      >
        <EquipmentForm
          equipment={editing}
          categories={categories}
          statusOptions={statusOptions}
          conditionOptions={conditionOptions}
          ownershipOptions={ownershipOptions}
          onCategoriesChanged={reloadCategories}
          onSaved={() => { setShowForm(false); reload(); }}
          onCancel={() => setShowForm(false)}
        />
      </Modal>

      {/* Modal de troca de responsável */}
      {assigning && (
        <AssignModal
          equipment={assigning}
          onClose={() => setAssigning(null)}
          onDone={() => { setAssigning(null); reload(); }}
        />
      )}
    </div>
  );
}
