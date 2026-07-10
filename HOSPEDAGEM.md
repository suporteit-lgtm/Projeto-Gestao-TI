# Hospedar o Inventário em um subdomínio (ex.: `inventario.suaempresa.com.br`)

Este guia usa um **servidor Linux (Ubuntu)** com **Nginx** como porta de entrada.
O Nginx serve a interface (arquivos estáticos) e encaminha as chamadas `/api`
para o backend Node, tudo no mesmo domínio (sem problema de CORS).

> Arquitetura: `Navegador → Nginx (porta 443/HTTPS) → interface (dist) + /api → Node (porta 4000) → SQLite`

---

## 1. Apontar o subdomínio (DNS)

No painel do seu domínio (Registro.br, Cloudflare, GoDaddy…):

- Crie um registro **A**:
  - **Nome/Host:** `inventario`
  - **Valor/Aponta para:** o **IP público** do seu servidor
  - **TTL:** padrão

Aguarde alguns minutos para propagar. Teste: `ping inventario.suaempresa.com.br`.

## 2. Preparar o servidor

```bash
# no servidor (Ubuntu)
sudo apt update && sudo apt install -y nginx git
# Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
# PM2 (mantém o backend rodando e sobe no boot)
sudo npm install -g pm2
```

## 3. Enviar o projeto para o servidor

Copie a pasta `inventario-ti` para o servidor (via `git clone`, `scp` ou WinSCP).
Suponha que ficou em `/var/www/inventario-ti`.

## 4. Subir o BACKEND (API)

```bash
cd /var/www/inventario-ti/backend

# variáveis de ambiente de produção
cp .env.example .env
nano .env
```

No `.env`, ajuste:

```
DATABASE_URL="file:./prod.db"
PORT=4000
JWT_SECRET="COLOQUE-UM-VALOR-LONGO-E-ALEATORIO-AQUI"
JWT_EXPIRES_IN="8h"
CORS_ORIGIN="https://inventario.suaempresa.com.br"
```

Depois:

```bash
npm install
npx prisma migrate deploy    # cria/atualiza o banco em produção
npx prisma generate
npm run seed                 # cria o admin inicial (admin@empresa.com / admin123)
npm run build                # compila para dist/
pm2 start dist/server.js --name inventario-api
pm2 save
pm2 startup                  # siga a instrução que aparecer (sobe no boot)
```

> **Segurança:** logue como `admin@empresa.com / admin123`, **troque a senha**,
> crie os usuários reais e remova/edite os dados de exemplo.

## 5. Gerar a INTERFACE (frontend)

```bash
cd /var/www/inventario-ti/frontend
npm install
npm run build                # gera a pasta dist/ (arquivos estáticos)
```

## 6. Configurar o Nginx

```bash
sudo nano /etc/nginx/sites-available/inventario
```

Cole (troque o domínio):

```nginx
server {
    listen 80;
    server_name inventario.suaempresa.com.br;

    # Interface (arquivos estáticos gerados pelo build)
    root /var/www/inventario-ti/frontend/dist;
    index index.html;

    # Rotas do React (SPA) — qualquer caminho cai no index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Chamadas de API vão para o backend Node
    location /api/ {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        client_max_body_size 15m;   # importa CSVs grandes
    }
}
```

Ative e recarregue:

```bash
sudo ln -s /etc/nginx/sites-available/inventario /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

Já dá para acessar em `http://inventario.suaempresa.com.br`.

## 7. HTTPS (cadeado / SSL grátis)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d inventario.suaempresa.com.br
```

O Certbot ajusta o Nginx para HTTPS e renova sozinho. Pronto: acesse
`https://inventario.suaempresa.com.br`.

## 8. Atualizações futuras

```bash
cd /var/www/inventario-ti
git pull                       # ou reenvie os arquivos
cd backend && npm install && npx prisma migrate deploy && npm run build && pm2 restart inventario-api
cd ../frontend && npm install && npm run build
```

---

## Alternativas

- **Servidor Windows:** dá para rodar igual (Node + PM2) e usar o **IIS** com o
  módulo *URL Rewrite/ARR* como proxy reverso no lugar do Nginx, ou instalar o
  Nginx para Windows. O conceito é o mesmo: servir `frontend/dist` e encaminhar
  `/api` para `localhost:4000`.
- **Rede interna apenas:** se o sistema for só para a rede da empresa, aponte o
  subdomínio (DNS interno) para o IP da máquina e pule o passo de HTTPS público.
- **Banco:** O sistema está configurado para usar o **PostgreSQL** (otimizado para o **Supabase**). Para configurar, basta preencher no `.env` a `DATABASE_URL` (conexão com pooling) e a `DIRECT_URL` (conexão direta).

---

## Como trocar a LOGO e o FAVICON

Ambos ficam em **`frontend/public/`**.

### Logo
1. Substitua o arquivo **`frontend/public/logo.svg`** pelo seu logo oficial
   (mantenha o nome `logo.svg`).
2. Se o seu arquivo for **PNG** em vez de SVG:
   - coloque como `frontend/public/logo.png`;
   - em `frontend/src/components/Layout.tsx`, troque `src="/logo.svg"` por `src="/logo.png"`;
   - em `frontend/index.html`, troque o `href="/logo.svg"` do favicon por `/logo.png`.
3. Rode `npm run build` de novo (ou reinicie o `npm run dev`).

### Favicon (ícone da aba do navegador)
- Hoje o favicon usa a própria logo (`/logo.svg`), definido em
  **`frontend/index.html`**:
  ```html
  <link rel="icon" type="image/svg+xml" href="/logo.svg" />
  ```
- Para usar um ícone separado, coloque `frontend/public/favicon.ico`
  (ou `.png`) e altere a linha acima para:
  ```html
  <link rel="icon" href="/favicon.ico" />
  ```
- Rode `npm run build` (ou reinicie o dev). Se o ícone antigo continuar
  aparecendo, limpe o cache do navegador (Ctrl+Shift+R).
