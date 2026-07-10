// Painel (dashboard): visão geral do inventário — totais por status, propriedade
// (próprios x alugados), parados, e quebra por categoria/tipo.
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { Spinner } from "../components/ui";
import { useAuth } from "../context/AuthContext";

interface DashboardData {
  settings: { idleDaysLimit: number };
  totals: {
    total: number;
    emUso: number;
    emEstoque: number;
    emManutencao: number;
    descartado: number;
    parados: number;
    proprios: number;
    alugados: number;
    semPropriedade: number;
  };
  porCategoria: {
    categoria: string;
    total: number;
    emUso: number;
    emEstoque: number;
    emManutencao: number;
    descartado: number;
    parados: number;
  }[];
}

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const isMountedRef = useRef(true);
  const navigate = useNavigate();

  const loadDashboard = async () => {
    setIsRefreshing(true);

    try {
      const result = await api<DashboardData>("/dashboard");
      if (!isMountedRef.current) return;
      setData(result);
      setLastUpdated(new Date());
    } catch {
      if (!isMountedRef.current) return;
      setData(null);
    } finally {
      if (!isMountedRef.current) return;
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    isMountedRef.current = true;
    loadDashboard();
    const interval = window.setInterval(loadDashboard, 30000);

    return () => {
      isMountedRef.current = false;
      window.clearInterval(interval);
    };
  }, []);

  if (!data) return <Spinner />;
  const t = data.totals;

  const totalOwn = t.proprios + t.alugados + t.semPropriedade;

  const tipos = data.porCategoria
    .filter((c) => c.total > 0)
    .map((c) => ({ nome: c.categoria, quantidade: c.total }))
    .sort((a, b) => b.quantidade - a.quantidade);

  const maxTipos = tipos.length > 0 ? Math.max(...tipos.map((t) => t.quantidade)) : 0;

  return (
    <div id="pn-panel">
      <style>{`
        #pn-panel {
          --pn-bg: #ffffff;
          --pn-surface: #f8fafc;
          --pn-border: #e2e8f0;
          --pn-text: #475569;
          --pn-text-strong: #0f172a;
          --pn-text-secondary: #64748b;
          --pn-blue: #3b82f6;
          --pn-green: #10b981;
          --pn-amber: #f59e0b;
          --pn-red: #ef4444;
          --pn-teal: #14b8a6;
          --pn-neutral-icon: #64748b;
          --pn-slate: #94a3b8;
          --pn-font: 'Inter', sans-serif;
        }

        .dark #pn-panel {
          --pn-bg: #0b1220;
          --pn-surface: #141b2c;
          --pn-border: #232e45;
          --pn-text: #e8ecf4;
          --pn-text-strong: #f4f6fa;
          --pn-text-secondary: #8d96ac;
          --pn-blue: #4f8ef7;
          --pn-green: #34c77b;
          --pn-amber: #f2a93b;
          --pn-red: #f0625f;
          --pn-teal: #3bc5b9;
          --pn-neutral-icon: #9aa5c0;
          --pn-slate: #4c5677;
        }

        #pn-panel {
          font-family: var(--pn-font);
          background: var(--pn-bg);
          border: 1px solid var(--pn-border);
          border-radius: 24px;
          padding: 28px;
          transition: background-color 0.2s, border-color 0.2s;
        }

        .pn-hero {
          display: grid;
          gap: 22px;
          margin-bottom: 28px;
          padding: 28px;
          border-radius: 26px;
          background: linear-gradient(180deg, rgba(59, 130, 246, 0.08), rgba(255, 255, 255, 0.9));
          border: 1px solid rgba(59, 130, 246, 0.16);
          box-shadow: 0 30px 60px rgba(15, 23, 42, 0.08);
        }

        .dark #pn-panel .pn-hero {
          background: linear-gradient(180deg, rgba(79, 70, 229, 0.12), rgba(15, 23, 42, 0.95));
          border-color: rgba(79, 70, 229, 0.24);
        }

        .pn-header {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 18px;
          align-items: center;
        }

        .pn-header-left {
          display: grid;
          gap: 8px;
        }

        .pn-title {
          font-size: 1.65rem;
          font-weight: 800;
          color: var(--pn-text-strong);
          letter-spacing: -0.03em;
          margin-bottom: 0;
        }

        .pn-subtitle {
          font-size: 1rem;
          color: var(--pn-text-secondary);
          max-width: 52rem;
          line-height: 1.6;
        }

        .pn-live-row {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .pn-auto-refresh {
          font-size: 0.92rem;
          color: var(--pn-text-secondary);
          background: rgba(59, 130, 246, 0.08);
          border: 1px solid rgba(59, 130, 246, 0.16);
          border-radius: 16px;
          padding: 10px 14px;
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }

        .pn-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          border-radius: 999px;
          padding: 10px 14px;
          background: rgba(59, 130, 246, 0.1);
          color: var(--pn-blue);
          font-size: 0.9rem;
          font-weight: 700;
        }

        .pn-badge-live {
          background: rgba(34, 197, 94, 0.12);
          color: var(--pn-green);
        }

        .pn-badge-dot {
          width: 10px;
          height: 10px;
          border-radius: 999px;
          background: currentColor;
          box-shadow: 0 0 0 6px rgba(34, 197, 94, 0.12);
        }

        .pn-last-updated {
          font-size: 0.95rem;
          color: var(--pn-text-secondary);
          min-width: 210px;
        }

        .pn-actions-top {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        .pn-highlights {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 16px;
          margin-bottom: 22px;
        }

        .pn-mini-card {
          background: var(--pn-surface);
          border: 1px solid var(--pn-border);
          border-radius: 20px;
          padding: 18px 20px;
          box-shadow: 0 16px 30px rgba(15, 23, 42, 0.06);
          transition: transform 0.2s ease, border-color 0.2s ease;
        }

        .pn-mini-card:hover {
          transform: translateY(-2px);
          border-color: rgba(59, 130, 246, 0.22);
        }

        .pn-mini-label {
          font-size: 0.85rem;
          color: var(--pn-text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin-bottom: 6px;
        }

        .pn-mini-value {
          font-size: 1.55rem;
          font-weight: 800;
          color: var(--pn-text-strong);
          line-height: 1.05;
        }

        .pn-mini-note {
          margin-top: 10px;
          font-size: 0.92rem;
          color: var(--pn-text-secondary);
        }

        .pn-mini-card.accent {
          background: linear-gradient(180deg, rgba(248, 113, 113, 0.12), rgba(248, 113, 113, 0.05));
          border-color: rgba(248, 113, 113, 0.24);
        }

        .pn-hero-note {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 0.92rem;
          color: var(--pn-text-secondary);
          flex-wrap: wrap;
        }

        .pn-hero-note i {
          font-size: 18px;
        }

        .pn-btn[disabled] {
          cursor: default;
          opacity: 0.65;
        }

        .pn-btn {
          border: none;
          border-radius: 999px;
          padding: 0.85rem 1.2rem;
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          transition: transform 0.2s ease, background-color 0.2s ease;
        }

        .pn-btn:hover {
          transform: translateY(-1px);
        }

        .pn-btn-primary {
          background: var(--pn-blue);
          color: #fff;
        }

        .pn-btn-secondary {
          background: transparent;
          border: 1px solid var(--pn-border);
          color: var(--pn-text-strong);
        }

        .pn-grid {
          display: grid;
          gap: 18px;
        }

        .pn-kpi-grid {
          grid-template-columns: repeat(4, minmax(0, 1fr));
        }

        .pn-panel-grid {
          grid-template-columns: 1.4fr 1fr;
        }

        @media (max-width: 950px) {
          .pn-kpi-grid,
          .pn-panel-grid {
            grid-template-columns: 1fr;
          }
        }

        .pn-card {
          background: var(--pn-surface);
          border: 1px solid var(--pn-border);
          border-radius: 22px;
          padding: 24px;
          box-shadow: 0 18px 40px rgba(15, 23, 42, 0.04);
        }

        .pn-stat-card {
          display: grid;
          grid-template-columns: auto 1fr;
          gap: 16px;
          align-items: center;
        }

        .pn-stat-badge {
          width: 48px;
          height: 48px;
          border-radius: 16px;
          display: grid;
          place-items: center;
          color: #fff;
        }

        .pn-stat-details {
          display: grid;
          gap: 4px;
        }

        .pn-stat-value {
          font-size: 1.85rem;
          font-weight: 700;
          color: var(--pn-text-strong);
          line-height: 1;
        }

        .pn-stat-label {
          font-size: 0.94rem;
          color: var(--pn-text-secondary);
        }

        .pn-summary {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          flex-wrap: wrap;
        }

        .pn-summary-card {
          flex: 1 1 220px;
          min-width: 240px;
        }

        .pn-card-title {
          font-size: 0.95rem;
          font-weight: 700;
          margin-bottom: 18px;
          color: var(--pn-text-strong);
        }

        .pn-ownership-card {
          padding: 28px;
        }

        .pn-ownership-title {
          font-size: 1rem;
          font-weight: 700;
          color: var(--pn-text-strong);
          margin-bottom: 20px;
        }

        .pn-ownership-bar {
          height: 14px;
          border-radius: 999px;
          overflow: hidden;
          background: rgba(148, 163, 184, 0.18);
          display: flex;
          box-shadow: inset 0 1px 2px rgba(15, 23, 42, 0.18);
          margin-bottom: 20px;
        }

        .pn-ownership-bar span {
          border-radius: 999px;
          transition: width 0.35s ease;
        }

        .pn-legend {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 18px;
          margin-top: 12px;
        }

        .pn-legend-item {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 0.95rem;
          color: var(--pn-text-secondary);
          line-height: 1.4;
        }

        .pn-legend-dot {
          width: 10px;
          height: 10px;
          border-radius: 999px;
          flex-shrink: 0;
        }

        .pn-alert-card {
          display: grid;
          gap: 22px;
          background: linear-gradient(180deg, rgba(248, 113, 113, 0.18), rgba(248, 113, 113, 0.08));
          border-color: rgba(248, 113, 113, 0.3);
          box-shadow: 0 24px 48px rgba(248, 113, 113, 0.08);
          padding: 28px;
        }

        .pn-alert-card.pn-alert-quiet {
          background: var(--pn-surface);
          border-color: var(--pn-border);
          box-shadow: 0 18px 40px rgba(15, 23, 42, 0.04);
        }

        .pn-alert-top {
          display: flex;
          align-items: center;
          gap: 20px;
        }

        .pn-alert-icon {
          width: 56px;
          height: 56px;
          border-radius: 18px;
          display: grid;
          place-items: center;
          background: rgba(248, 113, 113, 0.18);
          color: var(--pn-red);
          flex-shrink: 0;
        }

        .pn-alert-value {
          font-size: 3rem;
          font-weight: 800;
          color: var(--pn-text-strong);
          line-height: 1;
        }

        .pn-alert-label {
          font-size: 1rem;
          color: var(--pn-text-strong);
          font-weight: 700;
        }

        .pn-alert-sub {
          font-size: 0.95rem;
          color: var(--pn-text-secondary);
          line-height: 1.7;
          max-width: 42rem;
        }

        .pn-type-card {
          padding: 24px;
        }

        .pn-type-title {
          margin-bottom: 20px;
          font-size: 1rem;
          font-weight: 700;
          color: var(--pn-text-strong);
        }

        .pn-type-list {
          display: grid;
          gap: 14px;
        }

        .pn-type-row {
          display: grid;
          grid-template-columns: minmax(120px, 1fr) 1.6fr auto;
          gap: 14px;
          align-items: center;
        }

        .pn-type-row-label {
          font-size: 0.95rem;
          color: var(--pn-text-strong);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .pn-type-bar-track {
          height: 10px;
          border-radius: 999px;
          background: rgba(226, 232, 240, 0.85);
          overflow: hidden;
        }

        .pn-type-bar-fill {
          height: 100%;
          background: var(--pn-blue);
          border-radius: 999px;
        }

        .pn-type-row-count {
          font-size: 0.9rem;
          color: var(--pn-text-secondary);
          text-align: right;
          white-space: nowrap;
        }

        .pn-empty {
          display: grid;
          place-items: center;
          gap: 12px;
          padding: 32px 0;
          text-align: center;
          color: var(--pn-text-secondary);
        }

        .pn-empty-icon {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: rgba(79, 142, 247, 0.16);
          display: grid;
          place-items: center;
        }

        .pn-empty-title {
          font-size: 1rem;
          font-weight: 600;
          color: var(--pn-text-strong);
        }
      `}</style>

      <div className="pn-hero">
        <div className="pn-header">
          <div className="pn-header-left">
            <div>
              <div className="pn-title">Painel {user?.unitName && <span style={{ fontWeight: 400, opacity: 0.75 }}>— {user.unitName}</span>}</div>
              <div className="pn-subtitle">Rápida visão geral dos equipamentos, alertas e distribuição por tipo de ativo.</div>
            </div>
            <div className="pn-live-row">
              <span className={`pn-badge ${isRefreshing ? "pn-badge-live" : ""}`}>
                <span className="pn-badge-dot" />
                {isRefreshing ? "Atualizando agora" : "Dados em tempo real"}
              </span>
              <span className="pn-last-updated">
                Última atualização: {lastUpdated ? lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "carregando..."}
              </span>
            </div>
          </div>

          <div className="pn-actions-top">
            <button
              type="button"
              onClick={loadDashboard}
              className="pn-btn pn-btn-secondary"
              disabled={isRefreshing}
            >
              <i className="ti ti-refresh" style={{ fontSize: 16 }} />
              {isRefreshing ? "Atualizando..." : "Atualizar"}
            </button>
            <button type="button" onClick={() => navigate("/inventario")} className="pn-btn pn-btn-primary">
              <i className="ti ti-list-details" style={{ fontSize: 16 }} /> Inventário
            </button>
            <button type="button" onClick={() => navigate("/alertas")} className="pn-btn pn-btn-secondary">
              <i className="ti ti-bell" style={{ fontSize: 16 }} /> Alertas{t.parados > 0 ? ` (${t.parados})` : ""}
            </button>
          </div>
        </div>

        <div className="pn-hero-note">
          <i className="ti ti-info-circle" />
          O painel atualiza automaticamente a cada 30 segundos. Use o botão atualizar para forçar a recarga imediata.
        </div>

        <div className="pn-highlights">
          <div className="pn-mini-card">
            <div className="pn-mini-label">Total de ativos</div>
            <div className="pn-mini-value">{t.total}</div>
            <div className="pn-mini-note">Visão geral consolidada do inventário.</div>
          </div>
          <div className="pn-mini-card accent">
            <div className="pn-mini-label">Equipamentos parados</div>
            <div className="pn-mini-value">{t.parados}</div>
            <div className="pn-mini-note">Limite de inatividade: {data.settings.idleDaysLimit} dias.</div>
          </div>
          <div className="pn-mini-card">
            <div className="pn-mini-label">Atualizado</div>
            <div className="pn-mini-value">{lastUpdated ? lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "..."}</div>
            <div className="pn-mini-note">Atualização automática a cada 30 segundos.</div>
          </div>
        </div>
      </div>

      <div className="pn-grid pn-kpi-grid">
        <div className="pn-card pn-stat-card">
          <div className="pn-stat-badge" style={{ background: "var(--pn-blue)" }}>
            <i className="ti ti-stack-2" style={{ fontSize: 18 }} />
          </div>
          <div className="pn-stat-details">
            <div className="pn-stat-value">{t.total}</div>
            <div className="pn-stat-label">Total de ativos</div>
          </div>
        </div>

        <div className="pn-card pn-stat-card">
          <div className="pn-stat-badge" style={{ background: "var(--pn-green)" }}>
            <i className="ti ti-circle-check" style={{ fontSize: 18 }} />
          </div>
          <div className="pn-stat-details">
            <div className="pn-stat-value">{t.emUso}</div>
            <div className="pn-stat-label">Em uso</div>
          </div>
        </div>

        <div className="pn-card pn-stat-card">
          <div className="pn-stat-badge" style={{ background: "var(--pn-amber)" }}>
            <i className="ti ti-package" style={{ fontSize: 18 }} />
          </div>
          <div className="pn-stat-details">
            <div className="pn-stat-value">{t.emEstoque}</div>
            <div className="pn-stat-label">Em estoque</div>
          </div>
        </div>

        <div className="pn-card pn-stat-card">
          <div className="pn-stat-badge" style={{ background: "var(--pn-red)" }}>
            <i className="ti ti-tool" style={{ fontSize: 18 }} />
          </div>
          <div className="pn-stat-details">
            <div className="pn-stat-value">{t.emManutencao}</div>
            <div className="pn-stat-label">Em manutenção</div>
          </div>
        </div>
      </div>

      <div className="pn-grid pn-panel-grid" style={{ marginTop: 18 }}>
        <div className="pn-card pn-ownership-card">
          <div className="pn-ownership-title">Propriedade dos equipamentos</div>
          <div className="pn-ownership-bar">
            {totalOwn > 0 && (
              <>
                {t.proprios > 0 && (
                  <span style={{ width: `${(t.proprios / totalOwn) * 100}%`, background: "var(--pn-blue)" }} />
                )}
                {t.alugados > 0 && (
                  <span style={{ width: `${(t.alugados / totalOwn) * 100}%`, background: "var(--pn-teal)" }} />
                )}
                {t.semPropriedade > 0 && (
                  <span style={{ width: `${(t.semPropriedade / totalOwn) * 100}%`, background: "var(--pn-slate)" }} />
                )}
              </>
            )}
          </div>
          <div className="pn-legend">
            <div className="pn-legend-item">
              <span className="pn-legend-dot" style={{ background: "var(--pn-blue)" }} />
              <span>Próprios · {t.proprios}</span>
            </div>
            <div className="pn-legend-item">
              <span className="pn-legend-dot" style={{ background: "var(--pn-teal)" }} />
              <span>Alugados · {t.alugados}</span>
            </div>
            <div className="pn-legend-item">
              <span className="pn-legend-dot" style={{ background: "var(--pn-slate)" }} />
              <span>Sem definida · {t.semPropriedade}</span>
            </div>
          </div>
        </div>

        <div className={`pn-card pn-alert-card ${t.parados === 0 ? "pn-alert-quiet" : ""}`}>
          <div className="pn-card-title">Alerta de inativos</div>
          <div className="pn-alert-top">
            <div className="pn-alert-icon">
              <i className="ti ti-alert-triangle" style={{ fontSize: 20 }} />
            </div>
            <div>
              <div className="pn-alert-value">{t.parados}</div>
              <div className="pn-alert-label">Parados em estoque</div>
            </div>
          </div>
          <div className="pn-alert-sub">
            {t.parados > 0
              ? `Existem ${t.parados} equipamentos parados por mais de ${data.settings.idleDaysLimit} dias.`
              : "Nenhum equipamento está sem movimentação longa."}
          </div>
        </div>
      </div>

      <div className="pn-card pn-type-card" style={{ marginTop: 18 }}>
        <div className="pn-type-title">Equipamentos por tipo</div>
        {tipos.length === 0 ? (
          <div className="pn-empty">
            <div className="pn-empty-icon">
              <i className="ti ti-chart-bar" style={{ fontSize: 20, color: "var(--pn-blue)" }} />
            </div>
            <div className="pn-empty-title">Sem dados de tipo</div>
            <div>Os dados de distribuição aparecerão quando houver equipamentos cadastrados.</div>
          </div>
        ) : (
          <div className="pn-type-list">
            {tipos.map((type) => (
              <div key={type.nome} className="pn-type-row">
                <span className="pn-type-row-label">{type.nome}</span>
                <div className="pn-type-bar-track">
                  <div className="pn-type-bar-fill" style={{ width: `${(type.quantidade / maxTipos) * 100}%` }} />
                </div>
                <span className="pn-type-row-count">{type.quantidade}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
