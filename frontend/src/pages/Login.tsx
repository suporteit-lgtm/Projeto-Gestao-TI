// Tela de login: e-mail + senha.
import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";
import { Alert } from "../components/ui";

interface UnitStats {
  id: string;
  name: string;
  total: number;
  emUso: number;
  alertas: number;
}

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [unitsStats, setUnitsStats] = useState<UnitStats[]>([]);

  // Carrega as estatísticas das unidades.
  useEffect(() => {
    api<UnitStats[]>("/auth/units-stats")
      .then(setUnitsStats)
      .catch(console.error);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message ?? "Falha ao entrar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors duration-200 relative">
      {/* Lado Esquerdo: Formulário de Login */}
      <div className="w-full lg:w-[42%] xl:w-[38%] flex flex-col justify-between p-8 lg:p-12 bg-white dark:bg-slate-900 border-r border-slate-200/50 dark:border-slate-800/80 shadow-2xl z-10">
        
        {/* Topo: Logo */}
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Logo" className="h-10 w-auto object-contain" />
          <div className="h-5 w-px bg-slate-200 dark:bg-slate-800" />
          <span className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">Inventário de T.I.</span>
        </div>

        {/* Centro: Formulário */}
        <div className="w-full max-w-sm mx-auto my-auto py-12">
          <div className="mb-8">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Acesse sua conta</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Insira suas credenciais de acesso para entrar no sistema.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && <Alert>{error}</Alert>}
            
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">E-mail</label>
              <input
                type="email"
                className="input bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 rounded-xl focus:ring-2 focus:ring-marca/20"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                placeholder="nome@empresa.com"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Senha</label>
              <input
                type="password"
                className="input bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 rounded-xl focus:ring-2 focus:ring-marca/20"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              className="btn-primary w-full py-2.5 rounded-xl text-sm font-semibold shadow-md active:scale-98 transition-all"
              disabled={loading}
            >
              {loading ? "Entrando..." : "Entrar na conta"}
            </button>
          </form>
        </div>

        {/* Rodapé: Copyright */}
        <div className="text-xs text-slate-400 dark:text-slate-500 text-center lg:text-left">
          Inventário de T.I. · Acesso restrito e monitorado
        </div>

      </div>

      {/* Lado Direito: Banner de Marca com Elementos Premium Flutuantes */}
      <div className="hidden lg:flex lg:w-[58%] xl:w-[62%] bg-gradient-to-br from-[#0B1E43] via-marca to-[#0a0f1d] relative overflow-hidden flex-col justify-between p-12 xl:p-16">
        
        {/* Círculos de luz decorativos no fundo */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-verde/10 blur-[120px] -mr-48 -mt-48" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-marca-claro/10 blur-[100px] -ml-24 -mb-24" />

        {/* Topo Direito: Tema da Aplicação ou detalhe */}
        <div className="self-end text-xs font-semibold uppercase tracking-wider text-white/40">
          Locagora Soluções
        </div>

        {/* Centro: Elemento visual e texto */}
        <div className="w-full max-w-xl my-auto relative z-10 space-y-6">
          <div>
            <h2 className="text-4xl font-extrabold text-white tracking-tight leading-tight">
              Gestão Inteligente de <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-300">Equipamentos</span>
            </h2>
            <p className="text-slate-300 mt-3 text-sm leading-relaxed max-w-md">
              Monitore o estoque, gerencie licenças de software, registre termos de responsabilidade e acompanhe atribuições em tempo real em todas as filiais.
            </p>
          </div>

          {/* Listagem de Unidades (Quadradinhos com dados de cada uma) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white/60 uppercase tracking-wider">Status das Unidades</span>
              <span className="text-[11px] text-white/40 font-medium">{unitsStats.length} unidades ativas</span>
            </div>

            {/* Scrollable list/grid of units */}
            <div className="max-h-[360px] overflow-y-auto pr-1 space-y-3 custom-scrollbar">
              <div className="grid sm:grid-cols-2 gap-3">
                {unitsStats.map((u) => {
                  const hasAlerts = u.alertas > 0;
                  return (
                    <div
                      key={u.id}
                      className="bg-white/10 dark:bg-slate-950/40 backdrop-blur-md border border-white/15 rounded-2xl p-4 shadow-xl flex flex-col justify-between space-y-3 hover:border-white/25 transition-all duration-200"
                    >
                      {/* Card Header: Unit name & status indicator */}
                      <div className="flex items-center justify-between border-b border-white/10 pb-2">
                        <span className="text-xs font-bold text-white truncate max-w-[120px]">{u.name}</span>
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`h-2 w-2 rounded-full ${
                              hasAlerts ? "bg-rose-500 animate-pulse" : "bg-emerald-400"
                            }`}
                          />
                          <span className="text-[9px] font-semibold text-white/50 uppercase">
                            {hasAlerts ? `${u.alertas} alerta${u.alertas !== 1 ? "s" : ""}` : "Estável"}
                          </span>
                        </div>
                      </div>

                      {/* Card Body: 3 stats columns */}
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="space-y-0.5">
                          <span className="block text-[9px] text-white/50 uppercase font-semibold">Total</span>
                          <span className="block text-sm font-bold text-white">{u.total}</span>
                        </div>
                        <div className="space-y-0.5">
                          <span className="block text-[9px] text-white/50 uppercase font-semibold">Em uso</span>
                          <span className="block text-sm font-bold text-white">{u.emUso}</span>
                        </div>
                        <div className="space-y-0.5">
                          <span className="block text-[9px] text-white/50 uppercase font-semibold">Alertas</span>
                          <span
                            className={`block text-sm font-bold ${
                              hasAlerts ? "text-rose-400" : "text-white/40"
                            }`}
                          >
                            {u.alertas}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {unitsStats.length === 0 && (
                  <div className="col-span-2 text-center py-8 text-white/40 text-xs border border-dashed border-white/10 rounded-2xl">
                    Nenhuma unidade ativa cadastrada.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Rodapé do Banner */}
        <div className="text-xs text-white/40">
          © {new Date().getFullYear()} Locagora. Todos os direitos reservados.
        </div>

      </div>
    </div>
  );
}
