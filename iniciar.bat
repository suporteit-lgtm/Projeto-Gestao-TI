@echo off
chcp 65001 >nul
title Inventario T.I. - Iniciar
echo ==========================================================
echo   INVENTARIO DE T.I. - Iniciando o sistema...
echo ==========================================================
echo.
echo Abrindo dois terminais (API e Interface).
echo NAO FECHE esses terminais enquanto estiver usando o sistema.
echo.

REM Sobe o backend (API) em um terminal proprio
start "Inventario - API (backend)" cmd /k "cd /d "%~dp0backend" && npm run dev"

REM Sobe o frontend (interface) em outro terminal
start "Inventario - Interface (frontend)" cmd /k "cd /d "%~dp0frontend" && npm run dev"

REM Espera alguns segundos e abre o navegador
echo Aguardando os servidores subirem...
timeout /t 6 /nobreak >nul
start http://localhost:5173

echo.
echo Sistema aberto no navegador: http://localhost:5173
echo Login: admin@empresa.com  /  senha: admin123
echo.
echo Pode fechar ESTA janela. Os dois terminais precisam continuar abertos.
pause
exit /b 0
