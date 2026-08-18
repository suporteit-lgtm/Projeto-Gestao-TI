# Customization Rules: AI Agent Auto-Specialization

Sempre que o usuário solicitar uma configuração ou modificação no projeto, siga estas instruções:
1. Verifique a configuração no arquivo `.env` (se `AI_AGENT_SPECIALIZED_MODE=true`).
2. Busque no diretório de habilidades globais (`C:\Users\Murillo Silva\.gemini\config\skills`) se há uma habilidade/agente especializado para o tipo de tarefa solicitada (ex: `nextjs-best-practices` para frontend, `postgres-best-practices` ou `prisma-expert` para banco de dados/API, `docker-expert` para Docker, `api-patterns` para APIs, etc.).
3. Se encontrar uma habilidade relevante, você DEVE ler e seguir as instruções do arquivo `SKILL.md` desse agente antes de implementar qualquer alteração, garantindo uma execução sem erros e seguindo as melhores práticas.

## Regras de Segurança do Prisma (Banco de Dados)

Sempre que atuar no banco de dados e migrações, lembre-se destas diretrizes fundamentais:

**Evite o alto risco:**
- Nunca rode comandos do Prisma (`migrate dev` ou `reset`) manualmente no terminal apontando para a `DATABASE_URL` de produção.
- Nunca use a mesma string de conexão para desenvolvimento, testes e produção. É obrigatório manter ambientes separados.
- Múltiplas pessoas não devem ter acesso para rodar comandos como `migrate dev` ou `reset` contra o banco de produção sem rigorosa revisão.

**Mitigação (O que deve ser feito):**
- **Produção:** Em produção, as migrações só devem rodar via `prisma migrate deploy` (que apenas aplica o que está pendente, nunca apagando dados).
- **Desenvolvimento:** Existência obrigatória de um banco de desenvolvimento/staging separado para usar `migrate dev` ou `reset` à vontade sem afetar dados reais.
- **Automação:** O ideal é que o deploy de migrações seja automatizado num pipeline de CI/CD para evitar execução manual.
