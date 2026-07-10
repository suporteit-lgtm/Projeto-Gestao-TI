// Ponto de entrada: sobe o servidor HTTP.
import { createApp } from "./app";
import { env } from "./config/env";

const app = createApp();

app.listen(env.port, () => {
  console.log(`\n✅ API do Inventário rodando em http://localhost:${env.port}`);
  console.log(`   Healthcheck: http://localhost:${env.port}/api/health\n`);
});
