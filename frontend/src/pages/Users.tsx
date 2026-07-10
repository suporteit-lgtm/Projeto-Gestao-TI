// Gestão de usuários do sistema — somente admin (rota já protegida no App).
import { useEffect, useState } from "react";
import { api } from "../api/client";
import { Modal, Alert, Spinner } from "../components/ui";
import { Unit } from "../types";

interface SysUser {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "COMMON";
  active: boolean;
  unitId: string | null;
  unitName: string | null;
}

// Generates initials avatar from name
function Avatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  const colors = [
    "from-blue-500 to-indigo-600",
    "from-emerald-500 to-teal-600",
    "from-violet-500 to-purple-600",
    "from-rose-500 to-pink-600",
    "from-amber-500 to-orange-600",
    "from-cyan-500 to-sky-600",
  ];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  const color = colors[h % colors.length];

  return (
    <div
      className={`w-10 h-10 rounded-full bg-gradient-to-br ${color} flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-sm`}
    >
      {initials}
    </div>
  );
}

export default function Users() {
  const [users, setUsers] = useState<SysUser[] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<SysUser | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<SysUser | null>(null);
  const [deleting, setDeleting] = useState(false);

  function load() {
    api<SysUser[]>("/users").then(setUsers);
  }
  useEffect(load, []);

  async function excluir() {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await api(`/users/${confirmDelete.id}`, { method: "DELETE" });
      setConfirmDelete(null);
      load();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setDeleting(false);
    }
  }

  if (!users) return <Spinner />;

  const admins = users.filter((u) => u.role === "ADMIN").length;
  const ativos = users.filter((u) => u.active).length;

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="space-y-6">
        <section className="rounded-[2rem] border border-slate-200/80 dark:border-slate-800/80 bg-white/95 dark:bg-slate-950/95 shadow-sm p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-100">
                Usuários do sistema
              </h1>
              <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">
                Quem pode acessar o sistema e seu nível de permissão.
              </p>
            </div>
            <button
              className="btn-primary flex items-center gap-2 shrink-0"
              onClick={() => {
                setEditing(null);
                setShowForm(true);
              }}
            >
              <i className="ti ti-user-plus text-base"></i>
              Novo usuário
            </button>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { label: "Total de usuários", value: users.length, icon: "ti-users", color: "text-blue-500", bg: "bg-blue-500/10" },
          { label: "Usuários ativos", value: ativos, icon: "ti-circle-check", color: "text-emerald-500", bg: "bg-emerald-500/10" },
          { label: "Administradores", value: admins, icon: "ti-shield-check", color: "text-violet-500", bg: "bg-violet-500/10" },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 flex items-center gap-3"
          >
            <div className={`w-9 h-9 rounded-lg ${s.bg} flex items-center justify-center shrink-0`}>
              <i className={`ti ${s.icon} ${s.color} text-lg`}></i>
            </div>
            <div>
              <div className="text-xl font-semibold text-slate-800 dark:text-slate-100">{s.value}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">{s.label}</div>
            </div>
          </div>
        ))}
          </div>
        </section>

        <section className="rounded-[2rem] border border-slate-200/80 dark:border-slate-800/80 bg-white/95 dark:bg-slate-950/95 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Painel de usuários</p>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Gestão de contas</h2>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
                <span>{users.length} cadastrados</span>
                <span className="hidden sm:inline">·</span>
                <span>{ativos} ativos</span>
                <span className="hidden sm:inline">·</span>
                <span>{admins} administradores</span>
              </div>
            </div>
          </div>

          <div className="overflow-hidden">
            {users.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
                  <i className="ti ti-users text-slate-400 text-xl"></i>
                </div>
                <p className="text-slate-500 dark:text-slate-400 text-sm">Nenhum usuário cadastrado ainda.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {users.map((u) => (
                  <div
                    key={u.id}
                    className="flex flex-col gap-4 px-5 py-5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors sm:flex-row sm:items-center"
                  >
                    <Avatar name={u.name} />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-800 dark:text-slate-100 truncate">
                          {u.name}
                        </span>
                        {!u.active && (
                          <span className="text-[10px] font-medium bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 px-2 py-0.5 rounded-full">
                            Inativo
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex flex-wrap items-center gap-2 truncate">
                        <span className="truncate">{u.email}</span>
                        <span className="text-slate-300 dark:text-slate-600">·</span>
                        <span className="inline-flex items-center gap-1 truncate">
                          <i className="ti ti-building text-[11px]"></i>
                          <span>{u.unitName ?? "Sem unidade"}</span>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span
                        className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
                          u.role === "ADMIN"
                            ? "bg-blue-500/15 text-blue-500 dark:text-blue-400"
                            : "bg-slate-100 dark:bg-slate-700/80 text-slate-500 dark:text-slate-400"
                        }`}
                      >
                        {u.role === "ADMIN" ? (
                          <><i className="ti ti-shield text-[10px] mr-1"></i>Admin</>
                        ) : (
                          "Comum"
                        )}
                      </span>

                      <button
                        onClick={() => {
                          setEditing(u);
                          setShowForm(true);
                        }}
                        className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        <i className="ti ti-pencil text-sm"></i>
                        Editar
                      </button>

                      <button
                        onClick={() => setConfirmDelete(u)}
                        className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 bg-slate-100 dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-900/30 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        <i className="ti ti-trash text-sm"></i>
                        Remover
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Confirm Delete Modal */}
      {confirmDelete && (
        <Modal open title="Remover usuário" onClose={() => setConfirmDelete(null)}>
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <i className="ti ti-alert-triangle text-red-500 text-xl mt-0.5"></i>
              <div>
                <p className="font-medium text-red-700 dark:text-red-400 text-sm">Ação irreversível</p>
                <p className="text-sm text-red-600 dark:text-red-500 mt-0.5">
                  Tem certeza que deseja remover o usuário <strong>{confirmDelete.name}</strong>? Ele perderá o acesso imediatamente.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button className="btn-secondary" onClick={() => setConfirmDelete(null)}>
                Cancelar
              </button>
              <button
                onClick={excluir}
                disabled={deleting}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
              >
                <i className="ti ti-trash text-sm"></i>
                {deleting ? "Removendo..." : "Remover usuário"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {showForm && (
        <UserForm
          user={editing}
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            load();
          }}
        />
      )}
    </main>
  );
}

function UserForm({
  user,
  onClose,
  onSaved,
}: {
  user: SysUser | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"ADMIN" | "COMMON">(user?.role ?? "COMMON");
  const [active, setActive] = useState(user?.active ?? true);
  const [units, setUnits] = useState<Unit[]>([]);
  const [unitId, setUnitId] = useState(user?.unitId ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api<Unit[]>("/units").then((u) => {
      setUnits(u);
      if (!user && u.length && !unitId) setUnitId(u[0].id);
    });
  }, []);

  async function submit() {
    setError("");
    setSaving(true);
    try {
      if (user) {
        const body: any = { name, email, role, active, unitId };
        if (password) body.password = password;
        await api(`/users/${user.id}`, { method: "PUT", body });
      } else {
        await api("/users", { method: "POST", body: { name, email, password, role, unitId } });
      }
      onSaved();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open title={user ? "Editar usuário" : "Novo usuário"} onClose={onClose}>
      <div className="space-y-4">
        {error && <Alert>{error}</Alert>}

        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
              Nome completo
            </label>
            <input
              className="input"
              placeholder="Ex: João da Silva"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
              E-mail
            </label>
            <input
              type="email"
              className="input"
              placeholder="joao@empresa.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
              {user ? "Nova senha (deixe em branco para manter)" : "Senha"}
            </label>
            <input
              type="password"
              className="input"
              placeholder={user ? "••••••••" : "Mínimo 6 caracteres"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
              Unidade de trabalho
            </label>
            <select className="input" value={unitId} onChange={(e) => setUnitId(e.target.value)}>
              <option value="">Selecione a unidade...</option>
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-400 mt-1.5">
              Usuário comum só acessa esta unidade. Admin pode entrar em qualquer uma.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
                Permissão
              </label>
              <select className="input" value={role} onChange={(e) => setRole(e.target.value as any)}>
                <option value="COMMON">Comum</option>
                <option value="ADMIN">Administrador</option>
              </select>
            </div>
            {user && (
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
                  Situação
                </label>
                <select
                  className="input"
                  value={active ? "1" : "0"}
                  onChange={(e) => setActive(e.target.value === "1")}
                >
                  <option value="1">Ativo</option>
                  <option value="0">Inativo</option>
                </select>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <button className="btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn-primary flex items-center gap-2" onClick={submit} disabled={saving}>
            <i className={`ti ${saving ? "ti-loader-2 animate-spin" : "ti-device-floppy"} text-sm`}></i>
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
