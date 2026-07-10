# Customization Rules: AI Agent Auto-Specialization

Sempre que o usuário solicitar uma configuração ou modificação no projeto, siga estas instruções:
1. Verifique a configuração no arquivo `.env` (se `AI_AGENT_SPECIALIZED_MODE=true`).
2. Busque no diretório de habilidades globais (`C:\Users\Murillo Silva\.gemini\config\skills`) se há uma habilidade/agente especializado para o tipo de tarefa solicitada (ex: `nextjs-best-practices` para frontend, `postgres-best-practices` ou `prisma-expert` para banco de dados/API, `docker-expert` para Docker, `api-patterns` para APIs, etc.).
3. Se encontrar uma habilidade relevante, você DEVE ler e seguir as instruções do arquivo `SKILL.md` desse agente antes de implementar qualquer alteração, garantindo uma execução sem erros e seguindo as melhores práticas.
