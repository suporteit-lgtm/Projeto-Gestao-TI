<div align="center">
  <img src="frontend/public/logo.png" alt="Inventário de T.I." height="72" />
</div>

# Inventário de T.I.

Sistema web para gestão de equipamentos de TI — substitui planilhas e geração manual de termos de responsabilidade.

## Stack

| Camada | Tecnologia |
|--------|------------|
| Frontend | React + Vite + TypeScript + TailwindCSS |
| Backend | Node.js + Express + TypeScript |
| ORM | Prisma |
| Banco | SQLite |
| Auth | JWT + bcrypt |
| PDF | Handlebars + Puppeteer |

## Como rodar

**Pré-requisito:** Node.js 18+

### Windows (recomendado)

1. **`instalar.bat`** — execute uma vez para instalar dependências e criar o banco
2. **`iniciar.bat`** — execute sempre que quiser usar o sistema

> Não feche os terminais enquanto estiver usando. Se aparecer erro de conexão, rode `iniciar.bat` novamente.

### Manual

```bash
# Backend
cd backend
npm install
npm run setup   # cria banco + seed
npm run dev     # API em http://localhost:4000

# Frontend (outro terminal)
cd frontend
npm install
npm run dev     # interface em http://localhost:5173
```

## Scripts (backend)

| Comando | O que faz |
|---------|-----------|
| `npm run dev` | Sobe a API com hot-reload |
| `npm run setup` | Migração + seed (primeira vez) |
| `npm run prisma:reset` | Apaga e recria o banco |
| `npm run build` / `npm start` | Build e modo produção |
