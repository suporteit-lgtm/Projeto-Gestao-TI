// Configurações: limites de alertas, unidades da empresa, geração de termo por
// pessoa e edição do template do Termo de Responsabilidade.
import { useEffect, useState } from "react";
import { api, openPdf } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { Alert, Spinner } from "../components/ui";
import { Unit } from "../types";

interface SettingsData {
  idleDaysLimit: number;
  conferenceDaysLimit: number;
  warrantyWarningDays: number;
}

// Section card wrapper with icon, title and description
function SectionCard({
  id,
  icon,
  title,
  description,
  iconColor = "text-blue-500",
  iconBg = "bg-blue-500/10",
  children,
}: {
  id?: string;
  icon: string;
  title: string;
  description?: string;
  iconColor?: string;
  iconBg?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 dark:border-slate-800">
        <div className={`w-9 h-9 rounded-xl ${iconBg} flex items-center justify-center shrink-0`}>
          <i className={`ti ${icon} ${iconColor} text-lg`}></i>
        </div>
        <div>
          <div className="font-semibold text-slate-800 dark:text-slate-100 text-sm">{title}</div>
          {description && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{description}</p>
          )}
        </div>
      </div>
      <div className="p-6">{children}</div>
    </section>
  );
}

export default function Settings() {
  const { user, updateUser } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [msg, setMsg] = useState("");
  const [savingLimits, setSavingLimits] = useState(false);

  // Unidades
  const [units, setUnits] = useState<Unit[]>([]);
  const [uEditId, setUEditId] = useState<string | null>(null);
  const [uNome, setUNome] = useState("");
  const [uCnpj, setUCnpj] = useState("");
  const [uEndereco, setUEndereco] = useState("");
  const [unitMsg, setUnitMsg] = useState("");
  const [savingUnit, setSavingUnit] = useState(false);

  const [profileName, setProfileName] = useState(user?.name ?? "");
  const [profileEmail, setProfileEmail] = useState(user?.email ?? "");
  const [profilePassword, setProfilePassword] = useState("");
  const [profileMsg, setProfileMsg] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  // Template do termo
  const [template, setTemplate] = useState("");
  const [tplMsg, setTplMsg] = useState("");
  const [savingTpl, setSavingTpl] = useState(false);

  // Termo por pessoa
  const [pessoa, setPessoa] = useState("");
  const [unidadeTermo, setUnidadeTermo] = useState("");
  const [termoErro, setTermoErro] = useState("");
  const [gerandoTermo, setGerandoTermo] = useState(false);

  function loadUnits() {
    api<Unit[]>("/units").then(setUnits);
  }

  useEffect(() => {
    api<SettingsData>("/settings").then(setSettings);
    api<{ content: string }>("/documents/template").then((t) => setTemplate(t.content));
    loadUnits();
    if (user?.unitId) setUnidadeTermo(user.unitId);
  }, []);

  async function salvarLimites() {
    setMsg("");
    setSavingLimits(true);
    try {
      await api("/settings", {
        method: "PUT",
        body: {
          idleDaysLimit: Number(settings!.idleDaysLimit),
          conferenceDaysLimit: Number(settings!.conferenceDaysLimit),
          warrantyWarningDays: Number(settings!.warrantyWarningDays),
        },
      });
      setMsg("Limites salvos com sucesso.");
    } catch (err: any) {
      setMsg(err.message);
    } finally {
      setSavingLimits(false);
    }
  }

  function editarUnidade(u: Unit) {
    setUEditId(u.id);
    setUNome(u.name);
    setUCnpj(u.cnpj ?? "");
    setUEndereco(u.address ?? "");
    setUnitMsg("");
  }

  function cancelarEdicaoUnidade() {
    setUEditId(null);
    setUNome("");
    setUCnpj("");
    setUEndereco("");
    setUnitMsg("");
  }

  async function salvarUnidade() {
    setUnitMsg("");
    setSavingUnit(true);
    try {
      const body = { name: uNome.trim(), cnpj: uCnpj.trim() || null, address: uEndereco.trim() || null };
      if (uEditId) {
        await api(`/units/${uEditId}`, { method: "PUT", body });
      } else {
        await api("/units", { method: "POST", body });
      }
      cancelarEdicaoUnidade();
      loadUnits();
    } catch (err: any) {
      setUnitMsg(err.message);
    } finally {
      setSavingUnit(false);
    }
  }

  async function excluirUnidade(u: Unit) {
    if (!confirm(`Excluir a unidade "${u.name}"?`)) return;
    try {
      await api(`/units/${u.id}`, { method: "DELETE" });
      loadUnits();
    } catch (err: any) {
      alert(err.message);
    }
  }

  async function salvarTemplate() {
    setTplMsg("");
    setSavingTpl(true);
    try {
      await api("/documents/template", { method: "PUT", body: { content: template } });
      setTplMsg("Template salvo com sucesso.");
    } catch (err: any) {
      setTplMsg(err.message);
    } finally {
      setSavingTpl(false);
    }
  }

  async function resetTemplate() {
    if (!confirm("Restaurar o texto padrão do termo?")) return;
    const t = await api<{ content: string }>("/documents/template/reset", { method: "POST" });
    setTemplate(t.content);
    setTplMsg("Template restaurado para o padrão.");
  }

  async function salvarPerfil() {
    setProfileMsg("");
    setSavingProfile(true);
    try {
      const body: any = {
        name: profileName,
        email: profileEmail,
      };
      if (profilePassword) body.password = profilePassword;
      const updated = await api<{ id: string; name: string; email: string }>(`/users/${user?.id}`, {
        method: "PUT",
        body,
      });
      setProfileMsg("Perfil atualizado com sucesso.");
      setProfilePassword("");
      updateUser({ name: updated.name, email: updated.email });
    } catch (err: any) {
      setProfileMsg(err.message);
    } finally {
      setSavingProfile(false);
    }
  }

  async function gerarTermoPessoa() {
    setTermoErro("");
    setGerandoTermo(true);
    try {
      await openPdf(
        `/documents/person/termo.pdf?nome=${encodeURIComponent(pessoa.trim())}&unitId=${unidadeTermo}`,
        `termo-${pessoa.trim()}.pdf`
      );
    } catch (err: any) {
      setTermoErro(err.message);
    } finally {
      setGerandoTermo(false);
    }
  }

  const [activeSection, setActiveSection] = useState("limits");
  const navItems = [
    { id: "limits", label: "Limites de alerta", icon: "ti-bell-ringing" },
    { id: "profile", label: "Minha conta", icon: "ti-user-circle" },
    { id: "units", label: "Unidades", icon: "ti-buildings" },
    { id: "term", label: "Gerar termo", icon: "ti-file-text" },
    { id: "template", label: "Template", icon: "ti-code" },
  ];

  if (!settings) return <Spinner />;

  const placeholders = [
    { label: "{{empresa.nome}}", desc: "Nome da unidade" },
    { label: "{{empresa.cnpj}}", desc: "CNPJ da unidade" },
    { label: "{{empresa.endereco}}", desc: "Endereço" },
    { label: "{{usuario.nome}}", desc: "Responsável" },
    { label: "{{usuario.cpf}}", desc: "CPF" },
    { label: "{{dataExtenso}}", desc: "Data por extenso" },
    { label: "{{#each equipamentos}}", desc: "Laço de equipamentos" },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="space-y-6">
          <div className="sticky top-6 space-y-6 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/95 dark:bg-slate-950/95 shadow-sm p-6">
            <div>
              <h1 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">Configurações</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                Selecione uma seção para visualizar e editar as configurações.
              </p>
            </div>

            <div className="space-y-2">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={`w-full flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm text-left transition-colors ${
                    activeSection === item.id
                      ? "border-blue-500/30 bg-blue-50 text-slate-900 dark:bg-blue-900/30 dark:text-white"
                      : "border-slate-200/80 bg-slate-50 dark:border-slate-800/80 dark:bg-slate-900/80 text-slate-700 dark:text-slate-300 hover:border-slate-300 hover:bg-slate-100 dark:hover:border-slate-700 dark:hover:bg-slate-800/70"
                  }`}
                >
                  <span className="grid h-10 w-10 place-items-center rounded-2xl bg-white dark:bg-slate-950 shadow-sm text-slate-700 dark:text-slate-300">
                    <i className={`ti ${item.icon} text-base`}></i>
                  </span>
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        </aside>

        <div className="space-y-6">
          {activeSection === "limits" && (
            <SectionCard
              id="settings-limits"
              icon="ti-bell-ringing"
              title="Limites dos alertas"
              description="Defina os dias de referência para cada tipo de alerta automático."
              iconColor="text-amber-500"
              iconBg="bg-amber-500/10"
            >
              {msg && <Alert kind={msg.includes("sucesso") ? "success" : undefined}>{msg}</Alert>}
              <div className="grid sm:grid-cols-1 gap-5 mt-2">
                {(
                  [
                    ["idleDaysLimit", "Parado em estoque (dias)", "Alerta quando o equipamento ficar parado mais que este limite.", "ti-package-off", "text-rose-500", "bg-rose-500/10"],
                    ["conferenceDaysLimit", "Conferência atrasada (dias)", "Dias desde a última conferência de inventário.", "ti-clipboard-check", "text-violet-500", "bg-violet-500/10"],
                    ["warrantyWarningDays", "Aviso de garantia (dias)", "Antecedência para avisar do vencimento de garantia.", "ti-shield-exclamation", "text-blue-500", "bg-blue-500/10"],
                  ] as const
                ).map(([key, label, hint, icon, iconColor, iconBg]) => (
                  <div key={key} className="space-y-2 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-950/80 p-4">
                    <div className="flex items-center gap-2">
                      <div className={`w-9 h-9 rounded-lg ${iconBg} flex items-center justify-center`}>
                        <i className={`ti ${icon} ${iconColor}`}></i>
                      </div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        {label}
                      </div>
                    </div>
                    <input
                      type="number"
                      min={1}
                      className="input w-full"
                      disabled={!isAdmin}
                      value={settings[key]}
                      onChange={(e) => setSettings({ ...settings, [key]: Number(e.target.value) })}
                    />
                    <p className="text-[11px] text-slate-400 dark:text-slate-500">{hint}</p>
                  </div>
                ))}
              </div>

              {isAdmin ? (
                <button
                  className="btn-primary flex items-center gap-2 mt-5"
                  onClick={salvarLimites}
                  disabled={savingLimits}
                >
                  <i className={`ti ${savingLimits ? "ti-loader-2 animate-spin" : "ti-device-floppy"} text-sm`}></i>
                  {savingLimits ? "Salvando..." : "Salvar limites"}
                </button>
              ) : (
                <p className="text-xs text-slate-400 mt-4 flex items-center gap-1.5">
                  <i className="ti ti-lock text-sm"></i>
                  Apenas administradores podem alterar os limites.
                </p>
              )}
            </SectionCard>
          )}

          {activeSection === "profile" && (
            <SectionCard
              id="settings-profile"
              icon="ti-user-circle"
              title="Minha conta"
              description="Atualize seu nome, e-mail ou senha sem sair do sistema."
              iconColor="text-green-500"
              iconBg="bg-emerald-500/10"
            >
              {profileMsg && <Alert kind={profileMsg.includes("sucesso") ? "success" : undefined}>{profileMsg}</Alert>}

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
                    Nome completo
                  </label>
                  <input
                    className="input"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
                    E-mail
                  </label>
                  <input
                    type="email"
                    className="input"
                    value={profileEmail}
                    onChange={(e) => setProfileEmail(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
                    Nova senha
                  </label>
                  <input
                    type="password"
                    className="input"
                    placeholder="Deixe em branco para manter a senha atual"
                    value={profilePassword}
                    onChange={(e) => setProfilePassword(e.target.value)}
                  />
                </div>

                <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    className="btn-primary flex items-center gap-2"
                    onClick={salvarPerfil}
                    disabled={savingProfile}
                  >
                    <i className={`ti ${savingProfile ? "ti-loader-2 animate-spin" : "ti-device-floppy"} text-sm`}></i>
                    {savingProfile ? "Salvando..." : "Salvar perfil"}
                  </button>
                </div>
              </div>
            </SectionCard>
          )}

          {activeSection === "units" && (
            <SectionCard
              id="settings-units"
              icon="ti-buildings"
              title="Unidades"
              description="Adicione ou edite unidades do sistema."
              iconColor="text-cyan-500"
              iconBg="bg-cyan-500/10"
            >
              {units.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">Nenhuma unidade cadastrada.</p>
              ) : (
                <div className="space-y-3">
                  {units.map((u) => (
                    <div
                      key={u.id}
                      className={`flex items-center gap-4 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${
                        uEditId === u.id ? "bg-blue-50 dark:bg-blue-900/20" : ""
                      }`}
                    >
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                        <i className="ti ti-building text-emerald-500 text-sm"></i>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-slate-800 dark:text-slate-100 text-sm">{u.name}</div>
                        <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                          {u.cnpj ? (
                            <span><i className="ti ti-id-badge text-[10px] mr-1"></i>{u.cnpj}</span>
                          ) : (
                            <span className="italic">sem CNPJ</span>
                          )}
                          {" · "}
                          {u.address || <span className="italic">sem endereço</span>}
                        </div>
                      </div>
                      {isAdmin && (
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => editarUnidade(u)}
                            className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 px-2.5 py-1.5 rounded-lg transition-colors"
                          >
                            <i className="ti ti-pencil text-sm"></i>
                            Editar
                          </button>
                          <button
                            onClick={() => excluirUnidade(u)}
                            className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-red-600 dark:hover:text-red-400 bg-slate-100 dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-900/30 px-2.5 py-1.5 rounded-lg transition-colors"
                          >
                            <i className="ti ti-trash text-sm"></i>
                            Excluir
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {isAdmin && (
                <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-4 space-y-3 mt-4">
                  {uEditId && (
                    <div className="flex items-center gap-2 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-3 py-2 rounded-lg">
                      <i className="ti ti-pencil text-sm"></i>
                      Editando: {units.find((u) => u.id === uEditId)?.name}
                    </div>
                  )}
                  <div className="grid sm:grid-cols-3 gap-3">
                    <input
                      className="input"
                      placeholder="Nome da unidade *"
                      value={uNome}
                      onChange={(e) => setUNome(e.target.value)}
                    />
                    <input
                      className="input"
                      placeholder="CNPJ"
                      value={uCnpj}
                      onChange={(e) => setUCnpj(e.target.value)}
                    />
                    <input
                      className="input"
                      placeholder="Endereço"
                      value={uEndereco}
                      onChange={(e) => setUEndereco(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="btn-primary flex items-center gap-2"
                      disabled={!uNome.trim() || savingUnit}
                      onClick={salvarUnidade}
                    >
                      <i className={`ti ${savingUnit ? "ti-loader-2 animate-spin" : uEditId ? "ti-device-floppy" : "ti-plus"} text-sm`}></i>
                      {savingUnit ? "Salvando..." : uEditId ? "Salvar alterações" : "Adicionar unidade"}
                    </button>
                    {uEditId && (
                      <button className="btn-secondary" onClick={cancelarEdicaoUnidade}>
                        Cancelar
                      </button>
                    )}
                  </div>
                </div>
              )}
            </SectionCard>
          )}

          {activeSection === "term" && (
            <SectionCard
              id="settings-term"
              icon="ti-file-text"
              title="Gerar Termo de Responsabilidade"
              description="Gera um PDF com todos os equipamentos em uso pela pessoa na unidade selecionada."
              iconColor="text-violet-500"
              iconBg="bg-violet-500/10"
            >
              {termoErro && <Alert>{termoErro}</Alert>}
              <div className="grid sm:grid-cols-[1fr_1fr_auto] gap-3 mt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
                    Nome do responsável
                  </label>
                  <input
                    className="input"
                    placeholder="Ex: Mariana Souza"
                    value={pessoa}
                    onChange={(e) => setPessoa(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
                    Unidade
                  </label>
                  <select className="input" value={unidadeTermo} onChange={(e) => setUnidadeTermo(e.target.value)}>
                    {units.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end">
                  <button
                    className="btn-primary flex items-center gap-2 whitespace-nowrap w-full sm:w-auto justify-center"
                    disabled={!pessoa.trim() || !unidadeTermo || gerandoTermo}
                    onClick={gerarTermoPessoa}
                  >
                    <i className={`ti ${gerandoTermo ? "ti-loader-2 animate-spin" : "ti-download"} text-sm`}></i>
                    {gerandoTermo ? "Gerando..." : "Gerar PDF"}
                  </button>
                </div>
              </div>
            </SectionCard>
          )}

          {activeSection === "template" && (
            <SectionCard
              id="settings-template"
              icon="ti-code"
              title="Template do Termo de Responsabilidade"
              description="Texto em HTML com campos dinâmicos. Edite o modelo que será usado na geração de PDF."
              iconColor="text-slate-500"
              iconBg="bg-slate-500/10"
            >
              {/* Placeholders reference */}
              <div className="mb-4 flex flex-wrap gap-2">
                {placeholders.map((p) => (
                  <span
                    key={p.label}
                    className="inline-flex items-center gap-1 text-[11px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-1 rounded-md border border-slate-200/80 dark:border-slate-700"
                    title={p.desc}
                  >
                    {p.label}
                  </span>
                ))}
              </div>

              {tplMsg && <Alert kind={tplMsg.includes("sucesso") || tplMsg.includes("restaurado") ? "success" : undefined}>{tplMsg}</Alert>}

              {isAdmin ? (
                <div className="space-y-3">
                  <textarea
                    className="input font-mono text-xs min-h-[280px] resize-y leading-relaxed"
                    value={template}
                    onChange={(e) => setTemplate(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <button
                      className="btn-primary flex items-center gap-2"
                      onClick={salvarTemplate}
                      disabled={savingTpl}
                    >
                      <i className={`ti ${savingTpl ? "ti-loader-2 animate-spin" : "ti-device-floppy"} text-sm`}></i>
                      {savingTpl ? "Salvando..." : "Salvar template"}
                    </button>
                    <button className="btn-secondary flex items-center gap-2" onClick={resetTemplate}>
                      <i className="ti ti-refresh text-sm"></i>
                      Restaurar padrão
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-400 flex items-center gap-1.5">
                  <i className="ti ti-lock text-sm"></i>
                  Apenas administradores podem editar o template.
                </p>
              )}
            </SectionCard>
          )}
        </div>
      </div>
    </div>
  );
}
