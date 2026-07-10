// Componentes de UI pequenos e reutilizáveis.
import { ReactNode, useRef } from "react";
import {
  STATUS_LABEL,
  STATUS_COLOR,
  CONDITION_LABEL,
  CONDITION_COLOR,
} from "../lib/format";

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
        STATUS_COLOR[status] ?? "bg-gray-100 text-gray-700"
      }`}
    >
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

export function ConditionBadge({ condition }: { condition: string }) {
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
        CONDITION_COLOR[condition] ?? "bg-gray-100 text-gray-700"
      }`}
    >
      {CONDITION_LABEL[condition] ?? condition}
    </span>
  );
}

// Janela modal centralizada.
export function Modal({
  open,
  title,
  onClose,
  children,
  wide,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  // Registra se o clique COMEÇOU no fundo (fora do card). Só fecha se começou
  // E terminou no fundo — assim, selecionar texto e soltar fora não fecha.
  const pressedBackdrop = useRef(false);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 overflow-y-auto"
      onMouseDown={(e) => {
        pressedBackdrop.current = e.target === e.currentTarget;
      }}
      onMouseUp={(e) => {
        if (pressedBackdrop.current && e.target === e.currentTarget) onClose();
        pressedBackdrop.current = false;
      }}
    >
      <div className={`card my-8 w-full ${wide ? "max-w-3xl" : "max-w-lg"} p-6`}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 dark:text-slate-500 dark:hover:text-slate-200">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// Mensagem de aviso/erro.
export function Alert({ kind = "error", children }: { kind?: "error" | "success" | "info"; children: ReactNode }) {
  const styles = {
    error: "bg-red-50 text-red-700 border-red-200",
    success: "bg-green-50 text-green-700 border-green-200",
    info: "bg-blue-50 text-blue-700 border-blue-200",
  }[kind];
  return <div className={`rounded-md border px-3 py-2 text-sm ${styles}`}>{children}</div>;
}

export function Spinner({ label = "Carregando..." }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-gray-500 py-8 justify-center">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-marca" />
      {label}
    </div>
  );
}
