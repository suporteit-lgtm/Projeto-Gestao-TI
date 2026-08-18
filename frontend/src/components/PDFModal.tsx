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

interface PDFModalProps {
  open: boolean;
  onClose: () => void;
  htmlPath: string; // ex: /documents/equipment/123/termo.html
  filename: string;
  signers?: Signer[]; // if empty, clicksign is hidden
  pasta?: string;
}

export default function PDFModal({ open, onClose, htmlPath, filename, signers, pasta }: PDFModalProps) {
  const [html, setHtml] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState("");

  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setHtml("");
    setError("");
    setSuccess("");
    setLoading(true);
    
    api<{ html: string }>(htmlPath)
      .then((res) => {
        setHtml(res.html);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Erro ao carregar o termo");
        setLoading(false);
      });
  }, [open, htmlPath]);

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

  async function handleClicksign() {
    if (!html || !signers || signers.length === 0) return;
    if (!confirm("Isso enviará um e-mail para o responsável solicitando a assinatura eletrônica. Confirmar?")) return;
    
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
        filename:     filename,
        image:        { type: 'jpeg' as const, quality: 0.98 },
        html2canvas:  { scale: 2 },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' as const }
      };

      const pdfBase64DataUrl = await html2pdf().set(opt).from(element).output('datauristring');
      // O formato é data:application/pdf;base64,..... precisamos remover o header
      const base64 = pdfBase64DataUrl.split(',')[1];

      // 2. Envia para a API do Clicksign
      await api("/documents/clicksign/send", {
        method: "POST",
        body: {
          filename,
          pdfBase64: base64,
          signers,
          pasta
        }
      });

      setSuccess("Enviado com sucesso! O signatário receberá um e-mail.");
      setTimeout(() => {
        onClose();
      }, 3000);
    } catch (err: any) {
      setError(err.message || "Erro ao enviar para o Clicksign.");
    } finally {
      setSending(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Termo de Responsabilidade" wide>
      <div className="space-y-4">
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
