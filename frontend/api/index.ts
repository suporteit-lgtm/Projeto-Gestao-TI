// Ponto de entrada para a Vercel Serverless Function.
// Exporta o app Express como handler compatível com a Vercel.
// O caminho ../../backend/src/app é relativo a este arquivo (frontend/api/index.ts).
import { createApp } from "../../backend/src/app";

const app = createApp();

export default app;
