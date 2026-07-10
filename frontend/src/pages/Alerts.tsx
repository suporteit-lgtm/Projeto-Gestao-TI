// Painel de alertas automáticos: parados, garantia e conferência atrasada.
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { Spinner } from "../components/ui";
import { formatDate } from "../lib/format";
import { useAuth } from "../context/AuthContext";

interface AlertsData {
  settings: { idleDaysLimit: number; conferenceDaysLimit: number; warrantyWarningDays: number };
  resumo: { parados: number; garantia: number; conferencia: number };
  parados: any[];
  garantia: any[];
  conferencia: any[];
}

type Tab = "parados" | "garantia" | "conferencia";

const TABS = [
  {
    key: "parados" as Tab,
    label: "Parados",
    icon: "ti-package-off",
    accent: "#3b82f6",
    accentDim: "rgba(59,130,246,0.12)",
    gradient: "linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%)",
    badgeClass: "bg-blue-500/15 text-blue-500",
    rowAccent: "bg-blue-500/10 text-blue-500",
    glow: "shadow-blue-500/20",
  },
  {
    key: "garantia" as Tab,
    label: "Garantia",
    icon: "ti-shield-exclamation",
    accent: "#f59e0b",
    accentDim: "rgba(245,158,11,0.12)",
    gradient: "linear-gradient(135deg, #d97706 0%, #f59e0b 100%)",
    badgeClass: "bg-amber-500/15 text-amber-500",
    rowAccent: "bg-amber-500/10 text-amber-500",
    glow: "shadow-amber-500/20",
  },
  {
    key: "conferencia" as Tab,
    label: "Conferência",
    icon: "ti-clipboard-x",
    accent: "#f43f5e",
    accentDim: "rgba(244,63,94,0.12)",
    gradient: "linear-gradient(135deg, #be123c 0%, #f43f5e 100%)",
    badgeClass: "bg-rose-500/15 text-rose-500",
    rowAccent: "bg-rose-500/10 text-rose-500",
    glow: "shadow-rose-500/20",
  },
];

export default function Alerts() {
  const { user } = useAuth();
  const [data, setData] = useState<AlertsData | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("parados");
  const [search, setSearch] = useState("");
  const [subFilter, setSubFilter] = useState("all");
  const navigate = useNavigate();

  // Estados para edição de limites inline
  const [isEditingLimits, setIsEditingLimits] = useState(false);
  const [idleLimit, setIdleLimit] = useState(0);
  const [warrantyLimit, setWarrantyLimit] = useState(0);
  const [conferenceLimit, setConferenceLimit] = useState(0);
  const [savingLimits, setSavingLimits] = useState(false);

  const isAdmin = user?.role === "ADMIN";

  useEffect(() => {
    api<AlertsData>("/alerts").then((res) => {
      setData(res);
      setIdleLimit(res.settings.idleDaysLimit);
      setWarrantyLimit(res.settings.warrantyWarningDays);
      setConferenceLimit(res.settings.conferenceDaysLimit);
    });
  }, []);

  async function handleSaveLimits(e: React.FormEvent) {
    e.preventDefault();
    setSavingLimits(true);
    try {
      await api("/settings", {
        method: "PUT",
        body: {
          idleDaysLimit: idleLimit,
          warrantyWarningDays: warrantyLimit,
          conferenceDaysLimit: conferenceLimit,
        },
      });
      const freshData = await api<AlertsData>("/alerts");
      setData(freshData);
      setIsEditingLimits(false);
    } catch (err: any) {
      alert(err.message ?? "Erro ao salvar os limites.");
    } finally {
      setSavingLimits(false);
    }
  }

  if (!data) return <Spinner />;

  const totalAlertas = data.resumo.parados + data.resumo.garantia + data.resumo.conferencia;
  const activeTabData = TABS.find((t) => t.key === activeTab)!;
  const activeItems: any[] = data[activeTab];

  // Reseta os filtros secundários e busca ao mudar de aba
  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    setSubFilter("all");
    setSearch("");
  };

  const getSubFilters = () => {
    if (activeTab === "parados") {
      return [
        { label: "Todos", value: "all" },
        { label: "Críticos (≥ 120d)", value: "critical" },
        { label: "Normais (< 120d)", value: "normal" },
      ];
    } else if (activeTab === "garantia") {
      return [
        { label: "Todos", value: "all" },
        { label: "Vencidas", value: "expired" },
        { label: "A vencer", value: "expiring" },
      ];
    } else {
      return [
        { label: "Todos", value: "all" },
        { label: "Atrasadas", value: "delayed" },
        { label: "Nunca conferido", value: "never" },
      ];
    }
  };

  // Filtragem dinâmica
  let filteredItems = activeItems;

  if (search.trim()) {
    const query = search.toLowerCase();
    filteredItems = filteredItems.filter((item) => {
      return (
        item.assetId?.toLowerCase().includes(query) ||
        item.category?.toLowerCase().includes(query) ||
        (item.brand && item.brand.toLowerCase().includes(query)) ||
        (item.model && item.model.toLowerCase().includes(query)) ||
        (item.currentUserName && item.currentUserName.toLowerCase().includes(query))
      );
    });
  }

  if (subFilter !== "all") {
    if (activeTab === "parados") {
      if (subFilter === "critical") {
        filteredItems = filteredItems.filter((item) => item.dias >= 120);
      } else if (subFilter === "normal") {
        filteredItems = filteredItems.filter((item) => item.dias < 120);
      }
    } else if (activeTab === "garantia") {
      if (subFilter === "expired") {
        filteredItems = filteredItems.filter((item) => item.situacao === "vencida");
      } else if (subFilter === "expiring") {
        filteredItems = filteredItems.filter((item) => item.situacao === "vencendo");
      }
    } else if (activeTab === "conferencia") {
      if (subFilter === "delayed") {
        filteredItems = filteredItems.filter((item) => item.dias != null);
      } else if (subFilter === "never") {
        filteredItems = filteredItems.filter((item) => item.dias == null);
      }
    }
  }

  // Exportar para CSV
  const exportToCsv = () => {
    if (!filteredItems.length) return;
    let headers = "";
    let rows: any[][] = [];

    if (activeTab === "parados") {
      headers = "ID Patrimônio,Categoria,Marca,Modelo,Responsável,Dias Parado,Desde";
      rows = filteredItems.map((item) => [
        `"${item.assetId}"`,
        `"${item.category}"`,
        `"${item.brand ?? ""}"`,
        `"${item.model ?? ""}"`,
        `"${item.currentUserName ?? ""}"`,
        item.dias,
        `"${item.desde ? formatDate(item.desde) : ""}"`
      ]);
    } else if (activeTab === "garantia") {
      headers = "ID Patrimônio,Categoria,Marca,Modelo,Responsável,Situação,Dias,Data Fim";
      rows = filteredItems.map((item) => [
        `"${item.assetId}"`,
        `"${item.category}"`,
        `"${item.brand ?? ""}"`,
        `"${item.model ?? ""}"`,
        `"${item.currentUserName ?? ""}"`,
        `"${item.situacao === "vencida" ? "Vencida" : "A Vencer"}"`,
        item.dias,
        `"${item.data ? formatDate(item.data) : ""}"`
      ]);
    } else {
      headers = "ID Patrimônio,Categoria,Marca,Modelo,Responsável,Dias sem conferência,Última conferência";
      rows = filteredItems.map((item) => [
        `"${item.assetId}"`,
        `"${item.category}"`,
        `"${item.brand ?? ""}"`,
        `"${item.model ?? ""}"`,
        `"${item.currentUserName ?? ""}"`,
        item.dias == null ? "Nunca" : item.dias,
        `"${item.ultimaConferencia ? formatDate(item.ultimaConferencia) : ""}"`
      ]);
    }

    // Usar BOM (Byte Order Mark) para manter os caracteres acentuados legíveis no Excel
    const csvContent = "\uFEFF" + [headers, ...rows.map(e => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `alertas_${activeTab}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <style>{`
        @keyframes pulse-ring {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(240, 98, 95, 0.4); }
          70% { transform: scale(1); box-shadow: 0 0 0 8px rgba(240, 98, 95, 0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(240, 98, 95, 0); }
        }
        .alert-pulse { animation: pulse-ring 2s ease-in-out infinite; }
        
        @keyframes pulse-red {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(244, 63, 94, 0.4); }
          70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(244, 63, 94, 0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(244, 63, 94, 0); }
        }
        @keyframes pulse-orange {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.4); }
          70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(245, 158, 11, 0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(245, 158, 11, 0); }
        }
        .dot-critical { background-color: #f43f5e; animation: pulse-red 2s ease-in-out infinite; }
        .dot-warning { background-color: #f59e0b; animation: pulse-orange 2s ease-in-out infinite; }
        
        .tab-glow { transition: transform 0.2s, box-shadow 0.2s; }
        .tab-glow:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.12); }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
      `}</style>

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Alertas</h1>
            {totalAlertas > 0 && (
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-red-500 text-white text-xs font-bold alert-pulse">
                {totalAlertas}
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5 flex flex-wrap items-center gap-2">
            <span>Monitoramento automático ·</span>
            <span className="bg-slate-100 dark:bg-slate-800/80 border border-slate-200/40 dark:border-slate-800 px-2 py-0.5 rounded-lg text-[11px] font-semibold text-slate-600 dark:text-slate-400">parado ≥ {data.settings.idleDaysLimit}d</span>
            <span className="text-slate-300 dark:text-slate-700">·</span>
            <span className="bg-slate-100 dark:bg-slate-800/80 border border-slate-200/40 dark:border-slate-800 px-2 py-0.5 rounded-lg text-[11px] font-semibold text-slate-600 dark:text-slate-400">garantia ≤ {data.settings.warrantyWarningDays}d</span>
            <span className="text-slate-300 dark:text-slate-700">·</span>
            <span className="bg-slate-100 dark:bg-slate-800/80 border border-slate-200/40 dark:border-slate-800 px-2 py-0.5 rounded-lg text-[11px] font-semibold text-slate-600 dark:text-slate-400">conferência ≥ {data.settings.conferenceDaysLimit}d</span>
            {isAdmin && (
              <>
                <span className="text-slate-350">·</span>
                <button
                  type="button"
                  onClick={() => setIsEditingLimits(!isEditingLimits)}
                  className="text-blue-500 hover:text-blue-600 dark:hover:text-blue-400 underline font-semibold flex items-center gap-1 text-xs"
                >
                  <i className="ti ti-adjustments-horizontal text-xs"></i>
                  ajustar limites
                </button>
              </>
            )}
          </p>
        </div>

        {totalAlertas === 0 && (
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/50 dark:border-emerald-900/40 text-emerald-700 dark:text-emerald-400 text-sm font-semibold shadow-sm">
            <i className="ti ti-circle-check text-base"></i>
            Sistema saudável
          </div>
        )}
      </div>

      {/* ── Inline Limits Adjustment Panel ── */}
      {isEditingLimits && isAdmin && (
        <form
          onSubmit={handleSaveLimits}
          className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 backdrop-blur-md shadow-xl space-y-4 animate-fade-in"
        >
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3">
            <div className="flex items-center gap-2">
              <i className="ti ti-adjustments-horizontal text-blue-500 text-lg"></i>
              <span className="font-semibold text-sm text-slate-800 dark:text-white">Ajustar Limites de Alerta</span>
            </div>
            <button
              type="button"
              onClick={() => setIsEditingLimits(false)}
              className="text-slate-400 hover:text-slate-650 dark:hover:text-slate-250 transition-colors"
            >
              <i className="ti ti-x text-sm"></i>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {/* Idle Days Limit */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Parado em estoque</label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  className="input pr-12 w-full"
                  value={idleLimit}
                  onChange={(e) => setIdleLimit(parseInt(e.target.value) || 0)}
                  required
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 dark:text-slate-500">dias</span>
              </div>
            </div>

            {/* Warranty Warning Days */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Aviso de Garantia</label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  className="input pr-12 w-full"
                  value={warrantyLimit}
                  onChange={(e) => setWarrantyLimit(parseInt(e.target.value) || 0)}
                  required
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 dark:text-slate-500">dias</span>
              </div>
            </div>

            {/* Conference Days Limit */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Intervalo de Conferência</label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  className="input pr-12 w-full"
                  value={conferenceLimit}
                  onChange={(e) => setConferenceLimit(parseInt(e.target.value) || 0)}
                  required
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 dark:text-slate-500">dias</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
            <button
              type="button"
              className="btn-secondary py-2 px-4 rounded-xl text-xs font-semibold"
              onClick={() => setIsEditingLimits(false)}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-primary py-2 px-4 rounded-xl text-xs font-semibold flex items-center gap-1.5"
              disabled={savingLimits}
            >
              {savingLimits ? (
                <>
                  <i className="ti ti-loader-2 animate-spin text-sm"></i>
                  Salvando...
                </>
              ) : (
                <>
                  <i className="ti ti-device-floppy text-sm"></i>
                  Salvar Limites
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* ── KPI Summary Cards ── */}
      <div className="grid grid-cols-3 gap-4">
        {TABS.map((tab) => {
          const count = data.resumo[tab.key];
          const isActive = activeTab === tab.key;
          const hasOccurrences = count > 0;

          let cardBgClass = "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800";
          let textThemeClass = "text-slate-850 dark:text-slate-100";
          let labelCountClass = "text-slate-350 dark:text-slate-700";
          let subtextClass = "text-slate-500 dark:text-slate-400";
          let cardStyle: React.CSSProperties = {};

          if (isActive) {
            if (hasOccurrences) {
              cardBgClass = `border-transparent shadow-lg ${tab.glow}`;
              textThemeClass = "text-white";
              labelCountClass = "text-white";
              subtextClass = "text-white/75";
            } else {
              // Active but 0 occurrences: premium clean card with colored border & soft glow
              cardBgClass = "bg-slate-50 dark:bg-slate-950 shadow-sm border-2";
              cardStyle = { borderColor: tab.accent, boxShadow: `0 0 12px ${tab.accent}15` };
              textThemeClass = "text-slate-900 dark:text-white";
              labelCountClass = "text-slate-400 dark:text-slate-500";
              subtextClass = "text-slate-550 dark:text-slate-455";
            }
          }

          return (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              style={cardStyle}
              className={`relative text-left rounded-2xl border overflow-hidden transition-all duration-200 tab-glow ${cardBgClass}`}
            >
              {/* Background gradient when active and has occurrences */}
              {isActive && hasOccurrences && (
                <div
                  className="absolute inset-0"
                  style={{ background: tab.gradient, opacity: 1 }}
                />
              )}

              <div className={`relative p-5`}>
                <div className="flex items-start justify-between mb-4">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={isActive && hasOccurrences ? { background: "rgba(255,255,255,0.2)" } : { background: tab.accentDim }}
                  >
                    <i
                      className={`ti ${tab.icon} text-lg`}
                      style={isActive && hasOccurrences ? { color: "white" } : { color: tab.accent }}
                    ></i>
                  </div>

                  <span
                    className={`text-4xl font-bold leading-none ${
                      isActive && hasOccurrences ? "text-white" : count > 0 ? "" : labelCountClass
                    }`}
                    style={!(isActive && hasOccurrences) && count > 0 ? { color: tab.accent } : {}}
                  >
                    {count}
                  </span>
                </div>

                <div className={`font-semibold text-sm ${textThemeClass}`}>
                  {tab.label}
                </div>
                <div className={`text-xs mt-0.5 ${subtextClass}`}>
                  {count === 0
                    ? "Sem ocorrências"
                    : `${count} equipamento${count !== 1 ? "s" : ""}`}
                </div>

                {isActive && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: tab.accent }} />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Detail panel ── */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
        {/* Panel header */}
        <div
          className={`px-6 py-4 flex items-center justify-between ${
            activeItems.length === 0
              ? "bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800/70"
              : ""
          }`}
          style={activeItems.length > 0 ? { background: activeTabData.gradient } : {}}
        >
          <div className="flex items-center gap-3">
            <i className={`ti ${activeTabData.icon} ${activeItems.length === 0 ? "text-slate-400 dark:text-slate-500" : "text-white"} text-xl`}></i>
            <div>
              <div className={`font-semibold text-sm ${activeItems.length === 0 ? "text-slate-800 dark:text-white" : "text-white"}`}>
                {activeTabData.label === "Parados"
                  ? "Equipamentos parados em estoque"
                  : activeTabData.label === "Garantia"
                  ? "Garantias vencidas ou a vencer"
                  : "Conferências atrasadas"}
              </div>
              <div className={`${activeItems.length === 0 ? "text-slate-500 dark:text-slate-400" : "text-white/70"} text-xs mt-0.5`}>
                {activeItems.length > 0
                  ? `${activeItems.length} ocorrência${activeItems.length !== 1 ? "s" : ""} encontrada${activeItems.length !== 1 ? "s" : ""}`
                  : "Nenhuma ocorrência ativa"}
              </div>
            </div>
          </div>
          <span
            className={`text-sm font-bold px-4 py-1.5 rounded-full ${
              activeItems.length === 0
                ? "bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400 border border-slate-200/60 dark:border-slate-800"
                : "bg-white/25 backdrop-blur text-white"
            }`}
          >
            {activeItems.length}
          </span>
        </div>

        {/* Dynamic Toolbar (Search & Sub filters & CSV Export) */}
        {activeItems.length > 0 && (
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800/60">
            <div className="relative flex-1 max-w-md">
              <i className="ti ti-search absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 text-base" />
              <input
                type="text"
                placeholder={`Buscar nesta aba por patrimônio, marca, modelo...`}
                className="input pl-10 w-full"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <i className="ti ti-x text-sm" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Sub filters */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                {getSubFilters().map((f) => (
                  <button
                    key={f.value}
                    onClick={() => setSubFilter(f.value)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      subFilter === f.value
                        ? "bg-white dark:bg-slate-900 shadow-sm text-slate-900 dark:text-white"
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-850 dark:hover:text-slate-200"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Export button */}
              <button
                onClick={exportToCsv}
                disabled={!filteredItems.length}
                className="btn-secondary flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl"
              >
                <i className="ti ti-download text-sm" />
                Exportar CSV
              </button>
            </div>
          </div>
        )}

        {/* Empty state */}
        {filteredItems.length === 0 ? (
          <div className="p-8 md:p-12 flex flex-col items-center justify-center text-center">
            {activeItems.length === 0 ? (
              <div className="max-w-md w-full space-y-6 animate-fade-in">
                {/* Visual Circle Check Illustration */}
                <div className="flex justify-center">
                  <div className="relative">
                    <div className="w-20 h-20 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100/60 dark:border-emerald-900/30 flex items-center justify-center shadow-lg shadow-emerald-500/5">
                      <i className="ti ti-shield-check text-emerald-500 text-4xl"></i>
                    </div>
                    <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white text-xs border border-white dark:border-slate-900 shadow-md">
                      <i className="ti ti-check text-[10px] font-bold"></i>
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-base font-bold text-slate-800 dark:text-white">
                    Nenhum alerta pendente
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
                    A categoria <span className="font-semibold text-slate-700 dark:text-slate-200">{activeTabData.label}</span> está em conformidade com as regras estabelecidas para a unidade.
                  </p>
                </div>

                {/* Checklist Rules Overview */}
                <div className="text-left rounded-2xl bg-slate-50/50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800/60 p-4 space-y-3.5">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Regra de Monitoramento Ativa:
                  </div>

                  {activeTab === "parados" && (
                    <div className="flex gap-3">
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                        <i className="ti ti-check text-xs font-bold" />
                      </div>
                      <div className="text-xs">
                        <span className="font-semibold text-slate-850 dark:text-white block">Equipamentos em Estoque</span>
                        <span className="text-slate-500 dark:text-slate-400 text-[11px] block mt-0.5 leading-relaxed">
                          Nenhum ativo parado sem movimentação há mais de <span className="font-bold text-slate-700 dark:text-slate-300">{data.settings.idleDaysLimit} dias</span>.
                        </span>
                      </div>
                    </div>
                  )}

                  {activeTab === "garantia" && (
                    <div className="flex gap-3">
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                        <i className="ti ti-check text-xs font-bold" />
                      </div>
                      <div className="text-xs">
                        <span className="font-semibold text-slate-850 dark:text-white block">Prazo de Garantia</span>
                        <span className="text-slate-500 dark:text-slate-400 text-[11px] block mt-0.5 leading-relaxed">
                          Nenhum equipamento próprio com garantia vencendo nos próximos <span className="font-bold text-slate-700 dark:text-slate-300">{data.settings.warrantyWarningDays} dias</span>.
                        </span>
                      </div>
                    </div>
                  )}

                  {activeTab === "conferencia" && (
                    <div className="flex gap-3">
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                        <i className="ti ti-check text-xs font-bold" />
                      </div>
                      <div className="text-xs">
                        <span className="font-semibold text-slate-850 dark:text-white block">Conferência de Ativos</span>
                        <span className="text-slate-500 dark:text-slate-400 text-[11px] block mt-0.5 leading-relaxed">
                          Todos os equipamentos foram inspecionados no intervalo de <span className="font-bold text-slate-700 dark:text-slate-300">{data.settings.conferenceDaysLimit} dias</span>.
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              // Empty search/subfilter results
              <div className="max-w-md w-full space-y-4 animate-fade-in">
                <div className="flex justify-center">
                  <div className="w-16 h-16 rounded-full bg-slate-50 dark:bg-slate-900 border border-slate-205 dark:border-slate-795 flex items-center justify-center">
                    <i className="ti ti-search text-slate-400 dark:text-slate-500 text-2xl"></i>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <p className="font-semibold text-slate-800 dark:text-white">Nenhum resultado encontrado</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Experimente ajustar os filtros ou a busca para encontrar o que procura.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setSearch("");
                    setSubFilter("all");
                  }}
                  className="btn-secondary py-1.5 px-4 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5"
                >
                  <i className="ti ti-refresh text-xs"></i>
                  Limpar Filtros
                </button>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Column headers */}
            <div className="grid grid-cols-[1fr_auto] px-6 py-2.5 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Equipamento
              </span>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 text-right">
                {activeTab === "parados" ? "Tempo parado" : activeTab === "garantia" ? "Situação" : "Última conferência"}
              </span>
            </div>

            {/* Rows */}
            <div className="divide-y divide-slate-100 dark:divide-slate-800/70">
              {activeTab === "parados" &&
                filteredItems.map((item, idx) => {
                  const isCritical = item.dias >= 120;
                  return (
                    <AlertItem
                      key={item.id}
                      item={item}
                      index={idx}
                      isCritical={isCritical}
                      accent={activeTabData.accent}
                      accentDim={activeTabData.accentDim}
                      onNavigate={() => navigate(`/equipamento/${item.id}`)}
                      badge={
                        <div className="flex flex-col items-end gap-1">
                          <span
                            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full animate-fade-in"
                            style={{ background: activeTabData.accentDim, color: activeTabData.accent }}
                          >
                            <i className="ti ti-clock text-[11px]"></i>
                            {item.dias} dias
                          </span>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500">sem movimentação</span>
                        </div>
                      }
                    />
                  );
                })}

              {activeTab === "garantia" &&
                filteredItems.map((item, idx) => {
                  const isCritical = item.situacao === "vencida";
                  return (
                    <AlertItem
                      key={item.id}
                      item={item}
                      index={idx}
                      isCritical={isCritical}
                      accent={isCritical ? "#f43f5e" : "#f59e0b"}
                      accentDim={isCritical ? "rgba(244,63,94,0.12)" : "rgba(245,158,11,0.12)"}
                      onNavigate={() => navigate(`/equipamento/${item.id}`)}
                      badge={
                        <div className="flex flex-col items-end gap-1">
                          <span
                            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full animate-fade-in"
                            style={{
                              background: isCritical ? "rgba(244,63,94,0.12)" : "rgba(245,158,11,0.12)",
                              color: isCritical ? "#f43f5e" : "#d97706",
                            }}
                          >
                            <i className={`ti ${isCritical ? "ti-alert-triangle" : "ti-clock"} text-[11px]`}></i>
                            {isCritical ? `vencida há ${item.dias}d` : `vence em ${item.dias}d`}
                          </span>
                          {item.data && (
                            <span className="text-[10px] text-slate-400 dark:text-slate-500">{formatDate(item.data)}</span>
                          )}
                        </div>
                      }
                    />
                  );
                })}

              {activeTab === "conferencia" &&
                filteredItems.map((item, idx) => {
                  const isCritical = item.dias == null;
                  return (
                    <AlertItem
                      key={item.id}
                      item={item}
                      index={idx}
                      isCritical={isCritical}
                      accent={isCritical ? "#f43f5e" : activeTabData.accent}
                      accentDim={isCritical ? "rgba(244,63,94,0.12)" : activeTabData.accentDim}
                      onNavigate={() => navigate(`/equipamento/${item.id}`)}
                      badge={
                        <div className="flex flex-col items-end gap-1">
                          <span
                            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full animate-fade-in"
                            style={{
                              background: isCritical ? "rgba(244,63,94,0.12)" : activeTabData.accentDim,
                              color: isCritical ? "#f43f5e" : activeTabData.accent,
                            }}
                          >
                            <i className={`ti ${isCritical ? "ti-alert-triangle" : "ti-calendar-x"} text-[11px]`}></i>
                            {item.dias == null ? "nunca conferido" : `${item.dias} dias`}
                          </span>
                          {item.ultimaConferencia && (
                            <span className="text-[10px] text-slate-400 dark:text-slate-500">
                              {formatDate(item.ultimaConferencia)}
                            </span>
                          )}
                        </div>
                      }
                    />
                  );
                })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

interface AlertItemProps {
  item: any;
  index: number;
  isCritical: boolean;
  accent: string;
  accentDim: string;
  badge: React.ReactNode;
  onNavigate: () => void;
}

function AlertItem({
  item,
  index,
  isCritical,
  accent,
  accentDim,
  badge,
  onNavigate,
}: AlertItemProps) {
  return (
    <div
      onClick={onNavigate}
      className={`flex items-center gap-4 px-6 py-4 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 cursor-pointer transition-all duration-200 border-l-4 group animate-fade-in ${
        isCritical ? "border-l-rose-500 hover:border-l-rose-600" : "border-l-amber-500 hover:border-l-amber-600"
      }`}
    >
      {/* Rank number */}
      <span className="text-xs font-mono text-slate-300 dark:text-slate-600 w-5 shrink-0 text-right">
        {String(index + 1).padStart(2, "0")}
      </span>

      {/* Pulsing indicator dot */}
      <div className="w-5 flex items-center justify-center shrink-0">
        <div className={`w-2.5 h-2.5 rounded-full ${isCritical ? "dot-critical" : "dot-warning"}`} />
      </div>

      {/* Icon */}
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all duration-200 group-hover:scale-110 group-hover:rotate-3"
        style={{ background: accentDim }}
      >
        <i className="ti ti-device-laptop text-sm" style={{ color: accent }}></i>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div
          className="font-semibold text-sm transition-colors group-hover:text-blue-500 dark:group-hover:text-blue-400"
          style={{ color: accent }}
        >
          {item.assetId}
        </div>
        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate flex items-center gap-2">
          {item.category && (
            <span className="font-medium text-slate-600 dark:text-slate-300">{item.category}</span>
          )}
          {item.brand && (
            <>
              <span className="text-slate-300 dark:text-slate-700">·</span>
              <span className="flex items-center gap-1">
                <i className="ti ti-tag text-[10px] text-slate-400" />
                {item.brand}
              </span>
            </>
          )}
          {item.model && (
            <>
              <span className="text-slate-300 dark:text-slate-700">·</span>
              <span className="flex items-center gap-1">
                <i className="ti ti-cpu text-[10px] text-slate-400" />
                {item.model}
              </span>
            </>
          )}
          {item.currentUserName && (
            <>
              <span className="text-slate-300 dark:text-slate-700">·</span>
              <span className="flex items-center gap-1">
                <i className="ti ti-user text-[10px] text-slate-400" />
                {item.currentUserName}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Badge */}
      <div className="shrink-0">{badge}</div>

      {/* Arrow */}
      <i className="ti ti-arrow-right text-slate-300 dark:text-slate-600 group-hover:translate-x-1.5 transition-transform text-sm"></i>
    </div>
  );
}
