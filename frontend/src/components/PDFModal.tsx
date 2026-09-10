import { useEffect, useRef, useState } from "react";
import html2pdf from "html2pdf.js";
import { Modal, Spinner, Alert } from "./ui";
import { api } from "../api/client";

interface Signer {
  name: string;
  email: string;
  documentation?: string;
  sign_as?: string;
}

// Os três modelos de termo. O texto de cada um é editável em Configurações.
export const TIPOS_TERMO = [
  { tipo: "RESPONSABILIDADE", label: "Responsabilidade" },
  { tipo: "COMODATO", label: "Comodato" },
  { tipo: "DEVOLUCAO", label: "Devolução" },
] as const;

export type TipoTermo = (typeof TIPOS_TERMO)[number]["tipo"];

interface PDFModalProps {
  open: boolean;
  onClose: () => void;
  htmlPath: string; // ex: /documents/equipment/123/termo.html
  filename: string;
  signers?: Signer[]; // if empty, clicksign is hidden
  pasta?: string;
}

export default function PDFModal({ open, onClose, htmlPath, filename, signers, pasta }: PDFModalProps) {
  // Qual modelo usar. Trocar aqui recarrega o documento com o outro texto.
  const [tipo, setTipo] = useState<TipoTermo>("RESPONSABILIDADE");
  // E-mail de quem vai assinar. Editável porque no termo de devolução costuma
  // ser o e-mail pessoal — o corporativo já foi desativado quando a pessoa sai.
  const [emailColaborador, setEmailColaborador] = useState(signers?.[0]?.email ?? "");
  const [html, setHtml] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState("");

  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setEmailColaborador(signers?.[0]?.email ?? "");
  }, [signers?.[0]?.email, open]);

  useEffect(() => {
    if (!open) return;
    setHtml("");
    setError("");
    setSuccess("");
    setLoading(true);
    
    const separador = htmlPath.includes("?") ? "&" : "?";
    api<{ html: string }>(`${htmlPath}${separador}tipo=${tipo}`)
      .then((res) => {
        setHtml(res.html);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Erro ao carregar o termo");
        setLoading(false);
      });
  }, [open, htmlPath, tipo]);

  function handlePrint() {
    if (!html) return;
    const win = window.open("", "_blank");
    if (win) {
      win.document.write(html);
      win.document.close();
      win.focus();
      // setTimeout to allow rendering
      setTimeout(() => {
        win.print();
        // win.close();
      }, 500);
    } else {
      setError("Pop-ups bloqueados. Por favor, libere os pop-ups para imprimir.");
    }
  }

  // "termo-Fulano.pdf" -> "termo-comodato-Fulano.pdf", para o arquivo dizer
  // qual modelo foi gerado.
  const nomeDoArquivo =
    tipo === "RESPONSABILIDADE"
      ? filename
      : filename.replace(/^termo-/, `termo-${tipo.toLowerCase()}-`);

  async function handleClicksign() {
    if (!html || !signers || signers.length === 0) return;
    if (!emailColaborador.trim()) {
      setError("Informe o e-mail de quem vai assinar antes de enviar.");
      return;
    }
    if (
      !confirm(
        `Enviar para assinatura eletrônica?

Os convites vão para ${emailColaborador.trim()}, ` +
          `para o responsável técnico e para o setor de termos.`
      )
    )
      return;
    
    setError("");
    setSending(true);
    try {
      // 1. Gera o PDF Blob em memória usando html2pdf
      const element = document.createElement("div");
      element.innerHTML = html;
      element.style.width = "800px";
      element.style.padding = "20px";
      
      const opt = {
        margin:       10,
        filename:     nomeDoArquivo,
        image:        { type: 'jpeg' as const, quality: 0.98 },
        html2canvas:  { scale: 2 },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' as const }
      };

      const pdfBase64DataUrl = await html2pdf().set(opt).from(element).output('datauristring');
      // O formato é data:application/pdf;base64,..... precisamos remover o header
      const base64 = pdfBase64DataUrl.split(',')[1];

      // 2. Envia para a API do Clicksign
      const envio = await api<{
        registrado?: boolean;
        avisoRegistro?: string;
        signatarios?: { name: string; email: string }[];
      }>("/documents/clicksign/send", {
        method: "POST",
        body: {
          filename: nomeDoArquivo,
          pdfBase64: base64,
          signers: signers?.map((s, i) =>
            i === 0 ? { ...s, email: emailColaborador.trim() } : s
          ),
          pasta
        }
      });

      if (envio?.avisoRegistro) {
        // Enviado, mas não registrado na tela de Termos: avisa e não fecha
        // sozinho, para a mensagem não passar batida.
        setError(envio.avisoRegistro);
      } else {
        const destinos = envio?.signatarios?.map((s) => s.email).join(", ");
        setSuccess(
          destinos
            ? `Enviado para assinatura. Convites por e-mail para: ${destinos}.`
            : "Enviado com sucesso! O signatário receberá um e-mail."
        );
        setTimeout(() => {
          onClose();
        }, 3000);
      }
    } catch (err: any) {
      setError(err.message || "Erro ao enviar para o Clicksign.");
    } finally {
      setSending(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Termo — ${TIPOS_TERMO.find((t) => t.tipo === tipo)?.label}`}
      wide
    >
      <div className="space-y-4">
        {/* Modelo do termo. O texto de cada um é editável em Configurações. */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mr-1">
            Modelo
          </span>
          {TIPOS_TERMO.map((t) => (
            <button
              key={t.tipo}
              type="button"
              onClick={() => setTipo(t.tipo)}
              disabled={sending}
              className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-50 ${
                tipo === t.tipo
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                  : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-10">
            <Spinner />
            <p className="mt-2 text-sm text-gray-500">Gerando documento...</p>
          </div>
        ) : (
          <>
            {error && <Alert>{error}</Alert>}
            {success && <div className="p-3 bg-green-100 text-green-800 rounded">{success}</div>}

            {!loading && !error && !success && (
              <>
                {/* Quem vai assinar. O colaborador é editável; o responsável
                    técnico e o setor de termos entram sempre, pelo servidor. */}
                {signers && signers.length > 0 && (
                  <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 mb-3 space-y-2">
                    <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                      Assinam este termo
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm text-slate-700 dark:text-slate-200 shrink-0">
                        {signers[0].name}
                      </span>
                      <input
                        type="email"
                        className="input text-xs py-1 flex-1 min-w-[220px]"
                        value={emailColaborador}
                        onChange={(e) => setEmailColaborador(e.target.value)}
                        placeholder="e-mail de quem vai assinar"
                        disabled={sending}
                      />
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      + Responsável técnico de T.I. e Setor de Termos, incluídos automaticamente.
                    </div>
                    {tipo === "DEVOLUCAO" && (
                      <div className="text-xs text-amber-600 dark:text-amber-400">
                        <i className="ti ti-info-circle"></i> Na devolução, use o e-mail pessoal:
                        o corporativo costuma já estar desativado.
                      </div>
                    )}
                  </div>
                )}

                <div className="flex flex-wrap gap-2 justify-end mb-4">
                  <button className="btn-secondary" onClick={handlePrint} disabled={sending}>
                    Imprimir / Baixar PDF
                  </button>
                  {signers && signers.length > 0 && (
                    <button className="btn-verde" onClick={handleClicksign} disabled={sending}>
                      {sending ? "Enviando..." : "Enviar para Assinar (ClickSign)"}
                    </button>
                  )}
                </div>

                <div className="border border-gray-200 dark:border-slate-700 rounded p-4 h-[60vh] overflow-y-auto bg-white text-black">
                  <div ref={contentRef} dangerouslySetInnerHTML={{ __html: html }} />
                </div>
              </>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}
