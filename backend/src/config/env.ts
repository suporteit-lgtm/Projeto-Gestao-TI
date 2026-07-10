// Carrega e centraliza as variáveis de ambiente.
import dotenv from "dotenv";

dotenv.config();

export const env = {
  port: Number(process.env.PORT || 4000),
  jwtSecret: process.env.JWT_SECRET || "dev-secret-troque-em-producao",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "8h",
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:5173",
};

console.log("Loaded JWT Config - expires:", env.jwtExpiresIn, "raw env:", process.env.JWT_EXPIRES_IN);
