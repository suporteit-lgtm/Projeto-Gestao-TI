import { ReactNode, useState, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import ThemeToggle from "./ThemeToggle";
import { api } from "../api/client";

interface UnitOption {
  id: string;
  name: string;
}

// Itens do menu com seus respectivos ícones (inline SVGs compactos)
const navItems = [
  {
    to: "/",
    label: "Painel",
    end: true,
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
      </svg>
    ),
  },
  {
    to: "/inventario",
    label: "Inventário",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 20.25h12m-7.5-3v3m3-3v3m-10.125-3h17.25c.621 0 1.125-.504 1.125-1.125V4.875c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125Z" />
      </svg>
    ),
  },
  {
    to: "/alertas",
    label: "Alertas",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
      </svg>
    ),
  },
  {
    to: "/importar",
    label: "Importar",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
      </svg>
    ),
  },
  {
    to: "/configuracoes",
    label: "Configurações",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.43l-1.003.828c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 0 1-.22.128c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.43l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 0 1 0-.255c.007-.378-.138-.75-.43-.991l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
      </svg>
    ),
  },
];

export default function Layout({ children }: { children: ReactNode }) {
  const { user, logout, switchUnit } = useAuth();
  const navigate = useNavigate();
  const [units, setUnits] = useState<UnitOption[]>([]);
  const [isUnitDropdownOpen, setIsUnitDropdownOpen] = useState(false);

  // Carrega as unidades ao montar (apenas se for administrador)
  useEffect(() => {
    if (user?.role === "ADMIN") {
      api<UnitOption[]>("/auth/units")
        .then(setUnits)
        .catch(console.error);
    }
  }, [user]);

  async function handleUnitChange(newUnitId: string) {
    try {
      await switchUnit(newUnitId);
      if (window.location.pathname.startsWith("/equipamento/")) {
        window.location.href = "/inventario";
      } else {
        window.location.reload();
      }
    } catch (err: any) {
      alert(err.message ?? "Não foi possível alternar de unidade.");
    }
  }

  const getInitials = (name?: string) => {
    if (!name) return "U";
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Estado para controlar a lateral minimizada
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem("sidebar-collapsed") === "true";
  });

  const toggleSidebar = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("sidebar-collapsed", String(next));
      return next;
    });
  };

  function handleLogout() {
    logout();
    navigate("/");
  }

  // Estilo do link do menu lateral (compacto: text-xs e paddings reduzidos)
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center rounded-lg border-l-4 ${
      isCollapsed ? "justify-center px-2 py-3" : "px-3 py-2.5"
    } text-sm font-medium transition-all duration-200 ${
      isActive
        ? "border-verde bg-marca/10 text-marca dark:bg-white/10 dark:text-white font-semibold"
        : "border-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white"
    }`;

  const renderLink = (item: { to: string; label: string; icon: ReactNode; end?: boolean }) => (
    <NavLink
      key={item.to}
      to={item.to}
      end={item.end}
      className={linkClass}
      title={isCollapsed ? item.label : undefined}
    >
      <span className="shrink-0">{item.icon}</span>
      {!isCollapsed && <span className="ml-2.5 truncate">{item.label}</span>}
    </NavLink>
  );

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 transition-colors duration-200">
      {/* Menu lateral compacto */}
      <aside
        className={`relative shrink-0 bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-300 flex flex-col transition-[width] duration-300 ease-in-out border-r border-slate-200 dark:border-slate-900 h-screen sticky top-0 ${
          isCollapsed ? "w-16" : "w-52"
        }`}
      >
        {/* Botão de minimizar/expandir flutuante na borda lateral (apenas seta) */}
        <button
          onClick={toggleSidebar}
          className="absolute -right-3.5 top-6 z-40 flex items-center justify-center w-7 h-7 rounded-full bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-white text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 shadow-md transition-all duration-200 active:scale-95 cursor-pointer"
          aria-label="Minimizar menu lateral"
          title={isCollapsed ? "Expandir menu lateral" : "Minimizar menu lateral"}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={3}
            stroke="currentColor"
            className={`w-3.5 h-3.5 transition-transform duration-300 ${isCollapsed ? "rotate-180" : ""}`}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>

        {/* Logo area */}
        <div className={`px-4 py-3.5 border-b border-slate-100 dark:border-slate-900 flex flex-col ${isCollapsed ? "items-center" : "items-start"}`}>
          <img
            src="/logo.png"
            alt="Logo"
            className={`w-auto object-contain transition-all duration-300 ${isCollapsed ? "h-9" : "h-12"}`}
          />
          {!isCollapsed && <div className="mt-1.5 text-[9px] text-slate-400 dark:text-slate-500 font-medium tracking-wide uppercase">Inventário de T.I.</div>}
        </div>

        {/* Links do menu */}
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {navItems.map((item) => renderLink(item))}
          {/* Apenas admin vê a gestão de usuários */}
          {user?.role === "ADMIN" && (
            <>
              <div className={`my-2 border-t border-slate-100 dark:border-slate-800 ${isCollapsed ? "mx-1" : "mx-2"}`} />
              {renderLink({
                to: "/usuarios",
                label: "Usuários",
                icon: (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                  </svg>
                ),
              })}
            </>
          )}
        </nav>

        {/* Rodapé do menu lateral compacto */}
        <div className={`p-2.5 border-t border-slate-100 dark:border-slate-900 text-xs ${isCollapsed ? "flex flex-col items-center gap-3" : ""}`}>
          {/* Unidade ativa (tenant) */}
          {!isCollapsed ? (
            <div className="mb-2.5 relative w-full">
              {/* Backdrop para fechar ao clicar fora */}
              {isUnitDropdownOpen && (
                <div className="fixed inset-0 z-40 cursor-default" onClick={() => setIsUnitDropdownOpen(false)} />
              )}

              <div className="flex flex-col gap-1 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/80 p-2 shadow-xs relative z-45 w-full">
                <div className="flex items-center gap-2">
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-green-500/10 text-green-600 dark:bg-green-500/20 dark:text-green-400">
                    <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="block text-[8px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Unidade Ativa</span>
                    {user?.role === "ADMIN" ? (
                      <button
                        type="button"
                        onClick={() => setIsUnitDropdownOpen(!isUnitDropdownOpen)}
                        className="flex items-center justify-between w-full text-left text-xs font-semibold text-slate-800 dark:text-white focus:outline-none group"
                      >
                        <span className="truncate">{user?.unitName}</span>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={2.5}
                          stroke="currentColor"
                          className={`w-3.5 h-3.5 ml-1 text-slate-400 dark:text-slate-500 transition-transform duration-200 ${
                            isUnitDropdownOpen ? "rotate-180" : ""
                          }`}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                        </svg>
                      </button>
                    ) : (
                      <span className="block text-xs font-semibold text-slate-800 dark:text-white truncate">{user?.unitName}</span>
                    )}
                  </div>
                </div>

                {/* Dropdown Card Flutuante (abre para cima) */}
                {isUnitDropdownOpen && user?.role === "ADMIN" && (
                  <div className="absolute bottom-full left-0 w-full mb-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg z-50 overflow-hidden py-1 animate-in fade-in slide-in-from-bottom-2 duration-150">
                    <div className="px-2.5 py-1 border-b border-slate-100 dark:border-slate-800 mb-1">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                        Selecionar Unidade
                      </span>
                    </div>
                    <div className="max-h-36 overflow-y-auto">
                      {units.map((u) => {
                        const isSelected = u.id === user.unitId;
                        return (
                          <button
                            key={u.id}
                            type="button"
                            onClick={() => {
                              handleUnitChange(u.id);
                              setIsUnitDropdownOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-3 py-1.5 text-xs text-left transition-colors ${
                              isSelected
                                ? "bg-marca/5 dark:bg-white/5 text-marca dark:text-white font-semibold"
                                : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white"
                            }`}
                          >
                            <span className="truncate">{u.name}</span>
                            {isSelected && (
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-3 h-3 text-verde">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                              </svg>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div
              className="flex items-center justify-center rounded-full bg-slate-50 dark:bg-slate-900 border border-slate-150 dark:border-slate-800 w-8 h-8 relative cursor-default"
              title={`Unidade: ${user?.unitName}`}
            >
              <span className="h-2 w-2 rounded-full bg-verde absolute -top-0.5 -right-0.5 border border-white dark:border-slate-950 animate-pulse" />
              <span className="text-[8px] font-bold text-slate-550 dark:text-slate-300 uppercase">{user?.unitName?.substring(0, 2)}</span>
            </div>
          )}

          {!isCollapsed ? (
            <div className="space-y-2 w-full">
              {/* Usuário logado como cartão de perfil */}
              <div className="flex items-center gap-2 px-1">
                <div className="w-8 h-8 shrink-0 rounded-full bg-marca/10 text-marca dark:bg-slate-800 dark:text-slate-200 font-bold flex items-center justify-center border border-marca/10 dark:border-slate-700 text-xs">
                  {getInitials(user?.name)}
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-slate-800 dark:text-white truncate text-[13px]" title={user?.name}>
                    {user?.name}
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                    {user?.role === "ADMIN" ? "Administrador" : "Colaborador"}
                  </div>
                </div>
              </div>

              {/* Botão de Logout */}
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-1.5 rounded-lg py-1.5 px-2 text-[11px] font-semibold border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-200 dark:hover:border-red-800 hover:text-red-600 dark:hover:text-red-400 transition-all duration-200"
              >
                <i className="ti ti-logout text-xs"></i>
                <span>Sair</span>
              </button>
            </div>
          ) : (
            <>
              {/* Avatar do Usuário */}
              <div
                className="w-8 h-8 rounded-full bg-marca/10 text-marca dark:bg-slate-800 dark:text-slate-200 font-bold flex items-center justify-center border border-marca/10 dark:border-slate-700 cursor-default text-xs"
                title={`${user?.name} (${user?.role === "ADMIN" ? "Administrador" : "Colaborador"})`}
              >
                {getInitials(user?.name)}
              </div>
              {/* Botão Logout Ícone */}
              <button
                onClick={handleLogout}
                className="p-1.5 rounded-lg text-slate-400 dark:text-slate-500 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 dark:hover:text-red-400 transition-all duration-200"
                title="Sair"
              >
                <i className="ti ti-logout text-sm"></i>
              </button>
            </>
          )}
        </div>
      </aside>

      {/* Conteúdo */}
      <main className="flex-1 flex flex-col min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 transition-colors duration-200">
        {/* Cabeçalho superior com botão do tema */}
        <header className="h-12 px-5 flex items-center justify-end bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm shrink-0">
          <ThemeToggle />
        </header>
        <div className="flex-1 overflow-y-auto p-5">
          <div className="w-full">{children}</div>
        </div>
      </main>
    </div>
  );
}
