// Ponto de entrada para a Vercel Serverless Function.
// Exporta o app Express como handler compatível com a Vercel.
import { createApp } from "../src/app";

const app = createApp();

export default app;
