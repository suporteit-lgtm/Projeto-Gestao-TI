// Tratamento central de erros. Converte erros conhecidos em respostas JSON limpas.
import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";

// Erro de aplicação com status HTTP definido.
export class AppError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof ZodError) {
    return res.status(422).json({
      error: "Dados inválidos",
      details: err.issues.map((i) => ({ campo: i.path.join("."), msg: i.message })),
    });
  }
  if (err instanceof AppError) {
    return res.status(err.status).json({ error: err.message });
  }
  // Erro de chave única do Prisma (ex.: assetId/email duplicado)
  if (typeof err === "object" && err !== null && (err as any).code === "P2002") {
    const fields = (err as any).meta?.target ?? "campo único";
    return res.status(409).json({ error: `Valor já cadastrado (${fields}).` });
  }
  console.error("[erro não tratado]", err);
  return res.status(500).json({ error: "Erro interno do servidor." });
}
